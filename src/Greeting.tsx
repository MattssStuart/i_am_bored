import type { ReactNode } from 'react'
import './Landing.css'

const WORDS = ['Hey', 'Hi', 'Hello']
const WORD_GAP_S = 0.9

type Props = {
  /** Seconds before the first word starts sliding up */
  startDelay?: number
  /** false = show everything at once, with no slide-up (the parent animates it instead) */
  animate?: boolean
  /** The buttons shown under the words, fading in after "Hello" */
  children: ReactNode
}

/** "Hey / Hi / Hello" sliding up one by one, then a row of buttons. */
function Greeting({ startDelay = 0.4, animate = true, children }: Props) {
  const buttonsDelay = startDelay + WORDS.length * WORD_GAP_S + 0.2

  return (
    <div className={`landing__content${animate ? '' : ' landing__content--static'}`}>
      <h1 className="landing__words" aria-label={WORDS.join(', ')}>
        {WORDS.map((word, i) => (
          <span
            key={word}
            className="landing__word"
            aria-hidden="true"
            style={{ animationDelay: `${startDelay + i * WORD_GAP_S}s` }}
          >
            {word}
          </span>
        ))}
      </h1>

      <div className="landing__actions" style={{ animationDelay: `${buttonsDelay}s` }}>
        {children}
      </div>
    </div>
  )
}

export default Greeting
