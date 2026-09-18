def test_index(client):
    res = client.get("/")
    assert res.status_code == 200
    body = res.get_json()
    assert body["service"] == "GrunRay wiki API"


def test_health(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.get_json() == {"ok": True}


def test_robots_txt(client):
    res = client.get("/robots.txt")
    assert res.status_code == 200
    text = res.get_data(as_text=True)
    assert "Disallow: /api/" in text
    assert "Sitemap:" in text
