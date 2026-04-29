# WebSocket sample protocol (draft)

Each emitted JSON message:

```json
{
  "timestamp_ms": 0,
  "amplitude": 0.0,
  "source": "mock",
  "event": "baseline"
}
```

Event candidates:

- `baseline`
- `swallow_rise`
- `swallow_decay`
