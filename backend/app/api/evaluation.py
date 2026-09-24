from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import os
from app.services.evaluation_service import evaluate_answer, EvaluationResult

router = APIRouter()

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

import joblib

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


from app.services.study_plan import generate_study_plan
from typing import Dict

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

