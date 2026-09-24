from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from app.services.rag_service import ingest_documents, retrieve_context
import uuid

router = APIRouter()

class IngestRequest(BaseModel):
    text: str
    topic: str

class SearchRequest(BaseModel):
    query: str
    top_k: int = 3

@router.post("/ingest")
async def add_knowledge(request: IngestRequest):
    try:
        # In a real app, you would chunk long text first. For MVP, we ingest it as one block.
        doc_id = str(uuid.uuid4())
        ingest_documents(
            documents=[request.text],
            metadatas=[{"topic": request.topic}],
            ids=[doc_id]
        )
        return {"message": "Knowledge ingested successfully", "doc_id": doc_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/search")
async def search_knowledge(request: SearchRequest):
    try:
        context = retrieve_context(request.query, request.top_k)
        return {"retrieved_context": context}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
