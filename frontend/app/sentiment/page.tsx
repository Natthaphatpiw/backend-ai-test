'use client'

import { useState, useEffect } from 'react'
import { sentimentAPI } from '@/lib/api'
import Link from 'next/link'
import { ArrowLeft, Loader, RotateCcw, TrendingUp } from 'lucide-react'

interface ModelResult {
  sentiment: string
  confidence: number
  explanation?: string
}

interface SentimentResult {
  text: string
  timestamp: string
  models: Record<string, ModelResult>
  training_status: boolean
}

interface ConfusionMatrix {
  cm_nb: number[][]
  cm_lr: number[][]
  nb_metrics: Record<string, number>
  lr_metrics: Record<string, number>
}

// Training data is now loaded from backend's training_data.json
// Models are automatically trained on backend startup with 2996 samples
const TRAINING_STATS = {
  total: 2996,
  positive: 540,
  negative: 772,
  neutral: 1684
}

interface ConfusionMatrixProps {
  data: number[][]
  title: string
  colors: [string, string]
}

function ConfusionMatrixChart({ data, title, colors }: ConfusionMatrixProps) {
  const labels = ['Negative', 'Neutral', 'Positive']
  const max = Math.max(...data.flat())

  return (
    <div className="p-4">
      <h4 className="text-sm font-bold text-primary-900 mb-4">{title}</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="px-2 py-1 text-left bg-primary-50"></th>
              {labels.map((label) => (
                <th key={label} className="px-2 py-1 bg-primary-50 text-center">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i}>
                <td className="px-2 py-1 bg-primary-50 text-center font-medium">{labels[i]}</td>
                {row.map((val, j) => (
                  <td
                    key={`${i}-${j}`}
                    className="px-2 py-1 text-center font-bold text-white"
                    style={{
                      backgroundColor: `rgba(${colors[0] === 'blue' ? '59, 130, 246' : '34, 197, 94'}, ${(val / max) * 0.9 + 0.1})`,
                    }}
                  >
                    {val}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function SentimentPage() {
  const [text, setText] = useState('')
  const [result, setResult] = useState<SentimentResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [trainingStatus, setTrainingStatus] = useState<ConfusionMatrix | null>(null)

  useEffect(() => {
    loadTrainingStatus()
  }, [])

  const loadTrainingStatus = async () => {
    try {
      const response = await sentimentAPI.getTrainingStatus()
      if (response.data.trained) {
        setTrainingStatus(response.data as ConfusionMatrix)
      }
    } catch (err) {
      console.error('Failed to load training status:', err)
    }
  }

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) {
      setError('Please enter text to analyze')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await sentimentAPI.analyze(text)
      setResult(response.data)
    } catch (err) {
      setError('Failed to analyze sentiment')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getSentimentBadgeColor = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive':
        return 'bg-green-100 text-green-800'
      case 'negative':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50">
      {/* Header */}
      <header className="border-b border-primary-100 bg-white shadow-sm">
        <nav className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 text-primary-700 hover:text-primary-900">
            <ArrowLeft size={20} />
            Back
          </Link>
          <h1 className="text-2xl font-bold text-primary-900">Sentiment Analysis</h1>
          <div className="w-16" />
        </nav>
      </header>

      {/* Main Content */}
      <main className="container py-12">
        <div className="max-w-5xl mx-auto">
          {/* Pre-trained Models Info */}
          {trainingStatus && (
            <div className="card mb-8 bg-green-50 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-green-900 flex items-center gap-2">
                    <TrendingUp size={24} />
                    ✓ ML Models Pre-trained
                  </h3>
                  <p className="text-sm text-green-700 mt-1">
                    Models automatically trained on startup with {TRAINING_STATS.total.toLocaleString()} samples
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="bg-white p-3 rounded border border-green-100">
                  <p className="text-xs text-green-700 font-medium">Positive</p>
                  <p className="text-lg font-bold text-green-900">{TRAINING_STATS.positive}</p>
                </div>
                <div className="bg-white p-3 rounded border border-green-100">
                  <p className="text-xs text-green-700 font-medium">Negative</p>
                  <p className="text-lg font-bold text-green-900">{TRAINING_STATS.negative}</p>
                </div>
                <div className="bg-white p-3 rounded border border-green-100">
                  <p className="text-xs text-green-700 font-medium">Neutral</p>
                  <p className="text-lg font-bold text-green-900">{TRAINING_STATS.neutral}</p>
                </div>
              </div>
            </div>
          )}

          {/* Training Results */}
          {trainingStatus && (
            <div className="card mb-8 bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200">
              <h3 className="text-xl font-bold text-blue-900 mb-6">ML Model Performance</h3>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Naive Bayes */}
                <div className="bg-white p-4 rounded-lg border border-blue-100">
                  <h4 className="font-bold text-blue-900 mb-3">Naive Bayes</h4>
                  <div className="space-y-2 text-sm">
                    {Object.entries(trainingStatus.nb_metrics).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-primary-600 capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className="font-semibold text-primary-900">{(value * 100).toFixed(2)}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Logistic Regression */}
                <div className="bg-white p-4 rounded-lg border border-cyan-100">
                  <h4 className="font-bold text-cyan-900 mb-3">Logistic Regression</h4>
                  <div className="space-y-2 text-sm">
                    {Object.entries(trainingStatus.lr_metrics).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-primary-600 capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className="font-semibold text-primary-900">{(value * 100).toFixed(2)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Confusion Matrices */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg border border-blue-100">
                  <ConfusionMatrixChart
                    data={trainingStatus.cm_nb}
                    title="Naive Bayes Confusion Matrix"
                    colors={['blue', 'blue']}
                  />
                </div>
                <div className="bg-white p-4 rounded-lg border border-cyan-100">
                  <ConfusionMatrixChart
                    data={trainingStatus.cm_lr}
                    title="Logistic Regression Confusion Matrix"
                    colors={['cyan', 'cyan']}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Analysis Form */}
          <div className="card mb-8">
            <h2 className="text-2xl font-bold text-primary-900 mb-6">
              Sentiment Analysis
            </h2>

            <form onSubmit={handleAnalyze} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary-900 mb-2">
                  Enter text for sentiment analysis
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="E.g., สินค้านี้ดีมากค่ะ ราคาสมควร ส่งมาเร็ว"
                  className="input h-32 resize-none"
                />
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !text.trim()}
                className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading && <Loader size={20} className="animate-spin" />}
                {loading ? 'Analyzing...' : 'Analyze Sentiment'}
              </button>
            </form>
          </div>

          {/* Results */}
          {result && (
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-primary-900">
                  Analysis Results
                </h3>
                <button
                  onClick={() => {
                    setText('')
                    setResult(null)
                  }}
                  className="btn btn-secondary flex items-center gap-2"
                >
                  <RotateCcw size={20} />
                  New Analysis
                </button>
              </div>

              <div className="mb-8 p-4 bg-primary-50 rounded-lg border border-primary-200">
                <p className="text-primary-900 whitespace-pre-wrap">{result.text}</p>
              </div>

              <div className="space-y-6">
                {Object.entries(result.models).map(([modelName, data]) => (
                  <div key={modelName} className="border border-primary-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-lg font-semibold text-primary-900 capitalize">
                        {modelName === 'pre_trained' ? 'Pre-trained Model' : modelName.replace(/_/g, ' ')}
                      </h4>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSentimentBadgeColor(data.sentiment)}`}>
                        {data.sentiment}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-primary-600">Confidence</span>
                        <span className="font-semibold text-primary-900">
                          {(data.confidence * 100).toFixed(1)}%
                        </span>
                      </div>

                      {/* Confidence Bar */}
                      <div className="w-full bg-primary-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-accent-500 h-full rounded-full transition-all"
                          style={{ width: `${(data.confidence * 100).toFixed(1)}%` }}
                        />
                      </div>

                      {data.explanation && (
                        <div className="mt-4 p-3 bg-primary-50 rounded text-primary-700 text-sm">
                          {data.explanation}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
