# SkillSync AI — API Documentation

## 1. Overview

SkillSync AI exposes a versioned RESTful API under `/api/v1/`.

- **Base URL**: `http://localhost:8000`
- **Prefix**: `/api/v1`
- **Swagger Documentation**: `/docs`
- **ReDoc Documentation**: `/redoc`

## 2. API Versioning & Roadmap

SkillSync AI structures its API endpoints as follows:

| Endpoint Module | Status | Description |
| --------------- | ------ | ----------- |
| `/api/v1/health` | **Phase 0 (Active)** | System diagnostic and health ping |
| `/api/v1/auth` | Phase 2 | User authentication, registration, JWT & RBAC |
| `/api/v1/jobs` | Phase 3 | Employer job postings and skill contracts |
| `/api/v1/candidates` | Phase 4 | Candidate profiles, resumes, and skill records |
| `/api/v1/skills` | Phase 5 | NLP skill taxonomy and extraction |
| `/api/v1/matching` | Phase 6 | Vector similarity matching engine |
| `/api/v1/copilot` | Phase 7 | Local LLM career advisory & gap guidance |
| `/api/v1/curriculum` | Phase 8 | Curriculum alignment and provider courses |
| `/api/v1/demand` | Phase 9 | District-level forecasting & demand signals |
| `/api/v1/passport` | Phase 10 | Verifiable skill passports & credentials |
| `/api/v1/outcomes` | Phase 11 | Employment outcome tracking & analytics |

---

## 3. Endpoints (Phase 0)

### 3.1 Health Check

Retrieves runtime connectivity and status across all core foundation layers (FastAPI, PostgreSQL, Redis, Ollama).

- **Method**: `GET`
- **Route**: `/api/v1/health`
- **Auth Required**: No

#### Request Example
```bash
curl -X GET http://localhost:8000/api/v1/health
```

#### Successful Response (`200 OK`)
```json
{
  "status": "healthy",
  "service": "skillsync-api",
  "version": "0.1.0",
  "environment": "development",
  "subsystems": {
    "database": {
      "status": "connected",
      "latency_ms": 2.4,
      "pgvector_enabled": true
    },
    "redis": {
      "status": "connected",
      "latency_ms": 1.1
    },
    "ai_engine": {
      "status": "available",
      "provider": "ollama",
      "model": "mistral:latest"
    }
  }
}
```

#### Degraded / Offline Response (`200 OK` with subsystem diagnostics)
Even if PostgreSQL, Redis, or Ollama is unavailable during initial setup, the API returns HTTP 200 with clear diagnostics rather than crashing:

```json
{
  "status": "degraded",
  "service": "skillsync-api",
  "version": "0.1.0",
  "environment": "development",
  "subsystems": {
    "database": {
      "status": "disconnected",
      "error": "Connection refused"
    },
    "redis": {
      "status": "unavailable",
      "error": "Redis host unreachable"
    },
    "ai_engine": {
      "status": "offline",
      "provider": "ollama",
      "error": "Ollama service not running"
    }
  }
}
```
