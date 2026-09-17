"""
FastAPI REST API Service for OTT Audience Intelligence & Behavioral Segmentation.
Exposes endpoints for prediction, segment discovery, metadata, and health checks.
"""

import os
import sys
# Ensure repository root is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import logging
import datetime
from fastapi import FastAPI, HTTPException, status, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError

from app.schemas import (
    ViewerBehaviorInput,
    PredictionResponse,
    BatchPredictionRequest,
    BatchPredictionResponse,
    SegmentsListResponse,
    SegmentDetailResponse,
    HealthResponse,
    InfoResponse
)
from app.model_service import model_service

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("ott_audience_api")

app = FastAPI(
    title="OTT Audience Intelligence & Behavioral Segmentation Service",
    description=(
        "Production-style unsupervised machine learning service discovering natural "
        "viewer behavioral clusters for downstream streaming platform personalization."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware to allow frontend dashboard and external clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Clean validation error response with 422 Unprocessable Entity"""
    logger.warning(f"Validation failure on {request.url.path}: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation Error",
            "message": "Input data failed schema validation.",
            "details": exc.errors()
        }
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Internal server error handler to prevent raw stack trace leak"""
    logger.error(f"Internal server error on {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Service Error",
            "message": "An error occurred while processing the behavioral segmentation request."
        }
    )


@app.get("/health", response_model=HealthResponse, tags=["Monitoring"])
async def get_health():
    """
    Health check endpoint for container orchestrators and load balancers.
    """
    return HealthResponse(
        status="healthy" if model_service.is_loaded else "degraded",
        model_loaded=model_service.is_loaded,
        timestamp=datetime.datetime.utcnow().isoformat() + "Z"
    )


@app.get("/info", response_model=InfoResponse, tags=["Model Intelligence"])
async def get_info():
    """
    Returns trained model specification, features, metadata, and cluster parameters.
    """
    if not model_service.is_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model is not yet initialized or loaded."
        )
    return model_service.get_info()


@app.get("/segments", response_model=SegmentsListResponse, tags=["Audience Segments"])
async def get_segments():
    """
    Returns all discovered audience segments with sizes, percentages, and names.
    """
    if not model_service.is_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model is not yet loaded."
        )
    segments = model_service.get_segments()
    total_users = sum(s["user_count"] for s in segments) if segments else 0
    return {
        "total_users": total_users,
        "n_clusters": len(segments),
        "segments": segments
    }


@app.get("/segments/{cluster_id}", response_model=SegmentDetailResponse, tags=["Audience Segments"])
async def get_segment_detail(cluster_id: int):
    """
    Returns detailed behavioral breakdown, average metrics, and characteristics for a specific segment.
    """
    segment = model_service.get_segment_by_id(cluster_id)
    if not segment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Audience segment with cluster ID {cluster_id} not found."
        )
    return segment


@app.post("/predict", response_model=PredictionResponse, tags=["Inference"])
async def predict_segment(viewer: ViewerBehaviorInput):
    """
    Classifies a viewer's behavioral parameters into an audience segment.
    Uses identical fitted preprocessing + K-Means model without retraining.
    """
    if not model_service.is_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model is not loaded."
        )
    try:
        data_dict = viewer.model_dump()
        result = model_service.predict(data_dict)
        return result
    except Exception as e:
        logger.error(f"Inference error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {str(e)}"
        )


@app.post("/predict/batch", response_model=BatchPredictionResponse, tags=["Inference"])
async def predict_batch_segments(payload: BatchPredictionRequest):
    """
    Batch classification for multiple viewers. Privacy-conscious; uses user references.
    """
    if not model_service.is_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model is not loaded."
        )
    try:
        items = [v.model_dump() for v in payload.viewers]
        results = model_service.predict_batch(items)
        return {
            "count": len(results),
            "results": results
        }
    except Exception as e:
        logger.error(f"Batch inference error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Batch prediction failed: {str(e)}"
        )


@app.get("/pca", tags=["Visualization"])
async def get_pca_projection():
    """
    Returns 2D PCA projection of viewer behavioral points and centroids for visualization.
    """
    pca_data = model_service.get_pca()
    if not pca_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PCA visualization data not available. Please run model training."
        )
    return pca_data


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=False)
