import React, { useEffect, useRef, useState } from "react";
import SimplePeer from "simple-peer";
import { supabase } from "../supabaseClient";

function VideoChat({ userId, peerId, roomId, isInitiator }) {
  const [peer, setPeer] = useState(null);
  const myVideoRef = useRef(null);
  const peerVideoRef = useRef(null);
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messageQueue, setMessageQueue] = useState([]); // Queue for messages

  useEffect(() => {
    const setupWebSocket = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error("Error getting session:", error);
        return;
      }

      if (session) {
        const token = session.access_token;

        socketRef.current = new WebSocket("ws://localhost:3030/ws");

        socketRef.current.onopen = () => {
          console.log("WebSocket connection established");
          setIsConnected(true);
          socketRef.current.send(JSON.stringify({ token }));

          if (messageQueue.length > 0) {
            // Process any queued messages
            messageQueue.forEach((message) => socketRef.current.send(message));
            setMessageQueue([]);
          }

          if (isInitiator) {
            sendCall();
          }
        };

        socketRef.current.onmessage = (message) => {
          const data = JSON.parse(message.data);
          console.log("Received message:", data);
          if (data.signal && peer) {
            peer.signal(data.signal);
          } else if (data.caller_id && !isInitiator) {
            acceptCall(data.caller_id);
          } else if (data.accepter_id) {
            getMediaStream();
          }
        };

        socketRef.current.onerror = (error) => {
          console.error("WebSocket error:", error);
        };

        socketRef.current.onclose = (event) => {
          console.log("WebSocket closed:", event);
          setIsConnected(false);
        };
      } else {
        console.log("No active session found.");
      }
    };

    const sendMessage = (message) => {
      if (
        socketRef.current &&
        socketRef.current.readyState === WebSocket.OPEN
      ) {
        socketRef.current.send(message);
      } else {
        console.warn("WebSocket not ready, queueing message.");
        setMessageQueue((prevQueue) => [...prevQueue, message]);
      }
    };

    const sendCall = () => {
      const message = JSON.stringify({
        caller_id: userId,
        room_id: roomId,
      });
      sendMessage(message);
    };

    const acceptCall = (callerId) => {
      const message = JSON.stringify({
        accepter_id: userId,
        room_id: roomId,
      });
      sendMessage(message);
      getMediaStream();
    };

    const getMediaStream = () => {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          myVideoRef.current.srcObject = stream;

          const p = new SimplePeer({
            initiator: isInitiator,
            trickle: false,
            stream,
          });

          p.on("signal", (data) => {
            const message = JSON.stringify({
              signal: data,
              user_id: userId,
              peer_id: peerId,
              room_id: roomId,
            });
            sendMessage(message);
          });

          p.on("connect", () => {
            console.log("Peer connection established.");
          });

          p.on("stream", (stream) => {
            peerVideoRef.current.srcObject = stream;
          });

          p.on("error", (err) => console.error("Peer connection error:", err));

          setPeer(p);
        })
        .catch((error) => {
          console.error("Error accessing media devices.", error);
        });
    };

    setupWebSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (peer) {
        peer.destroy();
      }
      if (myVideoRef.current && myVideoRef.current.srcObject) {
        myVideoRef.current.srcObject
          .getTracks()
          .forEach((track) => track.stop());
      }
    };
  }, [isInitiator, peerId, userId, roomId]);

  return (
    <div className="flex flex-col items-center">
      <div>
        <div>
          Me
          <video ref={myVideoRef} autoPlay muted style={{ width: "50%" }} />
        </div>
        <div>
          Peer
          <video ref={peerVideoRef} autoPlay style={{ width: "50%" }} />
        </div>
      </div>
    </div>
  );
}

export default VideoChat;
