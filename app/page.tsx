import Link from 'next/link'

// Public landing page — the first thing anyone opening the deployed URL sees,
// so it has to look like Voyagent rather than the Next.js starter template.
export default function Landing() {
  return (
    <main className="min-h-screen flex flex-col justify-between max-w-md mx-auto w-full px-6 py-10">
      <div>
        <div className="flex items-center gap-2 mb-16">
          <span className="text-2xl">🦜</span>
          <span className="font-bold text-lg tracking-tight">Voyagent</span>
        </div>

        <h1 className="text-4xl font-bold leading-tight">
          Explore what
          <br />
          feels right.
          <br />
          <span className="text-lime-400">AI will guide you.</span>
        </h1>

        <p className="text-slate-400 mt-5 leading-relaxed">
          Browse real stays, food and things to do across 16 destinations — then build the trip
          day by day, and book it.
        </p>

        <div className="mt-10 space-y-3">
          {[
            ['🧭', 'Discover', '790+ real places, rated and reviewed'],
            ['❤️', 'Save', 'Build a wanderlist of what caught your eye'],
            ['🗓️', 'Plan', 'Day-by-day itineraries across multiple cities'],
          ].map(([icon, title, copy]) => (
            <div
              key={title}
              className="flex items-start gap-3 rounded-2xl bg-slate-900 border border-slate-800 px-4 py-3"
            >
              <span className="text-lg leading-none mt-0.5">{icon}</span>
              <div>
                <p className="font-semibold text-sm">{title}</p>
                <p className="text-xs text-slate-400">{copy}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 pt-10">
        <Link
          href="/signup"
          className="block w-full text-center rounded-full bg-lime-400 text-slate-900 font-semibold py-3.5"
        >
          Get started — it&apos;s free
        </Link>
        <Link
          href="/login"
          className="block w-full text-center rounded-full border border-slate-700 text-slate-300 font-medium py-3.5"
        >
          I already have an account
        </Link>
      </div>
    </main>
  )
}
