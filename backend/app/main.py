from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import resume, matching, rag, interview, evaluation

app = FastAPI(title="AI Interview System API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, change to your React app domain
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(resume.router, prefix="/api/resume", tags=["Resume"])
app.include_router(matching.router, prefix="/api/matching", tags=["Matching"])
app.include_router(rag.router, prefix="/api/rag", tags=["RAG Knowledge Base"])
app.include_router(interview.router, prefix="/api/interview", tags=["Interview Session"])
app.include_router(evaluation.router, prefix="/api/evaluation", tags=["Evaluation"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the AI Interview API"}