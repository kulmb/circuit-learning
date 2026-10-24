import type { NarrationService } from './types';

export class RecordingUnavailableError extends Error {
  constructor(textId: string) {
    super(`No recording available for ${textId}`);
    this.name = 'RecordingUnavailableError';
  }
}

export class Mp3NarrationService implements NarrationService {
  private manifestPromise: Promise<Set<string>> | null = null;
  private lastTextId: string | null = null;
  private muted = false;
  private currentAudio: HTMLAudioElement | null = null;
  private pendingResolve: (() => void) | null = null;

  constructor(
    private readonly manifestUrl = `${import.meta.env.BASE_URL}audio/manifest.json`,
    private readonly audioBaseUrl = `${import.meta.env.BASE_URL}audio/`,
  ) {}

  unlock(): void {
    // The speech service primes the audio context; recorded audio is played
    // from a user gesture (a hint or a replay), so no extra unlock is needed.
  }

  async speak(textId: string): Promise<void> {
    this.lastTextId = textId;

    if (this.muted || textId === '') {
      this.stop();
      return;
    }

    if (import.meta.env.MODE === 'test') {
      throw new RecordingUnavailableError(textId);
    }

    const files = await this.getManifest();
    if (!files.has(textId) || typeof Audio === 'undefined') {
      throw new RecordingUnavailableError(textId);
    }

    this.stop();

    return new Promise<void>((resolve, reject) => {
      let settled = false;
      const finish = (error?: unknown): void => {
        if (settled) {
          return;
        }
        settled = true;
        this.pendingResolve = null;
        this.currentAudio = null;

        if (error === undefined) {
          resolve();
        } else {
          reject(error);
        }
      };

      this.pendingResolve = () => finish();

      const audio = new Audio(`${this.audioBaseUrl}${textId}.mp3`);
      this.currentAudio = audio;
      audio.onended = () => finish();
      audio.onerror = () => finish(new RecordingUnavailableError(textId));
      void audio.play().catch((error: unknown) => finish(error));
    });
  }

  stop(): void {
    this.currentAudio?.pause();
    this.currentAudio = null;
    this.pendingResolve?.();
  }

  async replay(): Promise<void> {
    if (this.lastTextId !== null) {
      await this.speak(this.lastTextId);
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) {
      this.stop();
    }
  }

  destroy(): void {
    this.stop();
  }

  private getManifest(): Promise<Set<string>> {
    if (this.manifestPromise === null) {
      this.manifestPromise = fetch(this.manifestUrl)
        .then(async (response) => {
          if (!response.ok) {
            return new Set<string>();
          }

          const data = (await response.json()) as { files?: unknown };
          return new Set(
            Array.isArray(data.files)
              ? data.files.filter((id): id is string => typeof id === 'string')
              : [],
          );
        })
        .catch(() => new Set<string>());
    }

    return this.manifestPromise;
  }
}
