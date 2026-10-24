import { avatarEmoji, type PicturePatternId } from '@circuits/shared';
import type { PointerEvent as ReactPointerEvent } from 'react';

import { adminTexts } from './fr';

export function activate(
  event: ReactPointerEvent<HTMLButtonElement>,
  action: () => void,
): void {
  if (event.pointerType === 'mouse' && event.button !== 0) {
    return;
  }

  event.preventDefault();
  action();
}

export function roleLabel(role: string): string {
  return (
    adminTexts.roles[role as keyof typeof adminTexts.roles] ?? role
  );
}

export function formatDate(value: string | number | null): string {
  if (value === null) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

export function AdminLoading() {
  return (
    <div className="admin-loading" aria-busy="true">
      <div className="admin-loading__spinner" aria-hidden="true" />
      <p>{adminTexts.loading}</p>
    </div>
  );
}

export function AdminError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="admin-alert admin-alert--error" role="alert">
      <span>{message}</span>
      {onRetry !== undefined ? (
        <button
          type="button"
          className="admin-button admin-button--small"
          onPointerDown={(event) => activate(event, onRetry)}
        >
          {adminTexts.retry}
        </button>
      ) : null}
    </div>
  );
}

export function AdminNotice({
  message,
  tone = 'info',
}: {
  message: string;
  tone?: 'info' | 'success' | 'warning';
}) {
  return (
    <p className={`admin-alert admin-alert--${tone}`} role="status">
      {message}
    </p>
  );
}

export function AdminEmpty({ message }: { message: string }) {
  return <p className="admin-empty">{message}</p>;
}

export function AvatarPill({
  avatarId,
  name,
}: {
  avatarId: string | null;
  name: string;
}) {
  return (
    <span className="admin-avatar-pill">
      <span className="admin-avatar-pill__emoji" aria-hidden="true">
        {avatarEmoji(avatarId)}
      </span>
      <span>{name}</span>
    </span>
  );
}

export function PicturePasswordList({
  entries,
}: {
  entries: Array<{
    name: string;
    labels: readonly string[];
    pattern: readonly PicturePatternId[];
  }>;
}) {
  return (
    <ul className="admin-picture-list">
      {entries.map((entry, index) => (
        <li key={`${entry.name}-${index}`}>
          <strong>{entry.name}</strong>
          <span>
            {entry.labels.map((label, index) => (
              <span key={`${label}-${index}`} className="admin-picture-chip">
                {index + 1}. {label}
              </span>
            ))}
          </span>
        </li>
      ))}
    </ul>
  );
}

export async function copyText(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = value;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.append(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    } catch {
      // The link stays selectable in the read-only input.
    }
  }
}
