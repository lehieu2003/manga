import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { api } from '@/api';
import type { CallMediaType, IceServer, SocialCall, SocialConversation } from '@/types';
import type { CallSignalPayload, SocialSocket } from '../social-socket';

export type CallUiState =
  | 'idle'
  | 'ringing-outgoing'
  | 'ringing-incoming'
  | 'connecting'
  | 'active'
  | 'ended';

type UseCallOptions = {
  currentUserId: string | undefined;
  selectedConversation: SocialConversation | null;
  socketRef: MutableRefObject<SocialSocket | null>;
  onError?: (message: string) => void;
};

type MediaRefs = {
  localVideoRef: MutableRefObject<HTMLVideoElement | null>;
  remoteVideoRef: MutableRefObject<HTMLVideoElement | null>;
};

export function useCall({
  currentUserId,
  selectedConversation,
  socketRef,
  onError,
}: UseCallOptions) {
  const [state, setState] = useState<CallUiState>('idle');
  const [call, setCall] = useState<SocialCall | null>(null);
  const [incomingCall, setIncomingCall] = useState<SocialCall | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [remoteMediaState, setRemoteMediaState] = useState({
    audioEnabled: true,
    videoEnabled: true,
  });
  const [error, setError] = useState<string | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const iceServersRef = useRef<IceServer[]>([]);
  const mediaTypeRef = useRef<CallMediaType>('VIDEO');

  const reportError = useCallback(
    (message: string) => {
      setError(message);
      onError?.(message);
    },
    [onError],
  );

  const activePeerIds = useCallback(
    (targetCall = call) =>
      targetCall?.participants
        .filter(
          (participant) =>
            participant.userId !== currentUserId &&
            (participant.status === 'INVITED' || participant.status === 'JOINED'),
        )
        .map((participant) => participant.userId) ?? [],
    [call, currentUserId],
  );

  const firstPeerId = useCallback(
    (targetCall = call) => activePeerIds(targetCall)[0] ?? null,
    [activePeerIds, call],
  );

  const stopLocalMedia = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
  }, []);

  const closePeer = useCallback(() => {
    peerRef.current?.close();
    peerRef.current = null;
    remoteStreamRef.current = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  }, []);

  const cleanupMedia = useCallback(() => {
    closePeer();
    stopLocalMedia();
  }, [closePeer, stopLocalMedia]);

  const attachLocalVideo = useCallback(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
  }, []);

  const attachRemoteVideo = useCallback(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStreamRef.current;
  }, []);

  const getLocalStream = useCallback(async (mediaType: CallMediaType) => {
    if (localStreamRef.current) return localStreamRef.current;
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Camera and microphone access is not available in this browser');
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: mediaType === 'VIDEO',
    });
    localStreamRef.current = stream;
    attachLocalVideo();
    setAudioEnabled(true);
    setVideoEnabled(mediaType === 'VIDEO');
    return stream;
  }, [attachLocalVideo]);

  const createPeer = useCallback(
    async (targetCall: SocialCall, iceServers: IceServer[], mediaType: CallMediaType) => {
      closePeer();
      const stream = await getLocalStream(mediaType);
      const peer = new RTCPeerConnection({ iceServers });
      const remoteStream = new MediaStream();
      remoteStreamRef.current = remoteStream;
      peerRef.current = peer;

      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      peer.ontrack = (event) => {
        event.streams[0]?.getTracks().forEach((track) => remoteStream.addTrack(track));
        attachRemoteVideo();
      };
      peer.onicecandidate = (event) => {
        const candidate = event.candidate?.toJSON();
        const toUserId = firstPeerId(targetCall);
        if (!candidate || !toUserId) return;
        socketRef.current?.emit('call:ice-candidate', {
          callId: targetCall.id,
          toUserId,
          candidate,
        });
      };

      return peer;
    },
    [attachRemoteVideo, closePeer, firstPeerId, getLocalStream, socketRef],
  );

  const sendMediaState = useCallback(
    (targetCall = call, nextAudio = audioEnabled, nextVideo = videoEnabled) => {
      const toUserId = firstPeerId(targetCall);
      if (!targetCall || !toUserId) return;
      socketRef.current?.emit('call:media-state', {
        callId: targetCall.id,
        toUserId,
        mediaState: { audioEnabled: nextAudio, videoEnabled: nextVideo },
      });
    },
    [audioEnabled, call, firstPeerId, socketRef, videoEnabled],
  );

  const startCall = useCallback(
    async (mediaType: CallMediaType) => {
      if (!selectedConversation || !currentUserId) return;
      try {
        setError(null);
        setState('ringing-outgoing');
        mediaTypeRef.current = mediaType;
        const response = await api.startSocialCall(selectedConversation.id, mediaType);
        setCall(response.call);
        iceServersRef.current = response.iceServers;
        const peer = await createPeer(response.call, response.iceServers, mediaType);
        const toUserId = firstPeerId(response.call);
        if (!toUserId) return;
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        socketRef.current?.emit('call:offer', {
          callId: response.call.id,
          toUserId,
          description: offer,
        });
      } catch (err) {
        cleanupMedia();
        setState('ended');
        reportError(err instanceof Error ? err.message : 'Could not start call');
      }
    },
    [cleanupMedia, createPeer, currentUserId, firstPeerId, reportError, selectedConversation, socketRef],
  );

  const acceptIncomingCall = useCallback(async () => {
    if (!incomingCall || !currentUserId) return;
    try {
      setError(null);
      setState('connecting');
      mediaTypeRef.current = incomingCall.mediaType;
      const response = await api.joinSocialCall(incomingCall.id);
      setCall(response.call);
      iceServersRef.current = response.iceServers;
      await createPeer(response.call, response.iceServers, response.call.mediaType);
      setIncomingCall(null);
    } catch (err) {
      cleanupMedia();
      setState('ended');
      reportError(err instanceof Error ? err.message : 'Could not join call');
    }
  }, [cleanupMedia, createPeer, currentUserId, incomingCall, reportError]);

  const declineIncomingCall = useCallback(async () => {
    if (!incomingCall) return;
    try {
      await api.declineSocialCall(incomingCall.id);
    } catch {
      // The call may have ended elsewhere. Keep local UI moving.
    }
    setIncomingCall(null);
    setState('idle');
  }, [incomingCall]);

  const hangUp = useCallback(async () => {
    const currentCall = call;
    cleanupMedia();
    setCall(null);
    setIncomingCall(null);
    setState('ended');
    if (currentCall) {
      try {
        await api.leaveSocialCall(currentCall.id);
      } catch {
        // Local teardown is already complete; backend may have ended the call.
      }
    }
  }, [call, cleanupMedia]);

  const toggleAudio = useCallback(() => {
    const next = !audioEnabled;
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = next;
    });
    setAudioEnabled(next);
    sendMediaState(call, next, videoEnabled);
  }, [audioEnabled, call, sendMediaState, videoEnabled]);

  const toggleVideo = useCallback(() => {
    const next = !videoEnabled;
    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = next;
    });
    setVideoEnabled(next);
    sendMediaState(call, audioEnabled, next);
  }, [audioEnabled, call, sendMediaState, videoEnabled]);

  useEffect(() => {
    attachLocalVideo();
    attachRemoteVideo();
  }, [attachLocalVideo, attachRemoteVideo, state]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !currentUserId) return;

    const handleIncoming = (payload: SocialCall) => {
      if (payload.initiatorId === currentUserId) return;
      setIncomingCall(payload);
      setCall(payload);
      setState('ringing-incoming');
    };

    const handleOffer = async (payload: CallSignalPayload) => {
      if (!payload.description || !call) return;
      try {
        setState('connecting');
        const peer =
          peerRef.current ??
          (await createPeer(call, iceServersRef.current, call.mediaType));
        await peer.setRemoteDescription(payload.description);
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        socket.emit('call:answer', {
          callId: payload.callId,
          toUserId: payload.fromUserId ?? payload.toUserId,
          description: answer,
        });
        setState('active');
      } catch (err) {
        reportError(err instanceof Error ? err.message : 'Could not answer call');
      }
    };

    const handleAnswer = async (payload: CallSignalPayload) => {
      if (!payload.description || !peerRef.current) return;
      await peerRef.current.setRemoteDescription(payload.description);
      setState('active');
    };

    const handleIceCandidate = async (payload: CallSignalPayload) => {
      if (!payload.candidate || !peerRef.current) return;
      await peerRef.current.addIceCandidate(payload.candidate);
    };

    const handleMediaState = (payload: CallSignalPayload) => {
      if (!payload.mediaState) return;
      setRemoteMediaState((current) => ({ ...current, ...payload.mediaState }));
    };

    const handleParticipantJoined = (payload: { callId: string; call: SocialCall }) => {
      if (payload.callId !== call?.id) return;
      setCall(payload.call);
      if (state === 'ringing-outgoing') setState('connecting');
    };

    const handleCallEnded = (payload: { callId: string; call: SocialCall }) => {
      if (payload.callId !== call?.id && payload.callId !== incomingCall?.id) return;
      cleanupMedia();
      setCall(payload.call);
      setIncomingCall(null);
      setState('ended');
    };

    socket.on('call:incoming', handleIncoming);
    socket.on('call:offer', handleOffer);
    socket.on('call:answer', handleAnswer);
    socket.on('call:ice-candidate', handleIceCandidate);
    socket.on('call:media-state', handleMediaState);
    socket.on('call:participant-joined', handleParticipantJoined);
    socket.on('call:ended', handleCallEnded);

    return () => {
      socket.off('call:incoming', handleIncoming);
      socket.off('call:offer', handleOffer);
      socket.off('call:answer', handleAnswer);
      socket.off('call:ice-candidate', handleIceCandidate);
      socket.off('call:media-state', handleMediaState);
      socket.off('call:participant-joined', handleParticipantJoined);
      socket.off('call:ended', handleCallEnded);
    };
  }, [
    call,
    cleanupMedia,
    createPeer,
    currentUserId,
    incomingCall?.id,
    reportError,
    socketRef,
    state,
  ]);

  useEffect(() => cleanupMedia, [cleanupMedia]);

  return {
    state,
    call,
    incomingCall,
    error,
    audioEnabled,
    videoEnabled,
    remoteMediaState,
    localVideoRef,
    remoteVideoRef,
    startCall,
    acceptIncomingCall,
    declineIncomingCall,
    hangUp,
    toggleAudio,
    toggleVideo,
  } satisfies MediaRefs & {
    state: CallUiState;
    call: SocialCall | null;
    incomingCall: SocialCall | null;
    error: string | null;
    audioEnabled: boolean;
    videoEnabled: boolean;
    remoteMediaState: { audioEnabled: boolean; videoEnabled: boolean };
    startCall: (mediaType: CallMediaType) => Promise<void>;
    acceptIncomingCall: () => Promise<void>;
    declineIncomingCall: () => Promise<void>;
    hangUp: () => Promise<void>;
    toggleAudio: () => void;
    toggleVideo: () => void;
  };
}
