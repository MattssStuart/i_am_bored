/** Helpers for the "grow out of a button to fill the screen" effect (PinkTakeover, Finale). */

export const EASE_IN_OUT = 'cubic-bezier(0.65, 0, 0.35, 1)'
export const FULL_SCREEN = 'inset(0px 0px 0px 0px round 0px)'

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * The button's corner radius as a real length. A pill's computed radius is 999px, which the
 * browser clamps to half its height — but animating 999px -> 0 keeps the shape a stretched
 * pill/circle/oval for most of the trip. Using the real radius (about 24px) makes it a plain
 * rounded rectangle that grows (or shrinks) smoothly.
 */
function cornerRadius(el: HTMLElement, rect: DOMRect) {
  const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0
  return Math.min(radius, rect.height / 2, rect.width / 2)
}

/** A clip-path that cuts the full-screen overlay down to exactly the button's shape. */
export function clipToElement(el: HTMLElement, overlay: HTMLElement) {
  const r = el.getBoundingClientRect()
  const o = overlay.getBoundingClientRect()
  return `inset(${r.top - o.top}px ${o.right - r.right}px ${o.bottom - r.bottom}px ${r.left - o.left}px round ${cornerRadius(el, r)}px)`
}
