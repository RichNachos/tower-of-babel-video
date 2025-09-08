from __future__ import annotations

from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, HttpUrl

index_router = APIRouter(tags=["Videos"])


class UploadVideo(BaseModel):
    video_url: HttpUrl


@index_router.post("/", status_code=status.HTTP_200_OK)
def upload(request: UploadVideo) -> JSONResponse:  # noqa: ARG001
    return JSONResponse("")
