.PHONY: install dev test lint

install:
	python -m pip install -e ./backend[dev]
	cd frontend && npm install

dev:
	docker compose up --build

test:
	cd backend && pytest
	cd frontend && npm run test

lint:
	cd backend && ruff check . && ruff format --check .
	cd frontend && npm run lint
