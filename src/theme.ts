/** Every page after the landing page is either pink or black (see .theme-pink / .theme-black). */
export type Theme = 'pink' | 'black'

/** How long the greeting text and buttons fade away after "hi" is pressed (matches the CSS). */
export const FADE_OUT_MS = 600

let originalThemeColor: string | null = null

/**
 * Recolours the strips behind the iPhone's status bar and toolbar (null = restore).
 *
 * Older iOS reads the theme-color meta tag; iOS 26 ignores it and uses the page background
 * (or the background of a position:fixed element, if there is one — keep those transparent).
 * So this sets both. The meta tag is replaced rather than edited, which Safari notices more
 * reliably than a changed `content`.
 */
export function tintBrowserChrome(color: string | null) {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (meta) {
    originalThemeColor ??= meta.content
    const next = document.createElement('meta')
    next.name = 'theme-color'
    next.content = color ?? originalThemeColor
    meta.replaceWith(next)
  }
  document.documentElement.style.backgroundColor = color ?? ''
  document.body.style.backgroundColor = color ?? ''
}
