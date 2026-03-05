import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useVoiceChannel } from "@/hooks/useVoiceChannel";
import { useDMCall } from "@/hooks/useDMCall";

const VoiceContext = createContext(null);

export function VoiceProvider({ children }) {
  const channelVoice = useVoiceChannel();
  const dmCall = useDMCall();
  const [channelRoomId, setChannelRoomId] = useState(null);

  const joinChannelVoice = useCallback(
    async ({ channelId, serverId, signalingUrl }) => {
      await channelVoice.join({ channelId, serverId, signalingUrl });
      setChannelRoomId(channelId);
    },
    [channelVoice]
  );

  const leaveChannelVoice = useCallback(async () => {
    await channelVoice.leave();
    setChannelRoomId(null);
  }, [channelVoice]);

  const value = useMemo(
    () => ({
      channelRoom: null,
      channelRoomId,
      channelParticipants: channelVoice.participants,
      isInChannelVoice: channelVoice.isConnected,

      dmCall: null,
      dmCallUserId: dmCall.remoteUserId,
      dmCallState: dmCall.state,

      isMuted: channelVoice.isMuted || dmCall.isMuted,
      isDeafened: channelVoice.isDeafened || false,
      isCameraOn: channelVoice.isCameraOn || dmCall.isVideoOn,
      isScreenSharing: channelVoice.isScreenSharing || dmCall.isScreenSharing,

      joinChannelVoice,
      leaveChannelVoice,
      startDMCall: dmCall.call,
      answerDMCall: dmCall.answer,
      hangupDMCall: dmCall.hangup,
      toggleMute: channelVoice.isConnected ? channelVoice.toggleMute : dmCall.toggleMute,
      toggleDeafen: channelVoice.toggleDeafen,
      toggleCamera: channelVoice.isConnected ? channelVoice.toggleVideo : dmCall.toggleVideo,
      toggleScreenShare: channelVoice.isConnected
        ? channelVoice.startScreenShare
        : dmCall.startScreenShare,

      channelVoice,
      dmVoice: dmCall,
    }),
    [channelRoomId, channelVoice, dmCall, joinChannelVoice, leaveChannelVoice]
  );

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
}

export function useVoice() {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error("useVoice must be used within a VoiceProvider");
  }
  return context;
}

export default VoiceContext;
