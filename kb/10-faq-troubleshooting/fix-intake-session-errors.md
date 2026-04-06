---
id: "10-011"
title: "Intake Session Fails to Start, Freezes, or Loses Data"
slug: "intake-session-errors"
type: "troubleshooting"
audiences: ["engineering", "product"]
status: "published"
version: "1.0.0"
platform_version: "1.2.0"
created: "2026-04-05"
updated: "2026-04-05"
tags: ["intake", "sessions", "forms", "data-loss", "timeouts"]
tldr: "Intake session fails to initialize, freezes mid-conversation, or loses user data. Common causes: 30-minute session timeout, concurrent editing conflicts, invalid form context data. Clear browser cache and check session storage."
feedback_url: "https://feedback.intellios.ai/kb"
---

## TL;DR

Intake session fails to start, hangs indefinitely, or loses unsaved data. Causes: 30-minute session timeout, concurrent tab editing conflicts, invalid form context. Clear browser cache, disable concurrent sessions, and verify form submission.

---

## Symptom

- Intake session creation fails with error: `INTAKE_SESSION_INIT_FAILED`
- UI shows loading spinner indefinitely; intake form never appears
- Session freezes mid-conversation after 20-30 minutes of inactivity
- User answers are lost when page refreshes or browser tab closes unexpectedly
- Form submission fails with error: `CONTEXT_VALIDATION_ERROR`

---

## Possible Causes (by likelihood)

1. **Session timeout** — Default session TTL is 30 minutes of inactivity; session expired
2. **Concurrent editing conflict** — Same user editing intake in multiple browser tabs simultaneously
3. **Invalid context form data** — Form submission contains malformed data or missing required fields
4. **Browser cache stale** — Cached assets conflict with current API state; frontend out of sync
5. **Network connectivity loss** — WebSocket connection dropped; session state lost

---

## Diagnosis Steps

### Step 1: Check session status
Log into platform → Intakes. Look for your session:
- Status "Active" = session still valid
- Status "Expired" = session timed out (need to restart)
- Status "Conflict" = concurrent editing detected

### Step 2: Inspect browser console
Open Developer Tools (F12) → Console. Look for errors:
- `WebSocket closed unexpectedly` — Connection lost
- `CONTEXT_VALIDATION_ERROR` — Form data malformed
- `Session storage quota exceeded` — Browser storage full

### Step 3: Check form data validity
In Developer Tools → Storage → Local Storage, find key `intake_session_{session_id}`:
```javascript
// In browser console:
const data = JSON.parse(localStorage.getItem('intake_session_YOUR_SESSION_ID'));
console.log(data);

// Verify structure matches intake form schema
// Look for null values in required fields
```

### Step 4: Test concurrent sessions
Attempt to open the same intake session in two browser tabs. Observe:
- Second tab shows warning: "Session already open in another tab"
- Form becomes read-only or shows sync conflict dialog
- Attempting to edit triggers conflict error

### Step 5: Check session lifetime
```bash
# Query session metadata via API
curl -H "Authorization: Bearer $TOKEN" \
  https://api.intellios.ai/v1/intakes/{intake_id}/session

# Response includes:
# {
#   "session_id": "sess_xyz",
#   "status": "active",
#   "created_at": "2026-04-05T10:00:00Z",
#   "expires_at": "2026-04-05T10:30:00Z",
#   "idle_since": "2026-04-05T10:27:30Z"
# }

# If idle_since is >30 min ago, session is expired
```

---

## Resolution

### If session timeout:
1. Restart the intake session: click "New Session" or refresh the page
2. You will restart from the beginning; previous data is lost
3. Prevention: enable auto-save feature (if available) or submit form sections incrementally
4. **Verify:** New session created successfully; timer shows "Session expires in 30 min"

### If concurrent editing conflict:
1. Close all browser tabs except one
2. Refresh the page to recover the active session
3. Set browser to block multiple intake windows (contact support for this setting)
4. If working with a team, use a shared session with invited collaborators (Admin → Sessions → Share)
5. **Verify:** Single tab is active; form is editable

### If invalid form context:
1. Clear browser cache and local storage:
   - Windows/Linux: Ctrl+Shift+Delete
   - Mac: Cmd+Shift+Delete
   - Select "Cookies and cached images/files"; clear for "All time"
2. Close and reopen the browser tab
3. Reload the intake form
4. Carefully fill in required fields (marked with red asterisk)
5. Submit each section immediately after completing (don't wait until end)
6. **Verify:** Form submission succeeds; no validation errors

### If network connectivity lost:
1. Check internet connection: open a new tab to google.com
2. If connection is unstable, reconnect to stable WiFi or wired connection
3. Close the intake tab and reopen it
4. If you had entered data, it may be recoverable:
   ```javascript
   // In browser console, check local storage
   Object.keys(localStorage).filter(k => k.includes('intake')).forEach(k => console.log(localStorage[k]));
   ```
5. Manually re-enter data and submit
6. **Verify:** Session reconnects; form is responsive

### If browser cache stale:
1. Hard refresh the page: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
2. Clear service worker cache:
   - Dev Tools → Application → Service Workers → Unregister
3. Clear browser cache: Ctrl+Shift+Delete
4. Reload intake form
5. **Verify:** Form loads and renders correctly; no JavaScript errors in console

---

## Prevention

- **Session awareness:** Display session expiration countdown (default: 30 min)
- **Auto-save:** Enable browser-based auto-save of form data to local storage
- **Concurrent session detection:** Warn user if intake opened in another tab
- **Connection monitoring:** Implement offline detection; queue data if connection lost
- **Form validation:** Validate form data before submission; show specific field errors
- **Session extension:** Allow users to extend session TTL by clicking "Keep me logged in" (adds 15 min)

---

## Escalation

For persistent session issues or data loss, see [escalation-paths.md](../escalation-paths.md). Include session ID and timestamp.

---

## Related Articles

- [Intake Engine Guide](../03-core-concepts/intake-engine.md)
- [Form Submission Best Practices](../02-getting-started/form-best-practices.md)
- [Browser Cache Management](../07-administration-operations/browser-cache.md)
- [Session Management API](../04-architecture-integration/session-api.md)
