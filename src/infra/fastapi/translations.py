from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from src.core.translations import (
    Language,
    Translation,
    TranslationNotFoundError,
)
from src.infra.fastapi.dependables import (
    TranslationServiceDependable,
)

translation_router = APIRouter(tags=["Translations"])


class TranslationModel(BaseModel):
    id: str
    video_id: str
    from_seconds: float
    to_seconds: float
    from_language: Language
    to_language: Language
    original_text: str
    translated_text: str
    created_at: datetime

    @staticmethod
    def from_core(v: Translation) -> TranslationModel:
        return TranslationModel(
            id=v.id,
            video_id=v.video_id,
            from_seconds=v.from_seconds,
            to_seconds=v.to_seconds,
            from_language=v.from_language,
            to_language=v.to_language,
            original_text=v.original_text,
            translated_text=v.translated_text,
            created_at=v.created_at,
        )


class TranslationsModel(BaseModel):
    translations: list[TranslationModel]

    @staticmethod
    def from_core(translations: list[Translation]) -> TranslationsModel:
        return TranslationsModel(
            translations=[
                TranslationModel(
                    id=v.id,
                    video_id=v.video_id,
                    from_seconds=v.from_seconds,
                    to_seconds=v.to_seconds,
                    from_language=v.from_language,
                    to_language=v.to_language,
                    original_text=v.original_text,
                    translated_text=v.translated_text,
                    created_at=v.created_at,
                )
                for v in translations
            ]
        )


@translation_router.get("/translations", status_code=status.HTTP_200_OK)
def translations(service: TranslationServiceDependable) -> TranslationsModel:
    return TranslationsModel.from_core(service.get_translations())


@translation_router.get(
    "/translations/{translation_id}", status_code=status.HTTP_200_OK
)
def get_translation(
    translation_id: str, service: TranslationServiceDependable
) -> TranslationModel:
    try:
        translation = service.get_translation(translation_id)
    except TranslationNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e

    return TranslationModel.from_core(translation)


@translation_router.get(
    "/videos/{video_id}/translations", status_code=status.HTTP_200_OK
)
def get_translations_by_video(
    video_id: str, service: TranslationServiceDependable
) -> TranslationsModel:
    return TranslationsModel.from_core(service.get_translations_by_video(video_id))
