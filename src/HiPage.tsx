import { useEffect, useState } from 'react'
import ChaseScene from './ChaseScene'
import { tintBrowserChrome, type Theme } from './theme'
import './Landing.css' // the .btn styles
import './HiPage.css'

type Props = {
  /** Which colour we were on when "hi" was pressed */
  theme: Theme
}

/** What "hi" leads to: the cat-and-crocodile scene, then "Did you enjoy that??". */
function HiPage({ theme }: Props) {
  const [stage, setStage] = useState<'scene' | 'question'>('scene')

  // Match the iPhone's top and bottom bars to the page
  useEffect(() => {
    tintBrowserChrome(theme === 'black' ? '#000' : null)
    return () => tintBrowserChrome(null)
  }, [theme])

  return (
    <main className={`hi theme-${theme}`}>
      {stage === 'scene' ? (
        <ChaseScene onFinished={() => setStage('question')} />
      ) : (
        <div className="hi__question">
          <h1 className="hi__title">Did you enjoy that??</h1>
          <div className="hi__actions">
            {/* TODO: what "yes" and "no" do comes next */}
            <button type="button" className="btn hi__btn">
              yes
            </button>
            <button type="button" className="btn hi__btn">
              no
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

export default HiPage
