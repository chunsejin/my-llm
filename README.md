# my-llm

A Python (FastAPI) + React (Vite) monorepo skeleton for local-LLM applications.

## Project Overview
- Backend: FastAPI API server
- Frontend: React + TypeScript chat UI
- Local LLM: Ollama provider by default (extensible provider abstraction)

## Architecture
```text
.
├── backend/                  # FastAPI backend (Python 3.12, src layout)
│   ├── src/app/
│   │   ├── api/routes.py     # health, models, chat completions
│   │   ├── core/             # settings, logging, exception handlers
│   │   ├── models/schemas.py # request/response schemas
│   │   └── providers/        # LLM provider abstraction + ollama impl
│   ├── tests/test_api.py     # pytest sample tests
│   ├── pyproject.toml
│   └── Dockerfile
├── frontend/                 # Vite + React + TypeScript
│   ├── src/api/client.ts     # API client and streaming parser
│   ├── src/App.tsx           # model/prompt/message/stream UI
│   └── Dockerfile
├── docs/
├── .env.example
├── .editorconfig
├── .gitignore
├── .pre-commit-config.yaml
├── docker-compose.yml
├── Makefile
└── README.md
```

## Quick Start
1) Copy env files
```bash
cp .env.example .env
cp frontend/.env.example frontend/.env
```

2) Install dependencies
```bash
make install
```

3) Start development stack (backend + frontend + ollama)
```bash
make dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- Ollama: http://localhost:11434

## Prepare Ollama
1) Install Ollama: https://ollama.com/download
2) Pull model
```bash
ollama pull llama3.1:8b
```
3) Set `APP_DEFAULT_MODEL` in `.env` to your local model name

## Environment Variables
Main variables are defined in root `.env.example`.

- `APP_LLM_PROVIDER`: default `ollama`
- `APP_OLLAMA_BASE_URL`: Ollama API endpoint
- `APP_DEFAULT_MODEL`: default model name
- `APP_CORS_ORIGINS`: allowed frontend origins
- `VITE_API_BASE_URL`: backend URL for frontend

## Development and Testing
```bash
make lint
make test
```

Run services directly:
```bash
cd backend && uvicorn app.main:app --reload
cd frontend && npm run dev
```

## Extension Points
- Add `backend/src/app/providers/llama_cpp.py` and wire it in `get_provider`
- Add authentication/authorization layer
- Add chat history persistence
- Replace React hooks with Zustand if needed
