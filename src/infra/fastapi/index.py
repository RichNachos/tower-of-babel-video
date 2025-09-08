from __future__ import annotations

from fastapi import APIRouter, Request, status
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

index_router = APIRouter(tags=["Index"])


templates = Jinja2Templates(directory="src/infra/fastapi/templates")


@index_router.get("/", status_code=status.HTTP_200_OK)
def index(request: Request) -> HTMLResponse:
    return templates.TemplateResponse("index.html", {"request": request})
