// Scenic banner for the login and signup screens.
//
// Deliberately a band at the TOP that fades into the page rather than a
// full-bleed background behind the form: photos behind input fields hurt
// legibility, and on mobile the keyboard covers most of the screen anyway.
// This gives the pages colour and continuity with the landing page without
// getting in the way of someone trying to type.
//
// The two URLs are hardcoded rather than read from data/destinations.json
// because these pages are client components — importing the dataset here would
// ship the whole catalogue to the browser just to pick one photo.

const HEROES = {
  login: {
    src: 'https://images.unsplash.com/photo-1696027356970-b1527cc0d33c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMDQyMDM2fDB8MXxzZWFyY2h8MXx8TXVubmFyJTIwVGVhJTIwSGlsbHN8ZW58MHwwfHx8MTc4NzY4ODUwM3ww&ixlib=rb-4.1.0&q=75&w=800',
    alt: 'Tea terraces rolling into the mountains at Munnar',
    caption: 'Munnar · Tea Hills & Mist',
    credit: 'Photo by Antony Thomas on Unsplash',
  },
  signup: {
    src: 'https://images.unsplash.com/photo-1681471809562-75f912ac46fc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMDQyMDM2fDB8MXxzZWFyY2h8M3x8TWFsZGl2ZXMlMjBBdG9sbHN8ZW58MHwwfHx8MTc4ODM2ODYxNXww&ixlib=rb-4.1.0&q=75&w=800',
    alt: 'Turquoise shallows and palms on a Maldives atoll',
    caption: 'Maldives · Atolls & Overwater',
    credit: 'Photo by Arun J on Unsplash',
  },
} as const

export default function AuthHero({ variant }: { variant: keyof typeof HEROES }) {
  const hero = HEROES[variant]

  return (
    <div className="relative h-60 shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={hero.src}
        alt={hero.alt}
        className="w-full h-full object-cover"
        // Above the fold and the only image on the page — load it eagerly.
        fetchPriority="high"
      />

      {/* Fades the photo into the page so there's no hard seam above the form. */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/50 via-slate-950/10 to-slate-950" />

      <div className="absolute top-6 left-6 flex items-center gap-2">
        <span className="text-2xl">🦜</span>
        <span className="font-bold tracking-tight">Voyagent</span>
      </div>

      <span className="absolute bottom-3 left-6 text-[11px] text-slate-300/80">{hero.caption}</span>
      <span className="absolute bottom-3 right-6 text-[9px] text-slate-400/50">{hero.credit}</span>
    </div>
  )
}
