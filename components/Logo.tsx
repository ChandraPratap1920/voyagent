// The Voyagent mark.
//
// Two files exist: logo.png keeps the brand's navy hull, logo-light.png
// recolours it to slate-100. The app is dark throughout (slate-950, #020617)
// and the brand navy is #041A2F — near enough to the background that the boat
// disappears — so the light variant is what the UI uses. logo.png stays for
// any light-background context (decks, print, a future light theme).
//
// Decorative by default: every use sits beside the word "Voyagent" or a text
// label, so announcing it again would just repeat the name to a screen reader.
export default function Logo({
  className = 'w-6 h-6',
  alt,
}: {
  className?: string
  alt?: string
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-light.png"
      alt={alt ?? ''}
      aria-hidden={alt ? undefined : true}
      className={`${className} object-contain shrink-0`}
    />
  )
}
