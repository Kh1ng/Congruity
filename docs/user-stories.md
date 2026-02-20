# Congruity User Stories (v0.2)

## Remaining Implementation Checklist
- [ ] WebRTC: WSS signaling in production + TLS/reverse-proxy documentation.
- [ ] WebRTC: offer/answer glare handling.
- [ ] WebRTC: TURN support + env configuration docs.
- [ ] UI: member list panel (dockable) with presence.
- [ ] UI: channels CRUD UI (create/edit/delete + topics/slow mode).
- [ ] UI: message edit/delete UI + edited indicator.
- [ ] UI: DM thread list + realtime updates.
- [ ] UI: presence/status controls + unread/mention indicators.
- [ ] UI: search, pins, typing indicators.
- [ ] TDD: expand tests for hooks + WebRTC + CLI.
- [ ] CLI: watch mode, typing indicator, message edits.
- [ ] Infra: resolve dashboard upload issue.
- [ ] Ops: Ollama embeddings availability + fallback behavior.
- [ ] Self-hosting: one-command setup for signaling + MinIO with cloud Supabase option.
- [ ] Self-hosting: persist per-server backend mapping (signaling/storage endpoints).
- [ ] Installer/TUI: generate copy-paste backend registration SQL for hobbyist setup in under 5 minutes.

## Auth & Profiles
### Core Authentication
- As a user, I can sign up with email + password.
- As a user, I can sign up with OAuth (Google/GitHub/etc).
- As a user, I can verify my email.
- As a user, I can reset my password.
- As a user, I can change my password.
- As a user, I can log out of one device.
- As a user, I can log out of all devices.
- As a user, I can see active sessions and revoke them.
- As a user, I can enable 2FA (TOTP).
- As a user, I can disable 2FA.
- As a user, I can use backup codes.

### Identity Model
- As a user, I have an immutable user ID.
- As a user, I have a global username (unique).
- As a user, I have a global display name (non-unique).
- As a user, I can set an avatar.
- As a user, I can set an optional banner.
- As a user, I can set an optional bio.
- As a user, I can change avatar.
- As a user, I can change display name.
- As a user, I can change username (with cooldown).
- As a user, I can delete my account.

### Per-Server Identity
- As a user, I can set a per-server nickname.
- As a user, I can set a per-server avatar (future).
- As a moderator, I can reset another user's nickname.

### Presence
- As a user, I can set status (online, idle, do not disturb, invisible).
- As a user, I can set a custom status message.
- As a friend, I can see presence.
- As a server member, I can see presence (if allowed).

## Servers (Guilds)
### Creation
- As a user, I can create a server.
- As a user, I can set server name.
- As a user, I can set server icon.
- As a user, I can set server description.
- As a user, I can choose server type (community, private, self-hosted).

### Hosting Modes
- As a user, I can connect to a remote cloud server.
- As a user, I can connect to a self-hosted server.
- As a user, I can switch between servers without restarting the client.
- As a server owner (self-hosted), I can generate server invite links.
- As a server owner (self-hosted), I can disable public invites.
- As a server owner (self-hosted), I can require approval for joining.

### Membership
- As a user, I can join via invite code.
- As a user, I can preview a server before joining.
- As a user, I can leave a server.
- As a user, I can mute a server.
- As a user, I can reorder my servers.
- As a user, I can group servers into folders.

### Deletion & Transfer
- As an owner, I can delete a server.
- As an owner, I must confirm deletion.
- As an owner, I can transfer ownership.
- As an owner, I can archive a server instead of deleting.

## Channels
### Channel Types
- Text channel.
- Voice channel.
- Forum channel.
- Announcement channel.
- Category container.

### Channel Management
- As an admin/mod, I can create a channel.
- As an admin/mod, I can set channel topic.
- As an admin/mod, I can set slow mode.
- As an admin/mod, I can archive a channel.
- As an admin/mod, I can lock a channel.
- As an admin/mod, I can set per-channel permissions.

### Channel Permissions
- View channel.
- Send messages.
- Send attachments.
- Add reactions.
- Start threads.
- Pin messages.
- Manage messages.
- Manage channel.

### Channel Navigation
- As a user, I see only channels I can view.
- As a user, I see unread indicators.
- As a user, I see mention indicators.
- As a user, I can mark channel as read.
- As a user, I can jump to first unread.

### Threads
- As a user, I can start a thread from a message.
- As a user, I can reply inside a thread.
- As a user, I can leave a thread.
- As a user, I can auto-join a thread on reply.
- As a user, I can see archived threads.

## Messaging
### Sending
- As a user, I can send text messages.
- As a user, I can send multiline messages.
- As a user, I can edit my message.
- As a user, I can delete my message.
- As a user, I can reply to a message.
- As a user, I can mention users.
- As a user, I can mention roles.
- As a user, I can attach files.
- As a user, I can paste images.
- As a user, I can embed links.
- As a user, I can react to messages.

### Editing & Deleting
- Edits show an edited indicator.
- Delete removes message from feed.
- Moderators can delete any message.
- Moderators can see who deleted a message (optional audit log).

### History
- As a user, I can scroll infinitely upward.
- As a user, I can search messages.
- As a user, I can jump to a specific message ID.
- As a user, I can view pinned messages.
- As a user, I can filter by user.

### Realtime Behavior
- Messages appear instantly (optimistic update).
- If send fails, message shows failed state.
- If connection drops, show reconnecting.
- Typing indicator shows when someone is typing.

## Friends & DMs
### Friend System
- As a user, I can send friend request by username.
- As a user, I can cancel a sent request.
- As a user, I can accept or decline a request.
- As a user, I can block a user.
- As a user, I can remove a friend.

### Privacy Controls
- As a user, I can disable friend requests.
- As a user, I can restrict DMs to friends only.
- As a user, I can restrict DMs from specific server members.

### DMs
- As a user, I can create a DM with a friend.
- As a user, I can create a group DM.
- As a user, I can leave a group DM.
- As a user, I can rename a group DM.
- As a user, I can mute a DM.
- As a user, only participants can read DMs.
- As a user, moderators cannot read DMs.
- As a user, super users cannot read DMs.

## Voice / Video
### Voice Channel
- As a user, I can join a voice channel.
- As a user, I can leave a voice channel.
- As a user, I can mute or unmute myself.
- As a user, I can deafen myself.
- As a user, I can see who is speaking.
- As a user, I can change input/output device.
- As a user, I can adjust per-user volume.

### Moderation
- As a mod, I can mute another user.
- As a mod, I can move a user to another channel.
- As a mod, I can disconnect a user.

### Video
- As a user, I can enable camera.
- As a user, I can share screen.
- As a user, I can select monitor or window.
- As a user, I can stop sharing.

## Moderation
### Member Management
- Kick.
- Ban.
- Temporary ban.
- Timeout user.
- Remove roles.
- Assign roles.

### Role System
- Create role.
- Delete role.
- Reorder roles.
- Assign permissions to roles.
- Set role color.
- Set role mentionable.

### Audit Log
- As an admin, I can view moderation logs.
- As an admin, I can see who did what.
- As an admin, I can see message deletions.

## UX / Layout / Themes
### Layout
- Collapse left rail.
- Collapse channel list.
- Collapse member list.
- Resize panels.
- Dock panels to different regions.
- Float panels.
- Save layout preset.
- Restore layout preset.

### Theme
- Switch light/dark.
- Set accent color.
- Set font size.
- Set density (compact, comfortable).
- Set border radius.
- Set custom CSS override (advanced mode).

### Feedback
- Loading spinners.
- Skeleton states.
- Error toasts.
- Retry buttons.
- Offline indicator.

## CLI / TUI Parity
### Auth
- congruity login.
- congruity logout.
- congruity whoami.

### Servers
- congruity servers list.
- congruity servers join <code>.
- congruity servers leave <id>.

### Channels
- congruity channels list <server>.
- congruity channels watch <channel>.
- congruity channels send <channel> "message".

### Messaging
- congruity messages read <channel>.
- congruity messages send <channel>.

### Friends
- congruity friends list.
- congruity friends add <username>.
- congruity dm send <user>.

### Realtime CLI Mode
- congruity watch <channel>.
- Live updates stream in terminal.
- Typing indicator is textual.
- Ctrl+C exits.

## Security & Constraints
- Super users cannot read DMs.
- Super users cannot override encryption.
- Self-hosted admins can see server data.
- Self-hosted admins cannot decrypt end-to-end DMs (if implemented).

## Cross-Cutting Concerns (Decide Early)
- Message retention policy.
- Soft delete vs hard delete.
- End-to-end encryption for DMs.
- Federation between servers.
- Rate limits.
- Anti-spam.
- Invite expiration.
- File size limits.
- Offline message queue.

## Critical Architectural Implications
### Shared API Surface
- Unified REST/RPC.
- Unified websocket event model.
- Shared permission logic.
- Shared identity tokens.
- Shared rate limits.
- CLI must not be a second-class citizen.
