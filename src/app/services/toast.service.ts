import { Injectable, Optional, signal } from '@angular/core';
import { AudioService } from './audio.service';

export type ToastTone = 'info' | 'success' | 'warning' | 'combat';
/** Contrat de donnees ToastMessage utilise par le domaine ou l interface. */
export interface ToastMessage { readonly id: number; readonly text: string; readonly tone: ToastTone; }

/** File unique de notifications informatives, non bloquantes. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly historyLimit = 50;
  private readonly toastDurationMinimum = 4400;
  private readonly toastDurationMaximum = 10400;
  private readonly toastCharactersPerSecond = 42;
  private readonly toastDurationScale = 2 / 3;
  private readonly toastFadeDuration = 300;

  readonly current = signal<ToastMessage | null>(null);
  readonly isDismissing = signal(false);
  readonly history = signal<readonly ToastMessage[]>([]);
  private readonly queue: ToastMessage[] = [];
  private nextId = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private fadeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(@Optional() private readonly audioService?: AudioService) {}

/** Gere show et applique les gardes necessaires avant mutation. */
  show(text: string, tone: ToastTone = 'info'): void {
    const message = { id: ++this.nextId, text, tone };
    if (this.current()) {
      if (this.queue.some(item => item.text === text) || this.current()?.text === text) return;
      this.addToHistory(message);
      this.queue.push(message);
      return;
    }
    this.addToHistory(message);
    this.display(message);
    this.audioService?.play('notification');
  }

  /** Réinitialise les événements affichés pour une nouvelle partie. */
  clearHistory(): void {
    this.history.set([]);
  }

/** Gere dismiss et applique les gardes necessaires avant mutation. */
  dismiss(): void {
    if (!this.current() || this.isDismissing()) return;

    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.isDismissing.set(true);
    this.fadeTimer = setTimeout(() => this.finishDismissal(), this.toastFadeDuration);
  }

/** Gere display et applique les gardes necessaires avant mutation. */
  private display(message: ToastMessage): void {
    this.current.set(message);
    this.schedule(message);
  }

  private addToHistory(message: ToastMessage): void {
    this.history.update(history => [...history, message].slice(-this.historyLimit));
  }

/** Gere schedule et applique les gardes necessaires avant mutation. */
  private schedule(message: ToastMessage): void {
    this.timer = setTimeout(() => {
      if (this.current()?.id === message.id) this.dismiss();
    }, Math.round(this.toastDurationScale * Math.min(
      this.toastDurationMaximum,
      Math.max(
        this.toastDurationMinimum,
        message.text.length * this.toastCharactersPerSecond * 2,
      ),
    )));
  }

/** Gere finishDismissal et applique les gardes necessaires avant mutation. */
  private finishDismissal(): void {
    this.fadeTimer = null;
    this.isDismissing.set(false);
    const next = this.queue.shift() ?? null;
    this.current.set(next);
    if (next) this.schedule(next);
  }
}
