import logging
from datetime import datetime

from fastapi import APIRouter, Header, HTTPException, status

from app.database import db
from app.schemas.analysis import AnalysisComplete, AnalysisCreate, AnalysisResponse
from app.services.auth_service import get_current_user

logger = logging.getLogger("soundwave.analysis")
router = APIRouter(prefix="/analysis", tags=["Analysis"])

ACTIVE_STATUSES = ["pending", "processing"]
ACTIVE_MESSAGE = "You already have an analysis in progress. Please wait for it to complete."


def serialize_analysis(doc) -> AnalysisResponse:
    return AnalysisResponse(
        id=str(doc["_id"]),
        user_id=str(doc["user_id"]),
        track_name=doc["track_name"],
        artist_name=doc.get("artist_name", ""),
        status=doc["status"],
        result=doc.get("result"),
        error_message=doc.get("error_message"),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
        completed_at=doc.get("completed_at"),
    )


@router.get("/current", response_model=AnalysisResponse | None)
async def current_analysis(authorization: str = Header(default="")):
    user = await get_current_user(authorization.replace("Bearer ", ""))
    doc = await db.analysis_requests.find_one({"user_id": str(user["_id"]), "status": {"$in": ACTIVE_STATUSES}})
    if not doc:
        return None
    logger.debug("Active analysis found for user %s", user["_id"])
    return serialize_analysis(doc)


@router.post("", response_model=AnalysisResponse, status_code=status.HTTP_201_CREATED)
async def create_analysis(payload: AnalysisCreate, authorization: str = Header(default="")):
    user = await get_current_user(authorization.replace("Bearer ", ""))
    existing = await db.analysis_requests.find_one({"user_id": str(user["_id"]), "status": {"$in": ACTIVE_STATUSES}})
    if existing:
        logger.info("Blocked duplicate analysis submission for user %s", user["_id"])
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=ACTIVE_MESSAGE)

    now = datetime.utcnow()
    doc = {
        "user_id": str(user["_id"]),
        "track_name": payload.track_name,
        "artist_name": payload.artist_name or "",
        "status": "pending",
        "result": None,
        "error_message": None,
        "created_at": now,
        "updated_at": now,
        "completed_at": None,
    }
    result = await db.analysis_requests.insert_one(doc)
    created = await db.analysis_requests.find_one({"_id": result.inserted_id})
    logger.info("Created analysis %s for user %s", result.inserted_id, user["_id"])
    return serialize_analysis(created)


@router.post("/{analysis_id}/complete", response_model=AnalysisResponse)
async def complete_analysis(
    analysis_id: str,
    payload: AnalysisComplete,
    authorization: str = Header(default=""),
):
    user = await get_current_user(authorization.replace("Bearer ", ""))
    existing = await db.analysis_requests.find_one({"_id": analysis_id, "user_id": str(user["_id"])})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis request not found")

    now = datetime.utcnow()
    await db.analysis_requests.update_one(
        {"_id": analysis_id, "user_id": str(user["_id"])},
        {"$set": {"status": "completed", "result": payload.result, "updated_at": now, "completed_at": now}},
    )
    completed = await db.analysis_requests.find_one({"_id": analysis_id, "user_id": str(user["_id"])})
    logger.info("Completed analysis %s for user %s", analysis_id, user["_id"])
    return serialize_analysis(completed)
