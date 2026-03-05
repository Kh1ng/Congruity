import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { supabase } from "@/lib/supabase";
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

function toHttpBase(rawUrl) {
  if (rawUrl.startsWith("wss://")) return rawUrl.replace("wss://", "https://");
  if (rawUrl.startsWith("ws://")) return rawUrl.replace("ws://", "http://");
  return rawUrl;
}

const DEFAULT_ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

export function useDMCall(options = {}) {
  const { user } = useAuth();
  const signalingUrl = options.signalingUrl || SIGNALING_URL;
  const apiBase = useMemo(() => toHttpBase(signalingUrl), [signalingUrl]);

  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingIncomingOfferRef = useRef(null);

  const [state, setState] = useState("idle");
  const [error, setError] = useState(null);
  const [remoteUserId, setRemoteUserId] = useState(null);
  const [remoteDisplayName, setRemoteDisplayName] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const getAuthToken = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || null;
  }, []);

  const sendApiSignal = useCallback(
    async ({ targetUserId, signalType, payload }) => {
      const token = await getAuthToken();
      if (!token) throw new Error("Missing auth token for DM call signal.");

      const response = await fetch(`${apiBase}/api/voice/dm/signal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          target_user_id: targetUserId,
          signal_type: signalType,
          payload,
        }),
      });
      if (!response.ok) {
        const payloadJson = await response.json().catch(() => ({}));
        throw new Error(payloadJson.error || `DM signal failed (${response.status})`);
      }
      return response.json();
    },
    [apiBase, getAuthToken]
  );

  const getIceServers = useCallback(async () => {
    try {
      const token = await getAuthToken();
      if (!token) return DEFAULT_ICE_SERVERS;
      const response = await fetch(`${apiBase}/api/voice/turn-credentials`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) return DEFAULT_ICE_SERVERS;
      const data = await response.json();
      const turn = data.turn_credentials;
      if (!turn) return DEFAULT_ICE_SERVERS;
      return [...DEFAULT_ICE_SERVERS, turn];
    } catch {
      return DEFAULT_ICE_SERVERS;
    }
  }, [apiBase, getAuthToken]);

  const cleanup = useCallback(() => {
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setIsMuted(false);
    setIsVideoOn(false);
    setIsScreenSharing(false);
    setRemoteUserId(null);
    setRemoteDisplayName(null);
    pendingIncomingOfferRef.current = null;
    setState("idle");
  }, []);

  const ensureSocket = useCallback(() => {
    if (socketRef.current) return socketRef.current;
    const socket = io(signalingUrl, {
      transports: ["websocket"],
    });
    socketRef.current = socket;
    return socket;
  }, [signalingUrl]);

  const setupPeer = useCallback(
    async ({ targetUserId }) => {
      const iceServers = await getIceServers();
      const pc = new RTCPeerConnection({ iceServers });
      peerRef.current = pc;

      pc.onicecandidate = async (event) => {
        if (!event.candidate || !targetUserId) return;
        try {
          await sendApiSignal({
            targetUserId,
            signalType: "ice-candidate",
            payload: event.candidate,
          });
        } catch (candidateError) {
          setError(String(candidateError?.message || candidateError));
        }
      };

      pc.ontrack = (event) => {
        const inbound = event.streams?.[0];
        if (inbound) {
          setRemoteStream(inbound);
        }
      };

      return pc;
    },
    [getIceServers, sendApiSignal]
  );

  const ensureLocalMedia = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    localStreamRef.current = stream;
    setLocalStream(stream);
    setIsVideoOn(stream.getVideoTracks().some((track) => track.enabled));
    return stream;
  }, []);

  const applyIncomingSignal = useCallback(async (signalType, payload) => {
    const pc = peerRef.current;
    if (!pc) return;
    if (signalType === "answer") {
      await pc.setRemoteDescription(new RTCSessionDescription(payload));
      setState("connected");
      return;
    }
    if (signalType === "ice-candidate") {
      await pc.addIceCandidate(new RTCIceCandidate(payload));
    }
  }, []);

  useEffect(() => {
    const socket = ensureSocket();
    if (user?.id) {
      socket.emit("auth:identify", { userId: user.id });
    }

    const onIncoming = ({ from_user_id: fromUserId, display_name: displayName, offer }) => {
      pendingIncomingOfferRef.current = offer;
      setRemoteUserId(fromUserId);
      setRemoteDisplayName(displayName || fromUserId);
      setState("ringing");
    };

    const onSignal = async ({ from_user_id: fromUserId, signal_type: signalType, payload }) => {
      setRemoteUserId((prev) => prev || fromUserId);
      try {
        await applyIncomingSignal(signalType, payload);
      } catch (signalError) {
        setError(String(signalError?.message || signalError));
      }
    };

    const onHangup = () => {
      cleanup();
      setState("ended");
    };

    socket.on("dm:call:incoming", onIncoming);
    socket.on("dm:call:signal", onSignal);
    socket.on("dm:call:hangup", onHangup);

    return () => {
      socket.off("dm:call:incoming", onIncoming);
      socket.off("dm:call:signal", onSignal);
      socket.off("dm:call:hangup", onHangup);
    };
  }, [applyIncomingSignal, cleanup, ensureSocket, user?.id]);

  const call = useCallback(
    async (targetUserId) => {
      try {
        setError(null);
        setState("calling");
        setRemoteUserId(targetUserId);
        ensureSocket();
        const pc = await setupPeer({ targetUserId });
        const stream = await ensureLocalMedia();
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await sendApiSignal({
          targetUserId,
          signalType: "offer",
          payload: offer,
        });
      } catch (callError) {
        setError(String(callError?.message || callError));
        setState("ended");
      }
    },
    [ensureLocalMedia, ensureSocket, sendApiSignal, setupPeer]
  );

  const answer = useCallback(async () => {
    if (!remoteUserId || !pendingIncomingOfferRef.current) return;
    try {
      setError(null);
      const pc = await setupPeer({ targetUserId: remoteUserId });
      const stream = await ensureLocalMedia();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      await pc.setRemoteDescription(
        new RTCSessionDescription(pendingIncomingOfferRef.current)
      );
      const answerDesc = await pc.createAnswer();
      await pc.setLocalDescription(answerDesc);
      await sendApiSignal({
        targetUserId: remoteUserId,
        signalType: "answer",
        payload: answerDesc,
      });
      pendingIncomingOfferRef.current = null;
      setState("connected");
    } catch (answerError) {
      setError(String(answerError?.message || answerError));
      setState("ended");
    }
  }, [ensureLocalMedia, remoteUserId, sendApiSignal, setupPeer]);

  const hangup = useCallback(async () => {
    if (remoteUserId) {
      try {
        await sendApiSignal({
          targetUserId: remoteUserId,
          signalType: "hangup",
          payload: null,
        });
      } catch {
        // Hangup should always clean up local state.
      }
    }
    cleanup();
    setState("ended");
  }, [cleanup, remoteUserId, sendApiSignal]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const track = stream.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsMuted(!track.enabled);
  }, []);

  const toggleVideo = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsVideoOn(track.enabled);
  }, []);

  const startScreenShare = useCallback(async () => {
    const pc = peerRef.current;
    if (!pc) return;
    const displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    });
    const screenTrack = displayStream.getVideoTracks()[0];
    const sender = pc.getSenders().find((s) => s.track?.kind === "video");
    if (sender && screenTrack) {
      await sender.replaceTrack(screenTrack);
      setIsScreenSharing(true);
      screenTrack.addEventListener("ended", async () => {
        if (localStreamRef.current?.getVideoTracks()[0]) {
          await sender.replaceTrack(localStreamRef.current.getVideoTracks()[0]);
        }
        setIsScreenSharing(false);
      });
    }
  }, []);

  return {
    state,
    error,
    remoteUserId,
    remoteDisplayName,
    localStream,
    remoteStream,
    isMuted,
    isVideoOn,
    isScreenSharing,
    call,
    answer,
    hangup,
    toggleMute,
    toggleVideo,
    startScreenShare,
  };
}

export default useDMCall;
