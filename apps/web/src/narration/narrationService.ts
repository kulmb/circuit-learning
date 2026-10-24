import { Mp3NarrationService } from './mp3Narration';
import { SpeechNarrationService } from './speechNarration';
import type { NarrationService } from './types';

class PreferredNarrationService implements NarrationService {
  private readonly recordings = new Mp3NarrationService();
  private readonly speech = new SpeechNarrationService();
  private lastTextId: string | null = null;

  async speak(textId: string): Promise<void> {
    this.lastTextId = textId;

    if (textId === '') {
      this.speech.unlock();
      return;
    }

    this.recordings.stop();
    this.speech.stop();

    try {
      await this.recordings.speak(textId);
    } catch {
      await this.speech.speak(textId);
    }
  }

  stop(): void {
    this.recordings.stop();
    this.speech.stop();
  }

  async replay(): Promise<void> {
    if (this.lastTextId !== null) {
      await this.speak(this.lastTextId);
    }
  }

  setMuted(muted: boolean): void {
    this.recordings.setMuted(muted);
    this.speech.setMuted(muted);
  }

  unlock(): void {
    this.speech.unlock();
    this.recordings.unlock();
  }

  destroy(): void {
    this.recordings.destroy();
    this.speech.destroy();
  }
}

export const narrationService: NarrationService = new PreferredNarrationService();

let muted = false;

export function unlockNarration(): void {
  narrationService.unlock();
}

export function setNarrationMuted(next: boolean): void {
  muted = next;
  narrationService.setMuted(next);
}

export function isNarrationMuted(): boolean {
  return muted;
}
