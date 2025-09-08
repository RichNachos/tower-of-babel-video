import os

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from typer import Typer

from src.infra.downloaders.http import HttpVideoDownloader
from src.infra.fastapi.index import index_router
from src.infra.fastapi.translations import translation_router
from src.infra.fastapi.videos import video_router
from src.infra.translators.gemini import FakeGeminiTranslator, GeminiTranslator
from src.runner.config import connector

cli = Typer()


@cli.command(name="run")
def run(
    host: str = "0.0.0.0",
    port: int = 8000,
    root_path: str = "",
) -> None:  # pragma: no cover
    load_dotenv()
    uvicorn.run(
        app=get_app(),
        host=host,
        port=port,
        root_path=root_path,
    )


def get_app() -> FastAPI:
    app = FastAPI()
    app.state.db = connector()
    app.state.video_downloader = HttpVideoDownloader()

    app.state.translator = FakeGeminiTranslator()
    if "GEMINI_API_KEY" in os.environ:
        app.state.translator = GeminiTranslator(os.environ["GEMINI_API_KEY"])

    app.mount(
        "/static",
        StaticFiles(directory="src/infra/fastapi/static"),
        name="static",
    )
    app.mount(
        "/data",
        StaticFiles(directory="data"),
        name="data",
    )

    app.include_router(index_router)
    app.include_router(video_router)
    app.include_router(translation_router)

    return app
