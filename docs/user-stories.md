# Congruity MVP — User Stories (Draft)

> Goal: A lightweight, testable MVP focused on core chat + calling workflows.
> Each story links to its automated test(s).

## Legend
- **US-###** = User Story ID
- **Tests** = file(s) that validate the story

---

## Auth & Entry

### US-001 — Sign up
**As a** new user, **I want** to create an account, **so that** I can start using Congruity.
- **Acceptance Criteria**:
  - Sign up form allows email, password, username
  - Submits sign up via Supabase auth
  - Shows a confirmation message on success
- **Tests**:
  - `client/src/Components/Login.test.jsx::sign-up flow`

### US-002 — Login
**As a** returning user, **I want** to log in, **so that** I can access my servers and chats.
- **Acceptance Criteria**:
  - Login form accepts email/password
  - Submits sign in via Supabase auth
- **Tests**:
  - `client/src/Components/Login.test.jsx::login flow`

### US-003 — Toggle login/sign up
**As a** user, **I want** to switch between login and sign up modes.
- **Acceptance Criteria**:
  - Toggle button switches form mode
  - Username field appears only in sign up
- **Tests**:
  - `client/src/Components/Login.test.jsx::toggle`

---

## Servers

### US-010 — View my servers
**As a** user, **I want** to see servers I belong to, **so that** I can navigate to them.
- **Acceptance Criteria**:
  - Server list renders with existing servers
  - Empty state shown if none
- **Tests**:
  - `client/src/Components/ServerList.test.jsx::renders servers`
  - `client/src/Components/ServerList.test.jsx::empty state`

### US-011 — Create server
**As a** user, **I want** to create a server, **so that** I can start a community.
- **Acceptance Criteria**:
  - Server creation form submits name
  - New server appears in list
- **Tests**:
  - `client/src/Components/ServerList.test.jsx::create server`

### US-012 — Join server
**As a** user, **I want** to join a server by invite code.
- **Acceptance Criteria**:
  - Join form accepts invite code
  - Join action is invoked
- **Tests**:
  - `client/src/Components/ServerList.test.jsx::join server`

---

## Messaging

### US-020 — View channel messages
**As a** user, **I want** to view messages in a channel.
- **Acceptance Criteria**:
  - Message list renders
  - Loading state shown while fetching
- **Tests**:
  - `client/src/Components/Message.test.jsx::renders messages`

### US-021 — Send a message
**As a** user, **I want** to send a message to the channel.
- **Acceptance Criteria**:
  - Message input submits
  - sendMessage is called with content
- **Tests**:
  - `client/src/Components/Message.test.jsx::send message`

---

## Voice/Video

### US-030 — Join a call room
**As a** user, **I want** to join a voice/video room.
- **Acceptance Criteria**:
  - Join button starts WebRTC call
  - Leave button ends call
- **Tests**:
  - `client/src/Components/VideoChat.test.jsx::join/leave`

### US-031 — Basic media controls
**As a** user, **I want** to mute/unmute and toggle video.
- **Acceptance Criteria**:
  - Mute and Video toggle call handlers
- **Tests**:
  - `client/src/Components/VideoChat.test.jsx::controls`

### US-032 — Screen share
**As a** user, **I want** to share my screen in a room.
- **Acceptance Criteria**:
  - Start/Stop share call handlers
- **Tests**:
  - `client/src/Components/VideoChat.test.jsx::screen share`
