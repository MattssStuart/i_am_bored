import { useEffect, useRef, useState } from 'react'
import EwPinkTakeover from './EwPinkTakeover'
import Greeting from './Greeting'
import './Landing.css'

function Landing() {
  const ewPinkRef = useRef<HTMLButtonElement>(null)
  const [takeoverOpen, setTakeoverOpen] = useState(false)
  // The real "ew pink" button hides while the takeover pretends to be it
  const [ewPinkHidden, setEwPinkHidden] = useState(false)

  const openTakeover = () => {
    setEwPinkHidden(true)
    setTakeoverOpen(true)
  }

  const closeTakeover = () => setTakeoverOpen(false)

  // After the takeover closes (and the page is interactive again), put keyboard focus back
  const wasOpen = useRef(false)
  useEffect(() => {
    if (wasOpen.current && !takeoverOpen) ewPinkRef.current?.focus({ preventScroll: true })
    wasOpen.current = takeoverOpen
  }, [takeoverOpen])

  return (
    <>
      <main className="landing" inert={takeoverOpen}>
        <Greeting>
          {/* TODO: "hi" functionality comes later */}
          <button type="button" className="btn btn--hi">
            hi
          </button>
          <button
            ref={ewPinkRef}
            type="button"
            className="btn btn--ew"
            style={{ visibility: ewPinkHidden ? 'hidden' : undefined }}
            onClick={openTakeover}
          >
            ew pink
          </button>
        </Greeting>
      </main>

      {takeoverOpen && (
        <EwPinkTakeover
          originRef={ewPinkRef}
          onCollapseStart={() => setEwPinkHidden(false)}
          onDone={closeTakeover}
        />
      )}
    </>
  )
}

export default Landing
