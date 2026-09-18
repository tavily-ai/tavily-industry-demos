"""Serve a built SPA after the API routes without hiding missing API endpoints."""

from pathlib import Path

from fastapi import FastAPI
from starlette.exceptions import HTTPException
from starlette.staticfiles import StaticFiles


class SPAStaticFiles(StaticFiles):
    async def get_response(self, path, scope):
        try:
            return await super().get_response(path, scope)
        except HTTPException as error:
            first_segment = path.split("/", 1)[0]
            api_path = first_segment in {"api", "health", "research", "generate-pdf"}
            asset_path = "." in path.rsplit("/", 1)[-1] or first_segment == "assets"
            if error.status_code != 404 or api_path or asset_path:
                raise
            return await super().get_response("index.html", scope)


def mount_ui(app: FastAPI, directory: Path) -> None:
    # Local development can run Vite without a production UI build.
    if directory.is_dir():
        app.mount("/", SPAStaticFiles(directory=directory, html=True), name="ui")
