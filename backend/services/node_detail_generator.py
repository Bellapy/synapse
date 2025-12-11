# backend/services/node_detail_generator.py

import os
from dotenv import load_dotenv
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from langchain_google_genai import ChatGoogleGenerativeAI
# Importaremos apenas os modelos Pydantic que esta função precisa
from models.graph import NodeDetailResponse

load_dotenv()

async def generate_contextual_details(original_query: str, node_label: str) -> NodeDetailResponse:
    """
    Gera detalhes contextuais para um nó específico, baseado na pergunta original do usuário.
    """
    try:
        # PydanticOutputParser garante que a IA responda no formato exato que precisamos
        # Vamos usar uma versão simplificada do nosso modelo de resposta, pois as conexões são calculadas separadamente.
        class NodeDetailParser(BaseModel):
            label: str
            type_tag: str
            contextual_summary: str
        
        parser = PydanticOutputParser(pydantic_object=NodeDetailParser)

        model = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.3)

        prompt_template = """
        Você é um especialista em síntese de conhecimento chamado Synapse. Sua tarefa é explicar um conceito de forma contextual.

        A dúvida original do usuário foi: "{original_query}"
        O conceito que ele quer entender agora é: "{node_label}"

        Sua resposta deve ter 3 partes:
        1.  `label`: Apenas o nome do conceito, "{node_label}".
        2.  `type_tag`: Uma etiqueta curta e precisa que classifique este conceito (Ex: "Conceito Filosófico", "Físico Teórico", "Obra Literária", "Viés Cognitivo").
        3.  `contextual_summary`: Um resumo inteligente. NÃO dê uma definição de dicionário. Explique como o conceito "{node_label}" se relaciona, responde ou ilumina a dúvida original do usuário: "{original_query}". Seja profundo, conciso e conecte as ideias.

        {format_instructions}
        """

        prompt = ChatPromptTemplate.from_template(
            template=prompt_template,
            partial_variables={"format_instructions": parser.get_format_instructions()},
        )

        chain = prompt | model | parser
        
        response = await chain.ainvoke({
            "original_query": original_query, 
            "node_label": node_label
        })
        
        # Retorna o objeto completo, mesmo que o parser só tenha validado uma parte.
        # As 'connections' serão adicionadas na camada da API.
        return NodeDetailResponse(
            label=response.label,
            type_tag=response.type_tag,
            contextual_summary=response.contextual_summary,
            connections=[] # Placeholder
        )

    except Exception as e:
        print(f"Erro ao gerar detalhes do nó com a IA: {e}")
        raise