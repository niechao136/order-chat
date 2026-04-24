
const REDIRECT_GRAPH = 'redirect_graph';

export function saveGraph(graph: string) {
  localStorage.setItem(REDIRECT_GRAPH, graph);
}

export function checkGraph(graph_name: string[]) {
  const redirectGraph = localStorage.getItem(REDIRECT_GRAPH)
  const graph = graph_name.includes(redirectGraph ?? '') ? redirectGraph : graph_name[0];
  localStorage.removeItem(REDIRECT_GRAPH);
  return graph ?? '';
}
