import { useCallback, useEffect, useRef, useState } from 'react';

import { useLanguage } from '../i18n/LanguageContext';
import { setSoundEnabled } from '../settings/preferences';
import { getText } from './fr';
import { isNarrationMuted, narrationService } from './narrationService';

interface NarrationState {
  textId: string | null;
  text: string;
  speaking: boolean;
}

export function useNarration() {
  const { language } = useLanguage();
  const [state, setState] = useState<NarrationState>({
    textId: null,
    text: '',
    speaking: false,
  });
  const [muted, setMuted] = useState(() => isNarrationMuted());
  const currentTextIdRef = useRef<string | null>(null);

  useEffect(() => {
    const textId = currentTextIdRef.current;

    if (textId === null) {
      return;
    }

    narrationService.stop();
    setState({
      textId,
      text: getText(textId),
      speaking: false,
    });
  }, [language]);

  const say = useCallback((textId: string) => {
    const text = getText(textId);
    if (text === '') {
      return;
    }

    currentTextIdRef.current = textId;
    setState({ textId, text, speaking: true });

    void narrationService
      .speak(textId)
      .catch(() => undefined)
      .finally(() => {
        setState((previous) =>
          previous.textId === textId ? { ...previous, speaking: false } : previous,
        );
      });
  }, []);

  const replay = useCallback(() => {
    const textId = currentTextIdRef.current;
    if (textId === null) {
      return;
    }

    setState((previous) =>
      previous.textId === textId ? { ...previous, speaking: true } : previous,
    );

    void narrationService
      .replay()
      .catch(() => undefined)
      .finally(() => {
        setState((previous) =>
          previous.textId === textId ? { ...previous, speaking: false } : previous,
        );
      });
  }, []);

  const stop = useCallback(() => {
    narrationService.stop();
    setState((previous) => ({ ...previous, speaking: false }));
  }, []);

  const toggleMute = useCallback(() => {
    const next = !isNarrationMuted();
    setSoundEnabled(!next);
    setMuted(next);

    if (next) {
      setState((current) => ({ ...current, speaking: false }));
    }
  }, []);

  useEffect(() => {
    const handleVisibilityChange = (): void => {
      if (document.hidden) {
        stop();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      narrationService.stop();
    };
  }, [stop]);

  return { ...state, muted, say, replay, stop, toggleMute };
}
