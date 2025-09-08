from __future__ import annotations

import os
from datetime import datetime

from fastapi import APIRouter, HTTPException, Response, status
from pydantic import BaseModel, HttpUrl, field_validator

from src.core.translations import Language, TranslatorError
from src.core.videos import (
    AudioExtractionError,
    NoVideosError,
    VideoDownloadError,
    VideoNotFoundError,
    VideoType,
)
from src.core.videos import Video as CoreVideo
from src.core.videos import VideoMetadata as CoreVideoMetadata
from src.infra.fastapi.dependables import (
    TranslationServiceDependable,
    VideoServiceDependable,
)

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


class VideoMetadata(BaseModel):
    duration_seconds: float
    width: int
    height: int

    @staticmethod
    def from_core(v: CoreVideoMetadata) -> VideoMetadata:
        return VideoMetadata(
            duration_seconds=v.duration_sec,
            width=v.width,
            height=v.height,
        )


class Video(BaseModel):
    id: str
    original_url: str
    video_type: str
    created_at: datetime
    metadata: VideoMetadata

    @staticmethod
    def from_core(v: CoreVideo, mt: CoreVideoMetadata) -> Video:
        return Video(
            id=v.id,
            original_url=v.original_url,
            video_type=v.video_type.value,
            created_at=v.created_at,
            metadata=VideoMetadata.from_core(mt),
        )


class Videos(BaseModel):
    videos: list[Video]


@video_router.post("/videos", status_code=status.HTTP_200_OK)
def upload_video(request: UploadVideo, service: VideoServiceDependable) -> Video:
    try:
        video = service.add_video(CoreVideo(original_url=str(request.video_url)))
    except VideoDownloadError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    return Video.from_core(
        video,
        service.extract_video_metadata(
            video.id,
            video.video_type,
        ),
    )


@video_router.get("/videos", status_code=status.HTTP_200_OK)
def videos(service: VideoServiceDependable) -> Videos:
    return Videos(
        videos=[
            Video.from_core(
                v,
                service.extract_video_metadata(
                    v.id,
                    v.video_type,
                ),
            )
            for v in service.get_videos()
        ]
    )


@video_router.get("/videos/last", status_code=status.HTTP_200_OK)
def get_last_video(service: VideoServiceDependable) -> Video:
    try:
        video = service.get_last_video()
    except NoVideosError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e

    return Video.from_core(
        video,
        service.extract_video_metadata(
            video.id,
            video.video_type,
        ),
    )


@video_router.get(
    "/videos/{video_id}/audio-segment",
    status_code=status.HTTP_200_OK,
    response_class=Response,
)
def get_audio_segment(
    video_id: str,
    from_seconds: float,
    to_seconds: float,
    service: VideoServiceDependable,
) -> Response:
    try:
        video = service.get_video(video_id)

        audio_stream = service.extract_audio_segment(
            video_id=video.id,
            video_type=video.video_type,
            from_seconds=from_seconds,
            to_seconds=to_seconds,
        )

        return Response(content=audio_stream.read(), media_type="audio/wav")

    except VideoNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except (ValueError, AudioExtractionError) as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


class TranslationRequest(BaseModel):
    from_language: Language
    to_language: Language
    from_seconds: float
    to_seconds: float


class TranslationResponse(BaseModel):
    original_text: str
    translated_text: str


@video_router.post(
    "/videos/{video_id}/audio-segment/translate",
    status_code=status.HTTP_200_OK,
)
def translate_audio_segment(
    video_id: str,
    request: TranslationRequest,
    video_service: VideoServiceDependable,
    translation_service: TranslationServiceDependable,
) -> TranslationResponse:
    try:
        video = video_service.get_video(video_id)
    except VideoNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e

    try:
        translation = translation_service.translate_audio_segment(
            video.id,
            video.video_type,
            request.from_seconds,
            request.to_seconds,
            request.from_language,
            request.to_language,
        )
    except TranslatorError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    return TranslationResponse(
        original_text=translation.original_text,
        translated_text=translation.translated_text,
    )
