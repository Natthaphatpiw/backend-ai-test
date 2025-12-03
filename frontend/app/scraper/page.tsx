'use client'

import { useState, useEffect } from 'react'
import { scrapingAPI } from '@/lib/api'
import Link from 'next/link'
import { ArrowLeft, Download, Loader } from 'lucide-react'

interface ScrapedItem {
  name: string
  address: string
  category: string
  map_link: string | null
  source_url: string
  scraped_at: string
}

interface CategoryCount {
  category: string
  count: number
}

export default function ScraperPage() {
  const [query, setQuery] = useState('')
  const [maxPages, setMaxPages] = useState(3)
  const [items, setItems] = useState<ScrapedItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [url, setUrl] = useState('')

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value
    setQuery(newQuery)

    if (newQuery.trim()) {
      scrapingAPI.getYellowPagesUrl(newQuery)
        .then(res => setUrl(res.data.url))
        .catch(err => console.error('Error getting URL:', err))
    }
  }

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) {
      setError('Please enter a search query')
      return
    }

    setLoading(true)
    setError('')
    setItems([])

    try {
      const response = await scrapingAPI.scrapeYellowPages(query, maxPages)
      setItems(response.data.items)

      if (response.data.items.length === 0) {
        setError('No items found. Try a different search.')
      }
    } catch (err) {
      setError('Failed to scrape data. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    const csv = [
      ['Name', 'Address', 'Category', 'Map Link', 'Source URL', 'Scraped At'],
      ...items.map(item => [
        item.name,
        item.address,
        item.category,
        item.map_link || '',
        item.source_url,
        item.scraped_at
      ])
    ]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const href = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = href
    link.download = `yellow-pages-${query}-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const getCategoryStats = (): CategoryCount[] => {
    const counts: Record<string, number> = {}
    items.forEach(item => {
      const cat = item.category || 'Unknown'
      counts[cat] = (counts[cat] || 0) + 1
    })
    return Object.entries(counts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
  }

  const getAddressStats = (): CategoryCount[] => {
    const counts: Record<string, number> = {}
    items.forEach(item => {
      const addr = item.address?.split(' ')[0] || 'Unknown'
      counts[addr] = (counts[addr] || 0) + 1
    })
    return Object.entries(counts)
      .map(([address, count]) => ({ category: address, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }

  const categoryStats = getCategoryStats()
  const addressStats = getAddressStats()
  const maxCount = categoryStats.length > 0 ? Math.max(...categoryStats.map(s => s.count)) : 0
  const totalWithMap = items.filter(i => i.map_link).length
  const mapPercentage = items.length > 0 ? (totalWithMap / items.length) * 100 : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50">
      {/* Header */}
      <header className="border-b border-primary-100 bg-white shadow-sm">
        <nav className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 text-primary-700 hover:text-primary-900">
            <ArrowLeft size={20} />
            Back
          </Link>
          <h1 className="text-2xl font-bold text-primary-900">Web Scraper</h1>
          <div className="w-16" />
        </nav>
      </header>

      {/* Main Content */}
      <main className="container py-12">
        <div className="max-w-4xl mx-auto">
          {/* Search Form */}
          <div className="card mb-8">
            <h2 className="text-2xl font-bold text-primary-900 mb-6">
              Search Yellow Pages Thailand
            </h2>

            <form onSubmit={handleScrape} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary-900 mb-2">
                  What would you like to search for?
                </label>
                <input
                  type="text"
                  value={query}
                  onChange={handleQueryChange}
                  placeholder="e.g., ร้านกาแฟ, หมอ, โรงแรม"
                  className="input"
                />
                {url && (
                  <p className="mt-2 text-sm text-primary-600">
                    URL: <a href={url} target="_blank" rel="noopener noreferrer" className="text-accent-600 hover:underline break-all">
                      {url}
                    </a>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-primary-900 mb-2">
                  Number of pages to scrape (max 10)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={maxPages}
                    onChange={(e) => setMaxPages(parseInt(e.target.value))}
                    className="flex-1 h-2 bg-primary-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-sm font-bold text-primary-900 bg-primary-100 px-3 py-1 rounded min-w-fit">
                    {maxPages} {maxPages === 1 ? 'page' : 'pages'}
                  </span>
                </div>
                <p className="mt-2 text-xs text-primary-600">
                  More pages = More results (but takes longer to scrape)
                </p>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading && <Loader size={20} className="animate-spin" />}
                {loading ? 'Scraping...' : 'Start Scraping'}
              </button>
            </form>
          </div>

          {/* Results */}
          {items.length > 0 && (
            <div className="space-y-8">
              {/* Statistics Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
                  <p className="text-sm text-blue-700 font-medium mb-1">Total Results</p>
                  <p className="text-3xl font-bold text-blue-900">{items.length}</p>
                </div>
                <div className="card bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-200">
                  <p className="text-sm text-teal-700 font-medium mb-1">Categories</p>
                  <p className="text-3xl font-bold text-teal-900">{categoryStats.length}</p>
                </div>
                <div className="card bg-gradient-to-br from-cyan-50 to-cyan-100 border border-cyan-200">
                  <p className="text-sm text-cyan-700 font-medium mb-1">With Map</p>
                  <p className="text-3xl font-bold text-cyan-900">{items.filter(i => i.map_link).length}</p>
                </div>
              </div>

              {/* Visualizations Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Category Distribution - Horizontal Bar Chart */}
                {categoryStats.length > 0 && (
                  <div className="card">
                    <h3 className="text-lg font-bold text-primary-900 mb-6">Category Distribution</h3>
                    <div className="space-y-4">
                      {categoryStats.slice(0, 6).map((stat, idx) => {
                        const percentage = (stat.count / maxCount) * 100
                        const colors = [
                          'from-blue-400 to-blue-600',
                          'from-cyan-400 to-cyan-600',
                          'from-teal-400 to-teal-600',
                          'from-blue-500 to-cyan-600',
                          'from-teal-500 to-cyan-600',
                          'from-cyan-500 to-blue-600'
                        ]
                        return (
                          <div key={idx}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-primary-800 truncate flex-1 pr-3">
                                {stat.category || 'Unknown'}
                              </span>
                              <span className="text-sm font-bold text-white bg-gradient-to-r from-blue-500 to-blue-600 px-2 py-1 rounded">
                                {stat.count}
                              </span>
                            </div>
                            <div className="w-full bg-primary-100 rounded-full h-3 overflow-hidden">
                              <div
                                className={`h-full bg-gradient-to-r ${colors[idx]}`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Map Availability - Pie Chart */}
                <div className="card">
                  <h3 className="text-lg font-bold text-primary-900 mb-6">Map Availability</h3>
                  <div className="flex flex-col items-center justify-center py-6">
                    <div className="relative w-40 h-40">
                      <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                        <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="url(#gradient)"
                          strokeWidth="8"
                          strokeDasharray={`${2.51 * mapPercentage} ${251}`}
                          strokeLinecap="round"
                        />
                        <defs>
                          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#0ea5e9" />
                            <stop offset="100%" stopColor="#06b6d4" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold text-cyan-600">{mapPercentage.toFixed(0)}%</span>
                        <span className="text-xs text-primary-600">With Map</span>
                      </div>
                    </div>
                    <div className="mt-6 text-center">
                      <p className="text-sm text-primary-600">
                        <span className="font-semibold text-cyan-700">{totalWithMap}</span> out of <span className="font-semibold text-primary-900">{items.length}</span> items have map links
                      </p>
                    </div>
                  </div>
                </div>

                {/* Address Distribution - Vertical Bar Chart */}
                {addressStats.length > 0 && (
                  <div className="card lg:col-span-2">
                    <h3 className="text-lg font-bold text-primary-900 mb-6">Top Locations</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {addressStats.map((stat, idx) => {
                        const maxAddr = Math.max(...addressStats.map(s => s.count))
                        const height = (stat.count / maxAddr) * 100
                        const colors = [
                          'bg-blue-500',
                          'bg-cyan-500',
                          'bg-teal-500',
                          'bg-blue-600',
                          'bg-cyan-600',
                          'bg-teal-600',
                          'bg-blue-700',
                          'bg-cyan-700'
                        ]
                        return (
                          <div key={idx} className="flex flex-col items-center">
                            <div className="relative w-full h-32 bg-primary-100 rounded-t-lg overflow-hidden flex items-end justify-center">
                              <div
                                className={`w-2/3 rounded-t-md ${colors[idx]} transition-all`}
                                style={{ height: `${height}%` }}
                              />
                            </div>
                            <div className="w-full bg-primary-50 rounded-b-lg p-2 text-center">
                              <p className="text-xs font-bold text-primary-900 truncate">{stat.category}</p>
                              <p className="text-lg font-bold text-teal-600">{stat.count}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Results Table */}
              <div className="card">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-primary-900">
                    Results ({items.length} found)
                  </h3>
                  <button
                    onClick={handleExport}
                    className="btn btn-secondary flex items-center gap-2"
                  >
                    <Download size={20} />
                    Export CSV
                  </button>
                </div>

                <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Address</th>
                      <th>Category</th>
                      <th>Map</th>
                      <th>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="font-medium">{item.name}</td>
                        <td>{item.address}</td>
                        <td>
                          <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                            {item.category || 'Unknown'}
                          </span>
                        </td>
                        <td>
                          {item.map_link ? (
                            <a
                              href={item.map_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-accent-600 hover:underline"
                            >
                              View
                            </a>
                          ) : (
                            'N/A'
                          )}
                        </td>
                        <td>
                          <a
                            href={item.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent-600 hover:underline text-sm truncate"
                          >
                            Link
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
