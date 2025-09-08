from __future__ import annotations

import os

from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, HttpUrl, field_validator

from src.core.videos import VideoType

video_router = APIRouter(tags=["Videos"])


class UploadVideo(BaseModel):
    video_url: HttpUrl

    @field_validator("video_url")
    @classmethod
    def validate_mp4_format(cls, url: HttpUrl) -> HttpUrl:
        if not url:
            raise ValueError("No empty video allowed.")

        _, ext = os.path.splitext(str(url.path))

        if ext[1:].lower() not in [t.value for t in VideoType]:
            raise ValueError("Video must be in .mp4 format.")

        return url


@video_router.post("/upload-video", status_code=status.HTTP_200_OK)
def upload_video(request: UploadVideo) -> JSONResponse:  # noqa: ARG001
    return JSONResponse("")
