from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from app.services.matching_service import calculate_match_score, MatchResult

router = APIRouter()

class MatchRequest(BaseModel):
    resume_skills: List[str]
    job_requirements: List[str]

@router.post("/calculate", response_model=MatchResult)
async def match_resume_to_job(request: MatchRequest):
    try:
        result = calculate_match_score(request.resume_skills, request.job_requirements)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
