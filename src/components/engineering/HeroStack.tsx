'use client'

import { useEffect, useRef, type CSSProperties } from 'react'
import { AppFace } from './ScanStory'

const PLATES = 7

/**
 * Desktop hero object: the visitor's app, already showing the layers underneath.
 * It assembles once on load and leans toward the pointer (eased, only while the pointer moves).
 * Phones and reduced-motion users get the still object; nothing here is required to read the page.
 */
export function HeroStack({ locale }: { locale: string }) {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = root.current
    const host = el?.closest('section')
    if (!el || !host) return
    const fine = window.matchMedia('(pointer: fine) and (prefers-reduced-motion: no-preference)')
    if (!fine.matches) return
    let frame = 0
    let tx = 0
    let ty = 0
    let x = 0
    let y = 0
    let last = 0
    const tick = (now: number) => {
      frame = 0
      const dt = last ? Math.min(64, now - last) : 16
      last = now
      const k = 1 - Math.exp(-dt / 140)
      x += (tx - x) * k
      y += (ty - y) * k
      el.style.setProperty('--px', x.toFixed(4))
      el.style.setProperty('--py', y.toFixed(4))
      if (Math.abs(tx - x) + Math.abs(ty - y) > 0.001) frame = requestAnimationFrame(tick)
      else last = 0
    }
    const move = (e: PointerEvent) => {
      const r = host.getBoundingClientRect()
      tx = ((e.clientX - r.left) / r.width) * 2 - 1
      ty = ((e.clientY - r.top) / r.height) * 2 - 1
      if (!frame) frame = requestAnimationFrame(tick)
    }
    const leave = () => {
      tx = 0
      ty = 0
      if (!frame) frame = requestAnimationFrame(tick)
    }
    host.addEventListener('pointermove', move)
    host.addEventListener('pointerleave', leave)
    return () => {
      host.removeEventListener('pointermove', move)
      host.removeEventListener('pointerleave', leave)
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div className="hero-device" ref={root} aria-hidden="true">
      <div className="hero-tilt">
        <div className="hero-stack">
          {Array.from({ length: PLATES }, (_, i) => (
            <div
              key={i}
              className="hero-plate"
              data-risk={i === 3 ? 'critical' : i === 2 ? 'warn' : undefined}
              style={{ '--i': i } as CSSProperties}
            >
              <span className="num">{String(i + 1).padStart(2, '0')}</span>
              {i === 0 && <AppFace locale={locale} />}
            </div>
          ))}
        </div>
      </div>
      <div className="hero-device-shadow" />
    </div>
  )
}
