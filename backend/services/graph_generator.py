# backend/services/graph_generator.py

import os
from dotenv import load_dotenv

# Componentes principais do LangChain
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from langchain_google_genai import ChatGoogleGenerativeAI

# Nossos modelos de dados Pydantic
from models.graph import GraphResponse

# Carrega as variáveis de ambiente (nossa GOOGLE_API_KEY) do arquivo .env
load_dotenv()

# Lógica para garantir que a chave da API foi carregada
if "GOOGLE_API_KEY" not in os.environ:
    raise ValueError("GOOGLE_API_KEY não encontrada no ambiente. Verifique seu arquivo .env")

async def generate_graph_from_query(query: str) -> GraphResponse:
    """
    Função assíncrona para gerar um grafo a partir de uma query usando LangChain e Gemini.
    """
    try:
        # 1. Configura o parser para garantir que a saída da IA siga nosso modelo GraphResponse
        parser = PydanticOutputParser(pydantic_object=GraphResponse)

        # 2. Instancia o modelo de IA.
        # temperature=0.4 controla a "criatividade". Mais baixo = mais determinístico.
        model = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.4)

        # 3. Criação do Prompt Template - Esta é a alma da nossa IA.
        # Estamos dando instruções claras sobre sua persona, a tarefa e o formato da saída.
        prompt_template = """
        Você é um arquiteto de conhecimento especialista chamado Synapse.
        Sua tarefa é transformar uma pergunta ou conceito do usuário em um grafo de conhecimento detalhado.

        Para a pergunta do usuário: "{query}"

        Gere um grafo com 5 a 7 nós interconectados que explorem o tópico.
        Os nós devem representar conceitos chave, pessoas ou ideias.
        As arestas (edges) devem descrever a relação entre os nós (ex: "influenciou", "opõe-se a", "baseado em").
        Cada nó deve ter um resumo conciso de 1-2 sentenças.

        Evite respostas rasas. Busque conexões inusitadas e multidisciplinares.

        {format_instructions}
        """

        prompt = ChatPromptTemplate.from_template(
            template=prompt_template,
            partial_variables={"format_instructions": parser.get_format_instructions()},
        )

        # 4. Cria a "cadeia" (chain) que une os componentes
        # Prompt -> Modelo de IA -> Parser de Saída
        chain = prompt | model | parser

        # 5. Invoca a cadeia com a query do usuário de forma assíncrona
        # '.ainvoke' é a versão assíncrona do '.invoke'
        response = await chain.ainvoke({"query": query})

        return response

    except Exception as e:
        # Tratamento de erro robusto caso a chamada à API da IA falhe
        print(f"Erro ao gerar o grafo com a IA: {e}")
        # Re-lança a exceção para que o FastAPI possa capturá-la e retornar um erro 500
        raise