from __future__ import annotations

import enum
import uuid
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Protocol

from moviepy import VideoFileClip
from sqlalchemy import DateTime, Enum, String, desc, func, select
from sqlalchemy.orm import Mapped, Session, mapped_column

from src.core import Base


class VideoType(enum.Enum):
    MP4 = "mp4"


class Video(Base):
    __tablename__ = "videos"

    original_url: Mapped[str] = mapped_column(String, nullable=False)

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default_factory=lambda: str(uuid.uuid4())
    )
    video_type: Mapped[VideoType] = mapped_column(
        Enum(VideoType),
        nullable=False,
        default=VideoType.MP4,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        init=False,
    )


@dataclass
class VideoMetadata:
    duration_sec: float
    width: int
    height: int


@dataclass
class VideoService:
    session: Session
    video_downloader: VideoDownloader

    def get_videos(self) -> list[Video]:
        return list(self.session.scalars(select(Video)).all())

    def add_video(self, video: Video) -> Video:
        self.video_downloader.download_video(
            url=video.original_url,
            local_path=Path("data/videos"),
            video_id=video.id,
            video_type=video.video_type,
        )
        self.session.add(video)
        self.session.flush()
        return self.get_video(video.id)

    def get_video(self, video_id: str) -> Video:
        video = self.session.scalars(
            select(Video).where(Video.id == video_id)
        ).one_or_none()

        if not video:
            raise VideoNotFoundError(f"Video with {id} not found.")

        return video

    def get_last_video(self) -> Video:
        video = (
            self.session.scalars(
                select(Video).order_by(
                    desc(Video.created_at),
                ),
            ).all()
        )  # Sqlite doesn't save microseconds for datetime, so this is a quick hack

        if not video:
            raise NoVideosError("No videos have been added yet.")

        return video[-1]

    def extract_video_metadata(
        self, video_id: str, video_type: VideoType = VideoType.MP4
    ) -> VideoMetadata:
        clip = VideoFileClip(f"data/videos/{video_id}.{video_type.value}")
        duration_seconds = clip.duration
        width = clip.w
        height = clip.h

        return VideoMetadata(
            duration_seconds,
            width,
            height,
        )


class VideoDownloader(Protocol):
    def download_video(
        self,
        url: str,
        local_path: Path,
        video_id: str,
        video_type: VideoType = VideoType.MP4,
    ) -> None: ...


class VideoDownloadError(Exception):
    pass


class NoVideosError(Exception):
    pass


class VideoNotFoundError(Exception):
    pass
