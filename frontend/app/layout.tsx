import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI System',
  description: 'Web Scraping, Sentiment Analysis, and AI Chatbot',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th">
      <body className="bg-white text-gray-900">{children}</body>
    </html>
  )
}
