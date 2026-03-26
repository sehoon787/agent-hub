import type { AgentStage } from './types';

// Stage keyword patterns (matched against description + tags + capabilities)
const STAGE_KEYWORDS: Record<AgentStage, RegExp[]> = {
  discover: [/\bsearch\b/i, /\bfind\b/i, /\bexplor/i, /\bscan\b/i, /\blookup\b/i, /\bbrowse\b/i, /\bindex\b/i, /\bcodebase.*search/i],
  plan: [/\bplan\b/i, /\bstrateg/i, /\bdesign\b/i, /\barchitect/i, /\brequirement/i, /\banalys/i, /\bpre-plan/i, /\bintent.*classif/i, /\broadmap/i],
  implement: [/\bimplement/i, /\bbuild\b/i, /\bcreat/i, /\bgenerat/i, /\bwrit(?:e|ing)\b/i, /\brefactor/i, /\bexecut/i, /\bdevelop/i],
  review: [/\breview/i, /\baudit/i, /\binspect/i, /\bquality\b/i, /\bcode.review/i, /\bsecurity.*review/i, /\bfeedback\b/i],
  verify: [/\btest/i, /\bverif/i, /\bvalidat/i, /\bcoverage\b/i, /\bassert/i, /\bspec\b/i, /\bqa\b/i, /\bquality.assur/i],
  debug: [/\bdebug/i, /\bbug.?fix/i, /\bdiagnos/i, /\btrace\b/i, /\berror\b/i, /\broot.cause/i, /\btroubleshoot/i, /\binvestigat/i],
  operate: [/\bgit\b/i, /\bdeploy/i, /\boperat/i, /\brelease/i, /\bmaintain/i, /\bdocumentation\b/i, /\bci.cd/i, /\bcommit/i],
};

// Tool-based signals
const WRITE_TOOLS = ['Write', 'Edit'];
const EXEC_TOOLS = ['Bash'];
const READ_TOOLS = ['Read', 'Grep', 'Glob'];
const ORCHESTRATION_TOOLS = ['Task', 'Agent', 'TaskCreate', 'TaskUpdate'];

export function inferStages(agent: {
  description: string;
  tags?: string[];
  capabilities?: string[];
  tools?: string[];
  model?: string;
  category?: string;
}): AgentStage[] {
  const scores: Record<AgentStage, number> = {
    discover: 0, plan: 0, implement: 0, review: 0, verify: 0, debug: 0, operate: 0,
  };

  // Combine text fields for keyword matching
  const text = [
    agent.description,
    ...(agent.tags ?? []),
    ...(agent.capabilities ?? []),
  ].join(' ');

  // Signal 1: Keyword matching (weight: 2 per match)
  for (const [stage, patterns] of Object.entries(STAGE_KEYWORDS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        scores[stage as AgentStage] += 2;
      }
    }
  }

  // Signal 2: Tool permissions (weight: 3)
  const tools = agent.tools ?? [];
  const hasWrite = tools.some(t => WRITE_TOOLS.includes(t));
  const hasExec = tools.some(t => EXEC_TOOLS.includes(t));
  const hasRead = tools.some(t => READ_TOOLS.includes(t));
  const hasOrchestration = tools.some(t => ORCHESTRATION_TOOLS.includes(t));

  if (hasRead && !hasWrite && !hasExec) {
    scores.discover += 3;
    scores.review += 3;
  }
  if (hasWrite) {
    scores.implement += 3;
  }
  if (hasExec && hasWrite) {
    scores.debug += 2;
  }
  if (hasExec && !hasWrite) {
    scores.verify += 3;
  }
  if (hasOrchestration) {
    scores.plan += 2;
  }

  // Signal 3: Model bias (weight: 1)
  const model = agent.model ?? '';
  if (['opus', 'gemini-2.5-pro'].includes(model)) {
    scores.plan += 1;
    scores.review += 1;
  }
  if (['haiku', 'gpt-5.4-mini'].includes(model)) {
    scores.discover += 1;
  }

  // Signal 4: Category boost (weight: 2)
  if (agent.category === 'orchestrator') {
    scores.plan += 2;
  }
  if (agent.category === 'analyst') {
    scores.plan += 1;
    scores.review += 1;
  }

  // Collect stages with score > 0, sorted by score descending
  const ranked = (Object.entries(scores) as [AgentStage, number][])
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1]);

  if (ranked.length === 0) {
    return ['implement']; // Default fallback
  }

  // Take top stages: include any with score >= 50% of the top score
  const topScore = ranked[0][1];
  const threshold = topScore * 0.5;
  const result = ranked
    .filter(([, score]) => score >= threshold)
    .map(([stage]) => stage)
    .slice(0, 3); // Max 3 stages

  return result;
}
