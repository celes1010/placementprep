import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import Navbar from '../components/Navbar'
import './Quiz.css'

const TIMER_SECONDS = 45

export default function Quiz() {
  const location = useLocation()
  const navigate = useNavigate()
  const session = location.state?.session

  const [question, setQuestion]       = useState(null)
  const [selected, setSelected]       = useState(null)
  const [revealed, setRevealed]       = useState(false)
  const [result, setResult]           = useState(null)
  const [loading, setLoading]         = useState(true)
  const [submitting, setSubmitting]   = useState(false)
  const [difficulty, setDifficulty]   = useState(session?.difficulty || 'easy')
  const [streak, setStreak]           = useState(session?.streak || 0)
  const [qCount, setQCount]           = useState(0)
  const [score, setScore]             = useState(0)
  const [diffEvent, setDiffEvent]     = useState(null) // { direction, label }
  const [timer, setTimer]             = useState(TIMER_SECONDS)
  const [timerActive, setTimerActive] = useState(false)
  const timerRef = useRef(null)
  const startTimeRef = useRef(null)
  const questionRef = useRef(null)

  useEffect(() => {
    if (!session) { navigate('/topics'); return }
    fetchQuestion()
  }, [])

  useEffect(() => {
    if (timerActive && !revealed) {
      timerRef.current = setInterval(() => {
        setTimer(t => {
          if (t <= 1) { clearInterval(timerRef.current); autoSubmit(); return 0 }
          return t - 1
        })
      }, 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [timerActive, revealed])

  const autoSubmit = useCallback(async () => {
    if (revealed || !questionRef.current) return
    await submitAnswer(null)
  }, [revealed])

  const fetchQuestion = async () => {
    setLoading(true)
    setSelected(null)
    setRevealed(false)
    setResult(null)
    setDiffEvent(null)
    setTimer(TIMER_SECONDS)
    setTimerActive(false)
    clearInterval(timerRef.current)

    try {
      const res = await axios.post('/quiz/question', {
        session_id: session.session_id,
        topic: session.topic
      })
      questionRef.current = res.data
      setQuestion(res.data)
      setDifficulty(res.data.difficulty)
      startTimeRef.current = Date.now()
      setTimerActive(true)
    } catch (e) {
      alert('Failed to load question. Check your API key and try again.')
    } finally {
      setLoading(false)
    }
  }

  const submitAnswer = async (opt) => {
    if (revealed || submitting) return
    clearInterval(timerRef.current)
    setTimerActive(false)
    setSubmitting(true)

    const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000)
    const q = questionRef.current

    try {
      const res = await axios.post('/quiz/answer', {
        session_id: session.session_id,
        topic: session.topic,
        question_text: q.question,
        correct_option: q._meta.correct,
        selected_option: opt,
        explanation: q._meta.explanation,
        time_taken_seconds: timeTaken,
        difficulty: q.difficulty,
      })

      const data = res.data
      setRevealed(true)
      setSelected(opt)
      setResult(data)
      setStreak(data.streak)
      if (data.is_correct) setScore(s => s + 1)
      setQCount(c => c + 1)

      if (data.difficulty_changed) {
        const dir = data.difficulty_direction
        setDiffEvent({
          direction: dir,
          label: dir === 'up' ? `Level Up! → ${data.difficulty.toUpperCase()}` : `Adjusted → ${data.difficulty.toUpperCase()}`
        })
        setTimeout(() => setDifficulty(data.difficulty), 300)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSelect = (opt) => {
    if (revealed || loading || submitting) return
    setSelected(opt)
    submitAnswer(opt)
  }

  const handleEnd = async () => {
  try {
    const res = await axios.post('/quiz/end', { session_id: session.session_id })
    navigate('/results', { state: { 
      summary: res.data, 
      topic: session.topic,
      session_id: session.session_id
    }})
  } catch {
    navigate('/topics')
  }
}

  const diffColor = { easy: 'var(--easy)', medium: 'var(--medium)', hard: 'var(--hard)' }
  const timerPct = (timer / TIMER_SECONDS) * 100
  const timerColor = timer > 20 ? 'var(--green)' : timer > 10 ? 'var(--yellow)' : 'var(--red)'
  const q = question

  const getOptClass = (opt) => {
    if (!revealed) return selected === opt ? 'opt-selected' : ''
    const correct = q?._meta?.correct
    if (opt === correct) return 'opt-correct'
    if (opt === selected && opt !== correct) return 'opt-wrong'
    return 'opt-dim'
  }

  return (
    <div className="page">
      <Navbar />
      <div className="quiz-page animate-fadeIn">

        {/* Header bar */}
        <div className="quiz-topbar">
          <div className="quiz-topic-tag">{session?.topic}</div>

          <div className="quiz-meta">
            <div className="quiz-diff-pill" style={{ color: diffColor[difficulty], borderColor: diffColor[difficulty] }}>
              <span className="quiz-diff-dot" style={{ background: diffColor[difficulty] }} />
              {difficulty.toUpperCase()}
            </div>
            <div className="quiz-stat">
              <span>{score}/{qCount}</span>
              <span className="quiz-stat-label">Score</span>
            </div>
            <div className="quiz-stat">
              <span style={{ color: streak > 0 ? 'var(--green)' : streak < 0 ? 'var(--red)' : 'var(--text)' }}>
                {streak > 0 ? `🔥 ${streak}` : streak < 0 ? `${streak}` : '—'}
              </span>
              <span className="quiz-stat-label">Streak</span>
            </div>
          </div>

          <button className="btn btn-ghost quiz-end-btn" onClick={handleEnd}>
            End Session
          </button>
        </div>

        {/* Difficulty event banner */}
        {diffEvent && (
          <div className={`diff-event ${diffEvent.direction === 'up' ? 'diff-up' : 'diff-down'} animate-slideDown`}>
            {diffEvent.direction === 'up' ? '⬆' : '⬇'} {diffEvent.label}
          </div>
        )}

        {/* Main quiz card */}
        {loading ? (
          <div className="quiz-loading">
            <div className="quiz-loading-spinner" />
            <p>Generating question…</p>
          </div>
        ) : q ? (
          <div className="quiz-card animate-pop" key={qCount}>

            {/* Timer bar */}
            <div className="timer-bar-wrap">
              <div
                className="timer-bar-fill"
                style={{ width: `${timerPct}%`, background: timerColor, transition: 'width 1s linear, background 0.5s' }}
              />
              <span className="timer-label mono" style={{ color: timerColor }}>{timer}s</span>
            </div>

            <div className="quiz-q-number mono">Q{qCount + 1}</div>
            <p className="quiz-question">{q.question}</p>

            <div className="quiz-options">
              {Object.entries(q.options).map(([key, val]) => (
                <button
                  key={key}
                  className={`quiz-opt ${getOptClass(key)}`}
                  onClick={() => handleSelect(key)}
                  disabled={revealed || submitting}
                >
                  <span className="opt-key mono">{key}</span>
                  <span className="opt-val">{val}</span>
                  {revealed && key === q._meta.correct && <span className="opt-check">✓</span>}
                  {revealed && key === selected && key !== q._meta.correct && <span className="opt-cross">✗</span>}
                </button>
              ))}
            </div>

            {/* Explanation */}
            {revealed && (
              <div className={`quiz-explanation animate-slideDown ${result?.is_correct ? 'expl-correct' : selected ? 'expl-wrong' : 'expl-timeout'}`}>
                <div className="expl-header">
                  {result?.is_correct ? '✅ Correct!' : selected ? '❌ Incorrect' : '⏰ Time\'s up!'}
                </div>
                <p>{q._meta.explanation}</p>
              </div>
            )}

            {revealed && (
              <button className="btn btn-primary quiz-next-btn animate-fadeUp" onClick={fetchQuestion}>
                Next Question →
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
