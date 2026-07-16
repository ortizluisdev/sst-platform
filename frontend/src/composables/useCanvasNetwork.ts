import type { Ref } from 'vue'

export interface CanvasNetworkOptions {
  /** Node count above `mobileBreakpoint` */
  nodeCountDesktop?: number
  /** Node count at/below `mobileBreakpoint` */
  nodeCountMobile?: number
  mobileBreakpoint?: number
  velocityScale?: number
  radiusMin?: number
  radiusMax?: number
  repelRadius?: number
  repelForce?: number
  maxDistance?: number
  connectionAlpha?: number
  nodeAlphaSky?: number
  nodeAlphaNavy?: number
  shadowBlur?: number
  /** Probability [0-1] that a node is rendered in the "sky" tone instead of "navy" */
  skyProbability?: number
}

interface NetworkNode {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  tone: 'sky' | 'navy'
}

const DEFAULTS: Required<CanvasNetworkOptions> = {
  nodeCountDesktop: 56,
  nodeCountMobile: 30,
  mobileBreakpoint: 720,
  velocityScale: 0.35,
  radiusMin: 1.8,
  radiusMax: 2.2,
  repelRadius: 220,
  repelForce: 3,
  maxDistance: 140,
  connectionAlpha: 0.22,
  nodeAlphaSky: 0.55,
  nodeAlphaNavy: 0.4,
  shadowBlur: 6,
  skyProbability: 0.32,
}

/**
 * Particle-network canvas simulation shared by every RoMa section background.
 * Ported from the approved mockups' vanilla JS; only the tuning constants differ per section.
 */
export function useCanvasNetwork(canvasRef: Ref<HTMLCanvasElement | null>, options: CanvasNetworkOptions = {}) {
  const opts = { ...DEFAULTS, ...options }

  let ctx: CanvasRenderingContext2D | null = null
  let nodes: NetworkNode[] = []
  let rafId: number | null = null
  let running = false
  let resizeObserver: ResizeObserver | null = null
  const pointer = { x: 0, y: 0, active: false }

  function resizeCanvas() {
    const canvas = canvasRef.value
    if (!canvas || !ctx) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = canvas.offsetWidth * dpr
    canvas.height = canvas.offsetHeight * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  function initNodes() {
    const canvas = canvasRef.value
    if (!canvas) return
    const count = window.innerWidth < opts.mobileBreakpoint ? opts.nodeCountMobile : opts.nodeCountDesktop
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.offsetWidth,
      y: Math.random() * canvas.offsetHeight,
      vx: (Math.random() - 0.5) * opts.velocityScale,
      vy: (Math.random() - 0.5) * opts.velocityScale,
      r: Math.random() * (opts.radiusMax - opts.radiusMin) + opts.radiusMin,
      tone: Math.random() < opts.skyProbability ? 'sky' : 'navy',
    }))
  }

  function drawFrame() {
    const canvas = canvasRef.value
    if (!canvas || !ctx) return
    const w = canvas.offsetWidth
    const h = canvas.offsetHeight
    ctx.clearRect(0, 0, w, h)

    for (const n of nodes) {
      n.x += n.vx
      n.y += n.vy

      if (pointer.active) {
        const dx = n.x - pointer.x
        const dy = n.y - pointer.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < opts.repelRadius && dist > 0.01) {
          const force = ((opts.repelRadius - dist) / opts.repelRadius) * opts.repelForce
          n.x += (dx / dist) * force
          n.y += (dy / dist) * force
        }
      }

      if (n.x < -20) n.x = w + 20
      if (n.x > w + 20) n.x = -20
      if (n.y < -20) n.y = h + 20
      if (n.y > h + 20) n.y = -20
    }

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]!
        const b = nodes[j]!
        const dx = a.x - b.x
        const dy = a.y - b.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < opts.maxDistance) {
          const alpha = (1 - dist / opts.maxDistance) * opts.connectionAlpha
          ctx.strokeStyle = `rgba(30,58,102,${alpha})`
          ctx.lineWidth = 0.7
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
      }
    }

    for (const n of nodes) {
      ctx.beginPath()
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
      ctx.fillStyle = n.tone === 'sky' ? `rgba(91,141,199,${opts.nodeAlphaSky})` : `rgba(11,26,51,${opts.nodeAlphaNavy})`
      ctx.shadowBlur = opts.shadowBlur
      ctx.shadowColor = n.tone === 'sky' ? 'rgba(91,141,199,0.5)' : 'rgba(11,26,51,0.25)'
      ctx.fill()
      ctx.shadowBlur = 0
    }
  }

  function loop() {
    if (!running) return
    drawFrame()
    rafId = requestAnimationFrame(loop)
  }

  function handlePointerMove(event: PointerEvent) {
    const canvas = canvasRef.value
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    pointer.x = event.clientX - rect.left
    pointer.y = event.clientY - rect.top
    pointer.active = true
  }

  function handlePointerLeave() {
    pointer.active = false
  }

  /** Attaches listeners/observers and prepares the canvas. Idempotent. Call once on mount. */
  function setup() {
    const canvas = canvasRef.value
    if (!canvas || ctx) return
    ctx = canvas.getContext('2d')
    resizeCanvas()
    initNodes()
    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerleave', handlePointerLeave)
    resizeObserver = new ResizeObserver(() => {
      resizeCanvas()
      initNodes()
    })
    resizeObserver.observe(canvas)
  }

  /** Starts the animation loop. Safe to call repeatedly (e.g. on every IntersectionObserver entry). */
  function start() {
    setup()
    if (running) return
    running = true
    loop()
  }

  /** Stops the animation loop without tearing down listeners, so it can resume instantly. */
  function stop() {
    running = false
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  /** Renders a single static frame — used for `prefers-reduced-motion: reduce`. */
  function drawStaticFrame() {
    setup()
    drawFrame()
  }

  /** Removes all listeners/observers. Call on unmount. */
  function teardown() {
    stop()
    const canvas = canvasRef.value
    canvas?.removeEventListener('pointermove', handlePointerMove)
    canvas?.removeEventListener('pointerleave', handlePointerLeave)
    resizeObserver?.disconnect()
    resizeObserver = null
    ctx = null
  }

  return { setup, start, stop, drawStaticFrame, teardown }
}
