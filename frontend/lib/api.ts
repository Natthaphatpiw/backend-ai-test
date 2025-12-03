import axios, { AxiosInstance } from 'axios'

const API_BASE_URL = "https://backend-ai-test.onrender.com/api"

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Web Scraping APIs
export const scrapingAPI = {
  getYellowPagesUrl: (query: string) =>
    api.get('/scrape/yellow-pages-url', { params: { q: query } }),

  scrapeYellowPages: (query: string, maxPages: number = 3) =>
    api.post('/scrape/yellow-pages', { query, max_pages: maxPages }),
}

// Sentiment Analysis APIs
export const sentimentAPI = {
  analyze: (text: string) =>
    api.post('/sentiment/analyze', { text }),

  train: (texts: string[], labels: number[]) =>
    api.post('/sentiment/train', { texts, labels }),

  getTrainingStatus: () =>
    api.get('/sentiment/training-status'),
}

// Chatbot APIs
export const chatbotAPI = {
  sendMessage: (message: string, useRag: boolean = true) =>
    api.post('/chat/message', { message, use_rag: useRag }),

  getHistory: () =>
    api.get('/chat/history'),

  resetChat: () =>
    api.post('/chat/reset'),

  uploadDocument: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/chat/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },
}

export default api
