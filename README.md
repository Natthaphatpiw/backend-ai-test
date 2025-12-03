# AI System

A comprehensive web application with three main features: Web Scraping, Sentiment Analysis, and AI Chatbot with RAG capabilities.

## Project Structure

```
for-test-ai/
├── backend/          # FastAPI backend
│   ├── main.py       # Main FastAPI application
│   ├── config.py     # Configuration
│   ├── scrapers.py   # Web scraping functionality
│   ├── sentiment_analyzer.py  # Sentiment analysis
│   ├── chatbot.py    # AI Chatbot with RAG
│   ├── requirements.txt
│   └── .env.example
├── frontend/         # NextJS frontend
│   ├── app/
│   │   ├── page.tsx          # Home page
│   │   ├── scraper/          # Web scraper page
│   │   ├── sentiment/        # Sentiment analysis page
│   │   └── chatbot/          # Chatbot page
│   ├── lib/
│   │   └── api.ts    # API client
│   ├── package.json
│   └── .env.local
└── .gitignore
```

## Features

### 1. Web Scraper
- Scrape data from Yellow Pages Thailand (yellowpages.co.th)
- Search for any business type (e.g., "ร้านกาแฟ", "หมอ", "โรงแรม")
- Display results in a table format
- Export results to CSV

### 2. Sentiment Analysis
- Train machine learning models (Naive Bayes, Logistic Regression)
- Analyze sentiment using multiple models:
  - PhayathaiBERT (Pre-trained Thai BERT model)
  - Naive Bayes Classifier
  - Logistic Regression Classifier
  - GPT-4o-mini (OpenAI)
- Display confidence scores and explanations

### 3. AI Chatbot with RAG
- Chat with AI assistant powered by GPT-4o-mini
- Intelligent input normalization
- Advanced memory system (short-term and long-term)
- Upload PDF documents for context
- RAG (Retrieval-Augmented Generation) with Pinecone vector database
- Session-based conversations with reset capability

## Setup Instructions

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

5. Fill in your API keys in `.env`:
- `OPENAI_API_KEY`: Your OpenAI API key
- `PINECONE_API_KEY`: Your Pinecone API key

6. Run the server:
```bash
python main.py
# or
uvicorn main:app --reload
```

Backend will be available at: `http://localhost:8000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Run development server:
```bash
npm run dev
```

Frontend will be available at: `http://localhost:3000`

## API Endpoints

### Web Scraping
- `GET /api/scrape/yellow-pages-url?q={query}` - Get Yellow Pages URL
- `POST /api/scrape/yellow-pages` - Scrape Yellow Pages

### Sentiment Analysis
- `POST /api/sentiment/analyze` - Analyze sentiment
- `POST /api/sentiment/train` - Train models

### Chatbot
- `POST /api/chat/message` - Send message to chatbot
- `GET /api/chat/history` - Get conversation history
- `POST /api/chat/reset` - Reset chat session
- `POST /api/chat/upload` - Upload PDF document

### Health Check
- `GET /health` - Check API status
- `GET /` - Root endpoint

## Configuration

### Environment Variables

**Backend (.env)**
```
OPENAI_API_KEY=your-key-here
PINECONE_API_KEY=your-key-here
PINECONE_INDEX_NAME=developer-quickstart-py
PINECONE_CLOUD=aws
PINECONE_REGION=us-east-1
FASTAPI_HOST=0.0.0.0
FASTAPI_PORT=8000
```

**Frontend (.env.local)**
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
```

## Design System

The frontend uses a custom color scheme inspired by Claude's design:
- **Primary Colors**: Warm beige tones (#faf8f3 - #5c453c)
- **Accent Colors**: Soft orange tones (#fff9f0 - #54180d)
- **Typography**: Clean, readable fonts with proper hierarchy
- **No Emojis**: Professional, minimal design approach

## Dependencies

### Backend
- FastAPI: Web framework
- Transformers: BERT models
- Scikit-learn: ML algorithms
- LangChain: LLM integration
- Pinecone: Vector database
- OpenAI: GPT-4o-mini API

### Frontend
- Next.js: React framework
- Tailwind CSS: Styling
- Axios: HTTP client
- Lucide React: Icons

## Notes

- All paths in backend/frontend communication are hardcoded as specified
- Input normalization is performed before chatbot processing
- Each chat session is independent
- PDF documents are processed and stored for RAG retrieval
- Models are loaded on startup for better performance

## License

MIT License
