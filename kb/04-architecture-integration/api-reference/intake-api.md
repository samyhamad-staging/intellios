---
id: "04-006"
title: "Intake API Reference"
slug: "intake-api"
type: "reference"
audiences:
  - "engineering"
status: "published"
version: "1.0.0"
platform_version: "1.2.0"
created: "2026-04-05"
updated: "2026-04-05"
author: "Intellios Platform Engineering"
related:
  - "04-011"
  - "04-007"
  - "03-002"
tags:
  - "api"
  - "intake-engine"
  - "intake-session"
  - "streaming"
  - "multi-turn"
feedback_url: "https://feedback.intellios.ai/kb"
tldr: "REST API for creating intake sessions, capturing enterprise requirements through streaming multi-turn conversations, adding stakeholder contributions, and retrieving structured intake payloads for blueprint generation."
---

# Intake API Reference

> **TL;DR:** Create intake sessions, stream multi-turn conversations to gather enterprise requirements, add stakeholder contributions, and retrieve structured payloads for Agent Blueprint Package generation.

## Overview

The Intake API enables you to capture enterprise requirements for agent creation through interactive sessions. Sessions support streaming multi-turn conversations, stakeholder input, and payload retrieval for downstream blueprint generation.

**Base URL:** `https://[your-intellios-host]/api/intake`

**Authentication:** All endpoints require `Authorization: Bearer [token]`

**Content-Type:** `application/json`

---

## Endpoints

### 1. Create Intake Session

Create a new intake session to begin capturing requirements.

```
POST /api/intake
```

**Description**
Initializes a new intake session within an enterprise. The session tracks conversation history, stakeholder contributions, and a continuously refined intake payload.

**Request Body**

```json
{
  "enterprise_id": "[PLACEHOLDER-ENT-ID]",
  "title": "Claims Processing Agent",
  "description": "Multi-step agent for processing insurance claims",
  "stakeholders": [
    {
      "name": "John Chen",
      "role": "Product Manager",
      "email": "john@company.com"
    }
  ],
  "metadata": {
    "department": "Operations",
    "project_code": "QC-2026-001"
  }
}
```

**Response** (201 Created)

```json
{
  "success": true,
  "data": {
    "intake_session": {
      "id": "[PLACEHOLDER-SESSION-ID]",
      "enterprise_id": "[PLACEHOLDER-ENT-ID]",
      "title": "Claims Processing Agent",
      "description": "Multi-step agent for processing insurance claims",
      "status": "active",
      "created_at": "2026-04-05T10:23:45Z",
      "updated_at": "2026-04-05T10:23:45Z",
      "payload": {
        "agent_name": null,
        "agent_description": null,
        "tools": [],
        "workflows": [],
        "requirements": []
      },
      "messages_count": 0,
      "stakeholders": [
        {
          "name": "John Chen",
          "role": "Product Manager",
          "email": "john@company.com",
          "added_at": "2026-04-05T10:23:45Z"
        }
      ]
    }
  },
  "meta": {
    "requestId": "[PLACEHOLDER-UUID]",
    "timestamp": "2026-04-05T10:23:45Z"
  }
}
```

**Error Codes**

| Code | Status | Description |
|------|--------|-------------|
| `ENTERPRISE_NOT_FOUND` | 404 | Enterprise ID does not exist |
| `INVALID_STAKEHOLDER_EMAIL` | 400 | Stakeholder email is malformed |
| `SESSION_LIMIT_EXCEEDED` | 429 | Enterprise has exceeded max concurrent sessions |

---

### 2. Get Intake Session

Retrieve an existing intake session and its current state.

```
GET /api/intake/{id}
```

**Description**
Fetches the full session object including conversation history, current payload, and stakeholder list.

**Path Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Session ID |

**Query Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `include_messages` | boolean | true | Include full message history |
| `include_payload` | boolean | true | Include current intake payload |

**Response** (200 OK)

```json
{
  "success": true,
  "data": {
    "intake_session": {
      "id": "[PLACEHOLDER-SESSION-ID]",
      "enterprise_id": "[PLACEHOLDER-ENT-ID]",
      "title": "Claims Processing Agent",
      "status": "active",
      "created_at": "2026-04-05T10:23:45Z",
      "updated_at": "2026-04-05T10:42:30Z",
      "payload": {
        "agent_name": "Claims Auto-Processor",
        "agent_description": "Processes insurance claims with document analysis",
        "tools": [
          {
            "name": "parse_claim_form",
            "description": "Extract data from claim submission forms",
            "input_schema": { }
          }
        ],
        "requirements": [
          "Must extract policyholder info from documents",
          "Must validate claim eligibility",
          "Must support manual override"
        ]
      },
      "messages": [
        {
          "id": "[PLACEHOLDER-MSG-ID-1]",
          "role": "user",
          "content": "We need an agent to help with insurance claims",
          "created_at": "2026-04-05T10:25:00Z"
        },
        {
          "id": "[PLACEHOLDER-MSG-ID-2]",
          "role": "assistant",
          "content": "I'll help design a claims processing agent. What documents will it need to analyze?",
          "created_at": "2026-04-05T10:25:15Z"
        }
      ],
      "messages_count": 2,
      "stakeholders": [
        {
          "name": "John Chen",
          "role": "Product Manager",
          "email": "john@company.com",
          "added_at": "2026-04-05T10:23:45Z"
        }
      ]
    }
  },
  "meta": {
    "requestId": "[PLACEHOLDER-UUID]",
    "timestamp": "2026-04-05T10:45:30Z"
  }
}
```

**Error Codes**

| Code | Status | Description |
|------|--------|-------------|
| `SESSION_NOT_FOUND` | 404 | Session ID does not exist |
| `UNAUTHORIZED` | 403 | User lacks permission to view this session |

---

### 3. Send Message (Streaming)

Send a user message to the intake session and receive a streaming AI response.

```
POST /api/intake/{id}/message
```

**Description**
Streams a multi-turn conversation. The AI Intake Engine processes the user message, updates the payload based on new information, and returns a streaming response. Clients should handle Server-Sent Events (SSE) or consume the stream directly.

**Path Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Session ID |

**Request Body**

```json
{
  "message": "The agent needs to validate that policies are active before processing claims",
  "user_name": "John Chen"
}
```

**Response Headers**

```
Content-Type: text/event-stream
Transfer-Encoding: chunked
Cache-Control: no-cache
```

**Streaming Response** (200 OK)

Each message is a Server-Sent Event (SSE) in one of these formats:

```
event: content
data: {"chunk":"The agent will need access to your "}

event: content
data: {"chunk":"policy validation service. "}

event: payload_update
data: {"requirements":[...], "tools":[...]}

event: message_complete
data: {"message_id":"[PLACEHOLDER-MSG-ID]","tokens_used":123}

event: done
data: {}
```

**JavaScript Example (Fetch)**

```javascript
const response = await fetch('/api/intake/[SESSION-ID]/message', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer [TOKEN]',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: 'The agent needs policy validation',
    user_name: 'John Chen'
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { value, done } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  console.log('Streaming chunk:', chunk);
}
```

**Error Codes**

| Code | Status | Description |
|------|--------|-------------|
| `SESSION_NOT_FOUND` | 404 | Session does not exist |
| `SESSION_CLOSED` | 409 | Session is no longer active (finalized or expired) |
| `MESSAGE_TOO_LONG` | 400 | Message exceeds 10,000 characters |
| `RATE_LIMITED` | 429 | Too many messages sent in short time |

---

### 4. Add Stakeholder Contribution

Add a structured contribution from a stakeholder (e.g., security review, compliance requirement).

```
POST /api/intake/{id}/stakeholder
```

**Description**
Records a stakeholder's input without streaming conversation overhead. Useful for capturing distinct inputs from different team members (security, compliance, ops) as separate messages that update the payload.

**Path Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Session ID |

**Request Body**

```json
{
  "stakeholder_name": "Alice Rodriguez",
  "stakeholder_role": "Security Lead",
  "contribution_type": "security_requirement",
  "content": "Agent must encrypt all data in transit using TLS 1.3. Must not store API keys in logs."
}
```

**Response** (201 Created)

```json
{
  "success": true,
  "data": {
    "contribution": {
      "id": "[PLACEHOLDER-CONTRIB-ID]",
      "session_id": "[PLACEHOLDER-SESSION-ID]",
      "stakeholder_name": "Alice Rodriguez",
      "stakeholder_role": "Security Lead",
      "contribution_type": "security_requirement",
      "content": "Agent must encrypt all data in transit using TLS 1.3. Must not store API keys in logs.",
      "created_at": "2026-04-05T11:15:22Z"
    },
    "payload_updates": {
      "security_requirements": [
        "TLS 1.3 encryption in transit",
        "No API keys in logs"
      ]
    }
  },
  "meta": {
    "requestId": "[PLACEHOLDER-UUID]",
    "timestamp": "2026-04-05T11:15:22Z"
  }
}
```

**Supported Contribution Types**

| Type | Description |
|------|-------------|
| `requirement` | Functional requirement |
| `security_requirement` | Security or compliance constraint |
| `workflow_step` | Workflow or process step |
| `integration` | External system integration |
| `constraint` | Performance, cost, or resource constraint |
| `note` | General comment or context |

**Error Codes**

| Code | Status | Description |
|------|--------|-------------|
| `SESSION_NOT_FOUND` | 404 | Session does not exist |
| `INVALID_CONTRIBUTION_TYPE` | 400 | Contribution type not recognized |

---

### 5. Get Current Intake Payload

Retrieve the latest structured intake payload without retrieving the full session.

```
GET /api/intake/{id}/payload
```

**Description**
Returns the current (possibly incomplete) intake payload derived from conversation and contributions. This is a lightweight endpoint useful for periodic polling or before triggering blueprint generation.

**Path Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Session ID |

**Response** (200 OK)

```json
{
  "success": true,
  "data": {
    "payload": {
      "agent_name": "Claims Auto-Processor",
      "agent_description": "Processes insurance claims with document analysis and policy validation",
      "tools": [
        {
          "name": "parse_claim_form",
          "description": "Extract structured data from claim submission forms",
          "input_schema": {
            "type": "object",
            "properties": {
              "document_path": { "type": "string" }
            },
            "required": ["document_path"]
          }
        },
        {
          "name": "validate_policy",
          "description": "Check if a policy is active and eligible",
          "input_schema": {
            "type": "object",
            "properties": {
              "policy_id": { "type": "string" }
            },
            "required": ["policy_id"]
          }
        }
      ],
      "workflows": [
        {
          "name": "process_claim",
          "steps": [
            "Parse claim form",
            "Validate policy eligibility",
            "Route for approval or rejection"
          ]
        }
      ],
      "requirements": [
        "Must support manual override",
        "Must log all decisions",
        "TLS 1.3 encryption in transit",
        "No API keys in logs"
      ],
      "constraints": {
        "max_processing_time_seconds": 30,
        "max_concurrent_claims": 100
      },
      "completion_percentage": 75
    }
  },
  "meta": {
    "requestId": "[PLACEHOLDER-UUID]",
    "timestamp": "2026-04-05T11:30:00Z"
  }
}
```

**Error Codes**

| Code | Status | Description |
|------|--------|-------------|
| `SESSION_NOT_FOUND` | 404 | Session does not exist |

---

## Session Lifecycle

| Status | Description | Valid Transitions |
|--------|-------------|-------------------|
| `active` | Session is open for intake | → `finalizing`, `archived` |
| `finalizing` | Intake is being compiled; no new messages accepted | → `finalized`, `active` |
| `finalized` | Intake is locked; payload ready for generation | → `archived` |
| `archived` | Session is closed; read-only | (none) |

To transition a session:
```
PATCH /api/intake/{id}
{
  "status": "finalizing"
}
```

---

## Rate Limits

- **50 messages/min** per session
- **200 stakeholder contributions/day** per enterprise
- **10 concurrent active sessions** per enterprise (standard tier)

See [Rate Limits](../../08-security-trust/data-handling-encryption.md) for upgrade options.

---

## Example: Full Intake Workflow

```bash
# 1. Create session
curl -X POST https://[host]/api/intake \
  -H "Authorization: Bearer [TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{
    "enterprise_id": "[ENT-ID]",
    "title": "Claims Agent",
    "stakeholders": [{"name": "John", "role": "PM", "email": "john@co.com"}]
  }' | jq .data.intake_session.id

# 2. Stream conversation (response is SSE)
curl -X POST https://[host]/api/intake/[SESSION-ID]/message \
  -H "Authorization: Bearer [TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{"message": "needs policy validation", "user_name": "John"}'

# 3. Add security requirement
curl -X POST https://[host]/api/intake/[SESSION-ID]/stakeholder \
  -H "Authorization: Bearer [TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{
    "stakeholder_name": "Alice",
    "stakeholder_role": "Security",
    "contribution_type": "security_requirement",
    "content": "TLS 1.3 required"
  }'

# 4. Retrieve final payload
curl -X GET https://[host]/api/intake/[SESSION-ID]/payload \
  -H "Authorization: Bearer [TOKEN]"

# 5. Use payload to generate blueprint (see Blueprints API)
```

---

## See Also

- [Intake Engine Concept](../../02-getting-started/engineer-setup-guide.md)
- [Blueprints API](blueprints-api.md) — Generate ABP from payload
- [API Quickstart](../../02-getting-started/engineer-setup-guide.md) — Code examples and SDKs
