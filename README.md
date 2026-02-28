# Gemini Agentic Orchestration Backend (Hackathon Demo)

This backend uses your current project context (`background.md`, `todo.md`, `example.md`) and runs a real 4-agent pipeline with Gemini.

## What is implemented

- Multi-key Gemini client with round-robin key rotation
- Key health handling (`API_KEY_INVALID`, rate-limit/backoff)
- 4-agent orchestration (`Error -> (Spec Precheck || CAD Mapping) -> Physical Verify -> Spec Final`)
- Input/output contract separation for demo UX
- Spec source mapping:
  - direct text (`spec_excerpt`) or
  - document parsing (`spec_document_path`, PDF/TXT)
- Red-box support:
  - model-generated bounding boxes
  - image-diff heuristic fallback (template vs tested)
- Live vision-model probing endpoint

## Quick start

```bash
cd /Users/taehoje/hw
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# set GEMINI_API_KEYS=[key1,key2,...] (or gemini_api_keys=[...])
uvicorn app.main:app --reload --port 8000
```

Swagger: `http://127.0.0.1:8000/docs`

## API endpoints

- `GET /health`
- `GET /models`
- `GET /keys/status`
- `POST /models/vision/probe`
- `GET /demo-case`
- `POST /preprocess/error-code/generate`
- `POST /preprocess/spec/resolve`
- `POST /preprocess/vision/diff-box`
- `POST /orchestrate`
- `POST /orchestrate/uploaded`
- `POST /orchestrate/grouped/preview`
- `POST /orchestrate/grouped`
- `POST /orchestrate/demo`

## Request shape (`POST /orchestrate`)

```json
{
  "input": {
    "error_log": "...",
    "spec_excerpt": "...",
    "spec_document_path": "docs/spec.pdf",
    "design_image": {"mime_type": "image/png", "file_path": "data/assets/template_board.png"},
    "tested_image": {"mime_type": "image/png", "file_path": "data/assets/tested_board.png"}
  },
  "options": {
    "model": "gemini-3.1-pro-preview",
    "include_raw_agent_payloads": true
  }
}
```

Rules:
- `spec_excerpt` or `spec_document_path` 중 하나는 필수
- 응답은 `input`, `output`, `agent_trace`를 분리해서 반환

## Grouped N-file input (`POST /orchestrate/grouped`)

When you need to upload many files at once, split by source type:

```json
{
  "input": {
    "error_logs": ["[ERROR] ...", "[ERROR] ..."],
    "design_images": [
      {"mime_type": "image/jpeg", "file_path": "data/external/DeepPCB/..._temp.jpg"}
    ],
    "tested_images": [
      {"mime_type": "image/jpeg", "file_path": "data/external/DeepPCB/..._test.jpg"},
      {"mime_type": "image/jpeg", "file_path": "data/external/DeepPCB/..._test2.jpg"}
    ],
    "spec_document_paths": ["data/specs/deeppcb_demo_spec_v1.md"]
  },
  "options": {
    "model": "gemini-3.1-pro-preview",
    "include_raw_agent_payloads": false,
    "strict_index_pairing": false
  }
}
```

- `strict_index_pairing=true` (default): every index must exist in every required list
- `strict_index_pairing=false`: shorter lists reuse their last item
- Use `/orchestrate/grouped/preview` first to check index mapping before full execution.

## FE-synced single-drop input (`POST /orchestrate/uploaded`)

Use this when FE already classifies dropped files by extension/order:

- `.log` -> `error_log_file`
- first `.png` -> `design_image_file` (normal/GT circuit)
- second `.png` -> `tested_image_file` (defect PCB)
- `.pdf` or `.txt` -> `spec_file`

Backend does not classify files in this endpoint; it only consumes explicit slots from FE.

## Demo data

- Context docs:
  - `background.md`
  - `todo.md`
  - `example.md`
- Assets:
  - `data/assets/template_board.png`
  - `data/assets/tested_board.png`
- Demo request template:
  - `data/demo_case.json`

## Today model probe output

- Probe result artifact:
  - `data/model_probe_latest.json`
- Probe helper:
  - `tools/probe_latest_vision_models.py`

## Notes on model policy

`/orchestrate` is configured to enforce the latest recommended available model (no automatic fallback to older model families).
