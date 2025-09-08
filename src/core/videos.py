from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from typing import Protocol


@dataclass
class Video:
    original_name: str

    id: str = field(default_factory=lambda: str(uuid.uuid4()))


@dataclass
class VideoService:
    pass


class VideoRepository(Protocol):
    def select(self, video_id: str) -> Video: ...

    def insert(self, video: Video) -> None: ...
