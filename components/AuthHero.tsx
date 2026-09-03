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
    src: 'https://images.unsplash.com/photo-1589901164570-f9de6556e1c1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMDQyMDM2fDB8MXxzZWFyY2h8MXx8VWRhaXB1ciUyMExha2VzfGVufDB8MHx8fDE3ODc2ODg1MDB8MA&ixlib=rb-4.1.0&q=75&w=800',
    alt: 'Udaipur city palace on Lake Pichola',
    caption: 'Udaipur · Lakes & Palaces',
    credit: 'Photo by Pranav Panchal on Unsplash',
  },
  signup: {
    src: 'https://images.unsplash.com/photo-1489252614717-e24ec918e368?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMDQyMDM2fDB8MXxzZWFyY2h8MXx8TWFsZGl2ZXMlMjBBdG9sbHN8ZW58MHwwfHx8MTc4ODM2ODYxNXww&ixlib=rb-4.1.0&q=75&w=800',
    alt: 'Maldives atoll from the air',
    caption: 'Maldives · Atolls & Overwater',
    credit: 'Photo by Syd Sujuaan on Unsplash',
  },
} as const

export default function AuthHero({ variant }: { variant: keyof typeof HEROES }) {
  const hero = HEROES[variant]

  return (
    <div className="relative h-52 shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={hero.src}
        alt={hero.alt}
        className="w-full h-full object-cover"
        // Above the fold and the only image on the page — load it eagerly.
        fetchPriority="high"
      />

      {/* Fades the photo into the page so there's no hard seam above the form. */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/30 to-slate-950" />

      <div className="absolute top-6 left-6 flex items-center gap-2">
        <span className="text-2xl">🦜</span>
        <span className="font-bold tracking-tight">Voyagent</span>
      </div>

      <span className="absolute bottom-3 left-6 text-[11px] text-slate-300/80">{hero.caption}</span>
      <span className="absolute bottom-3 right-6 text-[9px] text-slate-400/50">{hero.credit}</span>
    </div>
  )
}
