from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.resume_parser import extract_text_from_pdf, extract_skills_with_llm
import tempfile
import os

router = APIRouter()

@router.post("/upload")
async def upload_resume(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    # Save the uploaded file to a temporary location
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name

        # Extract text from the PDF using PyMuPDF
        raw_text = extract_text_from_pdf(temp_path)
        
        # Use Gemini LLM to extract structured data (skills, projects, etc.)
        profile = extract_skills_with_llm(raw_text)
        
        return {
            "message": "Resume parsed successfully",
            "data": profile
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Always clean up the temporary file
        if 'temp_path' in locals() and os.path.exists(temp_path):
            os.remove(temp_path)

from pydantic import BaseModel
from app.services.job_parser import extract_job_requirements

class JDRequest(BaseModel):
    job_description: str

@router.post('/extract-job-requirements')
async def extract_reqs(request: JDRequest):
    try:
        reqs = extract_job_requirements(request.job_description)
        return {'requirements': reqs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

