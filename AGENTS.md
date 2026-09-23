# Architectural Rules for AI Coding Agents

All AI coding assistants and developers working on the **AI Venture Studio** codebase must adhere to the following rules.

---

### Rule 1 — Read the specification first
Before implementing any feature or modifying code, thoroughly inspect the relevant specification in `specs/` or the source specification document. Do not invent requirements or assume unstated behavior.

### Rule 2 — Work phase by phase
Only implement the specific phase currently requested by the user. Do not implement future phases proactively. The phase sequence is strictly gated:
- Phase 0 — Repository Initialization & SDD Setup
- Phase 1 — Foundation
- Phase 2 — Authentication
- Phase 3 — Projects
- Phase 4 — AI Venture Engine
- Phase 5 — Studio
- Phase 6 — Boardroom
- Phase 7 — Memory & Analytics
- Phase 8 — Production Hardening

### Rule 3 — Preserve boundaries
Maintain strict repository separation:
- Frontend code belongs exclusively in `client/`
- Backend code belongs exclusively in `server/`
- Architectural and functional specifications belong in `specs/`

Do not create `frontend/`, `backend/`, `app/`, `api/`, or `web/` as alternative root directories.

### Rule 4 — JavaScript only
The project is strictly standardized on modern JavaScript (ES Modules). Do not introduce TypeScript, JSX-in-server, or alternative language runtimes unless explicitly instructed with a formal specification update.

### Rule 5 — Preserve API and data contracts
Do not casually rename or alter agreed field names and schemas, such as:
- `startupName`
- `idea`
- `industry`
- `targetUsers`
- `country`
- `budget`
- `timeline`
- `agentRuns`
- `startupScore`

### Rule 6 — Avoid unnecessary dependencies
Use the specified technology stack (React + Vite + Tailwind CSS on the client; Node.js + Express.js + Mongoose on the server). Do not replace the architecture with a different framework (such as Next.js or NestJS) or add unvetted third-party libraries.

### Rule 7 — No secrets
Never hardcode passwords, API keys, JWT secrets, SMTP credentials, or database URIs into source code or commit them to version control. Always read sensitive configuration through environment variables via `.env`.

### Rule 8 — Verify actual behavior
After completing implementation changes:
- Run the relevant build command (`npm run build`)
- Start the server and verify actual HTTP responses (`curl http://localhost:5000/api/health`)
- Run unit/integration tests if configured
- Report verification results and any observed failures honestly
- Never assume or claim code works without real execution and verification

### Rule 9 — Do not rewrite completed work
Future phases must build additively upon previously established foundations. Do not refactor, rewrite, or discard existing working modules merely to match personal stylistic preferences.

### Rule 10 — Keep controllers thin
HTTP controllers in `server/controllers/` should strictly manage HTTP request validation and response dispatching. Complex business logic, calculations, orchestration, and database operations belong in `server/services/`, `server/workflows/`, and `server/models/`.
