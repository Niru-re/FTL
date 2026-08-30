import pytest
import asyncio
import json
import websockets
import requests

BASE_URL = "http://127.0.0.1:8000"
WS_URL = "ws://127.0.0.1:8000/api/ws"

def get_token():
    res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@healthnet.demo", "password": "admin123"})
    return res.json()["access_token"]

@pytest.mark.asyncio
async def test_websocket_reconnection_resilience():
    token = get_token()
    uri = f"{WS_URL}?token={token}"

    # Connect 1
    async with websockets.connect(uri) as ws1:
        data1 = json.loads(await ws1.recv())
        assert data1.get("event") == "CONNECTION_ESTABLISHED"

    # Immediate Reconnect 2
    async with websockets.connect(uri) as ws2:
        data2 = json.loads(await ws2.recv())
        assert data2.get("event") == "CONNECTION_ESTABLISHED"
