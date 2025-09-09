from __future__ import annotations

import enum
import uuid
import wave
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import BinaryIO, Protocol

from sqlalchemy import DateTime, Enum, Float, ForeignKey, String, func, select
from sqlalchemy.orm import Mapped, Session, mapped_column

from src.core import Base
from src.core.videos import VideoService, VideoType


class Language(enum.Enum):
    ENGLISH = "English"
    SPANISH = "Spanish"


class Translation(Base):
    __tablename__ = "translations"

    video_id: Mapped[str] = mapped_column(
        String,
        ForeignKey("videos.id"),
        nullable=False,
        index=True,
    )
    from_seconds: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )
    to_seconds: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )
    from_language: Mapped[Language] = mapped_column(
        Enum(Language),
        nullable=False,
    )
    to_language: Mapped[Language] = mapped_column(
        Enum(Language),
        nullable=False,
    )
    original_text: Mapped[str] = mapped_column(
        String,
        nullable=False,
    )
    translated_text: Mapped[str] = mapped_column(
        String,
        nullable=False,
    )

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default_factory=lambda: str(uuid.uuid4())
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        init=False,
    )


@dataclass
class TranslationService:
    session: Session
    video_service: VideoService
    translator: Translator
    tts: TTSGenerator

    def get_translations(self) -> list[Translation]:
        return list(self.session.scalars(select(Translation)).all())

    def get_translation(self, translation_id: str) -> Translation:
        translation = self.session.scalars(
            select(Translation).where(Translation.id == translation_id)
        ).one_or_none()

        if not translation:
            raise TranslationNotFoundError(
                f"Translation with id {translation_id} not found."
            )

        return translation

    def get_translations_by_video(self, video_id: str) -> list[Translation]:
        return list(
            self.session.scalars(
                select(Translation).where(Translation.video_id == video_id)
            ).all()
        )

    def generate_speech_for_translation(self, translation_id: str) -> Translation:
        translation = self.get_translation(translation_id)
        wave_file = Path(f"data/speeches/{translation.id}.wav")

        if wave_file.exists():
            raise TTSError("Audio for that translation already exists.")

        data = self.tts.text_to_speech(translation)

        # Values from google docs
        with wave.open(str(wave_file), "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(24000)
            wf.writeframes(data)

        return translation

    def translate_audio_segment(
        self,
        video_id: str,
        video_type: VideoType,
        from_seconds: float,
        to_seconds: float,
        from_language: Language,
        to_language: Language,
    ) -> Translation:
        audio = self.video_service.extract_audio_segment(
            video_id,
            video_type,
            from_seconds,
            to_seconds,
        )

        response = self.translator.translate(
            audio,
            from_language,
            to_language,
        )

        translation = Translation(
            video_id,
            from_seconds,
            to_seconds,
            from_language,
            to_language,
            response.original_text,
            response.translated_text,
        )

        self.session.add(translation)
        self.session.flush()
        return translation


class TranslationNotFoundError(Exception):
    pass


@dataclass
class TranslatorResponse:
    original_text: str
    translated_text: str


class Translator(Protocol):
    def translate(
        self,
        file: BinaryIO,
        from_language: Language,
        to_language: Language,
    ) -> TranslatorResponse: ...


class TTSGenerator(Protocol):
    def text_to_speech(self, translation: Translation) -> bytes: ...


class TranslatorError(Exception):
    pass


class OCRError(Exception):
    pass


class TTSError(Exception):
    pass
