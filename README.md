# Claude Minions

> Multi-agent AI development workflow with intelligent git orchestration

Claude Minions orchestrates multiple specialized AI agents working together on your codebase. Each agent has a defined role - Product Manager, Chief Architect, Engineers, and QA - collaborating through GitHub to ship features faster and more reliably.

## Key Features

### 🏢 Multi-Repository Orchestration
Manage frontend, backend, mobile, and infrastructure repos as a unified workspace. Agents understand the relationships between your repositories and coordinate changes across them.

### 🔒 Isolated Agent Environments
Each agent gets its own complete clone of your repositories with isolated working directories. No conflicts, no stepping on each other's toes. Engineers can work in parallel while QA validates independently.

### 🎯 GitHub-Native Workflow
All coordination happens through GitHub - Issues for task assignment, Pull Requests for code review, labels for agent assignment. Your existing tools and processes just work.

### 📋 Role-Based Agents
Each agent is purpose-built for its role with specialized instructions and constraints. PM agents can't write code. Engineers can't merge PRs. QA agents run servers that engineers can't touch.

## How It Works

1. **Initialize** a workspace pointing to your repositories
2. **Configure** which agents you want and which repos they work on
3. **Start** agents in their own terminal sessions
4. **Collaborate** through GitHub - agents create issues, implement features, and verify changes

## Quick Start

### Prerequisites

- Node.js 20+
- [Claude Code CLI](https://www.npmjs.com/package/@anthropic-ai/claude-code) installed globally
- GitHub account with SSH access configured

### Installation

```bash
git clone https://github.com/ddluc/claude-minions.git
cd claude-minions
npm install
npm link  # Optional: make 'minions' globally available
```

### Setup Your Workspace

```bash
# In your project directory
minions init

# Edit minions.json to configure your repos and agents
```

**Example minions.json:**
```json
{
  "mode": "ask",
  "repos": [
    {
      "name": "frontend",
      "url": "git@github.com:you/frontend.git",
      "path": "frontend"
    },
    {
      "name": "backend",
      "url": "git@github.com:you/backend.git",
      "path": "backend"
    }
  ],
  "roles": {
    "cao": { "enabled": true, "model": "opus" },
    "fe-engineer": { "enabled": true, "model": "sonnet" },
    "be-engineer": { "enabled": true, "model": "sonnet" },
    "qa": { "enabled": true, "model": "haiku" }
  },
  "ssh": "~/.ssh/id_ed25519"
}
```

### Launch Agents

```bash
# Start agents in separate terminal sessions
minions start cao
minions start fe-engineer
minions start be-engineer
minions start qa

# Check status
minions status

# Stop an agent
minions stop cao
```

## Real-World Workflow

### Scenario: Adding User Authentication

**1. PM identifies priority**
```bash
minions start pm
# PM reviews open issues and identifies #42 as high priority
```

**2. CAO architects the solution**
```bash
minions start cao
# User: "Please handle issue #42 - add user authentication"
# CAO reads codebase, designs approach, creates issues:
#   - Issue #43: Backend auth endpoints [role:be-engineer]
#   - Issue #44: Frontend login UI [role:fe-engineer]
```

**3. Engineers implement in parallel**
```bash
# Terminal 1
minions start be-engineer
# Picks up #43, implements JWT auth, creates PR #10

# Terminal 2
minions start fe-engineer
# Picks up #44, builds login form, creates PR #11
```

**4. QA validates**
```bash
minions start qa
# Checks out PR #10, runs backend tests ✓
# Checks out PR #11, starts dev server, tests UI ✓
# Marks both PRs ready for review
```

**5. You review and merge**
Both PRs are validated and ready. You review, approve, and ship.

## Use Cases

### Monorepo or Multi-Repo Projects
Coordinate changes across frontend, backend, and infrastructure repositories with agents that understand your full architecture.

### Feature Development
Break down complex features into discrete tasks, implement them in parallel across different repos, and validate before merge.

### Code Review & QA
Automated testing and verification of PRs before they reach your review queue. QA agents can run your app, test edge cases, and report issues.

### Refactoring at Scale
Coordinate architectural changes across multiple repositories with the CAO planning and engineers executing in isolated environments.

### Autonomous Development
Run on a remote server (EC2, etc.) and let your agent team work 24/7, handling issues, implementing features, and creating PRs for your review.

## Agent Roles Explained

### Product Manager (PM)
- Monitors GitHub Issues across all repositories
- Tracks project status and priorities
- Communicates priorities to the CAO
- **Constraints:** Cannot write code or create PRs

### Chief Agent Officer (CAO)
- Technical architect and task coordinator
- Reads codebases to understand architecture
- Breaks features into implementable tasks
- Creates GitHub Issues with role assignments
- **Constraints:** Delegates implementation, doesn't code

### Frontend Engineer
- Implements UI features and components
- Follows existing patterns and conventions
- Creates feature branches and draft PRs
- **Constraints:** Frontend repos only, no backend changes

### Backend Engineer
- Implements APIs, services, and data models
- Writes tests for backend changes
- Creates feature branches and draft PRs
- **Constraints:** Backend repos only, no frontend changes

### QA Engineer
- Validates PRs by running tests and dev servers
- Only agent authorized to run applications
- Reports issues or marks PRs ready for review
- **Constraints:** Cannot implement features, only verify

## Configuration

### Repository Settings

```json
{
  "name": "my-app",
  "url": "git@github.com:you/my-app.git",
  "path": "my-app",
  "testCommand": "npm test",      // Optional
  "devCommand": "npm run dev",    // Optional
  "port": 3000                    // Optional
}
```

### Role Configuration

```json
{
  "enabled": true,
  "model": "opus" | "sonnet" | "haiku",
  "systemPrompt": "Custom instructions",        // Optional
  "systemPromptFile": "path/to/prompt.md"      // Optional
}
```

### Permission Modes

- **`ask`** - Agents request permission for file edits, git operations
- **`yolo`** - Agents operate autonomously (use with caution)

## Architecture

Claude Minions is built as a TypeScript monorepo with three packages:

- **CLI** - Commands for initialization, agent management, and status
- **Core** - Shared types and message definitions
- **Templates** - Role-specific agent instructions

Each agent runs in an isolated directory (`.minions/<role>/`) with its own repository clones and configuration. All coordination happens through GitHub's native features - Issues, PRs, and labels.

## Best Practices

✅ **Start small** - Begin with one or two agents before scaling up
✅ **Use SSH keys** - Configure SSH for seamless git operations
✅ **Review PRs** - Agents create draft PRs for your final review
✅ **Assign models thoughtfully** - Opus for planning, Sonnet for coding, Haiku for testing
✅ **Monitor agent activity** - Check GitHub for issues, PRs, and comments

## FAQ

**Q: Do agents run autonomously?**
A: Agents can run autonomously in "yolo" mode or request permission in "ask" mode. You control the level of autonomy.

**Q: Can I customize agent behavior?**
A: Yes, via custom system prompts or by modifying agent templates.

**Q: What if agents conflict?**
A: Each agent has isolated repository clones and works on separate branches. GitHub handles merge coordination.

**Q: Do I need multiple Claude API keys?**
A: No, all agents use your single Claude Code CLI configuration.

**Q: Can agents work on private repositories?**
A: Yes, as long as your SSH key has access.

## Contributing

We welcome contributions! Please open an issue to discuss major changes before submitting a PR.

## License

MIT

---

**Built with Claude Code CLI** | [Documentation](./docs/architecture.md) | [Issues](https://github.com/ddluc/claude-minions/issues)
