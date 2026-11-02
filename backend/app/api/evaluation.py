from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Optional
import os
import json
import asyncio
import joblib

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from app.services.evaluation_service import (
    evaluate_answer, 
    evaluate_or_probe_answer, 
    EvaluationResult, 
    ProbeOrEvaluateResult
)
from app.services.study_plan import generate_study_plan

router = APIRouter()

# ==========================================
# 1. Standard Evaluation (Existing Route)
# ==========================================
class EvaluationRequest(BaseModel):
    question: str
    user_answer: str
    expected_concepts: List[str]
    current_difficulty: str

@router.post("/evaluate", response_model=EvaluationResult)
async def evaluate_candidate_answer(request: EvaluationRequest):
    try:
        result = evaluate_answer(
            question=request.question,
            user_answer=request.user_answer,
            expected_concepts=request.expected_concepts,
            current_difficulty=request.current_difficulty
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================
# 2. Multi-Turn Probing Evaluation (Upgrade 1 Endpoint)
# =====================================================
class ProbeRequest(BaseModel):
    question: str
    user_answer: str
    expected_concepts: List[str]
    current_difficulty: str
    probe_count: int = 0

@router.post("/probe-evaluate", response_model=ProbeOrEvaluateResult)
async def probe_or_evaluate(request: ProbeRequest):
    """
    Checks candidate answer. Returns either a follow-up question (is_follow_up=True)
    or the final score and feedback (is_follow_up=False).
    """
    try:
        result = evaluate_or_probe_answer(
            question=request.question,
            user_answer=request.user_answer,
            expected_concepts=request.expected_concepts,
            current_difficulty=request.current_difficulty,
            probe_count=request.probe_count
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================
# 3. Real-Time Streaming Feedback (Upgrade 2 Endpoint)
# =====================================================
class StreamEvaluationRequest(BaseModel):
    question: str
    user_answer: str
    expected_concepts: List[str]

@router.post("/stream-feedback")
async def stream_feedback(request: StreamEvaluationRequest):
    """
    Streams qualitative evaluation token-by-token using Server-Sent Events (SSE).
    Eliminates wait times and provides immediate feedback.
    """
    llm = ChatGoogleGenerativeAI(
        model="gemini-3.5-flash-lite",
        temperature=0.3,
        google_api_key=os.getenv("GEMINI_API_KEY")
    )

    prompt = PromptTemplate.from_template(
        "You are an expert technical interviewer evaluating a candidate's answer.\n"
        "Question asked: {question}\n"
        "Expected Concepts: {concepts}\n"
        "Candidate's Answer: {answer}\n\n"
        "Provide constructive, detailed feedback in bullet points:\n"
        "1. What was strong and accurate about their answer.\n"
        "2. What technical depth or trade-offs they missed.\n"
        "3. How to elevate this answer to a Senior Engineer standard."
    )

    chain = prompt | llm

    async def event_generator():
        try:
            async for chunk in chain.astream({
                "question": request.question,
                "concepts": ", ".join(request.expected_concepts),
                "answer": request.user_answer
            }):
                content = chunk.content
                if isinstance(content, str):
                    yield f"data: {json.dumps({'text': content})}\n\n"
                elif isinstance(content, list) and len(content) > 0:
                    text_val = content[0].get('text', '') if isinstance(content[0], dict) else str(content[0])
                    yield f"data: {json.dumps({'text': text_val})}\n\n"
                await asyncio.sleep(0.01)
            yield "data: [DONE]\n\n"
        except Exception as err:
            yield f"data: {json.dumps({'error': str(err)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# ==========================================
# 4. ML Performance Prediction (Existing)
# ==========================================
class PredictRequest(BaseModel):
    avg_tech_score: float
    avg_coverage: float
    filler_rate: float

@router.post('/predict-performance')
async def predict_performance(request: PredictRequest):
    try:
        model_path = os.path.join(os.path.dirname(__file__), '..', 'models_ml', 'performance_model.pkl')
        if not os.path.exists(model_path):
            raise Exception('ML Model not trained yet.')
        model = joblib.load(model_path)
        prediction = model.predict([[request.avg_tech_score, request.avg_coverage, request.filler_rate]])
        return {'predicted_overall_score': round(prediction[0], 2)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# 5. Study Plan Generation (Existing)
# ==========================================
class StudyPlanRequest(BaseModel):
    topic_scores: Dict[str, int]
    available_days: int

@router.post('/study-plan')
async def get_study_plan(request: StudyPlanRequest):
    try:
        plan = generate_study_plan(request.topic_scores, request.available_days)
        return {'study_plan': plan}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))