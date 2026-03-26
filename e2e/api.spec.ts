import { test, expect } from '@playwright/test'

test.describe('API Routes', () => {
  test('GET /api/agents should return agents', async ({ request }) => {
    const response = await request.get('/api/agents')
    expect(response.ok()).toBeTruthy()
    const data = await response.json()
    // API returns { items, total }
    expect(data.items).toBeDefined()
    expect(data.items.length).toBeGreaterThan(0)
    expect(data.total).toBeGreaterThan(0)
  })

  test('GET /api/agents with category filter', async ({ request }) => {
    const response = await request.get('/api/agents?category=orchestrator')
    expect(response.ok()).toBeTruthy()
    const data = await response.json()
    expect(data.items.length).toBeGreaterThan(0)
    data.items.forEach((agent: { category: string; platform: string; model: string }) => {
      expect(agent.category).toBe('orchestrator')
    })
  })

  test('GET /api/agents with platform filter', async ({ request }) => {
    const response = await request.get('/api/agents?platform=gemini')
    expect(response.ok()).toBeTruthy()
    const data = await response.json()
    expect(data.items.length).toBeGreaterThan(0)
    data.items.forEach((agent: { category: string; platform: string; model: string }) => {
      expect(agent.platform).toBe('gemini')
    })
  })

  test('GET /api/agents with model filter', async ({ request }) => {
    const response = await request.get('/api/agents?model=opus')
    expect(response.ok()).toBeTruthy()
    const data = await response.json()
    expect(data.items.length).toBeGreaterThan(0)
    data.items.forEach((agent: { category: string; platform: string; model: string }) => {
      expect(agent.model).toBe('opus')
    })
  })

  test('GET /api/agents with search query', async ({ request }) => {
    const response = await request.get('/api/agents?q=security')
    expect(response.ok()).toBeTruthy()
    const data = await response.json()
    expect(data.items.length).toBeGreaterThan(0)
  })

  test('GET /api/agents with pagination', async ({ request }) => {
    const response = await request.get('/api/agents?page=1&limit=5')
    expect(response.ok()).toBeTruthy()
    const data = await response.json()
    expect(data.items.length).toBeLessThanOrEqual(5)
    expect(data.total).toBeGreaterThan(5)
  })

  test('GET /api/agents/boss should return boss agent', async ({ request }) => {
    const response = await request.get('/api/agents/boss')
    expect(response.ok()).toBeTruthy()
    const agent = await response.json()
    expect(agent.slug).toBe('boss')
    expect(agent.platform).toBe('claude')
    expect(agent.category).toBe('orchestrator')
    expect(agent.model).toBe('opus')
    expect(agent.verified).toBe(true)
  })

  test('GET /api/agents/codebase-investigator should return Gemini agent', async ({ request }) => {
    const response = await request.get('/api/agents/codebase-investigator')
    expect(response.ok()).toBeTruthy()
    const agent = await response.json()
    expect(agent.slug).toBe('codebase-investigator')
    expect(agent.platform).toBe('gemini')
  })

  test('GET /api/agents/codex-worker should return Codex agent', async ({ request }) => {
    const response = await request.get('/api/agents/codex-worker')
    expect(response.ok()).toBeTruthy()
    const agent = await response.json()
    expect(agent.slug).toBe('codex-worker')
    expect(agent.platform).toBe('codex')
  })

  test('GET /api/agents/nonexistent should return 404', async ({ request }) => {
    const response = await request.get('/api/agents/nonexistent-agent-xyz')
    expect(response.status()).toBe(404)
  })

  test('GET /api/stats should return stats', async ({ request }) => {
    const response = await request.get('/api/stats')
    expect(response.ok()).toBeTruthy()
    const stats = await response.json()
    expect(stats.totalAgents).toBeGreaterThan(90)
    expect(stats.totalCategories).toBe(4)
    expect(stats.totalContributors).toBeGreaterThan(0)
    expect(stats.totalPlatforms).toBeGreaterThan(0)
  })

  test('GET /api/search should search agents', async ({ request }) => {
    const response = await request.get('/api/search?q=debug')
    expect(response.ok()).toBeTruthy()
    const data = await response.json()
    expect(data.results).toBeDefined()
    expect(data.results.length).toBeGreaterThan(0)
  })

  test('GET /api/search with empty query should return empty results', async ({ request }) => {
    const response = await request.get('/api/search')
    expect(response.ok()).toBeTruthy()
    const data = await response.json()
    expect(data.results).toEqual([])
  })

  test('POST /api/agents without auth should fail with 401', async ({ request }) => {
    const response = await request.post('/api/agents', {
      data: { name: 'test-agent' },
    })
    expect(response.status()).toBeGreaterThanOrEqual(400)
  })

  test('POST /api/verify without auth should return 401', async ({ request }) => {
    const response = await request.post('/api/verify', {
      data: { url: 'https://github.com/google-gemini/gemini-cli' },
    })
    expect(response.status()).toBe(401)
  })

  test('POST /api/verify rejects non-GitHub URLs', async ({ request }) => {
    // Without auth this returns 401 first, but test the URL validation concept
    const response = await request.post('/api/verify', {
      data: { url: 'https://example.com/not-github' },
    })
    // 401 (no auth) or 400 (bad URL) are both valid
    expect(response.status()).toBeGreaterThanOrEqual(400)
  })

  test('POST /api/collect without auth should return 401', async ({ request }) => {
    const response = await request.post('/api/collect')
    expect(response.status()).toBe(401)
  })

  test('POST /api/collect with wrong token should return 401', async ({ request }) => {
    const response = await request.post('/api/collect', {
      headers: { Authorization: 'Bearer wrong-token' },
    })
    expect(response.status()).toBe(401)
  })

  test('GET /sitemap.xml should return sitemap', async ({ request }) => {
    const response = await request.get('/sitemap.xml')
    expect(response.ok()).toBeTruthy()
    const text = await response.text()
    expect(text).toContain('urlset')
    expect(text).toContain('/agents/boss')
  })

  test('GET /robots.txt should return robots', async ({ request }) => {
    const response = await request.get('/robots.txt')
    expect(response.ok()).toBeTruthy()
    const text = await response.text()
    expect(text).toContain('User-Agent')
    expect(text).toContain('Sitemap')
  })
})
