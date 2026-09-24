# AI Interview Preparation & Evaluation System

A full-stack, AI-driven mock interview simulator that dynamically blends a candidate's resume and a target job description to generate highly contextual, multi-level technical interview questions, complete with real-time speech-to-text, machine learning performance prediction, and personalized study plans.

---

## 🛠️ Tech Stack
- **Frontend:** React (Vite), Tailwind CSS v4, Axios
- **Backend:** FastAPI (Python), Uvicorn, LangChain
- **AI Models:** 
  - `gemini-3.5-flash-lite` (Question Generation, Resume Parsing, Study Plan Generation)
  - `faster-whisper` (Local Speech-to-Text Audio Transcription)
  - `scikit-learn` Random Forest (Local ML Performance Prediction)
- **Vector Database:** ChromaDB (Local RAG for context)

---

## 🚀 How to Run the Project (Local Execution)

Follow these steps to run the project locally on your machine.

### 1. Prerequisites
- **Python 3.10+** (Required for the backend)
- **Node.js 18+** (Required for the frontend)
- A **Google Gemini API Key** (Get one from [Google AI Studio](https://aistudio.google.com/))

### 2. Backend Setup
Open a terminal and navigate to the `backend` directory:
```bash
cd "AI Interview Preparation & Evaluation System/backend"
```

**Step 2a: Create a Virtual Environment**
```bash
python -m venv venv
```
Activate it:
- Windows: `.\venv\Scripts\activate`
- Mac/Linux: `source venv/bin/activate`

**Step 2b: Install Dependencies**
```bash
pip install -r requirements.txt
pip install google-generativeai langchain-google-genai
```

**Step 2c: Configure Environment Variables**
Create a `.env` file in the `backend/` folder and add your Gemini API Key:
```env
GEMINI_API_KEY=your_actual_api_key_here
```

**Step 2d: Start the Backend Server**
```bash
uvicorn app.main:app --reload
```
*The backend API will now be running on `http://127.0.0.1:8000`*

---

### 3. Frontend Setup
Open a **new** terminal and navigate to the `frontend` directory:
```bash
cd "AI Interview Preparation & Evaluation System/frontend"
```

**Step 3a: Install Dependencies**
```bash
npm install
```

**Step 3b: Start the React Development Server**
*(Note for Windows users: If your project path contains special characters like `&`, the standard `npm run dev` might fail. Use the Node binary directly as shown below).*
```bash
node node_modules/vite/bin/vite.js
```
*The frontend UI will now be running on `http://localhost:5174`*

---

## 🎯 How to Use the Application

1. **Upload Resume & JD:** Open `http://localhost:5174` in your browser. Upload your Resume (PDF), type your target role, and paste the target Job Description.
2. **Match Score:** The AI will parse both documents and present an exact match percentage, highlighting your strengths and missing skills.
3. **Configure Interview:** Choose the difficulty mix (Easy, Intermediate, Hard), set the number of questions, and allocate a time limit for each.
4. **Take the Interview:** The AI will generate completely unique questions blended from your resume and the JD. You can type your answer or click the **Microphone** to record your voice.
5. **Real-time Feedback:** As you submit each answer, the AI evaluates your response out of 100, highlights missed concepts, and allows you to view the "Ideal Model Answer".
6. **Final Report:** Once the interview finishes, the local ML model predicts your real-world overall score, breaks down your Strong/Weak areas, and generates a personalized 7-Day Study Plan!

---

## 🐳 Optional: Running with Docker
If you prefer containerization, you can run the entire stack using Docker Compose.

Make sure you have inserted your `.env` variables, then run:
```bash
docker-compose up --build
```
- Backend will be on `http://localhost:8000`
- Frontend will be on `http://localhost:3000`
