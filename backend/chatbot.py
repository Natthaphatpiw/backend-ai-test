import os
from typing import List, Dict, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass, asdict
from collections import deque
import json
import logging

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from pinecone import Pinecone, ServerlessSpec
from openai import OpenAI
from pypdf import PdfReader
import tempfile

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class ChatMessage:
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: str

    def to_dict(self) -> Dict:
        return asdict(self)


class AdvancedMemorySystem:
    """Advanced memory system for chatbot"""

    def __init__(self, short_term_size: int = 10, long_term_size: int = 50):
        self.short_term_memory: deque = deque(maxlen=short_term_size)
        self.long_term_memory: deque = deque(maxlen=long_term_size)
        self.session_start = datetime.now()

    def add_message(self, role: str, content: str, is_important: bool = False):
        """Add message to memory"""
        message = ChatMessage(
            role=role,
            content=content,
            timestamp=datetime.now().isoformat()
        )
        self.short_term_memory.append(message)

        if is_important:
            self.long_term_memory.append(message)

    def get_conversation_history(self, max_messages: int = 10) -> List[Dict]:
        """Get conversation history for context"""
        messages = list(self.short_term_memory)[-max_messages:]
        return [msg.to_dict() for msg in messages]

    def get_formatted_history(self, max_messages: int = 10) -> str:
        """Get formatted conversation history for LLM"""
        messages = list(self.short_term_memory)[-max_messages:]
        formatted = ""
        for msg in messages:
            formatted += f"{msg.role.upper()}: {msg.content}\n"
        return formatted

    def clear(self):
        """Clear all memory"""
        self.short_term_memory.clear()


class InputNormalizer:
    """Normalize user input using LLM"""

    def __init__(self, openai_client: OpenAI):
        self.client = openai_client

    def normalize(self, text: str) -> str:
        """Normalize user input"""
        try:
            response = self.client.chat.completions.create(
                model="gpt-4.1-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an input normalizer. Take user input that might be unclear, incomplete, or contain errors and normalize it to a clear, proper format. Respond with ONLY the normalized text without any explanations."
                    },
                    {
                        "role": "user",
                        "content": f"Normalize this input: {text}"
                    }
                ],
                temperature=0.5,
                max_tokens=200
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.warning(f"Error normalizing input: {e}")
            return text


class PineconeRAG:
    """Pinecone Vector Database RAG System"""

    def __init__(self, api_key: str, index_name: str, cloud: str = "aws", region: str = "us-east-1"):
        self.pc = Pinecone(api_key=api_key)
        self.index_name = index_name
        self.cloud = cloud
        self.region = region
        self.index = self._get_or_create_index()
        self.openai_client = None

    def _get_or_create_index(self):
        """Get or create Pinecone index"""
        try:
            if not self.pc.has_index(self.index_name):
                logger.info(f"Creating index: {self.index_name}")
                self.pc.create_index_for_model(
                    name=self.index_name,
                    cloud=self.cloud,
                    region=self.region,
                    embed={
                        "model": "llama-text-embed-v2",
                        "field_map": {"text": "chunk_text"}
                    }
                )
            return self.pc.Index(self.index_name)
        except Exception as e:
            logger.error(f"Error with Pinecone index: {e}")
            raise

    def extract_text_from_pdf(self, file_path: str) -> str:
        """Extract text from PDF file"""
        try:
            text = ""
            with open(file_path, 'rb') as file:
                pdf_reader = PdfReader(file)
                for page in pdf_reader.pages:
                    text += page.extract_text()
            return text
        except Exception as e:
            logger.error(f"Error extracting text from PDF: {e}")
            return ""

    def chunk_text(self, text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
        """Chunk text into smaller pieces"""
        chunks = []
        for i in range(0, len(text), chunk_size - overlap):
            chunk = text[i:i + chunk_size]
            if chunk.strip():
                chunks.append(chunk.strip())
        return chunks

    def upsert_document(self, file_path: str, document_id: str):
        """Upload and index a PDF document"""
        try:
            logger.info(f"Processing document: {file_path}")

            # Extract text
            text = self.extract_text_from_pdf(file_path)
            if not text:
                raise ValueError("Could not extract text from PDF")

            # Chunk text
            chunks = self.chunk_text(text, chunk_size=1000, overlap=200)
            logger.info(f"Created {len(chunks)} chunks")

            # For now, we'll store chunks metadata
            # In production, you'd use the embed model from Pinecone to create vectors
            # and upsert them to the index

            # Store metadata for retrieval
            self.document_metadata = {
                'document_id': document_id,
                'file_path': file_path,
                'chunks': chunks,
                'uploaded_at': datetime.now().isoformat(),
                'total_chunks': len(chunks)
            }

            logger.info(f"Document {document_id} uploaded successfully")
            return True

        except Exception as e:
            logger.error(f"Error upserting document: {e}")
            return False

    def retrieve_context(self, query: str, top_k: int = 3) -> str:
        """Retrieve relevant context from documents"""
        try:
            if not hasattr(self, 'document_metadata') or not self.document_metadata:
                return ""

            chunks = self.document_metadata.get('chunks', [])
            if not chunks:
                return ""

            # Simple relevance scoring based on keyword matching
            query_words = set(query.lower().split())
            scored_chunks = []

            for i, chunk in enumerate(chunks):
                chunk_words = set(chunk.lower().split())
                overlap = len(query_words & chunk_words)
                if overlap > 0:
                    scored_chunks.append((i, overlap, chunk))

            # Sort by relevance
            scored_chunks.sort(key=lambda x: x[1], reverse=True)

            # Return top k chunks
            context = "\n\n---\n\n".join([chunk for _, _, chunk in scored_chunks[:top_k]])
            return context if context else ""

        except Exception as e:
            logger.error(f"Error retrieving context: {e}")
            return ""


class AdvancedChatbot:
    """Advanced AI Chatbot with LangChain, Memory, and RAG"""

    def __init__(self, openai_api_key: str, pinecone_api_key: str, pinecone_index_name: str):
        self.openai_api_key = openai_api_key
        self.llm = ChatOpenAI(
            api_key=openai_api_key,
            model="gpt-4.1-mini",
            temperature=0.7
        )
        self.openai_client = OpenAI(api_key=openai_api_key)
        self.memory = AdvancedMemorySystem()
        self.input_normalizer = InputNormalizer(self.openai_client)
        self.rag = PineconeRAG(
            api_key=pinecone_api_key,
            index_name=pinecone_index_name
        )
        self.system_prompt = self._build_system_prompt()

    def _build_system_prompt(self) -> str:
        """Build system prompt for the chatbot"""
        return """You are a helpful and intelligent AI assistant. Your role is to:
1. Provide accurate and helpful responses to user queries
2. Maintain context from the conversation history
3. Use any provided document context to answer questions
4. Be conversational, friendly, and professional
5. If you don't know something, say so clearly
6. Always provide responses in Thai when the user communicates in Thai

Current time: {current_time}
"""

    def normalize_and_process_input(self, user_input: str) -> str:
        """Normalize and process user input"""
        logger.info(f"Original input: {user_input}")
        normalized = self.input_normalizer.normalize(user_input)
        logger.info(f"Normalized input: {normalized}")
        return normalized

    def get_response(self, user_input: str, use_rag: bool = True) -> str:
        """Get chatbot response"""
        try:
            # Normalize input
            normalized_input = self.normalize_and_process_input(user_input)

            # Add to memory
            self.memory.add_message('user', normalized_input)

            # Build context
            context_parts = []

            # Add conversation history
            history = self.memory.get_formatted_history(max_messages=5)
            if history:
                context_parts.append(f"Recent conversation:\n{history}")

            # Add RAG context if enabled
            rag_context = None
            if use_rag:
                rag_context = self.rag.retrieve_context(normalized_input)
                if rag_context:
                    context_parts.append(f"Document context:\n{rag_context}")

            # Build full prompt
            full_prompt = self.system_prompt.format(
                current_time=datetime.now().isoformat()
            )

            if context_parts:
                full_prompt += "\n\n" + "\n\n".join(context_parts)

            # Get response from LLM
            messages = [
                SystemMessage(content=full_prompt),
                HumanMessage(content=normalized_input)
            ]

            response = self.llm.invoke(messages)
            assistant_response = response.content

            # Add to memory
            self.memory.add_message('assistant', assistant_response)

            return assistant_response

        except Exception as e:
            logger.error(f"Error getting response: {e}")
            return f"Sorry, I encountered an error: {str(e)}"

    def upload_document(self, file_path: str, document_id: str) -> bool:
        """Upload a document for RAG"""
        return self.rag.upsert_document(file_path, document_id)

    def reset_chat(self):
        """Reset chat session"""
        self.memory.clear()
        logger.info("Chat session reset")

    def get_conversation_history(self) -> List[Dict]:
        """Get conversation history"""
        return self.memory.get_conversation_history()
