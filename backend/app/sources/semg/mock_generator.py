import asyncio
import math
import random
import time
from contextlib import suppress

from app.core.config import settings
from app.sources.base import SampleSource

try:
    import msvcrt
except ImportError:  # pragma: no cover
    msvcrt = None


class MockSemgGenerator(SampleSource):
    """
    Spacebar triggers a swallow-like pulse envelope over baseline noise.
    Designed for local desktop testing.
    """

    def __init__(self) -> None:
        self._spike_progress = 0
        self._spike_length = int(settings.semg_hz * 0.65)
        self._running = False
        self._keyboard_task = None

    async def start(self) -> None:
        self._running = True
        if msvcrt:
            self._keyboard_task = asyncio.create_task(self._listen_keyboard())

    async def stop(self) -> None:
        self._running = False
        if self._keyboard_task:
            self._keyboard_task.cancel()
            with suppress(asyncio.CancelledError):
                await self._keyboard_task
            self._keyboard_task = None

    async def _listen_keyboard(self) -> None:
        while self._running:
            if msvcrt.kbhit():
                key = msvcrt.getch()
                if key == b" ":
                    self._spike_progress = self._spike_length
            await asyncio.sleep(0.01)

    def _spike_component(self) -> float:
        if self._spike_progress <= 0:
            return 0.0

        t = 1.0 - (self._spike_progress / self._spike_length)
        # Fast rise + slower decay envelope.
        value = math.sin(min(1.0, t * 1.8) * math.pi) * math.exp(-1.2 * t)
        self._spike_progress -= 1
        return max(0.0, value) * settings.semg_spike_peak

    def next_sample(self) -> dict:
        baseline = random.gauss(settings.semg_baseline_mean, settings.semg_baseline_noise)
        amplitude = baseline + self._spike_component()
        amplitude = max(0.0, min(1.0, amplitude))
        return {
            "timestamp_ms": int(time.time() * 1000),
            "amplitude": amplitude,
            "source": "mock_semg",
            "quality": 1.0,
        }
