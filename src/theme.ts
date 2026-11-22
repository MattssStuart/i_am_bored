/** Every page after the landing page is either pink or black (see .theme-pink / .theme-black). */
export type Theme = 'pink' | 'black'

/** How long the greeting text and buttons fade away after "hi" is pressed (matches the CSS). */
export const FADE_OUT_MS = 600

/**
 * iPhone Safari paints the strips behind the status bar and toolbar from the page's
 * theme-color and background, not from the page content. This recolours them (null = restore).
 */
export function tintBrowserChrome(color: string | null) {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (meta) {
    meta.dataset.original ??= meta.content
    meta.content = color ?? meta.dataset.original
  }
  document.documentElement.style.backgroundColor = color ?? ''
  document.body.style.backgroundColor = color ?? ''
}
