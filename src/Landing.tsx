import { useEffect, useRef, useState } from 'react'
import PinkTakeover from './PinkTakeover'
import Greeting from './Greeting'
import { FADE_OUT_MS, type Theme } from './theme'
import './Landing.css'

type Props = {
  /** "hi" was pressed — move on, in the colour we were on */
  onHi: (theme: Theme) => void
}

function Landing({ onHi }: Props) {
  const switchRef = useRef<HTMLButtonElement>(null)
  const [takeoverOpen, setTakeoverOpen] = useState(false)
  // The real colour-switch button hides while the takeover pretends to be it
  const [switchHidden, setSwitchHidden] = useState(false)
  // Once we've been to black and back, the button becomes "back to black"
  const [returned, setReturned] = useState(false)
  // Later trips skip the wipe and "Better??? Goshh" — it just changes to black
  const [quick, setQuick] = useState(false)

  // "hi": the text and buttons fade away first, then we move on
  const [leaving, setLeaving] = useState(false)
  const sayHi = () => {
    if (leaving) return
    setLeaving(true)
    window.setTimeout(() => onHi('pink'), FADE_OUT_MS)
  }

  const switchLabel = returned ? 'back to black' : 'pink? really?'

  const openTakeover = () => {
    setQuick(returned)
    setSwitchHidden(true)
    setTakeoverOpen(true)
  }

  const closeTakeover = () => setTakeoverOpen(false)

  // After the takeover closes (and the page is interactive again), put keyboard focus back
  const wasOpen = useRef(false)
  useEffect(() => {
    if (wasOpen.current && !takeoverOpen) switchRef.current?.focus({ preventScroll: true })
    wasOpen.current = takeoverOpen
  }, [takeoverOpen])

  return (
    <>
      <main className={`landing${leaving ? ' landing--leaving' : ''}`} inert={takeoverOpen || leaving}>
        <Greeting>
          <button type="button" className="btn btn--hi" onClick={sayHi}>
            hi
          </button>
          <span className="landing__or">or</span>
          <button
            ref={switchRef}
            type="button"
            className={`btn ${returned ? 'btn--black' : 'btn--ew'}`}
            style={{ visibility: switchHidden ? 'hidden' : undefined }}
            onClick={openTakeover}
          >
            {switchLabel}
          </button>
        </Greeting>
      </main>

      {takeoverOpen && (
        <PinkTakeover
          originRef={switchRef}
          label={switchLabel}
          quick={quick}
          onHi={() => onHi('black')}
          onCollapseStart={() => {
            setSwitchHidden(false)
            setReturned(true)
          }}
          onDone={closeTakeover}
        />
      )}
    </>
  )
}

export default Landing
