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

async def wait_for_event(ws, target_event, timeout=4.0):
    end_time = asyncio.get_event_loop().time() + timeout
    while asyncio.get_event_loop().time() < end_time:
        try:
            msg = await asyncio.wait_for(ws.recv(), timeout=1.0)
            if msg == "pong" and target_event == "pong":
                return {"event": "pong"}
            data = json.loads(msg)
            if data.get("event") == target_event or data.get("type") == target_event:
                return data
        except (asyncio.TimeoutError, json.JSONDecodeError):
            continue
    return None

@pytest.mark.asyncio
async def test_websocket_handshake_and_ping():
    token = get_token()
    uri = f"{WS_URL}?token={token}"
    async with websockets.connect(uri) as ws:
        # Handshake confirmation
        handshake = await wait_for_event(ws, "CONNECTION_ESTABLISHED")
        assert handshake is not None

        # Ping-Pong command
        await ws.send(json.dumps({"action": "ping"}))
        pong = await wait_for_event(ws, "pong")
        assert pong is not None

@pytest.mark.asyncio
async def test_websocket_channel_subscription():
    token = get_token()
    uri = f"{WS_URL}?token={token}"
    async with websockets.connect(uri) as ws:
        await wait_for_event(ws, "CONNECTION_ESTABLISHED")

        # Subscribe to channel
        await ws.send(json.dumps({"action": "subscribe", "channel": "hospital:1"}))
        sub_resp = await wait_for_event(ws, "SUBSCRIBED")
        assert sub_resp is not None
        assert sub_resp.get("channel") == "hospital:1"
