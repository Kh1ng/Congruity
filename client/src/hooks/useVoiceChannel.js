import { useCallback, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

const DEFAULT_SIGNALING_URL =
  typeof window !== "undefined"
    ? `${
        window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
          ? "ws"
          : window.location.protocol === "https:"
            ? "wss"
            : "ws"
      }://${window.location.hostname}:3001`
    : "ws://localhost:3001";

const SIGNALING_URL = import.meta.env.VITE_SIGNALING_URL || DEFAULT_SIGNALING_URL;

function toHttpBase(rawUrl) {
  if (rawUrl.startsWith("wss://")) return rawUrl.replace("wss://", "https://");
  if (rawUrl.startsWith("ws://")) return rawUrl.replace("ws://", "http://");
  return rawUrl;
}

function readParticipantStreamTrack(publication) {
  const track = publication?.track;
  return track?.mediaStreamTrack || null;
}

function buildParticipantStream(participant) {
  if (!participant) return null;
  const tracks = [];

  participant.audioTrackPublications?.forEach((publication) => {
    const mediaTrack = readParticipantStreamTrack(publication);
    if (mediaTrack) tracks.push(mediaTrack);
  });

  participant.videoTrackPublications?.forEach((publication) => {
    const mediaTrack = readParticipantStreamTrack(publication);
    if (mediaTrack) tracks.push(mediaTrack);
  });

  if (tracks.length === 0) return null;
  return new MediaStream(tracks);
}

function mapParticipant(participant, isLocal = false) {
  return {
    identity: participant.identity,
    sid: participant.sid,
    name: participant.name || participant.identity,
    isSpeaking: false,
    isLocal,
    metadata: participant.metadata || "",
    participant,
    hasVideo: participant.isCameraEnabled || false,
  };
}

export function useVoiceChannel(options = {}) {
  const defaultSignalingUrl = options.signalingUrl || SIGNALING_URL;
  const defaultApiBase = useMemo(() => toHttpBase(defaultSignalingUrl), [defaultSignalingUrl]);

  const roomRef = useRef(null);
  const contextRef = useRef({
    channelId: null,
    serverId: null,
    apiBase: defaultApiBase,
  });

  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [roomName, setRoomName] = useState(null);
  const [livekitUrl, setLivekitUrl] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [roomUsers, setRoomUsers] = useState([]);
  const [localSocketId, setLocalSocketId] = useState(null);
  const [audioLevels, setAudioLevels] = useState({});

  const resolveApiBase = useCallback(
    (signalingUrlOverride) => toHttpBase(signalingUrlOverride || defaultSignalingUrl),
    [defaultSignalingUrl]
  );

  const getAuthToken = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || null;
  }, []);

  const fetchWithAuth = useCallback(
    async ({ apiBase, path, init = {} }) => {
      const token = await getAuthToken();
      if (!token) {
        throw new Error("Missing auth token for voice request.");
      }
      const response = await fetch(`${apiBase}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...(init.headers || {}),
        },
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || `Voice API request failed (${response.status})`);
      }
      return response.json();
    },
    [getAuthToken]
  );

  const applyDeafenState = useCallback((room, shouldDeafen) => {
    if (!room) return;
    room.remoteParticipants.forEach((participant) => {
      participant.audioTrackPublications.forEach((publication) => {
        const track = publication.track;
        if (track && publication.isSubscribed) {
          track.setVolume(shouldDeafen ? 0 : 1);
        }
      });
    });
  }, []);

  const rebuildParticipants = useCallback(
    (room) => {
      if (!room) {
        setParticipants([]);
        setLocalStream(null);
        setRemoteStreams(new Map());
        setRoomUsers([]);
        setLocalSocketId(null);
        return;
      }

      const local = room.localParticipant
        ? [
            mapParticipant(room.localParticipant, true),
          ]
        : [];

      const localTrackStream = buildParticipantStream(room.localParticipant);
      setLocalStream(localTrackStream);
      setLocalSocketId(room.localParticipant?.sid || room.localParticipant?.identity || null);

      const remoteParticipantList = Array.from(room.remoteParticipants.values());
      const remotes = remoteParticipantList.map((participant) => mapParticipant(participant));

      const nextRemoteStreams = new Map();
      const nextRoomUsers = [];
      remoteParticipantList.forEach((participant) => {
        const sid = participant.sid || participant.identity;
        const stream = buildParticipantStream(participant);
        if (sid && stream) {
          nextRemoteStreams.set(sid, stream);
        }
        nextRoomUsers.push({
          socketId: sid,
          userId: participant.identity,
          displayName: participant.name || participant.identity,
        });
      });

      setRemoteStreams(nextRemoteStreams);
      setRoomUsers(nextRoomUsers);
      setParticipants([...local, ...remotes]);
      applyDeafenState(room, isDeafened);
    },
    [applyDeafenState, isDeafened]
  );

  const join = useCallback(
    async ({ channelId, serverId, signalingUrl }) => {
      const apiBase = resolveApiBase(signalingUrl);
      setStatus("connecting");
      setError(null);

      try {
        const joinResponse = await fetchWithAuth({
          apiBase,
          path: "/api/voice/channel/join",
          init: {
            method: "POST",
            body: JSON.stringify({
              channel_id: channelId,
              server_id: serverId,
            }),
          },
        });

        const moduleName = "livekit-client";
        const livekit = await import(/* @vite-ignore */ moduleName);
        const { Room, RoomEvent } = livekit;

        const room = new Room();
        room.on(RoomEvent.ParticipantConnected, () => rebuildParticipants(room));
        room.on(RoomEvent.ParticipantDisconnected, () => rebuildParticipants(room));
        room.on(RoomEvent.LocalTrackPublished, () => rebuildParticipants(room));
        room.on(RoomEvent.LocalTrackUnpublished, () => rebuildParticipants(room));
        room.on(RoomEvent.TrackMuted, () => rebuildParticipants(room));
        room.on(RoomEvent.TrackUnmuted, () => rebuildParticipants(room));
        room.on(RoomEvent.TrackSubscribed, () => rebuildParticipants(room));
        room.on(RoomEvent.TrackUnsubscribed, () => rebuildParticipants(room));
        room.on(RoomEvent.ActiveSpeakersChanged, (activeSpeakers) => {
          const activeByIdentity = new Set(activeSpeakers.map((speaker) => speaker.identity));
          setParticipants((prev) =>
            prev.map((participant) => ({
              ...participant,
              isSpeaking: activeByIdentity.has(participant.identity),
            }))
          );

          const nextAudio = {};
          activeSpeakers.forEach((speaker) => {
            if (speaker.identity === room.localParticipant?.identity) {
              nextAudio.local = Math.max(speaker.audioLevel || 0, 0.12);
            }
            const sid = speaker.sid || speaker.identity;
            if (sid) {
              nextAudio[sid] = Math.max(speaker.audioLevel || 0, 0.12);
            }
          });
          setAudioLevels(nextAudio);
        });
        room.on(RoomEvent.Disconnected, () => {
          setStatus("idle");
          setParticipants([]);
          setLocalStream(null);
          setRemoteStreams(new Map());
          setRoomUsers([]);
          setLocalSocketId(null);
          setAudioLevels({});
        });

        await room.connect(joinResponse.livekit_url, joinResponse.token);
        await room.localParticipant.setMicrophoneEnabled(true);

        roomRef.current = room;
        contextRef.current = {
          channelId,
          serverId,
          apiBase,
        };

        setIsMuted(false);
        setIsCameraOn(false);
        setIsScreenSharing(false);
        setRoomName(joinResponse.room_name);
        setLivekitUrl(joinResponse.livekit_url);
        rebuildParticipants(room);
        setStatus("connected");
      } catch (joinError) {
        const message = String(joinError?.message || joinError);
        setStatus("error");
        setError(message);
        throw joinError;
      }
    },
    [fetchWithAuth, rebuildParticipants, resolveApiBase]
  );

  const leave = useCallback(async () => {
    const room = roomRef.current;
    const channelId = contextRef.current.channelId;
    const apiBase = contextRef.current.apiBase || defaultApiBase;
    roomRef.current = null;

    if (room) {
      room.disconnect(true);
    }

    if (channelId) {
      try {
        await fetchWithAuth({
          apiBase,
          path: "/api/voice/channel/leave",
          init: {
            method: "POST",
            body: JSON.stringify({ channel_id: channelId }),
          },
        });
      } catch {
        // Client-side disconnect remains source of truth.
      }
    }

    contextRef.current = {
      channelId: null,
      serverId: null,
      apiBase,
    };

    setParticipants([]);
    setRoomUsers([]);
    setLocalStream(null);
    setRemoteStreams(new Map());
    setLocalSocketId(null);
    setRoomName(null);
    setStatus("idle");
    setIsMuted(false);
    setIsCameraOn(false);
    setIsScreenSharing(false);
    setIsDeafened(false);
    setAudioLevels({});
  }, [defaultApiBase, fetchWithAuth]);

  const toggleMute = useCallback(async () => {
    const room = roomRef.current;
    if (!room?.localParticipant) return;
    const shouldEnableMic = isMuted;
    await room.localParticipant.setMicrophoneEnabled(shouldEnableMic);
    setIsMuted(!shouldEnableMic);
  }, [isMuted]);

  const toggleVideo = useCallback(async () => {
    const room = roomRef.current;
    if (!room?.localParticipant) return;
    const next = !isCameraOn;
    await room.localParticipant.setCameraEnabled(next);
    setIsCameraOn(next);
    rebuildParticipants(room);
  }, [isCameraOn, rebuildParticipants]);

  const toggleDeafen = useCallback(() => {
    const room = roomRef.current;
    const next = !isDeafened;
    applyDeafenState(room, next);
    setIsDeafened(next);
  }, [applyDeafenState, isDeafened]);

  const startScreenShare = useCallback(async () => {
    const room = roomRef.current;
    if (!room?.localParticipant) return;
    await room.localParticipant.setScreenShareEnabled(true);
    setIsScreenSharing(true);
    rebuildParticipants(room);
  }, [rebuildParticipants]);

  const stopScreenShare = useCallback(async () => {
    const room = roomRef.current;
    if (!room?.localParticipant) return;
    await room.localParticipant.setScreenShareEnabled(false);
    setIsScreenSharing(false);
    rebuildParticipants(room);
  }, [rebuildParticipants]);

  const listParticipants = useCallback(
    async (channelId, { signalingUrl } = {}) => {
      const apiBase = resolveApiBase(signalingUrl);
      const payload = await fetchWithAuth({
        apiBase,
        path: `/api/voice/channel/${channelId}/participants`,
        init: { method: "GET" },
      });
      return payload.participants || [];
    },
    [fetchWithAuth, resolveApiBase]
  );

  return {
    status,
    error,
    participants,
    roomName,
    livekitUrl,
    isMuted,
    isDeafened,
    isCameraOn,
    isVideoOff: !isCameraOn,
    isScreenSharing,
    isConnected: status === "connected",
    isConnecting: status === "connecting",
    localStream,
    remoteStreams,
    roomUsers,
    localSocketId,
    audioLevels,
    join,
    leave,
    listParticipants,
    toggleMute,
    toggleDeafen,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
  };
}

export default useVoiceChannel;
