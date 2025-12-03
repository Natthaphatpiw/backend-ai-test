'use client'

import { useState, useEffect, useRef } from 'react'
import { chatbotAPI } from '@/lib/api'
import Link from 'next/link'
import { ArrowLeft, Send, RotateCcw, Upload, Loader, X } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [useRag, setUseRag] = useState(true)
  const [uploadedFile, setUploadedFile] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    try {
      const response = await chatbotAPI.getHistory()
      if (response.data.history && Array.isArray(response.data.history)) {
        setMessages(response.data.history)
      }
    } catch (err) {
      console.error('Error loading history:', err)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)
    setError('')

    try {
      const response = await chatbotAPI.sendMessage(input, useRag)
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch (err) {
      setError('Failed to get response from chatbot')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async () => {
    try {
      await chatbotAPI.resetChat()
      setMessages([])
      setUploadedFile(null)
      setError('')
    } catch (err) {
      setError('Failed to reset chat')
      console.error(err)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      setError('Only PDF files are allowed')
      return
    }

    setUploading(true)
    setError('')

    try {
      const response = await chatbotAPI.uploadDocument(file)
      setUploadedFile(file.name)
    } catch (err) {
      setError('Failed to upload document')
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex flex-col">
      {/* Header */}
      <header className="border-b border-primary-100 bg-white shadow-sm">
        <nav className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 text-primary-700 hover:text-primary-900">
            <ArrowLeft size={20} />
            Back
          </Link>
          <h1 className="text-2xl font-bold text-primary-900">AI Chatbot</h1>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 text-primary-700 hover:text-primary-900"
          >
            <RotateCcw size={20} />
            Reset
          </button>
        </nav>
      </header>

      {/* Main Content */}
      <main className="container flex-1 py-6 flex flex-col">
        <div className="max-w-4xl mx-auto w-full flex flex-col h-full">
          {/* Chat Area */}
          <div className="flex-1 bg-white rounded-lg shadow-md p-6 mb-6 overflow-y-auto flex flex-col">
            {messages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4">💬</div>
                  <h2 className="text-2xl font-bold text-primary-900 mb-2">
                    Start a Conversation
                  </h2>
                  <p className="text-primary-600">
                    {uploadedFile
                      ? `Document "${uploadedFile}" loaded. Ask questions about it!`
                      : 'Type a message or upload a PDF to get started'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xl px-4 py-2 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-accent-500 text-white'
                          : 'bg-primary-100 text-primary-900'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      <span className="text-xs opacity-70 mt-1 block">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-primary-100 text-primary-900 px-4 py-2 rounded-lg">
                      <Loader className="animate-spin" size={20} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">
                <X size={20} />
              </button>
            </div>
          )}

          {/* Document Upload */}
          <div className="mb-6 p-4 bg-primary-50 rounded-lg border border-primary-200">
            <div className="flex items-center gap-4">
              <label className="flex-1 flex items-center gap-2 cursor-pointer">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
                <Upload size={20} className="text-accent-600" />
                <span className="text-primary-700 hover:text-primary-900">
                  {uploading ? 'Uploading...' : 'Upload PDF'}
                </span>
              </label>
              {uploadedFile && (
                <div className="text-sm text-primary-600">
                  Loaded: {uploadedFile}
                </div>
              )}
            </div>
          </div>

          {/* Input Area */}
          <div className="space-y-4">
            {/* RAG Toggle */}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useRag}
                  onChange={(e) => setUseRag(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-primary-700">Use document context (RAG)</span>
              </label>
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                disabled={loading}
                className="input flex-1"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="btn btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader size={20} className="animate-spin" />
                ) : (
                  <Send size={20} />
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
