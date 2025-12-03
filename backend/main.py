from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict
from contextlib import asynccontextmanager
import logging
import os
from pathlib import Path
import tempfile

from config import settings
from scrapers import scrape_yellow_pages
from sentiment_analyzer import SentimentAnalyzer
from chatbot import AdvancedChatbot

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Suppress LangChain Pydantic V1 compatibility warning
logging.getLogger("langchain.pydantic_v1").setLevel(logging.ERROR)
logging.getLogger("pydantic.v1").setLevel(logging.ERROR)

# Initialize services
sentiment_analyzer = None
chatbot = None

def is_build_environment():
    """Check if we're in a build environment (Vercel, CI/CD, etc.)"""
    import os
    return (
        os.getenv('VERCEL') == '1' or
        os.getenv('CI') == 'true' or
        os.getenv('BUILD_ENV') == 'true' or
        os.getenv('NODE_ENV') == 'production' and not os.getenv('OPENAI_API_KEY')
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize services on startup and cleanup on shutdown"""
    global sentiment_analyzer, chatbot

    # Skip heavy initialization during builds to prevent OOM
    if is_build_environment():
        logger.info("Build environment detected - skipping heavy service initialization")
        yield
        return

    logger.info("Initializing services...")

    # Initialize Sentiment Analyzer (with auto-training disabled for production)
    try:
        sentiment_analyzer = SentimentAnalyzer(
            openai_api_key=settings.openai_api_key,
            auto_train=False  # Disable auto-training to prevent memory issues
        )
        logger.info("✓ Sentiment Analyzer initialized")
    except Exception as e:
        logger.warning(f"Sentiment Analyzer initialization warning: {e}")

    # Initialize Chatbot (lazy initialization - only when needed)
    # chatbot will be initialized on first use to save memory
    logger.info("Chatbot will be initialized on first use")

    yield

    logger.info("Shutting down services...")


# Initialize FastAPI app with lifespan
app = FastAPI(
    title="AI System API",
    description="Web Scraping, Sentiment Analysis, and AI Chatbot",
    version="1.0.0",
    lifespan=lifespan
)

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============== WEB SCRAPING ENDPOINTS ===============

class ScrapeRequest(BaseModel):
    query: str
    max_pages: int = 1


class ScrapeResponse(BaseModel):
    query: str
    items_count: int
    items: List[Dict]


@app.post("/api/scrape/yellow-pages", response_model=ScrapeResponse)
async def scrape_yellow_pages_endpoint(request: ScrapeRequest):
    """
    Scrape Yellow Pages for a given query
    Example: {"query": "ร้านกาแฟ", "max_pages": 1}
    """
    try:
        logger.info(f"Scraping Yellow Pages for: {request.query} (max {request.max_pages} pages)")
        items = scrape_yellow_pages(request.query, max_pages=request.max_pages)

        return ScrapeResponse(
            query=request.query,
            items_count=len(items),
            items=items
        )
    except Exception as e:
        logger.error(f"Error scraping: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/scrape/yellow-pages-url")
async def get_yellow_pages_url(q: str):
    """Get the actual Yellow Pages search URL for a query"""
    from scrapers import YellowPagesScraper
    scraper = YellowPagesScraper()
    url = scraper.build_search_url(q)
    return {"url": url, "query": q}


# =============== SENTIMENT ANALYSIS ENDPOINTS ===============

class SentimentRequest(BaseModel):
    text: str


class SentimentResponse(BaseModel):
    text: str
    timestamp: str
    models: Dict


@app.post("/api/sentiment/analyze", response_model=SentimentResponse)
async def analyze_sentiment(request: SentimentRequest):
    """
    Analyze sentiment of a given text
    Uses OpenAI GPT-4o-mini model + ML models (if trained)
    """
    try:
        if not sentiment_analyzer:
            raise HTTPException(status_code=503, detail="Sentiment Analyzer not initialized")

        result = sentiment_analyzer.analyze(request.text)
        return SentimentResponse(**result)
    except Exception as e:
        logger.error(f"Error analyzing sentiment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class SentimentTrainRequest(BaseModel):
    texts: List[str]
    labels: List[int]


@app.post("/api/sentiment/train")
async def train_sentiment_models(request: SentimentTrainRequest):
    """
    Train Naive Bayes and Logistic Regression models
    labels: -1 (Negative), 0 (Neutral), 1 (Positive)
    """
    try:
        if not sentiment_analyzer:
            raise HTTPException(status_code=503, detail="Sentiment Analyzer not initialized")

        result = sentiment_analyzer.train_models(request.texts, request.labels)
        return result
    except Exception as e:
        logger.error(f"Error training models: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/sentiment/training-status")
async def get_training_status():
    """Get ML models training status and metrics"""
    try:
        if not sentiment_analyzer:
            raise HTTPException(status_code=503, detail="Sentiment Analyzer not initialized")

        return sentiment_analyzer.training_history
    except Exception as e:
        logger.error(f"Error getting training status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============== CHATBOT ENDPOINTS ===============

class ChatRequest(BaseModel):
    message: str
    use_rag: bool = True


class ChatResponse(BaseModel):
    message: str
    response: str


def get_chatbot():
    """Lazy initialization of chatbot"""
    global chatbot
    if chatbot is None:
        try:
            chatbot = AdvancedChatbot(
                openai_api_key=settings.openai_api_key,
                pinecone_api_key=settings.pinecone_api_key,
                pinecone_index_name=settings.pinecone_index_name
            )
            logger.info("✓ Chatbot initialized on demand")
        except Exception as e:
            logger.error(f"Failed to initialize chatbot: {e}")
            raise HTTPException(status_code=503, detail="Chatbot initialization failed")
    return chatbot


@app.post("/api/chat/message")
async def chat_message(request: ChatRequest):
    """
    Send a message to the chatbot
    """
    try:
        bot = get_chatbot()
        response = bot.get_response(request.message, use_rag=request.use_rag)

        return ChatResponse(
            message=request.message,
            response=response
        )
    except Exception as e:
        logger.error(f"Error in chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/chat/history")
async def get_chat_history():
    """Get chat history for current session"""
    try:
        bot = get_chatbot()
        history = bot.get_conversation_history()
        return {"history": history}
    except Exception as e:
        logger.error(f"Error getting history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat/reset")
async def reset_chat():
    """Reset chat session"""
    try:
        bot = get_chatbot()
        bot.reset_chat()
        return {"message": "Chat session reset", "status": "success"}
    except Exception as e:
        logger.error(f"Error resetting chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat/upload")
async def upload_document(file: UploadFile = File(...)):
    """Upload a PDF document for RAG"""
    try:
        bot = get_chatbot()

        if file.content_type != "application/pdf":
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")

        # Save file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
            contents = await file.read()
            tmp_file.write(contents)
            tmp_file.flush()

            # Upload to RAG
            document_id = file.filename.replace(".pdf", "").replace(" ", "_")
            success = bot.upload_document(tmp_file.name, document_id)

            # Clean up temp file
            try:
                os.unlink(tmp_file.name)
            except:
                pass

            if success:
                return {
                    "message": "Document uploaded successfully",
                    "status": "success",
                    "document_id": document_id
                }
            else:
                raise HTTPException(status_code=500, detail="Failed to upload document")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============== HEALTH CHECK ===============

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "sentiment_analyzer": sentiment_analyzer is not None,
        "chatbot": chatbot is not None,
        "build_optimized": is_build_environment()
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "AI System API",
        "version": "1.0.0",
        "docs": "/docs"
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host=settings.fastapi_host,
        port=settings.fastapi_port
    )
