import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { clipToElement, EASE_IN_OUT, FULL_SCREEN, reducedMotion } from './motion'
import { FADE_OUT_MS, type Theme } from './theme'
import './Landing.css' // the .btn styles

/** How long the pink takes to grow out of the button and cover the page */
const GROW_MS = 1100

type Props = {
  /** Which colour the page is — decides how "restart" leaves */
  theme: Theme
  /** "restart" was pressed and the page has faded or been covered — back to the very beginning */
  onRestart: () => void
}

/**
 * What "yes" leads to: "Perf!!" slides in, then "(short for perfect)" under it, then "Anyways
 * hope you feel better!!!" fades in, and a while later a restart button does.
 *
 * Restart goes back to the landing page, which is pink, without a sudden snap. If the page is
 * already pink, everything just fades away into it. If it's black, the button grows into the
 * landing page's pink until it fills the whole screen, and the landing page takes over from there.
 */
function Finale({ theme, onRestart }: Props) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)
  const [growing, setGrowing] = useState(false)
  const [fading, setFading] = useState(false)

  const onRestartRef = useRef(onRestart)
  useEffect(() => {
    onRestartRef.current = onRestart
  })

  const restart = () => {
    if (growing || fading) return
    if (theme === 'black') setGrowing(true)
    else setFading(true)
  }

  // Pink page: fade everything away, then the (pink) landing page is already underneath
  useEffect(() => {
    if (!fading) return
    const timer = window.setTimeout(() => onRestartRef.current(), reducedMotion() ? 0 : FADE_OUT_MS)
    return () => clearTimeout(timer)
  }, [fading])

  // Grow a pink overlay out of the button (the same trick as the "pink? really?" button)
  useLayoutEffect(() => {
    if (!growing) return
    const button = buttonRef.current
    const overlay = overlayRef.current
    const label = labelRef.current
    if (!button || !overlay || !label) return

    const style = getComputedStyle(button)
    const pink = getComputedStyle(document.documentElement).getPropertyValue('--pink').trim()
    const r = button.getBoundingClientRect()
    const timing = { duration: reducedMotion() ? 0 : GROW_MS, easing: EASE_IN_OUT, fill: 'both' as const }

    // The word "restart" stays exactly where the button's was, then fades as the pink spreads
    Object.assign(label.style, {
      left: `${r.left + r.width / 2}px`,
      top: `${r.top + r.height / 2}px`,
      color: style.color,
      fontSize: style.fontSize,
    })

    // Starts as the button's own shape and colour, and ends as the whole screen in pink
    const grow = overlay.animate(
      [
        { clipPath: clipToElement(button, overlay), backgroundColor: style.backgroundColor },
        { clipPath: FULL_SCREEN, backgroundColor: pink },
      ],
      timing,
    )
    const fadeLabel = label.animate([{ opacity: 1 }, { opacity: 0, offset: 0.4 }, { opacity: 0 }], timing)

    grow.finished.then(() => onRestartRef.current()).catch(() => {}) // cancelled
    return () => {
      grow.cancel()
      fadeLabel.cancel()
    }
  }, [growing])

  return (
    <div className={`hi__finale${fading ? ' hi__finale--leaving' : ''}`}>
      <h1 className="hi__finale-text">
        <span className="hi__line hi__line--perf">
          <span className="hi__big">Perf!!</span>
          <span className="hi__small">(short for perfect)</span>
        </span>
        <span className="hi__line hi__line--rest">
          <span className="hi__big">Anyways hope you feel better soon!!!</span>
        </span>
      </h1>

      <div className="hi__finale-actions">
        <button
          ref={buttonRef}
          type="button"
          className="btn hi__btn"
          onClick={restart}
          disabled={growing || fading}
        >
          restart
        </button>
      </div>

      {growing && (
        <div ref={overlayRef} className="hi__grow" aria-hidden="true">
          <span ref={labelRef} className="hi__grow-label">
            restart
          </span>
        </div>
      )}
    </div>
  )
}

export default Finale
