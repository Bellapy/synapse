import os
from functools import lru_cache

from langchain_google_genai import ChatGoogleGenerativeAI

from core import config

if "GOOGLE_API_KEY" not in os.environ:
    raise ValueError("GOOGLE_API_KEY não encontrada no ambiente. Verifique seu arquivo .env")


# Mesma regra em todos os prompts: grafo e painel precisam sair no mesmo idioma. A interface é em português.
LANGUAGE_RULE = (
    "Responda em português do Brasil, a menos que a pergunta esteja claramente escrita em outro idioma "
    "(nesse caso, use esse idioma)."
)


def thinking_kwargs(model: str) -> dict:
    """Desliga ou reduz o 'raciocínio' do modelo.

    Medido no benchmark: modelos *-flash gastam ~1000 tokens pensando (5 a 10s) numa tarefa que não precisa disso;
    os *-flash-lite não pensam por padrão.
    """
    if "lite" in model:
        return {}
    if model.startswith("gemini-2.5-flash"):
        return {"thinking_budget": 0}
    if model.startswith("gemini-3"):
        return {"thinking_level": "low"}
    return {}


@lru_cache(maxsize=16)
def get_model(model: str, temperature: float, max_output_tokens: int) -> ChatGoogleGenerativeAI:
    """Um cliente por (modelo, temperatura, limite), reaproveitado entre requisições.

    Sem retries internos: quem decide trocar de modelo é o roteador (ai_router), não o cliente.
    O timeout do cliente é um pouco maior que o do roteador, só para não deixar conexões penduradas.
    """
    return ChatGoogleGenerativeAI(
        model=model,
        temperature=temperature,
        max_output_tokens=max_output_tokens,
        timeout=config.AI_ATTEMPT_TIMEOUT_SECONDS + 3,
        # `attempts` conta a tentativa original: 1 = sem retries internos (0 é ignorado e cai no padrão do SDK, 5 tentativas).
        max_retries=1,
        **thinking_kwargs(model),
    )
