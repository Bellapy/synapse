import os
import sys
from pathlib import Path

# Variáveis precisam existir antes de qualquer import da aplicação.
os.environ["GOOGLE_API_KEY"] = "test-key"
os.environ["RATE_LIMIT_PER_MINUTE"] = "5"
os.environ.pop("REDIS_URL", None)
os.environ.pop("DATABASE_URL", None)

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from core import rate_limit  # noqa: E402


@pytest.fixture(autouse=True)
def _reset_rate_limit():
    rate_limit._memory_hits.clear()
    yield
    rate_limit._memory_hits.clear()


@pytest.fixture
def client():
    import main

    with TestClient(main.app) as test_client:
        yield test_client
