# Contributing to AgentHub

## Submitting Agents

### Via the Website

1. Go to [AgentHub](https://agent-hub.vercel.app)
2. Click **"Sign in"** with your GitHub account
3. Navigate to **Submit**
4. Fill in the agent details
5. Your submission will be reviewed automatically for security issues
6. Approved agents appear in the registry

### Via Pull Request

1. Fork the repository
2. Edit `src/lib/data/agents.json`
3. Add your agent entry following the existing format:

```json
{
  "slug": "your-agent-slug",
  "name": "your_agent",
  "displayName": "Your Agent",
  "description": "Brief description of what the agent does",
  "longDescription": "More detailed description...",
  "category": "specialist",
  "model": "sonnet",
  "source": "community",
  "platform": "claude",
  "author": "Your Name",
  "githubUrl": "https://github.com/your/repo",
  "installCommand": "how to install",
  "capabilities": ["capability1", "capability2"],
  "tools": ["tool1", "tool2"],
  "tags": ["tag1", "tag2"],
  "verified": false,
  "featured": false,
  "stars": 0,
  "downloads": 0,
  "createdAt": "2026-03-25",
  "updatedAt": "2026-03-25"
}
```

4. Submit a pull request

### Agent Requirements

- Must be a real, functional agent (no placeholders)
- Description must accurately reflect the agent's capabilities
- GitHub URL must be valid and accessible (if provided)
- No malicious code or suspicious patterns
- Must specify the correct platform (claude, gemini, codex, or universal)

## Development

### Project Structure

```
agent-hub/
├── src/
│   ├── app/           # Next.js pages and API routes
│   ├── components/    # React components
│   └── lib/           # Data, types, utilities
├── docs/              # Documentation
├── supabase/          # Database schema
├── scripts/           # Automation scripts
└── .github/           # CI/CD workflows
```

### Running Tests

```bash
npm run lint          # ESLint
npx tsc --noEmit     # TypeScript check
npm run build        # Full build
```

### Code Style

- TypeScript strict mode
- Tailwind CSS for styling
- shadcn/ui components
- Immutable data patterns
