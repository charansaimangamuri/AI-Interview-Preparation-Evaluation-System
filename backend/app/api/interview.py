from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional
from app.services.interview_service import generate_next_question, InterviewQuestion
from app.services.rag_service import retrieve_context
import tempfile
import os
from faster_whisper import WhisperModel

router = APIRouter()

# Load whisper model globally (downloads once on startup)
whisper_model = WhisperModel("base", device="cpu", compute_type="int8")

class QuestionRequest(BaseModel):
    candidate_skills: List[str]
    job_requirements: List[str] = []
    target_role: str
    current_difficulty: str
    previous_questions: List[str] = []
    current_topic: str
    interviewer_persona: Optional[str] = "standard"

@router.post("/generate-question", response_model=InterviewQuestion)
async def get_question(request: QuestionRequest):
    try:
        # Step 1: Retrieve context from our knowledge base
        context = retrieve_context(request.current_topic, n_results=1)
        
        # Step 2: Pass everything to LLM with chosen persona
        question_data = generate_next_question(
            candidate_skills=request.candidate_skills,
            job_requirements=request.job_requirements,
            role=request.target_role,
            current_difficulty=request.current_difficulty,
            previous_questions=request.previous_questions,
            context=context,
            interviewer_persona=request.interviewer_persona or "standard"
        )
        return question_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/transcribe')
async def transcribe_audio(audio_file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as temp_audio:
        content = await audio_file.read()
        temp_audio.write(content)
        temp_audio_path = temp_audio.name
    try:
        segments, info = whisper_model.transcribe(temp_audio_path, beam_size=5)
        transcript = ' '.join([segment.text for segment in segments])
        
        # Communication metric: filler word detection
        filler_words = ['um', 'uh', 'like', 'you know', 'actually']
        transcript_lower = transcript.lower()
        filler_count = sum(transcript_lower.count(fw) for fw in filler_words)
        word_count = len(transcript.split())
        filler_rate = (filler_count / word_count) * 100 if word_count > 0 else 0
        
        return {
            'transcript': transcript.strip(),
            'language': info.language,
            'filler_word_rate_percent': round(filler_rate, 2)
        }
    finally:
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)