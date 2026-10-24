import type { PointerEvent as ReactPointerEvent } from 'react';

import { fr } from '../narration/fr';
import type { ZapExpression } from '../narration/hints';
import './Zap.css';

export interface ZapProps {
  expression: ZapExpression;
  message: string;
  speaking: boolean;
  muted: boolean;
  onHint: () => void;
  onReplay: () => void;
  onToggleMute: () => void;
}

export function Zap({
  expression,
  message,
  speaking,
  muted,
  onHint,
  onReplay,
  onToggleMute,
}: ZapProps) {
  return (
    <div className="zap-panel">
      {message !== '' ? (
        <div className="zap-bubble" role="status" aria-live="polite">
          <p className="zap-bubble__text">{message}</p>
          <button
            type="button"
            className="zap-bubble__replay"
            onPointerDown={(event) => activate(event, onReplay)}
          >
            <ReplayIcon />
            <span>{fr.zap.replay}</span>
          </button>
        </div>
      ) : null}

      <button
        type="button"
        className="zap-avatar"
        onPointerDown={(event) => activate(event, onHint)}
        aria-label={fr.zap.hintAria}
      >
        <ZapCharacter
          expression={expression}
          speaking={speaking}
          className="zap-avatar__character"
        />
        <span className="zap-avatar__help">
          <BulbIcon />
          <span>{fr.zap.help}</span>
        </span>
      </button>

      <button
        type="button"
        className={`zap-mute${muted ? ' is-muted' : ''}`}
        onPointerDown={(event) => activate(event, onToggleMute)}
        aria-label={muted ? fr.zap.unmute : fr.zap.mute}
        aria-pressed={muted}
      >
        <SpeakerIcon muted={muted} />
      </button>
    </div>
  );
}

export interface ZapCharacterProps {
  expression: ZapExpression;
  speaking: boolean;
  className?: string;
}

export function ZapCharacter({
  expression,
  speaking,
  className,
}: ZapCharacterProps) {
  const classes = ['zap-character', className].filter(Boolean).join(' ');
  const alert = expression === 'alert';
  const eyeRadius = expression === 'surprised' ? 9 : 7;
  const pupilRadius = expression === 'surprised' ? 3.5 : 4;
  const pupilOffset =
    expression === 'thinking' ? { x: 2, y: -2 } : { x: 0, y: 0 };

  return (
    <svg
      className={classes}
      viewBox="0 0 120 120"
      aria-hidden="true"
      focusable="false"
      data-expression={expression}
      data-speaking={speaking ? 'true' : 'false'}
    >
      <ellipse cx="60" cy="108" rx="36" ry="7" fill="rgba(36, 50, 74, 0.12)" />

      <line
        x1="60"
        y1="30"
        x2="60"
        y2="16"
        stroke={alert ? '#ef4444' : '#2a9d8f'}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle
        cx="60"
        cy="12"
        r="6"
        fill={alert ? '#ef4444' : '#ffd166'}
      />

      <circle cx="20" cy="64" r="8" fill="#ffb703" />
      <circle cx="100" cy="64" r="8" fill="#ffb703" />

      <rect
        x="22"
        y="28"
        width="76"
        height="66"
        rx="24"
        fill="#c9f7f2"
        stroke="#2a9d8f"
        strokeWidth="4"
      />
      <rect x="36" y="42" width="48" height="40" rx="16" fill="#f7fffe" />

      <Eyebrows expression={expression} />

      <circle cx="50" cy="58" r={eyeRadius} fill="#ffffff" />
      <circle cx="70" cy="58" r={eyeRadius} fill="#ffffff" />
      <circle
        cx={50 + pupilOffset.x}
        cy={58 + pupilOffset.y}
        r={pupilRadius}
        fill="#24324a"
      />
      <circle
        cx={70 + pupilOffset.x}
        cy={58 + pupilOffset.y}
        r={pupilRadius}
        fill="#24324a"
      />

      <g className={speaking ? 'zap-mouth zap-mouth--talking' : 'zap-mouth'}>
        <Mouth expression={expression} />
      </g>

      {expression === 'content' ? (
        <>
          <circle cx="39" cy="75" r="5" fill="#ffb703" opacity="0.28" />
          <circle cx="81" cy="75" r="5" fill="#ffb703" opacity="0.28" />
        </>
      ) : null}
      {alert ? (
        <>
          <circle cx="39" cy="73" r="5" fill="#ef4444" opacity="0.3" />
          <circle cx="81" cy="73" r="5" fill="#ef4444" opacity="0.3" />
        </>
      ) : null}
    </svg>
  );
}

function Eyebrows({ expression }: { expression: ZapExpression }) {
  if (expression === 'thinking') {
    return (
      <path
        d="M42 48 Q47 44 53 47"
        fill="none"
        stroke="#24324a"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    );
  }

  if (expression === 'surprised') {
    return (
      <>
        <path
          d="M42 49 Q47 44 53 48"
          fill="none"
          stroke="#24324a"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M67 48 Q73 44 78 49"
          fill="none"
          stroke="#24324a"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </>
    );
  }

  if (expression === 'alert') {
    return (
      <>
        <path
          d="M42 49 L54 53"
          fill="none"
          stroke="#24324a"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M66 53 L78 49"
          fill="none"
          stroke="#24324a"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </>
    );
  }

  return null;
}

function Mouth({ expression }: { expression: ZapExpression }) {
  if (expression === 'thinking') {
    return (
      <path
        d="M52 76 L68 76"
        fill="none"
        stroke="#24324a"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    );
  }

  if (expression === 'surprised') {
    return <ellipse cx="60" cy="76" rx="6" ry="7" fill="#24324a" />;
  }

  if (expression === 'alert') {
    return (
      <path
        d="M52 80 Q60 72 68 80"
        fill="none"
        stroke="#24324a"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    );
  }

  return (
    <path
      d="M50 74 Q60 82 70 74"
      fill="none"
      stroke="#24324a"
      strokeWidth="3.5"
      strokeLinecap="round"
    />
  );
}

function ReplayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M4 10a8 8 0 1 1 2 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M4 4v6h6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BulbIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M9 18h6M10 21h4M8 14a6 6 0 1 1 8 0c-1 1-1.3 2-1.3 3H9.3c0-1-.3-2-1.3-3Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M4 9h4l5-4v14l-5-4H4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {muted ? (
        <path
          d="M16 9l5 6M21 9l-5 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ) : (
        <>
          <path
            d="M16 9a4 4 0 0 1 0 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M18.5 6.5a8 8 0 0 1 0 11"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}

function activate(
  event: ReactPointerEvent<HTMLButtonElement>,
  action: () => void,
): void {
  if (event.pointerType === 'mouse' && event.button !== 0) {
    return;
  }

  event.preventDefault();
  action();
}
