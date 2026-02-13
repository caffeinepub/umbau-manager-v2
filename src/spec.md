# Specification

## Summary
**Goal:** Restore end-to-end functionality on the Contacts page so users can successfully create new contacts and helpful links, with results persisted and shown immediately.

**Planned changes:**
- Fix the Contacts page “New contact” submission flow to persist a new contact for the logged-in user in the backend and return it via the existing contacts list query.
- After successful contact creation, invalidate/refetch the contacts React Query cache so the new contact appears immediately without a manual reload.
- Fix the Contacts page “New link” submission flow to persist a new link for the logged-in user in the backend and return it via the existing links list query.
- After successful link creation, invalidate/refetch the links React Query cache so the new link appears immediately without a manual reload.
- Preserve existing required-field validation behavior and avoid any unrelated UI/feature changes outside what’s necessary to restore these two create flows.

**User-visible outcome:** On the Contacts page, the user can create a new contact and a new helpful link without console errors, and each newly created item appears right away in its corresponding list and remains available after refresh/login.
