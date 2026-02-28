from __future__ import annotations

import base64
import json
import re
from datetime import UTC, datetime
from io import BytesIO

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from pypdf import PdfReader

from .config import get_settings
from .demo_data import load_demo_case
from .gemini_client import GeminiService
from .orchestrator import OrchestrationEngine
from .schemas import (
    GroupedCasePreview,
    GroupedCaseResult,
    GroupedOrchestrationRequest,
    GroupedOrchestrationResponse,
    ImageInput,
    KeyPoolStatusResponse,
    ModelsResponse,
    OrchestrationInput,
    OrchestrationOptions,
    OrchestrationRequest,
    OrchestrationResponse,
    VisionProbeResponse,
)
from .spec_parser import resolve_spec_excerpt, select_relevant_spec_excerpt
from .spec_parser import build_spec_navigation_report
from .utils import load_image_bytes
from .vision_diff import detect_diff_bbox

app = FastAPI(
    title="Gemini Agentic Orchestration Backend",
    version="0.1.0",
    description="Hackathon demo backend for multi-agent PCB validation with Gemini",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


_assets_dir = Path(__file__).resolve().parent.parent / "data" / "assets"
if _assets_dir.is_dir():
    app.mount("/images", StaticFiles(directory=str(_assets_dir)), name="images")


class DemoRunOptions(BaseModel):
    model: str | None = None
    include_raw_agent_payloads: bool = True


class VisionProbeOptions(BaseModel):
    candidate_models: list[str] | None = None
    image_path: str | None = "data/assets/tested_board.png"


class ErrorCodeGenerateInput(BaseModel):
    symptom: str
    interface: str = "I2C"
    context: str | None = None
    model: str | None = None


class SpecResolveInput(BaseModel):
    error_log: str
    spec_excerpt: str | None = None
    spec_document_path: str | None = None


class VisionDiffInput(BaseModel):
    design_image: ImageInput
    tested_image: ImageInput


class UploadedFileInput(BaseModel):
    file_name: str | None = None
    mime_type: str
    base64_data: str


class UploadedOrchestrationInput(BaseModel):
    error_log_file: UploadedFileInput
    design_image_file: UploadedFileInput
    tested_image_file: UploadedFileInput
    spec_files: list[UploadedFileInput] = Field(default_factory=list)
    design_reference_files: list[UploadedFileInput] = Field(default_factory=list)
    # Backward-compatible alias for older clients sending single spec_file.
    spec_file: UploadedFileInput | None = None
    background_context: str | None = None
    todo_context: str | None = None
    example_context: str | None = None


class UploadedOrchestrationRequest(BaseModel):
    input: UploadedOrchestrationInput
    options: OrchestrationOptions = Field(default_factory=OrchestrationOptions)


@app.on_event("startup")
def startup() -> None:
    settings = get_settings()
    app.state.settings = settings

    if not settings.gemini_api_keys:
        app.state.engine = None
        return

    gemini_service = GeminiService(
        api_keys=settings.gemini_api_keys,
        request_timeout_sec=settings.request_timeout_sec,
    )
    app.state.engine = OrchestrationEngine(
        settings=settings,
        gemini_service=gemini_service,
    )


def get_engine() -> OrchestrationEngine:
    engine = getattr(app.state, "engine", None)
    if not engine:
        raise HTTPException(
            status_code=503,
            detail="No Gemini API keys configured. Set GEMINI_API_KEYS (or gemini_api_keys) in .env.",
        )
    return engine


def _pick_index(items: list, idx: int, *, strict: bool, name: str) -> tuple[object, int]:
    if not items:
        raise ValueError(f"{name} is empty")
    if idx < len(items):
        return items[idx], idx
    if strict:
        raise ValueError(f"{name}[{idx}] is missing in strict_index_pairing mode")
    return items[-1], len(items) - 1


def _build_grouped_case_mappings(
    *,
    error_logs: list[str],
    design_images: list[ImageInput],
    tested_images: list[ImageInput],
    spec_excerpts: list[str],
    spec_document_paths: list[str],
    strict: bool,
) -> list[GroupedCasePreview]:
    case_count = max(
        len(error_logs),
        len(design_images),
        len(tested_images),
        len(spec_excerpts) if spec_excerpts else 1,
        len(spec_document_paths) if spec_document_paths else 1,
    )

    mappings: list[GroupedCasePreview] = []
    for idx in range(case_count):
        _, error_idx = _pick_index(error_logs, idx, strict=strict, name="error_logs")
        _, design_idx = _pick_index(design_images, idx, strict=strict, name="design_images")
        _, tested_idx = _pick_index(tested_images, idx, strict=strict, name="tested_images")

        spec_type = "spec_excerpt"
        spec_idx = 0
        if spec_excerpts:
            _, spec_idx = _pick_index(spec_excerpts, idx, strict=strict, name="spec_excerpts")
            spec_type = "spec_excerpt"
        elif spec_document_paths:
            _, spec_idx = _pick_index(
                spec_document_paths,
                idx,
                strict=strict,
                name="spec_document_paths",
            )
            spec_type = "spec_document_path"
        else:
            raise ValueError("Either spec_excerpts or spec_document_paths must be provided")

        mappings.append(
            GroupedCasePreview(
                case_index=idx,
                error_log_index=error_idx,
                design_image_index=design_idx,
                tested_image_index=tested_idx,
                spec_source_type=spec_type,
                spec_source_index=spec_idx,
            )
        )
    return mappings


def _decode_uploaded_text(file_input: UploadedFileInput) -> str:
    raw = base64.b64decode(file_input.base64_data)
    return raw.decode("utf-8", errors="ignore")


def _uploaded_file_is_pdf(file_input: UploadedFileInput) -> bool:
    file_name = (file_input.file_name or "").lower()
    return file_input.mime_type.lower() == "application/pdf" or file_name.endswith(".pdf")


def _extract_text_from_uploaded_file(file_input: UploadedFileInput) -> str:
    raw = base64.b64decode(file_input.base64_data)
    file_name = (file_input.file_name or "").lower()

    if _uploaded_file_is_pdf(file_input):
        try:
            reader = PdfReader(BytesIO(raw))
            return "\f".join((page.extract_text() or "") for page in reader.pages)
        except Exception:
            return raw.decode("utf-8", errors="ignore")

    return raw.decode("utf-8", errors="ignore")


def _normalize_file_label(file_input: UploadedFileInput) -> str:
    return (file_input.file_name or "").lower().strip()


def _is_datasheet_candidate(file_input: UploadedFileInput) -> bool:
    file_name = _normalize_file_label(file_input)
    return file_name.endswith(".pdf") and "datasheet" in file_name


def _select_datasheet_inputs(file_inputs: list[UploadedFileInput]) -> list[UploadedFileInput]:
    datasheet_inputs = [f for f in file_inputs if _is_datasheet_candidate(f)]
    if datasheet_inputs:
        return datasheet_inputs
    return file_inputs


def _contains_toc_marker(text: str) -> bool:
    lowered = text.lower()
    return bool(
        re.search(r"\b(table of contents|contents|content|목차|toc)\b", lowered)
    )


def _extract_spec_text_for_focus(file_input: UploadedFileInput) -> str:
    raw = base64.b64decode(file_input.base64_data)
    if not _is_datasheet_candidate(file_input):
        return _extract_text_from_uploaded_file(file_input)

    try:
        reader = PdfReader(BytesIO(raw))
        pages: list[str] = []
        toc_pages: list[str] = []
        for page in reader.pages:
            page_text = (page.extract_text() or "").strip()
            if not page_text:
                continue
            pages.append(page_text)
            if _contains_toc_marker(page_text):
                toc_pages.append(page_text)

        if toc_pages:
            return "\f".join(toc_pages)
        if pages:
            return pages[0]
        return ""
    except Exception:
        return _extract_text_from_uploaded_file(file_input)


def _render_pdf_to_image_parts(file_input: UploadedFileInput, max_pages: int = 2) -> list[tuple[bytes, str]]:
    if not _uploaded_file_is_pdf(file_input):
        return []

    raw = base64.b64decode(file_input.base64_data)

    try:
        import pypdfium2
    except Exception:
        return []

    try:
        constructors = [
            lambda: pypdfium2.PdfDocument(stream=raw),
            lambda: pypdfium2.PdfDocument(BytesIO(raw)),
            lambda: pypdfium2.PdfDocument(raw),
        ]
        document = None
        for maker in constructors:
            try:
                document = maker()
                break
            except Exception:
                continue
        if document is None:
            return []

        parts: list[tuple[bytes, str]] = []
        page_count = min(len(document), max_pages) if hasattr(document, "__len__") else max_pages
        for page_idx in range(page_count):
            page = None
            try:
                page = document.get_page(page_idx)
            except Exception:
                try:
                    page = document[page_idx]
                except Exception:
                    continue

            if page is None:
                continue

            try:
                rendered = page.render(scale=2)
                pil_image = rendered.to_pil()
            except Exception:
                try:
                    bitmap = page.render().get_bitmap()
                    pil_image = bitmap.to_pil()
                except Exception:
                    continue

            buf = BytesIO()
            pil_image.save(buf, format="PNG")
            parts.append((buf.getvalue(), "image/png"))
        return parts
    except Exception:
        return []


def _format_spec_plan_file_report(source: str, plan: dict, *, max_toc: int = 16, max_excerpt: int = 5) -> str:
    toc_lines = plan.get("toc", [])
    selected = plan.get("selected_sections", [])
    selected_excerpts = plan.get("selected_section_excerpts", [])

    toc_preview = toc_lines[:max_toc]
    excerpt_preview = selected_excerpts[:max_excerpt]

    return "\n".join(
        [
            f"## {source}",
            "",
            f"toc_candidates: {len(toc_lines)}",
            f"top_selected_sections: {selected[:3]}",
            "selected_excerpt_blocks:",
            *(f"{block}" for block in excerpt_preview),
            "toc_preview:",
            *(f"{entry['id']}. {entry['title']}" for entry in toc_preview),
        ]
    )


def _build_spec_navigation_bundle(
    file_inputs: list[UploadedFileInput],
    *,
    error_log: str,
) -> tuple[str, str, list[tuple[bytes, str]]]:
    if not file_inputs:
        raise ValueError("At least one spec file must be provided.")

    excerpts: list[str] = []
    focus_sections: list[str] = []
    toc_reports: list[dict] = []
    source_reports: list[str] = []
    image_parts: list[tuple[bytes, str]] = []

    filtered_inputs = _select_datasheet_inputs(file_inputs)

    for idx, file_input in enumerate(filtered_inputs):
        source = (file_input.file_name or f"spec_{idx + 1}").strip()
        full_text = _extract_spec_text_for_focus(file_input)
        if not full_text.strip():
            continue

        plan = build_spec_navigation_report(full_text, error_log=error_log, max_sections=6)
        plan_excerpt = select_relevant_spec_excerpt(full_text, error_log=error_log, max_chars=1200)
        if not plan_excerpt.strip():
            continue

        excerpts.append(f"--- {source} ---\n{plan_excerpt}")
        source_reports.append(_format_spec_plan_file_report(source, plan))

        for section in plan.get("selected_sections", []):
            normalized = section.strip()
            if normalized:
                focus_sections.append(normalized)
        toc_reports.append({"source": source, "toc": plan.get("toc", []), "selected_sections": plan.get("selected_sections", [])})
        image_parts.extend(_render_pdf_to_image_parts(file_input, max_pages=1))

    if not excerpts:
        raise ValueError("Uploaded spec files were empty or could not be parsed.")

    spec_excerpt = "\n\n".join(excerpts)
    spec_focus_payload = {
        "error_log_terms": sorted(_tokenize_error_terms(error_log)),
        "top_focus_sections": list(dict.fromkeys(focus_sections)),
        "source_reports": source_reports,
        "toc_reports": toc_reports,
    }
    return spec_excerpt, json.dumps(spec_focus_payload, ensure_ascii=False), image_parts


def _tokenize_error_terms(error_log: str) -> list[str]:
    return sorted({
        token.lower()
        for token in re.findall(r"[A-Za-z0-9_\-]{3,}", error_log)
        if not token.isdigit()
    })


def _plain_excerpts_from_uploaded_files(file_inputs: list[UploadedFileInput]) -> str:
    excerpts: list[str] = []
    for idx, file_input in enumerate(file_inputs):
        text = _extract_text_from_uploaded_file(file_input).strip()
        if not text:
            continue
        source = (file_input.file_name or f"document_{idx + 1}").strip()
        excerpts.append(f"--- {source} ---\n{text}")
    return "\n\n".join(excerpts)


@app.get("/health")
def health() -> dict:
    settings = get_settings()
    return {
        "status": "ok",
        "time_utc": datetime.now(tz=UTC).isoformat(),
        "gemini_api_key_configured": bool(settings.gemini_api_keys),
        "gemini_key_count": len(settings.gemini_api_keys),
    }


@app.get("/models", response_model=ModelsResponse)
def models() -> ModelsResponse:
    engine = get_engine()
    try:
        available = engine.list_models()
        recommended = engine.gemini.pick_recommended_model(
            available,
            default_model=engine.settings.default_model,
        )
        return ModelsResponse(recommended_model=recommended, available_models=available)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Failed to fetch Gemini models: {exc}") from exc


@app.get("/keys/status", response_model=KeyPoolStatusResponse)
def key_pool_status() -> KeyPoolStatusResponse:
    engine = get_engine()
    status = engine.gemini.key_pool_status()
    return KeyPoolStatusResponse(key_count=len(status), keys=status)


@app.post("/models/vision/probe", response_model=VisionProbeResponse)
def probe_vision_models(options: VisionProbeOptions | None = None) -> VisionProbeResponse:
    engine = get_engine()
    options = options or VisionProbeOptions()

    try:
        available = engine.list_models()
        default_candidates = [
            model.name
            for model in available
            if (
                model.name.startswith("gemini-3")
                or model.name.startswith("gemini-2.5")
                or model.name in {"gemini-pro-latest", "gemini-flash-latest", "gemini-flash-lite-latest"}
            )
        ]
        candidate_models = options.candidate_models or sorted(set(default_candidates))

        image_path = Path(options.image_path or "data/assets/tested_board.png")
        if not image_path.is_absolute():
            image_path = (Path(__file__).resolve().parent.parent / image_path).resolve()
        image_bytes = image_path.read_bytes()

        results = engine.gemini.probe_vision_models(
            candidate_models=candidate_models,
            image_bytes=image_bytes,
            mime_type="image/png",
        )
        return VisionProbeResponse(
            probed_at=datetime.now(tz=UTC),
            candidate_models=candidate_models,
            results=results,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Vision probe failed: {exc}") from exc


@app.post("/preprocess/error-code/generate")
def preprocess_generate_error_code(payload: ErrorCodeGenerateInput) -> dict:
    engine = get_engine()
    try:
        model = engine._pick_model(payload.model)
        schema = {
            "type": "object",
            "properties": {
                "error_log": {"type": "string"},
                "error_code": {"type": "string"},
                "explanation": {"type": "string"},
            },
            "required": ["error_log", "error_code", "explanation"],
        }
        prompt = (
            "Generate one realistic hardware validation error log for a hackathon demo.\n"
            f"interface: {payload.interface}\n"
            f"symptom: {payload.symptom}\n"
            f"context: {payload.context or 'PCB manufacturing validation'}\n"
            "Return concise output."
        )
        generated = engine.gemini.generate_json(
            model=model,
            prompt=prompt,
            response_schema=schema,
            temperature=0.2,
            max_output_tokens=220,
        )
        return {"model_used": model, "generated": generated}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Error-code generation failed: {exc}") from exc


@app.post("/preprocess/spec/resolve")
def preprocess_spec_resolve(payload: SpecResolveInput) -> dict:
    try:
        resolved = resolve_spec_excerpt(
            spec_excerpt=payload.spec_excerpt,
            spec_document_path=payload.spec_document_path,
            error_log=payload.error_log,
            root_dir=Path(__file__).resolve().parent.parent,
        )
        return {
            "resolved_spec_excerpt": resolved,
            "source": "spec_excerpt" if payload.spec_excerpt else payload.spec_document_path,
        }
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Spec resolve failed: {exc}") from exc


@app.post("/preprocess/vision/diff-box")
def preprocess_vision_diff(payload: VisionDiffInput) -> dict:
    try:
        root = Path(__file__).resolve().parent.parent
        design_bytes = load_image_bytes(payload.design_image, root)
        tested_bytes = load_image_bytes(payload.tested_image, root)
        bbox = detect_diff_bbox(design_bytes, tested_bytes)
        return {"heuristic_diff_bbox": bbox}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Vision diff failed: {exc}") from exc


@app.get("/demo-case")
def demo_case():
    settings = get_settings()
    return load_demo_case(settings)


@app.post("/orchestrate", response_model=OrchestrationResponse)
def orchestrate(request: OrchestrationRequest) -> OrchestrationResponse:
    engine = get_engine()
    try:
        return engine.run(request)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - safeguard for demo runtime
        raise HTTPException(status_code=502, detail=f"Orchestration failed (Gemini upstream): {exc}") from exc


@app.post("/orchestrate/uploaded", response_model=OrchestrationResponse)
def orchestrate_uploaded(payload: UploadedOrchestrationRequest) -> OrchestrationResponse:
    engine = get_engine()
    try:
        error_log = _decode_uploaded_text(payload.input.error_log_file).strip()
        if not error_log:
            raise ValueError("Uploaded .log file is empty")

        spec_inputs = payload.input.spec_files[:]
        if payload.input.spec_file and payload.input.spec_file not in spec_inputs:
            spec_inputs.append(payload.input.spec_file)
        if not spec_inputs:
            raise ValueError("No uploaded spec file supplied.")

        spec_excerpt, spec_focus_plan, spec_reference_images = _build_spec_navigation_bundle(
            spec_inputs,
            error_log=error_log,
        )
        design_reference_text = _plain_excerpts_from_uploaded_files(
            payload.input.design_reference_files,
        )
        design_reference_text = design_reference_text.strip() or None

        request = OrchestrationRequest(
            input=OrchestrationInput(
                error_log=error_log,
                spec_excerpt=spec_excerpt,
                spec_focus_plan=spec_focus_plan,
                spec_image_parts=[
                    ImageInput(
                        mime_type=mime_type,
                        base64_data=base64.b64encode(image_bytes).decode("ascii"),
                    )
                    for image_bytes, mime_type in spec_reference_images
                ],
                design_reference_text=design_reference_text,
                design_image=ImageInput(
                    mime_type=payload.input.design_image_file.mime_type,
                    base64_data=payload.input.design_image_file.base64_data,
                ),
                tested_image=ImageInput(
                    mime_type=payload.input.tested_image_file.mime_type,
                    base64_data=payload.input.tested_image_file.base64_data,
                ),
                background_context=payload.input.background_context,
                todo_context=payload.input.todo_context,
                example_context=payload.input.example_context,
            ),
            options=payload.options,
        )
        return engine.run(request)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - network/model runtime branch
        raise HTTPException(status_code=502, detail=f"Uploaded orchestration failed: {exc}") from exc


@app.post("/orchestrate/grouped/preview")
def orchestrate_grouped_preview(payload: GroupedOrchestrationRequest) -> dict:
    try:
        mappings = _build_grouped_case_mappings(
            error_logs=payload.input.error_logs,
            design_images=payload.input.design_images,
            tested_images=payload.input.tested_images,
            spec_excerpts=payload.input.spec_excerpts,
            spec_document_paths=payload.input.spec_document_paths,
            strict=payload.options.strict_index_pairing,
        )
        return {
            "total_cases": len(mappings),
            "strict_index_pairing": payload.options.strict_index_pairing,
            "input_counts": {
                "error_logs": len(payload.input.error_logs),
                "design_images": len(payload.input.design_images),
                "tested_images": len(payload.input.tested_images),
                "spec_excerpts": len(payload.input.spec_excerpts),
                "spec_document_paths": len(payload.input.spec_document_paths),
            },
            "mappings": [row.model_dump() for row in mappings],
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/orchestrate/grouped", response_model=GroupedOrchestrationResponse)
def orchestrate_grouped(request: GroupedOrchestrationRequest) -> GroupedOrchestrationResponse:
    engine = get_engine()
    try:
        mappings = _build_grouped_case_mappings(
            error_logs=request.input.error_logs,
            design_images=request.input.design_images,
            tested_images=request.input.tested_images,
            spec_excerpts=request.input.spec_excerpts,
            spec_document_paths=request.input.spec_document_paths,
            strict=request.options.strict_index_pairing,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    rows: list[GroupedCaseResult] = []
    success = 0
    for mapping in mappings:
        try:
            error_log = request.input.error_logs[mapping.error_log_index]
            design_image = request.input.design_images[mapping.design_image_index]
            tested_image = request.input.tested_images[mapping.tested_image_index]

            spec_excerpt = None
            spec_document_path = None
            if mapping.spec_source_type == "spec_excerpt":
                spec_excerpt = request.input.spec_excerpts[mapping.spec_source_index]
            else:
                spec_document_path = request.input.spec_document_paths[mapping.spec_source_index]

            run_request = OrchestrationRequest(
                input=OrchestrationInput(
                    error_log=error_log,
                    spec_excerpt=spec_excerpt,
                    spec_document_path=spec_document_path,
                    design_image=design_image,
                    tested_image=tested_image,
                    background_context=request.input.background_context,
                    todo_context=request.input.todo_context,
                    example_context=request.input.example_context,
                ),
                options=OrchestrationOptions(
                    model=request.options.model,
                    include_raw_agent_payloads=request.options.include_raw_agent_payloads,
                ),
            )

            run_response = engine.run(run_request)
            success += 1
            rows.append(
                GroupedCaseResult(
                    case_index=mapping.case_index,
                    mapping=mapping,
                    status="ok",
                    run_id=run_response.run_id,
                    model_used=run_response.model_used,
                    latency_sec=(run_response.ended_at - run_response.started_at).total_seconds(),
                    result=run_response,
                )
            )
        except Exception as exc:  # pragma: no cover - network/model runtime branch
            rows.append(
                GroupedCaseResult(
                    case_index=mapping.case_index,
                    mapping=mapping,
                    status="error",
                    error=str(exc),
                )
            )

    return GroupedOrchestrationResponse(
        total_cases=len(rows),
        success_cases=success,
        failed_cases=len(rows) - success,
        cases=rows,
    )


@app.post("/orchestrate/demo", response_model=OrchestrationResponse)
def orchestrate_demo(options: DemoRunOptions | None = None) -> OrchestrationResponse:
    engine = get_engine()
    demo = load_demo_case(get_settings())
    options = options or DemoRunOptions()

    request = demo.request.model_copy(deep=True)
    request.options.model = options.model
    request.options.include_raw_agent_payloads = options.include_raw_agent_payloads

    try:
        return engine.run(request)
    except Exception as exc:  # pragma: no cover - safeguard for demo runtime
        raise HTTPException(status_code=502, detail=f"Demo orchestration failed (Gemini upstream): {exc}") from exc
