import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { reducedMotion } from './motion'
import { FADE_OUT_MS } from './theme'

/*
 * "Did you enjoy that??" — "no" isn't really an option.
 *
 * Each press of "no" changes its text and drops it further down the screen. The fourth press
 * sends it off the bottom completely, and "yes" grows into "yes, I absolutely enjoyed it".
 * Pressing "yes" fades the page away and hands over to the next one.
 */

/** What "no" says: at the start, then after each of the first three presses. */
const NO_LABELS = ['no', 'seriously?', 'you sure?', 'so you hate me?']
const NO_PRESSES_TO_GO = 4
/**
 * After the last press, "yes" starts growing once "no" is out of sight. "no" takes 0.6s to drop
 * (the transition on .hi__no), but it's off the screen a little before it lands.
 */
const NO_GONE_AFTER_MS = 500
/** "yes" growing into its big form: slow, and with a gentle ease so it never lurches */
const GROW_MS = 1800
const GROW_EASE = 'cubic-bezier(0.4, 0, 0.2, 1)'
/** Keep "no" this far from the bottom (the iPhone's home bar) and the sides of the screen */
const BOTTOM_MARGIN = 16
const SIDE_MARGIN = 16

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

type Props = {
  /** "yes" was pressed and the page has faded away */
  onYes: () => void
}

function Question({ onYes }: Props) {
  const yesRef = useRef<HTMLButtonElement>(null)
  const slotRef = useRef<HTMLSpanElement>(null)
  const noRef = useRef<HTMLButtonElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  // Where "yes" and the title were just before "no" went — the grow animation starts from there
  const yesFromRef = useRef<DOMRect | null>(null)
  const titleFromRef = useRef<DOMRect | null>(null)

  const [presses, setPresses] = useState(0) // how many times "no" has been pressed
  const [noDrop, setNoDrop] = useState(0) // how far "no" has dropped below its starting place, px
  const [noShift, setNoShift] = useState(0) // how far it's been nudged left to stay on screen, px (<= 0)
  const [noGone, setNoGone] = useState(false)
  const [leaving, setLeaving] = useState(false)

  const onYesRef = useRef(onYes)
  useEffect(() => {
    onYesRef.current = onYes
  })

  const pressNo = () => {
    const slot = slotRef.current
    if (!slot || leaving || presses >= NO_PRESSES_TO_GO) return
    const next = presses + 1

    // Every press drops "no" by the same amount. It has to be big enough that four presses take
    // "no" off the bottom of the screen (so its top edge is past the bottom after the fourth)...
    const toEdge = window.innerHeight - slot.getBoundingClientRect().top
    const smallest = (toEdge + 8) / NO_PRESSES_TO_GO
    // ...but small enough that after the third press the whole button is still on screen, clear
    // of the iPhone's home bar. On a very short screen there may be no such size: then the
    // smallest one that still gets it off the page wins (which still keeps it all on screen).
    const largest = (toEdge - slot.offsetHeight - BOTTOM_MARGIN) / (NO_PRESSES_TO_GO - 1)
    const step = largest >= smallest ? (smallest + largest) / 2 : smallest

    setNoDrop(step * next)
    setPresses(next)
  }

  // The longer labels are wider than "no" and grow to the right, which on a narrow phone would
  // push the end of them off the screen — so nudge the button left just enough to keep it in.
  useLayoutEffect(() => {
    const no = noRef.current
    const slot = slotRef.current
    if (!no || !slot) return
    const overflow = slot.getBoundingClientRect().left + no.offsetWidth - (window.innerWidth - SIDE_MARGIN)
    setNoShift(overflow > 0 ? -overflow : 0)
  }, [presses])

  // After the last press, once "no" has dropped out of sight, take it out and let "yes" take over
  useEffect(() => {
    if (presses < NO_PRESSES_TO_GO) return
    const timer = window.setTimeout(
      () => {
        yesFromRef.current = yesRef.current?.getBoundingClientRect() ?? null
        titleFromRef.current = titleRef.current?.getBoundingClientRect() ?? null
        setNoGone(true)
      },
      reducedMotion() ? 0 : NO_GONE_AFTER_MS,
    )
    return () => clearTimeout(timer)
  }, [presses])

  // "yes" grows out of the little button it was, in one smooth motion. Once "no" is gone the
  // layout settles into its final shape in a single jump; this animates from the old shape to the
  // new one instead, and the title glides to its new spot in step so it doesn't jump either.
  useLayoutEffect(() => {
    if (!noGone) return
    const yes = yesRef.current
    const title = titleRef.current
    if (!yes) return
    yes.focus({ preventScroll: true })

    const yesFrom = yesFromRef.current
    const titleFrom = titleFromRef.current
    if (!yesFrom || reducedMotion()) return
    const timing = { duration: GROW_MS, easing: GROW_EASE }

    const to = yes.getBoundingClientRect()
    const scale = clamp(yesFrom.width / to.width, 0.15, 1)
    const dx = yesFrom.left + yesFrom.width / 2 - (to.left + to.width / 2)
    const dy = yesFrom.top + yesFrom.height / 2 - (to.top + to.height / 2)
    const grow = yes.animate(
      [{ transform: `translate(${dx}px, ${dy}px) scale(${scale})` }, { transform: 'none' }],
      timing,
    )

    const titleTo = title?.getBoundingClientRect()
    const glide =
      title && titleFrom && titleTo
        ? title.animate([{ transform: `translateY(${titleFrom.top - titleTo.top}px)` }, { transform: 'none' }], timing)
        : undefined

    return () => {
      grow.cancel()
      glide?.cancel()
    }
  }, [noGone])

  // "yes": the page fades away first, then we move on
  const sayYes = () => {
    if (leaving) return
    setLeaving(true)
  }
  useEffect(() => {
    if (!leaving) return
    const timer = window.setTimeout(() => onYesRef.current(), FADE_OUT_MS)
    return () => clearTimeout(timer)
  }, [leaving])

  return (
    <div className={`hi__question${leaving ? ' hi__question--leaving' : ''}`}>
      <h1 ref={titleRef} className="hi__title">
        Did you enjoy that??
      </h1>
      <div className="hi__actions">
        <button
          ref={yesRef}
          type="button"
          className={`btn hi__btn${noGone ? ' hi__btn--big' : ''}`}
          onClick={sayYes}
          disabled={leaving}
        >
          {noGone ? 'yes, I absolutely enjoyed it' : 'yes'}
        </button>

        {!noGone && (
          // The slot keeps the space "no" started with, so "yes" doesn't shuffle around as the
          // label changes and "no" drops away. The real button floats on top of it.
          <span ref={slotRef} className="hi__no-slot">
            <span className="btn hi__btn hi__no-spacer" aria-hidden="true">
              no
            </span>
            <button
              ref={noRef}
              type="button"
              className="btn hi__btn hi__no"
              style={{ top: noDrop, left: noShift }}
              onClick={pressNo}
              disabled={leaving}
            >
              {NO_LABELS[Math.min(presses, NO_LABELS.length - 1)]}
            </button>
          </span>
        )}
      </div>
    </div>
  )
}

export default Question
