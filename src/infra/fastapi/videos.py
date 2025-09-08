from __future__ import annotations

import os
from datetime import datetime

from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, HttpUrl, field_validator

from src.core.videos import VideoType
from src.infra.fastapi.dependables import VideoServiceDependable

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
def upload_video(request: UploadVideo, service: VideoServiceDependable) -> JSONResponse:  # noqa: ARG001
    return JSONResponse("")


class Video(BaseModel):
    id: str
    original_url: str
    video_type: str
    created_at: datetime


class Videos(BaseModel):
    videos: list[Video]


@video_router.get("/videos", status_code=status.HTTP_200_OK)
def videos(service: VideoServiceDependable) -> Videos:
    return Videos(
        videos=[
            Video(
                id=v.id,
                original_url=v.original_url,
                video_type=v.video_type.value,
                created_at=v.created_at,
            )
            for v in service.get_videos()
        ]
    )
