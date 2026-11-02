# 🚀 100% Free Cloud Deployment Guide

This guide walks you through deploying the **AI Interview Preparation & Evaluation System** to the cloud at **$0.00 cost** using free tiers:

| Component | Platform | Specs / Limits | Cost |
| :--- | :--- | :--- | :--- |
| **Frontend** | **Vercel** | Global Edge CDN, SSL, Continuous CI/CD | **$0.00** |
| **Backend API** | **Hugging Face Spaces** or **Render** | 2 vCPUs, 16 GB RAM (Docker) | **$0.00** |
| **AI LLM** | **Google Gemini API** | Free tier (15 RPM / 1M TPM) | **$0.00** |
| **Code Execution** | **Pyodide (WebAssembly)** | In-browser client compute | **$0.00** |
| **Vision Tracking** | **WebRTC + Canvas CV** | In-browser client compute | **$0.00** |
| **Speech Audio** | **Web Speech API** | Native browser engine | **$0.00** |

---

## 1. Deploy the Backend (Hugging Face Spaces)

Hugging Face Spaces provides **2 vCPUs and 16 GB RAM** completely free of charge with full Docker support.

### Step 1: Create Space
1. Log in to [Hugging Face](https://huggingface.co/) and click **New Space**.
2. Space Name: `ai-interview-backend`
3. License: `MIT`
4. Space SDK: **Docker** -> **Blank**
5. Space Hardware: **CPU Basic (2 vCPU, 16 GB RAM) - Free**
6. Click **Create Space**.

### Step 2: Configure Environment Secret
1. In your new Space, navigate to **Settings** -> **Variables and secrets**.
2. Under **Secrets**, click **New secret**:
   - Key: `GEMINI_API_KEY`
   - Value: *(Your Google Gemini API Key)*

### Step 3: Push Backend Code
Clone your Space repository and copy the contents of `backend/` into it:
```bash
git clone https://huggingface.co/spaces/<YOUR_HF_USERNAME>/ai-interview-backend
cd ai-interview-backend

# Copy backend files (Dockerfile, requirements.txt, app/)
cp -r /path/to/project/backend/* .

git add .
git commit -m "Deploy AI Interview Backend"
git push
```
Hugging Face will automatically build the Docker container and start your FastAPI server on port 7860.

Your public backend API will be available at:
`https://<YOUR_HF_USERNAME>-ai-interview-backend.hf.space`

*(Test by opening `https://<YOUR_HF_USERNAME>-ai-interview-backend.hf.space/docs` to see Swagger UI).*

---

## 2. Deploy the Frontend (Vercel)

Vercel provides automated Git deployment, fast builds, and custom domain support at zero cost.

### Step 1: Push Project to GitHub
Ensure all recent changes are committed and pushed to your GitHub repository:
```bash
git add .
git commit -m "feat: Full system upgrades & deployment ready"
git push origin main
```

### Step 2: Import into Vercel
1. Log in to [Vercel](https://vercel.com/) and click **Add New...** -> **Project**.
2. Select your `AI-Interview-Preparation-Evaluation-System` repository.
3. In project configuration:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend` *(Click Edit and select the `frontend` folder)*
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Expand **Environment Variables**:
   - Key: `VITE_API_URL`
   - Value: `https://<YOUR_HF_USERNAME>-ai-interview-backend.hf.space/api`
5. Click **Deploy**.

Within 60 seconds, your production frontend will be live with full HTTPS, continuous deployment, and single-page routing!

---

## 3. Alternative: Deploy Backend on Render (Web Service)

If you prefer Render:
1. Log in to [Render](https://render.com/) and click **New** -> **Web Service**.
2. Connect your GitHub repository.
3. Configure settings:
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: `Free`
4. In **Environment Variables**, add:
   - `GEMINI_API_KEY`: *(Your Gemini API Key)*
5. Click **Create Web Service**.

---

## 4. Local Development

To run the application locally on your machine:

### Terminal 1: Backend
```bash
cd backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Terminal 2: Frontend
```bash
cd frontend
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173) in your browser.
