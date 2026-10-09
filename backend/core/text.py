import re
import unicodedata


def normalize(text: str) -> str:
    """Forma comparável de um rótulo: sem acentos, minúscula, espaços colapsados."""
    decomposed = unicodedata.normalize("NFKD", text)
    without_marks = "".join(ch for ch in decomposed if not unicodedata.combining(ch))
    return re.sub(r"\s+", " ", without_marks).strip().casefold()


def slugify(text: str, fallback: str = "no") -> str:
    """Id curto e estável para um nó: 'Espalhamento de Rayleigh' -> 'espalhamento_de_rayleigh'."""
    slug = re.sub(r"[^a-z0-9]+", "_", normalize(text)).strip("_")
    return slug[:48] or fallback
