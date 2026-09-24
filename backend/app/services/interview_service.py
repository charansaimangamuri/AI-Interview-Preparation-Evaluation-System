from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from pydantic import BaseModel
from typing import List
import os
from dotenv import load_dotenv

load_dotenv()

class InterviewQuestion(BaseModel):
    question: str
    topic: str
    expected_concepts: List[str]
    ideal_solution: str
    difficulty: str

def generate_next_question(candidate_skills: List[str], job_requirements: List[str], role: str, current_difficulty: str, previous_questions: List[str], context: str) -> InterviewQuestion:
    llm = ChatGoogleGenerativeAI(
        model="gemini-3.5-flash-lite",
        temperature=0.9, # High temperature to ensure varied questions and strict non-repetition
        google_api_key=os.getenv("GEMINI_API_KEY")
    )
    
    parser = PydanticOutputParser(pydantic_object=InterviewQuestion)
    
    prompt = PromptTemplate(
        template="""You are an expert technical interviewer.
        Candidate Skills (from Resume): {skills}
        Target Role: {role}
        Job Description Requirements: {job_reqs}
        Target Difficulty: {difficulty}
        
        Reference Knowledge:
        {context}
        
        Previous Questions Asked in this Interview (CRITICAL: DO NOT REPEAT OR REPHRASE THESE):
        {previous}
        
        Generate the next interview question. 
        CRITICAL RULE: The question MUST be 50% based on the candidate's Resume Skills and 50% based on the Job Requirements. Find the overlap or test them on a job requirement they might lack.
        CRITICAL RULE 2: You MUST generate a completely unique question that does not overlap with the 'Previous Questions Asked'.
        
        Do not provide the answer in the question field.
        Instead, provide a comprehensive, model 'ideal_solution' that would score 100/100, which the user can review after they answer.
        
        {format_instructions}""",
        input_variables=["skills", "job_reqs", "role", "difficulty", "context", "previous"],
        partial_variables={"format_instructions": parser.get_format_instructions()}
    )
    
    chain = prompt | llm | parser
    return chain.invoke({
        "skills": ", ".join(candidate_skills),
        "job_reqs": ", ".join(job_requirements) if job_requirements else "None",
        "role": role,
        "difficulty": current_difficulty,
        "context": context,
        "previous": "\n- ".join(previous_questions) if previous_questions else "None"
    })
