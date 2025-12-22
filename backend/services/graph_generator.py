# backend/services/graph_generator.py

import os
from dotenv import load_dotenv
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from langchain_google_genai import ChatGoogleGenerativeAI
from models.graph import GraphResponse
from typing import List, Optional

load_dotenv()

AI_MODEL_NAME = os.getenv("AI_MODEL_NAME", "gemini-1.5-flash")

if "GOOGLE_API_KEY" not in os.environ:
    raise ValueError("GOOGLE_API_KEY não encontrada no ambiente. Verifique seu arquivo .env")

async def generate_graph_from_query(query: str, existing_node_labels: Optional[List[str]] = None, expansion_type: str = "general") -> GraphResponse:
    try:
        parser = PydanticOutputParser(pydantic_object=GraphResponse)
        model = ChatGoogleGenerativeAI(model=AI_MODEL_NAME, temperature=0.6)

        existing_nodes_str = ", ".join(f"'{label}'" for label in existing_node_labels) if existing_node_labels else ""
        
        if expansion_type == "counter":
            prompt_template_str = """
            Você é um especialista em dialética. A partir do conceito de origem "{query}", gere 1 ou 2 NOVOS nós que representem um forte contra-argumento.
            O grafo atual já contém: [{existing_nodes}]. NÃO gere nós que já existem.
            Crie arestas que conectem os novos nós ao nó de origem "{query}".
            
            IMPORTANTE: A sua resposta final DEVE ser um objeto JSON.
            A lista de 'nodes' DEVE incluir o(s) novo(s) nó(s) E o nó de origem "{query}".
            Para TODOS os novos nós e arestas gerados, defina o campo "origin" como "counter".
            Para o nó de origem "{query}" incluído, mantenha seu "origin" original.
            {format_instructions}
            """
        elif existing_node_labels:
            prompt_template_str = """
            Você é um arquiteto do conhecimento. A partir do conceito de origem "{query}", gere de 3 a 5 NOVOS nós relacionados.
            O grafo atual já contém: [{existing_nodes}]. NÃO gere nós que já existem.
            Crie arestas que conectem os novos nós ao nó de origem "{query}".
            
            IMPORTANTE: A sua resposta final DEVE ser um objeto JSON.
            A lista de 'nodes' DEVE incluir o(s) novo(s) nó(s) E o nó de origem "{query}".
            Para TODOS os novos nós e arestas gerados, defina o campo "origin" como "general".
            Para o nó de origem "{query}" incluído, mantenha seu "origin" original.
            {format_instructions}
            """
        else: # Geração inicial
            prompt_template_str = """
            Você é um arquiteto do conhecimento. Para a pergunta do usuário: "{query}", gere um grafo de conhecimento inicial.
            
            1. Gere de 5 a 7 nós interconectados. Cada nó deve ter um id, label, type, summary.
            2. Gere as arestas que conectam esses nós. Cada aresta deve ter um source, target, relation.
            3. Para TODOS os nós e arestas gerados nesta primeira resposta, defina o campo "origin" como "initial".
            
            Sua resposta final DEVE ser um objeto JSON contendo 'nodes' e 'edges'.
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