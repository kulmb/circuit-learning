export interface NarrationService {
  speak(textId: string): Promise<void>;
  stop(): void;
  replay(): Promise<void>;
  setMuted(muted: boolean): void;
  setRate(rate: number): void;
  unlock(): void;
  destroy(): void;
}
