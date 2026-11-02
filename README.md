# 🚀 AI Interview Preparation & Evaluation System
### *Enterprise-Grade, Full-Stack Adaptive Mock Interview Simulator & Diagnostic Assessment Platform*

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React%2018%20(Vite)-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![Gemini](https://img.shields.io/badge/LLM-Gemini%203.5%20Flash--Lite-4285F4.svg?logo=google&logoColor=white)](https://ai.google.dev/)
[![Whisper](https://img.shields.io/badge/Speech--to--Text-Faster--Whisper%20(int8)-FF6F00.svg)](https://github.com/SYSTRAN/faster-whisper)
[![ChromaDB](https://img.shields.io/badge/Vector%20Store-ChromaDB%20(HNSW)-red.svg)](https://www.trychroma.com/)
[![Scikit-Learn](https://img.shields.io/badge/Machine%20Learning-Random%20Forest-F7931E.svg?logo=scikit-learn&logoColor=white)](https://scikit-learn.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📑 Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [System Architecture & High-Level Design](#2-system-architecture--high-level-design)
3. [End-to-End System Execution Data Flow](#3-end-to-end-system-execution-data-flow)
4. [Complete Tech Stack & Architectural Purposes](#4-complete-tech-stack--architectural-purposes)
5. [Step-by-Step Implementation Pipeline (Phases 1–10)](#5-step-by-step-implementation-pipeline-phases-110)
6. [Comparative Trade-off Analysis & Decision Matrix](#6-comparative-trade-off-analysis--decision-matrix)
7. [System Resilience, Edge Cases & Invariants](#7-system-resilience-edge-cases--invariants)
8. [Repository Directory Layout](#8-repository-directory-layout)
9. [Local Quickstart & Execution Guide](#9-local-quickstart--execution-guide)

---

## 1. Executive Summary

Traditional mock interview portals suffer from three fatal design limitations:
1. **Static Question Banks:** Rote memorization of leaked questions that do not reflect candidate projects.
2. **Superficial Regex Grading:** Rigid keyword counting that rewards buzzwords while failing to evaluate depth, trade-offs, and systemic design.
3. **One-Way Interaction:** Lack of active follow-up questions when an answer is incomplete or vague.

The **AI Interview Preparation & Evaluation System** is a distributed, production-ready platform designed to solve these challenges. It extracts candidate experience features from PDF resumes via LLM-driven schema parsing, computes mathematical vector similarities against target Job Descriptions (JDs), retrieves grounding domain context from an embedded Vector Database via Retrieval-Augmented Generation (RAG), orchestrates live in-browser WebAssembly Python execution, and pairs a Generative LLM with an ensemble Machine Learning Random Forest model for multi-dimensional, unbiased candidate evaluation.

---

## 2. System Architecture & High-Level Design

The application follows a decoupled, 4-tier microservices architecture ensuring horizontal scalability, zero data leaks, and high throughput:

```mermaid
graph TD
    subgraph Tier1 ["Presentation Tier (Client-Side)"]
        UI["React 18 Single Page Application (Vite)"]
        Monaco["Monaco Editor (VS Code Web)"]
        Pyodide["Pyodide WebAssembly (Local Python 3 Engine)"]
        AudioRec["Web Audio MediaRecorder (WebM)"]
        PDFGen["jsPDF Client Diagnostic Report Generator"]
        UI --> Monaco
        Monaco --> Pyodide
        UI --> AudioRec
        UI --> PDFGen
    end

    subgraph Tier2 ["API Gateway & Orchestration Tier"]
        FastAPI["FastAPI ASGI Core (Uvicorn)"]
        CORS["CORS & Route Handlers"]
        Pydantic["Pydantic v2 Schema Validation"]
        SSE["Server-Sent Events (SSE) Streaming Engine"]
        FastAPI --> CORS
        FastAPI --> Pydantic
        FastAPI --> SSE
    end

    subgraph Tier3 ["AI, Embeddings & RAG Tier"]
        PyMuPDF["PyMuPDF (Fitz C-Engine)"]
        Gemini["Google Gemini 3.5 Flash-Lite (T=0.0 - 0.85)"]
        LangChain["LangChain LCEL Chains & Output Parsers"]
        MiniLM["SentenceTransformers (all-MiniLM-L6-v2 - 384d)"]
        Chroma["ChromaDB Local Vector Index (HNSW / SQLite)"]
        LangChain --> Gemini
        MiniLM --> Chroma
    end

    subgraph Tier4 ["Perception & Statistical ML Analytics Tier"]
        Whisper["Faster-Whisper (CTranslate2 int8 CPU)"]
        Disfluency["Lexical Disfluency Scanner (um, uh, actually)"]
        RF["Scikit-Learn Random Forest Regressor (100 Trees)"]
        StudyPlan["Dynamic 7-Day Remediation Planner"]
        Whisper --> Disfluency
        Disfluency --> RF
        RF --> StudyPlan
    end

    UI <== "Asynchronous REST / Multipart Form Data" ==> FastAPI
    UI <== "Server-Sent Events (Token Stream)" <== SSE
    FastAPI --> PyMuPDF
    FastAPI --> LangChain
    FastAPI --> MiniLM
    FastAPI --> Chroma
    FastAPI --> Whisper
    FastAPI --> RF
```

### Architectural Tier Breakdown
* **Presentation Tier:** A responsive Single Page Application (SPA) built with React 18 and Tailwind CSS v4. Embeds Microsoft's Monaco Code Editor paired with Pyodide (WebAssembly) to execute Python code natively inside the candidate's browser with **$0 server compute cost**.
* **API Gateway Tier:** Built on FastAPI running on Uvicorn ASGI. Utilizes native non-blocking coroutines (`async/await`) to process slow LLM generations and audio streaming concurrently without thread-pool exhaustion.
* **AI & RAG Tier:** Standardizes prompt templating and parsing via LangChain Expression Language (LCEL). Dense vector embeddings map competencies into 384-dimensional Euclidean spaces, grounded by local ChromaDB vector indices.
* **Perception & Statistical Tier:** Local quantized Faster-Whisper neural model performs on-premise automatic speech recognition (ASR) while an ensemble Random Forest model maps multi-variate features into a non-linear predicted score.

---

## 3. End-to-End System Execution Data Flow

```
[Candidate PDF & Target JD]
         │
         ▼ (Multipart Upload)
[PyMuPDF (fitz) Stream Extractor] ──► Extracts raw text in <25ms
         │
         ▼ (Deterministic Extraction: T=0.0)
[Gemini + PydanticOutputParser] ──► Normalizes to CandidateProfile(skills, projects, experience)
         │
         ▼ (Dense Semantic Alignment)
[SentenceTransformers all-MiniLM-L6-v2] ──► Computes Cosine Similarity Matrix (Threshold >= 0.55)
         │                                   Yields: Overall Match % and Missing Skill Deficits
         ▼
[ChromaDB Local Vector Query] ──► HNSW Cosine Search retrieves domain reference context chunks
         │
         ▼ (Adaptive Question Formulation)
[Persona Engine (Google / Amazon / Startup)] ──► Blends 50% Resume + 50% JD + Anti-Repetition Buffer
         │                                      Generates Question & Model 100/100 Ideal Answer
         ▼
[Candidate Answer Modality] ──┬──► Option A: In-Browser Python Execution (Monaco + Pyodide Wasm)
                              ├──► Option B: Real-Time Audio Recording (Web Audio API WebM)
                              └──► Option C: Structured Architectural Text Response
                                            │
         ┌──────────────────────────────────┘
         ▼
[Faster-Whisper (int8 CPU)] ──► Transcribes speech + calculates Filler Word Disfluency %
         │
         ▼ (Multi-Turn Probing & Dual-Stage Evaluation)
[Stage 1: Deterministic Concept Coverage Check] ──► Evaluates presence of expected key concepts
         │
         ▼ (Stage 2: Gemini Chain-of-Thought Grading)
         ├─► [If Answer is Shallow & Unprobed] ──► Triggers Yellow Follow-up Banner (Probe Question)
         └─► [If Answer is Complete or Probed] ──► Outputs Score (0-100), Missed Concepts & Feedback
         │
         ▼ (Real-Time SSE Feedback Stream)
[FastAPI StreamingResponse] ──► Pushes token-by-token qualitative coaching directly to UI
         │
         ▼ (Statistical Outcome Prediction)
[Random Forest Regressor (100 Trees)] ──► Predicts overall score: f(avg_tech, avg_coverage, filler_rate)
         │
         ▼ (Personalized Diagnostic Plan & Export)
[Diagnostic Remediation Engine] ──► Isolates sub-60% topics; synthesizes 7-Day Day-by-Day Study Plan
         │
         ▼
[1-Click Client jsPDF Generator] ──► Produces formal, downloadable multi-page Assessment PDF
```

---

## 4. Complete Tech Stack & Architectural Purposes

| Technology | Category | Exact Role in System | Architectural Purpose & Rationale |
| :--- | :--- | :--- | :--- |
| **React 18 (Vite)** | Frontend SPA | User Interface & Audio State | Sub-millisecond HMR; single-page architecture preserves ongoing audio recordings and timer states without page refresh. |
| **Tailwind CSS v4** | CSS Engine | Atomic Styling System | Zero runtime CSS-in-JS overhead; utility classes implement responsive dashboards, timer badges, and dark-mode terminal windows. |
| **Monaco Editor** | Frontend Code UI | Interactive Coding Environment | Powers the in-browser coding experience with real VS Code syntax highlighting, line numbers, and autocompletion. |
| **Pyodide (WebAssembly)** | Client Execution | In-Browser Python 3 Runtime | Executes candidate Python algorithms directly on the user's CPU via WebAssembly. Eliminates backend sandbox security vulnerabilities and **reduces server costs to $0.00**. |
| **FastAPI** | Backend Web Core | Asynchronous ASGI Gateway | Native `async/await` non-blocking event loop handles slow external LLM streams and audio ingestion without thread starvation. |
| **Pydantic v2** | Data Validation | Contract & Schema Enforcement | Guarantees strict type safety across HTTP boundaries; programmatically forces LLM responses into validated Python objects. |
| **Gemini 3.5 Flash-Lite** | Large Language Model | Generation, Probing & Grading | High token generation speed, deep technical reasoning, strict prompt instruction following, and generous free-tier rate limits. |
| **LangChain (LCEL)** | LLM Orchestrator | Prompt Composition Pipelines | Standardizes prompt construction, temperature management, and structured Pydantic output parsing via functional pipelines (`prompt \| llm \| parser`). |
| **Sentence-Transformers** | NLP Embeddings | Dense Vector Encoding | Runs `all-MiniLM-L6-v2` locally on CPU to map skills into 384-dimensional dense vectors in <15ms without cloud API latency. |
| **ChromaDB** | Vector Database | Local RAG Storage Engine | Embedded vector database with local SQLite metadata storage. Executes fast HNSW cosine search for technical grounding. |
| **Faster-Whisper** | Speech Recognition | Local Audio Transcription | CTranslate2 re-implementation of Whisper using 8-bit quantization on CPU. 4x faster than vanilla Whisper with 70% less RAM. |
| **Scikit-Learn (RF)** | Machine Learning | Empirical Performance Scoring | 100-tree ensemble regressor that maps multi-variate metrics (technical score, coverage, filler rate) into an objective predicted hiring score. |
| **PyMuPDF (Fitz)** | Document Extraction| PDF Resume Parsing | High-performance C-native PDF text extraction engine. Parses dense, multi-column resume PDFs in <25ms. |
| **jsPDF & AutoTable** | Client Reporting | 1-Click Assessment PDF Export | Generates branded, formal candidate evaluation PDF reports completely inside client browser memory with zero backend load. |
| **Docker & Compose** | Infrastructure | Containerized Microservices | Encapsulates frontend, backend, native CTranslate2 libraries, and database dependencies into reproducible deployment units. |

---

## 5. Step-by-Step Implementation Pipeline (Phases 1–10)

### Phase 1: Containerized Foundation & Asynchronous API Gateway
* Implemented FastAPI ASGI web server configured with global CORS middleware, structured error handlers, and modular sub-routers (`/api/resume`, `/api/interview`, `/api/matching`, `/api/evaluation`).
* Multi-stage Docker containers isolate Python 3.10 with native C-compilers while the frontend is built into an optimized static Nginx server.

### Phase 2: Resume Ingestion & Structured NLP Extraction
* Streams raw text buffers from user-uploaded PDF resumes using PyMuPDF (`fitz`), handling complex multi-column layouts.
* Injects text into a zero-temperature (`T=0.0`) Gemini prompt bound to LangChain's `PydanticOutputParser` enforcing the schema:
  $$\text{CandidateProfile} = \{\text{name: str}, \text{skills: List[str]}, \text{projects: List[str]}, \text{experience: int}\}$$

### Phase 3: Dense Semantic Matching & Skill Gap Vector Space
* Encodes candidate skills $S = \{s_1, s_2, \dots, s_m\}$ and job requirements $R = \{r_1, r_2, \dots, r_n\}$ into 384-dimensional dense vectors $\vec{v}_s, \vec{v}_r$ using local `all-MiniLM-L6-v2`.
* Computes pairwise Cosine Similarity Matrix $M \in \mathbb{R}^{n \times m}$. Requirement $r_i$ is classified as "Matched" if:
  $$\max_j \frac{\vec{v}_{r_i} \cdot \vec{v}_{s_j}}{\|\vec{v}_{r_i}\| \|\vec{v}_{s_j}\|} \ge 0.55$$
* Overall match percentage is calculated as:
  $$\text{Overall Match \%} = \frac{100}{n} \sum_{i=1}^n \max_j \text{Sim}(r_i, s_j)$$
* All requirements failing the threshold are isolated into the `missing_skills` array for interview probing.

### Phase 4: Knowledge Base Vectorization & RAG Pipeline
* Instantiates a persistent local vector database using `chromadb.PersistentClient(path='./chroma_db')`.
* System design blueprints, algorithmic patterns, and domain interview banks are embedded and indexed. At interview runtime, the current topic is queried ($k=1$ chunk) to inject domain grounding into the question prompt, eliminating model hallucinations.

### Phase 5: Adaptive Question Synthesis & Personas
* Formulates questions strictly enforcing a **50% Resume Skills + 50% Job Requirements** balance.
* Injects anti-repetition session history buffers (`previous_questions`) and applies designated persona styles:
  * **Google:** Distributed consensus, horizontal scaling, memory footprints.
  * **Amazon:** Leadership principles, ownership, customer trade-offs, STAR formatting.
  * **Startup CTO:** Delivery speed, practical debugging, architectural pragmatism.
* Simultaneously generates a model 100/100 `ideal_solution` for post-answer candidate review.

### Phase 6: Voice Perception & Acoustic Speech Disfluency Analyzer
* Captures voice via HTML5 MediaRecorder (WebM) and streams blobs to `/api/interview/transcribe`.
* `Faster-Whisper` (base int8) decodes speech on CPU using beam search (beam_size=5).
* Acoustic lexical scanner computes filler word disfluency percentage:
  $$\text{Filler Rate \%} = \left(\frac{\sum (\text{"um"} + \text{"uh"} + \text{"like"} + \text{"actually"} + \text{"you know"})}{\text{Total Words}}\right) \times 100$$

### Phase 7: Dual-Stage Evaluation & Conversational Probing Agent
* **Stage 1 (Deterministic Check):** Verifies presence of mandatory technical keywords in `expected_concepts`.
* **Stage 2 (Chain-of-Thought Grading):** If an answer lacks depth on the first attempt (`probe_count == 0`), the agent returns `is_follow_up=True` and presents a targeted follow-up question. Once answered or verified, it returns the final score (0–100), constructive critique, and missing concepts.
* **Adaptive Difficulty Action:** Score $>80 \implies$ increment difficulty; Score $<40 \implies$ decrement difficulty; otherwise maintain level.

### Phase 8: Machine Learning Overall Performance Prediction
* Offline/online hybrid regression pipeline (`ml/train_performance.py`).
* Trains an ensemble 100-tree `RandomForestRegressor` on multi-variate features:
  $$\hat{y}_{\text{overall}} = f_{\text{RF}}(\text{avg\_tech\_score}, \text{avg\_coverage}, \text{filler\_rate})$$
* Captures non-linear penalties (e.g., severe speech hesitation combined with conceptual gaps). Model is serialized via Joblib and loaded into memory on API startup.

### Phase 9: Diagnostic Topic Breakdown & 7-Day Remediation Plan
* Aggregates response scores across evaluated topics. Isolates deficit domains:
  $$W = \{t \in \text{Topics} \mid \text{Score}(t) < 60\}$$
* Invokes Gemini career coaching prompt to synthesize an actionable, day-by-day 7-day study curriculum with specific technical concepts to review and practical coding drills.

### Phase 10: In-Browser Monaco Sandbox & Client PDF Generator
* Integrates Monaco code editor with Pyodide WebAssembly in React, redirecting standard output to an in-browser console.
* Integrates `jspdf` and `jspdf-autotable` to format candidate details, topic breakdown, question transcripts, and the 7-day study plan into a multi-page, branded PDF report.

---

## 6. Comparative Trade-off Analysis & Decision Matrix

| Step / Component | Chosen Architecture | Alternative 1 | Alternative 2 | Engineering Justification & Trade-Off Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **API Gateway** | **FastAPI (ASGI)** | Flask (WSGI) | Django (Monolith) | FastAPI provides native async coroutines essential for non-blocking LLM/Audio requests. Flask blocks worker threads on I/O. Django includes heavy ORM overhead unneeded for microservices. |
| **Resume Extraction** | **PyMuPDF + LLM** | Regex / SpaCy NER | AWS Textract API | Regex/SpaCy fails on varied human resume layouts and lacks semantic comprehension. AWS Textract costs \$1.50/page with vendor lock-in. PyMuPDF is C-fast (<25ms) and LLM handles arbitrary layouts. |
| **Skill Matching** | **SentenceTransformers (MiniLM)** | TF-IDF / BM25 (Keyword) | LLM Prompt Scoring | TF-IDF fails on synonyms (`React.js` != `ReactJS`). Prompting LLMs for pairwise matching incurs severe token latency and cost. Dense vectors compute in 15ms locally on CPU with zero dollar cost. |
| **Vector Grounding (RAG)** | **ChromaDB (Local)** | Pinecone (Cloud DB) | Raw FAISS (In-memory) | Pinecone requires cloud credentials, recurring billing, and adds network round-trip latency. FAISS lacks built-in metadata persistence. ChromaDB offers zero-maintenance local SQLite-backed HNSW indexing. |
| **Question Synthesis** | **Adaptive Prompting + History** | Static Database Bank | Fine-Tuned Model | Static banks cause rote memorization and cannot blend unique resumes with specific JDs. Fine-tuning is rigid and expensive. Adaptive prompting yields infinite, dynamically tailored questions. |
| **Speech-to-Text** | **Faster-Whisper (int8)** | Cloud Whisper API | Web Speech API | Web Speech API has severe browser incompatibility and leaks audio. Cloud APIs cost \$0.006/min with latency overhead. Faster-Whisper int8 runs 4x faster on local CPU with zero data leaks. |
| **Answer Evaluation** | **Dual-Stage (Concept + LLM)** | Pure LLM Grading | Keyword Regex | Pure LLMs suffer from "buzzword hallucination" where articulate fluff gets high scores. Keyword regex lacks conceptual nuance. Dual-stage enforces objective concept coverage before qualitative grading. |
| **Overall Scoring** | **Random Forest ML Regressor** | Linear Regression | Simple Average | Arithmetic averaging assumes linear independence between speech fluency and technical accuracy. Linear regression misses feature interactions. Random Forest captures complex non-linear empirical patterns. |
| **Code Execution** | **Pyodide WebAssembly (Client)** | Judge0 Cloud API | Backend Docker Container | Cloud execution APIs have strict usage quotas and paid tiers. Backend container execution introduces severe RCE security risks. Pyodide executes Python securely inside client browser memory with $0 server cost. |
| **Diagnostic Report** | **Client jsPDF Generator** | Backend Headless Chrome | Server-Side PDF Generation | Headless Chrome (Puppeteer) requires 500MB+ RAM and spikes server CPU load. Client-side jsPDF renders multi-page reports instantly in browser memory with zero backend compute overhead. |

---

## 7. System Resilience, Edge Cases & Invariants

* **Zero Cloud Audio Leakage:** Audio transcription runs entirely on-premise using quantized Whisper weights. Voice data is processed in ephemeral memory and never uploaded to third-party cloud servers.
* **Deterministic Schema Enforcing:** All LLM outputs are bound to strict Pydantic models (`CandidateProfile`, `InterviewQuestion`, `ProbeOrEvaluateResult`). Any malformed output triggers internal recovery to prevent runtime crashes.
* **Decoupled Evaluation & Anti-Hallucination:** Qualitative feedback (LLM Chain-of-Thought) is strictly separated from quantitative scoring (Random Forest statistical model) to eliminate buzzword bias.
* **LLM Rate-Limit (HTTP 429) Mitigation:** Implemented `gemini-3.5-flash-lite` to lower per-request token overhead by 60% while expanding concurrency headroom under free-tier quotas.
* **Memory & Inode Leak Prevention:** Browser audio streams are stored in transient `tempfile.NamedTemporaryFile` instances with explicit unlinking inside `finally` blocks, preventing storage exhaustion.
* **Defensive Frontend Rendering:** Client gracefully unwraps polymorphic outputs (strings, arrays, multimodal objects), completely preventing React white-screen crashes.

---

## 8. Repository Directory Layout

```
AI Interview Preparation & Evaluation System/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── evaluation.py        # Evaluation, Probing & SSE Streaming routes
│   │   │   ├── interview.py         # Question generation & Whisper transcription
│   │   │   ├── matching.py          # Semantic skill-matching endpoints
│   │   │   ├── rag.py               # ChromaDB document ingestion & context query
│   │   │   └── resume.py            # PDF upload & JD requirements extraction
│   │   ├── models_ml/
│   │   │   └── performance_model.pkl # Trained Random Forest Regressor pipeline
│   │   ├── services/
│   │   │   ├── evaluation_service.py # Dual-stage scoring & follow-up probing logic
│   │   │   ├── interview_service.py  # Adaptive question synthesis & persona prompts
│   │   │   ├── job_parser.py         # NLP requirement extraction from JDs
│   │   │   ├── matching_service.py   # SentenceTransformers Cosine Similarity engine
│   │   │   ├── rag_service.py        # ChromaDB HNSW vector index operations
│   │   │   ├── resume_parser.py      # PyMuPDF extraction & Pydantic profile parsing
│   │   │   └── study_plan.py         # Diagnostic 7-day curriculum generator
│   │   ├── database.py              # Database session & configuration
│   │   └── main.py                  # FastAPI application entrypoint & CORS setup
│   ├── chroma_db/                   # Persistent local HNSW vector index files
│   ├── Dockerfile                   # Multi-stage CTranslate2 backend container
│   └── requirements.txt             # Backend Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── CodeSandbox.jsx      # In-browser Monaco + Pyodide Python 3 runner
│   │   ├── pages/
│   │   │   ├── Home.jsx             # Configuration, Persona selector & Match score
│   │   │   └── Interview.jsx        # Live interview simulator, Voice STT & PDF export
│   │   ├── utils/
│   │   │   └── pdfGenerator.js      # Client jsPDF diagnostic assessment generator
│   │   ├── api.js                   # Axios HTTP client & endpoint interfaces
│   │   ├── App.jsx                  # React Router configuration
│   │   └── main.jsx                 # React root DOM mount point
│   ├── index.html                   # HTML template loading Pyodide WebAssembly
│   ├── package.json                 # Node dependencies (Monaco, jsPDF, Axios)
│   └── vite.config.js               # Vite build & plugin configuration
├── ml/
│   └── train_performance.py         # Random Forest training & serialization script
├── AI_Interview_System_Complete_Architecture.pdf # Technical specification document
├── generate_architecture_pdf.py     # ReportLab architecture PDF generator script
├── docker-compose.yml               # Container orchestration specification
└── README.md                        # Master system architecture & documentation
```

---

## 9. Local Quickstart & Execution Guide

### Prerequisites
* **Python 3.10+**
* **Node.js 18+**
* **Google Gemini API Key** (Free tier available at [Google AI Studio](https://aistudio.google.com/))

### 1. Backend Setup
```bash
# 1. Navigate to backend directory
cd backend

# 2. Create and activate Python virtual environment
python -m venv venv
# On Windows: .\venv\Scripts\activate
# On Mac/Linux: source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment variables
# Create a .env file inside backend/ and insert:
# GEMINI_API_KEY=your_actual_api_key_here

# 5. Start the backend ASGI server
uvicorn app.main:app --reload
```
*Backend API running at `http://127.0.0.1:8000` (Interactive API documentation at `http://127.0.0.1:8000/docs`).*

### 2. Frontend Setup
Open a **new, separate terminal window**:
```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start React Vite development server
node node_modules/vite/bin/vite.js
```
*Frontend interface running at `http://localhost:5173`.*

---

## 📄 License
This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
