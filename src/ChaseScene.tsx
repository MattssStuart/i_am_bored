import { useEffect, useRef, useState } from 'react'
import './ChaseScene.css'

/*
 * The chase, drawn on one canvas:
 *   1. a line draws across the screen
 *   2. a cat (with "!!!" over its head) runs across it, chased by a crocodile
 *   3. 2 seconds off screen, then they run back the other way — now the crocodile has the "!!!"
 *      and is chased by a pack of cats
 *   4. the cat runs back in from the right and sits in the middle, facing us
 *   5. fireworks go off above it, then the whole scene fades and `onFinished` fires
 *
 * Everything is white pixel art. The sprites are tiny grids of pixels (see below) that get
 * scaled up by a whole number so the edges stay crisp. Leg frames are chosen by how far the
 * animal has travelled, so the legs always keep pace with the ground (and slow down when
 * the cat slows down). Positions are a pure function of time, so the movement is smooth.
 */

const FADE_OUT_MS = 1000 // matches the transition on .scene--fading

// ---------- Timing (seconds) ----------
const LINE_AT = 0.25
const LINE_S = 0.9
const RUN_DELAY_S = 0.6 // the pause after the line is fully drawn, before the cat appears
const OFFSCREEN_GAP_S = 2
const ROCKET_S = 0.5
const SPARK_LIFE_S = 1.5
const BURST_OFFSETS_S = [0, 0.7, 1.15, 1.8, 2.3, 2.9, 3.4]
const REDUCED_HOLD_S = 2.2

const CHASERS = 6 // cats chasing the crocodile on the way back

// ---------- Sprites ----------
// '.' = empty, 'X' = white pixel. row(3, 5, 2) means 3 empty, 5 white, 2 empty.
const row = (...runs: number[]) => runs.map((n, i) => (i % 2 === 0 ? '.' : 'X').repeat(n)).join('')

// Cat facing right: 20 wide. Body first, then 4 leg poses underneath.
const CAT_BODY = [
  row(14, 1, 4, 1), //              ear tips
  row(0, 1, 13, 2, 2, 2), //        tail tip, ears
  row(0, 2, 12, 6), //              tail, head
  row(0, 2, 12, 6),
  row(0, 20), //                    tail, back, neck
  row(1, 19),
  row(3, 14, 3),
  row(3, 14, 3),
  row(4, 12, 4), //                 belly
]
const CAT_LEGS = [
  // 0: stretched out in the air
  [row(2, 3, 9, 3), row(1, 2, 13, 3), row(0, 2, 15, 2), ''],
  // 1: both pairs straight down
  [row(4, 3, 6, 3), row(4, 2, 8, 2), row(4, 2, 8, 2), row(3, 3, 7, 3)],
  // 2: tucked under in the air
  [row(6, 4, 2, 4), row(6, 4, 2, 4), '', ''],
  // 3: front paws landing forward, back legs pushing off
  [row(3, 3, 7, 4), row(2, 2, 10, 3), row(2, 2, 10, 3), row(1, 3, 10, 4)],
]

// Crocodile facing right: 38 wide.
const CROC_BODY = [
  row(14, 1, 2, 1, 2, 1, 2, 1), //  back spikes
  row(12, 16, 1, 2), //             back, eye bump
  row(10, 28), //                   back, top jaw
  row(8, 30),
  row(3, 26, 1, 1, 2, 1, 2, 1), //  mouth, with teeth
  row(1, 35), //                    bottom jaw, tail
  row(12, 16), //                   belly
]
const CROC_LEGS = [
  [row(10, 3, 13, 3), row(9, 2, 16, 2), ''],
  [row(13, 3, 8, 3), row(13, 3, 8, 3), row(12, 4, 8, 4)],
  [row(14, 4, 6, 4), '', ''],
  [row(12, 3, 9, 3), row(11, 3, 10, 3), row(10, 3, 11, 4)],
]

// The cat sitting, seen from the front (20 wide, body centred, tail curling up on the right).
// The eyes are holes, so the background shows through.
const CAT_SIT = [
  '.....X........X.....',
  '.....XX......XX.....',
  '.....XXX....XXX.....',
  '.....XXXXXXXXXX.....',
  '....XXXXXXXXXXXX....',
  '....XXX.XXXX.XXX....',
  '....XXX.XXXX.XXX....',
  '....XXXXXXXXXXXX....',
  '.....XXXXXXXXXX.....',
  '......XXXXXXXX......',
  '.....XXXXXXXXXX.....',
  '....XXXXXXXXXXXX..X.',
  '....XXXXXXXXXXXX..XX',
  '...XXXXXXXXXXXXXX.XX',
  '...XXXXXXXXXXXXXX.XX',
  '...XXXXXXXXXXXXXX.XX',
  '...XXXXXXXXXXXXXX.XX',
  '...XXXXXXXXXXXXXXXX.',
]

const CAT_W = 20
const CROC_W = 38
const CAT_HEAD = { cx: 17, top: 0 } // where the "!!!" go, in sprite pixels
const CROC_HEAD = { cx: 28, top: 1 } // over his head, not his snout

// Leg poses in the order they play, and how far (in sprite pixels) each one lifts the body
const FRAME_ORDER = [0, 3, 1, 2]
const FRAME_LIFT = [-1, 0, 0, -1] // indexed by pose
const FRAME_DIST = 4 // sprite pixels travelled per leg pose (so 16 per full stride)

type Sprite = { w: number; h: number; frames: HTMLCanvasElement[] }

function bake(rows: string[], w: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = rows.length
  const g = canvas.getContext('2d')!
  g.fillStyle = '#fff'
  rows.forEach((r, y) => {
    for (let x = 0; x < r.length; x++) if (r[x] === 'X') g.fillRect(x, y, 1, 1)
  })
  return canvas
}

function bakeAnimal(body: string[], legs: string[][], w: number): Sprite {
  const frames = legs.map((l) => bake([...body, ...l], w))
  return { w, h: frames[0].height, frames }
}

// ---------- Small helpers ----------
const easeOut = (u: number) => 1 - (1 - u) ** 3
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const mod = (n: number, m: number) => ((n % m) + m) % m

/** Which leg pose to show after travelling `dist` pixels. `offset` keeps a pack out of step. */
const poseAt = (dist: number, px: number, offset = 0) =>
  FRAME_ORDER[mod(Math.floor(dist / (FRAME_DIST * px)) + offset, 4)]

type Layout = {
  W: number
  H: number
  px: number // one sprite pixel, in canvas pixels
  groundY: number
  lineH: number
  speed: number // canvas pixels per second
  g1: number // length of the first running group
  g2: number // length of the second running group
  run1At: number
  run1Dur: number
  run2At: number
  run2Dur: number
  enterAt: number
  enterDist: number
  enterConstD: number
  enterConstT: number
  enterDecelT: number
  enterDur: number
  sitAt: number
  bursts: { launchAt: number; x: number; ty: number }[]
  fadeAt: number
}

type Rocket = { x: number; y0: number; ty: number; born: number }
type Spark = { x: number; y: number; vx: number; vy: number; age: number; life: number }

type Props = {
  /** The scene has played and faded away */
  onFinished: () => void
}

function ChaseScene({ onFinished }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [fading, setFading] = useState(false)

  const onFinishedRef = useRef(onFinished)
  useEffect(() => {
    onFinishedRef.current = onFinished
  })

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const cat = bakeAnimal(CAT_BODY, CAT_LEGS, CAT_W)
    const croc = bakeAnimal(CROC_BODY, CROC_LEGS, CROC_W)
    const sit = bake(CAT_SIT, 20)

    /** Sizes the canvas to the window and works out where and when everything happens. */
    const plan = (): Layout => {
      const dpr = window.devicePixelRatio || 1
      const cssW = window.innerWidth
      const cssH = window.innerHeight
      const W = Math.round(cssW * dpr)
      const H = Math.round(cssH * dpr)
      if (canvas.width !== W) canvas.width = W
      if (canvas.height !== H) canvas.height = H
      ctx.imageSmoothingEnabled = false // keep the pixel art crisp

      // ~4 css px per sprite pixel on an iPhone, up to 8 on a big screen
      const cssPx = clamp(Math.min(Math.floor(cssW / 90), Math.floor(cssH / 55)), 3, 8)
      const px = Math.max(1, Math.round(cssPx * dpr))
      const groundY = Math.round(H * 0.62)
      const speed = px * 60 // 60 sprite pixels a second (a leg pose every 1/15th of a second)

      const g1 = (CROC_W + 4 + CAT_W) * px
      const g2 = (CROC_W + 8 + (CHASERS - 1) * 24 + CAT_W) * px

      const run1At = LINE_AT + LINE_S + RUN_DELAY_S
      const run1Dur = (W + g1) / speed
      const run2At = run1At + run1Dur + OFFSCREEN_GAP_S
      const run2Dur = (W + g2) / speed

      // The cat runs in at full speed, then slows to a stop in the middle
      const enterAt = run2At + run2Dur + 0.5
      const enterDist = W / 2 + (CAT_W * px) / 2
      const enterConstD = Math.max(0, enterDist - (speed * 0.8) / 2)
      const enterConstT = enterConstD / speed
      const enterDecelT = (2 * (enterDist - enterConstD)) / speed
      const enterDur = enterConstT + enterDecelT

      const sitAt = enterAt + enterDur + 0.35
      const fireAt = sitAt + 0.7

      const catTop = groundY - sit.height * px
      const bursts = BURST_OFFSETS_S.map((offset, i) => {
        const side = i % 2 === 0 ? -1 : 1
        const yTop = H * 0.1
        const yBottom = Math.max(yTop + px * 4, catTop - H * 0.15)
        return {
          launchAt: fireAt + offset,
          x: W / 2 + side * (0.08 + Math.random() * 0.28) * W,
          ty: yTop + Math.random() * (yBottom - yTop),
        }
      })

      const lastLaunch = fireAt + BURST_OFFSETS_S[BURST_OFFSETS_S.length - 1]
      const fadeAt = reduce ? REDUCED_HOLD_S : lastLaunch + ROCKET_S + SPARK_LIFE_S + 0.2

      return {
        W,
        H,
        px,
        groundY,
        lineH: Math.max(2, Math.round(px * 0.5)),
        speed,
        g1,
        g2,
        run1At,
        run1Dur,
        run2At,
        run2Dur,
        enterAt,
        enterDist,
        enterConstD,
        enterConstT,
        enterDecelT,
        enterDur,
        sitAt,
        bursts,
        fadeAt,
      }
    }

    let L = plan()
    const onResize = () => {
      L = plan()
    }
    window.addEventListener('resize', onResize)

    // ---------- Drawing ----------
    const drawBitmap = (bmp: HTMLCanvasElement, x: number, y: number, flip: boolean) => {
      const { px } = L
      const w = bmp.width * px
      const h = bmp.height * px
      if (flip) {
        ctx.save()
        ctx.translate(Math.round(x) + w, Math.round(y))
        ctx.scale(-1, 1)
        ctx.drawImage(bmp, 0, 0, bmp.width, bmp.height, 0, 0, w, h)
        ctx.restore()
      } else {
        ctx.drawImage(bmp, 0, 0, bmp.width, bmp.height, Math.round(x), Math.round(y), w, h)
      }
    }

    /** Three "!" — the outer two lean away from the middle one. */
    const drawMarks = (cx: number, bottomY: number) => {
      const { px } = L
      const marks = [
        { dx: -5, tilt: -2, lower: 1 },
        { dx: 0, tilt: 0, lower: 0 },
        { dx: 5, tilt: 2, lower: 1 },
      ]
      ctx.fillStyle = '#fff'
      for (const m of marks) {
        const top = bottomY - (7 - m.lower) * px
        for (let r = 0; r < 7; r++) {
          if (r === 4) continue // the gap between the bar and the dot
          const lean = Math.round((m.tilt * (6 - r)) / 6)
          ctx.fillRect(Math.round(cx + (m.dx + lean - 1) * px), Math.round(top + r * px), 2 * px, px)
        }
      }
    }

    /** Draws an animal standing on the line, left edge at `x`. */
    const drawAnimal = (
      sprite: Sprite,
      x: number,
      pose: number,
      flip: boolean,
      marks: { cx: number; top: number } | null,
    ) => {
      const { px, groundY, W } = L
      if (x > W || x + sprite.w * px < 0) return
      const y = groundY - sprite.h * px + FRAME_LIFT[pose] * px
      drawBitmap(sprite.frames[pose], x, y, flip)
      if (marks) {
        const cx = flip ? x + (sprite.w - marks.cx) * px : x + marks.cx * px
        drawMarks(cx, y + (marks.top - 2) * px)
      }
    }

    const drawSitting = () => {
      const { px, groundY, W } = L
      drawBitmap(sit, W / 2 - (sit.width * px) / 2, groundY - sit.height * px, false)
    }

    // ---------- Fireworks ----------
    const rockets: Rocket[] = []
    const sparks: Spark[] = []
    let nextBurst = 0

    const spawnBurst = (cx: number, cy: number) => {
      const reach = Math.min(L.W, L.H) * 0.4 // how fast the outer ring flies out
      const rings = [
        { n: 30, v: 1 },
        { n: 20, v: 0.72 },
        { n: 12, v: 0.45 },
      ]
      for (const ring of rings) {
        const twist = Math.random() * Math.PI
        for (let k = 0; k < ring.n; k++) {
          const angle = twist + (k / ring.n) * Math.PI * 2
          const v = reach * ring.v * (0.8 + Math.random() * 0.3)
          sparks.push({
            x: cx,
            y: cy,
            vx: Math.cos(angle) * v,
            vy: Math.sin(angle) * v,
            age: 0,
            life: SPARK_LIFE_S * (0.75 + Math.random() * 0.25),
          })
        }
      }
    }

    const updateFireworks = (t: number, dt: number) => {
      const { px, groundY, bursts } = L
      const size = Math.max(2, px) // one sprite pixel, to match the pixel art
      const launchY = groundY - sit.height * px - 2 * px

      while (nextBurst < bursts.length && t >= bursts[nextBurst].launchAt) {
        rockets.push({ x: bursts[nextBurst].x, y0: launchY, ty: bursts[nextBurst].ty, born: t })
        nextBurst++
      }

      ctx.fillStyle = '#fff'
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i]
        const u = (t - r.born) / ROCKET_S
        if (u >= 1) {
          spawnBurst(r.x, r.ty)
          rockets.splice(i, 1)
          continue
        }
        for (let k = 0; k < 4; k++) {
          const uu = Math.max(0, u - k * 0.05)
          const y = r.y0 + (r.ty - r.y0) * easeOut(uu)
          ctx.globalAlpha = 1 - k * 0.22
          ctx.fillRect(Math.round(r.x - size / 2), Math.round(y), size, size)
        }
      }

      const gravity = Math.min(L.W, L.H) * 0.25
      const drag = Math.exp(-1.8 * dt)
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]
        s.age += dt
        if (s.age >= s.life) {
          sparks.splice(i, 1)
          continue
        }
        s.vx *= drag
        s.vy = s.vy * drag + gravity * dt
        s.x += s.vx * dt
        s.y += s.vy * dt
        ctx.globalAlpha = (1 - s.age / s.life) ** 0.7
        ctx.fillRect(Math.round(s.x - size / 2), Math.round(s.y - size / 2), size, size)
      }
      ctx.globalAlpha = 1
    }

    // ---------- The timeline ----------
    const distanceIn = (tt: number) => {
      if (tt <= L.enterConstT) return L.speed * tt
      const u = Math.min(tt - L.enterConstT, L.enterDecelT)
      return L.enterConstD + L.speed * u - (L.speed * u * u) / (2 * L.enterDecelT)
    }

    let finishTimer = 0
    let faded = false
    const fade = () => {
      faded = true
      setFading(true)
      finishTimer = window.setTimeout(() => onFinishedRef.current(), FADE_OUT_MS)
    }

    const draw = (t: number, dt: number) => {
      const { W, H, px, groundY, speed } = L
      ctx.clearRect(0, 0, W, H)

      // 1. the line
      const lineU = reduce ? 1 : easeOut(clamp((t - LINE_AT) / LINE_S, 0, 1))
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, groundY, Math.round(W * lineU), L.lineH)

      if (reduce) {
        // Less motion: no running or fireworks — just the cat sitting on the line
        drawSitting()
      } else if (t >= L.run1At && t < L.run1At + L.run1Dur) {
        // 2. right to left: the cat (leading) is chased by the crocodile
        const d = speed * (t - L.run1At)
        const left = W - d
        drawAnimal(cat, left, poseAt(d, px, 2), true, CAT_HEAD)
        drawAnimal(croc, left + (CAT_W + 4) * px, poseAt(d, px), true, null)
      } else if (t >= L.run2At && t < L.run2At + L.run2Dur) {
        // 3. left to right: now the crocodile leads, chased by cats
        const d = speed * (t - L.run2At)
        const left = -L.g2 + d
        for (let i = 0; i < CHASERS; i++) {
          drawAnimal(cat, left + i * 24 * px, poseAt(d, px, i + 1), false, null)
        }
        drawAnimal(croc, left + ((CHASERS - 1) * 24 + CAT_W + 8) * px, poseAt(d, px), false, CROC_HEAD)
      } else if (t >= L.enterAt && t < L.sitAt) {
        // 4. right to left again: the cat runs in from the right and stops in the middle
        const tt = t - L.enterAt
        const x = W - distanceIn(tt)
        const pose = tt < L.enterDur ? poseAt(distanceIn(tt), px, 2) : 1
        drawAnimal(cat, x, pose, true, null)
      } else if (t >= L.sitAt) {
        // 5. it sits, facing us, and the fireworks go off
        drawSitting()
        updateFireworks(t, dt)
      }

      if (!faded && t >= L.fadeAt) fade()
    }

    let raf = 0
    let start = 0
    let last = 0
    const frame = (now: number) => {
      start ||= now
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0
      last = now
      draw((now - start) / 1000, dt)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(finishTimer)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={`scene${fading ? ' scene--fading' : ''}`}
      role="img"
      aria-label="A cat and a crocodile chase each other across the screen, then the cat sits down while fireworks go off."
    />
  )
}

export default ChaseScene
