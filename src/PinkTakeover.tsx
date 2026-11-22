import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import Greeting from './Greeting'
import { FADE_OUT_MS, tintBrowserChrome } from './theme'
import './PinkTakeover.css'

/*
 * The "pink? really?" sequence:
 *  1. expanding  – the button grows to fill the screen, its label glides to the centre
 *  2. erasing    – a whiteboard eraser wipes the pink away in zig-zag strokes, leaving black
 *                  (and revealing "Better??? Goshh" underneath as it passes)
 *  3. better     – "Better??? Goshh" holds on the black for a moment
 *  4. greeting   – it gets thrown away, and "Hey / Hi / Hello" (with "hi" and
 *                  "back to pink" underneath) slides in from the left as one block
 *  5. collapsing – everything shrinks back into the button, revealing the page again
 *
 * Repeat trips ("back to black") are `quick`: the overlay is black from the start, so after
 * 1 it skips straight to 4 — no wipe, no "Better??? Goshh".
 */
type Phase = 'expanding' | 'erasing' | 'better' | 'greeting' | 'collapsing'

type Props = {
  originRef: RefObject<HTMLButtonElement | null>
  /** The origin button's text, shown as the big centred label */
  label: string
  /** Skip the wipe and "Better??? Goshh" and just change to black */
  quick: boolean
  /** "hi" was pressed on the black greeting */
  onHi: () => void
  onCollapseStart: () => void
  onDone: () => void
}

const EXPAND_MS = 750
const PAUSE_BEFORE_ERASE_MS = 400
const ERASE_MS = 2000
const BETTER_HOLD_MS = 1000
const COLLAPSE_MS = 1200

const EASE_IN_OUT = 'cubic-bezier(0.65, 0, 0.35, 1)'
const FULL_SCREEN = 'inset(0px 0px 0px 0px round 0px)'

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** A clip-path that cuts the full-screen overlay down to exactly the button's shape. */
function clipToElement(el: HTMLElement, overlay: HTMLElement) {
  const r = el.getBoundingClientRect()
  const o = overlay.getBoundingClientRect()
  const radius = getComputedStyle(el).borderTopLeftRadius
  return `inset(${r.top - o.top}px ${o.right - r.right}px ${o.bottom - r.bottom}px ${r.left - o.left}px round ${radius})`
}

/** Moves + shrinks the centred label so it sits exactly where the button's label is. */
function labelAtElement(el: HTMLElement, overlay: HTMLElement, label: HTMLElement) {
  const r = el.getBoundingClientRect()
  const o = overlay.getBoundingClientRect()
  const dx = r.left + r.width / 2 - (o.left + o.width / 2)
  const dy = r.top + r.height / 2 - (o.top + o.height / 2)
  const scale = parseFloat(getComputedStyle(el).fontSize) / parseFloat(getComputedStyle(label).fontSize)
  return `translate(${dx}px, ${dy}px) scale(${scale})`
}

/** Zig-zag eraser strokes from the top of the screen to the bottom. */
function eraserStrokes(width: number, height: number) {
  const stroke = Math.max(height / 3.5, 140)
  const left = -stroke / 2
  const right = width + stroke / 2
  let y = -stroke * 0.3
  let goingRight = true
  const points = [`M ${left} ${y}`]
  while (y < height + stroke / 2) {
    y += stroke / 2
    points.push(`L ${goingRight ? right : left} ${y}`)
    goingRight = !goingRight
  }
  return { d: points.join(' '), stroke }
}

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)

function PinkTakeover({ originRef, label: labelText, quick, onHi, onCollapseStart, onDone }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const fillRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLDivElement>(null)
  const pathRef = useRef<SVGPathElement>(null)
  const eraserRef = useRef<HTMLDivElement>(null)
  const backRef = useRef<HTMLButtonElement>(null)
  const [phase, setPhase] = useState<Phase>('expanding')

  // Keep the latest onDone without restarting the collapse animation if it changes
  const onDoneRef = useRef(onDone)
  useEffect(() => {
    onDoneRef.current = onDone
  })

  const { d, stroke } = useMemo(() => eraserStrokes(window.innerWidth, window.innerHeight), [])

  // Page background, for browsers that follow it: pink until the screen goes black.
  // (iOS 26 mostly ignores this while the overlay is up — see `takeover__bars` below.)
  useEffect(() => {
    tintBrowserChrome(phase === 'better' || phase === 'greeting' ? '#000' : null)
  }, [phase])
  useEffect(() => () => tintBrowserChrome(null), [])

  // 1. Expand from the button to full screen
  useLayoutEffect(() => {
    const overlay = overlayRef.current
    const label = labelRef.current
    const origin = originRef.current
    if (!overlay || !label || !origin) return

    const timing = { duration: reducedMotion() ? 0 : EXPAND_MS, easing: EASE_IN_OUT, fill: 'both' as const }
    const grow = overlay.animate([{ clipPath: clipToElement(origin, overlay) }, { clipPath: FULL_SCREEN }], timing)
    const glide = label.animate([{ transform: labelAtElement(origin, overlay, label) }, { transform: 'none' }], timing)

    let timer = 0
    glide.finished
      .then(() => {
        // Bake the end state into the styles and drop the animations: iOS Safari holds off
        // re-colouring its bars while a fixed element still has an animation attached.
        overlay.style.clipPath = FULL_SCREEN
        grow.cancel()
        glide.cancel()
        if (quick) setPhase('greeting')
        else timer = window.setTimeout(() => setPhase('erasing'), reducedMotion() ? 0 : PAUSE_BEFORE_ERASE_MS)
      })
      .catch(() => {}) // cancelled
    return () => {
      grow.cancel()
      glide.cancel()
      clearTimeout(timer)
    }
  }, [originRef, quick])

  // 2. Wipe the pink away
  useLayoutEffect(() => {
    if (phase !== 'erasing') return
    const path = pathRef.current
    const eraser = eraserRef.current
    if (!path || !eraser) return

    const length = path.getTotalLength()
    const duration = reducedMotion() ? 0 : ERASE_MS
    path.style.strokeDasharray = `${length}`

    let raf = 0
    let start = 0
    const draw = (progress: number) => {
      path.style.strokeDashoffset = `${length * (1 - progress)}`
      const tip = path.getPointAtLength(length * progress)
      eraser.style.transform = `translate(${tip.x}px, ${tip.y}px) translate(-50%, -50%)`
    }
    const tick = (now: number) => {
      start ||= now
      const t = duration ? Math.min(1, (now - start) / duration) : 1
      draw(easeInOut(t))
      if (t < 1) raf = requestAnimationFrame(tick)
      else setPhase('better')
    }
    draw(0) // position everything before the first paint
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase])

  // 3. Hold "Better??? Goshh", then move on to the black greeting
  useEffect(() => {
    if (phase !== 'better') return
    const timer = window.setTimeout(() => setPhase('greeting'), BETTER_HOLD_MS)
    return () => clearTimeout(timer)
  }, [phase])

  // 4. Hand keyboard focus to "back to pink"
  useEffect(() => {
    if (phase === 'greeting') backRef.current?.focus({ preventScroll: true })
  }, [phase])

  // 5. Shrink back into the button
  useLayoutEffect(() => {
    if (phase !== 'collapsing') return
    const overlay = overlayRef.current
    const fill = fillRef.current
    const label = labelRef.current
    const origin = originRef.current
    if (!overlay || !fill || !label || !origin) return

    const reduce = reducedMotion()
    const timing = { duration: reduce ? 0 : COLLAPSE_MS, easing: EASE_IN_OUT, fill: 'both' as const }
    const hotPink = getComputedStyle(origin).backgroundColor

    const shrink = overlay.animate([{ clipPath: FULL_SCREEN }, { clipPath: clipToElement(origin, overlay) }], timing)
    const recolour = fill.animate([{ backgroundColor: '#000' }, { backgroundColor: hotPink }], timing)
    const glide = label.animate(
      [
        { transform: 'none', opacity: 0 },
        { opacity: 0, offset: 0.4 },
        { transform: labelAtElement(origin, overlay, label), opacity: 1 },
      ],
      timing,
    )

    let fade: Animation | undefined
    shrink.finished
      .then(() => {
        // Fade the stand-in away to reveal the real button underneath
        fade = overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: reduce ? 0 : 150, fill: 'both' })
        return fade.finished
      })
      .then(() => onDoneRef.current())
      .catch(() => {}) // cancelled
    return () => {
      shrink.cancel()
      recolour.cancel()
      glide.cancel()
      fade?.cancel()
    }
  }, [phase, originRef])

  // "hi": the greeting fades away first, then we move on
  const [leaving, setLeaving] = useState(false)
  const sayHi = () => {
    if (leaving) return
    setLeaving(true)
    window.setTimeout(() => onHi(), FADE_OUT_MS)
  }

  const backToPink = () => {
    onCollapseStart()
    setPhase('collapsing')
  }

  const isDark = phase === 'better' || phase === 'greeting' || phase === 'collapsing'
  const showGreeting = phase === 'greeting' || phase === 'collapsing'

  const classes = ['takeover']
  if (isDark) classes.push('is-dark')
  if (showGreeting) classes.push('is-greeting')
  if (phase === 'collapsing') classes.push('is-collapsing')
  if (quick) classes.push('is-quick')
  if (leaving) classes.push('is-leaving')

  return (
    <>
      <div
        ref={overlayRef}
        className={classes.join(' ')}
        role="dialog"
        aria-modal="true"
        aria-label={labelText}
      >
        {/* The colour lives on this layer, not on the fixed overlay itself — see the CSS */}
        <div ref={fillRef} className="takeover__fill" aria-hidden="true" />

        <div ref={labelRef} className="takeover__label" aria-hidden="true">
          {labelText}
        </div>

        {!quick && phase !== 'expanding' && (
          <svg className="takeover__erase" width="100%" height="100%" aria-hidden="true">
            <defs>
              <mask id="takeover-wipe" maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
                <path
                  ref={pathRef}
                  d={d}
                  fill="none"
                  stroke="#fff"
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </mask>
            </defs>
            {/* Once the wipe is done, drop the mask so no pink slivers can survive */}
            <g mask={phase === 'erasing' ? 'url(#takeover-wipe)' : undefined}>
              <rect width="100%" height="100%" fill="#000" />
              <text className="takeover__better" x="50%" y="50%" textAnchor="middle" dominantBaseline="central">
                <tspan x="50%" dy="-0.55em">
                  Better???
                </tspan>
                <tspan x="50%" dy="1.1em">
                  Goshh
                </tspan>
              </text>
            </g>
          </svg>
        )}

        {phase === 'erasing' && (
          <div
            ref={eraserRef}
            className="takeover__eraser"
            style={{ width: stroke * 0.5, height: stroke * 0.95 }}
            aria-hidden="true"
          />
        )}

        {/* Screen readers get the message as text */}
        {isDark && !quick && <p className="visually-hidden" aria-live="polite">Better??? Goshh</p>}

        {showGreeting && (
          <div className="takeover__greeting">
            <Greeting animate={false}>
              <button
                type="button"
                className="btn btn--hi"
                onClick={sayHi}
                disabled={phase === 'collapsing' || leaving}
              >
                hi
              </button>
              <span className="landing__or">or</span>
              <button
                ref={backRef}
                type="button"
                className="btn btn--back"
                onClick={backToPink}
                disabled={phase === 'collapsing' || leaving}
              >
                back to pink
              </button>
            </Greeting>
          </div>
        )}
      </div>

      {/*
        iOS 26 Safari colours its top and bottom bars from a full-screen fixed element when
        one appears or disappears, but does NOT notice it changing colour (we saw the bars stay
        hot pink for the whole black screen, then flip to pink only when the overlay went away).
        So when the screen turns black, black arrives as a brand-new top-level fixed element.
        It sits just under the overlay, which is already black, so it can't be seen. It goes
        again as we collapse.
      */}
      {(phase === 'better' || phase === 'greeting') && <div className="takeover__bars" aria-hidden="true" />}
    </>
  )
}

export default PinkTakeover
