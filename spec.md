# Specification

## Summary
**Goal:** Add project dropdown navigation in the topbar and implement session management for project selection.

**Planned changes:**
- Add a project dropdown component in the topbar between the page title and user icon that displays the current project name
- Display all available projects and a "Neues Projekt erstellen" option in the dropdown menu
- Navigate to WelcomeScreen after login/logout with three options: create new project, return to existing project, or join existing project
- Auto-load the last used project from LocalStorage when accessing the app directly via URL
- Store the currently selected project ID in LocalStorage whenever a user switches projects
- Verify project access permissions before loading projects from LocalStorage or switching projects

**User-visible outcome:** Users can quickly switch between projects using the topbar dropdown, and the app remembers their last selected project for seamless navigation on return visits.
