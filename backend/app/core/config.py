from pydantic import BaseModel


class Settings(BaseModel):
    semg_hz: int = 60
    semg_baseline_mean: float = 0.06
    semg_baseline_noise: float = 0.015
    semg_spike_peak: float = 0.95


settings = Settings()

