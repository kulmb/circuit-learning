/**
 * Inline 24×24 vector icons shared by the header buttons, the selection
 * toolbar and Zap. Keeping the paths here avoids font glyphs and emoji,
 * which render differently across browsers and operating systems.
 */
export type IconName =
  | 'arrow-left'
  | 'undo'
  | 'help'
  | 'maximize'
  | 'rotate'
  | 'trash'
  | 'eye'
  | 'shuffle'
  | 'sun'
  | 'moon'
  | 'empty'
  | 'close';

export interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

export function Icon({ name, size = 24, className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <IconPaths name={name} />
    </svg>
  );
}

/** Paths only, for embedding inside an existing SVG drawing. */
export function IconPaths({ name }: { name: IconName }) {
  switch (name) {
    case 'arrow-left':
      return <path d="M19 12H5M12 19l-7-7 7-7" />;
    case 'undo':
      return (
        <>
          <path d="M9 14 4 9l5-5" />
          <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
        </>
      );
    case 'help':
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.2 9a3 3 0 0 1 5.8 1c0 2-3 2.4-3 4.2" />
          <circle cx="12" cy="17.2" r="0.9" fill="currentColor" stroke="none" />
        </>
      );
    case 'maximize':
      return (
        <>
          <path d="M8 3H3v5" />
          <path d="M16 3h5v5" />
          <path d="M21 16v5h-5" />
          <path d="M3 16v5h5" />
        </>
      );
    case 'rotate':
      return (
        <>
          <path d="M21 12a9 9 0 1 1-2.64-6.36" />
          <path d="M21 3v6h-6" />
        </>
      );
    case 'trash':
      return (
        <>
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 11v6M14 11v6" />
        </>
      );
    case 'eye':
      return (
        <>
          <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
          <circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none" />
        </>
      );
    case 'shuffle':
      return (
        <>
          <path d="M4 7h3l10 10h3" />
          <path d="M17 4l3 3-3 3" />
          <path d="M4 17h3l3-3" />
          <path d="M13 10l4-3h3" />
          <path d="M17 14l3 3-3 3" />
        </>
      );
    case 'sun':
      return (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
          <path d="M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4" />
          <path d="M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
        </>
      );
    case 'moon':
      return <path d="M20 14.5A8 8 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />;
    case 'empty':
      return (
        <>
          <path d="M12 3v9" />
          <path d="M8 8l4 4 4-4" />
          <path d="M4 15v4h16v-4" />
        </>
      );
    case 'close':
      return <path d="M18 6 6 18M6 6l12 12" />;
  }
}
