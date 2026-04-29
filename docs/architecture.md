# Architecture (MVP)

## Data flow

1. Signal source emits amplitude samples (`mock` now, `hardware` later).
2. Backend normalizes/annotates samples.
3. WebSocket broadcaster pushes samples at fixed cadence (~60 Hz).
4. Frontend receives stream and maps amplitude to upward thrust.
5. Game physics applies gravity continuously.
6. Session analytics count successful swallows and duration above target line.

## Modularity goals

- Source adapter interface to swap mock and real sEMG input.
- Independent signal processing utilities.
- Decoupled WebSocket broadcasting service.
- Frontend state separated into stream, game physics, and analytics modules.
