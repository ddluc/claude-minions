## Working Directory
- **Your working directory**: `{{WORKING_DIR}}`
- **Workspace root**: `{{WORKSPACE_ROOT}}`
- Do not read or write files outside your working directory
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
