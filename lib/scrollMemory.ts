'use client'

// Restoring a raw scroll offset doesn't work here: these lists fetch after
// mount, so when the browser restores scroll the page is still empty and short,
// and the offset gets clamped away. Instead we remember *which card* was
// opened and scroll that element back into view once the list has rendered.
//
// The remembered tab matters just as much as the id. A list that defaults back
// to its first tab will never render the card you came from, so the lookup
// silently finds nothing.

const PREFIX = 'voyagent:lastItem:'

export type RememberedItem = { id: string; tab?: string }

export function rememberItem(listKey: string, itemId: string, tab?: string) {
  try {
    sessionStorage.setItem(PREFIX + listKey, JSON.stringify({ id: itemId, tab }))
  } catch {
    // Private mode / storage disabled — losing position is acceptable.
  }
}

// Peek without clearing: callers need the tab during render, before the list
// that contains the card has even been fetched.
export function readRememberedItem(listKey: string): RememberedItem | null {
  try {
    const raw = sessionStorage.getItem(PREFIX + listKey)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return typeof parsed?.id === 'string' ? parsed : null
  } catch {
    return null
  }
}

export function clearRememberedItem(listKey: string) {
  try {
    sessionStorage.removeItem(PREFIX + listKey)
  } catch {
    // no-op
  }
}

// Call once a list has painted. Only clears the memory when the card is
// actually found, so arriving on the wrong tab doesn't throw the position away
// before the right tab has had a chance to render.
export function restoreItemPosition(listKey: string) {
  const remembered = readRememberedItem(listKey)
  if (!remembered) return

  requestAnimationFrame(() => {
    const el = document.querySelector(`[data-item-id="${CSS.escape(remembered.id)}"]`)
    if (!el) return
    el.scrollIntoView({ block: 'center' })
    clearRememberedItem(listKey)
  })
}
