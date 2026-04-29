from fastapi import APIRouter, WebSocket, WebSocketDisconnect


def build_ws_router(broadcaster):
    router = APIRouter()

    @router.websocket("/ws/semg")
    async def semg_stream(websocket: WebSocket) -> None:
        await broadcaster.connect(websocket)
        try:
            while True:
                # Keep socket alive; we only broadcast server->client samples.
                await websocket.receive_text()
        except WebSocketDisconnect:
            broadcaster.disconnect(websocket)
        except Exception:
            broadcaster.disconnect(websocket)

    return router
