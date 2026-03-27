# Agent-Hub Workflows & Automation

## Data Lifecycle

### Agent Submission Flow

The agent submission process follows these steps:

1. **User submits form** → `POST /api/agents`
2. **Backend validation & security checks**:
   - Zod schema validation of all fields
   - Malicious content scan (XSS, code injection, template injection patterns)
   - Newline sanitization in all text fields (prevents `**key:** value` injection)
   - Slug uniqueness check (no duplicate agent names)
   - GitHub URL duplication check (same author monorepo allowed; cross-author duplicates blocked)
   - GitHub ownership verification via API (contributor/collaborator/org member check)
3. **Issue creation** → Creates GitHub Issue with `agent-submission` label
4. **Admin review** → Adds `approved` label to issue
5. **Automated workflow** → `issue-to-pr.yml` triggers:
   - Verifies approver has write+ permissions
   - Parses issue body fields (`**key:** value` format)
   - Validates submittedBy matches issue author (security check)
   - Generates installCommand based on platform
   - Adds new agent entry to `agents.json`
   - Creates PR to merge changes
6. **PR merged** → Vercel auto-deploys updated registry

### Editing Pending Submissions

**For open issues (not yet approved):**

- `PATCH /api/my-submissions/[number]`
- Re-validates all fields with Zod schema
- Re-checks slug duplication
- Re-verifies GitHub URL ownership
- Updates issue body with new `submittedBy` timestamp
- Rate limited: 10 requests/hour per user

### Editing Approved Submissions

**For agents already in `agents.json`:**

- `PATCH /api/my-submissions/[number]/approved`
- Verifies ownership via session and GitHub API
- Re-checks GitHub URL ownership
- Creates a PR with changes to `agents.json`
- Rate limited: 3 requests/hour per user

### Deleting Submissions

**Pending submissions (open issues):**

- `DELETE /api/my-submissions/[number]`
- Closes the GitHub issue

**Approved submissions (in agents.json):**

- `DELETE /api/my-submissions/[number]/approved`
- Creates a PR removing the agent entry

## Automated Schedulers

Vercel Cron Jobs keep the registry fresh without manual intervention.

| Scheduler | Endpoint | Frequency | Action |
|-----------|----------|-----------|--------|
| **sync-stars** | `/api/cron/sync-stars` | Every 6 hours at :00 | Fetches GitHub stars/forks for each unique repo, updates `agents.json` if changed, commits via GitHub API |
| **sync-news** | `/api/cron/sync-news` | Every 6 hours at :30 | Fetches latest 3 releases per repo, maintains `news.json` (max 20 items, sorted by date) |
| **auto-collect** | GitHub Actions | Weekly (Sunday 00:00 UTC) | Scans 3 known repos for new agent `.md` files, creates PR for new entries if found |

**Cron authorization:** All Vercel Cron endpoints require `Authorization: Bearer ${CRON_SECRET}` header.

## Security Policies

### Input Sanitization

- All text fields (name, displayName, description, etc.) are stripped of newlines before use
- Zod schema rejects patterns like `**key:**` in displayName and description
- Malicious content scanner checks submission body for:
  - XSS patterns: `<script>`, `javascript:`, event handlers (`onload`, `onclick`, etc.), `dangerouslySetInnerHTML`
  - Code injection: `eval()`, `exec()`, `child_process`, `require('fs')`, `process.env`
  - Template injection: unsanitized variable expansion

### Ownership & Identity

- `author` field is forced from `session.user.login` (user input ignored in POST)
- `submittedBy` field is extracted from session and validated in workflows
- GitHub URL ownership verified at submit and edit time via GitHub API
- Workflow-level check: `submittedBy` in parsed issue must match issue author (prevents spoofing)

### Duplicate Prevention

- **Slug collision**: Checked on submit, edit, and in workflow before commit
- **GitHub URL duplication**:
  - Same author can use same repo in multiple agents (monorepo pattern allowed)
  - Cross-author duplicates blocked: "This repository is already registered by another user"

### Rate Limiting

All rate limits are per user (by email for POST, by login for PATCH/DELETE):

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /api/agents` | 5 requests | 1 hour |
| `PATCH /api/my-submissions/[number]` | 10 requests | 1 hour |
| `PATCH /api/my-submissions/[number]/approved` | 3 requests | 1 hour |

Rate limit tracking uses in-memory store with email/IP fallback.

### CSRF Protection

All authenticated routes (POST, PATCH, DELETE) enforce Auth.js CSRF token validation automatically.

## Branch Strategy

Git branches follow a naming convention for maintainability:

| Purpose | Branch Pattern | Example |
|---------|---|---------|
| Production | `master` (protected) | — |
| Features | `feat/description` | `feat/add-notifications` |
| Bug fixes | `fix/description` | `fix/rate-limit-bypass` |
| Agent submissions | `agent/issue-{number}` | `agent/issue-42` |
| Agent edits | `edit-agent/{slug}/{timestamp}` | `edit-agent/my-agent/20260327` |
| Agent removals | `remove-agent/{slug}/{timestamp}` | `remove-agent/my-agent/20260327` |
| Auto-collection | `auto-collect/update` | — |

**Branch protection:** `master` is protected. All PRs require CI checks to pass before merge.

## Deployment

**Platform:** Vercel
**Region:** ICN1 (Seoul, Korea)
**Auto-deployment:** On push to `master`
**Build system:** Next.js with Turbopack
**Static generation:** Agent detail pages pre-rendered at build time

Pages are cached at Vercel edge, with ISR (Incremental Static Regeneration) enabled for dynamic updates.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AUTH_SECRET` | Yes | Auth.js encryption key (generate: `openssl rand -base64 32`) |
| `GITHUB_ID` | Yes | GitHub OAuth App client ID (create at https://github.com/settings/developers) |
| `GITHUB_SECRET` | Yes | GitHub OAuth App client secret |
| `GITHUB_TOKEN` | Yes | GitHub PAT for Issue/PR creation and API access (create at https://github.com/settings/tokens with repo scope) |
| `CRON_SECRET` | Yes | Bearer token for Vercel Cron endpoints (any strong random value) |
| `NEXT_PUBLIC_SITE_URL` | Yes | Base URL for OAuth callbacks (e.g., https://agent-hub.vercel.app) |
| `GITHUB_REPO` | No | Override default repo (default: `sehoon787/agent-hub`) |
| `GITHUB_COLLECT_TOKEN` | No | Separate token for auto-collection (fallback to `GITHUB_TOKEN`) |

**Local development:** Copy `.env.example` to `.env.local` and fill in values.

## Workflow Files

### issue-to-pr.yml

Triggered when `approved` label is added to an `agent-submission` issue.

**Steps:**
1. Verify approver has admin/maintain/write permission
2. Checkout and install dependencies
3. Parse issue body (extracts `**key:** value` format fields)
4. Validate submittedBy matches issue author
5. Generate `installCommand` based on platform
6. Add entry to `agents.json`
7. Create PR (branch: `agent/issue-{number}`)

**Security checks in workflow:**
- Approver permission validation
- submittedBy/author mismatch detection
- Malicious pattern scanning
- Duplicate slug/URL detection

### auto-collect.yml

Scheduled weekly (Sunday 00:00 UTC) or manual trigger.

**Repos scanned:**
- `anthropics/claude-code`
- `Yeachan-Heo/oh-my-claudecode`
- `wshobson/agents`

**Steps:**
1. Checkout and install dependencies
2. Run `node scripts/collect.mjs` to scan for new `.md` agent files
3. Check for changes in `agents.json`
4. If changed, create PR with label `auto-collect`

### ci.yml

Standard CI checks: lint, type check, build, test.

Runs on all PR commits and pushes to `master`.

### cla.yml

Contributor License Agreement check. Users must sign CLA before PR merge.

### auto-tag.yml

Automatic versioning. Creates semantic version tags based on commit messages (feat → minor, fix → patch).

## Key Integration Points

### GitHub API

- **Submission creation** → Create issue with label
- **Submission editing** → Update issue body
- **Approval workflow** → Parse issue, verify permissions, create PR
- **Stars/news sync** → Fetch repo metadata and releases
- **Ownership verification** → Check collaborator status

### Vercel Cron

- **sync-stars** → Runs every 6 hours at :00 UTC
- **sync-news** → Runs every 6 hours at :30 UTC
- Both require `CRON_SECRET` for authorization

### Auth.js

- **OAuth flow** → GitHub login at `/auth/signin`
- **Session management** → Stores user login in JWT token
- **CSRF protection** → Automatic on all authenticated routes

### JSON Files

- **agents.json** → Main registry, read at build time, updated by workflows and cron jobs
- **news.json** → Release notes, maintained by sync-news cron

## Error Handling

**Rate limit exceeded** (429):
- Request rejected with message "Rate limit exceeded. Try again later."
- User sees error in UI and can retry after window expires

**GitHub token expired** (401):
- Returns "GitHub token expired. Please sign out and sign back in."
- User must re-authenticate

**GitHub API failure** (502/503):
- Sync jobs log errors and retry on next schedule
- Submission returns error with fallback message
- No partial commits; atomic updates only

**Validation failure** (400):
- Detailed field errors returned in `details` object
- UI displays field-specific error messages
- User can correct and resubmit

## Monitoring & Maintenance

**Manual checks:**
- Review `agents.json` for stale entries
- Monitor GitHub Issues for pending submissions
- Check Vercel logs for cron job failures

**Automated alerts:**
- Cron jobs log responses with repo count and status
- PR creation includes automated summary
- Failed workflows block merge to `master`

**Maintenance tasks:**
- No scheduled maintenance needed (event-driven)
- Quarterly audit of duplicate/invalid entries
- Annual review of security patterns
