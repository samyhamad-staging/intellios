---
id: "10-015"
title: "Concurrent Refinement Produces Errors or Overwrites Changes"
slug: "blueprint-refinement-conflicts"
type: "troubleshooting"
audiences: ["engineering"]
status: "published"
version: "1.0.0"
platform_version: "1.2.0"
created: "2026-04-05"
updated: "2026-04-05"
tags: ["refinement", "concurrency", "conflicts", "collaboration", "data-loss"]
tldr: "Two users refining the same blueprint simultaneously causes conflicts or lost changes. Known issue in v1.2.0; serialization lock coming v1.3.0. Workaround: assign one refinement owner per blueprint. Stale session or browser tab conflicts also cause issues."
feedback_url: "https://feedback.intellios.ai/kb"
---

## TL;DR

Concurrent refinement by multiple users causes merge conflicts, lost edits, or "Conflict detected" errors. Known issue in v1.2.0 (serialization lock fix in v1.3.0). Workaround: designate single refinement owner. Check for stale sessions and concurrent browser tabs.

---

## Symptom

- Refinement UI shows error: `REFINEMENT_CONFLICT_DETECTED`
- User A's changes are overwritten by User B's simultaneous changes
- "Your changes were not saved due to a conflict" warning appears
- Blueprint reverts to earlier state unexpectedly
- Two browser tabs with same blueprint in refinement mode conflict with each other

---

## Possible Causes (by likelihood)

1. **Concurrent users refinement** — Multiple users editing same blueprint simultaneously (known issue, fix pending v1.3.0)
2. **Stale session** — User has blueprint open in refinement for >15 minutes without edits; session becomes stale
3. **Multiple browser tabs** — Same user has blueprint open in 2+ tabs; edits in one tab invalidate the other
4. **Unsaved changes timeout** — User leaves refinement editor idle; connection times out; changes lost
5. **Sync conflict on autosave** — Autosave triggered while user is editing; save conflicts with in-flight changes

---

## Diagnosis Steps

### Step 1: Check blueprint lock status
Log into platform → Blueprints → [Blueprint] → Details. Look for:
- "Locked by: [User Name]" — Blueprint is locked to one user during refinement
- "Lock expires: [Timestamp]" — Lock is active until this time
- No lock indicator — Blueprint should be available for refinement

### Step 2: Verify who is currently editing
```bash
# API call to check blueprint lock status
curl -H "Authorization: Bearer $TOKEN" \
  https://api.intellios.ai/v1/blueprints/{blueprint_id} | jq '.lock'

# Response:
# {
#   "locked": true,
#   "locked_by_user_id": "user_xyz",
#   "locked_by_user_name": "alice@company.com",
#   "locked_at": "2026-04-05T10:00:00Z",
#   "lock_expires_at": "2026-04-05T10:15:00Z"
# }
```

### Step 3: Check browser tab count
Open Developer Tools (F12) → Application → Local Storage. Look for keys containing `refinement_session`:
```javascript
// In browser console:
Object.keys(localStorage).filter(k => k.includes('refinement')).forEach(k => console.log(k));
```

If multiple keys for same blueprint, you have multiple tabs open.

### Step 4: Review refinement activity log
Log into platform → Blueprints → [Blueprint] → Activity. Look for:
- Timestamp of conflicting changes
- Which user made which change
- Order of changes (which was applied first?)

### Step 5: Test concurrent access scenario
With two users/browsers:
1. User A: Open blueprint in refinement
2. User B: Open same blueprint in refinement
3. User A: Make a change and save
4. User B: Make a different change and try to save
5. Observe: Does User B get conflict error, or is change silently lost?

---

## Resolution

### If multiple users refining concurrently:
1. **Known issue in v1.2.0:** Serialization lock not fully implemented. Fix shipping in v1.3.0.
2. **Immediate workaround:** Designate a single "refinement owner" per blueprint
   - Only one person refines at a time
   - Other users wait for refinement to complete and be submitted
3. Implement team process:
   - User opens blueprint for refinement
   - User posts in team chat: "Refining blueprint-xyz; est. 1 hour"
   - Others don't open same blueprint until notified completion
4. **Verify:** With one user, no conflicts occur; changes save successfully

### If stale refinement session:
1. Close the refinement editor: click "Exit Refinement" or close tab
2. Wait 5 seconds
3. Re-open blueprint in refinement UI
4. Session will be fresh; previous edits may be lost, but no conflicts
5. **Verify:** Fresh session has no stale data; edits save immediately

### If multiple browser tabs:
1. Close all tabs except one for the blueprint
2. In the remaining tab, refresh: Ctrl+R or Cmd+R
3. Resume refinement in that single tab
4. **Verify:** No conflicts; edits save without errors

### If unsaved changes timeout:
1. Refinement session expires after 15 minutes of inactivity
2. You'll see warning: "Session expiring in 2 minutes"
3. Click "Save" or "Extend Session" to prevent timeout
4. If session times out, changes in the editor are lost (not synced to server)
5. Prevention: save frequently; don't leave refinement UI idle >10 min
6. **Verify:** Changes are synced to server; blueprint shows updated timestamp

### If autosave conflict:
1. Enable "Manual Save" mode instead of "Autosave":
   - Refinement → Settings → Toggle "Autosave" OFF
2. Manually click "Save" after making changes
3. This gives you more control and reduces sync conflicts
4. **Verify:** Save succeeds without conflicts; no data loss

---

## Workarounds (until v1.3.0)

**For teams needing concurrent refinement:**
1. Export blueprint to JSON: Blueprints → [Blueprint] → Export
2. Send to second user via email or Git
3. User refines locally (merge-friendly format)
4. User re-imports JSON: Blueprints → Import
5. Combine changes manually if needed
6. This is cumbersome but avoids server-side conflicts

**Lock-based refinement queue:**
1. Admin → Settings → "Refinement Lock Mode" = "Enabled"
2. First user to open refinement gets exclusive lock
3. Other users see "Locked by [User]" message and must wait
4. Lock auto-releases after 1 hour or when user clicks "Exit Refinement"

---

## Prevention

- **Team policy:** Define refinement workflow; assign one owner per blueprint
- **Session timeout alerts:** Configure alerts for stale sessions; prompt user to save
- **Monitoring:** Track conflict rate in logs; alert if >5% of refinements conflict
- **Upgrade planning:** Plan upgrade to v1.3.0+ as soon as available (serialization lock fixes this)
- **Testing:** Before production rollout of concurrent refinement features, test thoroughly with 5+ concurrent users

---

## Escalation

For data loss issues or blocked refinement workflows, see [escalation-paths.md](../escalation-paths.md). Include blueprint ID and timestamp of conflict.

---

## Related Articles

- [Blueprint Refinement Guide](../03-core-concepts/blueprint-refinement.md)
- [Collaborative Workflows](../06-use-cases-playbooks/collaborative-workflows.md)
- [Session Management API](../04-architecture-integration/session-api.md)
- [Data Consistency Patterns](../04-architecture-integration/data-consistency.md)
- [v1.3.0 Release Notes](../12-release-notes/v1.3.0-beta.md)
