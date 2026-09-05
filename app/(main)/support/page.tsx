import Link from 'next/link'
import BackButton from '@/components/BackButton'
import SupportForm from '@/components/SupportForm'
import destinations from '@/data/destinations.json'
import hotels from '@/data/hotels.json'
import restaurants from '@/data/restaurants.json'
import experiences from '@/data/experiences.json'

// Help & Support. A server component so the FAQ costs no JavaScript — only the
// contact form below it is interactive.

export const metadata = {
  title: 'Help & Support · Voyagent',
}

const placeCount = hotels.length + restaurants.length + experiences.length

// Answers are deliberately honest about what this build does and doesn't do —
// payments run in Razorpay's test mode, and saying so here is better than
// having someone discover it mid-booking.
const FAQS: { q: string; a: string }[] = [
  {
    q: 'How do I plan a trip?',
    a: 'Two ways, and they meet in the same place. Tell Vito what you want in plain English — "5 days in Bali under ₹60K for 2" — and it drafts the trip for you. Or open Trips and build it yourself, day by day. Either way you end up with a plan you can edit.',
  },
  {
    q: 'Are the places real?',
    a: `Yes. All ${placeCount}+ stays, restaurants and experiences across ${destinations.length} destinations come from Google Places, with their real names, addresses, ratings and photos. Nothing in the catalogue is invented.`,
  },
  {
    q: 'Is my payment real? Will I be charged?',
    a: 'No. Voyagent runs Razorpay in test mode, so no real money moves and no real card is ever charged. The checkout, signature verification and confirmation are the genuine flow — only the settlement is sandboxed.',
  },
  {
    q: 'How do I save a place for later?',
    a: 'Tap the heart on any stay, restaurant or experience. Everything you save lands in the Saved tab in Explore, and you can pull straight from it while building an itinerary.',
  },
  {
    q: 'Can I plan a trip across more than one city?',
    a: 'Yes. When you create a trip you can add several legs — three nights in Goa then two in Alleppey, for example. Voyagent lays the days out in order and keeps each day tied to the right city.',
  },
  {
    q: 'Why are restaurants not charged at checkout?',
    a: "Because you don't pre-pay for dinner. Stays and experiences are booked and paid for; restaurants sit in your itinerary as plans, so you keep the table you want without being billed for it.",
  },
  {
    q: 'Can I change or cancel a booking?',
    a: 'Not in this release. A booked trip is locked to keep the itinerary and payment record consistent. Send us a message below and we can help — changes and cancellations are on the roadmap.',
  },
  {
    q: 'Who can see my trips and saved places?',
    a: 'Only you. Every table is protected by row-level security in Postgres, which means the database itself refuses to return another account’s rows — it is not just hidden in the app.',
  },
]

export default function SupportPage() {
  return (
    <main className="pb-24">
      <div className="px-6 pt-8 pb-4 flex items-center gap-3">
        <BackButton
          fallbackHref="/account"
          className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0"
        />
        <h1 className="text-xl font-bold">Help &amp; Support</h1>
      </div>

      <div className="px-6">
        <p className="text-slate-400 text-sm leading-relaxed mb-6">
          Most answers are below. If yours isn&apos;t, send us a message — we usually reply within
          24 hours.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-8">
          <a
            href="mailto:support@voyagent.app"
            className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3"
          >
            <p className="text-lg leading-none mb-1.5">✉️</p>
            <p className="text-sm font-medium">Email us</p>
            <p className="text-xs text-slate-500 truncate">support@voyagent.app</p>
          </a>
          <Link
            href="/chat"
            className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3"
          >
            <p className="text-lg leading-none mb-1.5">🦜</p>
            <p className="text-sm font-medium">Ask Vito</p>
            <p className="text-xs text-slate-500">Trip questions</p>
          </Link>
        </div>

        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
          Frequently asked
        </h2>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 divide-y divide-slate-800 mb-10">
          {FAQS.map((faq) => (
            // <details> gives us an accordion that is keyboard accessible and
            // works with no client-side state.
            <details key={faq.q} className="group px-4 py-3">
              <summary className="flex items-center justify-between gap-3 cursor-pointer list-none text-sm font-medium [&::-webkit-details-marker]:hidden">
                {faq.q}
                <span className="text-slate-500 shrink-0 transition-transform group-open:rotate-180">
                  ⌄
                </span>
              </summary>
              <p className="text-sm text-slate-400 leading-relaxed mt-2">{faq.a}</p>
            </details>
          ))}
        </div>

        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
          Still need help?
        </h2>
        <SupportForm />
      </div>
    </main>
  )
}
