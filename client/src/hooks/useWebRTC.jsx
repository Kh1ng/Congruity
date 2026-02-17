import { useState, useRef, useCallback, useEffect } from "react";
import { io } from "socket.io-client";
import { useAuth } from "@/hooks/useAuth";

const SIGNALING_URL = import.meta.env.VITE_SIGNALING_URL;
const DEFAULT_SIGNALING_URL =
  typeof window !== "undefined"
    ? `${window.location.protocol === "https:" ? "wss" : "ws"}://${
        window.location.hostname
      }:3001`
    : "ws://localhost:3001";

const TURN_URL = import.meta.env.VITE_TURN_URL;
const TURN_USERNAME = import.meta.env.VITE_TURN_USERNAME;
const TURN_CREDENTIAL = import.meta.env.VITE_TURN_CREDENTIAL;

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  ...(TURN_URL
    ? [
        {
          urls: TURN_URL,
          username: TURN_USERNAME,
          credential: TURN_CREDENTIAL,
        },
      ]
    : []),
];

/**
 * Hook for WebRTC voice/video calls
 * @param {string} roomId - Room/channel ID to join
 */
export function useWebRTC(roomId) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [error, setError] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [roomUsers, setRoomUsers] = useState([]);
  const [localSocketId, setLocalSocketId] = useState(null);

  const socketRef = useRef(null);
  const localSocketIdRef = useRef(null);
  const peerConnectionsRef = useRef(new Map());
  const peerMetaRef = useRef(new Map());
  const localStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioEnabledRef = useRef(false);

  const ensureAudioContext = useCallback(async () => {
    if (!audioEnabledRef.current) return null;
    if (audioContextRef.current) {
      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }
      return audioContextRef.current;
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioContextRef.current = new AudioContextClass();
    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  const playTone = useCallback(
    async (frequency, durationMs, startAt = 0) => {
      const context = await ensureAudioContext();
      if (!context) return;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      gain.connect(context.destination);

      const now = context.currentTime + startAt;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.15, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
      oscillator.start(now);
      oscillator.stop(now + durationMs / 1000 + 0.05);
    },
    [ensureAudioContext]
  );

  const playCue = useCallback(
    (type) => {
      if (type === "join") {
        playTone(520, 140, 0);
        playTone(740, 140, 0.16);
        return;
      }
      if (type === "leave") {
        playTone(740, 140, 0);
        playTone(520, 140, 0.16);
        return;
      }
      if (type === "connected") {
        playTone(640, 120, 0);
      }
    },
    [playTone]
  );

  const renegotiateAll = useCallback(async () => {
    if (!socketRef.current) return;
    const socket = socketRef.current;

    for (const [userId, pc] of peerConnectionsRef.current.entries()) {
      if (pc.signalingState !== "stable") continue;
      const meta = peerMetaRef.current.get(userId);
      try {
        if (meta) meta.makingOffer = true;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("offer", { offer, to: userId, roomId, from: socket.id });
      } finally {
        if (meta) meta.makingOffer = false;
      }
    }
  }, [roomId]);

  /**
   * Create a peer connection for a remote user
   */
  const createPeerConnection = useCallback(
    async (userId, createOffer) => {
      if (peerConnectionsRef.current.has(userId)) {
        return peerConnectionsRef.current.get(userId);
      }

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      const localId = localSocketIdRef.current;
      const polite = localId && userId ? localId.localeCompare(userId) < 0 : false;

      peerMetaRef.current.set(userId, {
        makingOffer: false,
        polite,
      });

      // Add local tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current);
        });
      }

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit("ice-candidate", {
            candidate: event.candidate,
            to: userId,
            roomId,
            from: socketRef.current.id,
          });
        }
      };

      // Handle remote stream
      pc.ontrack = (event) => {
        console.log("Received remote track from:", userId);
        const inboundStream = event.streams?.[0]
          ? event.streams[0]
          : new MediaStream([event.track]);
        setRemoteStreams((prev) => {
          const updated = new Map(prev);
          updated.set(userId, inboundStream);
          return updated;
        });
      };

      pc.onconnectionstatechange = () => {
        console.log(`Connection state with ${userId}:`, pc.connectionState);
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          removePeerConnection(userId);
        }
      };

      peerConnectionsRef.current.set(userId, pc);

      // Create and send offer if we're the initiator
      if (createOffer && socketRef.current) {
        const meta = peerMetaRef.current.get(userId);
        try {
          if (meta) meta.makingOffer = true;
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socketRef.current.emit("offer", {
            offer,
            to: userId,
            roomId,
            from: socketRef.current.id,
          });
        } finally {
          if (meta) meta.makingOffer = false;
        }
      }

      return pc;
    },
    [roomId]
  );

  /**
   * Remove a peer connection
   */
  const removePeerConnection = useCallback((userId) => {
    const pc = peerConnectionsRef.current.get(userId);
    if (pc) {
      pc.close();
      peerConnectionsRef.current.delete(userId);
      peerMetaRef.current.delete(userId);
    }
    setRemoteStreams((prev) => {
      const updated = new Map(prev);
      updated.delete(userId);
      return updated;
    });
  }, []);

  /**
   * Initialize Socket.IO connection
   */
  const initSocket = useCallback(() => {
    if (socketRef.current?.connected) return socketRef.current;

    const socket = io(SIGNALING_URL || DEFAULT_SIGNALING_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socket.on("connect", () => {
      console.log("Connected to signaling server");
      localSocketIdRef.current = socket.id;
      setLocalSocketId(socket.id);
      if (roomId) {
        socket.emit("join-room", { roomId, userId: user?.id });
      }
      playCue("connected");
    });

    socket.on("user-joined", async ({ socketId, userId }) => {
      console.log("User joined:", userId || socketId);
      await createPeerConnection(socketId, true);
      playCue("join");
    });

    socket.on("room-users", ({ users }) => {
      setRoomUsers(users || []);
      const socketId = socketRef.current?.id;
      if (!localStreamRef.current || !Array.isArray(users)) return;
      users
        .filter((user) => (user.socketId || user) && (user.socketId || user) !== socketId)
        .forEach((user) => {
          createPeerConnection(user.socketId || user, true);
        });
    });

    socket.on("offer", async ({ offer, from }) => {
      console.log("Received offer from:", from);
      const pc = await createPeerConnection(from, false);
      const meta = peerMetaRef.current.get(from);
      const offerCollision = meta?.makingOffer || pc.signalingState !== "stable";
      const polite = meta?.polite ?? false;

      if (offerCollision && !polite) {
        console.warn("Offer collision: ignoring (impolite)", from);
        return;
      }

      if (offerCollision) {
        await pc.setLocalDescription({ type: "rollback" });
      }

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("answer", { answer, to: from, roomId, from: socket.id });
    });

    socket.on("answer", async ({ answer, from }) => {
      console.log("Received answer from:", from);
      const pc = peerConnectionsRef.current.get(from);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    socket.on("ice-candidate", async ({ candidate, from }) => {
      const pc = peerConnectionsRef.current.get(from);
      if (pc && candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    socket.on("user-left", ({ socketId, userId }) => {
      console.log("User left:", userId || socketId);
      removePeerConnection(socketId);
      playCue("leave");
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from signaling server");
      setIsConnected(false);
      setRoomUsers([]);
      setLocalSocketId(null);
    });

    socketRef.current = socket;
    return socket;
  }, [roomId, user?.id, createPeerConnection, removePeerConnection, playCue]);

  /**
   * Start a call with media
   * @param {Object} options - Media options
   * @param {boolean} options.video - Enable video
   * @param {boolean} options.audio - Enable audio
   */
  const startCall = useCallback(
    async ({ video = true, audio = true } = {}) => {
      try {
        setError(null);
        setIsVideoOff(!video);
        audioEnabledRef.current = true;
        await ensureAudioContext();

        // Get user media
        if (!navigator?.mediaDevices?.getUserMedia) {
          throw new Error(
            "Microphone access unavailable. Use HTTPS (or localhost) to enable getUserMedia."
          );
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video,
          audio,
        });

        localStreamRef.current = stream;
        setLocalStream(stream);

        // Initialize socket and join room
        initSocket();
        setIsConnected(true);
      } catch (err) {
        console.error("Error starting call:", err);
        setError(err.message);
        throw err;
      }
    },
    [initSocket, ensureAudioContext]
  );

  /**
   * Start screen sharing
   */
  const startScreenShare = useCallback(async () => {
    try {
      if (!localStreamRef.current) {
        throw new Error("Start a call before sharing your screen.");
      }
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      // Replace video track in all peer connections
      const videoTrack = screenStream.getVideoTracks()[0];

      peerConnectionsRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      });

      // Handle screen share stop
      videoTrack.onended = () => {
        stopScreenShare();
      };

      setIsScreenSharing(true);

      // Update local stream
      if (localStreamRef.current) {
        const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
        if (oldVideoTrack) {
          localStreamRef.current.removeTrack(oldVideoTrack);
        }
        localStreamRef.current.addTrack(videoTrack);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      }
    } catch (err) {
      console.error("Error starting screen share:", err);
      setError(err.message);
    }
  }, []);

  /**
   * Stop screen sharing and return to camera
   */
  const stopScreenShare = useCallback(async () => {
    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const videoTrack = cameraStream.getVideoTracks()[0];

      peerConnectionsRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      });

      if (localStreamRef.current) {
        const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
        if (oldVideoTrack) {
          oldVideoTrack.stop();
          localStreamRef.current.removeTrack(oldVideoTrack);
        }
        localStreamRef.current.addTrack(videoTrack);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      }
      setIsScreenSharing(false);
    } catch (err) {
      console.error("Error stopping screen share:", err);
    }
  }, []);

  /**
   * Toggle audio mute
   */
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  /**
   * Toggle video on/off
   */
  const toggleVideo = useCallback(() => {
    if (!localStreamRef.current) return;

    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (!videoTrack) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((cameraStream) => {
          const newTrack = cameraStream.getVideoTracks()[0];
          if (!newTrack) return;
          localStreamRef.current.addTrack(newTrack);
          setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
          peerConnectionsRef.current.forEach((pc) => {
            const sender = pc.getSenders().find((s) => s.track?.kind === "video");
            if (sender) {
              sender.replaceTrack(newTrack);
            } else {
              pc.addTrack(newTrack, localStreamRef.current);
            }
          });
          setIsVideoOff(false);
          setIsScreenSharing(false);
          renegotiateAll();
        })
        .catch((err) => {
          console.error("Error enabling camera:", err);
          setError(err.message);
        });
      return;
    }

    if (videoTrack.enabled) {
      videoTrack.stop();
      localStreamRef.current.removeTrack(videoTrack);
      peerConnectionsRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          sender.replaceTrack(null);
        }
      });
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      setIsVideoOff(true);
      renegotiateAll();
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((cameraStream) => {
        const newTrack = cameraStream.getVideoTracks()[0];
        if (!newTrack) return;
        localStreamRef.current.addTrack(newTrack);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
        peerConnectionsRef.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === "video");
          if (sender) {
            sender.replaceTrack(newTrack);
          } else {
            pc.addTrack(newTrack, localStreamRef.current);
          }
        });
        setIsVideoOff(false);
        setIsScreenSharing(false);
        renegotiateAll();
      })
      .catch((err) => {
        console.error("Error enabling camera:", err);
        setError(err.message);
      });
  }, [renegotiateAll]);

  /**
   * End the call
   */
  const endCall = useCallback(() => {
    // Stop all tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Close all peer connections
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();
    peerMetaRef.current.clear();

    // Disconnect socket
    if (socketRef.current) {
      socketRef.current.emit("leave-room", { roomId });
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setLocalStream(null);
    setRemoteStreams(new Map());
    setIsConnected(false);
    setIsMuted(false);
    setIsVideoOff(false);
    playCue("leave");
  }, [roomId, playCue]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, [endCall]);

  return {
    isConnected,
    localStream,
    remoteStreams: Array.from(remoteStreams.entries()),
    error,
    isMuted,
    isVideoOff,
    isScreenSharing,
    roomUsers,
    localSocketId,
    startCall,
    endCall,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
  };
}

export default useWebRTC;
