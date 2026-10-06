import os
from dotenv import load_dotenv

load_dotenv()

AI_MODEL_NAME = os.getenv("AI_MODEL_NAME", "gemini-2.5-flash")
AI_TIMEOUT_SECONDS = int(os.getenv("AI_TIMEOUT_SECONDS", "45"))
AI_MAX_RETRIES = int(os.getenv("AI_MAX_RETRIES", "2"))
