# Claude Minions - Multi-Agent Development Framework

A framework for orchestrating multiple Claude agents working in isolated Docker containers. The **CAO (Chief Agent Officer)** creates tasks that **CE (Claude Engineer)** agents execute independently.

## Overview

- **CAO (Chief Agent Officer)**: You, using Claude Code with `CLAUDE.md` for context, creating and managing tasks
- **CE (Claude Engineer)**: Claude instances in Docker containers using `instructions.md` for context, implementing tasks

## Prerequisites

Before you start, ensure you have:

- **Docker Desktop** - [Install here](https://www.docker.com/products/docker-desktop/)
- **Git** - Should be pre-installed
- **Anthropic API Key** - [Get one here](https://console.anthropic.com/)
- **GitHub Personal Access Token** (optional, for PR creation) - [Create one](https://github.com/settings/tokens)
  - Required scopes: `repo`, `read:org`

## Quick Start

### 1. Set Up Environment

Create a `.env` file in the project root:

```bash
cat > .env <<EOF
GITHUB_TOKEN=your_github_token_here  # Optional, for PR creation
EOF
```

### 2. Customize for Your Project

Edit the following files to match your project:

- **`CLAUDE.md`** - Context for CAO (you), includes task generation guidelines
- **`.minions/instructions.md`** - Context for CE agents (mirrors CLAUDE.md content)

Fill in the placeholder sections marked with `[ENTER...]` or `[ADD...]`.

### 3. Create Your First Minion

```bash
# Create a new CE minion
make @minion/create NAME=test-minion

# Follow prompts to:
# 1. Add SSH key to GitHub
# 2. Optionally add GitHub token for PR creation
```

### 4. Run the Minion

```bash
# Attach to the minion container
make @minion/run NAME=test-minion

# Inside the container, start Claude CLI
make @minion/start

# Tell Claude to implement your task:
# "Please read and implement the task in .minions/tasks/your-task.md"
```

## Directory Structure

```
.
├── CLAUDE.md                   # CAO context (your instructions)
├── README.md                   # This file
├── Makefile                    # Agent management commands
├── .env                        # API keys (gitignored)
├── .gitignore                  # Ignore patterns
├── src/                        # Your application code
├── tasks/                      # Task files (optional location)
└── .minions/                   # CE infrastructure
    ├── Dockerfile              # CE minion container image
    ├── instructions.md         # CE context (copied to claude.md in container)
    ├── scripts/
    │   ├── create-minion.sh    # Creates and configures new CE minion
    │   ├── run-minion.sh       # Attaches to running CE minion
    │   └── start-minion.sh     # Starts Claude CLI with optimal settings
    └── tasks/                  # Task files for CE minions
        └── .gitkeep
```

## Workflow

### Step 1: CAO Creates Task File

As CAO (using Claude Code), analyze feature requests and create task files following the format in `CLAUDE.md`:

```bash
# Task files typically go in .minions/tasks/
# Example: .minions/tasks/add-user-authentication.md
```

### Step 2: Create CE Minion

```bash
# Create a named minion for the task
make @minion/create NAME=add-auth

# This will:
# - Build Docker image with your codebase
# - Create isolated container named minion-ce-add-auth
# - Generate SSH keys for GitHub access
# - Configure GitHub CLI (if token provided)
# - Copy instructions.md to claude.md in container
```

### Step 3: CE Minion Executes Task

```bash
# Attach to the minion
make @minion/run NAME=add-auth

# Inside container: Start Claude CLI
make @minion/start

# Claude will:
# - Load context from claude.md automatically
# - Fetch latest from origin/master
# - Wait for your instructions

# Tell Claude to implement the task:
# "Please read and implement the task in .minions/tasks/add-user-authentication.md"
```

The CE minion will:
1. Read the task file
2. Create a feature branch (`git checkout -b feature/add-auth`)
3. Implement changes following the task specification
4. Commit after each step
5. Push branch to remote
6. Create a pull request (if GitHub CLI is configured)

### Step 4: Review & Merge

```bash
# Review the PR created by CE
# Merge when approved
# Repeat for next task
```

## Managing Minions

### Create Minion
```bash
make @minion/create NAME=<minion-name>

# Examples:
make @minion/create NAME=worker-1
make @minion/create NAME=feature-auth
```

### Attach to Running Minion
```bash
make @minion/run NAME=<minion-name>
```

### Start Claude CLI (Inside Container)
```bash
make @minion/start
```

### List Running Minions
```bash
docker ps --filter "name=minion-ce-"
```

### Stop Minion
```bash
docker stop minion-ce-<minion-name>
```

### Remove Minion
```bash
docker rm minion-ce-<minion-name>
```

### View Minion Logs
```bash
# View all logs
docker logs minion-ce-<minion-name>

# Follow logs in real-time
docker logs -f minion-ce-<minion-name>
```

## Task File Format

Task files should be placed in `.minions/tasks/` and follow this structure:

```markdown
# Task: [Brief Title]

## Context
[Architectural background - how this fits in your system]

## Goal
[What CE should accomplish]

## Git Workflow
1. Create and checkout new branch: `git checkout -b feature/[name]`
2. Make changes as specified below
3. Commit after each completed step with descriptive messages
4. Push branch: `git push -u origin feature/[name]`
5. Create pull request for review

## Files to Modify
- `/path/to/file.ts` - [Why/what changes]
- `/path/to/another.ts` - [Why/what changes]

## Architectural Guidance
[Patterns to follow, base classes to extend, libraries to use]
[Design system components, coding standards, etc.]

## Implementation Steps
1. [High-level step]
2. [High-level step]
3. [High-level step]

## Method Signatures
[Exact interfaces and method signatures to implement]

```typescript
// Example method signatures
export function functionName(param: Type): ReturnType;
```

## Constraints
[What NOT to change - base classes, shared utilities, etc.]

## Success Criteria
[Testable outcomes that define "done"]
- [ ] Feature works as specified
- [ ] Tests pass
- [ ] No breaking changes
- [ ] Code follows project standards

## Dependencies
[Other tasks that must complete first, if any]
```

## Key Features

### Isolation
- Each CE minion runs in its own Docker container
- Codebase is **copied** (not mounted) for true isolation
- No interference between minions
- Full YOLO permissions for CE minions

### Single Minion Pattern
- Only one CE minion runs at a time (simpler workflow)
- Create new minions as needed for different tasks
- Clean up old minions when done

### Automatic Context Loading
- `.minions/instructions.md` is copied to `claude.md` in container
- Claude CLI automatically loads `claude.md` on startup
- CE minions have full project context without manual setup

### Git Integration
- SSH keys for secure GitHub access
- GitHub CLI for PR creation
- Git configured for commits as "Claude Engineer"
- Fetches latest from master before starting work

### Optimal Configuration
- Uses Sonnet model (cost-effective)
- YOLO permissions (`--dangerously-skip-permissions`)
- Auto-approves all tool usage (Bash, Edit, Write, Read, Glob, Grep)
- All git operations happen inside container

## Customization Guide

### For Your Project

1. **Update `CLAUDE.md`** with:
   - Your project architecture
   - Code standards and patterns
   - Key files and their purposes
   - Development commands

2. **Update `.minions/instructions.md`** to mirror CLAUDE.md
   - This becomes the CE agent's context
   - Keep it synchronized with CLAUDE.md

3. **Modify `.minions/Dockerfile`** if needed:
   - Update dependency installation (lines 38-40)
   - Add project-specific tools
   - Adjust git email domain (line 48)

4. **Create task templates** for common patterns:
   - Backend API tasks
   - Frontend component tasks
   - Bug fix tasks
   - Refactoring tasks

## Troubleshooting

### "Cannot connect to Docker daemon"
**Solution:** Start Docker Desktop

### "Permission denied" when running scripts
**Solution:**
```bash
chmod +x .minions/scripts/*.sh
```

### "Authentication failed" in container
**Solution:** Check your `.env` file has valid `ANTHROPIC_API_KEY`

### "SSH key not working" with GitHub
**Solution:** Make sure you added the public key to GitHub at https://github.com/settings/keys

### "gh: command not found" or PR creation fails
**Solution:** Ensure `GITHUB_TOKEN` is in your `.env` file

### Minion stuck or behaving incorrectly
**Solution:**
```bash
# Exit Claude CLI (Ctrl+C or type "exit")
# Exit container
exit
# Stop and recreate minion
docker stop minion-ce-<minion-name>
docker rm minion-ce-<minion-name>
make @minion/create NAME=<minion-name>
```

## Tips for Success

### Writing Effective Task Files
1. **Be specific** - Include exact file paths and method signatures
2. **Provide context** - Explain why, not just what
3. **Set constraints** - Document what NOT to change
4. **Define success** - Clear, testable criteria
5. **Order dependencies** - Specify which tasks must complete first

### Working with CE Minions
1. **One task at a time** - Keep tasks focused and scoped
2. **Review before running** - Validate task file completeness
3. **Monitor progress** - Use `docker logs` to watch execution
4. **Test thoroughly** - Review PRs before merging
5. **Clean up** - Remove old minions after merging

### CAO Best Practices
1. **Understand codebase first** - Read files before creating tasks
2. **Break down features** - Split large features into small tasks
3. **Follow architecture** - Respect existing patterns
4. **Document assumptions** - Make implicit knowledge explicit
5. **Iterate on tasks** - Improve task templates based on results

## Advanced Usage

### Running Multiple Minions
While the default workflow uses one minion at a time, you can run multiple minions for parallel work:

```bash
make @minion/create NAME=task-1
make @minion/create NAME=task-2

# In separate terminals:
make @minion/run NAME=task-1
make @minion/run NAME=task-2
```

**Note:** Ensure tasks don't have conflicting file changes.

### Task Dependencies
For multi-step features with dependencies:

1. Create tasks in dependency order
2. In each task file, specify dependencies
3. Run CE minions sequentially
4. Each minion merges its PR before the next starts

### Monitoring Minion Activity
```bash
# Watch logs in real-time
docker logs -f minion-ce-<minion-name>

# Check container resource usage
docker stats minion-ce-<minion-name>

# Inspect container
docker inspect minion-ce-<minion-name>
```

## Contributing

This is a template framework. Customize it for your needs and share improvements!

## License

[Your License Here]
