# AI Venture Studio

## Purpose

A founder-focused venture studio platform that transforms startup ideas into structured venture blueprints through a multi-agent workflow.

## Current Phase

```text
Phase 0 — Repository Initialization & SDD Setup
```

## Stack

### Frontend
- **React** (v18)
- **Vite**
- **JavaScript** (ES Modules)
- **Tailwind CSS**

### Backend
- **Node.js**
- **Express.js**
- **MongoDB** / **Mongoose** (with fallback in-memory store)

---

## Directory Structure

```text
AI-Venture/
├── client/              # React + Vite frontend application
│   ├── src/
│   │   ├── components/  # Reusable UI, dashboard, reports, workflow components
│   │   ├── pages/       # Application views (Auth, Dashboard, Project, Boardroom, Analytics)
│   │   ├── services/    # Frontend API client and HTTP utilities
│   │   └── store/       # Zustand state management
│   └── package.json
├── server/              # Express.js REST API backend
│   ├── src/             # Server entry point (index.js)
│   ├── config/          # Database and service configuration
│   ├── controllers/     # Request handlers and HTTP routing logic
│   ├── middleware/      # Authentication, validation, and error middleware
│   ├── models/          # Mongoose data schemas (User, Project, Report, Boardroom)
│   ├── routes/          # Express route definitions
│   ├── services/        # Business logic, export generation, and storage
│   ├── agents/          # Multi-agent definitions and responsibilities
│   └── workflows/       # Agent execution workflows
│   └── package.json
├── specs/               # Authoritative system and architecture specifications
│   ├── product/         # Product requirements and feature specs
│   ├── architecture/    # Architecture decision records and contracts
│   ├── scoring/         # Startup scoring rubrics and models
│   └── system/          # System configuration and infrastructure specs
├── .env.example         # Template for environment configuration
├── .gitignore           # Git ignore rules for node_modules, envs, logs, builds
├── package.json         # Root workspace scripts and concurrent runners
└── README.md            # Project documentation and developer guide
```

---

## Setup

1. **Install Dependencies**
   Run the following command at the repository root to install dependencies across the root, client, and server:

   ```bash
   npm run install:all
   ```

   Or install each component individually:

   ```bash
   npm install
   npm install --prefix server
   npm install --prefix client
   ```

2. **Configure Environment Variables**
   Copy `.env.example` to `server/.env`:

   ```bash
   cp server/.env.example server/.env
   ```

   **Gemini Setup (Recommended Development & Testing):**
   1. Create an API key in [Google AI Studio](https://aistudio.google.com/).
   2. Place the key in `server/.env`:
      ```env
      AI_PROVIDER=gemini
      GEMINI_API_KEY=your_gemini_api_key_here
      GEMINI_MODEL=gemini-3.7-flash
      ```
   3. Start the backend (`npm run dev:server`).
   4. Verify the health endpoint (`curl http://localhost:5000/api/health`).
   5. Launch an agent workflow from the website UI.

   **Ollama Setup (Optional Local Machine Inference):**
   To run locally with Ollama instead of Gemini, update `server/.env`:
   ```env
   AI_PROVIDER=ollama
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=llama3
   ```

---

## Development

Start both the backend API and frontend development servers concurrently from the repository root:

```bash
npm run dev
```

- **Frontend Client:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:5000](http://localhost:5000)

Alternatively, start services individually in separate terminals:

```bash
# Terminal 1: Backend Server
npm run dev:server

# Terminal 2: Frontend Client
npm run dev:client
```

---

## Verification

Verify that the backend is alive by requesting the health check endpoint:

```bash
curl http://localhost:5000/api/health
```

Expected JSON response:

```json
{
  "ok": true,
  "service": "ai-venture-studio"
}
```

Verify that the client builds without errors:

```bash
npm run build
```

---

## Implementation Phases

The project follows a strict sequential phase gate architecture:

```text
Phase 0 — Repository Initialization & SDD Setup
Phase 1 — Foundation
Phase 2 — Authentication
Phase 3 — Projects
Phase 4 — AI Venture Engine
Phase 5 — Studio
Phase 6 — Boardroom
Phase 7 — Memory & Analytics
Phase 8 — Production Hardening
```

These phases must be treated as sequential implementation gates. Future phases must build incrementally upon previous phase foundations without jumping ahead.
