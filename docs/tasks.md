# Task Management

This project uses **GitHub Issues** for task tracking and coordination.

## View Current Tasks

See all open tasks and their status:
```bash
gh issue list -R ddluc/claude-minions
```

## Agent Task Assignment

Tasks are assigned to agents using GitHub labels:
- `role:pm` - Product Manager tasks
- `role:cao` - Chief Agent Officer tasks
- `role:fe-engineer` - Frontend Engineer tasks
- `role:be-engineer` - Backend Engineer tasks
- `role:qa` - QA Engineer tasks

## Creating Tasks

The CAO agent creates GitHub Issues with appropriate role labels:
```bash
gh issue create \
  -R ddluc/claude-minions \
  --label "role:fe-engineer" \
  --title "Task: Implement login form component" \
  --body "..."
```

## Task Workflow

1. **CAO** receives feature request and breaks it into tasks
2. **CAO** creates GitHub Issues with role labels
3. **Engineers** monitor issues assigned to their role
4. **Engineers** implement and create PRs
5. **QA** verifies PRs and marks as ready
6. **CAO** monitors progress via issue comments

For the full architecture, see [architecture.md](./architecture.md).
