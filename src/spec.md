# Specification

## Summary
**Goal:** Fix Media deletion and PDF thumbnail previews, enable editing project cost items in the Roadmap editor, and allow projects to be created/edited without mandatory dates.

**Planned changes:**
- Implement a backend `deleteMedia` API and wire the frontend Media delete action to it, ensuring blobs and metadata are removed and the Media list refreshes correctly.
- Improve Media grid PDF previews to render a first-page thumbnail when possible, with a safe fallback to a generic PDF icon and a non-blocking error state.
- Extend the Roadmap “Edit Project” dialog to load and allow add/edit/remove of cost items, and ensure saved changes are reflected on the Kostenübersicht page.
- Make project start/end dates optional in create and edit flows, allow clearing existing dates, and update Roadmap/calendar rendering to handle undated projects consistently without crashes.

**User-visible outcome:** Users can reliably delete uploaded media, see proper PDF thumbnails in the Media grid when available, edit a project’s cost items directly in the Roadmap editor (synced to the cost overview), and create or edit projects without having to set dates.
