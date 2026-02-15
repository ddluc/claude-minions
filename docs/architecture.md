# Claude Minions - Architecture v2

## Overview

Claude Minions is a workspace-based CLI tool that orchestrates multiple specialized Claude CLI agents working collaboratively across multiple repositories. It enables a team-based development workflow where different AI agents (PM, CAO, Frontend Engineer, Backend Engineer, QA) work together on a product composed of multiple repositories.

## Problem Statement

**Current Pain Points:**
- Managing multiple repositories for a single product (frontend, backend, mobile, etc.)
- Coordinating work across repos
- No way to have AI agents work simultaneously on different parts of the codebase
- Manual verification and testing of changes

**Solution:**
A workspace-level orchestration tool that:
- Manages multiple repositories as a unified product workspace
- Spawns specialized agents with their own isolated repo clones
- Provides centralized chat interface for coordination
- Separates coding (engineers) from verification (QA)
- Works on cloud servers for autonomous operation

## Key Architectural Decisions

### Workspace-Level, Not Project-Level
Minions operates at the **workspace** level, managing multiple repositories as a cohesive product, rather than being tied to a single repository.

### Separate Clones, Not Worktrees
Each agent gets their own **full clone** of the repositories they work with, ensuring complete isolation and independence. This is simpler than worktrees and avoids complexity.

### No Docker (For MVP)
Agents run on the host machine. They make code changes but **don't run dev servers** (except QA). This avoids Docker complexity and dependency management issues.

### QA Agent Handles Verification
Engineers make changes and create draft PRs. The **QA agent** is the only one that runs applications to verify functionality, eliminating port conflicts and separation of concerns.

### GitHub as Source of Truth
All agents clone from and push to GitHub. The minions workspace exists independently from your local development environment.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  EC2 Server (or local machine)                              │
│                                                              │
│  ~/workspaces/my-saas/                                      │
│  ├── .env                                                   │
│  ├── .minions/                                              │
│  │   ├── settings.json                                      │
│  │   ├── connect.md                                         │
│  │   ├── pm/                                                │
│  │   ├── cao/                                               │
│  │   │   ├── CLAUDE.md                                      │
│  │   │   ├── tasks/                                         │
│  │   │   ├── frontend/ (cloned repo)                        │
│  │   │   └── backend/ (cloned repo)                         │
│  │   ├── fe-engineer/                                       │
│  │   │   ├── CLAUDE.md                                      │
│  │   │   ├── tasks/                                         │
│  │   │   └── frontend/ (cloned repo)                        │
│  │   ├── be-engineer/                                       │
│  │   │   ├── CLAUDE.md                                      │
│  │   │   ├── tasks/                                         │
│  │   │   └── backend/ (cloned repo)                         │
│  │   └── qa/                                                │
│  │       ├── CLAUDE.md                                      │
│  │       ├── tasks/                                         │
│  │       ├── frontend/ (cloned repo)                        │
│  │       └── backend/ (cloned repo)                         │
│  │                                                           │
│  └── (Running processes)                                    │
│      ├── minions server (WebSocket + HTTP)                  │
│      ├── minions start cao                                  │
│      ├── minions start fe-engineer                          │
│      ├── minions start be-engineer                          │
│      └── minions start qa                                   │
└─────────────────────────────────────────────────────────────┘
                         │
                         │ WebSocket
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Your Laptop (Browser)                                      │
│                                                              │
│  https://ec2-server.com:3000                                │
│                                                              │
│  Chat Interface:                                            │
│  [You]: @cao Add user authentication                        │
│  [CAO]: Breaking down... ✓ Created tasks                    │
│  [FE]: Working on login UI... ✓ PR #45 created              │
│  [QA]: Testing PR #45... ✓ All checks passed                │
└─────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
~/workspaces/my-saas/                    # Minions workspace
├── .env                                 # GITHUB_TOKEN=xxx
│
├── .minions/
│   ├── settings.json                    # Workspace configuration
│   ├── connect.md                       # Server connection info
│   │
│   ├── pm/
│   │   ├── CLAUDE.md                    # PM system prompt
│   │   └── tasks/                       # PM task queue
│   │
│   ├── cao/
│   │   ├── CLAUDE.md                    # CAO system prompt
│   │   ├── tasks/                       # CAO task queue
│   │   ├── frontend/                    # Clone of frontend repo
│   │   │   ├── .git/
│   │   │   ├── src/
│   │   │   └── package.json
│   │   └── backend/                     # Clone of backend repo
│   │       ├── .git/
│   │       ├── app/
│   │       └── requirements.txt
│   │
│   ├── fe-engineer/
│   │   ├── CLAUDE.md                    # FE system prompt
│   │   ├── tasks/                       # FE task queue
│   │   └── frontend/                    # Clone of frontend repo
│   │       ├── .git/
│   │       └── src/
│   │
│   ├── be-engineer/
│   │   ├── CLAUDE.md                    # BE system prompt
│   │   ├── tasks/                       # BE task queue
│   │   └── backend/                     # Clone of backend repo
│   │       ├── .git/
│   │       └── app/
│   │
│   └── qa/
│       ├── CLAUDE.md                    # QA system prompt
│       ├── tasks/                       # QA task queue
│       ├── frontend/                    # Clone of frontend repo
│       │   ├── .git/
│       │   └── src/
│       └── backend/                     # Clone of backend repo
│           ├── .git/
│           └── app/
│
└── .gitignore                           # Ignore agent clones, tasks, env
```

## Configuration Files

### `.minions/settings.json`

```json
{
  "mode": "yolo",
  "repos": [
    {
      "name": "frontend",
      "url": "git@github.com:yourname/my-saas-frontend.git",
      "path": "frontend",
      "testCommand": "npm test",
      "devCommand": "npm run dev",
      "port": 3000
    },
    {
      "name": "backend",
      "url": "git@github.com:yourname/my-saas-backend.git",
      "path": "backend",
      "testCommand": "pytest",
      "devCommand": "python manage.py runserver",
      "port": 8000
    },
    {
      "name": "mobile",
      "url": "git@github.com:yourname/my-saas-mobile.git",
      "path": "mobile",
      "testCommand": "npm test",
      "devCommand": "npm start",
      "port": 8081
    }
  ]
}
```

### `.minions/connect.md`

```markdown
# Minions Server Connection

Server URL: ws://localhost:3000
API URL: http://localhost:3000

## EC2 Setup
When running on EC2, update to:
Server URL: wss://ec2-xx-xxx-xx-xx.compute.amazonaws.com:3000
API URL: https://ec2-xx-xxx-xx-xx.compute.amazonaws.com:3000
```

### `.env`

```bash
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
```

## Agent Roles

### Product Manager (PM)
**Purpose:** Monitor GitHub issues, track project status, coordinate priorities.

**Tools:** Read-only GitHub access via `gh` CLI

**Responsibilities:**
- List and prioritize GitHub issues
- Monitor PR status across all repos
- Communicate priorities to CAO
- Report project status to user

**System Prompt Location:** `.minions/pm/CLAUDE.md`

**Repo Access:** None (uses `gh` CLI only)

### Chief Agent Officer (CAO)
**Purpose:** Technical architect, task breakdown, delegation.

**Tools:** Read/write access to all repos, file operations

**Responsibilities:**
- Receive feature requests from user or PM
- Break down features into discrete tasks
- Write task files to engineer task queues
- Monitor engineer progress
- Coordinate cross-repo changes

**System Prompt Location:** `.minions/cao/CLAUDE.md`

**Repo Access:** All repos (read/write)

**Task Creation Example:**
```markdown
# .minions/fe-engineer/tasks/task-001-login-form.md

## Task: Create Login Form Component

### Repository: frontend

### Description
Create a reusable LoginForm component with email and password inputs.

### Acceptance Criteria
- [ ] Component accepts onSubmit callback
- [ ] Email validation
- [ ] Password visibility toggle
- [ ] Loading state during submission
- [ ] Error message display

### Technical Notes
- Use existing Input component from design system
- Follow authentication flow in docs/auth.md
- Add unit tests with React Testing Library
```

### Frontend Engineer (FE)
**Purpose:** Implement UI components and frontend features.

**Tools:** Full access to frontend repo(s), `gh` CLI, git operations

**Responsibilities:**
- Monitor `.minions/fe-engineer/tasks/` for new tasks
- Create feature branches
- Implement UI changes
- Run tests to verify
- Commit and push changes
- Create draft PRs
- Notify QA for verification

**System Prompt Location:** `.minions/fe-engineer/CLAUDE.md`

**Repo Access:** Frontend repo(s)

**Workflow:**
1. Detect new task file
2. Read task requirements
3. Navigate to `frontend/` repo
4. Create semantic branch name
5. Implement changes
6. Run `npm test`
7. Commit and push
8. Create draft PR: `gh pr create --draft --title "..." --body "..."`
9. Post in chat: `@qa Please verify PR #45`

### Backend Engineer (BE)
**Purpose:** Implement APIs, database models, server logic.

**Tools:** Full access to backend repo(s), `gh` CLI, git operations

**Responsibilities:**
- Monitor `.minions/be-engineer/tasks/` for new tasks
- Create feature branches
- Implement backend changes
- Run tests to verify
- Commit and push changes
- Create draft PRs
- Notify QA for verification

**System Prompt Location:** `.minions/be-engineer/CLAUDE.md`

**Repo Access:** Backend repo(s)

**Workflow:** Same as FE, but for backend repos

### QA Engineer
**Purpose:** Verify that code changes work as intended.

**Tools:** All repos, `gh` CLI, ability to run dev servers

**Responsibilities:**
- Monitor for `@qa` mentions and draft PRs
- Check out PR branches
- Run dev servers (ONLY agent that does this)
- Test functionality manually and/or with automated tests
- Report pass/fail results
- Mark PR as ready for review or request fixes

**System Prompt Location:** `.minions/qa/CLAUDE.md`

**Repo Access:** All repos (read-only for testing)

**Workflow:**
1. Receive `@qa Please verify PR #45` message
2. Navigate to appropriate repo clone
3. Fetch and checkout PR branch: `gh pr checkout 45`
4. Start dev server: `npm run dev` (port 3000, 8000, etc.)
5. Test the feature:
   - Manual testing (visit UI, test interactions)
   - Run automated tests
   - Check console for errors
   - Verify acceptance criteria from task
6. Stop dev server
7. Report results:
   - Pass: `gh pr ready 45` + notify team
   - Fail: Comment on PR with issues, notify engineer
8. Reset to main branch for next test

**Key Difference:** QA is the **only** agent that runs dev servers, avoiding port conflicts since they test sequentially.

## Core Components

### 1. CLI Tool (`bin/minions.js`)
Global command-line interface.

**Commands:**
- `minions init` - Initialize workspace with `.minions/` structure
- `minions server` - Start WebSocket/HTTP server
- `minions start <role>` - Start an agent (auto-clones repos if needed)
- `minions status` - Show running agents and their states
- `minions stop [role]` - Stop agent(s)

### 2. Server (`src/server/index.ts`)
Express HTTP server + WebSocket hub.

**Responsibilities:**
- Serve web UI
- WebSocket connections from agents
- Route messages between users and agents
- Maintain agent registry (who's connected)
- Provide REST API for status queries

**Endpoints:**
- `GET /` - Web UI
- `GET /api/agents` - List connected agents
- `POST /api/message` - Send message to agent
- `WS /ws` - WebSocket for real-time communication

### 3. Agent Process (`src/agent/process.ts`)
Spawns and manages Claude CLI processes.

**Responsibilities:**
- Clone repos from settings.json if missing
- Start Claude CLI with role-specific system prompt
- Connect to server via WebSocket
- Watch task folder for new assignments
- Send messages to/from chat
- Stream Claude output back to server

**Startup Sequence:**
```javascript
// 1. Load settings
const settings = loadSettings('.minions/settings.json')
const role = process.argv[2] // e.g., 'fe-engineer'

// 2. Clone repos if needed
for (const repo of settings.repos) {
  const repoPath = `.minions/${role}/${repo.path}`
  if (!exists(repoPath)) {
    console.log(`Cloning ${repo.name}...`)
    exec(`git clone ${repo.url} ${repoPath}`)
  }
}

// 3. Start Claude CLI
const systemPrompt = readFile(`.minions/${role}/CLAUDE.md`)
const claude = spawn('claude', [
  '--model', 'claude-sonnet-4-5-20250929',
  '--dangerously-skip-permissions' // YOLO mode
], {
  cwd: `.minions/${role}`,
  env: {
    ...process.env,
    CLAUDE_SYSTEM_PROMPT: systemPrompt
  }
})

// 4. Connect to server
const ws = new WebSocket('ws://localhost:3000/ws')
ws.on('message', (msg) => {
  // Forward chat messages to Claude CLI
  claude.stdin.write(msg + '\n')
})

claude.stdout.on('data', (output) => {
  // Forward Claude output to chat
  ws.send(JSON.stringify({
    role: role,
    message: output.toString()
  }))
})

// 5. Watch task folder
watch(`.minions/${role}/tasks/`, (event, filename) => {
  if (event === 'rename') { // New file
    claude.stdin.write(`New task detected: ${filename}. Please read and execute.\n`)
  }
})
```

### 4. Web UI (`web-ui/`)
React-based chat interface.

**Features:**
- Chat messages with @mention routing
- Agent status indicators (online/offline/working)
- Message history
- File attachments (future)
- PR links and previews (future)

**Tech Stack:**
- React + TypeScript
- Vite for build
- WebSocket for real-time updates
- Tailwind CSS for styling

### 5. State Management
Lightweight state in memory, persisted to `.minions/state.json` (gitignored).

**State Schema:**
```typescript
{
  workspace: string,        // Workspace path
  serverStarted: string,    // ISO timestamp
  agents: [
    {
      role: string,         // 'fe-engineer'
      status: string,       // 'online' | 'offline' | 'working'
      connectedAt: string,  // ISO timestamp
      currentBranch: string // 'add-dark-mode'
    }
  ]
}
```

## User Workflows

### Initial Setup (EC2)

```bash
# SSH into EC2 instance
ssh ubuntu@ec2-xx-xxx-xx-xx.compute.amazonaws.com

# Install dependencies
npm install -g claude-minions
gh auth login  # GitHub CLI authentication

# Create workspace
mkdir ~/workspaces/my-saas
cd ~/workspaces/my-saas

# Initialize
minions init
# Creates .minions/ structure with templates

# Configure
vim .minions/settings.json
# Add your repositories

vim .env
# Add GITHUB_TOKEN=ghp_xxxxx

# Start server (background)
nohup minions server > server.log 2>&1 &

# Start agents (background)
nohup minions start cao > cao.log 2>&1 &
nohup minions start fe-engineer > fe.log 2>&1 &
nohup minions start be-engineer > be.log 2>&1 &
nohup minions start qa > qa.log 2>&1 &

# Verify running
minions status
# cao:         online (idle)
# fe-engineer: online (idle)
# be-engineer: online (idle)
# qa:          online (idle)
```

### Daily Development

```bash
# On your laptop, open browser
open https://ec2-xx-xxx-xx-xx.compute.amazonaws.com:3000

# Chat interface loads
```

**Chat:**
```
[You]: @cao I need to add user authentication with Google OAuth

[CAO]: Got it. Breaking this down into tasks:

       Backend tasks:
       - OAuth callback endpoint
       - JWT token generation
       - User session management
       
       Frontend tasks:
       - Google login button
       - OAuth redirect handling
       - Protected route wrapper
       
       Writing tasks now...
       
       ✓ task-001-oauth-endpoint.md → be-engineer
       ✓ task-002-jwt-tokens.md → be-engineer
       ✓ task-003-login-button.md → fe-engineer
       ✓ task-004-protected-routes.md → fe-engineer
       
       Engineers will begin work.

[BE]: New task detected: task-001-oauth-endpoint.md
      Reading requirements...
      Creating branch: add-oauth-callback
      Implementing /auth/google/callback endpoint...
      Running tests... ✓ All tests pass
      Committed and pushed
      Created draft PR #67: "Add Google OAuth callback endpoint"
      
      @qa Please verify PR #67

[FE]: New task detected: task-003-login-button.md
      Reading requirements...
      Creating branch: add-google-login-button
      Implementing GoogleLoginButton component...
      Running tests... ✓ All tests pass
      Committed and pushed
      Created draft PR #68: "Add Google login button"
      
      @qa Please verify PR #68

[QA]: Verifying PR #67 (backend)...
      Checking out add-oauth-callback branch
      Starting backend server on port 8000
      Testing OAuth flow with curl...
      ✓ Callback endpoint responds correctly
      ✓ JWT token generated successfully
      ✓ User session created
      Stopping server
      
      All checks passed!
      Marked PR #67 as ready for review
      
      @you PR #67 ready for your review

[QA]: Verifying PR #68 (frontend)...
      Checking out add-google-login-button branch
      Starting frontend server on port 3000
      Testing UI...
      ✓ Login button renders
      ✓ Click triggers OAuth redirect
      ✓ No console errors
      Stopping server
      
      All checks passed!
      Marked PR #68 as ready for review
      
      @you PR #68 ready for your review

[You]: Great work team! Reviewing PRs now.
```

**On GitHub:**
```
PR #67: Add Google OAuth callback endpoint [Ready for review]
PR #68: Add Google login button [Ready for review]

(You review, approve, merge)
```

### Handling Issues

```
[You]: @pm what's in the backlog?

[PM]: Checking GitHub issues...
      
      High priority (3):
      #45 - Dark mode support
      #52 - Export data to CSV
      #58 - Two-factor authentication
      
      Medium priority (5):
      #61 - Update password requirements
      #63 - Add user search
      #67 - Mobile responsive fixes
      #70 - Email notifications
      #72 - Improve error messages
      
      Want me to prioritize one for the CAO?

[You]: Start with #45

[PM]: @cao Please implement issue #45 - Dark mode support
      
      Requirements from issue:
      - Add dark/light theme toggle
      - Persist user preference
      - Support system preference detection
      - Update all components to support both themes

[CAO]: Got it. Breaking down dark mode implementation...
       (creates tasks for FE and BE)
```

## Technology Stack

### Core Dependencies
- **commander** (^10.2.0) - CLI framework
- **execa** (^8.0.0) - Process spawning for Claude CLI
- **ws** (^8.16.0) - WebSocket server
- **express** (^4.18.0) - HTTP server
- **chokidar** (^3.5.0) - File watching for task folders

### Web UI
- **react** (^18.3.1) - UI framework
- **vite** (^6.0.1) - Build tool
- **typescript** (^5.6.2) - Type safety
- **tailwindcss** (^3.4.0) - Styling

### External Dependencies
- **Claude CLI** - Must be installed and authenticated
- **gh CLI** - Must be installed and authenticated (`gh auth login`)
- **git** - For repo operations
- **Node.js 20+** - Runtime environment

## GitHub Integration

All GitHub operations use the `gh` CLI tool.

### Authentication
```bash
# One-time setup on EC2
gh auth login
# Or use token
gh auth login --with-token < .env
```

### Engineer Operations
```bash
# Create PR
gh pr create \
  --title "Add dark mode toggle" \
  --body "Implements task-003. Adds DarkModeToggle component." \
  --base main \
  --draft

# Push changes
git push origin add-dark-mode-toggle
```

### PM Operations
```bash
# List issues
gh issue list --state open --limit 10

# Check PR status
gh pr status

# View specific issue
gh issue view 45
```

### QA Operations
```bash
# Checkout PR for testing
gh pr checkout 67

# Mark PR as ready
gh pr ready 67

# Add comment to PR
gh pr comment 67 --body "✓ Tested successfully. OAuth flow works correctly."
```

## Permission Modes

### Ask Mode (Development)
Agents prompt user before tool use. Safe for local development.

**Configuration:**
```json
{
  "mode": "ask"
}
```

### YOLO Mode (Production)
Agents auto-approve all actions. Fast autonomous workflow for EC2 deployments.

**Configuration:**
```json
{
  "mode": "yolo"
}
```

Passed to Claude CLI as `--dangerously-skip-permissions` flag.

## Security Considerations

### GitHub Token
- Store in `.env` file (gitignored)
- Use fine-grained token with minimum permissions:
  - `repo` - Full repository access
  - `workflow` - Update GitHub Actions workflows (if needed)
- Rotate tokens periodically

### `.gitignore`
```
.minions/*/tasks/           # Don't commit WIP tasks
.minions/**/node_modules/   # Don't commit dependencies
.minions/**/.git/           # Don't commit repo clones
.env                        # Don't commit secrets
server.log                  # Don't commit logs
*.log
```

### EC2 Security
- Use security groups to limit port 3000 access to your IP
- Use HTTPS with SSL certificate (future enhancement)
- Consider VPN for additional security

## Deployment Scenarios

### Local Development (Testing)
```bash
cd ~/workspaces/my-saas
minions init
# Edit settings.json
minions server
minions start cao

# In browser: http://localhost:3000
```

### EC2 Production
```bash
# SSH into instance
ssh ubuntu@ec2-server.com

# Setup workspace
cd ~/workspaces/my-saas
minions init
# Configure settings.json and .env

# Start all processes in background
nohup minions server &
nohup minions start cao &
nohup minions start fe-engineer &
nohup minions start be-engineer &
nohup minions start qa &

# Access from laptop browser
# https://ec2-server.com:3000
```

## Future Enhancements

### Phase 2
- **Authentication** - Secure WebSocket connections
- **Multi-user** - Multiple humans coordinating same team
- **Agent memory** - Persistent context across sessions
- **Workflow automation** - Auto-assign tasks based on type
- **PR previews** - Embedded PR diffs in chat
- **Voice notes** - Audio messages in chat
- **File uploads** - Share designs, specs via chat

### Phase 3
- **DevOps agent** - Deployment, monitoring, infrastructure
- **Designer agent** - Generate UI mockups, design assets
- **Mobile engineer** - Specialized for React Native/Flutter
- **Inter-agent messaging** - Agents communicate directly
- **Task dependencies** - Complex workflow orchestration
- **Analytics dashboard** - Team productivity metrics

## Success Metrics

### MVP Success
- ✅ Initialize workspace with `minions init`
- ✅ Start agents with `minions start <role>`
- ✅ Agents auto-clone repos from GitHub
- ✅ Chat with agents via web UI
- ✅ CAO breaks down features into tasks
- ✅ Engineers create PRs autonomously
- ✅ QA verifies PRs by running apps
- ✅ All communication via @mentions

### Production Success
- ✅ Running on EC2 24/7
- ✅ Handling real feature development
- ✅ Multiple PRs per day from agents
- ✅ QA catching issues before human review
- ✅ Clean git history with semantic commits
- ✅ Integration with existing development workflow

## Resolved Design Decisions

1. **How should agents handle merge conflicts?**
   - Auto-rebase and retry
   - If conflict persists after retry, notify human for manual resolution

2. **What if QA finds a bug?**
   - Comment on PR with issue details
   - Notify engineer via chat
   - Engineer fixes and pushes update
   - QA re-tests the updated PR

3. **How to handle urgent fixes?**
   - User creates GitHub issue and labels it as urgent/critical
   - PM minion monitors labels and prioritizes accordingly
   - PM notifies CAO of high-priority issue
   - CAO creates task file immediately
   - Appropriate engineer picks up and works on it
   - No interruption of current work - priority is managed through task queue

4. **Should CAO auto-assign tasks or wait for user approval?**
   - In ask mode: Wait for user confirmation before creating tasks
   - In YOLO mode: Auto-create and assign tasks immediately

5. **How to handle cross-repo dependencies?**
   - Handled conversationally between user and CAO
   - CAO proposes task order based on dependencies
   - User approves or adjusts the sequence
   - Example:
     ```
     [You]: @cao Add user profile feature with avatar uploads
     
     [CAO]: Got it. This will require backend work first, then frontend.
            
            Should I create the tasks in this order?
            1. Backend: Add avatar upload endpoint (task-001)
            2. Backend: Add user profile API (task-002)
            3. Frontend: Profile page UI (task-003)
            4. Frontend: Avatar upload component (task-004)
     
     [You]: Yes, looks good
     
     [CAO]: Creating tasks now...
     ```
   - Engineers pick up tasks as they become available
   - No automatic dependency enforcement - relies on proper task sequencing

## Conclusion

This architecture provides a clean, scalable foundation for autonomous AI development teams. By separating concerns (coding vs. testing), using isolated repo clones, and leveraging GitHub as the source of truth, we enable multiple agents to work simultaneously without conflicts.

The workspace-level approach supports modern multi-repo architectures (microservices, separate frontend/backend) while maintaining simplicity through convention-based configuration and direct use of standard tools (gh CLI, git, Claude CLI).