# AI-Powered Adaptive Interview Preparation and Evaluation System
**Complete Implementation Guide**

This guide provides a detailed breakdown of how to build the AI Interview System. We will go through the core modules, explaining the logic and providing concrete code implementations for the backend (Python/FastAPI) and AI components.

---

## Prerequisites & Project Setup

Before starting, create your project directory and virtual environment.

```bash
mkdir ai-interview-system
cd ai-interview-system
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

**`backend/requirements.txt`**
```text
fastapi
uvicorn
sqlalchemy
psycopg2-binary
pydantic
PyMuPDF
langchain
langchain-openai
sentence-transformers
chromadb
openai
scikit-learn
pandas
python-multipart
faster-whisper
```

---

## Phase 1: Core API & Database Setup

**Explanation:** We need a robust backend to handle HTTP requests, manage database connections, and orchestrate the AI services. FastAPI is perfect for this due to its speed and native async support. PostgreSQL will store user data, parsed resumes, and interview history.

**Implementation:**

**`backend/app/database.py`**
```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Use SQLite for local dev, PostgreSQL for production
SQLALCHEMY_DATABASE_URL = "sqlite:///./interview_app.db" 
# SQLALCHEMY_DATABASE_URL = "postgresql://user:password@localhost/interview_db"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

**`backend/app/main.py`**
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# from .api import resume, interview, evaluation

app = FastAPI(title="AI Interview System API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, change to your React app domain
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers (we will define these later)
# app.include_router(resume.router, prefix="/api/resume", tags=["Resume"])
# app.include_router(interview.router, prefix="/api/interview", tags=["Interview"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the AI Interview API"}
```

---

## Phase 2: Resume Parsing & Skill Extraction (NLP + LLM)

**Explanation:** We need to extract text from a PDF resume and convert that unstructured text into a structured JSON format containing the candidate's skills, experience, and projects. We use `PyMuPDF` (fitz) for reliable text extraction and an LLM (like GPT-4o-mini or a local model) via `LangChain` to structure the data.

**Implementation:**

**`backend/app/services/resume_parser.py`**
```python
import fitz  # PyMuPDF
from pydantic import BaseModel
from typing import List
from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate
from langchain.output_parsers import PydanticOutputParser
import os

# 1. Define the desired output structure
class CandidateProfile(BaseModel):
    name: str
    skills: List[str]
    projects: List[str]
    years_of_experience: int

# 2. Extract text from PDF
def extract_text_from_pdf(file_path: str) -> str:
    doc = fitz.open(file_path)
    text = "\n".join([page.get_text() for page in doc])
    return text

# 3. Use LLM to extract structured data
def extract_skills_with_llm(raw_text: str) -> CandidateProfile:
    llm = ChatOpenAI(temperature=0, model_name="gpt-4o-mini", api_key=os.getenv("OPENAI_API_KEY"))
    parser = PydanticOutputParser(pydantic_object=CandidateProfile)
    
    prompt = PromptTemplate(
        template="Extract the candidate's information from the following resume text.\n{format_instructions}\n\nResume Text:\n{resume_text}",
        input_variables=["resume_text"],
        partial_variables={"format_instructions": parser.get_format_instructions()}
    )
    
    chain = prompt | llm | parser
    return chain.invoke({"resume_text": raw_text})
```

---

## Phase 3: Resume-Job Matching (Embeddings)

**Explanation:** To see how well a candidate fits a job, we shouldn't just look for exact keyword matches. "ReactJS" and "React.js" or "Node" and "Express" are related. We use `SentenceTransformers` to convert skills into dense vectors (embeddings) and calculate their semantic similarity (Cosine Similarity).

**Implementation:**

**`backend/app/services/matching_service.py`**
```python
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

# Load a small, fast model for semantic similarity
model = SentenceTransformer('all-MiniLM-L6-v2')

def calculate_match_score(resume_skills: list[str], job_requirements: list[str]) -> dict:
    if not resume_skills or not job_requirements:
        return {"score": 0, "matched": [], "missing": job_requirements}

    # Generate embeddings
    resume_embeddings = model.encode(resume_skills)
    job_embeddings = model.encode(job_requirements)
    
    # Calculate cosine similarity matrix (Job Req x Resume Skills)
    similarity_matrix = cosine_similarity(job_embeddings, resume_embeddings)
    
    matched = []
    missing = []
    total_score = 0
    
    # Threshold for considering a skill "matched"
    MATCH_THRESHOLD = 0.6 
    
    for i, req in enumerate(job_requirements):
        # Find the max similarity score for this job requirement against all resume skills
        best_match_score = np.max(similarity_matrix[i])
        best_match_idx = np.argmax(similarity_matrix[i])
        
        if best_match_score >= MATCH_THRESHOLD:
            matched.append({
                "requirement": req, 
                "matched_with": resume_skills[best_match_idx], 
                "score": float(best_match_score)
            })
            total_score += best_match_score
        else:
            missing.append(req)
            
    # Normalize score 0-100
    overall_score = (total_score / len(job_requirements)) * 100 if job_requirements else 0
    
    return {
        "overall_match_percentage": round(overall_score, 2),
        "matched_skills": matched,
        "missing_skills": missing
    }
```

---

## Phase 4: RAG Implementation (ChromaDB)

**Explanation:** To prevent the LLM from hallucinating technical details and to provide accurate follow-up questions, we ground it using Retrieval-Augmented Generation (RAG). We store technical documentation and interview Q&A banks in a Vector Database (ChromaDB).

**Implementation:**

**`backend/app/services/rag_service.py`**
```python
import chromadb
from chromadb.utils import embedding_functions

# Initialize ChromaDB locally
chroma_client = chromadb.PersistentClient(path="./chroma_db")
sentence_transformer_ef = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")

# Get or create a collection for interview knowledge
collection = chroma_client.get_or_create_collection(
    name="interview_knowledge_base",
    embedding_function=sentence_transformer_ef
)

def ingest_document(doc_id: str, text: str, metadata: dict):
    """Adds a document chunk to the vector database."""
    collection.add(
        documents=[text],
        metadatas=[metadata],
        ids=[doc_id]
    )

def retrieve_context(query: str, n_results: int = 3) -> str:
    """Searches the vector DB for context relevant to the query."""
    results = collection.query(
        query_texts=[query],
        n_results=n_results
    )
    
    if results['documents']:
        # Combine retrieved chunks into a single context string
        return "\n\n".join(results['documents'][0])
    return ""
```

---

## Phase 5: Adaptive Question Generation

**Explanation:** The interview should not be static. The LLM generates questions dynamically based on the candidate's skills, the target role, and their performance on previous questions.

**Implementation:**

**`backend/app/services/interview_service.py`**
```python
from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate
from langchain.output_parsers import PydanticOutputParser
from pydantic import BaseModel
from typing import List

class InterviewQuestion(BaseModel):
    question: str
    topic: str
    expected_concepts: List[str]
    difficulty: str

def generate_next_question(candidate_skills: str, role: str, current_difficulty: str, previous_questions: str, context: str) -> InterviewQuestion:
    llm = ChatOpenAI(temperature=0.7, model_name="gpt-4o-mini")
    parser = PydanticOutputParser(pydantic_object=InterviewQuestion)
    
    prompt = PromptTemplate(
        template="""You are an expert technical interviewer.
        Candidate Skills: {skills}
        Target Role: {role}
        Target Difficulty: {difficulty}
        
        Reference Knowledge:
        {context}
        
        Previous Questions asked (DO NOT REPEAT THESE):
        {previous}
        
        Generate the next interview question. It should test their knowledge appropriately based on the difficulty.
        
        {format_instructions}""",
        input_variables=["skills", "role", "difficulty", "context", "previous"],
        partial_variables={"format_instructions": parser.get_format_instructions()}
    )
    
    chain = prompt | llm | parser
    return chain.invoke({
        "skills": candidate_skills,
        "role": role,
        "difficulty": current_difficulty,
        "context": context,
        "previous": previous_questions
    })
```

---

## Phase 6: Answer Evaluation (Multi-faceted)

**Explanation:** We don't just rely on the LLM to give a 1-10 score. We break evaluation down:
1.  **Concept Checking:** Did they mention the `expected_concepts` defined in Phase 5?
2.  **LLM Evaluation:** Checking for logical correctness and extracting strengths/weaknesses.

**Implementation:**

**`backend/app/services/evaluation_service.py`**
```python
from pydantic import BaseModel
from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate
from langchain.output_parsers import PydanticOutputParser

class EvaluationFeedback(BaseModel):
    technical_score: int # 0-10
    communication_score: int # 0-10
    strengths: list[str]
    improvements: list[str]
    is_strong_answer: bool # Determines if next question gets harder

def evaluate_answer(question: str, candidate_answer: str, expected_concepts: list[str]) -> dict:
    # 1. Concept Coverage
    concepts_found = [concept for concept in expected_concepts if concept.lower() in candidate_answer.lower()]
    coverage_score = (len(concepts_found) / len(expected_concepts)) * 10 if expected_concepts else 10
    
    # 2. LLM Qualitative Evaluation
    llm = ChatOpenAI(temperature=0, model_name="gpt-4o-mini")
    parser = PydanticOutputParser(pydantic_object=EvaluationFeedback)
    
    prompt = PromptTemplate(
        template="""Evaluate the candidate's answer to the interview question.
        Question: {question}
        Candidate Answer: {answer}
        Expected Concepts: {concepts}
        
        Provide a technical score (0-10), communication score (0-10), strengths, areas for improvement, and a boolean indicating if it was a strong answer (>7/10).
        {format_instructions}""",
        input_variables=["question", "answer", "concepts"],
        partial_variables={"format_instructions": parser.get_format_instructions()}
    )
    
    chain = prompt | llm | parser
    llm_feedback = chain.invoke({
        "question": question,
        "answer": candidate_answer,
        "concepts": ", ".join(expected_concepts)
    })
    
    # Adaptive Logic Engine Hook:
    next_difficulty_action = "increase" if llm_feedback.is_strong_answer else "decrease_or_maintain"
    
    return {
        "coverage_score": coverage_score,
        "llm_evaluation": llm_feedback.model_dump(),
        "adaptive_action": next_difficulty_action
    }
```

---

## Phase 7: Voice Interview (Speech-to-Text)

**Explanation:** To simulate a real interview, we accept audio recordings. We use `faster-whisper` to transcribe the audio into text, which is then passed to the Evaluation Service. We can also extract metrics like filler words.

**Implementation:**

**`backend/app/api/interview.py`**
```python
from fastapi import APIRouter, UploadFile, File
from faster_whisper import WhisperModel
import tempfile
import os

router = APIRouter()
# Load model (base is fast and usually good enough, use small/medium for higher accuracy)
whisper_model = WhisperModel("base", device="cpu", compute_type="int8")

@router.post("/transcribe")
async def transcribe_audio(audio_file: UploadFile = File(...)):
    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_audio:
        content = await audio_file.read()
        temp_audio.write(content)
        temp_audio_path = temp_audio.name

    try:
        # Transcribe
        segments, info = whisper_model.transcribe(temp_audio_path, beam_size=5)
        transcript = " ".join([segment.text for segment in segments])
        
        # Simple Communication Metric: Filler word detection
        filler_words = ["um", "uh", "like", "you know", "actually"]
        transcript_lower = transcript.lower()
        filler_count = sum(transcript_lower.count(fw) for fw in filler_words)
        word_count = len(transcript.split())
        filler_rate = (filler_count / word_count) * 100 if word_count > 0 else 0
        
        return {
            "transcript": transcript.strip(),
            "language": info.language,
            "filler_word_rate_percent": round(filler_rate, 2)
        }
    finally:
        # Clean up temp file
        os.remove(temp_audio_path)
```

---

## Phase 8: ML Performance Prediction & Analytics

**Explanation:** While the LLM evaluates individual answers, a traditional Machine Learning model (like Random Forest) can predict the overall interview performance based on historical data. This separates concerns: LLM for language, ML for statistical prediction.

**Implementation:**

**`ml/train_performance.py`**
```python
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error
import joblib

# Assume you have collected a dataset over time (e.g., historical_interviews.csv)
def train_model():
    # Mock data for example purposes
    data = {
        'avg_tech_score': [8.5, 4.0, 7.0, 9.0, 5.5],
        'avg_coverage': [80, 30, 65, 95, 45],
        'filler_rate': [2.1, 8.5, 4.0, 1.0, 6.2],
        'overall_score': [85, 35, 68, 92, 50] # Target variable
    }
    df = pd.DataFrame(data)
    
    X = df[['avg_tech_score', 'avg_coverage', 'filler_rate']]
    y = df['overall_score']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    predictions = model.predict(X_test)
    print(f"MSE: {mean_squared_error(y_test, predictions)}")
    
    # Save the model for FastAPI to load
    joblib.dump(model, 'performance_model.pkl')

if __name__ == "__main__":
    train_model()
```

---

## Phase 9: Weak Topic Detection & Study Plan Generation

**Explanation:** After the interview, we aggregate the scores by topic. We identify the lowest-performing topics and use the LLM to generate a personalized, day-by-day study plan.

**Implementation:**

**`backend/app/services/study_plan.py`**
```python
from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate

def generate_study_plan(topic_scores: dict, available_days: int) -> str:
    # Identify weak topics (e.g., score < 60)
    weak_topics = [topic for topic, score in topic_scores.items() if score < 60]
    
    if not weak_topics:
        return "Great job! You performed well across all topics. Keep practicing with mock interviews."
        
    llm = ChatOpenAI(temperature=0.5, model_name="gpt-4o")
    
    prompt = PromptTemplate(
        template="""You are a technical career coach. 
        The candidate has upcoming interviews in {days} days.
        Their weakest topics in the recent mock interview were: {weak_topics}.
        
        Generate a structured, day-by-day study plan to help them improve specifically on these topics.
        Include specific concepts to review and types of practical exercises they should do.
        Keep it actionable and concise.
        """,
        input_variables=["days", "weak_topics"]
    )
    
    chain = prompt | llm
    return chain.invoke({
        "days": available_days,
        "weak_topics": ", ".join(weak_topics)
    }).content
```

---

## Phase 10: Docker Deployment Architecture

**Explanation:** To make the system reproducible and scalable, we containerize the frontend and backend, and use Docker Compose to orchestrate them alongside PostgreSQL.

**`docker-compose.yml`**
```yaml
version: '3.8'

services:
  backend:
    build: 
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/interview_db
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - db

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:80"
    depends_on:
      - backend

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=interview_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```
