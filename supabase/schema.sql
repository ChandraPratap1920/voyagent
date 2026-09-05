-- Run this once in the Supabase SQL editor (Day 1 setup).

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  personality text,       -- e.g. 'Beach Potato', 'Museum Goblin'
  budget_style text,      -- e.g. 'Balanced Human', 'Coupon Ninja'
  pace text,               -- e.g. 'Casual Stroller', 'Speedrunner'
  diet text,                -- e.g. 'vegetarian', 'vegan', 'no restriction'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  destination text,
  trip_cost_inr numeric,
  payment_id text,
  pnr text,
  hotel_ref text,
  status text default 'confirmed',
  created_at timestamptz default now()
);

-- Wishlist for the "just browsing" user — saved hotels/restaurants/experiences.
-- item_id refers to an id in data/*.json (e.g. 'taj-holiday-village'), so there's
-- no FK here; the catalog lives in the repo, not the database.
create table if not exists saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  item_type text not null check (item_type in ('hotel', 'restaurant', 'experience')),
  item_id text not null,
  destination text,
  created_at timestamptz default now(),
  -- Saving the same thing twice is a no-op rather than a duplicate row.
  unique (user_id, item_type, item_id)
);

-- A planned trip. Multi-city is modelled by giving every DAY a destination
-- (see trip_days) rather than pinning one city to the trip — a "leg" is just
-- consecutive days sharing a city, which keeps Munnar 2N → Alleppey 1N simple
-- without a separate legs table.
create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text,
  start_date date,
  travelers int default 1,
  budget_inr numeric,
  status text default 'planning' check (status in ('planning', 'booked')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- One row per day of the trip. Holds the city even when the day has nothing
-- planned yet, so the planner can still show "Day 3 in Alleppey — empty".
create table if not exists trip_days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  day_number int not null,
  destination text not null,
  unique (trip_id, day_number)
);

-- A hotel/restaurant/experience placed on a given day. item_id points at an id
-- in data/*.json — same as saved_items, the catalog lives in the repo.
create table if not exists trip_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  day_number int not null,
  item_type text not null check (item_type in ('hotel', 'restaurant', 'experience')),
  item_id text not null,
  sort_order int default 0,
  created_at timestamptz default now(),
  -- The same place twice on one day is always a mistake.
  unique (trip_id, day_number, item_type, item_id)
);

create index if not exists trip_days_trip_idx on trip_days (trip_id);
create index if not exists trip_items_trip_idx on trip_items (trip_id);

-- Row Level Security: users can only see/edit their own rows.
alter table profiles enable row level security;
alter table bookings enable row level security;
alter table saved_items enable row level security;
alter table trips enable row level security;
alter table trip_days enable row level security;
alter table trip_items enable row level security;

create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles
  for insert with check (auth.uid() = id);

create policy "Users can view own bookings" on bookings
  for select using (auth.uid() = user_id);
create policy "Users can insert own bookings" on bookings
  for insert with check (auth.uid() = user_id);

create policy "Users can view own saved items" on saved_items
  for select using (auth.uid() = user_id);
create policy "Users can insert own saved items" on saved_items
  for insert with check (auth.uid() = user_id);
create policy "Users can delete own saved items" on saved_items
  for delete using (auth.uid() = user_id);

create policy "Users manage own trips" on trips
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- trip_days / trip_items have no user_id of their own; ownership is inherited
-- from the parent trip, so both policies check that instead.
create policy "Users manage own trip days" on trip_days
  for all using (
    exists (select 1 from trips t where t.id = trip_days.trip_id and t.user_id = auth.uid())
  ) with check (
    exists (select 1 from trips t where t.id = trip_days.trip_id and t.user_id = auth.uid())
  );

create policy "Users manage own trip items" on trip_items
  for all using (
    exists (select 1 from trips t where t.id = trip_items.trip_id and t.user_id = auth.uid())
  ) with check (
    exists (select 1 from trips t where t.id = trip_items.trip_id and t.user_id = auth.uid())
  );

-- Support tickets raised from /support. Deliberately write-only from the app's
-- point of view: a user can raise a ticket and read their own history, but
-- can't edit or close one — resolving is a support-side action, so there are
-- no update/delete policies at all.
create table if not exists support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  category text not null check (category in ('booking', 'planning', 'account', 'bug', 'other')),
  subject text not null,
  message text not null,
  status text default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz default now()
);

alter table support_tickets enable row level security;

create policy "Users can view own support tickets" on support_tickets
  for select using (auth.uid() = user_id);
create policy "Users can raise own support tickets" on support_tickets
  for insert with check (auth.uid() = user_id);

-- A booking made from the itinerary builder knows which trip it paid for, but
-- had nowhere to record it — so there was no way back from a booking to the
-- day-by-day plan. Nullable because the quick flight+hotel path has no trip.
-- "on delete set null" keeps the payment record if the trip is deleted.
alter table bookings add column if not exists trip_id uuid references trips(id) on delete set null;
create index if not exists bookings_user_idx on bookings (user_id, created_at desc);
