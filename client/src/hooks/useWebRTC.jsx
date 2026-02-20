import { useState, useRef, useCallback, useEffect } from "react";
import { io } from "socket.io-client";
import { useAuth } from "@/hooks/useAuth";

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

const getUserMediaCompat = async (constraints) => {
  if (navigator?.mediaDevices?.getUserMedia) {
    return navigator.mediaDevices.getUserMedia(constraints);
  }

  const legacyGetUserMedia =
    navigator?.getUserMedia ||
    navigator?.webkitGetUserMedia ||
    navigator?.mozGetUserMedia;

  if (legacyGetUserMedia) {
    return new Promise((resolve, reject) => {
      legacyGetUserMedia.call(navigator, constraints, resolve, reject);
    });
  }

  throw new Error(
    "Microphone access API is not available in this runtime. In Tauri, confirm app permissions for microphone/camera in OS settings."
  );
};

const getDisplayMediaCompat = async (constraints) => {
  if (navigator?.mediaDevices?.getDisplayMedia) {
    return navigator.mediaDevices.getDisplayMedia(constraints);
  }

  throw new Error("Screen share is unavailable in this runtime.");
};

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
export function useWebRTC(roomId, options = {}) {
  const { user } = useAuth();
  const signalingUrl = options.signalingUrl || SIGNALING_URL || DEFAULT_SIGNALING_URL;
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [error, setError] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [roomUsers, setRoomUsers] = useState([]);
  const [localSocketId, setLocalSocketId] = useState(null);
  const [audioLevels, setAudioLevels] = useState({});
  const audioWaveforms = {};
  const [videoConstraints, setVideoConstraints] = useState({
    width: 1280,
    height: 720,
    frameRate: 30,
  });
  const [stageStreamIds, setStageStreamIds] = useState([]);
  const [screenConstraints, setScreenConstraints] = useState({
    width: 1920,
    height: 1080,
    frameRate: 30,
  });

  const socketRef = useRef(null);
  const localSocketIdRef = useRef(null);
  const peerConnectionsRef = useRef(new Map());
  const peerMetaRef = useRef(new Map());
  const pendingCandidatesRef = useRef(new Map());
  const joinedRoomIdRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamsRef = useRef(new Map());
  const audioContextRef = useRef(null);
  const audioEnabledRef = useRef(false);
  const audioMonitorsRef = useRef(new Map());
  const audioAnimationFrameRef = useRef(null);
  const endCallRef = useRef(null);

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

  const stopAudioAnimation = useCallback(() => {
    if (audioAnimationFrameRef.current) {
      cancelAnimationFrame(audioAnimationFrameRef.current);
      audioAnimationFrameRef.current = null;
    }
  }, []);

  const cleanupAudioMonitor = useCallback((id) => {
    const monitor = audioMonitorsRef.current.get(id);
    if (monitor) {
      monitor.source.disconnect();
      audioMonitorsRef.current.delete(id);
    }
  }, []);

  const startAudioAnimation = useCallback(() => {
    if (audioAnimationFrameRef.current) return;

    const tick = () => {
      setAudioLevels(() => {
        const next = {};
        audioMonitorsRef.current.forEach((monitor, id) => {
          monitor.analyser.getByteTimeDomainData(monitor.buffer);
          let sumSquares = 0;
          for (let i = 0; i < monitor.buffer.length; i += 1) {
            const normalized = (monitor.buffer[i] - 128) / 128;
            sumSquares += normalized * normalized;
          }
          const rms = Math.sqrt(sumSquares / monitor.buffer.length);
          next[id] = Math.min(1, rms * 3.5);
        });
        return next;
      });

      if (audioMonitorsRef.current.size === 0) {
        audioAnimationFrameRef.current = null;
        return;
      }

      audioAnimationFrameRef.current = requestAnimationFrame(tick);
    };

    audioAnimationFrameRef.current = requestAnimationFrame(tick);
  }, []);

  const monitorStreamAudio = useCallback(
    async (id, stream) => {
      if (!stream) return;
      const audioTrack = stream
        .getAudioTracks()
        .find((track) => track.readyState === "live" && track.enabled);
      if (!audioTrack) {
        cleanupAudioMonitor(id);
        setAudioLevels((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        return;
      }

      const context = await ensureAudioContext();
      if (!context) return;

      cleanupAudioMonitor(id);

      const sourceStream = new MediaStream([audioTrack]);
      const source = context.createMediaStreamSource(sourceStream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      audioMonitorsRef.current.set(id, {
        source,
        analyser,
        buffer: new Uint8Array(analyser.fftSize),
      });

      startAudioAnimation();
    },
    [cleanupAudioMonitor, ensureAudioContext, startAudioAnimation]
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
        remoteDescriptionSet: false,
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
        remoteStreamsRef.current.set(userId, inboundStream);
        setRemoteStreams((prev) => {
          const updated = new Map(prev);
          updated.set(userId, inboundStream);
          return updated;
        });
        monitorStreamAudio(userId, inboundStream);
      };

      pc.onconnectionstatechange = () => {
        console.log(`Connection state with ${userId}:`, pc.connectionState);
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          pc.close();
          peerConnectionsRef.current.delete(userId);
          peerMetaRef.current.delete(userId);
          cleanupAudioMonitor(userId);
          setRemoteStreams((prev) => {
            const updated = new Map(prev);
            updated.delete(userId);
            return updated;
          });
          setAudioLevels((prev) => {
            const next = { ...prev };
            delete next[userId];
            return next;
          });
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
    [roomId, monitorStreamAudio, cleanupAudioMonitor]
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
    cleanupAudioMonitor(userId);
    setRemoteStreams((prev) => {
      const updated = new Map(prev);
      updated.delete(userId);
      return updated;
    });
    setAudioLevels((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  }, [cleanupAudioMonitor]);

  /**
   * Initialize Socket.IO connection
   */
  const initSocket = useCallback(() => {
    if (socketRef.current?.connected) return socketRef.current;

    const socket = io(signalingUrl, {
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
        joinedRoomIdRef.current = roomId;
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
      if (meta) meta.remoteDescriptionSet = true;

      const pending = pendingCandidatesRef.current.get(from) || [];
      for (const candidate of pending) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn("Failed to add queued ICE", err);
        }
      }
      pendingCandidatesRef.current.delete(from);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("answer", { answer, to: from, roomId, from: socket.id });
    });

    socket.on("answer", async ({ answer, from }) => {
      console.log("Received answer from:", from);
      const pc = peerConnectionsRef.current.get(from);
      const meta = peerMetaRef.current.get(from);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        if (meta) meta.remoteDescriptionSet = true;

        const pending = pendingCandidatesRef.current.get(from) || [];
        for (const candidate of pending) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.warn("Failed to add queued ICE", err);
          }
        }
        pendingCandidatesRef.current.delete(from);
      }
    });

    socket.on("ice-candidate", async ({ candidate, from }) => {
      const pc = peerConnectionsRef.current.get(from);
      const meta = peerMetaRef.current.get(from);
      if (!candidate) return;

      if (!pc || !meta?.remoteDescriptionSet) {
        const pending = pendingCandidatesRef.current.get(from) || [];
        pending.push(candidate);
        pendingCandidatesRef.current.set(from, pending);
        return;
      }

      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn("Failed to add ICE", err);
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
  }, [roomId, user?.id, createPeerConnection, removePeerConnection, playCue, signalingUrl]);

  /**
   * Start a call with media
   * @param {Object} options - Media options
   * @param {boolean} options.video - Enable video
   * @param {boolean} options.audio - Enable audio
   */
  const startCall = useCallback(
    async ({ video = true, audio = true } = {}) => {
      if (isConnected || isConnecting) return;
      try {
        setIsConnecting(true);
        setError(null);
        setIsVideoOff(!video);
        audioEnabledRef.current = true;
        await ensureAudioContext();

        // Get user media
        const stream = await getUserMediaCompat({
          video: video
            ? {
                width: { ideal: videoConstraints.width },
                height: { ideal: videoConstraints.height },
                frameRate: { ideal: videoConstraints.frameRate },
              }
            : false,
          audio,
        });

        localStreamRef.current = stream;
        setLocalStream(stream);
        monitorStreamAudio("local", stream);

        // Add tracks to any existing peer connections (late-joiner)
        peerConnectionsRef.current.forEach((pc) => {
          stream.getTracks().forEach((track) => {
            pc.addTrack(track, stream);
          });
        });

        // Initialize socket and join room
        initSocket();
        setIsConnected(true);
        await renegotiateAll();
      } catch (err) {
        console.error("Error starting call:", err);
        const mappedMessage = (() => {
          const name = err?.name || "";
          if (name === "NotAllowedError") {
            return "Microphone permission denied. Allow mic access in system settings and retry.";
          }
          if (name === "NotFoundError") {
            return "No microphone device found. Connect a mic and retry.";
          }
          if (name === "NotReadableError") {
            return "Microphone is busy in another app. Close other apps using it and retry.";
          }
          return err?.message || "Unable to start voice session.";
        })();
        setError(mappedMessage);
        throw err;
      } finally {
        setIsConnecting(false);
      }
    },
    [initSocket, ensureAudioContext, isConnected, isConnecting, monitorStreamAudio, renegotiateAll, videoConstraints]
  );

  /**
   * Start screen sharing
   */
  const startScreenShare = useCallback(async () => {
    try {
      if (!localStreamRef.current) {
        throw new Error("Start a call before sharing your screen.");
      }
      const screenStream = await getDisplayMediaCompat({
        video: {
          width: { ideal: screenConstraints.width },
          height: { ideal: screenConstraints.height },
          frameRate: { ideal: screenConstraints.frameRate },
        },
        audio: true,
      });

      // Replace video track in all peer connections
      const videoTrack = screenStream.getVideoTracks()[0];

      peerConnectionsRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          sender.replaceTrack(videoTrack);
        } else if (localStreamRef.current) {
          pc.addTrack(videoTrack, localStreamRef.current);
        }
      });

      // Handle screen share stop
      videoTrack.onended = () => {
        setIsScreenSharing(false);
      };

      setIsScreenSharing(true);
      renegotiateAll();

      // Update local stream
      if (localStreamRef.current) {
        const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
        if (oldVideoTrack) {
          localStreamRef.current.removeTrack(oldVideoTrack);
        }
        localStreamRef.current.addTrack(videoTrack);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
        monitorStreamAudio("local", localStreamRef.current);
      }
    } catch (err) {
      console.error("Error starting screen share:", err);
      setError(err.message);
    }
  }, [monitorStreamAudio, renegotiateAll, screenConstraints]);

  /**
   * Stop screen sharing and return to camera
   */
  const stopScreenShare = useCallback(async () => {
    try {
      if (!localStreamRef.current) return;

      const shouldRestoreCamera = !isVideoOff;
      let videoTrack = null;

      if (shouldRestoreCamera) {
        const cameraStream = await getUserMediaCompat({ video: true });
        videoTrack = cameraStream.getVideoTracks()[0];
      }

      peerConnectionsRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          sender.replaceTrack(videoTrack);
        } else if (videoTrack && localStreamRef.current) {
          pc.addTrack(videoTrack, localStreamRef.current);
        }
      });

      const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
      if (oldVideoTrack) {
        oldVideoTrack.stop();
        localStreamRef.current.removeTrack(oldVideoTrack);
      }
      if (videoTrack) {
        localStreamRef.current.addTrack(videoTrack);
      }

      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      setIsScreenSharing(false);
      renegotiateAll();
      monitorStreamAudio("local", localStreamRef.current);
    } catch (err) {
      console.error("Error stopping screen share:", err);
    }
  }, [isVideoOff, monitorStreamAudio, renegotiateAll]);

  /**
   * Toggle audio mute
   */
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        monitorStreamAudio("local", localStreamRef.current);
      }
    }
  }, [monitorStreamAudio]);

  /**
   * Toggle video on/off
   */
  const toggleVideo = useCallback(() => {
    if (!localStreamRef.current) return;

    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (!videoTrack) {
      getUserMediaCompat({ video: true })
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
          monitorStreamAudio("local", localStreamRef.current);
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

    getUserMediaCompat({ video: true })
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
        monitorStreamAudio("local", localStreamRef.current);
      })
      .catch((err) => {
        console.error("Error enabling camera:", err);
        setError(err.message);
      });
  }, [monitorStreamAudio, renegotiateAll]);

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
      if (joinedRoomIdRef.current) {
        socketRef.current.emit("leave-room", { roomId: joinedRoomIdRef.current });
        joinedRoomIdRef.current = null;
      }
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setLocalStream(null);
    remoteStreamsRef.current = new Map();
    setRemoteStreams(new Map());
    setIsConnected(false);
    setIsConnecting(false);
    setIsMuted(false);
    setIsVideoOff(false);
    cleanupAudioMonitor("local");
    audioMonitorsRef.current.forEach((_, id) => cleanupAudioMonitor(id));
    setAudioLevels({});
    stopAudioAnimation();
    playCue("leave");
  }, [cleanupAudioMonitor, playCue, stopAudioAnimation]);

  useEffect(() => {
    endCallRef.current = endCall;
  }, [endCall]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !socket.connected || !isConnected) return;

    if (joinedRoomIdRef.current && joinedRoomIdRef.current !== roomId) {
      socket.emit("leave-room", { roomId: joinedRoomIdRef.current });
      joinedRoomIdRef.current = null;

      // Remove stale peer state from the previous room before joining a new one.
      peerConnectionsRef.current.forEach((_, peerId) => {
        removePeerConnection(peerId);
      });
      pendingCandidatesRef.current.clear();
    }

    if (roomId && joinedRoomIdRef.current !== roomId) {
      socket.emit("join-room", { roomId, userId: user?.id });
      joinedRoomIdRef.current = roomId;
    }
  }, [roomId, isConnected, removePeerConnection, user?.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCallRef.current?.();
      stopAudioAnimation();
    };
  }, [stopAudioAnimation]);

  return {
    isConnected,
    isConnecting,
    localStream,
    remoteStreams: Array.from(remoteStreams.entries()),
    error,
    isMuted,
    isVideoOff,
    isScreenSharing,
    roomUsers,
    localSocketId,
    audioLevels,
    audioWaveforms,
    videoConstraints,
    screenConstraints,
    setVideoConstraints,
    setScreenConstraints,
    stageStreamIds,
    setStageStreamIds,
    startCall,
    endCall,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
  };
}

export default useWebRTC;
