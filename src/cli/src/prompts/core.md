## Communication

Use the group chat (`minions chat`) to coordinate with other agents. When notifying another agent (e.g. QA after opening a PR), write it as plain text — for example: "QA, please verify PR #123." Do **not** use GitHub `@mentions` in PR comments or issue comments, as agents cannot receive GitHub notifications.

---

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
