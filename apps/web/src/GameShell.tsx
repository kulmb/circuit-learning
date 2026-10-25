import { getLevelById } from '@circuits/shared/levels';
import { useState } from 'react';

import { ChallengePage } from './levels/ChallengePage';
import { ChildLoginPage } from './levels/ChildLoginPage';
import { CollectionPage } from './levels/CollectionPage';
import { LevelMapPage } from './levels/LevelMapPage';
import { MaterialsLevelPage } from './levels/MaterialsLevelPage';
import { SymbolMatchingPage } from './levels/SymbolMatchingPage';
import { unlockNarration } from './narration/narrationService';
import { unlockAudio } from './workbench/audio';
import { SandboxPage } from './workbench/SandboxPage';
import { WorkbenchPage } from './workbench/WorkbenchPage';

export type GameScreen =
  | 'login'
  | 'map'
  | 'play'
  | 'sandbox'
  | 'collection';

export type AppScreen = 'home' | GameScreen;

export interface GameShellProps {
  screen: GameScreen;
  levelId: string | null;
  onNavigate: (screen: AppScreen, levelId?: string | null) => void;
}

/**
 * Game screens live behind a dynamic import. The home screen and the progress
 * repositories therefore do not pull the full level definitions or the
 * workbench bundle into the first-screen JavaScript.
 */
export function GameShell({
  screen,
  levelId,
  onNavigate,
}: GameShellProps) {
  const [sandboxReturn, setSandboxReturn] = useState<'home' | 'map'>('home');
  const level = levelId === null ? undefined : getLevelById(levelId);

  function openSandbox(): void {
    unlockNarration();
    unlockAudio();
    setSandboxReturn('map');
    onNavigate('sandbox');
  }

  if (screen === 'login') {
    return (
      <ChildLoginPage
        onCancel={() => onNavigate('home')}
        onGuest={() => onNavigate('map')}
        onSuccess={() => onNavigate('map')}
      />
    );
  }

  if (screen === 'sandbox') {
    return <SandboxPage onBack={() => onNavigate(sandboxReturn)} />;
  }

  if (screen === 'collection') {
    return <CollectionPage onBack={() => onNavigate('map')} />;
  }

  if (screen === 'map' || level === undefined) {
    return (
      <LevelMapPage
        onBack={() => onNavigate('home')}
        onCollection={() => onNavigate('collection')}
        onSandbox={openSandbox}
        onSelectLevel={(selectedLevelId) =>
          onNavigate('play', selectedLevelId)
        }
      />
    );
  }

  const nextLevelProps =
    level.nextLevelId === null
      ? {}
      : {
          onNextLevel: () => {
            onNavigate('play', level.nextLevelId);
          },
        };

  if (level.challenge !== undefined) {
    return (
      <ChallengePage
        key={level.id}
        level={level}
        onBack={() => onNavigate('map')}
        {...nextLevelProps}
      />
    );
  }

  if (level.kind === 'materials') {
    return (
      <MaterialsLevelPage
        key={level.id}
        level={level}
        onBack={() => onNavigate('map')}
        {...nextLevelProps}
      />
    );
  }

  if (level.kind === 'matching') {
    return (
      <SymbolMatchingPage
        key={level.id}
        level={level}
        onBack={() => onNavigate('map')}
        {...nextLevelProps}
      />
    );
  }

  return (
    <WorkbenchPage
      key={level.id}
      level={level}
      onBack={() => onNavigate('map')}
      {...nextLevelProps}
    />
  );
}

export default GameShell;
