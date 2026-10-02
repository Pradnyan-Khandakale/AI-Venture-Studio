# AI Venture Studio — Production Deployment Guide
**Target Architecture:** Frontend on **Vercel** · Backend on **Render** · Database on **MongoDB Atlas**

---

## 1. Architecture Overview

```text
                         INTERNET
                            │
                            ▼
                    ┌───────────────┐
                    │    VERCEL     │
                    │               │
                    │ React + Vite  │
                    │ Static SPA    │
                    └───────┬───────┘
                            │
                            │ HTTPS (VITE_API_URL)
                            ▼
                    ┌───────────────┐
                    │    RENDER     │
                    │               │
                    │ Node.js       │
                    │ Express API   │
                    │ (0.0.0.0:PORT)│
                    │               │
                    │ 11 AI Agents  │
                    │ Boardroom     │
                    │ Memory & RAG  │
                    │ Analytics     │
                    │ PDF / MD / JS │
                    │ Email Service │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ MONGODB ATLAS │
                    │               │
                    │ Production DB │
                    └───────────────┘
```

> [!IMPORTANT]
> All sensitive credentials (`GEMINI_API_KEY`, `JWT_SECRET`, `MONGODB_URI`, `TAVILY_API_KEY`, `SMTP_PASS`) are **strictly server-side** on Render. The browser / Vercel frontend only receives `VITE_API_URL` and authenticates using standard JWT Bearer tokens.

---

## 2. Recommended Deployment Order

Follow this sequence strictly for the smoothest rollout:

```text
1. MongoDB Atlas
       ↓
2. Render Backend Web Service
       ↓
3. Verify Render /api/health
       ↓
4. Verify Authentication (Register / Login)
       ↓
5. Verify Gemini AI Generation
       ↓
6. Verify Project Creation & Studio
       ↓
7. Deploy Vercel Frontend
       ↓
8. Set VITE_API_URL on Vercel to Render URL
       ↓
9. Set CLIENT_URL on Render to Vercel URL
       ↓
10. Full Browser End-to-End Test
```

---

## 3. Step 1 — MongoDB Atlas Configuration

1. **Create an Atlas Account & Cluster**:
   - Sign up at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
   - Create a free **M0 Sandbox** (or paid tier) cluster in your preferred cloud provider and region (choose a region close to your Render service, e.g., US-East / Ohio).
2. **Create Database User**:
   - Navigate to **Security** → **Database Access**.
   - Click **Add New Database User**.
   - Authentication Method: **Password**.
   - Assign user privileges: **Read and write to any database**.
   - Generate or set a strong password. Save the username and password securely.
3. **Configure Network Access**:
   - Navigate to **Security** → **Network Access**.
   - Click **Add IP Address**.
   - Choose **Allow Access from Anywhere** (`0.0.0.0/0`).
   - *Note: Render web services use dynamic outbound IP addresses unless an enterprise static outbound proxy is configured; allowing `0.0.0.0/0` is standard for Render.*
4. **Copy Connection String**:
   - Navigate to **Deployments** → **Database** → **Connect**.
   - Select **Drivers** → **Node.js** (version 5.5 or later).
   - Copy the connection string format:
     ```text
     mongodb+srv://<username>:<password>@<cluster-subdomain>.mongodb.net/ai-venture-studio?retryWrites=true&w=majority
     ```
   - Replace `<username>` and `<password>` with your database user credentials.

---

## 4. Step 2 — Render Backend Web Service Deployment

You can deploy using Render's web interface or using the included `render.yaml` Blueprint.

### Option A: Manual Setup via Render Dashboard

1. **Log in to Render**:
   - Sign in at [dashboard.render.com](https://dashboard.render.com).
2. **Create New Web Service**:
   - Click **New +** → **Web Service**.
   - Connect your GitHub repository (`Pradnyan-Khandakale/AI-Venture-Studio`).
3. **Configure Service Settings**:
   - **Name**: `ai-venture-studio-api`
   - **Region**: Choose closest to your MongoDB Atlas cluster (e.g. `Oregon (US West)` or `Ohio (US East)`).
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free` or `Starter`
4. **Configure Health Check Path**:
   - Click **Advanced**.
   - Set **Health Check Path** to `/api/health`.
5. **Configure Environment Variables**:
   Under the **Environment Variables** section, add:

   | Key | Value / Instructions | Required |
   | :--- | :--- | :---: |
   | `NODE_ENV` | `production` | **Yes** |
   | `PORT` | `10000` (or leave default, Render sets `PORT` automatically) | **Yes** |
   | `MONGODB_URI` | Your MongoDB Atlas connection string from Step 1 | **Yes** |
   | `JWT_SECRET` | Generate a 256-bit secret via: `openssl rand -hex 32` | **Yes** |
   | `AI_PROVIDER` | `gemini` | **Yes** |
   | `GEMINI_API_KEY` | Your Google AI Studio API key | **Yes** |
   | `GEMINI_MODEL` | `gemini-3.7-flash` (or `gemini-3.6-flash`) | No |
   | `CLIENT_URL` | Your Vercel domain (e.g. `https://ai-venture-studio.vercel.app`) | **Yes** |
   | `TAVILY_API_KEY` | Optional: Your Tavily Search key (fallback: DuckDuckGo) | No |
   | `SMTP_HOST` | Optional: SMTP host (e.g. `smtp.gmail.com`) | No |
   | `SMTP_PORT` | `587` | No |
   | `SMTP_USER` | Optional: SMTP username/email | No |
   | `SMTP_PASS` | Optional: SMTP app-specific password | No |
   | `SMTP_FROM` | `"AI Venture Studio <your-email@example.com>"` | No |

6. **Deploy**:
   - Click **Create Web Service**.
   - Wait for deployment to finish and verify that Render reports `Your service is live`.
   - Copy your public service URL (e.g., `https://ai-venture-studio-api.onrender.com`).

### Option B: Deploy with Render Blueprint (`render.yaml`)

1. In Render, select **Blueprints** → **New Blueprint Instance**.
2. Connect this repository. Render detects `render.yaml` automatically.
3. Supply the prompted parameters (`MONGODB_URI`, `GEMINI_API_KEY`, `CLIENT_URL`).
4. Render creates and launches the web service with all health check, port, and directory settings preconfigured.

---

## 5. Step 3 — Verify Render Backend Health & APIs

Before deploying the frontend, verify the backend from your terminal:

```bash
# 1. Health check
curl -s https://<your-render-api>.onrender.com/api/health

# Expected response:
# {"ok":true,"service":"ai-venture-studio","database":"mongodb","aiProvider":"gemini"}

# 2. Authentication test
curl -s -X POST https://<your-render-api>.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Founder","email":"test@example.com","password":"password123"}'
```

---

## 6. Step 4 — Vercel Frontend Deployment

1. **Log in to Vercel**:
   - Sign in at [vercel.com](https://vercel.com).
2. **Import Project**:
   - Click **Add New...** → **Project**.
   - Select your GitHub repository (`AI-Venture-Studio`).
3. **Configure Project Settings**:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click **Edit** and select `client`
   - **Build Command**: `npm run build` (Default)
   - **Output Directory**: `dist` (Default)
   - **Install Command**: `npm install` (Default)
4. **Configure Environment Variables**:
   Under **Environment Variables**, add:

   | Key | Value |
   | :--- | :--- |
   | `VITE_API_URL` | `https://<your-render-api>.onrender.com/api` |

   > [!NOTE]
   > Do **NOT** set `GEMINI_API_KEY`, `JWT_SECRET`, or `MONGODB_URI` on Vercel. Only `VITE_API_URL` is needed.
5. **Deploy**:
   - Click **Deploy**.
   - Vercel builds the static bundle and deploys to a URL like `https://ai-venture-studio.vercel.app`.
6. **Update CORS on Render**:
   - Copy your live Vercel URL (e.g. `https://ai-venture-studio.vercel.app`).
   - Go to your Render Web Service → **Environment**.
   - Update `CLIENT_URL` to match your Vercel URL.
   - Click **Save Changes** (Render will reload the service with updated CORS allowed origins).

---

## 7. How to Generate a Secure JWT Secret

Run the following command in any terminal to generate a cryptographically strong 256-bit secret:

```bash
openssl rand -hex 32
```

Or using Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use the output as the value for `JWT_SECRET` in your Render service environment variables.

---

## 8. Managing Long-Running Multi-Agent Requests on Render

- **Manual Review Mode (Default)**: Each agent executes individually upon human approval. Each single-agent run completes within 2–5 seconds, well below Render's 100-second request timeout limit.
- **Auto Mode**: The engine orchestrates sequential execution of pending agents. To prevent HTTP connection drops on slower network conditions, the frontend features reactive state polling (`refetchInterval: 1200ms` while status is `running`).
- If an Auto Mode execution runs long, state transitions and generated deliverables are committed to MongoDB after each agent stage completes, ensuring no progress is lost.

---

## 9. Verification & Smoke Testing Checklist

After deployment, test the following checklist:

- [ ] `GET /api/health` returns `{"ok":true,"database":"mongodb"}`
- [ ] User registration works (`/` → Sign Up)
- [ ] User login works (`/` → Sign In)
- [ ] Dashboard displays projects list
- [ ] New project creation works
- [ ] Studio: Run Market Research agent
- [ ] Studio: Human approval & deliverable markdown display
- [ ] Boardroom: Executive debate question returns structured responses (CEO, CTO, CFO, CMO, VC)
- [ ] Memory & RAG: Semantic query returns relevance-scored matches
- [ ] Analytics: Displays startup readiness scorecard and charts
- [ ] Export: Download PDF (verify cover page, breakdown tables)
- [ ] Export: Download Markdown
- [ ] Export: Download JSON
- [ ] Email: Send report (verifies 200 on configured SMTP or graceful 503 if not configured)
- [ ] Browser Refresh on deep links (e.g. `/studio`, `/boardroom`) does not 404
