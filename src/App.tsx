import { useState } from 'react'
import HiPage from './HiPage'
import Landing from './Landing'
import type { Theme } from './theme'

function App() {
  // The contact form (src/ContactForm.tsx) is kept for later.
  // Pressing "hi" moves on to the next page, in whichever colour we were on.
  const [hiTheme, setHiTheme] = useState<Theme | null>(null)

  // "restart" on the last page clears it, which brings back a fresh landing page
  if (hiTheme) return <HiPage theme={hiTheme} onRestart={() => setHiTheme(null)} />
  return <Landing onHi={setHiTheme} />
}

export default App
