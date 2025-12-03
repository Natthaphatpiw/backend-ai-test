'use client'

import Link from 'next/link'
import { Globe, BarChart3, MessageSquare } from 'lucide-react'
import { Header, FeatureCard } from '@/components'

export default function Home() {
  const features = [
    {
      icon: Globe,
      title: 'Web Scraper',
      description: 'Extract data from Yellow Pages Thailand. Search for any business type and get structured data.',
      href: '/scraper',
    },
    {
      icon: BarChart3,
      title: 'Sentiment Analysis',
      description: 'Analyze sentiment using multiple AI models including Naive Bayes, Logistic Regression, and Pre-trained Model',
      href: '/sentiment',
    },
    {
      icon: MessageSquare,
      title: 'AI Chatbot',
      description: 'Chat with an AI assistant that learns from documents. Upload PDFs and ask questions with RAG and Memory System.',
      href: '/chatbot',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex flex-col">
      <Header title="AI System by Natthaphat Toichatturat" />

      {/* Main Content */}
      <main className="container py-16 flex-1">
        <section className="text-center mb-16">
          <h2 className="text-5xl font-bold text-primary-900 mb-4">
            Welcome to AI System
          </h2>
          <p className="text-xl text-primary-600 max-w-2xl mx-auto">
            Powerful tools for web scraping, sentiment analysis, and AI conversations
          </p>
        </section>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {features.map((feature) => (
            <FeatureCard
              key={feature.title}
              {...feature}
            />
          ))}
        </div>

        {/* Quick Links */}
        <section className="bg-white rounded-lg shadow-md p-8">
          <h3 className="text-2xl font-bold text-primary-900 mb-6">Get Started</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <Link href="/scraper" className="btn btn-primary text-center">
              Start Scraping
            </Link>
            <Link href="/sentiment" className="btn btn-secondary text-center">
              Analyze Sentiment
            </Link>
            <Link href="/chatbot" className="btn btn-primary text-center">
              Chat Now
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-primary-100 bg-white">
        <div className="container py-8 text-center text-primary-600">
          <p>AI System 2024. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
