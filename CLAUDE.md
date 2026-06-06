# Debug-my-Architecture

## Project Overview

A full-stack tool that accepts a GitHub repository URL, clones it, statically analyzes its architecture, and presents a dependency graph and React route map to the user. The tool is specifically built to analyze **MERN stack** projects.

## Repository Structure

```
Debug-my-Architecture/
├── frontend/                        # The UI for this tool (React + Vite + Tailwind + DaisyUI)
├── backend/                         # Express API server that handles cloning and triggering analysis
│   ├── index.js                     # Main entry point - defines /api/analyse endpoint
│   └── temp/                        # ⚠️ TRANSIENT - Stores cloned GitHub repos for analysis ONLY
│                                    #    Do NOT write project code here. Contents are deleted on re-analysis.
└── architecture-analyser/
    └── mern-stack/
        ├── graph.js                 # Core static analysis engine (entry point discovery, dependency graph, route extraction)
        ├── scan.js                  # Bridge between backend API and graph.js; exports PrintFolders()
        ├── package-db.json          # Persistent cache of npm package metadata (classified via Gemini LLM)
        ├── routes-db.json           # Persistent output of extracted React routes from the last analysis
        └── .env                     # Contains GEMINI_API_KEY
```

## Architecture & Data Flow

```
User pastes GitHub URL
        │
        ▼
frontend/src/App.jsx
  (React + Vite UI)
        │  POST /api/analyse { url }
        ▼
backend/index.js
  (Express server, port 3000)
        │  git clone → backend/temp/<repo-name>/
        │  await PrintFolders(url)
        ▼
architecture-analyser/mern-stack/scan.js
  PrintFolders() → resolves folderPath → calls analyzeRepo()
        │
        ▼
architecture-analyser/mern-stack/graph.js
  analyzeRepo()
    ├── findEntryPoints()       — scans all package.json files recursively (skips node_modules)
    │     ├── reads `main` field
    │     ├── checks common fallbacks: src/index.js, server.js, app.js, client/main.js
    │     └── parses `scripts` values for .js filenames, then deep-reads those files for further .js refs
    │
    ├── buildGraph()            — recursively follows require/import from each entry point
    │     ├── local files → recurses
    │     ├── built-ins → labels as (Built-in)
    │     └── npm packages → classifyPackageWithLLM() → caches in package-db.json
    │
    └── findAndExtractRoutes()  — traverses local imports to find files importing react-router-dom
          └── regex-extracts all <Route> and <ProtectedRoute> path + component pairs
              → saves to routes-db.json
```

## Key Modules

### `backend/index.js`
- **POST `/api/analyse`** — accepts `{ url: string }`, clones the repo into `backend/temp/`, then calls `PrintFolders(url)`.
- URL is sanitized: trailing slashes and `.git` suffixes are stripped before cloning.
- `GIT_TERMINAL_PROMPT=0` is set to prevent git from hanging on private/missing repos.

### `architecture-analyser/mern-stack/graph.js`
- **`buildGraph(filePath)`** — Recursive dependency graph builder. For npm packages, calls the Gemini LLM to classify purpose/role/category and caches results in `package-db.json`.
- **`findAndExtractRoutes(filePath)`** — Recursively follows local imports, detects files using `react-router-dom`, and extracts all route `path → component` mappings using regex. Supports both `<Route>` and `<ProtectedRoute>`, single-line and multi-line JSX prop formats.
- **`analyzeRepo(folderPath)`** — Orchestrates the full analysis: discovers entry points, runs `buildGraph` on each, runs `findAndExtractRoutes`, deduplicates, saves routes to `routes-db.json`, and logs everything to the terminal.
- **`classifyPackageWithLLM(packageName)`** — Calls Gemini API using the lowest-tier model (`gemini-1.5-flash-8b`) to minimize token usage. If a `429 Too Many Requests` quota error is received, a global `quotaExceeded` flag is set and all subsequent packages are immediately marked with `"-"` without further API calls.

### `architecture-analyser/mern-stack/scan.js`
- Exports **`PrintFolders(url)`** — resolves the cloned repo path from the URL and calls `analyzeRepo()`.

## Persistent Data Files

| File | Purpose |
|---|---|
| `package-db.json` | Cache of npm package metadata. Survives across runs. Add entries manually to avoid LLM calls. |
| `routes-db.json` | Output of the last route extraction. Overwritten on each analysis run. |
| `backend/temp/` | **Temporary only.** Cloned repos are deleted and re-cloned on each analysis. Never store code here. |

## Dev Commands

```bash
# Run the frontend UI (React + Vite, port 5173)
cd frontend && npm run dev

# Run the backend API server (Express, port 3000)
cd backend && npm run dev

# Run the static analyser directly on the last cloned repo (for debugging)
node architecture-analyser/mern-stack/graph.js
```

## Environment Variables

| Variable | Location | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | `architecture-analyser/mern-stack/.env` | Used by graph.js to call the Gemini API for npm package classification |

## Important Constraints & Conventions

- **`backend/temp/` is ephemeral.** It only exists to hold a cloned repo during analysis. Never write persistent project files there.
- **LLM is only for npm package classification.** Route extraction and dependency graph traversal are purely regex/AST-free static analysis.
- **Always use `gemini-1.5-flash-8b`** for LLM calls — it is the cheapest model. Do not upgrade to `gemini-2.5-flash` or similar; the free tier quota is very low.
- **Quota kill-switch**: If the Gemini API returns a `429`, the `quotaExceeded` flag is set globally and no more LLM calls are made for the rest of the run. Packages get `"-"` as placeholder values.
- The backend uses **ES Modules** (`"type": "module"` in package.json). Use `import`/`export`, not `require`/`module.exports`.
- The architecture-analyser also uses **ES Modules**.
- The frontend uses **React 19 + Vite + Tailwind CSS v4 + DaisyUI**.
