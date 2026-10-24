import { Injectable, Optional, signal } from '@angular/core';
import { HeroId } from '../models/hero';
import { AudioService } from './audio.service';

export type ToastTone = 'info' | 'success' | 'warning' | 'combat';
export type ToastEventType = 'info' | 'turn' | 'combat' | 'life-loss' | 'healing' | 'equipment' | 'treasure' | 'curse' | 'power';
export type ToastAnchor = 'global' | 'life' | 'inventory-top' | 'inventory-weapons' | 'inventory-spells' | 'inventory-key' | 'treasure' | 'power' | 'curse';
export interface ToastTarget { readonly playerIndex: number; readonly anchor: Exclude<ToastAnchor, 'global'>; }
export interface ToastOptions {
  readonly eventType?: ToastEventType;
  readonly heroId?: HeroId | null;
  readonly icon?: string;
  readonly duration?: number;
}
/** Contrat de donnees ToastMessage utilise par le domaine ou l interface. */
export interface ToastMessage {
  readonly id: number;
  readonly text: string;
  readonly tone: ToastTone;
  readonly eventType: ToastEventType;
  readonly heroId: HeroId | null;
  readonly icon?: string;
  readonly duration: number;
  readonly target?: ToastTarget;
}

/** Libellés courts et stables utilisés par les notifications de partie. */
export const TOAST_LABELS = {
  damage: (amount = 1): string => `−${amount} PV`,
  healing: (amount = 1): string => `+${amount} PV`,
  key: (): string => 'Clé obtenue',
  victory: (): string => 'Victoire !',
  defeat: (): string => '−1 PV',
  draw: (): string => 'Égalité',
  cursed: (): string => 'Maudit !',
  treasure: (): string => 'Trésor obtenu',
  equipment: (name: string): string => `${name} obtenu`,
} as const;

/** File unique de notifications informatives, non bloquantes. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly historyLimit = 50;
  private readonly toastDurationMinimum = 4400;
  private readonly toastDurationMaximum = 10400;
  private readonly toastCharactersPerSecond = 42;
  /** Les notifications restent lisibles 50 % plus longtemps que la base historique. */
  private readonly toastDurationScale = 1.5;
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
  show(text: string, tone: ToastTone = 'info', target?: ToastTarget, options: ToastOptions = {}): void {
    const message: ToastMessage = {
      id: ++this.nextId,
      text,
      tone,
      eventType: options.eventType ?? 'info',
      heroId: options.heroId ?? null,
      icon: options.icon,
      duration: options.duration ?? this.durationFor(text),
      target,
    };
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
    }, message.duration);
  }

  private durationFor(text: string): number {
    return Math.round(this.toastDurationScale * Math.min(
      this.toastDurationMaximum,
      Math.max(
        this.toastDurationMinimum,
        text.length * this.toastCharactersPerSecond * 2,
      ),
    ));
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
