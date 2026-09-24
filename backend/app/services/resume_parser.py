import pymupdf
from pydantic import BaseModel
from typing import List
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
import os
from dotenv import load_dotenv

# Load the API key from the .env file
load_dotenv()

# 1. Define exactly what information we want the AI to extract
class CandidateProfile(BaseModel):
    name: str
    skills: List[str]
    projects: List[str]
    years_of_experience: int

# 2. Function to read the raw text from the PDF file
def extract_text_from_pdf(file_path: str) -> str:
    doc = pymupdf.open(file_path)
    text = "\n".join([page.get_text() for page in doc])
    return text

# 3. Function to send the text to the LLM and get structured JSON back
def extract_skills_with_llm(raw_text: str) -> CandidateProfile:
    # Use the generous free tier model from Google
    llm = ChatGoogleGenerativeAI(
        model="gemini-3.5-flash-lite",
        temperature=0,
        google_api_key=os.getenv("GEMINI_API_KEY")
    )
    
    # This parser forces the AI to reply in the exact format of CandidateProfile above
    parser = PydanticOutputParser(pydantic_object=CandidateProfile)
    
    prompt = PromptTemplate(
        template="Extract the candidate's information from the following resume text.\n{format_instructions}\n\nResume Text:\n{resume_text}",
        input_variables=["resume_text"],
        partial_variables={"format_instructions": parser.get_format_instructions()}
    )
    
    # Create the processing chain and run it
    chain = prompt | llm | parser
    return chain.invoke({"resume_text": raw_text})
