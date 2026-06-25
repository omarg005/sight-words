'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSounds } from '@/hooks/useSounds'
import { recordWordAttempt, recordListCompletion } from '@/app/actions/progress'

export type Word = { id: string; word: string; imageUrl: string | null }

interface Props {
  assignmentId: string
  studentId: string
  listId: string
  listName: string
  studentName: string
  inputMode: 'handwrite' | 'type'
  words: Word[]
  backHref: string
}

type Phase = 'ready' | 'active' | 'retry-intro' | 'complete'

function speakWord(word: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(word)
  u.rate = 0.85
  u.pitch = 1.1
  window.speechSynthesis.speak(u)
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function SightWordsActivity({
  assignmentId,
  studentId,
  listId,
  listName,
  studentName,
  inputMode,
  words,
  backHref,
}: Props) {
  const { soundOn, toggle: toggleSound, ding, miss, fanfare } = useSounds()

  const [phase, setPhase] = useState<Phase>('ready')
  const [queue, setQueue] = useState<Word[]>([])
  const [queueIndex, setQueueIndex] = useState(0)
  const [missedIds, setMissedIds] = useState<Set<string>>(new Set())
  const [practiceRounds, setPracticeRounds] = useState(0)
  const [totalRounds, setTotalRounds] = useState(0)

  // Handwrite mode
  const [showHandwriteActions, setShowHandwriteActions] = useState(false)

  // Type mode
  const [typeInput, setTypeInput] = useState('')
  const [typeAttempts, setTypeAttempts] = useState(0)
  const [showReveal, setShowReveal] = useState(false)
  const [typeFeedback, setTypeFeedback] = useState<'correct' | 'incorrect' | null>(null)

  // Star animation
  const [showStar, setShowStar] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)

  const currentWord = phase === 'active' ? queue[queueIndex] : null

  function startFirstRound() {
    setQueue(words)
    setQueueIndex(0)
    setMissedIds(new Set())
    setPracticeRounds(0)
    setTotalRounds(1)
    resetWordState()
    setPhase('active')
  }

  function resetWordState() {
    setShowHandwriteActions(false)
    setTypeInput('')
    setTypeAttempts(0)
    setShowReveal(false)
    setTypeFeedback(null)
  }

  function flashStar() {
    setShowStar(true)
    setTimeout(() => setShowStar(false), 700)
  }

  async function handleCorrect(word: Word) {
    ding()
    flashStar()
    recordWordAttempt({ studentId, assignmentId, wordId: word.id, correct: true, selfReported: inputMode === 'handwrite' }).catch(() => {})
    advanceQueue(false)
  }

  async function handleIncorrect(word: Word) {
    miss()
    recordWordAttempt({ studentId, assignmentId, wordId: word.id, correct: false, selfReported: inputMode === 'handwrite' }).catch(() => {})
    setMissedIds((prev) => new Set(prev).add(word.id))
    advanceQueue(true)
  }

  function advanceQueue(wasMiss: boolean) {
    const nextIndex = queueIndex + 1
    if (nextIndex < queue.length) {
      setQueueIndex(nextIndex)
      resetWordState()
    } else {
      // End of current queue
      const newMissed = new Set(missedIds)
      if (wasMiss) newMissed.add(queue[queueIndex].id)

      if (newMissed.size === 0) {
        finishSession()
      } else {
        setPracticeRounds(totalRounds)
        setMissedIds(newMissed)
        setPhase('retry-intro')
      }
    }
  }

  function startRetryRound() {
    const retryWords = shuffle(words.filter((w) => missedIds.has(w.id)))
    setQueue(retryWords)
    setQueueIndex(0)
    setMissedIds(new Set())
    setTotalRounds((r) => r + 1)
    resetWordState()
    setPhase('active')
  }

  async function finishSession() {
    fanfare()
    confetti({ particleCount: 180, spread: 80, origin: { y: 0.55 } })
    setTimeout(() => confetti({ particleCount: 80, spread: 60, angle: 60, origin: { x: 0, y: 0.6 } }), 300)
    setTimeout(() => confetti({ particleCount: 80, spread: 60, angle: 120, origin: { x: 1, y: 0.6 } }), 500)
    await recordListCompletion({ studentId, listId, assignmentId, practiceRoundsNeeded: totalRounds - 1 })
    setPhase('complete')
  }

  // Type mode handlers
  function handleTypeCheck() {
    if (!currentWord) return
    const answer = typeInput.trim().toLowerCase()
    const target = currentWord.word.trim().toLowerCase()

    if (answer === target) {
      setTypeFeedback('correct')
      ding()
      flashStar()
      recordWordAttempt({ studentId, assignmentId, wordId: currentWord.id, correct: true, selfReported: false }).catch(() => {})
      setTimeout(() => advanceQueue(false), 800)
    } else {
      setTypeFeedback('incorrect')
      miss()
      const attempts = typeAttempts + 1
      setTypeAttempts(attempts)
      if (attempts >= 3) {
        setShowReveal(true)
        recordWordAttempt({ studentId, assignmentId, wordId: currentWord.id, correct: false, selfReported: false }).catch(() => {})
      } else {
        setTypeInput('')
        setTimeout(() => setTypeFeedback(null), 600)
      }
    }
  }

  function handleTypeRevealNext() {
    if (!currentWord) return
    advanceQueue(true)
  }

  // Focus input when word changes in type mode
  useEffect(() => {
    if (phase === 'active' && inputMode === 'type') {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [phase, queueIndex, inputMode])

  const totalWords = words.length
  const progressPct = phase === 'active' ? Math.round((queueIndex / queue.length) * 100) : 0

  // ─── READY SCREEN ────────────────────────────────────────────────────────────
  if (phase === 'ready') {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-6 py-8 sm:py-12 text-center px-4">
        <div className="text-6xl">📚</div>
        <h1 className="text-3xl font-bold">{listName}</h1>
        <p className="text-muted-foreground">
          {totalWords} word{totalWords !== 1 ? 's' : ''} · {inputMode === 'handwrite' ? 'Write on paper' : 'Type your answer'} mode
        </p>
        <p className="text-lg">Ready, <strong>{studentName}</strong>?</p>
        <Button size="lg" className="mt-2 w-full sm:w-auto text-xl px-10 py-7 rounded-2xl" onClick={startFirstRound}>
          Let&apos;s go! 🚀
        </Button>
        <Link href={backHref} className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to lists
        </Link>
      </div>
    )
  }

  // ─── RETRY INTRO ─────────────────────────────────────────────────────────────
  if (phase === 'retry-intro') {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-6 py-8 sm:py-12 text-center px-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="text-6xl"
        >
          💪
        </motion.div>
        <h2 className="text-3xl font-bold">Let&apos;s practice!</h2>
        <p className="text-xl text-muted-foreground">
          {missedIds.size} word{missedIds.size !== 1 ? 's' : ''} to review
        </p>
        <p className="text-muted-foreground">You&apos;ve got this — keep going!</p>
        <Button size="lg" className="mt-2 w-full sm:w-auto text-xl px-10 py-7 rounded-2xl" onClick={startRetryRound}>
          Practice now 📖
        </Button>
      </div>
    )
  }

  // ─── COMPLETE SCREEN ─────────────────────────────────────────────────────────
  if (phase === 'complete') {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-6 py-8 sm:py-12 text-center px-4">
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="text-8xl"
        >
          🏆
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-4xl font-bold"
        >
          Amazing job!
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xl text-muted-foreground"
        >
          You finished <strong>{listName}</strong>!
        </motion.p>
        {practiceRounds > 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-muted-foreground"
          >
            You practiced {practiceRounds} extra round{practiceRounds !== 1 ? 's' : ''} to get every word right. 🌟
          </motion.p>
        )}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="flex flex-col items-center gap-3 mt-4 w-full sm:w-auto"
        >
          <Button size="lg" onClick={startFirstRound} className="w-full sm:w-auto text-xl px-8 py-7 rounded-2xl">
            Practice again
          </Button>
          <Link href={backHref} className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to lists
          </Link>
        </motion.div>
      </div>
    )
  }

  // ─── ACTIVE WORD CARD ─────────────────────────────────────────────────────────
  if (!currentWord) return null

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 px-2 sm:px-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href={backHref} className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-white/60 hover:text-foreground">
          ← Exit
        </Link>
        <button
          onClick={toggleSound}
          className="rounded-full px-3 py-2 text-lg text-muted-foreground hover:bg-white/60"
          title={soundOn ? 'Mute sounds' : 'Unmute sounds'}
        >
          {soundOn ? '🔊' : '🔇'}
        </button>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-4 w-full rounded-full bg-gray-200/80 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          />
        </div>
        <p className="text-right text-xs text-muted-foreground">
          {queueIndex} / {queue.length}
        </p>
      </div>

      {/* Word card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentWord.id + '-' + queueIndex}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.25 }}
          className="relative flex flex-col items-center gap-5 rounded-3xl border-2 border-primary/20 bg-white p-6 sm:p-8 shadow-md"
        >
          {/* Star animation */}
          <AnimatePresence>
            {showStar && (
              <motion.div
                key="star"
                initial={{ scale: 0, opacity: 1, y: 0 }}
                animate={{ scale: 2, opacity: 0, y: -60 }}
                exit={{}}
                transition={{ duration: 0.6 }}
                className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 text-4xl"
              >
                ⭐
              </motion.div>
            )}
          </AnimatePresence>

          {/* Image */}
          {currentWord.imageUrl && (
            <div className="relative h-36 w-36 sm:h-44 sm:w-44">
              <Image
                src={currentWord.imageUrl}
                alt={currentWord.word}
                fill
                className="rounded-2xl object-contain"
                sizes="176px"
              />
            </div>
          )}

          {/* Word (always visible) */}
          <p className="text-5xl sm:text-6xl font-bold tracking-wide text-center leading-tight">
            {currentWord.word}
          </p>

          {/* Hear button */}
          <button
            onClick={() => speakWord(currentWord.word)}
            disabled={!soundOn}
            className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-6 py-3 text-base font-medium text-primary hover:bg-primary/10 active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
          >
            🔊 Hear the word
          </button>

          {/* ─── Handwrite controls ─── */}
          {inputMode === 'handwrite' && (
            <div className="w-full space-y-3">
              {!showHandwriteActions ? (
                <Button
                  className="w-full text-lg py-7 rounded-2xl active:scale-95 transition-transform"
                  onClick={() => setShowHandwriteActions(true)}
                >
                  ✏️ Write it, then tap here
                </Button>
              ) : (
                <div className="flex gap-3">
                  <Button
                    className="flex-1 py-7 text-lg rounded-2xl bg-green-500 hover:bg-green-600 active:scale-95 transition-transform text-white"
                    onClick={() => handleCorrect(currentWord)}
                  >
                    ✓ Got it!
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 py-7 text-lg rounded-2xl border-red-300 text-red-600 hover:bg-red-50 active:scale-95 transition-transform"
                    onClick={() => handleIncorrect(currentWord)}
                  >
                    ✗ Missed it
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ─── Type controls ─── */}
          {inputMode === 'type' && (
            <div className="w-full space-y-3">
              {showReveal ? (
                <div className="space-y-3 text-center">
                  <p className="text-muted-foreground text-sm">The word is:</p>
                  <p className="text-4xl font-bold text-primary">{currentWord.word}</p>
                  <Button className="w-full py-7 text-lg rounded-2xl active:scale-95 transition-transform" onClick={handleTypeRevealNext}>
                    Got it — next word →
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <Input
                      ref={inputRef}
                      value={typeInput}
                      onChange={(e) => {
                        setTypeInput(e.target.value)
                        setTypeFeedback(null)
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleTypeCheck()}
                      placeholder="Type the word…"
                      className={`text-xl h-14 text-center rounded-xl ${
                        typeFeedback === 'correct'
                          ? 'border-green-500 bg-green-50'
                          : typeFeedback === 'incorrect'
                          ? 'border-red-400 bg-red-50'
                          : ''
                      }`}
                      autoComplete="off"
                      autoCapitalize="none"
                    />
                    <Button onClick={handleTypeCheck} className="h-14 px-5 text-base rounded-xl active:scale-95 transition-transform">
                      Check →
                    </Button>
                  </div>
                  {typeFeedback === 'incorrect' && !showReveal && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center text-sm text-red-600"
                    >
                      {typeAttempts === 1 ? 'Not quite — try again!' : 'Almost! One more try.'}
                    </motion.p>
                  )}
                  {typeAttempts > 0 && (
                    <p className="text-center text-xs text-muted-foreground">
                      Attempt {typeAttempts} of 3
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
