import os
from functools import lru_cache

from langchain_google_genai import ChatGoogleGenerativeAI

from core.config import AI_MODEL_NAME, AI_TIMEOUT_SECONDS, AI_MAX_RETRIES

if "GOOGLE_API_KEY" not in os.environ:
    raise ValueError("GOOGLE_API_KEY não encontrada no ambiente. Verifique seu arquivo .env")


@lru_cache(maxsize=4)
def get_model(temperature: float) -> ChatGoogleGenerativeAI:
    """Um cliente por temperatura, reaproveitado entre requisições."""
    return ChatGoogleGenerativeAI(
        model=AI_MODEL_NAME,
        temperature=temperature,
        timeout=AI_TIMEOUT_SECONDS,
        max_retries=AI_MAX_RETRIES,
    )
