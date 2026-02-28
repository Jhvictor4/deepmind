"""SafeNav – Google GenAI Live API + WebSocket bridge for Chrome extension."""

import asyncio
import base64
import io
import json
import logging
import os
import uuid

import pyaudio
import websockets
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv(dotenv_path=".env.local")

logger = logging.getLogger("safenav")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s %(message)s",
)

# ── Audio config ──

FORMAT = pyaudio.paInt16
CHANNELS = 1
SEND_SAMPLE_RATE = 16000
RECEIVE_SAMPLE_RATE = 24000
CHUNK_SIZE = 1024

# ── Model / session config ──

MODEL = "gemini-2.5-flash-native-audio-latest"

SYSTEM_INSTRUCTION = """You are SafeNav, a kind and patient AI assistant that helps people navigate difficult websites. You speak to the user via real-time voice.

Your mission is SOCIAL GOOD: help vulnerable users (elderly, non-tech-savvy, non-English speakers) accomplish tasks on websites that are intentionally complex or hostile.

VOICE STYLE:
- Speak at a slightly fast, energetic pace. Keep your sentences short and punchy.
- Be clear and articulate, but do not drag out words or pause unnecessarily.

RULES:
- Always explain what you're about to do before doing it
- Ask for confirmation before submitting forms or entering personal info
- Never store or transmit user credentials
- If you're unsure, ask the user rather than guessing
- Be warm, patient, and encouraging
- Speak in the user's preferred language
- NEVER use markdown, bullet points, or any formatting in your responses. This is a voice conversation — speak naturally in plain sentences only.

SCREEN SHARING (CRITICAL — DO NOT HALLUCINATE):
- You may receive screen capture images from the browser extension.
- If the user asks "can you see my screen?" — you MUST answer honestly.
- If you can actually see screen content, describe SPECIFIC elements you see (text, buttons, colors, layout) to prove it.
- If you CANNOT see anything or no image has arrived, say "아직 화면이 보이지 않아요. 화면 공유가 켜져 있는지 확인해주세요." — NEVER pretend you can see when you cannot.
- NEVER say "화면이 잘 보여요" unless you can describe exactly what is on the screen.

BROWSER TOOLS CONNECTION STATUS:
- You will receive [SYSTEM] messages telling you whether the Chrome extension is connected or not.
- If the extension is NOT connected, you MUST tell the user truthfully: "브라우저 도구가 아직 연결되지 않았어요."
- NEVER say tools are connected unless you have received a [SYSTEM] message confirming it.
- If a tool call returns an error saying "Chrome extension not connected", relay that to the user honestly.

You have access to browser navigation tools. When the user asks for help with a website, use your tools to navigate and assist them."""

# ── Tool declarations ──

TOOLS = [
    {
        "function_declarations": [
            {
                "name": "take_screenshot",
                "description": "Capture the current browser tab screenshot to see what the user sees.",
            },
            {
                "name": "click_element",
                "description": "Click at coordinates on the page.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "x": {"type": "integer", "description": "X coordinate"},
                        "y": {"type": "integer", "description": "Y coordinate"},
                    },
                    "required": ["x", "y"],
                },
            },
            {
                "name": "type_text",
                "description": "Type text into the currently focused element.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "text": {"type": "string", "description": "Text to type"},
                    },
                    "required": ["text"],
                },
            },
            {
                "name": "scroll_page",
                "description": "Scroll the page up or down.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "direction": {
                            "type": "string",
                            "description": "Scroll direction: 'up' or 'down'",
                        },
                        "amount": {
                            "type": "integer",
                            "description": "Pixels to scroll, default 300",
                        },
                    },
                    "required": ["direction"],
                },
            },
            {
                "name": "navigate_to",
                "description": "Navigate the browser to a URL.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "url": {"type": "string", "description": "URL to navigate to"},
                    },
                    "required": ["url"],
                },
            },
        ]
    }
]

CONFIG = types.LiveConnectConfig(
    response_modalities=["AUDIO"],
    system_instruction=types.Content(
        parts=[types.Part(text=SYSTEM_INSTRUCTION)]
    ),
    speech_config=types.SpeechConfig(
        voice_config=types.VoiceConfig(
            prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Kore")
        )
    ),
    input_audio_transcription=types.AudioTranscriptionConfig(),
    output_audio_transcription=types.AudioTranscriptionConfig(),
    tools=TOOLS,
)


# ── WebSocket bridge for Chrome extension ──

class ExtensionBridge:
    """Manages WebSocket connection to the Chrome extension."""

    def __init__(self) -> None:
        self._ws: websockets.WebSocketServerProtocol | None = None
        self._pending: dict[str, asyncio.Future] = {}
        self._connected = asyncio.Event()
        self._gemini_session = None  # set after Live API connects
        self._screen_task: asyncio.Task | None = None

    @property
    def connected(self) -> bool:
        return self._ws is not None

    def set_gemini_session(self, session) -> None:
        self._gemini_session = session

    # ── WebSocket server handler ──

    async def handler(self, ws) -> None:
        if self._ws is not None:
            logger.warning("Another extension tried to connect — rejecting")
            await ws.close()
            return

        self._ws = ws
        self._connected.set()
        logger.info("Chrome extension connected")
        await self._notify_model("[SYSTEM] Chrome 브라우저 확장 프로그램이 연결되었습니다. 브라우저 도구를 사용할 수 있습니다. 화면 캡처도 수신 중입니다.")

        try:
            async for raw in ws:
                msg = json.loads(raw)
                await self._on_message(msg)
        except websockets.ConnectionClosed:
            pass
        finally:
            self._ws = None
            self._connected.clear()
            # Cancel pending tool calls
            for fut in self._pending.values():
                if not fut.done():
                    fut.set_result({"error": "Extension disconnected"})
            self._pending.clear()
            if self._screen_task and not self._screen_task.done():
                self._screen_task.cancel()
            logger.info("Chrome extension disconnected")
            await self._notify_model("[SYSTEM] Chrome 브라우저 확장 프로그램이 연결 해제되었습니다. 브라우저 도구를 사용할 수 없습니다. 화면도 보이지 않습니다.")

    async def _on_message(self, msg: dict) -> None:
        msg_type = msg.get("type")

        if msg_type == "tool_response":
            # Extension replies to a tool request
            req_id = msg.get("id")
            if req_id in self._pending:
                self._pending.pop(req_id).set_result(msg.get("result", {}))

        elif msg_type == "screen_frame":
            # Extension sends a screen capture (base64 JPEG)
            if self._gemini_session and msg.get("data"):
                jpeg_bytes = base64.b64decode(msg["data"])
                await self._gemini_session.send_realtime_input(
                    video=types.Blob(data=jpeg_bytes, mime_type="image/jpeg")
                )
                logger.debug("Forwarded screen frame from extension to Gemini")

    # ── Notify Gemini about connection state changes ──

    async def _notify_model(self, text: str) -> None:
        if not self._gemini_session:
            return
        try:
            await self._gemini_session.send_client_content(
                turns=types.Content(
                    role="user",
                    parts=[types.Part(text=text)],
                ),
                turn_complete=True,
            )
        except Exception as e:
            logger.warning(f"Failed to notify model: {e}")

    # ── Send tool request to extension and wait for response ──

    async def call_tool(self, name: str, params: dict, timeout: float = 10.0) -> dict:
        if not self._ws:
            return {"error": "Chrome extension not connected"}

        request_id = str(uuid.uuid4())
        fut: asyncio.Future = asyncio.get_event_loop().create_future()
        self._pending[request_id] = fut

        await self._ws.send(json.dumps({
            "type": "tool_request",
            "id": request_id,
            "tool": name,
            "params": params,
        }))
        logger.info(f"→ Extension: {name}({params})")

        try:
            result = await asyncio.wait_for(fut, timeout=timeout)
        except asyncio.TimeoutError:
            self._pending.pop(request_id, None)
            result = {"error": f"Tool '{name}' timed out"}

        logger.info(f"← Extension: {result}")
        return result


bridge = ExtensionBridge()

# ── Audio queues ──

audio_out_queue: asyncio.Queue[bytes] = asyncio.Queue()


# ── Coroutines ──

async def listen_mic(pya: pyaudio.PyAudio, mic_queue: asyncio.Queue) -> None:
    """Capture microphone audio and push PCM chunks to queue."""
    mic_info = pya.get_default_input_device_info()
    stream = await asyncio.to_thread(
        pya.open,
        format=FORMAT,
        channels=CHANNELS,
        rate=SEND_SAMPLE_RATE,
        input=True,
        input_device_index=mic_info["index"],
        frames_per_buffer=CHUNK_SIZE,
    )
    try:
        while True:
            data = await asyncio.to_thread(
                stream.read, CHUNK_SIZE, exception_on_overflow=False
            )
            await mic_queue.put(data)
    finally:
        stream.close()


async def send_audio(session, mic_queue: asyncio.Queue) -> None:
    """Forward mic audio to the Live API session."""
    while True:
        data = await mic_queue.get()
        await session.send_realtime_input(
            audio=types.Blob(data=data, mime_type="audio/pcm")
        )


async def receive_responses(session) -> None:
    """Receive model responses — audio, transcriptions, and tool calls."""
    while True:
        turn = session.receive()
        async for response in turn:
            server = response.server_content

            # Audio data
            if server and server.model_turn:
                for part in server.model_turn.parts:
                    if part.inline_data and isinstance(part.inline_data.data, bytes):
                        audio_out_queue.put_nowait(part.inline_data.data)
                    if part.text:
                        logger.info(f"[Model text] {part.text}")

            # Input transcription
            if (
                server
                and hasattr(server, "input_transcription")
                and server.input_transcription
                and server.input_transcription.text
            ):
                logger.info(f"[User said] {server.input_transcription.text}")

            # Output transcription
            if (
                server
                and hasattr(server, "output_transcription")
                and server.output_transcription
                and server.output_transcription.text
            ):
                logger.info(f"[Agent said] {server.output_transcription.text}")

            # Interruption — flush audio queue
            if server and server.interrupted:
                while not audio_out_queue.empty():
                    audio_out_queue.get_nowait()

            # Tool calls — forward to Chrome extension via WebSocket
            if response.tool_call:
                func_responses = []
                for fc in response.tool_call.function_calls:
                    args = dict(fc.args) if fc.args else {}
                    result = await bridge.call_tool(fc.name, args)
                    func_responses.append(
                        types.FunctionResponse(
                            id=fc.id, name=fc.name, response=result
                        )
                    )
                await session.send_tool_response(
                    function_responses=func_responses
                )


async def play_audio(pya: pyaudio.PyAudio) -> None:
    """Play received audio through speakers."""
    stream = await asyncio.to_thread(
        pya.open,
        format=FORMAT,
        channels=CHANNELS,
        rate=RECEIVE_SAMPLE_RATE,
        output=True,
    )
    try:
        while True:
            data = await audio_out_queue.get()
            await asyncio.to_thread(stream.write, data)
    finally:
        stream.close()


async def send_initial_greeting(session) -> None:
    """Send a text prompt to make the model greet the user on connect."""
    await asyncio.sleep(0.5)

    ext_status = (
        "[SYSTEM] Chrome 브라우저 확장 프로그램이 연결되어 있습니다."
        if bridge.connected
        else "[SYSTEM] Chrome 브라우저 확장 프로그램이 아직 연결되지 않았습니다. 브라우저 도구와 화면 공유를 사용할 수 없습니다."
    )

    await session.send_client_content(
        turns=types.Content(
            role="user",
            parts=[
                types.Part(
                    text=(
                        f"{ext_status}\n\n"
                        "사용자가 방금 연결했습니다. 한국어로 따뜻하게 인사해주세요. "
                        "자신을 SafeNav(세이프내브)라고 소개하고, "
                        "어려운 웹사이트를 탐색하는 것을 도와줄 수 있다고 알려주세요. "
                        "오늘 어떤 웹사이트에서 도움이 필요한지 물어보세요."
                    )
                )
            ],
        ),
        turn_complete=True,
    )


# ── Main ──

WS_HOST = "localhost"
WS_PORT = 8765


async def main() -> None:
    client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
    pya = pyaudio.PyAudio()

    # Start WebSocket server for Chrome extension
    ws_server = await websockets.serve(bridge.handler, WS_HOST, WS_PORT)
    logger.info(f"WebSocket server listening on ws://{WS_HOST}:{WS_PORT}")
    logger.info("Waiting for Chrome extension to connect…  (you can also talk without it)")

    try:
        async with client.aio.live.connect(model=MODEL, config=CONFIG) as session:
            bridge.set_gemini_session(session)
            logger.info("Connected to Gemini Live API. Start speaking!")

            mic_queue: asyncio.Queue[bytes] = asyncio.Queue(maxsize=5)

            async with asyncio.TaskGroup() as tg:
                tg.create_task(listen_mic(pya, mic_queue))
                tg.create_task(send_audio(session, mic_queue))
                tg.create_task(receive_responses(session))
                tg.create_task(play_audio(pya))
                tg.create_task(send_initial_greeting(session))

    except asyncio.CancelledError:
        pass
    finally:
        ws_server.close()
        await ws_server.wait_closed()
        pya.terminate()
        logger.info("Session closed.")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nInterrupted by user.")
