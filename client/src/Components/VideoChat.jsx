import React, { useEffect, useRef, useState } from "react";
import { useWebRTC } from "@/hooks";

function VideoChat() {
  const [roomId, setRoomId] = useState("mvp-room");
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();

  const {
    isConnected,
    localStream,
    remoteStreams,
    error,
    isMuted,
    isVideoOff,
    startCall,
    endCall,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
  } = useWebRTC(roomId);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    const firstRemote = remoteStreams?.[0]?.[1];
    if (remoteVideoRef.current && firstRemote) {
      remoteVideoRef.current.srcObject = firstRemote;
    }
  }, [remoteStreams]);

  return (
    <div>
      <h1>Video Chat</h1>

      <div className="mb-4 flex items-center gap-2">
        <input
          type="text"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          placeholder="Room ID"
          className="p-1 text-black rounded"
        />
        {!isConnected ? (
          <button onClick={() => startCall({ video: true, audio: true })}>
            Join Room
          </button>
        ) : (
          <button onClick={endCall}>Leave Room</button>
        )}
      </div>

      {error && <div className="text-red-500 mb-2">{error}</div>}

      <div className="flex gap-4">
        <div>
          <div className="text-sm mb-1">You</div>
          <video ref={localVideoRef} autoPlay playsInline muted width="320" />
        </div>
        <div>
          <div className="text-sm mb-1">Remote</div>
          <video ref={remoteVideoRef} autoPlay playsInline width="320" />
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button onClick={toggleMute}>{isMuted ? "Unmute" : "Mute"}</button>
        <button onClick={toggleVideo}>
          {isVideoOff ? "Video On" : "Video Off"}
        </button>
        <button onClick={startScreenShare}>Share Screen</button>
        <button onClick={stopScreenShare}>Stop Share</button>
      </div>
    </div>
  );
}

export default VideoChat;
