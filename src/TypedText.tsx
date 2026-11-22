import { useEffect, useRef, useState } from 'react'
import { reducedMotion } from './motion'

/** A beat of empty page before the first letter appears. */
const START_MS = 1500
/** Time before each letter appears. */
const LETTER_MS = 100
/** Time before each full stop appears — a slow, deliberate beat so "..." lands one dot at a time. */
const DOT_MS = 750
/** How long the finished text stays on screen before it starts to fade. */
const HOLD_MS = 1700
/** How long the fade-out takes. */
const FADE_MS = 900

type Props = {
  text: string
  /** The text has been typed, has stayed for a few seconds, and has just started to fade out */
  onFadeStart: () => void
  /** The fade has finished — the parent can stop rendering this */
  onGone: () => void
  className?: string
}

/** Types `text` out letter by letter, holds it for a few seconds, then fades it away. */
function TypedText({ text, onFadeStart, onGone, className }: Props) {
  // People who've asked for less motion get the whole line at once
  const [count, setCount] = useState(() => (reducedMotion() ? text.length : 0))
  const [fading, setFading] = useState(false)

  const onFadeStartRef = useRef(onFadeStart)
  const onGoneRef = useRef(onGone)
  useEffect(() => {
    onFadeStartRef.current = onFadeStart
    onGoneRef.current = onGone
  })

  // Type the next character after its delay (full stops take longer)
  useEffect(() => {
    if (count >= text.length) return
    const delay = count === 0 ? START_MS : text[count] === '.' ? DOT_MS : LETTER_MS
    const timer = window.setTimeout(() => setCount(count + 1), delay)
    return () => clearTimeout(timer)
  }, [count, text])

  // Once it's all there: hold it, then fade it out, then let the parent know it's gone
  useEffect(() => {
    if (count < text.length) return
    let goneTimer = 0
    const holdTimer = window.setTimeout(() => {
      setFading(true)
      onFadeStartRef.current()
      goneTimer = window.setTimeout(() => onGoneRef.current(), FADE_MS)
    }, HOLD_MS)
    return () => {
      clearTimeout(holdTimer)
      clearTimeout(goneTimer)
    }
  }, [count, text])

  return (
    <p
      className={className}
      aria-label={text}
      style={{ opacity: fading ? 0 : 1, transition: `opacity ${FADE_MS}ms ease` }}
    >
      {/*
        The letters that haven't been typed yet are still laid out, just invisible. That way the
        line breaks are decided up front and the text doesn't jump around as it grows.
      */}
      <span aria-hidden="true">{text.slice(0, count)}</span>
      <span aria-hidden="true" style={{ visibility: 'hidden' }}>
        {text.slice(count)}
      </span>
    </p>
  )
}

export default TypedText
