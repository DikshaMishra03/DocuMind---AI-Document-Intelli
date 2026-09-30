from fastapi import status

def test_health_endpoint(client):
    """Verifies that the /api/health endpoint returns status 200 and expected metadata."""
    response = client.get("/api/health")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "status" in data
    assert data["app_name"] == "DocuMind"
    assert "database" in data
    assert "vector_store" in data

def test_root_endpoint(client):
    """Verifies the root endpoint returns API links."""
    response = client.get("/")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["app"] == "DocuMind"
    assert data["docs"] == "/docs"
