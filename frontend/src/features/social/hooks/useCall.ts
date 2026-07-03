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

const callDebugEnabled =
  import.meta.env.DEV ||
  (typeof window !== 'undefined' && window.localStorage.getItem('manga.debug.calls') === '1');

function logCallDebug(event: string, payload: Record<string, unknown> = {}) {
  if (!callDebugEnabled) return;
  console.info('[social-call]', { event, ts: new Date().toISOString(), ...payload });
}

function candidateSummary(candidate: RTCIceCandidateInit | null | undefined) {
  if (!candidate?.candidate) return null;
  const typeMatch = candidate.candidate.match(/ typ ([a-zA-Z0-9]+)/);
  const protocolMatch = candidate.candidate.match(/ udp | tcp /i);
  return {
    sdpMid: candidate.sdpMid,
    sdpMLineIndex: candidate.sdpMLineIndex,
    type: typeMatch?.[1] ?? 'unknown',
    protocol: protocolMatch?.[0]?.trim() ?? 'unknown',
  };
}

function emitCallSignal(
  socket: SocialSocket | null,
  event: 'call:offer' | 'call:answer' | 'call:ice-candidate' | 'call:media-state',
  payload: CallSignalPayload,
) {
  if (!socket) {
    logCallDebug('signal-emit-skipped-no-socket', { signal: event, callId: payload.callId });
    return;
  }
  socket.emit(event, payload, (ack) => {
    logCallDebug('signal-emit-ack', {
      signal: event,
      callId: payload.callId,
      toUserId: payload.toUserId,
      ok: ack?.ok,
      errorCode: ack?.ok === false ? ack.error.code : undefined,
      errorMessage: ack?.ok === false ? ack.error.message : undefined,
    });
  });
}

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
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

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
        .sort((a, b) => {
          if (a.status === b.status) return 0;
          return a.status === 'JOINED' ? -1 : 1;
        })
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
      logCallDebug('peer-created', {
        callId: targetCall.id,
        mediaType,
        iceServerCount: iceServers.length,
        localTrackKinds: stream.getTracks().map((track) => track.kind),
      });
      peer.ontrack = (event) => {
        logCallDebug('remote-track-received', {
          callId: targetCall.id,
          trackKind: event.track.kind,
          streamCount: event.streams.length,
          streamTrackCounts: event.streams.map((item) => item.getTracks().length),
        });
        event.streams[0]?.getTracks().forEach((track) => remoteStream.addTrack(track));
        attachRemoteVideo();
      };
      peer.onicecandidate = (event) => {
        const candidate = event.candidate?.toJSON();
        const toUserId = firstPeerId(targetCall);
        if (!candidate) {
          logCallDebug('ice-gathering-complete', { callId: targetCall.id });
          return;
        }
        if (!toUserId) {
          logCallDebug('ice-candidate-dropped-no-peer', {
            callId: targetCall.id,
            candidate: candidateSummary(candidate),
          });
          return;
        }
        logCallDebug('ice-candidate-send', {
          callId: targetCall.id,
          toUserId,
          candidate: candidateSummary(candidate),
        });
        emitCallSignal(socketRef.current, 'call:ice-candidate', {
          callId: targetCall.id,
          toUserId,
          candidate,
        });
      };
      peer.oniceconnectionstatechange = () => {
        logCallDebug('ice-connection-state', {
          callId: targetCall.id,
          state: peer.iceConnectionState,
        });
      };
      peer.onconnectionstatechange = () => {
        logCallDebug('peer-connection-state', {
          callId: targetCall.id,
          state: peer.connectionState,
        });
      };
      peer.onsignalingstatechange = () => {
        logCallDebug('signaling-state', {
          callId: targetCall.id,
          state: peer.signalingState,
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
      emitCallSignal(socketRef.current, 'call:media-state', {
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
        logCallDebug('call-started', {
          callId: response.call.id,
          conversationId: selectedConversation.id,
          mediaType,
          participantStatuses: response.call.participants.map((participant) => ({
            userId: participant.userId,
            status: participant.status,
          })),
        });
        await createPeer(response.call, response.iceServers, mediaType);
      } catch (err) {
        cleanupMedia();
        setState('ended');
        reportError(err instanceof Error ? err.message : 'Could not start call');
      }
    },
    [cleanupMedia, createPeer, currentUserId, firstPeerId, reportError, selectedConversation, socketRef],
  );

  const sendOfferToPeer = useCallback(
    async (targetCall: SocialCall, toUserId: string) => {
      const peer =
        peerRef.current ??
        (await createPeer(targetCall, iceServersRef.current, targetCall.mediaType));
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      logCallDebug('offer-send-participant-joined', {
        callId: targetCall.id,
        toUserId,
        signalingState: peer.signalingState,
      });
      emitCallSignal(socketRef.current, 'call:offer', {
        callId: targetCall.id,
        toUserId,
        description: offer,
      });
    },
    [createPeer, socketRef],
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
      logCallDebug('incoming-call', {
        callId: payload.id,
        initiatorId: payload.initiatorId,
        mediaType: payload.mediaType,
      });
      setIncomingCall(payload);
      setCall(payload);
      setState('ringing-incoming');
    };

    const handleOffer = async (payload: CallSignalPayload) => {
      if (!payload.description || !call) return;
      try {
        logCallDebug('offer-received', {
          callId: payload.callId,
          fromUserId: payload.fromUserId,
          currentCallId: call.id,
          hasPeer: Boolean(peerRef.current),
        });
        setState('connecting');
        const peer =
          peerRef.current ??
          (await createPeer(call, iceServersRef.current, call.mediaType));
        await peer.setRemoteDescription(payload.description);
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        const toUserId = payload.fromUserId ?? payload.toUserId;
        if (!toUserId) {
          logCallDebug('answer-send-skipped-no-peer', {
            callId: payload.callId,
            fromUserId: payload.fromUserId,
            payloadToUserId: payload.toUserId,
          });
          return;
        }
        logCallDebug('answer-send', {
          callId: payload.callId,
          toUserId,
          signalingState: peer.signalingState,
        });
        emitCallSignal(socket, 'call:answer', {
          callId: payload.callId,
          toUserId,
          description: answer,
        });
        for (const candidate of pendingIceCandidatesRef.current) {
          await peer.addIceCandidate(candidate);
        }
        if (pendingIceCandidatesRef.current.length) {
          logCallDebug('ice-candidate-buffer-flushed', {
            callId: payload.callId,
            count: pendingIceCandidatesRef.current.length,
          });
        }
        pendingIceCandidatesRef.current = [];
        setState('active');
      } catch (err) {
        reportError(err instanceof Error ? err.message : 'Could not answer call');
      }
    };

    const handleAnswer = async (payload: CallSignalPayload) => {
      if (!payload.description || !peerRef.current) return;
      logCallDebug('answer-received', {
        callId: payload.callId,
        fromUserId: payload.fromUserId,
        signalingState: peerRef.current.signalingState,
      });
      await peerRef.current.setRemoteDescription(payload.description);
      for (const candidate of pendingIceCandidatesRef.current) {
        await peerRef.current.addIceCandidate(candidate);
      }
      if (pendingIceCandidatesRef.current.length) {
        logCallDebug('ice-candidate-buffer-flushed', {
          callId: payload.callId,
          count: pendingIceCandidatesRef.current.length,
        });
      }
      pendingIceCandidatesRef.current = [];
      setState('active');
    };

    const handleIceCandidate = async (payload: CallSignalPayload) => {
      if (!payload.candidate || !peerRef.current) return;
      try {
        if (!peerRef.current.remoteDescription) {
          pendingIceCandidatesRef.current.push(payload.candidate);
          logCallDebug('ice-candidate-buffered', {
            callId: payload.callId,
            fromUserId: payload.fromUserId,
            candidate: candidateSummary(payload.candidate as RTCIceCandidateInit),
          });
          return;
        }
        logCallDebug('ice-candidate-received', {
          callId: payload.callId,
          fromUserId: payload.fromUserId,
          signalingState: peerRef.current.signalingState,
          remoteDescriptionSet: Boolean(peerRef.current.remoteDescription),
          candidate: candidateSummary(payload.candidate as RTCIceCandidateInit),
        });
        await peerRef.current.addIceCandidate(payload.candidate);
      } catch (err) {
        logCallDebug('ice-candidate-add-failed', {
          callId: payload.callId,
          fromUserId: payload.fromUserId,
          error: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
    };

    const handleMediaState = (payload: CallSignalPayload) => {
      if (!payload.mediaState) return;
      setRemoteMediaState((current) => ({ ...current, ...payload.mediaState }));
    };

    const handleParticipantJoined = (payload: { callId: string; userId: string; call: SocialCall }) => {
      if (payload.callId !== call?.id) return;
      logCallDebug('participant-joined', {
        callId: payload.callId,
        userId: payload.userId,
        initiatorId: payload.call.initiatorId,
        currentUserId,
      });
      setCall(payload.call);
      if (state === 'ringing-outgoing') setState('connecting');
      if (payload.call.initiatorId === currentUserId && payload.userId !== currentUserId) {
        void sendOfferToPeer(payload.call, payload.userId);
      }
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
    sendOfferToPeer,
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
