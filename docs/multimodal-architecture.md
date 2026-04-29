# Multi-Modal Architecture

## Goal

Support three interchangeable input modules selected by clinician:

1. `semg`
2. `webcam`
3. `microphone`

All modules publish into one shared signal:

- `normalized_swallow_intensity` in range `[0.0, 1.0]`

## Core design

Use an adapter pattern in frontend:

- `InputAdapter` contract:
  - `start(config)`
  - `stop()`
  - `onSample(callback)`
- Each adapter emits:
  - `raw_value`
  - `normalized_value`
  - `timestamp_ms`
  - `quality` (optional confidence / tracking quality)

`InputManager` responsibilities:

- Hold active input type from dropdown.
- Start/stop selected adapter.
- Apply gain and threshold consistently across all modes.
- Expose:
  - current `normalized_swallow_intensity`
  - raw signal stream for graph
  - module health/status

## Data flow

1. Clinician selects input mode.
2. Adapter emits raw samples.
3. InputManager applies:
   - baseline correction
   - gain/sensitivity
   - threshold gate
   - clamp to `[0, 1]`
4. Game engine consumes normalized intensity for thrust.
5. Graph consumes raw sample buffer for clinical monitoring.

## Backend boundary

Backend exists for sEMG stream only:

- `mock_generator.py` produces baseline + key-triggered spikes.
- FastAPI WebSocket endpoint broadcasts samples.
- Frontend `semg` adapter reads stream and normalizes in browser.

Webcam and microphone pipelines remain browser-local for privacy.
