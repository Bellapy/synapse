// frontend/src/services/mockData.js

// Simula a resposta para a primeira busca.
export const mockInitialGraph = {
  nodes: [
    { id: "1", label: "Filosofia", type: "concept", summary: "Estudo de questões fundamentais sobre existência, conhecimento, valores, razão, mente e linguagem." },
    { id: "2", label: "Ciência", type: "concept", summary: "Empreendimento sistemático que constrói e organiza o conhecimento na forma de explicações e previsões testáveis sobre o universo." },
    { id: "3", label: "Arte", type: "concept", summary: "Expressão de habilidade criativa e imaginação, produzindo obras a serem apreciadas principalmente por sua beleza ou poder emocional." },
    { id: "4", label: "Existencialismo", type: "concept", summary: "Corrente filosófica que enfatiza a liberdade individual, responsabilidade e subjetividade." },
    { id: "5", label: "Método Científico", type: "concept", summary: "Processo empírico de aquisição de conhecimento que envolve observação, questionamento, hipótese, experimentação e conclusão." },
  ],
  edges: [
    { source: "1", target: "4", relation: "inclui" },
    { source: "1", target: "2", relation: "questiona" },
    { source: "2", target: "5", relation: "baseia-se em" },
    { source: "1", target: "3", relation: "inspira" },
    { source: "3", target: "4", relation: "explora" },
  ],
};

// Simula a resposta ao expandir o nó "Existencialismo".
// IMPORTANTE: Inclui o nó de origem para manter a integridade do grafo.
export const mockExpansionGraph = {
    nodes: [
        { id: "4", label: "Existencialismo", type: "concept", summary: "Corrente filosófica que enfatiza a liberdade individual, responsabilidade e subjetividade." },
        { id: "6", label: "Albert Camus", type: "person", summary: "Filósofo e escritor francês, conhecido por sua contribuição ao absurdismo." },
        { id: "7", label: "Absurdo", type: "concept", summary: "O conflito entre a tendência humana de buscar valor e significado inerentes à vida e a incapacidade humana de encontrá-los." },
    ],
    edges: [
        { source: "4", target: "6", relation: "associado a" },
        { source: "6", target: "7", relation: "explorou o" },
    ]
};

// Simula a resposta ao pedir detalhes de um nó.
export const mockNodeDetails = {
    label: "Existencialismo",
    type_tag: "Corrente Filosófica",
    contextual_summary: "Em resposta à sua pergunta sobre 'o sentido da vida', o Existencialismo oferece uma perspectiva radical: o sentido não é algo a ser descoberto, mas sim algo a ser criado. Ele coloca o peso da existência diretamente sobre o indivíduo, sugerindo que através de nossas escolhas e ações, nós definimos nossa própria essência e propósito em um universo indiferente."
};