from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv

load_dotenv()

class InterviewQuestion(BaseModel):
    question: str
    topic: str
    expected_concepts: List[str]
    ideal_solution: str
    difficulty: str

PERSONA_PROMPTS = {
    "google": (
        "You are a strict Google 'Bar Raiser' interviewer. You care deeply about system scalability, "
        "low latency, algorithmic efficiency, distributed consensus, and extreme edge cases. "
        "Frame the question to test their architectural thinking at Google scale (millions of requests/sec)."
    ),
    "amazon": (
        "You are an Amazon Bar Raiser. You evaluate candidates through Amazon Leadership Principles "
        "(Customer Obsession, Ownership, Invent & Simplify, Bias for Action). "
        "Frame the technical question to include real-world customer impact and operational excellence."
    ),
    "startup": (
        "You are a pragmatic Y-Combinator Startup CTO. You care about shipping fast, pragmatic trade-offs, "
        "developer velocity, avoiding premature optimization, and debugging real-world production fires. "
        "Frame the question around practical, end-to-end full-stack problem-solving."
    ),
    "standard": (
        "You are a balanced Principal Software Architect conducting a structured technical interview."
    )
}

def generate_next_question(
    candidate_skills: List[str], 
    job_requirements: List[str], 
    role: str, 
    current_difficulty: str, 
    previous_questions: List[str], 
    context: str,
    interviewer_persona: str = "standard"
) -> InterviewQuestion:
    llm = ChatGoogleGenerativeAI(
        model="gemini-3.5-flash-lite",
        temperature=0.85,
        google_api_key=os.getenv("GEMINI_API_KEY")
    )
    
    parser = PydanticOutputParser(pydantic_object=InterviewQuestion)
    persona_instruction = PERSONA_PROMPTS.get(interviewer_persona.lower(), PERSONA_PROMPTS["standard"])
    
    prompt = PromptTemplate(
        template="""{persona_instruction}
        
        Candidate Skills (from Resume): {skills}
        Target Role: {role}
        Job Description Requirements: {job_reqs}
        Target Difficulty: {difficulty}
        
        Reference Knowledge:
        {context}
        
        Previous Questions Asked (CRITICAL: DO NOT REPEAT OR REPHRASE THESE):
        {previous}
        
        Generate the next interview question.
        CRITICAL RULE 1: The question MUST be 50% based on the candidate's Resume Skills and 50% based on the Job Requirements.
        CRITICAL RULE 2: You MUST generate a completely unique question that does not overlap with previous questions.
        CRITICAL RULE 3: Embody your designated interviewer persona in how you frame the question.
        
        Do not provide the answer in the question field.
        Instead, provide a comprehensive, model 'ideal_solution' that would score 100/100, which the user can review after they answer.
        
        {format_instructions}""",
        input_variables=["persona_instruction", "skills", "job_reqs", "role", "difficulty", "context", "previous"],
        partial_variables={"format_instructions": parser.get_format_instructions()}
    )
    
    chain = prompt | llm | parser
    return chain.invoke({
        "persona_instruction": persona_instruction,
        "skills": ", ".join(candidate_skills),
        "job_reqs": ", ".join(job_requirements) if job_requirements else "None",
        "role": role,
        "difficulty": current_difficulty,
        "context": context,
        "previous": "\n- ".join(previous_questions) if previous_questions else "None"
    })