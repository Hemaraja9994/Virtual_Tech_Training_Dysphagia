# Backend

FastAPI service responsible for ingesting sEMG data source samples and streaming them to clients over WebSockets.

## Planned modules

- `app/main.py`: FastAPI app and routes
- `app/core/config.py`: runtime settings (tick rate, host, ports)
- `app/models/semg.py`: data contracts
- `app/sources/`: source adapters (mock, serial, bluetooth)
- `app/services/`: stream loop and broadcast manager
