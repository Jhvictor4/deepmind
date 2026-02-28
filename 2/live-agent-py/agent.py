"""SafeNav – Python LiveKit Agent (Gemini 3 Pro + Google STT/TTS pipeline)."""

import asyncio
import json
import logging
import uuid

from dotenv import load_dotenv
from livekit import rtc

from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    RunContext,
    cli,
    get_job_context,
    room_io,
)
from livekit.agents.llm import ChatContext, ChatMessage, ImageContent, function_tool
from livekit.plugins import google, silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel

load_dotenv(dotenv_path=".env.local")

logger = logging.getLogger("safenav")

INSTRUCTIONS = """You are SafeNav, a kind and patient AI assistant that helps people navigate difficult websites. You speak to the user via real-time voice.

Your mission is SOCIAL GOOD: help vulnerable users (elderly, non-tech-savvy, non-English speakers) accomplish tasks on websites that are intentionally complex or hostile.

RULES:
- Always explain what you're about to do before doing it
- Ask for confirmation before submitting forms or entering personal info
- Never store or transmit user credentials
- If you're unsure, ask the user rather than guessing
- Be warm, patient, and encouraging
- Speak in the user's preferred language
- NEVER use markdown, bullet points, or any formatting in your responses. This is a voice conversation — speak naturally in plain sentences only.

SCREEN SHARING (CRITICAL — DO NOT HALLUCINATE):
- You may receive video frames from the user's screen share.
- If the user asks "can you see my screen?" — you MUST answer honestly.
- If you can actually see screen content, describe SPECIFIC elements you see (text, buttons, colors, layout) to prove it.
- If you CANNOT see anything or no video frame has arrived, say "아직 화면이 보이지 않아요. 화면 공유가 켜져 있는지 확인해주세요." — NEVER pretend you can see when you cannot.
- NEVER say "화면이 잘 보여요" unless you can describe exactly what is on the screen.

You have access to browser navigation tools. When the user asks for help with a website, use your tools to navigate and assist them."""


# ── Data channel helpers ──


async def _send_tool_request(room: rtc.Room, tool: str, params: dict) -> str:
    """Send a tool request to the Chrome extension via data channel."""
    request_id = str(uuid.uuid4())
    msg = json.dumps(
        {"type": "tool_request", "id": request_id, "tool": tool, "params": params}
    )
    await room.local_participant.publish_data(msg.encode("utf-8"), reliable=True)
    logger.info(f"Sent tool request: {tool} {params}")
    return f"Tool request '{tool}' sent. Awaiting browser response."


# ── Agent ──


class SafeNavAgent(Agent):
    def __init__(self) -> None:
        super().__init__(instructions=INSTRUCTIONS)
        self._latest_frame: rtc.VideoFrame | None = None
        self._video_stream: rtc.VideoStream | None = None
        self._tasks: list[asyncio.Task] = []

    # ── Video: subscribe to screen share tracks ──

    async def on_enter(self) -> None:
        room = get_job_context().room

        # Check existing participants for video tracks
        for participant in room.remote_participants.values():
            for pub in participant.track_publications.values():
                if pub.track and pub.track.kind == rtc.TrackKind.KIND_VIDEO:
                    logger.info(
                        f"Found existing video track from {participant.identity}"
                    )
                    self._create_video_stream(pub.track)
                    break

        # Watch for new video tracks (screen share)
        @room.on("track_subscribed")
        def on_track_subscribed(
            track: rtc.Track,
            publication: rtc.RemoteTrackPublication,
            participant: rtc.RemoteParticipant,
        ) -> None:
            if track.kind == rtc.TrackKind.KIND_VIDEO:
                logger.info("Screen share track subscribed")
                self._create_video_stream(track)

    # ── Video: attach latest frame to each user turn ──

    async def on_user_turn_completed(
        self, turn_ctx: ChatContext, new_message: ChatMessage
    ) -> None:
        if self._latest_frame:
            logger.info("Attaching screen frame to user message")
            new_message.content.append(ImageContent(image=self._latest_frame))
            self._latest_frame = None

    def _create_video_stream(self, track: rtc.Track) -> None:
        if self._video_stream is not None:
            self._video_stream.close()
        self._video_stream = rtc.VideoStream(track)

        async def read_stream() -> None:
            async for event in self._video_stream:
                self._latest_frame = event.frame

        task = asyncio.create_task(read_stream())
        task.add_done_callback(lambda t: self._tasks.remove(t) if t in self._tasks else None)
        self._tasks.append(task)

    # ── Browser tools ──

    @function_tool
    async def take_screenshot(self, context: RunContext):
        """Capture the current browser tab screenshot to see what the user sees."""
        room = get_job_context().room
        return await _send_tool_request(room, "takeScreenshot", {})

    @function_tool
    async def click_element(self, context: RunContext, x: int, y: int):
        """Click at coordinates on the page.

        Args:
            x: X coordinate
            y: Y coordinate
        """
        room = get_job_context().room
        return await _send_tool_request(room, "clickElement", {"x": x, "y": y})

    @function_tool
    async def type_text(self, context: RunContext, text: str):
        """Type text into the currently focused element.

        Args:
            text: Text to type
        """
        room = get_job_context().room
        return await _send_tool_request(room, "typeText", {"text": text})

    @function_tool
    async def scroll_page(
        self, context: RunContext, direction: str, amount: int = 300
    ):
        """Scroll the page up or down.

        Args:
            direction: Scroll direction, either 'up' or 'down'
            amount: Pixels to scroll, default 300
        """
        room = get_job_context().room
        return await _send_tool_request(
            room, "scrollPage", {"direction": direction, "amount": amount}
        )

    @function_tool
    async def navigate_to(self, context: RunContext, url: str):
        """Navigate the browser to a URL.

        Args:
            url: URL to navigate to
        """
        room = get_job_context().room
        return await _send_tool_request(room, "navigateTo", {"url": url})


# ── Entrypoint ──

server = AgentServer()


@server.rtc_session()
async def entrypoint(ctx: JobContext):
    session = AgentSession(
        stt=google.STT(
            languages="ko-KR",
            model="latest_long",
        ),
        llm=google.LLM(
            model="gemini-3-flash-preview",
        ),
        tts=google.beta.GeminiTTS(
            voice_name="Kore",
            instructions="Speak at a fast pace. Be energetic and clear.",
        ),
        vad=silero.VAD.load(),
        turn_detection=MultilingualModel(),
    )

    await session.start(
        agent=SafeNavAgent(),
        room=ctx.room,
    )

    await session.generate_reply(
        instructions="Greet the user warmly in Korean. Introduce yourself as SafeNav(세이프내브), and let them know you are here to help them navigate any website they find difficult. Ask what website they need help with today.",
    )


if __name__ == "__main__":
    cli.run_app(server)
