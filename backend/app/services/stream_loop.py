import asyncio
from contextlib import suppress

from app.core.config import settings


class SemgStreamLoop:
    def __init__(self, source, broadcaster) -> None:
        self.source = source
        self.broadcaster = broadcaster
        self._task = None
        self._running = False

    async def start(self) -> None:
        if self._running:
            return
        self._running = True
        await self.source.start()
        self._task = asyncio.create_task(self._run())

    async def stop(self) -> None:
        self._running = False
        if self._task:
            self._task.cancel()
            with suppress(asyncio.CancelledError):
                await self._task
            self._task = None
        await self.source.stop()

    async def _run(self) -> None:
        interval = 1.0 / settings.semg_hz
        while self._running:
            sample = self.source.next_sample()
            await self.broadcaster.broadcast_json(sample)
            await asyncio.sleep(interval)

