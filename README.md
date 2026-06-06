# 🔍 Debug My Architecture

A developer tool that accepts any public GitHub repository URL, clones it, and performs **static analysis** to automatically map out its architecture — including its dependency graph and all React client-side routes.

> Built specifically for **MERN stack** projects.

---

## ✨ Features

- 🌐 **GitHub URL Input** — Paste any public GitHub repo URL and get an instant architectural breakdown
- 📦 **Dependency Graph** — Recursively traces all `import`/`require` calls from the entry point and maps the full dependency tree
- 🗺️ **React Route Extraction** — Automatically finds every `<Route>` and `<ProtectedRoute>` defined in the app and maps each URL path to its component
- 🤖 **LLM-Powered npm Classification** — Unknown npm packages are classified by the Gemini API (purpose, role, category) and cached locally so they're never looked up twice
- ⚡ **Quota-Safe** — Uses the lowest-tier Gemini model (`gemini-1.5-flash-8b`) and instantly cancels LLM calls the moment a rate-limit (`429`) is hit, marking remaining packages with `"-"` instead of crashing

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend UI | React 19, Vite, Tailwind CSS v4, DaisyUI |
| Backend API | Node.js, Express |
| Static Analyser | Custom regex-based JS parser |
| LLM | Google Gemini API (`gemini-1.5-flash-8b`) |

---

## 🗂️ Project Structure

```
Debug-my-Architecture/
├── frontend/                        # React + Vite UI
│   └── src/
│       └── App.jsx                  # Main UI — accepts GitHub URL, displays results
│
├── backend/                         # Express API server (port 3000)
│   ├── index.js                     # /api/analyse endpoint — clones repo, triggers analysis
│   └── temp/                        # Temporary storage for cloned repos (auto-deleted on re-analysis)
│
└── architecture-analyser/
    └── mern-stack/
        ├── graph.js                 # Core engine: entry point discovery, dependency graph, route extraction
        ├── scan.js                  # Bridge: resolves repo path and calls analyzeRepo()
        ├── package-db.json          # Persistent cache of classified npm packages
        └── routes-db.json           # Output: React routes extracted from the last analysis
```

---

## 🔄 How It Works

```
User pastes GitHub URL
        │
        ▼
  React Frontend
  POST /api/analyse
        │
        ▼
  Express Backend
  git clone → backend/temp/<repo>/
        │
        ▼
  scan.js → analyzeRepo()
        │
        ├──► findEntryPoints()
        │      Reads package.json main, common fallbacks (server.js, src/index.js, client/main.js),
        │      and parses scripts values for .js file references
        │
        ├──► buildGraph()
        │      Recursively follows all imports/requires from each entry point
        │      npm packages → classified via Gemini API → cached in package-db.json
        │
        └──► findAndExtractRoutes()
               Follows local imports to find files using react-router-dom
               Regex-extracts all <Route> / <ProtectedRoute> path + component pairs
               → Saved to routes-db.json, logged to terminal
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js v18+
- Git installed and available on PATH
- A [Google Gemini API key](https://aistudio.google.com/app/apikey) (free tier works)

### 1. Clone this repo

```bash
git clone https://github.com/rockrider603/Debug-My-Architecture.git
cd Debug-My-Architecture
```

### 2. Set up the environment

Create a `.env` file inside `architecture-analyser/mern-stack/`:

```bash
# architecture-analyser/mern-stack/.env
GEMINI_API_KEY=your_api_key_here
```

### 3. Install dependencies

```bash
# Frontend
cd frontend && npm install

# Backend
cd ../backend && npm install
```

### 4. Run the app

Open two terminals:

```bash
# Terminal 1 — Frontend (http://localhost:5173)
cd frontend && npm run dev

# Terminal 2 — Backend (http://localhost:3000)
cd backend && npm run dev
```

Then open `http://localhost:5173`, paste a GitHub URL (e.g. `https://github.com/meabhisingh/mernProjectEcommerce`), and hit **Analyse**.

---

## 📊 Output

Analysis results are printed directly to the **backend terminal** in real time. Two files are also written/updated in `architecture-analyser/mern-stack/`:

### `package-db.json` — npm Package Cache
```json
{
  "mongoose": {
    "purpose": "Provides elegant MongoDB object modelling for Node.js.",
    "architecture_role": "Object Data Mapper",
    "category": "orm",
    "resource": "MongoDB"
  }
}
```

### `routes-db.json` — Extracted React Routes
```json
[
  {
    "file": "App.js",
    "routes": [
      { "path": "/",              "component": "Home" },
      { "path": "/product/:id",   "component": "ProductDetails" },
      { "path": "/admin/orders",  "component": "OrderList" }
    ]
  }
]
```

---

## ⚠️ Notes

- The `backend/temp/` folder is **ephemeral** — it only holds cloned repos during analysis and is wiped on every new request. Do not store anything important there.
- Only **public** GitHub repositories are supported. Private repos will fail gracefully with an error message.
- The Gemini API free tier has a low rate limit. The tool handles this automatically by stopping LLM calls the moment a `429` error is received and filling in `"-"` for unclassified packages. Already-cached packages in `package-db.json` are never re-fetched.

---

## 📄 License

MIT
