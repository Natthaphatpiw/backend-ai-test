export interface ScrapedItem {
  name: string
  address: string
  map_link: string | null
  source_url: string
  scraped_at: string
}

export interface ScrapingResponse {
  query: string
  items_count: number
  items: ScrapedItem[]
}

export interface SentimentModelResult {
  sentiment: string
  confidence: number
  explanation?: string
}

export interface SentimentResponse {
  text: string
  timestamp: string
  models: Record<string, SentimentModelResult>
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface ChatResponse {
  message: string
  response: string
}

export interface ChatHistoryResponse {
  history: ChatMessage[]
}
