export interface NarrationService {
  speak(textId: string): Promise<void>;
  stop(): void;
  replay(): Promise<void>;
  setMuted(muted: boolean): void;
  unlock(): void;
  destroy(): void;
}
