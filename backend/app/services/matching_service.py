from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from pydantic import BaseModel
from typing import List, Dict, Any

# Load a small, fast model for semantic similarity (loads once on startup)
model = SentenceTransformer('all-MiniLM-L6-v2')

class MatchResult(BaseModel):
    overall_match_percentage: float
    matched_skills: List[Dict[str, Any]]
    missing_skills: List[str]

def calculate_match_score(resume_skills: List[str], job_requirements: List[str]) -> MatchResult:
    if not resume_skills or not job_requirements:
        return MatchResult(overall_match_percentage=0.0, matched_skills=[], missing_skills=job_requirements)

    # Generate vector embeddings for the text
    resume_embeddings = model.encode(resume_skills)
    job_embeddings = model.encode(job_requirements)
    
    # Calculate cosine similarity matrix (Job Req x Resume Skills)
    similarity_matrix = cosine_similarity(job_embeddings, resume_embeddings)
    
    matched = []
    missing = []
    total_score = 0
    
    # Threshold for considering a skill "matched" (0.55 allows semantic matches like 'ReactJS' and 'React.js')
    MATCH_THRESHOLD = 0.55 
    
    for i, req in enumerate(job_requirements):
        # Find the max similarity score for this job requirement against all resume skills
        best_match_score = np.max(similarity_matrix[i])
        best_match_idx = np.argmax(similarity_matrix[i])
        
        if best_match_score >= MATCH_THRESHOLD:
            matched.append({
                "requirement": req, 
                "matched_with": resume_skills[best_match_idx], 
                "score": round(float(best_match_score), 2)
            })
            total_score += best_match_score
        else:
            missing.append(req)
            
    # Normalize score 0-100
    overall_score = (total_score / len(job_requirements)) * 100 if job_requirements else 0
    
    return MatchResult(
        overall_match_percentage=round(overall_score, 2),
        matched_skills=matched,
        missing_skills=missing
    )
