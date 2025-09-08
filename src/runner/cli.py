import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI
from typer import Typer

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
    return FastAPI()
