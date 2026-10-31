import type {
  CircuitMeters,
  MeterId,
  MeterReading,
} from '@circuits/shared';

import { getText } from '../narration/fr';

export interface ZapMeterProps {
  meters: CircuitMeters;
  visible: readonly MeterId[];
  compact?: boolean;
}

/**
 * Read-only, qualitative gauges. They never show a unit or a number: the
 * child only sees how many of the three segments are lit.
 */
export function ZapMeter({
  meters,
  visible,
  compact = false,
}: ZapMeterProps) {
  if (visible.length === 0) {
    return null;
  }

  return (
    <div
      className="workbench-meters"
      role="group"
      aria-label={getText('workbench.meters')}
    >
      {visible.map((id) => (
        <MeterChip
          key={id}
          reading={meters[id]}
          compact={compact}
        />
      ))}
    </div>
  );
}

interface MeterChipProps {
  reading: MeterReading;
  compact: boolean;
}

function MeterChip({ reading, compact }: MeterChipProps) {
  const label = getText(`meter.${reading.id}`);
  const qualifier = qualifierFor(reading);
  const segments = segmentCount(reading);

  return (
    <div
      className={`workbench-meter workbench-meter--${reading.status}`}
      data-meter-id={reading.id}
      aria-label={`${label} : ${qualifier}`}
    >
      <MeterIcon id={reading.id} />
      <span className="workbench-meter__text">
        <span className="workbench-meter__label">{label}</span>
        {compact ? null : (
          <span className="workbench-meter__qualifier">{qualifier}</span>
        )}
      </span>
      <span className="workbench-meter__segments" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className={index < segments ? 'is-on' : undefined}
          />
        ))}
      </span>
    </div>
  );
}

function qualifierFor(reading: MeterReading): string {
  const specific = getText(`meter.${reading.id}.${reading.status}`);

  if (specific !== '') {
    return specific;
  }

  if (reading.status === 'off') {
    return getText('meter.off');
  }

  if (reading.status === 'alert') {
    return getText('meter.alert');
  }

  return '';
}

function segmentCount(reading: MeterReading): number {
  switch (reading.status) {
    case 'low':
      return 1;
    case 'medium':
      return 2;
    case 'high':
      return 3;
    default:
      return 0;
  }
}

function MeterIcon({ id }: { id: MeterId }) {
  switch (id) {
    case 'tension':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            d="M5 7v10M8 7v10M13 12h8M18 8l3 4-3 4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'courant':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            d="M3 12h12M12 7l5 5-5 5M19 12h2"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'resistance':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            d="M3 12h3l2-5 3 10 2-8 2 6 2-3h4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'puissance':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            d="M13 3L6 13h5l-1 8 8-11h-5z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'charge':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <rect
            x="4"
            y="7"
            width="16"
            height="10"
            rx="2"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <rect x="7" y="10" width="7" height="4" fill="currentColor" />
          <path d="M20 10v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'aimant':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            d="M6 5v7a6 6 0 0 0 12 0V5h-4v7a2 2 0 0 1-4 0V5z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M6 8h4M14 8h4" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
  }
}
