'use client'

import { useCallback, useEffect, useState } from 'react'

const SOUND_KEY = 'sitewords-sound'

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.25,
  delay = 0,
) {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = type
    osc.frequency.setValueAtTime(frequency, ctx.currentTime + delay)
    gain.gain.setValueAtTime(volume, ctx.currentTime + delay)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration)
    osc.start(ctx.currentTime + delay)
    osc.stop(ctx.currentTime + delay + duration)
    setTimeout(() => ctx.close(), (delay + duration) * 1000 + 200)
  } catch {
    // Audio not available
  }
}

export function useSounds() {
  const [soundOn, setSoundOn] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(SOUND_KEY)
    if (stored !== null) setSoundOn(stored === 'true')
  }, [])

  const toggle = useCallback(() => {
    setSoundOn((prev) => {
      const next = !prev
      localStorage.setItem(SOUND_KEY, String(next))
      return next
    })
  }, [])

  const ding = useCallback(() => {
    if (!soundOn) return
    playTone(880, 0.15)
    playTone(1108, 0.25, 'sine', 0.2, 0.1)
  }, [soundOn])

  const miss = useCallback(() => {
    if (!soundOn) return
    playTone(300, 0.2, 'sine', 0.15)
  }, [soundOn])

  const fanfare = useCallback(() => {
    if (!soundOn) return
    // C-E-G-C ascending arpeggio
    const notes = [523, 659, 784, 1047]
    notes.forEach((freq, i) => playTone(freq, 0.35, 'sine', 0.25, i * 0.18))
  }, [soundOn])

  return { soundOn, toggle, ding, miss, fanfare }
}
