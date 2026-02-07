# Task: Setup Basic React + Vite Project with TypeScript

## Context
This task sets up a minimal React application using Vite as the build tool with TypeScript support. This is a greenfield setup in the `src/` directory, which should currently be empty. The goal is to create the simplest possible React + Vite configuration with a "Hello World" component to validate the development environment.

## Goal
Create a working React + Vite + TypeScript application with:
- Vite configuration for React development
- TypeScript configuration
- A single "Hello World" component
- Development server that runs successfully
- Production build capability

## Git Workflow
1. Create and checkout new branch: `git checkout -b feature/setup-react-vite`
2. Make changes as specified below
3. Commit after each completed step with descriptive messages
4. When complete, push branch: `git push -u origin feature/setup-react-vite`
5. Create pull request for review

## Files to Create

### Root Level Files
- `package.json` - Project dependencies and scripts (Vite, React, TypeScript)
- `tsconfig.json` - TypeScript compiler configuration for React
- `tsconfig.node.json` - TypeScript config for Vite config files
- `vite.config.ts` - Vite build configuration with React plugin
- `index.html` - Entry HTML file (Vite requires this at root)

### Source Files (`src/`)
- `src/main.tsx` - Application entry point, mounts React app
- `src/App.tsx` - Root React component with "Hello World" message
- `src/vite-env.d.ts` - Vite client type definitions

## Architectural Guidance

**Build Tool:** Use Vite as the build and dev server
- Fast HMR (Hot Module Replacement)
- Modern ESM-based development
- Optimized production builds

**React Setup:**
- Use functional components (no class components)
- Use React 18+ with the new root API (`createRoot`)
- Keep it minimal - no routing, state management, or UI libraries

**TypeScript:**
- Use strict mode for type safety
- Target modern browsers (ES2020+)
- Use `.tsx` extension for files containing JSX

**Styling:**
- No CSS frameworks or preprocessors
- Inline styles or basic CSS is acceptable for the hello world message

## Implementation Steps

1. **Initialize package.json**
   - Create package.json with minimal dependencies: `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `typescript`, `@types/react`, `@types/react-dom`
   - Add scripts: `dev`, `build`, `preview`

2. **Configure TypeScript**
   - Create `tsconfig.json` with React and Vite-compatible settings
   - Create `tsconfig.node.json` for Vite config files
   - Enable strict mode and JSX transformation

3. **Configure Vite**
   - Create `vite.config.ts` with React plugin
   - Use default Vite settings (no custom configuration needed)

4. **Create Entry HTML**
   - Create `index.html` at project root
   - Include `<div id="root"></div>` mount point
   - Include `<script type="module" src="/src/main.tsx"></script>`

5. **Create React Application**
   - Create `src/main.tsx` - mount React app to DOM
   - Create `src/App.tsx` - simple functional component returning "Hello World"
   - Create `src/vite-env.d.ts` - Vite type definitions reference

6. **Install Dependencies**
   - Run `npm install` to install all packages

7. **Test Development Server**
   - Run `npm run dev` to verify dev server starts successfully
   - Verify "Hello World" appears in browser

8. **Test Production Build**
   - Run `npm run build` to verify build succeeds
   - Verify `dist/` directory is created with built files

## File Content Specifications

### package.json
```json
{
  "name": "claude-minions",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.6.2",
    "vite": "^6.0.1"
  }
}
```

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

### tsconfig.node.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["vite.config.ts"]
}
```

### vite.config.ts
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

### index.html
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Claude Minions</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### src/main.tsx
```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

### src/App.tsx
```typescript
function App() {
  return (
    <div>
      <h1>Hello World</h1>
    </div>
  )
}

export default App
```

### src/vite-env.d.ts
```typescript
/// <reference types="vite/client" />
```

## Constraints

**What NOT to change:**
- Do not modify any existing minions infrastructure (`.minions/` directory)
- Do not modify Docker configuration
- Do not modify existing scripts or Makefile
- Do not add additional dependencies beyond what's specified
- Do not add CSS frameworks, UI libraries, or additional tooling
- Do not create test files (not required for this basic setup)

**What to preserve:**
- Existing `.gitignore` entries (add `node_modules`, `dist` if not present)
- Existing project structure outside of `src/`

## Success Criteria

1. **Installation succeeds:** `npm install` completes without errors
2. **TypeScript compiles:** `tsc` runs without type errors
3. **Dev server starts:** `npm run dev` starts Vite dev server on http://localhost:5173
4. **App renders:** Opening http://localhost:5173 in browser shows "Hello World"
5. **Build succeeds:** `npm run build` creates optimized production bundle in `dist/`
6. **Preview works:** `npm run preview` serves the production build successfully
7. **Git history:** Clean commits with descriptive messages for each major step
8. **PR ready:** Branch pushed to origin and ready for pull request creation

## Dependencies

None - this is a standalone task with no dependencies on other tasks.

## Testing Instructions for CE

After implementation, verify the following:

```bash
# Install dependencies
npm install

# Start dev server (should open on http://localhost:5173)
npm run dev

# In another terminal, build for production
npm run build

# Preview production build
npm run preview
```

Expected output:
- Dev server starts without errors
- Browser displays "Hello World" heading
- Build creates `dist/` directory with optimized files
- No TypeScript errors
- No console errors in browser
