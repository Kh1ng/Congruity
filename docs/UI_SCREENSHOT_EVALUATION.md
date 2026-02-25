# UI Screenshot Evaluation (Alpha)

Use this checklist when reviewing UI changes across desktop, tablet, and mobile targets.

This is a manual review companion to the responsive layout tests in:
- `client/src/lib/uiLayout.test.js`

## Viewport Matrix (Required)

Capture screenshots for these sizes:

- `390x844` (iPhone class)
- `430x932` (large iPhone)
- `768x1024` (iPad portrait)
- `1024x768` (tablet landscape)
- `1280x800` (small laptop)
- `1440x900` (laptop)
- `1920x1080` (desktop)

## Screens to Capture

- Home view with no server selected
- Server selected with text channel
- Server selected with voice channel
- Settings panel open: `Application`
- Settings panel open: `Account`
- Settings panel open: `Server`

## What to Evaluate

### Responsiveness

- Panels shrink before collapsing
- Right settings/member panel collapses at narrower widths
- Mobile stack layout is used under small widths
- No clipped text/buttons
- No unusable empty whitespace

### Visual Density / Polish

- Sidebar spacing is compact enough (not oversized)
- Voice dock is proportional to available space
- Borders and surfaces are visible (especially Gruvbox/Tokyo Night)
- Hover/selected states are obvious

### Theming

- No hardcoded stray colors (blue/slate mismatches)
- Tokyo Night / Gruvbox surfaces contrast correctly
- Background opacity and panel opacity sliders visibly affect UI

### Settings Information Architecture

- `Application` contains UI + device defaults
- `Account` contains profile/account controls
- `Server` contains server-specific controls/roles area

## Suggested Review Workflow

1. Test `gruvbox`, `tokyo-night`, and `monokai`
2. Capture all viewport matrix screenshots in web
3. Repeat spot-check on Tauri desktop
4. Spot-check mobile/tablet layouts on iOS/Android builds once available

## Naming Convention (Optional)

Use a predictable filename format:

`<platform>-<theme>-<viewport>-<screen>.png`

Example:

`web-gruvbox-1440x900-home-voice.png`
