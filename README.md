# 🚀 AI-Powered Adaptive Interview Preparation & Evaluation System

An enterprise-grade, full-stack mock interview platform that dynamically blends a candidate's resume with target Job Descriptions to generate contextual technical challenges, multi-turn conversational probing, in-browser code execution, real-time audio analysis, and personalized 7-day remediation roadmaps.

---

## 🌟 Key Features & Architectural Upgrades

### 1. 🎭 Company-Specific Interviewer Personas
- **Google "Bar Raiser":** Evaluates high-concurrency systems, low latency, $O(N)$ algorithmic optimization, and extreme distributed edge cases.
- **Amazon Bar Raiser:** Probes through the lens of Amazon's 16 Leadership Principles and the STAR behavioral method.
- **Y-Combinator Startup CTO:** Emphasizes pragmatic delivery speed, production debugging, developer velocity, and business trade-offs.
- **Standard Senior Architect:** Balanced technical and system design evaluation.

### 2. 🔄 Multi-Turn Conversational Probing (Follow-Up Agent)
- Real interviewers don't just grade and move on. If a candidate provides a brief or buzzword-heavy answer, the AI detects the lack of depth and poses a targeted follow-up question before scoring.

### 3. ⚡ Real-Time Token Streaming (Server-Sent Events)
- Sub-second Time-to-First-Token (TTFT). Constructive evaluation feedback streams live token-by-token directly to the screen using FastAPI's asynchronous generators.

### 4. 💻 In-Browser Python 3 WebAssembly Sandbox (Monaco Editor)
- Embedded VS Code editor (**Monaco**) paired with **Pyodide (WebAssembly)**. Candidates can write and execute Python code directly inside their browser with **$0 server compute overhead** and zero latency.

### 5. 🎙️ Local Quantized Speech-to-Text (CTranslate2 Faster-Whisper)
- Audio is transcribed locally on CPU using 8-bit quantized Whisper weights. Zero voice recordings are leaked to external cloud APIs, with automatic speech disfluency analysis (filler words like *um*, *uh*, *like*).

### 6. 📊 Machine Learning Regressor & Diagnostic PDF Export
- Scikit-learn **Random Forest Regressor** predicts an empirical hiring performance score based on multi-variate metrics.
- **1-Click PDF Report Generation:** Instantly downloads a formal, branded Diagnostic Performance Report detailing matched competencies, question transcripts, topic weaknesses, and a 7-day personalized study plan.

---

## 🛠️ Complete Technology Stack

| Layer | Technologies | Architectural Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS v4, Monaco Editor | Reactive SPA, client-side WebAssembly code execution, responsive UI. |
| **Backend** | FastAPI, Uvicorn (ASGI), Pydantic v2 | High-throughput async non-blocking REST API and Server-Sent Events. |
| **AI Orchestration** | LangChain, Google Gemini 3.5 Flash-Lite | Context-aware question generation, structured schema parsing, and CoT grading. |
| **Embeddings & RAG** | SentenceTransformers (`all-MiniLM-L6-v2`), ChromaDB | 384-dimensional dense semantic skill-matching and local vector knowledge grounding. |
| **Speech & ML** | Faster-Whisper (int8 CPU), Scikit-Learn | Local speech-to-text audio processing and multi-variate Random Forest scoring. |
| **Reporting & DevOps** | jsPDF, ReportLab, Docker Compose | Client-side diagnostic PDF export, containerized deployment, and technical documentation. |

---

## 🚀 Local Quickstart Guide

### 1. Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- **Google Gemini API Key** (Free from [Google AI Studio](https://aistudio.google.com/))

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# Windows: .\venv\Scripts\activate | Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file in `backend/`:
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

Start Backend Server:
```bash
uvicorn app.main:app --reload
```
*API running at `http://127.0.0.1:8000` (Interactive Swagger docs at `http://127.0.0.1:8000/docs`)*

### 3. Frontend Setup
Open a new terminal:
```bash
cd frontend
npm install
node node_modules/vite/bin/vite.js
```
*Frontend running at `http://localhost:5173`*

---

## 🔒 Privacy & Architecture Invariants
- **Zero Cloud Audio Leakage:** All speech recognition runs locally via CTranslate2 on the host machine.
- **Deterministic Schema Enforcing:** All LLM boundaries are enforced with strict Pydantic parsers to prevent runtime hallucination crashes.
- **Decoupled Quantitative Scoring:** Separates generative qualitative feedback from statistical Random Forest regression to eliminate buzzword bias.
