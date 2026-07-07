from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_check() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_chat_completions_validation() -> None:
    response = client.post("/api/v1/chat/completions", json={"user_message": ""})
    assert response.status_code == 422
