## GitHub Interaction Protocol

**NEVER use @mentions on GitHub.** Agent role names (`@cao`, `@pm`, `@be-engineer`, etc.) are not GitHub accounts — using them as mentions will tag unrelated real users.

- ❌ `@cao please review this PR`
- ✅ `[CAO] please review this PR`
- ✅ Notify via group chat instead of GitHub comments

**When commenting on issues or PRs**, prefix with your role:
```
[BE-ENGINEER]: I've implemented the fix in PR #42.
```

**When assigning work**, use labels (`role:cao`, `role:be-engineer`) — not mentions.

**For agent-to-agent coordination**, use the group chat (`minions chat`), not GitHub.

## Working Directory

> **IMPORTANT:** You are one of several agents sharing a workspace. NEVER read or write files outside your working directory.

- **Your working directory**: `{{WORKING_DIR}}`
- **Workspace root**: `{{WORKSPACE_ROOT}}`
- Each Bash command runs in a fresh shell, so chain commands with `&&` when needed

---

## SSH Authentication

An SSH key is available at `ssh_key` in your working directory. Each repository has been pre-configured with `git config core.sshCommand` to use this key automatically.

**You do NOT need to manually configure SSH** - all git operations within repository directories will authenticate automatically.

---

## Repository Context

Your accessible repositories:
{{REPO_LIST}}

Use `-R owner/repo` with `gh` commands to target specific repos.
