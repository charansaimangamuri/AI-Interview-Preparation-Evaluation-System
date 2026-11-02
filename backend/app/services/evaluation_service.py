from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv

load_dotenv()

# ==========================================
# 1. Standard Single-Turn Evaluation Schema
# ==========================================
class EvaluationResult(BaseModel):
    score: int
    feedback: str
    missing_concepts: List[str]
    next_difficulty: str

def evaluate_answer(question: str, user_answer: str, expected_concepts: List[str], current_difficulty: str) -> EvaluationResult:
    """Standard evaluation that grades the candidate and returns immediate feedback."""
    llm = ChatGoogleGenerativeAI(
        model="gemini-3.5-flash-lite",
        temperature=0.2, # Low temperature for fair and consistent grading
        google_api_key=os.getenv("GEMINI_API_KEY")
    )
    
    parser = PydanticOutputParser(pydantic_object=EvaluationResult)
    
    prompt = PromptTemplate(
        template="""You are an expert technical interviewer evaluating a candidate's answer.
        
        Question asked: {question}
        Expected concepts they should have covered: {expected_concepts}
        Current Difficulty Level: {difficulty}
        
        Candidate's Answer:
        {answer}
        
        Evaluate the answer based on how well they covered the expected concepts.
        - Provide a score from 0 to 100.
        - Provide constructive feedback.
        - List any expected concepts they completely missed.
        - Based on their score, determine the next difficulty level (beginner, intermediate, advanced). If score > 80, increase difficulty. If score < 40, decrease difficulty. Otherwise, keep it the same.
        
        {format_instructions}""",
        input_variables=["question", "expected_concepts", "difficulty", "answer"],
        partial_variables={"format_instructions": parser.get_format_instructions()}
    )
    
    chain = prompt | llm | parser
    return chain.invoke({
        "question": question,
        "expected_concepts": ", ".join(expected_concepts),
        "difficulty": current_difficulty,
        "answer": user_answer
    })


# =======================================================
# 2. Multi-Turn Probing (Follow-Up Question) Schema & Logic
# =======================================================
class ProbeOrEvaluateResult(BaseModel):
    is_follow_up: bool
    follow_up_question: Optional[str] = None
    score: Optional[int] = None
    feedback: Optional[str] = None
    missing_concepts: List[str] = []
    next_difficulty: Optional[str] = None

def evaluate_or_probe_answer(
    question: str, 
    user_answer: str, 
    expected_concepts: List[str], 
    current_difficulty: str,
    probe_count: int = 0
) -> ProbeOrEvaluateResult:
    """
    Checks if the candidate's answer is shallow or incomplete.
    - If probe_count == 0 and the answer lacks depth: returns is_follow_up=True with a targeted follow-up question.
    - If probe_count >= 1 or the answer is already complete: returns final score & feedback.
    """
    # Guard: If candidate has already answered 1 follow-up for this question, force final grading
    if probe_count >= 1:
        final_eval = evaluate_answer(question, user_answer, expected_concepts, current_difficulty)
        return ProbeOrEvaluateResult(
            is_follow_up=False,
            follow_up_question=None,
            score=final_eval.score,
            feedback=final_eval.feedback,
            missing_concepts=final_eval.missing_concepts,
            next_difficulty=final_eval.next_difficulty
        )

    llm = ChatGoogleGenerativeAI(
        model="gemini-3.5-flash-lite",
        temperature=0.3,
        google_api_key=os.getenv("GEMINI_API_KEY")
    )

    parser = PydanticOutputParser(pydantic_object=ProbeOrEvaluateResult)

    prompt = PromptTemplate(
        template="""You are an expert technical interviewer conducting a live conversational interview.
        
        Question Asked: {question}
        Expected Core Concepts: {expected_concepts}
        Current Difficulty: {difficulty}
        Candidate's Answer: {answer}
        
        EVALUATION INSTRUCTIONS:
        1. Assess if the candidate gave a brief, vague, buzzword-heavy, or incomplete answer that would benefit from a probing follow-up question.
        2. If YES (they showed potential but missed architectural depth or trade-offs):
           - set `is_follow_up` to true.
           - set `follow_up_question` to a sharp, realistic follow-up question asking them to elaborate on a specific point (e.g. "You mentioned caching with Redis, but how would you handle cache invalidation or memory eviction?").
           - leave `score`, `feedback`, and `next_difficulty` as null.
        3. If NO (they answered thoroughly OR gave a completely invalid/empty answer):
           - set `is_follow_up` to false.
           - set `follow_up_question` to null.
           - provide `score` (0-100), constructive `feedback`, `missing_concepts`, and `next_difficulty`.
           
        {format_instructions}""",
        input_variables=["question", "expected_concepts", "difficulty", "answer"],
        partial_variables={"format_instructions": parser.get_format_instructions()}
    )

    chain = prompt | llm | parser
    return chain.invoke({
        "question": question,
        "expected_concepts": ", ".join(expected_concepts),
        "difficulty": current_difficulty,
        "answer": user_answer
    })