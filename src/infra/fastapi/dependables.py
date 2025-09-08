from collections.abc import Generator
from typing import Annotated, Any

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from src.core.base import Connector
from src.core.videos import (
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


def get_video_service(
    session: SessionDependable,
    video_downloader: VideoDownloaderDependable,
) -> VideoService:
    return VideoService(session=session, video_downloader=video_downloader)


VideoServiceDependable = Annotated[VideoService, Depends(get_video_service)]
