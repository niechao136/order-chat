
const REDIRECT_AGENT = 'redirect_agent';

export function saveAgent(agent: string) {
  localStorage.setItem(REDIRECT_AGENT, agent);
}

export function checkAgent(agents: string[]) {
  const redirectAgent = localStorage.getItem(REDIRECT_AGENT)
  const agent = agents.includes(redirectAgent ?? '') ? redirectAgent : agents[0];
  localStorage.removeItem(REDIRECT_AGENT);
  return agent ?? '';
}
