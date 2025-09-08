from __future__ import annotations

from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, HttpUrl

video_router = APIRouter(tags=["Videos"])


class UploadVideo(BaseModel):
    video_url: HttpUrl


@video_router.post("/upload-video", status_code=status.HTTP_200_OK)
def upload_video(request: UploadVideo) -> JSONResponse:  # noqa: ARG001
    return JSONResponse("")
