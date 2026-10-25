import {
  generateChallenge,
  type LevelDefinition,
} from '@circuits/shared/levels';
import { useMemo, useState } from 'react';

import { WorkbenchPage } from '../workbench/WorkbenchPage';

export interface ChallengePageProps {
  level: LevelDefinition;
  onBack: () => void;
  onNextLevel?: () => void;
}

export function ChallengePage({
  level,
  onBack,
  onNextLevel,
}: ChallengePageProps) {
  const [seed, setSeed] = useState(newSeed);
  const generated = useMemo(
    () => generateChallenge(level, seed),
    [level, seed],
  );

  return (
    <WorkbenchPage
      key={`${level.id}-${seed}`}
      level={generated.level}
      onBack={onBack}
      {...(onNextLevel === undefined ? {} : { onNextLevel })}
      challenge={{
        seed,
        onNewChallenge: () => setSeed(newSeed()),
      }}
    />
  );
}

function newSeed(): number {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] ?? 1;
  }

  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
}
