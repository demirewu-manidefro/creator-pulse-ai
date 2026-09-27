from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uuid
from typing import Optional, List

from .services.inference import PrototypeInferenceService, AnalysisResult, Comment
from .services.fetcher import YouTubeFetcher

app = FastAPI(title="CreatorPulse Ethiopia API", version="1.0.0")

# Enable CORS for React frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory Task Database for MVP Background Workers
# In production, this would be Redis/PostgreSQL
task_db = {}

# Initialize services
# The inference service interface is clean, allowing easy swapping to XLM-RoBERTa later
fetcher = YouTubeFetcher()
inference_service = PrototypeInferenceService()

# --- Request / Response Models ---

class AnalyzeRequest(BaseModel):
    video_url: str

class TaskStatusResponse(BaseModel):
    task_id: str
    status: str
    result: Optional[AnalysisResult] = None
    error: Optional[str] = None

# --- Background Worker ---

async def process_video_task(task_id: str, video_url: str):
    """
    Non-blocking background worker that fetches and runs inference.
    """
    task_db[task_id] = {"status": "fetching_comments", "result": None}
    
    try:
        # 1. Fetch
        comments = await fetcher.fetch_comments(video_url)
        
        # 2. Analyze (Batch processing)
        task_db[task_id]["status"] = "running_inference"
        result = await inference_service.analyze_batch(comments, batch_size=64)
        
        # 3. Complete
        task_db[task_id]["status"] = "completed"
        task_db[task_id]["result"] = result
        
    except Exception as e:
        task_db[task_id]["status"] = "failed"
        task_db[task_id]["error"] = str(e)

# --- Endpoints ---

@app.post("/api/analyze-video", response_model=TaskStatusResponse)
async def analyze_video(req: AnalyzeRequest, background_tasks: BackgroundTasks):
    """
    Kicks off the analysis pipeline and returns a task ID immediately.
    """
    task_id = str(uuid.uuid4())
    task_db[task_id] = {"status": "pending", "result": None}
    
    background_tasks.add_task(process_video_task, task_id, req.video_url)
    
    return TaskStatusResponse(task_id=task_id, status="pending")

@app.get("/api/results/{task_id}", response_model=TaskStatusResponse)
async def get_results(task_id: str):
    """
    Polls the status of an analysis task.
    """
    if task_id not in task_db:
        raise HTTPException(status_code=404, detail="Task not found")
        
    data = task_db[task_id]
    return TaskStatusResponse(
        task_id=task_id,
        status=data["status"],
        result=data.get("result"),
        error=data.get("error")
    )

@app.post("/api/predict-batch", response_model=AnalysisResult)
async def predict_batch(comments: List[Comment]):
    """
    Direct synchronous endpoint for predicting a batch of comments.
    """
    return await inference_service.analyze_batch(comments)
