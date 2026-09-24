import chromadb
from chromadb.utils import embedding_functions
from pydantic import BaseModel
from typing import List

# Initialize ChromaDB locally in a persistent directory
chroma_client = chromadb.PersistentClient(path="./chroma_db")

# Use the same SentenceTransformer model for consistency
sentence_transformer_ef = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")

# Get or create the collection
collection = chroma_client.get_or_create_collection(
    name="interview_knowledge_base",
    embedding_function=sentence_transformer_ef
)

def ingest_documents(documents: List[str], metadatas: List[dict], ids: List[str]):
    """Adds document chunks to the vector database."""
    collection.add(
        documents=documents,
        metadatas=metadatas,
        ids=ids
    )

def retrieve_context(query: str, n_results: int = 3) -> str:
    """Searches the vector DB for context relevant to the query."""
    if collection.count() == 0:
        return "No reference knowledge available yet."
        
    results = collection.query(
        query_texts=[query],
        n_results=min(n_results, collection.count())
    )
    
    if results['documents'] and results['documents'][0]:
        # Combine retrieved chunks into a single context string
        return "\n\n".join(results['documents'][0])
    return "No relevant information found."
