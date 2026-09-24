from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from pydantic import BaseModel
from typing import List
import os

class EvaluationResult(BaseModel):
    score: int
    feedback: str
    missing_concepts: List[str]
    next_difficulty: str

def evaluate_answer(question: str, user_answer: str, expected_concepts: List[str], current_difficulty: str) -> EvaluationResult:
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
