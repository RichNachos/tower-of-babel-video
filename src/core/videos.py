from __future__ import annotations

import enum
import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import Protocol

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
class VideoService:
    session: Session

    def get_videos(self) -> list[Video]:
        return list(self.session.scalars(select(Video)).all())

    def add_video(self, video: Video) -> None:
        self.session.add(video)

    def get_last_video(self) -> Video:
        video = self.session.scalars(
            select(Video).order_by(desc(Video.created_at)).limit(1)
        ).one_or_none()

        if not video:
            raise NoVideosError("No videos have been added yet.")

        return video


@dataclass
class VideoDownloader(Protocol):
    def download_video(
        self,
        url: str,
        local_path: str,
        video_id: str,
        video_type: VideoType = VideoType.MP4,
    ) -> None: ...


class NoVideosError(Exception):
    pass
