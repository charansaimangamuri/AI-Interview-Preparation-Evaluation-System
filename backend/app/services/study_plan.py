from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
import os
from dotenv import load_dotenv

load_dotenv()

def generate_study_plan(topic_scores: dict, available_days: int) -> str:
    # Identify weak topics (e.g., score < 60)
    weak_topics = [topic for topic, score in topic_scores.items() if score < 60]
    
    if not weak_topics:
        return "Great job! You performed well across all topics. Keep practicing with mock interviews."
        
    llm = ChatGoogleGenerativeAI(
        model="gemini-3.5-flash-lite",
        temperature=0.5,
        google_api_key=os.getenv("GEMINI_API_KEY")
    )
    
    prompt = PromptTemplate(
        template="""You are a technical career coach. 
        The candidate has upcoming interviews in {days} days.
        Their weakest topics in the recent mock interview were: {weak_topics}.
        
        Generate a structured, day-by-day study plan to help them improve specifically on these topics.
        Include specific concepts to review and types of practical exercises they should do.
        Keep it actionable and concise.
        """,
        input_variables=["days", "weak_topics"]
    )
    
    chain = prompt | llm
    return chain.invoke({
        "days": available_days,
        "weak_topics": ", ".join(weak_topics)
    }).content
