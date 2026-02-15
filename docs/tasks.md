# Claude Minions v2 - Implementation Plan

## Overview
Monorepo with 3 packages (CLI, Server, UI) + dependency-free `core/` directory for shared types.

---

## Project Structure

```
claude-minions/
├── package.json             # Root workspace (npm workspaces)
├── tsconfig.base.json       # Shared TS config
├── bin/
│   └── minions.js           # Executable entry point
├── src/
│   ├── core/                # Shared types (NO package, NO build, NO deps)
│   │   ├── types.ts         # Pure TS types
│   │   ├── messages.ts      # Message types
│   │   └── constants.ts     # Constants
│   │
│   ├── cli/                 # CLI Package (@minions/cli)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── commands/    # init, server, start, stop, status
│   │       ├── agent/       # AgentProcess, cloner
│   │       ├── lib/         # schemas, config (with deps)
│   │       └── templates/   # CLAUDE.md templates
│   │
│   ├── server/              # Server Package (@minions/server)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── Server.ts
│   │       ├── WebSocketServer.ts
│   │       ├── MessageRouter.ts
│   │       ├── schemas.ts   # Zod schemas
│   │       └── routes/
│   │
│   └── ui/                  # UI Package (@minions/ui)
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── components/
│           ├── hooks/
│           └── types.ts     # Local type definitions
└── .gitignore
```

## Package Dependencies

**Root:**
```json
{
  "workspaces": ["src/cli", "src/server", "src/ui"]
}
```

**CLI (@minions/cli):**
- commander, inquirer, chalk
- execa, chokidar, ws
- zod, fs-extra
- Imports from `src/core/` via relative paths

**Server (@minions/server):**
- express, ws, uuid, zod
- Imports from `src/core/` via relative paths

**UI (@minions/ui):**
- react, vite, tailwindcss
- Defines types locally (no import from core)

**Core (src/core/):**
- **NO package.json**
- **NO dependencies**
- **NO build step**
- Pure TypeScript types and constants
- Imported via relative paths: `import type { Message } from '../../core/messages.js'`

---

## Import Patterns

### CLI imports from core:
```typescript
import type { Settings, Repo } from '../../../core/types.js';
import type { Message } from '../../../core/messages.js';
import { VALID_ROLES } from '../../../core/constants.js';
```

### Server imports from core:
```typescript
import type { Message, ChatMessage } from '../../core/messages.js';
import type { AgentRole } from '../../core/types.js';
```

### UI defines types locally:
```typescript
// src/ui/src/types.ts
export interface ChatMessage {
  type: 'chat';
  from: string;
  content: string;
  timestamp: string;
}
```

---

## Phase 1: Monorepo Setup

### Task 1.1: Create Package Structure
**Files to Create:**

**Root:**
- `package.json` (workspaces: cli, server, ui)
- `tsconfig.base.json`
- `bin/minions.js`
- `.gitignore`

**Core (src/core/):**
- `types.ts` - Settings, Repo, AgentRole interfaces
- `messages.ts` - Message type definitions
- `constants.ts` - VALID_ROLES, DEFAULT_PORT, etc.

**CLI (src/cli/):**
- `package.json` (@minions/cli)
- `tsconfig.json`
- `src/index.ts` (placeholder)

**Server (src/server/):**
- `package.json` (@minions/server)
- `tsconfig.json`
- `src/index.ts` (placeholder)

**UI (src/ui/):**
- `package.json` (@minions/ui)
- `tsconfig.json`
- `vite.config.ts`
- `index.html`
- `src/main.tsx`, `src/App.tsx`

**Example Core Types:**
```typescript
// src/core/types.ts
export interface Repo {
  name: string;
  url: string;
  path: string;
  testCommand?: string;
  devCommand?: string;
  port?: number;
}

export interface Settings {
  mode: 'ask' | 'yolo';
  repos: Repo[];
}

export type AgentRole = 'pm' | 'cao' | 'fe-engineer' | 'be-engineer' | 'qa';
export type AgentStatus = 'online' | 'offline' | 'working';
```

```typescript
// src/core/messages.ts
export interface ChatMessage {
  type: 'chat';
  from: string;
  to?: string;
  content: string;
  timestamp: string;
}

export interface AgentStatusMessage {
  type: 'agent_status';
  role: string;
  status: 'online' | 'offline' | 'working';
  currentBranch?: string;
  timestamp: string;
}

export type Message = ChatMessage | AgentStatusMessage /* | ... */;
```

```typescript
// src/core/constants.ts
export const VALID_ROLES = ['pm', 'cao', 'fe-engineer', 'be-engineer', 'qa'] as const;
export const DEFAULT_PORT = 3000;
```

---

### Task 1.2: CLI Framework
**Files to Create:**
- `src/cli/src/index.ts`
- `src/cli/src/commands/init.ts`
- `src/cli/src/commands/server.ts`
- `src/cli/src/commands/start.ts`
- `src/cli/src/commands/stop.ts`
- `src/cli/src/commands/status.ts`

**Example:**
```typescript
// src/cli/src/index.ts
import { Command } from 'commander';
import { initCommand } from './commands/init.js';
// ... other imports

const program = new Command();
program
  .name('minions')
  .version('0.2.0')
  .description('Claude Minions - AI agent orchestration');

program
  .command('init')
  .description('Initialize workspace')
  .action(initCommand);

// ... other commands

program.parse();
```

---

### Task 1.3: Core Types & CLI Config
**Files to Create:**
- `src/core/types.ts` ✓ (done in 1.1)
- `src/core/messages.ts` ✓ (done in 1.1)
- `src/core/constants.ts` ✓ (done in 1.1)
- `src/cli/src/lib/schemas.ts` (Zod schemas)
- `src/cli/src/lib/config.ts` (config utilities)

**Example:**
```typescript
// src/cli/src/lib/schemas.ts
import { z } from 'zod';

export const RepoSchema = z.object({
  name: z.string(),
  url: z.string().url(),
  path: z.string(),
  testCommand: z.string().optional(),
  devCommand: z.string().optional(),
  port: z.number().optional(),
});

export const SettingsSchema = z.object({
  mode: z.enum(['ask', 'yolo']),
  repos: z.array(RepoSchema),
});
```

```typescript
// src/cli/src/lib/config.ts
import fs from 'fs-extra';
import path from 'path';
import { SettingsSchema } from './schemas.js';
import type { Settings } from '../../../core/types.js';

export function loadSettings(workspaceRoot: string): Settings {
  const settingsPath = path.join(workspaceRoot, '.minions', 'settings.json');
  const raw = fs.readJSONSync(settingsPath);
  return SettingsSchema.parse(raw);
}

export function getWorkspaceRoot(): string {
  let current = process.cwd();
  while (current !== '/') {
    if (fs.existsSync(path.join(current, '.minions'))) {
      return current;
    }
    current = path.dirname(current);
  }
  throw new Error('Not in a minions workspace. Run `minions init` first.');
}
```

---

### Task 1.4: Workspace Init Command
Implement `minions init` to create .minions/ structure.

---

### Task 1.5: Template Files
Create template files in `src/cli/src/templates/`:
- `settings.template.json`
- `connect.template.md`
- `env.template`
- `claude-pm.template.md`
- `claude-cao.template.md`
- `claude-fe.template.md`
- `claude-be.template.md`
- `claude-qa.template.md`

---

## Phase 2: Server

### Task 2.1: HTTP Server
- Express server
- /api/health, /api/agents routes

### Task 2.2: WebSocket Server
- WebSocket at /ws
- Client tracking
- Broadcast/unicast

### Task 2.3: Message Schemas
**Files to Create:**
- `src/server/src/schemas.ts` (Zod schemas for validation)

**Note:** Message types defined in `src/core/messages.ts`

```typescript
// src/server/src/schemas.ts
import { z } from 'zod';

export const ChatMessageSchema = z.object({
  type: z.literal('chat'),
  from: z.string(),
  to: z.string().optional(),
  content: z.string(),
  timestamp: z.string(),
});

export const MessageSchema = z.discriminatedUnion('type', [
  ChatMessageSchema,
  // ... other schemas
]);

export function validateMessage(data: unknown) {
  return MessageSchema.parse(data);
}
```

### Task 2.4: Message Router
Import types from core:
```typescript
// src/server/src/MessageRouter.ts
import type { Message, ChatMessage } from '../../core/messages.js';
```

### Task 2.5: Server Command
```typescript
// src/cli/src/commands/server.ts
import { MinionsServer } from '@minions/server';
import { ensureWorkspace } from '../lib/config.js';
```

---

## Phase 3: Agent Management

### Task 3.1: Repo Cloner
```typescript
// src/cli/src/agent/cloner.ts
import type { Repo } from '../../../core/types.js';
```

### Task 3.2: Agent Process Spawner
### Task 3.3: WebSocket Client
### Task 3.4: Task Watcher
### Task 3.5: Start Command
### Task 3.6: Stop Command
### Task 3.7: Status Command

---

## Phase 4: Web UI

### Task 4.1: UI Setup (Tailwind)
### Task 4.2: WebSocket Hook
### Task 4.3: Chat Message Component
### Task 4.4: Chat Input Component
### Task 4.5: Agent Status Bar
### Task 4.6: Main Chat Interface
### Task 4.7: Serve Static Files

---

## Phase 5: Polish

### Task 5.1: E2E Testing
### Task 5.2: Error Handling
### Task 5.3: CLAUDE.md Templates
### Task 5.4: Documentation
### Task 5.5: Deployment Guide
### Task 5.6: Publishing

---

## Summary

**Key Changes from Original:**
- ❌ Removed `@minions/shared` package
- ✅ Added `src/core/` - dependency-free types
- ✅ Zod schemas moved to cli/lib and server/ where needed
- ✅ Config utilities in cli/lib (with fs-extra dependency)
- ✅ UI defines types locally (or copies from core)

**Benefits:**
- Simpler build (no shared package to build)
- Faster iteration (core changes don't require rebuild)
- Clear separation: types in core, validation in packages

---

## Next Steps

1. ✅ Architecture reviewed
2. ✅ Implementation plan created
3. → Begin Phase 1: Task 1.1 (Package structure)