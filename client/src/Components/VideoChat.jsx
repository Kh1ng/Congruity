import React, { useEffect, useRef, useState } from "react";
import SimplePeer from "simple-peer";

function VideoChat({ token }) {
  const [initiator, setInitiator] = useState(location.hash === "#1");
  const [peer, setPeer] = useState(null);
  const myVideoRef = useRef(null);
  const peerVideoRef = useRef(null);
  const outgoingRef = useRef(null);
  const incomingRef = useRef(null);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        myVideoRef.current.srcObject = stream;

        const p = new SimplePeer({
          initiator,
          trickle: false,
          stream,
        });

        p.on("error", (err) => console.log("Error:", err));

        p.on("signal", (data) => {
          console.log("SIGNAL", JSON.stringify(data));
          if (outgoingRef.current) {
            outgoingRef.current.textContent = JSON.stringify(data, null, 2);
          }
        });

        p.on("connect", () => {
          console.log("CONNECT");
          p.send(`whatever${Math.random()}`);
        });

        p.on("data", (data) => {
          console.log("data:", data);
        });

        p.on("stream", (stream) => {
          peerVideoRef.current.srcObject = stream;
        });

        p.on("signalingStateChange", () => {
          console.log("Peer signaling state:", p._pc.signalingState);
        });

        setPeer(p);
      })
      .catch((error) => console.error("Error accessing media devices.", error));
  }, [initiator]);

  const handleSignalSubmit = (ev) => {
    ev.preventDefault();
    if (peer && incomingRef.current) {
      try {
        const signalData = JSON.parse(incomingRef.current.value);
        console.log("SIGNAL DATA RECEIVED:", signalData);

        // Log current signaling state
        console.log("Current Peer signaling state:", peer._pc.signalingState);

        peer.signal(signalData);

        // Log new signaling state
        console.log("New Peer signaling state:", peer._pc.signalingState);
      } catch (err) {
        console.error("Invalid signal data", err);
      }
    }
  };

  return (
    <div className="bg-slate">
      <div>
        <video ref={myVideoRef} autoPlay muted style={{ width: "50%" }} />
        <video ref={peerVideoRef} autoPlay style={{ width: "50%" }} />
      </div>
      <form onSubmit={handleSignalSubmit}>
        <textarea ref={incomingRef} placeholder="Paste signal data here" />
        <button type="submit">Submit</button>
      </form>
      <pre
        ref={outgoingRef}
        style={{ whiteSpace: "pre-wrap", wordWrap: "break-word" }}
      />
    </div>
  );
}

export default VideoChat;
