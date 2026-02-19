# Specification

## Summary
**Goal:** Implement a welcome screen with invite code system that allows users to either create a new family (as admin) or join an existing family using a one-time invite code.

**Planned changes:**
- Create backend invite code generation and validation functions with Map-based storage
- Implement one-time use invite codes that auto-delete after use
- Export all invite-related actor methods to fix 'Actor not available' error
- Create welcome screen with app icon at top and centered layout
- Add 'Create a New Family' button (green/primary) that makes user the admin/owner
- Add 'Join Existing Family' button (gray/secondary) with invite code input dialog
- Add 'or' text divider between the two action buttons
- Add logout link at bottom of welcome screen
- Show welcome screen to authenticated users who haven't joined or created a family

**User-visible outcome:** After login, users see a welcome screen where they can either create a new family (becoming the admin) or join an existing family by entering an invite code. The invite codes work as one-time use codes that disappear after being used.
