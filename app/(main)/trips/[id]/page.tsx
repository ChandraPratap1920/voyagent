import TripPlanner from './TripPlanner'

// The trip itself is per-user data behind auth, so this route stays dynamic and
// the planner fetches it client-side — same reasoning as the Save button.
export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  // Next 16: params is a Promise and must be awaited.
  const { id } = await params
  return <TripPlanner tripId={id} />
}
