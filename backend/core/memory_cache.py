import time
from collections import OrderedDict
from typing import Any, Optional


class TTLCache:
    """Cache LRU com expiração, em memória do processo.

    Serve de primeira camada (L1) mesmo quando há Redis e é o único cache quando não há: no plano gratuito do Render
    não existe Redis, e temas repetidos (demos, exemplos, recarregar a página) não precisam gastar cota de IA.
    """

    def __init__(self, max_entries: int = 256) -> None:
        self._data: "OrderedDict[str, tuple[float, Any]]" = OrderedDict()
        self._max = max_entries

    def get(self, key: str) -> Optional[Any]:
        item = self._data.get(key)
        if item is None:
            return None
        expires_at, value = item
        if expires_at <= time.monotonic():
            del self._data[key]
            return None
        self._data.move_to_end(key)
        return value

    def set(self, key: str, value: Any, ttl: float) -> None:
        self._data[key] = (time.monotonic() + ttl, value)
        self._data.move_to_end(key)
        while len(self._data) > self._max:
            self._data.popitem(last=False)

    def clear(self) -> None:
        self._data.clear()

    def __len__(self) -> int:
        return len(self._data)
