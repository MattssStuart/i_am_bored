import { useEffect, useState } from 'react'
import ChaseScene from './ChaseScene'
import Finale from './Finale'
import Question from './Question'
import TypedText from './TypedText'
import { tintBrowserChrome, type Theme } from './theme'
import './Landing.css' // the .btn styles
import './HiPage.css'

type Props = {
  /** Which colour we were on when "hi" was pressed */
  theme: Theme
  /** "restart" was pressed on the last page — back to the very beginning */
  onRestart: () => void
}

/**
 * What "hi" leads to: a line typed out in real time, which fades out as the
 * cat-and-crocodile scene begins, then "Was that cool?" (and "no" isn't an option),
 * then a sign-off with a restart button.
 */
function HiPage({ theme, onRestart }: Props) {
  const [stage, setStage] = useState<'typing' | 'scene' | 'question' | 'finale'>('typing')
  // The typed line outlives the 'typing' stage: it's still fading out as the scene begins
  const [showTyped, setShowTyped] = useState(true)

  // Match the iPhone's top and bottom bars to the page
  useEffect(() => {
    tintBrowserChrome(theme === 'black' ? '#000' : null)
    return () => tintBrowserChrome(null)
  }, [theme])

  return (
    <main className={`hi theme-${theme}`}>
      {/* The scene starts (its line begins to draw) while the text is still fading out */}
      {showTyped && (
        <TypedText
          className="hi__typed"
          text="I needed something to do and this was it..."
          onFadeStart={() => setStage('scene')}
          onGone={() => setShowTyped(false)}
        />
      )}

      {stage === 'scene' && <ChaseScene onFinished={() => setStage('question')} />}

      {stage === 'question' && <Question onYes={() => setStage('finale')} />}

      {stage === 'finale' && <Finale theme={theme} onRestart={onRestart} />}
    </main>
  )
}

export default HiPage
