from collections.abc import Generator
from typing import Annotated, Any

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from src.core.base import Connector
from src.core.translations import TranslationService, Translator
from src.core.videos import (
    OCRGenerator,
    VideoDownloader,
    VideoService,
)


def inject(dependency: str) -> Any:
    def get(request: Request) -> Any:
        return getattr(request.app.state, dependency)

    return Depends(get)


ConnectorDependable = Annotated[Connector, inject("db")]


def get_session(connector: ConnectorDependable) -> Generator[Session]:
    with connector.session() as session, session.begin():
        yield session


SessionDependable = Annotated[Session, Depends(get_session)]
VideoDownloaderDependable = Annotated[VideoDownloader, inject("video_downloader")]
OCRGeneratorDependable = Annotated[OCRGenerator, inject("ocr_generator")]


def get_video_service(
    session: SessionDependable,
    video_downloader: VideoDownloaderDependable,
    ocr_generator: OCRGeneratorDependable,
) -> VideoService:
    return VideoService(
        session=session, video_downloader=video_downloader, ocr=ocr_generator
    )


VideoServiceDependable = Annotated[VideoService, Depends(get_video_service)]
TranslatorDependable = Annotated[Translator, inject("translator")]


def get_translation_service(
    session: SessionDependable,
    video_service: VideoServiceDependable,
    translator: TranslatorDependable,
) -> TranslationService:
    return TranslationService(
        session=session, video_service=video_service, translator=translator
    )


TranslationServiceDependable = Annotated[
    TranslationService, Depends(get_translation_service)
]
