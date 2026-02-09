import React, { useRef, useState } from "react";

function VideoChat() {
  const [isConnected, setIsConnected] = useState(false);
  const [remoteStream, setRemoteStream] = useState(null);
  const [localStream, setLocalStream] = useState(null);

  const localVideoRef = useRef();
  const remoteVideoRef = useRef();

  const peerConnectionRef = useRef(null);
  const signalingSocketRef = useRef(null);

  const startCall = async () => {
    // Initialize WebSocket and WebRTC
    initWebSocket();
    await initWebRTC();
  };

  const initWebRTC = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      localVideoRef.current.srcObject = stream;

      const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          sendMessage({ type: "ice-candidate", data: event.candidate });
        }
      };

      peerConnection.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
        remoteVideoRef.current.srcObject = event.streams[0];
      };

      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      peerConnectionRef.current = peerConnection;
      console.log("WebRTC initialized");
    } catch (error) {
      console.error("Error initializing WebRTC:", error);
    }
  };

  const initWebSocket = () => {
    const signalingSocket = new WebSocket("ws://localhost:3001");
    signalingSocketRef.current = signalingSocket;

    signalingSocket.onopen = () => {
      console.log("Connected to signaling server");
    };

    signalingSocket.onmessage = async (message) => {
      const { type, data } = JSON.parse(message.data);

      if (type === "offer") {
        await handleOffer(data);
      } else if (type === "answer") {
        await handleAnswer(data);
      } else if (type === "ice-candidate") {
        await handleIceCandidate(data);
      }
    };

    signalingSocket.onclose = () => {
      console.warn("WebSocket closed. Reconnecting...");
      setTimeout(() => initWebSocket(), 3000);
    };

    signalingSocket.onerror = (error) => {
      console.error("Signaling server error:", error);
    };
  };

  const sendMessage = (message) => {
    const signalingSocket = signalingSocketRef.current;
    if (signalingSocket && signalingSocket.readyState === WebSocket.OPEN) {
      signalingSocket.send(JSON.stringify(message));
    } else {
      console.error("WebSocket is not open. Retrying...");
      setTimeout(() => sendMessage(message), 500);
    }
  };

  const createOffer = async () => {
    const peerConnection = peerConnectionRef.current;

    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      sendMessage({ type: "offer", data: offer });
      setIsConnected(true);
      console.log("Offer created and sent");
    } catch (error) {
      console.error("Error creating offer:", error);
    }
  };

  const handleOffer = async (offer) => {
    const peerConnection = peerConnectionRef.current;

    try {
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(offer)
      );
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      sendMessage({ type: "answer", data: answer });
      console.log("Offer handled and answer sent");
    } catch (error) {
      console.error("Error handling offer:", error);
    }
  };

  const handleAnswer = async (answer) => {
    const peerConnection = peerConnectionRef.current;

    try {
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
      console.log("Answer received and applied");
    } catch (error) {
      console.error("Error handling answer:", error);
    }
  };

  const handleIceCandidate = async (candidate) => {
    const peerConnection = peerConnectionRef.current;

    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      console.log("ICE candidate added");
    } catch (error) {
      console.error("Error handling ICE candidate:", error);
    }
  };

  const stopCall = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (signalingSocketRef.current) {
      signalingSocketRef.current.close();
      signalingSocketRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);
    setIsConnected(false);
    console.log("Call stopped");
  };

  return (
    <div>
      <h1>Video Chat</h1>
      <div>
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          style={{ width: "45%" }}
        />
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          style={{ width: "45%" }}
        />
      </div>
      {!isConnected ? (
        <button onClick={startCall}>Start Call</button>
      ) : (
        <button onClick={stopCall}>Stop Call</button>
      )}
    </div>
  );
}

export default VideoChat;
