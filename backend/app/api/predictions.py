from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, status
from app.schemas.prediction import ResourcePredictionResponse
from app.services.occupancy_service import occupancy_service
from app.database.repositories.resource_repo import resource_repository
from app.ml.predict import predict_resource_crowd

router = APIRouter(prefix="/predictions", tags=["Crowd Predictions (ML)"])


@router.get("", response_model=List[ResourcePredictionResponse], summary="Campus-wide crowd predictions for all resources")
async def get_all_predictions():
    """
    Returns AI-generated XGBoost occupancy predictions across all campus facilities
    for 30 minutes, 1 hour, 2 hours, and 4 hours horizons.
    """
    resources = await resource_repository.get_all()
    results = []

    for res in resources:
        res_id = res.get("resource_id") or res.get("id")
        live_occ = await occupancy_service.get_live_occupancy_by_resource(res_id)
        if live_occ:
            prediction = predict_resource_crowd(res, live_occ)
            results.append(prediction)

    return results


@router.get("/{resource_id}", response_model=ResourcePredictionResponse, summary="Future crowd predictions for a specific resource")
async def get_resource_prediction(resource_id: str):
    """
    Forecasts future occupancy and crowd pressure for a single resource
    across 30m, 1h, 2h, and 4h horizons using trained XGBoost regression models.
    """
    resource = await resource_repository.get_by_resource_id(resource_id)
    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resource '{resource_id}' was not found.",
        )

    live_occ = await occupancy_service.get_live_occupancy_by_resource(resource_id)
    if not live_occ:
        live_occ = {
            "current_occupancy": resource.get("current_occupancy", 0),
            "occupancy_percentage": resource.get("occupancy_percentage", 0.0),
            "entry_count": 0,
            "exit_count": 0,
        }

    return predict_resource_crowd(resource, live_occ)
