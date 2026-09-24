from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from pydantic import BaseModel
from typing import List
import os
from dotenv import load_dotenv

load_dotenv()

class JobRequirements(BaseModel):
    requirements: List[str]

def extract_job_requirements(jd_text: str) -> List[str]:
    llm = ChatGoogleGenerativeAI(
        model="gemini-3.5-flash-lite",
        temperature=0,
        google_api_key=os.getenv("GEMINI_API_KEY")
    )
    
    # We use structured output to force the LLM to return a clean list of strings
    structured_llm = llm.with_structured_output(JobRequirements)
    
    prompt = PromptTemplate(
        template="Extract the core technical skills and requirements from this job description. Return them as a list of short strings (e.g., 'Python', 'Docker', 'AWS').\n\nJob Description:\n{jd}",
        input_variables=["jd"]
    )
    
    chain = prompt | structured_llm
    result = chain.invoke({"jd": jd_text})
    return result.requirements
