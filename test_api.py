from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_api():
    print("Testing / ...")
    r = client.get("/")
    assert r.status_code == 200
    print("Root response:", r.json())

    print("\nTesting /api/floors ...")
    r = client.get("/api/floors")
    assert r.status_code == 200
    assert len(r.json()) == 6
    print(f"Floors count: {len(r.json())}")

    print("\nTesting /api/locations/search?q=214 ...")
    r = client.get("/api/locations/search?q=214")
    assert r.status_code == 200
    results = r.json()
    assert len(results) > 0
    print(f"Search '214' returned {len(results)} matches. Top match: {results[0]['name']}")

    print("\nTesting /api/locations/search?q=principal ...")
    r = client.get("/api/locations/search?q=principal")
    assert r.status_code == 200
    results = r.json()
    assert len(results) > 0
    print(f"Search 'principal' top match: {results[0]['name']}")

    print("\nTesting /api/route (Fastest) ...")
    route_payload = {
        "start_node": "N_G_S_ENT",
        "destination_node": "R214",
        "mode": "fastest"
    }
    r = client.post("/api/route", json=route_payload)
    assert r.status_code == 200
    data = r.json()
    print("Route found! Distance:", data['route']['distance'], "m, ETA:", data['route']['eta_seconds'], "s")
    print("Instructions count:", len(data['route']['instructions']))

    print("\nTesting /api/route (Accessible) ...")
    route_payload["mode"] = "accessible"
    r = client.post("/api/route", json=route_payload)
    assert r.status_code == 200
    data = r.json()
    print("Accessible Route: Elevator used =", data['route']['elevator_used'], "Stairs count =", data['route']['stairs_count'])
    assert data['route']['stairs_count'] == 0
    assert data['route']['elevator_used'] == True

    print("\nTesting /api/qr/resolve ...")
    r = client.post("/api/qr/resolve", json={"code": "SAHYADRI_QR_ST2_B"})
    assert r.status_code == 200
    qr_res = r.json()
    print("Resolved QR:", qr_res['checkpoint']['name'], "on floor", qr_res['floor'])

    print("\nTesting /api/issues ...")
    r = client.get("/api/issues")
    assert r.status_code == 200
    print("Active issues count:", len(r.json()))

    print("\nTesting /api/ocr/detect-sign ...")
    r = client.post("/api/ocr/detect-sign", json={"detected_text": "Room 214 Faculty Dept"})
    assert r.status_code == 200
    ocr_res = r.json()
    print("OCR detected:", ocr_res['message'])

    print("\nALL BACKEND API TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_api()
