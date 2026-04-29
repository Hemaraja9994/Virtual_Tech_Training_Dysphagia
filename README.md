# Multi-Modal Dysphagia Rehab Simulator

This repository contains an MVP for a dysphagia rehabilitation platform with an anti-gravity game controlled by swallowing effort.

## Supported input modes

- `sEMG`: streamed from a FastAPI WebSocket backend (mock generator for testing)
- `Webcam`: browser-local laryngeal elevation tracking
- `Microphone`: browser-local acoustic peak detection

## Stack

- Backend: FastAPI + WebSockets (Python) for sEMG stream only
- Frontend: React + HTML5 Canvas + TailwindCSS
- Browser APIs: MediaDevices, Web Audio, OpenCV.js/MediaPipe

## Structure

- `backend/`: sEMG mock generation and streaming server
- `frontend/`: dashboard, input manager, game engine, live graph
- `shared/`: data contracts for normalized intensity and payloads
- `docs/`: architecture and clinical design notes
