import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from 'lucide-react';
import type { MutableRefObject } from 'react';
import type { CallMediaType, SocialCall } from '@/types';
import type { CallUiState } from '../hooks/useCall';

type CallControlsProps = {
  state: CallUiState;
  call: SocialCall | null;
  incomingCall: SocialCall | null;
  audioEnabled: boolean;
  videoEnabled: boolean;
  remoteMediaState: { audioEnabled: boolean; videoEnabled: boolean };
  localVideoRef: MutableRefObject<HTMLVideoElement | null>;
  remoteVideoRef: MutableRefObject<HTMLVideoElement | null>;
  onStartCall: (mediaType: CallMediaType) => void;
  onAccept: () => void;
  onDecline: () => void;
  onHangUp: () => void;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
};

export function CallHeaderActions({
  disabled,
  onStartCall,
}: {
  disabled?: boolean;
  onStartCall: (mediaType: CallMediaType) => void;
}) {
  return (
    <div className='social-call-header-actions'>
      <button
        className='btn reader-icon-button social-thread-action'
        type='button'
        aria-label='Start audio call'
        title='Start audio call'
        disabled={disabled}
        onClick={() => onStartCall('AUDIO')}
      >
        <Phone size={16} />
      </button>
      <button
        className='btn reader-icon-button social-thread-action'
        type='button'
        aria-label='Start video call'
        title='Start video call'
        disabled={disabled}
        onClick={() => onStartCall('VIDEO')}
      >
        <Video size={16} />
      </button>
    </div>
  );
}

export function CallDock({
  state,
  call,
  incomingCall,
  audioEnabled,
  videoEnabled,
  remoteMediaState,
  localVideoRef,
  remoteVideoRef,
  onAccept,
  onDecline,
  onHangUp,
  onToggleAudio,
  onToggleVideo,
}: CallControlsProps) {
  if (state === 'idle' || (!call && !incomingCall)) return null;
  const activeCall = incomingCall ?? call;
  const active = state === 'active' || state === 'connecting' || state === 'ringing-outgoing';

  if (state === 'ringing-incoming' && incomingCall) {
    return (
      <section className='social-call-dock social-call-incoming' aria-label='Incoming call'>
        <div>
          <strong>{incomingCall.initiator.displayName}</strong>
          <span>{incomingCall.mediaType === 'VIDEO' ? 'Video call' : 'Audio call'}</span>
        </div>
        <div className='social-call-actions'>
          <button className='btn reader-icon-button social-call-accept' type='button' aria-label='Accept call' onClick={onAccept}>
            <Phone size={16} />
          </button>
          <button className='btn reader-icon-button social-call-decline' type='button' aria-label='Decline call' onClick={onDecline}>
            <PhoneOff size={16} />
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className='social-call-dock' aria-label='Active call'>
      <div className='social-call-stage'>
        <div className='social-call-remote'>
          {activeCall?.mediaType === 'VIDEO' ? (
            <video ref={remoteVideoRef} autoPlay playsInline />
          ) : (
            <div className='social-call-audio-tile'>
              <Phone size={20} />
            </div>
          )}
          <span>{remoteMediaState.videoEnabled ? 'Remote' : 'Camera off'}</span>
        </div>
        {activeCall?.mediaType === 'VIDEO' ? (
          <div className='social-call-local'>
            <video ref={localVideoRef} autoPlay muted playsInline />
          </div>
        ) : null}
      </div>
      <div className='social-call-status'>
        <strong>{formatCallState(state)}</strong>
        <span>{activeCall?.mediaType === 'VIDEO' ? 'Video call' : 'Audio call'}</span>
      </div>
      {active ? (
        <div className='social-call-actions'>
          <button
            className='btn reader-icon-button'
            type='button'
            aria-label={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
            onClick={onToggleAudio}
          >
            {audioEnabled ? <Mic size={16} /> : <MicOff size={16} />}
          </button>
          {activeCall?.mediaType === 'VIDEO' ? (
            <button
              className='btn reader-icon-button'
              type='button'
              aria-label={videoEnabled ? 'Turn camera off' : 'Turn camera on'}
              onClick={onToggleVideo}
            >
              {videoEnabled ? <Video size={16} /> : <VideoOff size={16} />}
            </button>
          ) : null}
          <button className='btn reader-icon-button social-call-decline' type='button' aria-label='Hang up call' onClick={onHangUp}>
            <PhoneOff size={16} />
          </button>
        </div>
      ) : null}
    </section>
  );
}

function formatCallState(state: CallUiState) {
  if (state === 'ringing-outgoing') return 'Ringing';
  if (state === 'connecting') return 'Connecting';
  if (state === 'active') return 'In call';
  if (state === 'ended') return 'Call ended';
  return 'Call';
}
