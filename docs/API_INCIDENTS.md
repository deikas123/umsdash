# UMS Hub — Incidents API

External REST API for server-to-server integration with the UMS Hub incidents system.

## Base URL

```
https://mmnpopwzfjyfasvzzatg.supabase.co/functions/v1/incidents-api
```

---

## Authentication

All requests require an **API key** passed in the `x-api-key` header.

```http
x-api-key: your_api_key_here
```

### Generating an API Key

1. Log into UMS Hub as an admin
2. Navigate to **Admin → API Keys** (`/admin/api-keys`)
3. Click **"Generate New Key"** and give it a name
4. **Copy the key immediately** — it is only shown once
5. Store it securely (environment variable, secrets manager)

> **Security note:** API keys authenticate against the `api_keys` table using a SHA-256 hash. The raw key is never stored. Your Supabase service-role key and database credentials are never exposed through this API.

---

## Endpoints

### 1. List Incidents

```http
GET /incidents
```

Returns a paginated list of incidents.

#### Query Parameters

| Parameter    | Type     | Default | Description |
|-------------|----------|---------|-------------|
| `page`      | integer  | 1       | Page number (1-based) |
| `limit`     | integer  | 20      | Results per page (max 100) |
| `status`    | string   | —       | Filter: `draft`, `open`, `in_progress`, `resolved`, `closed` |
| `severity`  | string   | —       | Filter prefix: `Level 1`, `Level 2`, `Level 3`, `Level 4` |
| `department`| string   | —       | Exact department name |
| `from`      | ISO 8601 | —       | Created at or after this timestamp |
| `to`        | ISO 8601 | —       | Created at or before this timestamp |

#### Example Request

```bash
curl -X GET \
  "https://mmnpopwzfjyfasvzzatg.supabase.co/functions/v1/incidents-api/incidents?status=open&limit=10&page=1" \
  -H "x-api-key: YOUR_API_KEY"
```

#### Example Response

```json
{
  "data": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "incident_number": "UMS-INC-048",
      "department": "Sales",
      "incident_type": "Theft / Suspected Theft",
      "severity": "Level 2 – Moderate",
      "urgency": "High",
      "status": "open",
      "reported_by": "Denis Mwai",
      "date_of_incident": "2026-10-22",
      "description": "Laptop reported missing from sales office.",
      "capa_status": "open",
      "created_at": "2026-10-22T07:00:00.000Z",
      "updated_at": "2026-10-22T07:00:00.000Z"
    }
  ],
  "meta": {
    "total": 48,
    "page": 1,
    "limit": 10,
    "pages": 5
  }
}
```

---

### 2. Get a Specific Incident

```http
GET /incidents/{id}
```

Returns full details of a single incident including 5-Why RCA and CAPA fields.

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id`      | UUID | Incident UUID |

#### Example Request

```bash
curl -X GET \
  "https://mmnpopwzfjyfasvzzatg.supabase.co/functions/v1/incidents-api/incidents/3fa85f64-5717-4562-b3fc-2c963f66afa6" \
  -H "x-api-key: YOUR_API_KEY"
```

#### Example Response

```json
{
  "data": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "incident_number": "UMS-INC-048",
    "department": "Sales",
    "incident_type": "Theft / Suspected Theft",
    "severity": "Level 2 – Moderate",
    "urgency": "High",
    "status": "resolved",
    "reported_by": "Denis Mwai",
    "date_of_incident": "2026-10-22",
    "location": "Office",
    "witnesses": "Jane Doe",
    "persons_involved": "Unknown",
    "description": "Laptop reported missing from sales office.",
    "item_description": "Dell Laptop",
    "item_quantity": 1,
    "estimated_value": 85000,
    "problem_statement": "A laptop was stolen from the sales office.",
    "why_1": "Office was left unlocked overnight.",
    "why_2": "Security policy not followed.",
    "why_3": "No reminder system for end-of-day lockup.",
    "why_4": "Procedure not documented.",
    "why_5": "Root cause: Lack of documented close-of-day security checklist.",
    "capa_action": "Create and enforce daily close-of-day security checklist.",
    "capa_owner": "Wilson Kamau",
    "capa_deadline": "2026-11-01",
    "capa_status": "open",
    "created_at": "2026-10-22T07:00:00.000Z",
    "updated_at": "2026-10-22T09:15:00.000Z"
  }
}
```

---

### 3. Incremental Event Feed

```http
GET /incident-events
```

Returns incidents that were **created or updated** after a given timestamp. Use this to synchronize your external system without polling all incidents every time.

#### Query Parameters

| Parameter | Type     | Required | Description |
|-----------|----------|----------|-------------|
| `since`   | ISO 8601 | First call only | Return all incidents updated after this timestamp |
| `cursor`  | ISO 8601 | Subsequent calls | Use the `cursor` from the previous response |
| `limit`   | integer  | No (default 100) | Max events per page (max 500) |

> **Note:** Provide either `since` OR `cursor` — not both. Use `since` for the first call, then save and reuse `cursor` for all subsequent calls.

#### Polling Pattern

```
First call:
  GET /incident-events?since=2026-10-01T00:00:00.000Z

  → Save cursor = "2026-10-22T09:15:32.000Z"
  → If has_more = true, fetch next page immediately

Next calls (every 5 minutes):
  GET /incident-events?cursor=2026-10-22T09:15:32.000Z

  → Save new cursor
  → Repeat
```

#### Example Request

```bash
# First call
curl -X GET \
  "https://mmnpopwzfjyfasvzzatg.supabase.co/functions/v1/incidents-api/incident-events?since=2026-10-01T00:00:00.000Z" \
  -H "x-api-key: YOUR_API_KEY"

# Subsequent calls using cursor
curl -X GET \
  "https://mmnpopwzfjyfasvzzatg.supabase.co/functions/v1/incidents-api/incident-events?cursor=2026-10-22T09:15:32.000Z" \
  -H "x-api-key: YOUR_API_KEY"
```

#### Example Response

```json
{
  "data": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "incident_number": "UMS-INC-048",
      "status": "resolved",
      "severity": "Level 2 – Moderate",
      "department": "Sales",
      "updated_at": "2026-10-22T09:15:32.000Z",
      "created_at": "2026-10-22T07:00:00.000Z"
    }
  ],
  "meta": {
    "count": 1,
    "cursor": "2026-10-22T09:15:32.000Z",
    "has_more": false
  }
}
```

---

## Error Responses

All errors follow this format:

```json
{ "error": "Description of what went wrong" }
```

| HTTP Status | Meaning |
|-------------|---------|
| `400` | Bad request — missing required parameter |
| `401` | Unauthorized — invalid or missing API key |
| `404` | Incident not found |
| `405` | Method not allowed — use GET |
| `500` | Internal server error |

---

## Rate Limiting

No hard rate limit is enforced currently. Please limit polling to once every 60 seconds for the event feed.

---

## OpenAPI Specification

The full OpenAPI 3.1 spec is available at:

```
docs/openapi.yaml
```

You can import this into Postman, Insomnia, or any OpenAPI-compatible tool.

---

## Quick Start (Node.js)

```javascript
const BASE = 'https://mmnpopwzfjyfasvzzatg.supabase.co/functions/v1/incidents-api';
const API_KEY = process.env.UMS_API_KEY;

// List open incidents
const res = await fetch(`${BASE}/incidents?status=open&limit=50`, {
  headers: { 'x-api-key': API_KEY }
});
const { data, meta } = await res.json();
console.log(`${meta.total} open incidents`);

// Poll for changes every 5 minutes
let cursor = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // last 24h

setInterval(async () => {
  const r = await fetch(`${BASE}/incident-events?cursor=${cursor}`, {
    headers: { 'x-api-key': API_KEY }
  });
  const { data, meta } = await r.json();
  if (data.length > 0) {
    console.log(`${data.length} incident updates`);
    cursor = meta.cursor; // advance cursor
  }
}, 5 * 60 * 1000);
```

---

## Quick Start (Python)

```python
import os, requests, time
from datetime import datetime, timedelta, timezone

BASE = "https://mmnpopwzfjyfasvzzatg.supabase.co/functions/v1/incidents-api"
HEADERS = {"x-api-key": os.environ["UMS_API_KEY"]}

# List incidents
r = requests.get(f"{BASE}/incidents", headers=HEADERS, params={"status": "open"})
result = r.json()
print(f"{result['meta']['total']} open incidents")

# Poll for changes
cursor = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()

while True:
    r = requests.get(f"{BASE}/incident-events", headers=HEADERS, params={"cursor": cursor})
    result = r.json()
    events = result["data"]
    if events:
        print(f"{len(events)} updates")
        cursor = result["meta"]["cursor"]
    time.sleep(300)  # poll every 5 minutes
```
