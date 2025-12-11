# backend/services/graph_generator.py

import os
from dotenv import load_dotenv
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from langchain_google_genai import ChatGoogleGenerativeAI
from models.graph import GraphResponse
from typing import List, Optional

load_dotenv()

if "GOOGLE_API_KEY" not in os.environ:
    raise ValueError("GOOGLE_API_KEY não encontrada no ambiente. Verifique seu arquivo .env")

async def generate_graph_from_query(query: str, existing_node_labels: Optional[List[str]] = None, expansion_type: str = "general") -> GraphResponse:
    """
    Gera ou expande um grafo a partir de uma query usando LangChain e Gemini.
    Suporta diferentes tipos de expansão.
    """
    try:
        parser = PydanticOutputParser(pydantic_object=GraphResponse)
        model = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.6) # Mais criatividade para expansão

        existing_nodes_str = ", ".join(f"'{label}'" for label in existing_node_labels) if existing_node_labels else ""
        
        # Seleciona o prompt com base no tipo de expansão
        if expansion_type == "counter":
            prompt_template_str = """
            Você é um especialista em dialética chamado Synapse. Sua tarefa é encontrar um contra-argumento.
            O usuário está explorando o conceito: "{query}"
            O grafo atual já contém: [{existing_nodes}]
            
            Gere 1 ou 2 NOVOS nós que representem um forte contra-argumento, uma visão oposta ou uma crítica ao conceito "{query}".
            IMPORTANTE: NÃO gere nós para conceitos que já existem.
            O novo nó deve se conectar ao nó de origem ("{query}") com uma relação de oposição (ex: "critica", "opõe-se a").
            Dê um resumo conciso para cada novo nó.
            {format_instructions}
            """
        elif existing_node_labels: # Expansão geral
            prompt_template_str = """
            Você é um arquiteto de conhecimento especialista chamado Synapse. Sua tarefa é expandir um grafo.
            O usuário quer explorar o conceito: "{query}"
            O grafo atual já contém: [{existing_nodes}]
            
            Gere 3 a 5 NOVOS nós relacionados ao conceito "{query}".
            IMPORTANTE: NÃO gere nós para conceitos que já existem.
            Os novos nós devem se conectar ao nó de origem ("{query}").
            Crie arestas que descrevam as novas relações. Cada novo nó deve ter um resumo conciso.
            {format_instructions}
            """
        else: # Geração inicial
            prompt_template_str = """
            Você é um arquiteto de conhecimento especialista chamado Synapse. Sua tarefa é criar um grafo de conhecimento.
            Para a pergunta do usuário: "{query}"
            Gere 5 a 7 nós interconectados que explorem o tópico.
            {format_instructions}
            """

        prompt = ChatPromptTemplate.from_template(
            template=prompt_template_str,
            partial_variables={"format_instructions": parser.get_format_instructions()},
        )
        
        chain = prompt | model | parser
        
        response = await chain.ainvoke({
            "query": query, 
            "existing_nodes": existing_nodes_str
        })
        
        return response

    except Exception as e:
        print(f"Erro ao gerar o grafo com a IA: {e}")
        raise