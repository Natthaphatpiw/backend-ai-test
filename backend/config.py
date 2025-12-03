from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    openai_api_key: str
    pinecone_api_key: str
    pinecone_index_name: str = "developer-quickstart-py"
    pinecone_cloud: str = "aws"
    pinecone_region: str = "us-east-1"
    fastapi_host: str = "0.0.0.0"
    fastapi_port: int = 8000

    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()
