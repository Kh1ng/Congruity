import React, { useEffect, useRef, useState } from "react";
import SimplePeer from "simple-peer";
import PropTypes from "prop-types";
import { supabase } from "../supabaseClient";

function VideoChat({ userId, peerId, roomId, isInitiator }) {
  const [peer, setPeer] = useState(null);
  const myVideoRef = useRef(null);
  const peerVideoRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messageQueue, setMessageQueue] = useState([]);

  const sendMessage = async (message) => {
    const response = await fetch("/functions/v1/signaling", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type: "signal", payload: message }),
    });

    const data = await response.json();
    if (response.ok) {
      console.log("Signaling message sent:", data);
    } else {
      console.error("Error sending signaling message:", data.error);
    }
  };

  const sendCall = () => {
    const message = {
      caller_id: userId,
      room_id: roomId,
    };
    sendMessage(message);
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

  const acceptCall = (callerId) => {
    const message = {
      accepter_id: userId,
      room_id: roomId,
    };
    sendMessage(message);
    getMediaStream();
  };

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
        // Subscribe to the "calls" table
        const subscription = supabase
          .from("calls")
          .on("INSERT", (payload) => {
            const data = payload.new;
            console.log("Received message:", data);
            if (data.signal && peer) {
              peer.signal(data.signal);
            } else if (data.caller_id && !isInitiator) {
              acceptCall(data.caller_id);
            } else if (data.accepter_id) {
              getMediaStream();
            }
          })
          .subscribe();

        setIsConnected(true);

        if (messageQueue.length > 0) {
          // Process any queued messages
          messageQueue.forEach((message) => sendMessage(message));
          setMessageQueue([]);
        }

        if (isInitiator) {
          sendCall();
        }

        return () => {
          supabase.removeSubscription(subscription);
        };
      }
      console.log("No active session found.");
    };

    setupWebSocket();

    return () => {
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

VideoChat.propTypes = {
  userId: PropTypes.string.isRequired,
  peerId: PropTypes.string.isRequired,
  roomId: PropTypes.string.isRequired,
  isInitiator: PropTypes.bool.isRequired,
};

export default VideoChat;
