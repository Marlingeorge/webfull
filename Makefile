.PHONY: build-frontend copy-frontend build backend-start

build-frontend:
	cd web/frontend && npm ci && npm run build

copy-frontend:
	python scripts/copy_frontend.py --source web/frontend/dist --dest backend/frontend/dist

build: build-frontend copy-frontend

backend-start:
	# Example: start backend with uvicorn (adjust as needed)
	uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
