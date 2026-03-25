import { test, expect } from '@playwright/test'

test.describe('Well-Known Agents Data Verification', () => {
  // Claude Code orchestrators (actual categories from agents.json)
  const claudeOrchestrators = ['boss', 'sisyphus', 'atlas', 'prometheus']
  for (const slug of claudeOrchestrators) {
    test(`Claude orchestrator "${slug}" should exist`, async ({ request }) => {
      const response = await request.get(`/api/agents/${slug}`)
      expect(response.ok()).toBeTruthy()
      const agent = await response.json()
      expect(agent.slug).toBe(slug)
      expect(agent.platform).toBe('claude')
      expect(agent.category).toBe('orchestrator')
    })
  }

  // Claude Code specialists
  const claudeSpecialists = ['designer', 'debugger', 'code-reviewer', 'security-reviewer']
  for (const slug of claudeSpecialists) {
    test(`Claude specialist "${slug}" should exist`, async ({ request }) => {
      const response = await request.get(`/api/agents/${slug}`)
      expect(response.ok()).toBeTruthy()
      const agent = await response.json()
      expect(agent.slug).toBe(slug)
      expect(agent.platform).toBe('claude')
      expect(agent.category).toBe('specialist')
    })
  }

  // Claude Code workers (hephaestus and explore are workers, not orchestrators)
  const claudeWorkers = ['hephaestus', 'executor', 'writer', 'git-master', 'explore']
  for (const slug of claudeWorkers) {
    test(`Claude worker "${slug}" should exist`, async ({ request }) => {
      const response = await request.get(`/api/agents/${slug}`)
      expect(response.ok()).toBeTruthy()
      const agent = await response.json()
      expect(agent.slug).toBe(slug)
      expect(agent.platform).toBe('claude')
      expect(agent.category).toBe('worker')
    })
  }

  // Claude Code analysts (architect is an analyst, not specialist)
  const claudeAnalysts = ['architect', 'analyst', 'metis', 'momus', 'oracle', 'critic']
  for (const slug of claudeAnalysts) {
    test(`Claude analyst "${slug}" should exist`, async ({ request }) => {
      const response = await request.get(`/api/agents/${slug}`)
      expect(response.ok()).toBeTruthy()
      const agent = await response.json()
      expect(agent.slug).toBe(slug)
      expect(agent.platform).toBe('claude')
      expect(agent.category).toBe('analyst')
    })
  }

  // Gemini CLI agents
  const geminiAgents = ['codebase-investigator', 'cli-help', 'gemini-generalist', 'browser-agent', 'memory-manager']
  for (const slug of geminiAgents) {
    test(`Gemini agent "${slug}" should exist`, async ({ request }) => {
      const response = await request.get(`/api/agents/${slug}`)
      expect(response.ok()).toBeTruthy()
      const agent = await response.json()
      expect(agent.slug).toBe(slug)
      expect(agent.platform).toBe('gemini')
    })
  }

  // Codex CLI agents
  const codexAgents = ['codex-default', 'codex-worker', 'codex-explorer']
  for (const slug of codexAgents) {
    test(`Codex agent "${slug}" should exist`, async ({ request }) => {
      const response = await request.get(`/api/agents/${slug}`)
      expect(response.ok()).toBeTruthy()
      const agent = await response.json()
      expect(agent.slug).toBe(slug)
      expect(agent.platform).toBe('codex')
    })
  }

  test('total agent count should be 93+', async ({ request }) => {
    const response = await request.get('/api/stats')
    expect(response.ok()).toBeTruthy()
    const stats = await response.json()
    expect(stats.totalAgents).toBeGreaterThanOrEqual(93)
  })

  test('all four categories should be represented', async ({ request }) => {
    for (const category of ['orchestrator', 'specialist', 'worker', 'analyst']) {
      const response = await request.get(`/api/agents?category=${category}`)
      expect(response.ok()).toBeTruthy()
      const data = await response.json()
      expect(data.items.length).toBeGreaterThan(0)
    }
  })

  test('all three platforms should be represented', async ({ request }) => {
    for (const platform of ['claude', 'gemini', 'codex']) {
      const response = await request.get(`/api/agents?platform=${platform}`)
      expect(response.ok()).toBeTruthy()
      const data = await response.json()
      expect(data.items.length).toBeGreaterThan(0)
    }
  })
})
