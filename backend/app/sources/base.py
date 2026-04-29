from abc import ABC, abstractmethod
from typing import Dict


class SampleSource(ABC):
    @abstractmethod
    async def start(self) -> None:
        raise NotImplementedError

    @abstractmethod
    async def stop(self) -> None:
        raise NotImplementedError

    @abstractmethod
    def next_sample(self) -> Dict:
        raise NotImplementedError

