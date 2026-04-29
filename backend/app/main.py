from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.services.broadcaster import WebSocketBroadcaster
from app.services.stream_loop import SemgStreamLoop
from app.sources.semg.mock_generator import MockSemgGenerator
from app.ws.routes import build_ws_router

broadcaster = WebSocketBroadcaster()
source = MockSemgGenerator()
stream_loop = SemgStreamLoop(source=source, broadcaster=broadcaster)


@asynccontextmanager
async def lifespan(_: FastAPI):
    await stream_loop.start()
    yield
    await stream_loop.stop()


app = FastAPI(title="Dysphagia sEMG Stream Server", lifespan=lifespan)
app.include_router(build_ws_router(broadcaster))


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "stream_hz": 60}

