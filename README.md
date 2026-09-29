# AI Venture Studio

> Autonomous multi-agent venture creation engine that transforms raw startup ideas into structured, investor-ready business blueprints.

AI Venture Studio is a full-stack platform built for founders, venture builders, and startup accelerators. It orchestrates a specialized 11-agent pipeline to conduct research, formulate product strategies, architect systems, calculate unit economics, evaluate investment readiness, and generate pitch materials.

---

## Table of Contents

- [Product Overview](#product-overview)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [AI Agent Pipeline](#ai-agent-pipeline)
- [Human-in-the-Loop Workflow](#human-in-the-loop-workflow)
- [Startup Boardroom](#startup-boardroom)
- [Memory & RAG System](#memory--rag-system)
- [Analytics & Telemetry](#analytics--telemetry)
- [Startup Health Score](#startup-health-score)
- [Export Formats & Delivery](#export-formats--delivery)
- [Authentication & Security](#authentication--security)
- [Database Architecture](#database-architecture)
- [Environment Variables](#environment-variables)
- [Local Development Setup](#local-development-setup)
- [Database Setup & In-Memory Mode](#database-setup--in-memory-mode)
- [AI Provider Configuration](#ai-provider-configuration)
- [Quick Start Guide](#quick-start-guide)
- [Verification & Testing](#verification--testing)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)
- [Development Architecture Notes](#development-architecture-notes)
- [Roadmap & Enhancements](#roadmap--enhancements)
- [Contributing](#contributing)
- [License](#license)

---

## Product Overview

Building a venture requires synthesizing market dynamics, competitive positioning, user personas, technical architecture, and financial models. **AI Venture Studio** replaces fragmented prompt chains and disconnected tools with a stateful, multi-agent AI pipeline.

### Who It Is For
- **Founders & Entrepreneurs**: Rapidly validate, stress-test, and document venture concepts from initial ideation to pitch readiness.
- **Venture Studios & Accelerators**: Systematically screen, evaluate, and scaffold incoming cohort projects against a consistent rubric.
- **Angel Investors & Analysts**: Generate independent operational, financial, and competitive analyses on prospective opportunities.

### Core Workflow
1. **Intake**: The founder provides basic venture parameters (startup name, idea description, industry, target users, geography, target budget, and timeline).
2. **Autonomous Execution**: A 11-agent state graph pipeline runs sequentially, gathering web market signals and passing dependent context forward.
3. **Human Review & Refinement**: Founders can inspect outputs at each milestone, edit Markdown reports in place, regenerate stages with updated instructions, or approve deliverables to advance the workflow.
4. **Executive Boardroom Deliberation**: Founders summon an AI advisory board (CEO, CTO, CFO, CMO, VC) to debate strategic dilemmas, explore trade-offs, and synthesize actionable consensus.
5. **Knowledge Discovery (RAG)**: Venture documents are automatically chunked and indexed into a searchable knowledge base for cross-venture research and contextual retrieval.
6. **Multi-Format Export & Dispatch**: Complete venture blueprints can be downloaded as publication-grade PDF documents, clean Markdown source files, sanitized JSON payloads, or sent via email.

---

## Key Features

| Feature | Description | Status |
| :--- | :--- | :---: |
| **Venture Creation** | Guided project onboarding capturing name, core idea, industry, user personas, geography, budget, and timeline. | **Implemented** |
| **11-Agent Workflow** | Sequential state graph pipeline connecting Market Research to Pitch Deck generation via LangGraph. | **Implemented** |
| **Live Web Intelligence** | Automatic market signal enrichment using Tavily API with DuckDuckGo fallback. | **Implemented** |
| **Human-in-the-Loop** | Granular milestone gates enabling review, approval, in-place editing, and targeted regeneration. | **Implemented** |
| **Auto Mode** | Automated pipeline progression through all remaining uncompleted agents without pausing. | **Implemented** |
| **Executive Boardroom** | Multi-role C-Suite deliberation (CEO, CTO, CFO, CMO, VC) with consensus synthesis and history logs. | **Implemented** |
| **Memory & RAG Search** | Cross-venture search across project briefs and reports using native relevance scoring with optional ChromaDB vector storage. | **Implemented** |
| **Startup Health Score** | Dynamic 0–100 rating evaluated across Market Demand, Competition, Revenue Potential, Feasibility, and Execution Complexity. | **Implemented** |
| **Analytics Dashboard** | Workspace-wide and project-level telemetry tracking agent runtimes, token usage, completion rates, and score distributions. | **Implemented** |
| **PDF Export** | Multi-page A4 venture blueprint generated with cover page, scorecard, deliverable chapters, and boardroom logs via PDFKit. | **Implemented** |
| **Markdown Export** | Monolithic GitHub-flavored Markdown export including executive summaries and scorecards. | **Implemented** |
| **JSON Export** | Structured JSON output containing project state and deliverable content, sanitized of private system credentials. | **Implemented** |
| **Email Delivery** | Outbound SMTP delivery transmitting generated PDF and Markdown files directly to founders. | **Implemented** |
| **Dual Database Mode** | Production MongoDB persistence with transparent in-memory fallback for zero-dependency local execution. | **Implemented** |
| **Provider Abstraction** | Unified LLM interface supporting Google Gemini free tier with auto-retry and failover alongside local Ollama inference. | **Implemented** |

---

## System Architecture

```text
 ┌────────────────────────────────────────────────────────────────────────┐
 │                              BROWSER UI                                │
 │               React 18 + Vite + Tailwind CSS + Lucide                  │
 │          Zustand (State) + React Query (Cache) + Recharts              │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTP / REST
                                     ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                            EXPRESS BACKEND                             │
 │   ┌────────────────────────────────────────────────────────────────┐   │
 │   │                       Middleware Layer                         │   │
 │   │  • requireAuth (JWT verification & user hydration)             │   │
 │   │  • MemoryRateLimiter & inFlight Locks (Export / Email / AI)    │   │
 │   │  • Error Handler & Input Validation Sanitizers                 │   │
 │   └───────────────────────────────┬────────────────────────────────┘   │
 │                                   │                                    │
 │   ┌───────────────────────────────┴────────────────────────────────┐   │
 │   │                     REST API Controllers                       │   │
 │   │  /api/auth       /api/projects       /api/boardroom            │   │
 │   │  /api/memory     /api/analytics      /api/exports              │   │
 │   └───────────┬───────────────────────────┬────────────────────────┘   │
 └───────────────┼───────────────────────────┼────────────────────────────┘
                 │                           │
                 ▼                           ▼
 ┌───────────────────────────────┐   ┌────────────────────────────────────┐
 │       PERSISTENCE LAYER       │   │       AI ORCHESTRATION LAYER       │
 │                               │   │                                    │
 │  MongoDB / Mongoose           │   │  LangGraph StateGraph Pipeline     │
 │   • User Model                │   │   • 11 Sequential Agent Nodes      │
 │   • Project Model             │   │   • Context Dependency Mapper      │
 │   • Report Model              │   │   • Concurrency Guard (ActiveRuns) │
 │   • BoardroomSession Model    │   │                                    │
 │                               │   │  Unified Provider Adapter          │
 │  In-Memory Store Fallback     │   │   • Google Gemini (@google/genai)  │
 │  (zero-config dev mode)       │   │   • Local Ollama (HTTP fetch)      │
 └───────────────┬───────────────┘   └─────────────────┬──────────────────┘
                 │                                     │
                 ▼                                     ▼
 ┌───────────────────────────────┐   ┌────────────────────────────────────┐
 │       MEMORY & SEARCH         │   │       EXTERNAL INTEGRATIONS        │
 │                               │   │                                    │
 │  • ChromaDB Client (Optional) │   │  • Tavily Web Search API           │
 │  • Native Keyword Relevance   │   │  • DuckDuckGo Scraping Fallback    │
 │    Engine (Fallback)          │   │  • Outbound SMTP Email Engine      │
 │  • Markdown Section Chunker   │   │  • PDFKit Streaming Engine         │
 └───────────────────────────────┘   └────────────────────────────────────┘
```

---

## Technology Stack

### Frontend (`client/`)
- **Core Runtime**: [React 18](https://react.dev/) (`^18.3.1`) initialized with [Vite 6](https://vite.dev/) (`^6.0.7`)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (`^3.4.17`), `clsx`, `tailwind-merge`, and `tailwindcss-animate`
- **State Management**: [Zustand](https://github.com/pmndrs/zustand) (`^5.0.2`) with localStorage session persistence
- **Server Cache & Async Queries**: [React Query](https://tanstack.com/query/v3) (`^3.39.3`)
- **Data Visualization**: [Recharts](https://recharts.org/) (`^2.15.0`) for runtime, token, and radar scorecards
- **Icons & Motion**: [Lucide React](https://lucide.dev/) (`^0.468.0`) and [Framer Motion](https://www.framer.com/motion/) (`^11.15.0`)
- **Graph & Workflow Rendering**: [React Flow Renderer](https://reactflow.dev/) (`^10.3.17`)
- **HTTP Client**: [Axios](https://axios-http.com/) (`^1.7.9`) with automatic token injection and 401 handling

### Backend (`server/`)
- **Runtime**: [Node.js](https://nodejs.org/) using standard ECMAScript Modules (`"type": "module"`)
- **HTTP Server**: [Express.js](https://expressjs.com/) (`^4.21.2`)
- **Database & ODM**: [Mongoose](https://mongoosejs.com/) (`^8.9.2`) connecting to MongoDB, accompanied by a native in-memory development store fallback
- **Authentication**: [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) (`^9.0.2`) and [bcryptjs](https://github.com/dcodeIO/bcrypt.js) (`^2.4.3`)
- **Document Generation**: [PDFKit](https://pdfkit.org/) (`^0.15.1`) for vector PDF compilation
- **Email Delivery**: [Nodemailer](https://nodemailer.com/) (`^6.9.16`) with multi-part MIME attachment generation
- **Rate Limiting & Locking**: Custom lightweight in-memory sliding-window limiter with in-flight duplicate request locking

### AI & Agent Orchestration
- **Workflow Engine**: [@langchain/langgraph](https://github.com/langchain-ai/langgraphjs) (`^0.2.31`) utilizing `StateGraph` and `Annotation`
- **Google Gemini Provider**: Official [@google/genai](https://www.npmjs.com/package/@google/genai) SDK (`^2.24.0`)
  - Supported models: `gemini-3.7-flash` (default), `gemini-3.6-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`
  - Automated features: Thinking budget configuration, rate limit (429) backoff with jitter, transient error (503/502) failover across alternate flash models
- **Local Ollama Provider**: Native `fetch`-based adapter interfacing with local models (e.g., `llama3`)

### Search & RAG
- **Live Search**: [Tavily](https://tavily.com/) API client with automatic fallback to [duck-duck-scrape](https://github.com/Snazzah/duck-duck-scrape) (`^2.2.7`)
- **Semantic Storage**: Optional [ChromaDB](https://www.trychroma.com/) client (`chromadb` `^1.10.5`) with 1200ms non-blocking heartbeat checks
- **Relevance Fallback**: In-process scoring engine performing query tokenization, term frequency weighting, stop-word removal, and snippet extraction

---

## Project Structure

```text
ai-venture-studio/
├── client/                               # Frontend application
│   ├── src/
│   │   ├── components/
│   │   │   ├── dashboard/                # Dashboard components (HealthScore badge)
│   │   │   ├── reports/                  # ReportViewer (Markdown rendering & editing)
│   │   │   ├── ui/                       # Reusable primitives (Badge, Button, Card)
│   │   │   └── workflow/                 # Workflow graph and step-list visualizations
│   │   ├── pages/
│   │   │   ├── AnalyticsPage.jsx         # Telemetry charts (runtime, tokens, scores)
│   │   │   ├── AuthPage.jsx              # User registration and authentication views
│   │   │   ├── BoardroomPage.jsx         # Executive debate interface and transcript viewer
│   │   │   ├── DashboardPage.jsx         # Venture list and new project modal
│   │   │   ├── MemoryPage.jsx            # Cross-venture knowledge and RAG search
│   │   │   └── ProjectPage.jsx           # Main Studio workspace for running pipeline
│   │   ├── services/
│   │   │   └── api.js                    # Axios client covering all backend endpoints
│   │   ├── store/
│   │   │   ├── useAppStore.js            # Workspace UI state
│   │   │   └── useStudioStore.js         # Active project, auth session, view navigation
│   │   ├── utils/
│   │   │   └── cn.js                     # Tailwind class merging utility
│   │   ├── App.jsx                       # Main application router and shell
│   │   ├── index.css                     # Tailwind CSS directives
│   │   └── main.jsx                      # React 18 DOM mount point
│   ├── .env.example                      # Client environment configuration
│   ├── package.json                      # Frontend dependencies and Vite build scripts
│   └── vite.config.js                    # Vite configuration with backend proxy
│
├── server/                               # Express.js REST API
│   ├── agents/
│   │   └── agentDefinitions.js           # Metadata for the 11 pipeline agents
│   ├── config/
│   │   └── database.js                   # MongoDB connection logic and fallback trigger
│   ├── controllers/
│   │   ├── analyticsController.js        # Overview and project telemetry endpoints
│   │   ├── authController.js             # Register, login, and identity verification
│   │   ├── boardroomController.js        # Executive debate and session retrieval
│   │   ├── exportController.js           # PDF, Markdown, and JSON export handlers
│   │   ├── memoryController.js           # Semantic knowledge base search handler
│   │   └── projectController.js          # Venture lifecycle, runs, approvals, and email
│   ├── middleware/
│   │   ├── auth.js                       # JWT token authentication middleware
│   │   ├── errorHandler.js               # Centralized Express error handler
│   │   └── rateLimiter.js                # Memory rate limiter and concurrency locks
│   ├── models/
│   │   ├── BoardroomSession.js           # Mongoose schema for executive debates
│   │   ├── Project.js                    # Schema for venture metadata, runs, and scores
│   │   ├── Report.js                     # Schema for persisted deliverable reports
│   │   └── User.js                       # Schema for authenticated users
│   ├── prompts/
│   │   ├── agentPrompts.js               # Specialized prompts for all 11 agents
│   │   └── boardroomPrompts.js           # Role prompts for CEO, CTO, CFO, CMO, VC, Consensus
│   ├── routes/
│   │   ├── analyticsRoutes.js            # /api/analytics routes
│   │   ├── authRoutes.js                 # /api/auth routes
│   │   ├── boardroomRoutes.js            # /api/boardroom routes
│   │   ├── exportRoutes.js               # /api/exports routes
│   │   ├── memoryRoutes.js               # /api/memory routes
│   │   └── projectRoutes.js              # /api/projects routes
│   ├── services/
│   │   ├── providers/
│   │   │   ├── geminiProvider.js         # Google Gemini adapter with rate-limit retries
│   │   │   └── ollamaProvider.js         # Local Ollama adapter
│   │   ├── analyticsService.js           # Telemetry metrics calculator
│   │   ├── authService.js                # User authentication and token generator
│   │   ├── boardroomService.js           # Executive debate orchestrator
│   │   ├── emailService.js               # Outbound Nodemailer delivery engine
│   │   ├── exportService.js              # Markdown and JSON export formatters
│   │   ├── inMemoryStore.js              # Zero-dependency in-memory database fallback
│   │   ├── llmService.js                 # Unified LLM provider router
│   │   ├── memoryService.js              # Report chunking, RAG retrieval, ChromaDB bridge
│   │   ├── pdfService.js                 # PDFKit document generation engine
│   │   ├── projectService.js             # Project data access methods
│   │   ├── reportAggregator.js           # Report normalization and sanitization
│   │   ├── scoreService.js               # Startup Health Score calculation model
│   │   └── searchService.js              # Web signal ingestion (Tavily/DuckDuckGo)
│   ├── src/
│   │   └── index.js                      # Express application entry point
│   ├── utils/
│   │   ├── authToken.js                  # JWT signing utility
│   │   └── seed.js                       # Default demo account seeder
│   ├── workflows/
│   │   └── agentWorkflow.js              # LangGraph 11-node StateGraph pipeline
│   ├── .env.example                      # Server environment configuration template
│   └── package.json                      # Server dependencies and runner scripts
│
├── .env.example                          # Root environment template
├── .gitignore                            # Git exclusion rules
├── AGENTS.md                             # Architectural guidelines and coding rules
├── package.json                          # Root runner configuration (concurrently)
└── README.md                             # Authoritative project documentation
```

---

## AI Agent Pipeline

The core engine implements 11 specialized autonomous agents organized in a directed state graph. Each agent has dedicated responsibilities, produces a distinct Markdown deliverable, and receives filtered context from upstream dependencies.

```text
 ┌───────────────┐     ┌───────────────┐     ┌───────────────┐
 │    Market     │ ──► │  Competitor   │ ──► │  Opportunity  │
 │   Research    │     │   Analysis    │     │   Discovery   │
 └───────────────┘     └───────────────┘     └───────┬───────┘
                                                     │
 ┌───────────────┐     ┌───────────────┐             │
 │   Technical   │ ◄── │      PRD      │ ◄─── ┌──────┴───────┐
 │ Architecture  │     │  Engineering  │      │    Product    │
 └───────┬───────┘     └───────────────┘      │   Strategy    │
         │                                    └───────────────┘
         ▼
 ┌───────────────┐     ┌───────────────┐     ┌───────────────┐
 │    Revenue    │ ──► │   Financial   │ ──► │ Go-To-Market  │
 │     Model     │     │   Forecast    │     │   Strategy    │
 └───────────────┘     └───────────────┘     └───────┬───────┘
                                                     │
                       ┌───────────────┐             │
                       │  Pitch Deck   │ ◄─── ┌──────┴───────┐
                       │   Generator   │      │   Investor    │
                       └───────────────┘      │   Readiness   │
                                              └───────────────┘
```

### Agent Specifications

| # | Agent Name | Key | Output Deliverable | Primary Responsibilities | Dependent Context Inputs |
| :-: | :--- | :--- | :--- | :--- | :--- |
| **1** | **Market Research Agent** | `market` | `market_report.md` | TAM, SAM, SOM sizing, market dynamics, industry CAGR, and trends | Web search signals |
| **2** | **Competitor Analysis Agent** | `competitor` | `competitor_report.md` | Direct/indirect competitor identification, feature matrices, SWOT, pricing moats | `market`, Web signals |
| **3** | **Opportunity Discovery Agent** | `opportunity` | `opportunity_report.md` | Underserved niches, unmet customer jobs-to-be-done, differentiation angles | `market`, `competitor`, Web signals |
| **4** | **Product Strategy Agent** | `product` | `product_strategy.md` | User personas, core user stories, MVP scope definition, feature prioritization | `market`, `opportunity` |
| **5** | **PRD Agent** | `prd` | `prd.md` | Comprehensive Product Requirements Document, user flows, acceptance criteria | `product`, `opportunity` |
| **6** | **Technical Architect Agent** | `architecture` | `architecture.md` | System design, folder layouts, database schemas, REST contracts, infrastructure | `prd`, `product` |
| **7** | **Revenue Model Agent** | `revenue` | `revenue_model.md` | Monetization mechanics, tier packaging, unit economics, pricing strategies | `product`, `market` |
| **8** | **Financial Forecast Agent** | `financial` | `financials.md` | 3-year P&L forecast, OpEx/CapEx breakdowns, burn rate, break-even timeline | `revenue`, `architecture` |
| **9** | **GTM Agent** | `gtm` | `gtm.md` | Launch sequencing, customer acquisition channels, viral loops, CAC projections | `product`, `market`, `competitor`, Web signals |
| **10** | **Investor Agent** | `investor` | `investor_report.md` | Investment readiness audit, venture risks, defensibility, overall score derivation | `market`, `opportunity`, `revenue`, `financial` |
| **11** | **Pitch Deck Agent** | `pitch` | `pitch_deck.md` | 10–15 slide investor presentation deck formatted in structured Markdown slides | `opportunity`, `product`, `revenue`, `financial`, `investor` |

### Context Window Optimization
Rather than feeding an ever-growing monolithic log of every prior output into the prompt (which causes token bloat and context dilution), the LangGraph node selectively filters the prior report state using an explicit dependency matrix. For example, the **Technical Architect Agent** strictly receives the `prd` and `product` reports, ensuring high generation speed and adherence to free-tier model token limits.

---

## Human-in-the-Loop Workflow

AI Venture Studio enforces strict quality controls through milestone gates:

1. **Sequential Manual Execution**:
   - Clicking **"Run Next Agent"** invokes the LangGraph pipeline for the immediate next uncompleted stage.
   - Upon completion, execution halts at an `END` conditional edge, allowing the founder to inspect the output.
2. **Review & Approval Gate**:
   - The downstream agent cannot execute until the preceding agent deliverable is marked `approved: true`.
   - Founders review the generated content and click **"Approve Report"** (`POST /api/projects/:id/agents/:agentKey/approve`) to unlock the next milestone.
3. **In-Place Deliverable Editing**:
   - Founders can toggle an inline editor directly inside the Studio view (`PUT /api/projects/:id/agents/:agentKey/report`).
   - Edited text immediately saves to the database and syncs to the memory/RAG index for downstream retrieval.
4. **Targeted Regeneration**:
   - If an agent's output does not meet expectations, the founder can click **"Regenerate"** (`POST /api/projects/:id/agents/:agentKey/regenerate`).
   - The engine clears the specific report, resets its status to `pending`, and re-invokes only that targeted node using the latest dependency context.
5. **Auto Mode**:
   - For rapid drafting, toggling **"Auto Mode"** passes `{ autoMode: true }` to the execution endpoint.
   - The workflow bypasses pause points, automatically marking each stage approved upon completion and advancing sequentially through all remaining agents until the pitch deck is finished.

---

## Startup Boardroom

The **Startup Boardroom** (`/api/projects/:id/boardroom`) provides an interactive executive council where founders submit strategic dilemmas, product pivots, or pricing questions for structured debate.

```text
               ┌───────────────────────────────┐
               │    Founder Submits Question   │
               └───────────────┬───────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            │ Inject Approved Reports + RAG Memory │
            └──────────────────┬──────────────────┘
                               │
      ┌─────────────┬──────────┼──────────┬─────────────┐
      ▼             ▼          ▼          ▼             ▼
 ┌─────────┐   ┌─────────┐┌─────────┐┌─────────┐   ┌─────────┐
 │   CEO   │   │   CTO   ││   CFO   ││   CMO   │   │   VC    │
 │Strategy │   │  Tech   ││Finance  ││ Growth  │   │Investor │
 └────┬────┘   └────┬────┘└────┬────┘└────┬────┘   └────┬────┘
      └─────────────┴──────────┼──────────┴─────────────┘
                               │
                               ▼
               ┌───────────────────────────────┐
               │ Synthesize Boardroom Consensus│
               └───────────────┬───────────────┘
                               │
                               ▼
               ┌───────────────────────────────┐
               │ Persist Session & Transcripts │
               └───────────────────────────────┘
```

### Executive Personas
1. **Chief Executive Officer (CEO)**: Focuses on strategic vision, team execution, operational velocity, and corporate positioning.
2. **Chief Technology Officer (CTO)**: Evaluates architecture feasibility, scalability bottlenecks, security, build-vs-buy decisions, and technical debt.
3. **Chief Financial Officer (CFO)**: Assesses cash flow runway, gross margins, capital efficiency, monetization models, and unit economics.
4. **Chief Marketing Officer (CMO)**: Analyzes CAC/LTV dynamics, go-to-market channels, messaging clarity, and brand differentiation.
5. **Lead Venture Capitalist (VC)**: Challenges the addressable market size, defensibility moats, risk profile, and future fundraising potential.

### Deliberation & Consensus
- When a debate is initiated, the engine retrieves all currently approved project reports along with relevant historical venture memories via RAG.
- The 5 executives are consulted sequentially with specialized prompts.
- A final **Consensus Synthesis** prompt digests all 5 perspectives and produces a concrete, multi-point executive recommendation.
- Sessions are stored in the database (`BoardroomSession` model), recording message transcripts, timestamps, total tokens, and runtime.

---

## Memory & RAG System

The Memory & Retrieval-Augmented Generation (RAG) module (`/api/memory/search`) allows founders to perform semantic searches across their historical portfolio of ventures, concepts, and generated reports.

### What Gets Stored
- **Project Briefs**: Venture concept, industry, target users, geography, budget, and timeline.
- **Deliverable Reports**: Full Markdown text from all completed agent runs across all ventures.

### Semantic Chunking
Deliverables are split into logical segments using `chunkReport`:
- Chunks are demarcated by Markdown headers (`#`, `##`, `###`).
- Oversized sections are subdivided into paragraph buffers (up to 1,200 characters) preserving headings as semantic labels.

### Dual-Engine Search Strategy
The platform automatically detects vector database availability:

1. **ChromaDB Vector Search (When Available)**:
   - Evaluates ChromaDB health at `CHROMA_URL` using a fast 1,200ms non-blocking heartbeat.
   - If connected, documents are embedded into the `venture_reports` collection and queried using vector cosine similarity.
2. **Native Relevance Engine (Automated Fallback)**:
   - When ChromaDB is offline, the system transparently activates a high-performance in-process scoring engine.
   - **Tokenization**: Filters punctuation and strips common English stop words.
   - **Exact Match Bonus**: Adds weighted scores for exact multi-word phrase matches in titles, company names, or text.
   - **Metadata Matching**: Rewards term overlaps found in startup names, industries, target audiences, and section headings.
   - **Term Frequency & Coverage**: Applies logarithmic frequency weighting and grants bonuses when all query keywords appear.
   - **Snippet Extraction**: Extracts contextual text snippets centered around the most relevant match.
   - **Normalized Score**: Returns confidence scores bounded between `0.15` and `0.99`.

### Multi-Tenancy & Project Isolation
All queries strictly enforce user ownership (`user: req.user.id`). Results never leak across founder accounts.

---

## Analytics & Telemetry

The platform records execution telemetry across both the multi-agent pipeline and the executive boardroom. Data is exposed via `/api/analytics/overview` and visual charts on the frontend.

### Metrics Tracked
- **Venture Breakdown**: Total projects, status distribution (draft, running, completed, failed).
- **Workflow Health**: Aggregate agent runs, completed vs. pending vs. failed counts, and completion percentage.
- **Execution Telemetry**:
  - Total cumulative runtime (milliseconds and seconds).
  - Average runtime per agent execution.
  - Granular token tracking: Pipeline agent tokens, Boardroom debate tokens, and overall total tokens.
- **Deliverable Audit**: Total generated reports, approved reports, and deliverables awaiting review.
- **Per-Agent Breakdown**: Detailed table for all 11 agents showing total runs, completed count, average runtime, and token consumption.
- **Venture Health Averages**: Average overall score and dimension averages across all user ventures.

### Visualizations (`client/src/pages/AnalyticsPage.jsx`)
- **Runtime & Token Bar Charts**: Visual breakdown of duration and cost across the 11 agents rendered with Recharts.
- **Scorecard Radar Chart**: Polar chart illustrating average ratings across Market Demand, Competition, Revenue Potential, Feasibility, and Complexity.
- **Status Cards**: Responsive KPI cards displaying active metrics, approval rates, and most-utilized agents.

---

## Startup Health Score

The **Startup Health Score** is a dynamic 0–100 index that measures venture maturity and investment readiness. It updates automatically after each completed agent run (`scoreService.js`).

### Evaluation Dimensions

| Dimension | Range | Measurement Focus |
| :--- | :---: | :--- |
| **Market Demand** | `0–100` | Addressable market scale, customer pain point severity, and tailwinds |
| **Competition Index** | `0–100` | Differentiation, moat defensibility, and competitive density |
| **Revenue Potential** | `0–100` | Monetization viability, margin structure, and pricing power |
| **Technical Feasibility** | `0–100` | Architecture practicality, development risk, and complexity |
| **Execution Complexity** | `0–100` | Time-to-market, capital requirements, and operational hurdles |
| **Overall Score** | `0–100` | Composite venture readiness rating |

### Calculation Logic
- **Baseline Progress Multiplier**: While earlier agents run, dimension scores scale dynamically based on the ratio of completed agents out of 11.
- **Investor Agent Calibration**: When the **Investor Agent** completes, the engine scans `investor_report.md` for an explicitly derived score (using the regex pattern `overall(?:\s+score)?[:\s]+(\d{1,3})`).
- **Composite Average**: If no explicit investor rating is detected, the overall score is computed as the unweighted arithmetic mean of the 5 dimensions.

---

## Export Formats & Delivery

Completed venture blueprints can be exported via `/api/projects/:id/export/:format` or delivered by email.

### 1. Publication-Grade PDF (`.pdf`)
Generated using **PDFKit** (`pdfService.js`) with vector typography:
- **A4 Geometry**: Formatted margins (54pt), headers, and footers with dynamic page numbering (`Page X of Y`).
- **Cover Page**: Full-bleed styling with venture title, category metadata, and generation timestamp.
- **Executive Summary**: Structured highlights of proposition, market, and readiness status.
- **Venture Scorecard**: Visual breakdown table evaluating all 5 health score dimensions.
- **Complete Deliverable Chapters**: Full text of all completed agent reports with Markdown syntax parsed and cleaned.
- **Boardroom Transcript**: Complete executive council debate transcripts and consensus summary.

### 2. Full Markdown Blueprint (`.md`)
Produces a monolithic Markdown document (`exportService.js`) suitable for documentation wikis, GitHub repos, or Notion imports. Includes tables, bulleted profiles, and collapsible deliberation logs.

### 3. Sanitized JSON Schema (`.json`)
Constructs an object containing:
- Project profile metadata.
- Clean key-value dictionary of deliverables, statuses, and runtimes.
- Startup scorecards.
- Complete boardroom debate sessions.
- **Credential Stripping**: Explicitly sanitizes all sensitive tokens, user passwords, and internal database connection artifacts.

### 4. Outbound Email Delivery
- Triggered via `POST /api/projects/:id/email` with recipient validation.
- Compiles both the PDF and Markdown files and attaches them to an outbound MIME email using **Nodemailer**.
- Sends a clean, responsive HTML summary email containing the readiness score and deliverable index.
- If SMTP credentials are not configured, gracefully returns an HTTP 503 response detailing missing environment variables.

---

## Authentication & Security

AI Venture Studio implements a defense-in-depth security model:

- **JWT Authentication**: Stateless authentication utilizing `jsonwebtoken`. Tokens carry the user ID and email with a 7-day validity period.
- **Password Security**: Passwords hashed using `bcryptjs` with 10 salt rounds prior to persistence.
- **Ownership Verification**: All project, deliverable, boardroom, and telemetry endpoints strictly verify that the target resource belongs to `req.user.id`. Access across user boundaries returns HTTP 404 or 401.
- **In-Memory Rate Limiting**:
  - `exportRateLimiter`: Enforces a maximum of 30 export requests per minute per user.
  - `emailRateLimiter`: Limits outbound email dispatches to 6 requests per minute per user.
  - `aiRunRateLimiter`: Restricts AI workflow invocations to 15 triggers per minute per user.
- **In-Flight Concurrency Locks**: Prevents duplicate executions by tracking active requests in-flight. If an export or email is currently generating, concurrent attempts return HTTP 429.
- **Pipeline Concurrency Guard**: An in-memory set (`activeRuns`) prevents simultaneous workflow executions on the same venture, returning HTTP 409 if a duplicate run is attempted.
- **Default Seeded Account**: Automatically provisions a demo user account for testing:
  - **Email**: `founder@example.com`
  - **Password**: `password123`

---

## Database Architecture

The backend supports two database backends: **MongoDB** (production) and a **native in-memory store** (development fallback).

### Mongoose Models (`server/models/`)

#### 1. `User` (`users` collection)
Stores registered founder accounts.
```javascript
{
  name: { type: String, default: "Founder" },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  timestamps: true
}
```

#### 2. `Project` (`projects` collection)
The core venture document holding parameters, agent runs, and scores.
```javascript
{
  user: { type: ObjectId, ref: "User", required: true, index: true },
  startupName: { type: String, required: true, trim: true },
  idea: { type: String, required: true, trim: true },
  industry: { type: String, required: true, trim: true },
  targetUsers: { type: String, required: true, trim: true },
  country: { type: String, default: "United States", trim: true },
  budget: { type: String, default: "", trim: true },
  timeline: { type: String, default: "", trim: true },
  status: { type: String, enum: ["draft", "running", "completed", "failed"], default: "draft" },
  agentRuns: [
    {
      key: String,
      name: String,
      outputFile: String,
      status: { type: String, enum: ["pending", "running", "completed", "failed"], default: "pending" },
      report: String,
      approved: Boolean,
      runtimeMs: Number,
      tokenUsage: Number,
      error: String
    }
  ],
  startupScore: {
    marketDemand: Number,
    competition: Number,
    revenuePotential: Number,
    technicalFeasibility: Number,
    executionComplexity: Number,
    overall: Number
  },
  timestamps: true
}
```

#### 3. `Report` (`reports` collection)
Stores deliverable reports with indexes for semantic search and fast lookups.
```javascript
{
  user: { type: ObjectId, ref: "User", required: true, index: true },
  project: { type: ObjectId, ref: "Project", required: true, index: true },
  agentKey: { type: String, required: true, index: true },
  outputFile: { type: String, required: true },
  content: { type: String, required: true },
  embeddingRef: { type: String, default: null },
  timestamps: true
}
// Compound unique index: { project: 1, agentKey: 1 }
```

#### 4. `BoardroomSession` (`boardroomsessions` collection)
Stores executive council deliberation transcripts and consensus.
```javascript
{
  user: { type: ObjectId, ref: "User", required: true, index: true },
  project: { type: ObjectId, ref: "Project", required: true, index: true },
  title: { type: String, default: "Executive Board Session" },
  question: { type: String, required: true },
  messages: [
    {
      role: { type: String, enum: ["Founder", "CEO", "CTO", "CFO", "CMO", "VC", "Consensus"] },
      content: String,
      timestamp: { type: Date, default: Date.now }
    }
  ],
  consensus: { type: String, default: "" },
  tokenUsage: { type: Number, default: 0 },
  runtimeMs: { type: Number, default: 0 },
  timestamps: true
}
```

---

## Environment Variables

Configure environment variables in `server/.env`. A template is provided in `.env.example`.

| Variable | Required | Default | Description |
| :--- | :---: | :---: | :--- |
| `PORT` | No | `5000` | Port for the Express backend server |
| `MONGODB_URI` | No | `mongodb://127.0.0.1:27017/ai-venture-studio` | MongoDB connection string |
| `JWT_SECRET` | **Yes** | `replace-me` | Secret key used for signing and verifying JWT tokens |
| `AI_PROVIDER` | No | `gemini` | Primary AI provider (`gemini` or `ollama`) |
| `GEMINI_API_KEY` | If using Gemini | _None_ | Google Gemini API key (obtain from Google AI Studio) |
| `GEMINI_MODEL` | No | `gemini-3.7-flash` | Gemini model identifier (e.g. `gemini-3.7-flash`, `gemini-3.6-flash`) |
| `GEMINI_MAX_OUTPUT_TOKENS`| No | `3500` | Maximum token limit per generation request |
| `GEMINI_THINKING_BUDGET` | No | _Auto_ | Thinking budget for Gemini models that support reasoning |
| `OLLAMA_BASE_URL` | If using Ollama | `http://localhost:11434`| HTTP endpoint of local Ollama server |
| `OLLAMA_MODEL` | If using Ollama | `llama3` | Model tag installed inside local Ollama instance |
| `TAVILY_API_KEY` | No | _None_ | Tavily API key for web search signals (falls back to DuckDuckGo if blank) |
| `CHROMA_URL` | No | `http://127.0.0.1:8000`| URL of ChromaDB vector database (falls back to native relevance if offline) |
| `SMTP_HOST` | If sending email| _None_ | Outbound SMTP server hostname (e.g., `smtp.gmail.com` or `smtp.sendgrid.net`)|
| `SMTP_PORT` | No | `587` | SMTP server port (`587` for STARTTLS, `465` for SSL/TLS) |
| `SMTP_USER` | If SMTP requires auth | _None_ | SMTP authentication username |
| `SMTP_PASS` | If SMTP requires auth | _None_ | SMTP authentication password |
| `SMTP_FROM` | No | `"AI Venture Studio" <reports@localhost>` | Outbound sender name and email address |
| `CORS_ORIGIN` | No | `*` (All) | Allowed CORS origins (comma-separated list for production) |

For the client, `client/.env.example` provides:
| Variable | Required | Default | Description |
| :--- | :---: | :---: | :--- |
| `VITE_API_URL` | No | `/api` | Base path or URL for backend API requests |

---

## Local Development Setup

Follow these Windows-friendly instructions to clone, configure, and launch the repository.

### Prerequisites
- **Node.js**: v18.0.0 or later (LTS recommended)
- **npm**: v9.0.0 or later
- **MongoDB**: Optional. If not running, the application starts in in-memory mode automatically.
- **Google Gemini API Key**: Free tier key from [Google AI Studio](https://aistudio.google.com/).

### Installation Steps

1. **Clone the Repository**:
   ```powershell
   git clone https://github.com/Pradnyan-Khandakale/AI-Venture-Studio.git
   cd AI-Venture-Studio
   ```

2. **Install All Dependencies**:
   Install root, client, and server dependencies in a single command:
   ```powershell
   npm run install:all
   ```
   *Or install individually:*
   ```powershell
   npm install
   npm install --prefix client
   npm install --prefix server
   ```

3. **Configure Environment**:
   Copy the example environment file to `server/.env`:
   ```powershell
   copy .env.example server\.env
   ```
   Open `server\.env` in your editor and enter your Gemini API key:
   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key
   JWT_SECRET=your_custom_development_secret
   ```

4. **Launch the Application**:
   Start both the backend API (port 5000) and the frontend client (port 5173) concurrently:
   ```powershell
   npm run dev
   ```

5. **Access the Application**:
   Open your browser to:
   ```text
   http://localhost:5173
   ```

---

## Database Setup & In-Memory Mode

### Running with Local MongoDB
1. Ensure the MongoDB service is running:
   ```powershell
   net start MongoDB
   # Or using mongod directly:
   mongod --dbpath C:\data\db
   ```
2. Set the connection URI in `server/.env`:
   ```env
   MONGODB_URI=mongodb://127.0.0.1:27017/ai-venture-studio
   ```
3. When the backend starts, it displays:
   ```text
   [Database] Connected to MongoDB successfully. Mode: mongodb
   Demo user founder@example.com seeded successfully in MongoDB
   ```

### Zero-Dependency In-Memory Fallback
If MongoDB is not installed or unreachable, **AI Venture Studio handles this gracefully without crashing**:
- The connection attempt uses a fast 2,000ms timeout (`serverSelectionTimeoutMS: 2000`).
- If connection fails, the system switches to in-memory mode:
  ```text
  [Database] MongoDB connection failed. Activating in-memory development mode fallback.
  [Database] Mode: in-memory fallback (development mode)
  ```
- All users, projects, reports, and boardroom sessions are managed in-memory with the demo account (`founder@example.com`) seeded automatically.

---

## AI Provider Configuration

### 1. Google Gemini (Default & Recommended)
Gemini is the standard provider for the multi-agent pipeline.
```env
AI_PROVIDER=gemini
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-3.7-flash
```
**Resilience & Quota Handling**:
- If a free-tier rate limit (HTTP 429) occurs, the adapter executes bounded exponential backoff with jitter.
- If repeated rate limits or transient errors (503) persist, the adapter fails over across compatible flash models: `gemini-3.7-flash` -> `gemini-3.6-flash` -> `gemini-3.5-flash-lite` -> `gemini-flash-latest`.

### 2. Local Ollama (Offline Inference)
To run completely locally without cloud API calls:
1. Install [Ollama](https://ollama.ai/) and pull a model:
   ```powershell
   ollama pull llama3
   ```
2. Update `server/.env`:
   ```env
   AI_PROVIDER=ollama
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=llama3
   ```
3. The server connects directly via HTTP POST to `/api/generate`.

---

## Quick Start Guide

1. **Sign In**:
   - Navigate to `http://localhost:5173`.
   - Log in with the pre-seeded account:
     - **Email**: `founder@example.com`
     - **Password**: `password123`
   - *Or click "Create Account" to register a new user.*
2. **Create a Venture**:
   - In the Ventures Dashboard, click **"New Venture"**.
   - Fill in your startup concept:
     - **Name**: e.g., `FinFlow`
     - **Idea**: e.g., `AI-powered automated financial modeling for early-stage SaaS`
     - **Industry**: `FinTech / B2B SaaS`
     - **Target Users**: `Pre-seed founders and CFOs`
     - **Country / Budget / Timeline**: Optional defaults.
   - Click **"Initialize Venture"**.
3. **Run the AI Pipeline**:
   - In the Studio view, click **"Run Next Agent"** to execute the Market Research Agent.
   - Inspect the generated `market_report.md` deliverable and review live web signals.
   - Click **"Approve"** to unlock the Competitor Analysis stage.
   - Alternatively, toggle **"Auto Mode"** to execute all 11 stages end-to-end.
4. **Consult the Boardroom**:
   - Click **"Boardroom"** in the top navigation.
   - Enter a strategic dilemma: *"Should we pursue a self-serve freemium model or an enterprise sales motion?"*
   - Watch the CEO, CTO, CFO, CMO, and VC debate and produce a consolidated consensus.
5. **Search Venture Memory**:
   - Click **"Memory & RAG"** in the navigation.
   - Search across historical deliverables by keyword or phrase.
6. **Export Your Blueprint**:
   - In the Studio view, open the **Export** menu.
   - Download the full blueprint as a publication-ready **PDF**, raw **Markdown**, or structured **JSON**.
   - Enter an email address to dispatch the package via SMTP.

---

## Verification & Testing

The repository provides several mechanisms to verify system health and correctness:

### 1. Frontend Production Build Check
Verify that all React components, Tailwind styles, and asset bundles compile without syntax or bundling errors:
```powershell
npm run build
# Or directly:
npm run build --prefix client
```
Expected output:
```text
✓ built in ~25s
dist/index.html
dist/assets/index-*.css
dist/assets/index-*.js
```

### 2. Backend Health Endpoint Verification
Verify backend startup, active database mode, and AI provider selection:
```powershell
curl http://localhost:5000/api/health
```
Expected JSON response:
```json
{
  "ok": true,
  "service": "ai-venture-studio",
  "database": "mongodb",
  "aiProvider": "gemini"
}
```
*(If running without MongoDB, `"database"` reports `"memory"`).*

### 3. Verification Commands Summary

| Action | Command | Purpose |
| :--- | :--- | :--- |
| **All-in-one Dev** | `npm run dev` | Runs backend (5000) and frontend (5173) concurrently |
| **Server Only** | `npm run dev:server` | Runs Express with Node file-watching (`node --watch`) |
| **Client Only** | `npm run dev:client` | Runs Vite development server on `http://localhost:5173` |
| **Client Build** | `npm run build` | Compiles production assets into `client/dist` |
| **Server Start** | `npm run start` | Launches production server directly via `node src/index.js` |
| **Install All** | `npm run install:all`| Synchronously installs root, client, and server dependencies |

> **Note on Unit Tests**: Automated unit test suites (e.g. Jest, Vitest, Mocha) are not currently configured in `package.json`. Verification is performed via the production build command, health probe, and interactive integration flows.

---

## API Reference

All application endpoints (except `/api/health` and `/api/auth/register`, `/api/auth/login`) require a valid Bearer token in the HTTP Authorization header:
```text
Authorization: Bearer <jwt_token>
```

### Health & Root
| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/` | No | Service identity check (`{ ok: true, service: "ai-venture-studio" }`) |
| `GET` | `/api/health` | No | System health check (database mode and AI provider status) |

### Authentication (`/api/auth`)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/auth/register` | No | Creates a new user account (`name`, `email`, `password`) |
| `POST` | `/api/auth/login` | No | Authenticates founder credentials and returns a 7-day JWT token |
| `GET` | `/api/auth/me` | **Yes**| Returns current authenticated user profile (`id`, `name`, `email`) |

### Projects (`/api/projects`)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/projects` | **Yes**| Lists all ventures owned by the authenticated user |
| `POST` | `/api/projects` | **Yes**| Creates a new venture (`startupName`, `idea`, `industry`, `targetUsers`) |
| `GET` | `/api/projects/:id` | **Yes**| Retrieves details, agent run statuses, and scorecards for a venture |
| `POST` | `/api/projects/:id/run` | **Yes**| Triggers pipeline execution (`autoMode: false` for next agent; `true` for auto) |
| `POST` | `/api/projects/:id/agents/:agentKey/approve` | **Yes**| Marks a completed agent deliverable as approved |
| `POST` | `/api/projects/:id/agents/:agentKey/regenerate` | **Yes**| Resets and regenerates a specific agent deliverable |
| `GET` | `/api/projects/:id/agents/:agentKey/report` | **Yes**| Retrieves the Markdown report text for a specific agent |
| `PUT` | `/api/projects/:id/agents/:agentKey/report` | **Yes**| Updates report content in place and re-indexes memory |

### Executive Boardroom (`/api/projects/:id/boardroom` & `/api/boardroom`)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/projects/:id/boardroom` | **Yes**| Submits a strategic question and runs the 5-role executive debate |
| `GET` | `/api/projects/:id/boardroom` | **Yes**| Lists past boardroom debate sessions for a venture |
| `GET` | `/api/projects/:id/boardroom/:sessionId` | **Yes**| Retrieves full message transcript and consensus for a debate |
| `POST` | `/api/boardroom/debate` | **Yes**| Alternate route for initiating a boardroom debate |
| `GET` | `/api/boardroom` | **Yes**| Lists boardroom sessions across ventures |
| `GET` | `/api/boardroom/:id` | **Yes**| Retrieves an individual boardroom session |

### Memory & Knowledge Base (`/api/memory`)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/memory/search?q=...` | **Yes**| Searches historical briefs and reports using relevance scoring |
| `POST` | `/api/memory/search` | **Yes**| POST search alternative supporting query parameters in body |

### Telemetry & Analytics (`/api/analytics`)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/analytics/overview` | **Yes**| Returns workspace-wide runtimes, token usage, scores, and agent counts |
| `GET` | `/api/analytics/projects/:projectId` | **Yes**| Returns project-specific runtime and scoring analytics |
| `GET` | `/api/projects/:id/analytics` | **Yes**| Alternate route for project-specific analytics |

### Exports & Delivery (`/api/exports` & `/api/projects/:id/export`)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/projects/:id/export/pdf` | **Yes**| Generates and streams an investor-ready A4 PDF document |
| `GET` | `/api/projects/:id/export/markdown`| **Yes**| Generates and downloads a clean Markdown blueprint file |
| `GET` | `/api/projects/:id/export/json` | **Yes**| Downloads sanitized JSON containing all reports and scores |
| `GET` | `/api/exports/:id/:format` | **Yes**| Direct export endpoint supporting `pdf`, `md`, `json` |
| `POST` | `/api/projects/:id/email` | **Yes**| Sends PDF and Markdown attachments to recipient via SMTP |

---

## Troubleshooting

### 1. MongoDB Connection Refused (`ECONNREFUSED 127.0.0.1:27017`)
- **Behavior**: The server logs a connection warning and immediately falls back to in-memory mode.
- **Resolution**:
  - If you intended to use in-memory mode, no action is needed. The app works normally.
  - To use MongoDB, start the service (`net start MongoDB` on Windows or `brew services start mongodb-community` on macOS) and verify that `MONGODB_URI` points to the correct host and port.

### 2. Gemini API 429 Quota Exceeded (`RESOURCE_EXHAUSTED`)
- **Behavior**: Free-tier rate limits or burst quotas have been reached.
- **Resolution**:
  - The provider adapter automatically backs off and retries up to 3 times, switching across compatible flash models (`gemini-3.7-flash`, `gemini-3.6-flash`, `gemini-3.5-flash-lite`).
  - If all retries are exhausted, wait 60 seconds before triggering the next agent.
  - Optional: Set `GEMINI_MAX_OUTPUT_TOKENS=2500` in `server/.env` to reduce token consumption per call.

### 3. Gemini Authentication Failure (`GEMINI_KEY_MISSING` / `401 Unauthorized`)
- **Behavior**: The server returns an immediate 401 error: `"Gemini API key is not configured"`.
- **Resolution**: Ensure `GEMINI_API_KEY` is defined in `server/.env` without leading or trailing quotes.

### 4. Ollama Connection Error (`ECONNREFUSED 127.0.0.1:11434`)
- **Behavior**: When `AI_PROVIDER=ollama`, requests fail with connection refused.
- **Resolution**:
  - Confirm Ollama is running (`ollama serve`).
  - Verify that the target model is downloaded (`ollama list`).
  - Check that `OLLAMA_BASE_URL` in `server/.env` matches the running port (default `http://localhost:11434`).

### 5. Email Delivery Disabled (`503 Service Unavailable`)
- **Behavior**: Triggering email returns: `"Email delivery is not configured. Configure SMTP_HOST..."`.
- **Resolution**:
  - Open `server/.env` and provide your SMTP provider credentials (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`).
  - For Gmail, use an [App Password](https://support.google.com/accounts/answer/185833) with port 587.

### 6. Port 5000 Already in Use (`EADDRINUSE`)
- **Behavior**: Server crashes during startup because port 5000 is occupied.
- **Resolution**:
  - On Windows, identify and terminate the process:
    ```powershell
    netstat -ano -p tcp | findstr :5000
    taskkill /F /PID <PID>
    ```
  - *Note: `client/vite.config.js` includes an automated port cleanup hook (`freePort5000`) when running via Vite.*

### 7. Frontend Cannot Reach Backend (Proxy 500 / Network Error)
- **Behavior**: API requests in the browser fail or return 502/504 errors.
- **Resolution**: Ensure the Express backend is running on `http://localhost:5000`. The Vite development server automatically proxies requests matching `/api` to port 5000.

---

## Development Architecture Notes

1. **Strict Repository Separation**:
   - All frontend source code resides exclusively in `client/src`.
   - All backend source code resides exclusively in `server/`.
   - Cross-imports between client and server are prohibited.
2. **ES Modules Exclusivity**:
   - Both client and server run native ES Modules (`"type": "module"`). CommonJS `require()` is not used.
3. **Thin Controllers, Rich Services**:
   - Controllers in `server/controllers/` strictly parse HTTP parameters, handle validation, and dispatch responses.
   - Business calculations, scoring rubrics, and orchestration live in `services/`, `workflows/`, and `models/`.
4. **LangGraph Pipeline Architecture**:
   - The 11-agent pipeline uses a compiled LangGraph `StateGraph`.
   - Nodes represent individual agents, while conditional edges enforce human approval gates and stop execution when manual review is required.
5. **Fail-Safe Persistence (Dual Database)**:
   - All queries and mutations check `isMemoryMode()`. If MongoDB is unavailable, operations automatically route to `inMemoryStore.js`, ensuring the platform remains fully functional in local development without external dependencies.
6. **Graceful Service Degradation**:
   - Search: Tavily -> DuckDuckGo -> Empty signal pass-through.
   - RAG: ChromaDB -> Native tokenized relevance scoring.
   - AI: Primary Gemini model -> Model failover list -> Clean structured error.

---

## Roadmap & Enhancements

All primary product features specified for the multi-agent studio, boardroom, memory, telemetry, and export engines are implemented in the current repository. Potential future architectural enhancements include:

- **Server-Sent Events (SSE) / WebSockets**: Real-time token streaming for agent generation and boardroom deliberations.
- **Cloud Object Storage (S3 / GCS)**: Permanent cloud archival for generated PDF blueprints and pitch deck slide assets.
- **Multi-Tenant Organizations**: Workspace sharing, team permissions, and collaborative review comments on deliverables.
- **Automated Test Suite**: Formal integration test suite covering Express controllers and LangGraph state transitions.

---

## Contributing

1. Fork the repository and create your feature branch:
   ```powershell
   git checkout -b feature/your-feature-name
   ```
2. Commit your modifications following clean Git commit conventions.
3. Verify that the client builds without errors:
   ```powershell
   npm run build
   ```
4. Verify backend health and check that no secrets are committed:
   ```powershell
   curl http://localhost:5000/api/health
   ```
5. Push your branch and open a Pull Request against `main`.

---

## License

License information has not yet been defined.
