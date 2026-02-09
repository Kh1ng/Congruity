import { useState, useRef, useCallback, useEffect } from "react";
import { io } from "socket.io-client";

const SIGNALING_URL = import.meta.env.VITE_SIGNALING_URL || "ws://localhost:3001";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

/**
 * Hook for WebRTC voice/video calls
 * @param {string} roomId - Room/channel ID to join
 */
export function useWebRTC(roomId) {
  const [isConnected, setIsConnected] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [error, setError] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const socketRef = useRef(null);
  const peerConnectionsRef = useRef(new Map());
  const localStreamRef = useRef(null);

  /**
   * Initialize Socket.IO connection
   */
  const initSocket = useCallback(() => {
    if (socketRef.current?.connected) return socketRef.current;

    const socket = io(SIGNALING_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socket.on("connect", () => {
      console.log("Connected to signaling server");
      if (roomId) {
        socket.emit("join-room", roomId);
      }
    });

    socket.on("user-joined", async ({ userId }) => {
      console.log("User joined:", userId);
      await createPeerConnection(userId, true);
    });

    socket.on("offer", async ({ offer, from }) => {
      console.log("Received offer from:", from);
      const pc = await createPeerConnection(from, false);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("answer", { answer, to: from, roomId });
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

    socket.on("user-left", ({ userId }) => {
      console.log("User left:", userId);
      removePeerConnection(userId);
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from signaling server");
      setIsConnected(false);
    });

    socketRef.current = socket;
    return socket;
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
          });
        }
      };

      // Handle remote stream
      pc.ontrack = (event) => {
        console.log("Received remote track from:", userId);
        setRemoteStreams((prev) => {
          const updated = new Map(prev);
          updated.set(userId, event.streams[0]);
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
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketRef.current.emit("offer", { offer, to: userId, roomId });
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
    }
    setRemoteStreams((prev) => {
      const updated = new Map(prev);
      updated.delete(userId);
      return updated;
    });
  }, []);

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

        // Get user media
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
    [initSocket]
  );

  /**
   * Start screen sharing
   */
  const startScreenShare = useCallback(async () => {
    try {
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

      // Update local stream
      if (localStreamRef.current) {
        const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
        localStreamRef.current.removeTrack(oldVideoTrack);
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
        oldVideoTrack.stop();
        localStreamRef.current.removeTrack(oldVideoTrack);
        localStreamRef.current.addTrack(videoTrack);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      }
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
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  }, []);

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

    // Disconnect socket
    if (socketRef.current) {
      socketRef.current.emit("leave-room", roomId);
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setLocalStream(null);
    setRemoteStreams(new Map());
    setIsConnected(false);
    setIsMuted(false);
    setIsVideoOff(false);
  }, [roomId]);

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
    startCall,
    endCall,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
  };
}

export default useWebRTC;
