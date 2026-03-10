# AI-Generated Video Detection SaaS

A full-stack SaaS for detecting AI-generated videos, powered by the [Sightengine](https://sightengine.com) `genai` model. Supports both synchronous and asynchronous analysis pipelines with a confidence score output per video.

---

## How It Works

Detection is delegated to the **Sightengine `genai` model**, which analyzes raw pixel content — no metadata or watermarks required. The model was trained on millions of AI-generated and real videos across diverse content types (live action, art, animation) and covers generators such as Sora, Veo, Kling, Runway, and Pika.

The API returns a `type.ai_generated` confidence score (float `0–1`). The app exposes this score through a REST interface with two analysis modes:

### Sync (short videos, < ~1 min)
- Upload via `multipart/form-data` → `POST /video/check-sync.json`
- Sightengine processes and returns the result in-band
- Response latency: **~10s per MB** under load

### Async (longer videos / streams)
- Upload or pass a stream URL → `POST /video/check.json` with a `callback_url`
- Sightengine processes and POSTs the result to the registered webhook
- Background job queued on the backend; client polls or receives webhook response

---

## Stack

| Layer | Technology |
|---|---|
| Backend | Python, FastAPI |
| Frontend | Next.js, React, TypeScript |
| Database | PostgreSQL |
| Storage | Cloudflare R2 |
| Detection API | Sightengine (`genai` model) |
| Deploy (backend) | Railway |
| Deploy (frontend) | Vercel |

---

## API Endpoints

```
POST /analyze/sync        # Upload video, returns score synchronously
POST /analyze/async       # Upload video, result delivered via webhook
GET  /results/{job_id}    # Poll async job status and result
```

Request body (sync):
```json
{
  "file": "<binary upload>",
}
```

Response:
```json
{
  "job_id": "abc123",
  "ai_generated": 0.97,
  "status": "done"
}
```

---

## Detection Method

- **Provider:** Sightengine Generative AI Video Detection
- **Model:** `genai`
- **Input:** MP4 / MOV / AVI / HLS stream
- **Output:** Confidence score `0.0 → 1.0` (`type.ai_generated`)
- **Approach:** Pixel-level artifact analysis — metadata-independent
- **Covered generators:** Sora, Veo, Kling, Runway, Pika, MidJourney, and others

---

## Infrastructure

```
User → Vercel (Next.js) → FastAPI (Railway)
                               ↓
                        Sightengine API
                               ↓
                        PostgreSQL (results)
                        Cloudflare R2 (video artifacts)
```

Async flow adds a webhook receiver endpoint on the FastAPI side. Sightengine POSTs the result back; the backend updates the job record in PostgreSQL and the frontend polls `GET /results/{job_id}`.

---

## Running Locally

```bash
# Backend
cd backend
pip install -r requirements.txt
cp .env.example .env   # add SIGHTENGINE_API_USER, SIGHTENGINE_API_SECRET, DATABASE_URL, R2 credentials
uvicorn main:app --reload

# Frontend
cd frontend
npm install
cp .env.example .env.local   # add NEXT_PUBLIC_API_URL
npm run dev
```

---

## Environment Variables

```env
SIGHTENGINE_API_USER=
SIGHTENGINE_API_SECRET=
DATABASE_URL=postgresql://...
R2_BUCKET=
R2_ACCOUNT_ID=
R2_ACCESS_KEY=
R2_SECRET_KEY=
CALLBACK_URL=https://your-backend/webhook/sightengine
```

---

## Performance

| Metric | Value |
|---|---|
| Sync latency | ~10s / MB of video |
| Monthly infra cost | ~US$ 10 |
