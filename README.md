# Claude Minions

> Orchestrate a team of specialized AI agents to build software together

Claude Minions coordinates multiple AI agents — each with a defined role — to collaborate on your codebase through GitHub. Agents communicate via group chat, create issues, implement features on branches, and open PRs for your review.

![Claude Minions Demo — multi-agent coordination via group chat](docs/demo.png)

## Key Features

- **Multi-agent collaboration** — PM, architect, engineers, and QA agents work together through a shared chat, coordinating via @mentions
- **Isolated workspaces** — Each agent gets its own repository clones and working directory. No conflicts, parallel work by default
- **GitHub-native workflow** — Agents create issues, open PRs, and use labels for task assignment. Your existing tools just work
- **Interactive tap-in** — Drop into any agent's session to see its full conversation history and collaborate directly

## Agent Roles

| Role | Name | Purpose |
|------|------|---------|
| PM | Product Manager | Monitors issues, tracks priorities, communicates with the team |
| CAO | Chief Agent Officer | Technical architect — designs solutions and breaks work into tasks |
| FE | Frontend Engineer | Implements UI features, creates branches and PRs |
| BE | Backend Engineer | Implements APIs, services, and data models |
| QA | QA Engineer | Validates PRs by running tests and verifying changes |

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
npm link  # Makes 'minions' globally available
```

### Initialize a Workspace

```bash
cd your-project
minions init
```

This creates a `minions.json` config file and a `.minions/` directory for agent workspaces.

### Start the System

```bash
# Start the server and daemon
minions up

# Open group chat to talk to agents
minions chat

# Or tap into a specific agent's session
minions tap cao
```

## Configuration

All configuration lives in `minions.json` at your project root.

### Example

```json
{
  "mode": "ask",
  "repos": [
    {
      "name": "my-app",
      "url": "git@github.com:you/my-app.git",
      "path": "my-app"
    }
  ],
  "roles": {
    "cao": { "model": "opus" },
    "be-engineer": { "model": "opus" },
    "fe-engineer": { "model": "sonnet" },
    "qa": { "model": "sonnet" }
  },
  "ssh": "~/.ssh/id_ed25519",
  "permissions": {
    "allow": ["Bash(npm run test *)"],
    "deny": ["Bash(rm -rf *)"]
  }
}
```

### Reference

| Field | Type | Description |
|-------|------|-------------|
| `mode` | `"ask"` \| `"yolo"` | Permission mode. `ask` prompts for approval, `yolo` runs autonomously |
| `repos` | array | Repositories to clone into each agent's workspace |
| `repos[].name` | string | Display name for the repository |
| `repos[].url` | string | Git clone URL (SSH or HTTPS) |
| `repos[].path` | string | Local directory name for the clone |
| `roles` | object | Which agent roles to enable and their config |
| `roles.<role>.model` | `"opus"` \| `"sonnet"` \| `"haiku"` | Claude model for this role |
| `roles.<role>.systemPrompt` | string | Custom system prompt text (optional) |
| `roles.<role>.systemPromptFile` | string | Path to a custom system prompt file (optional) |
| `roles.<role>.permissions` | object | Role-specific permission overrides (optional) |
| `permissions` | object | Global permission rules applied to all roles |
| `permissions.allow` | string[] | Permission rules to allow (e.g., `"Bash(npm run test *)"`) |
| `permissions.deny` | string[] | Permission rules to deny (e.g., `"Bash(rm -rf *)"`) |
| `ssh` | string | Path to SSH key for git operations |
| `serverPort` | number | WebSocket server port (default: 3000) |

## Commands

| Command | Description |
|---------|-------------|
| `minions init` | Initialize a new workspace with `minions.json` and `.minions/` directory |
| `minions up` | Start the WebSocket server and chat daemon |
| `minions down` | Stop the server and daemon |
| `minions tap <role>` | Tap into an agent's session interactively with full conversation history |
| `minions chat` | Open interactive group chat to message agents via @mentions |
| `minions status` | Show status of all agent processes |
| `minions permissions update` | Re-apply permissions from `minions.json` to all role workspaces |

## Workflow Example

### Adding User Authentication

**1. Start the system and open chat**
```bash
minions up
minions chat
```

**2. Ask the CAO to architect the solution**
```
> @cao Please handle issue #42 — add user authentication
```
The CAO reads the codebase, designs the approach, and creates GitHub issues:
- Issue #43: Backend auth endpoints (`role:be-engineer`)
- Issue #44: Frontend login UI (`role:fe-engineer`)

**3. Engineers pick up work automatically**

The daemon routes issues to the right agents. The BE engineer implements JWT auth and opens PR #10. The FE engineer builds the login form and opens PR #11.

**4. Tap in to check progress**
```bash
minions tap be-engineer
```
You see the full conversation history and can ask questions or give direction directly.

**5. Review and merge**

Both PRs are ready for your review. You approve and ship.

## Best Practices

- **Start small** — Begin with one or two agents before scaling up
- **Use SSH keys** — Configure SSH for seamless git operations across agents
- **Assign models thoughtfully** — Opus for planning and complex coding, Sonnet for straightforward tasks, Haiku for lightweight work
- **Use `ask` mode locally** — Reserve `yolo` mode for isolated environments (EC2, containers)
- **Tap in often** — Use `minions tap` to check on agents and provide direction

## Contributing

We welcome contributions! Please open an issue to discuss major changes before submitting a PR.

## License

MIT
