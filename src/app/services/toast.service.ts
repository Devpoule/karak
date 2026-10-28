import { Injectable, Optional, signal } from '@angular/core';
import { HeroId } from '../models/hero';
import { AudioEffectCue, AudioService } from './audio.service';

export type ToastTone = 'info' | 'success' | 'warning' | 'combat';
export type ToastEventType = 'info' | 'turn' | 'combat' | 'life-loss' | 'healing' | 'equipment' | 'treasure' | 'curse' | 'power';
export type ToastAnchor = 'global' | 'life' | 'inventory-top' | 'inventory-weapons' | 'inventory-spells' | 'inventory-key' | 'treasure' | 'power' | 'curse';
export type ToastContext = 'combat' | 'general';
export type ToastPriority = 'normal' | 'important' | 'critical';
export interface ToastTarget { readonly playerIndex: number; readonly anchor: Exclude<ToastAnchor, 'global'>; }
export interface ToastOptions {
  readonly eventType?: ToastEventType;
  readonly heroId?: HeroId | null;
  readonly icon?: string;
  readonly duration?: number;
  readonly audioCue?: AudioEffectCue | null;
  readonly context?: ToastContext;
  readonly priority?: ToastPriority;
}
export interface ToastMessage {
  readonly id: number;
  readonly text: string;
  readonly tone: ToastTone;
  readonly eventType: ToastEventType;
  readonly heroId: HeroId | null;
  readonly icon?: string;
  readonly duration: number;
  readonly audioCue: AudioEffectCue | null;
  readonly target?: ToastTarget;
  readonly context: ToastContext;
  readonly priority: ToastPriority;
}

interface EquipmentToastLabel {
  readonly quantity: number;
  readonly singular: string;
  readonly plural: string;
}

const EQUIPMENT_TOAST_LABELS: Readonly<Record<string, EquipmentToastLabel>> = {
  daggers: { quantity: 2, singular: 'Poignard', plural: 'Poignards' },
  sword: { quantity: 1, singular: 'Épée', plural: 'Épées' },
  axe: { quantity: 1, singular: 'Hache', plural: 'Haches' },
  key: { quantity: 1, singular: 'Clé', plural: 'Clés' },
  'fire-sword': { quantity: 1, singular: 'Épée de feu', plural: 'Épées de feu' },
  heart: { quantity: 1, singular: 'Sort de soin', plural: 'Sorts de soin' },
};

function formatGain(label: EquipmentToastLabel): string {
  const name = label.quantity === 1 ? label.singular : label.plural;
  return `+${label.quantity} ${name}`;
}

/** Libellés courts et stables utilisés par les notifications de partie. */
export const TOAST_LABELS = {
  damage: (amount = 1): string => `−${amount} PV`,
  healing: (amount = 1): string => `+${amount} PV`,
  lifeMax: (): string => 'PV au max',
  key: (): string => formatGain(EQUIPMENT_TOAST_LABELS['key']),
  victory: (): string => 'Victoire !',
  defeat: (): string => '−1 PV',
  draw: (): string => 'Égalité',
  cursed: (): string => 'Malédiction',
  treasure: (quantity = 1): string => formatGain({ quantity, singular: 'Trésor', plural: 'Trésors' }),
  equipment: (id: string): string => formatGain(EQUIPMENT_TOAST_LABELS[id] ?? {
    quantity: 1,
    singular: 'Équipement',
    plural: 'Équipements',
  }),
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
  private readonly queueLimit = 8;

  readonly current = signal<ToastMessage | null>(null);
  readonly isDismissing = signal(false);
  readonly history = signal<readonly ToastMessage[]>([]);
  private readonly queue: ToastMessage[] = [];
  private nextId = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private fadeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(@Optional() private readonly audioService?: AudioService) {}

  show(text: string, tone: ToastTone = 'info', target?: ToastTarget, options: ToastOptions = {}): void {
    const message: ToastMessage = {
      id: ++this.nextId,
      text,
      tone,
      eventType: options.eventType ?? 'info',
      heroId: options.heroId ?? null,
      icon: options.icon,
      duration: options.duration ?? this.durationFor(text),
      audioCue: options.audioCue ?? null,
      target,
      context: options.context ?? 'general',
      priority: options.priority ?? 'normal',
    };

    // Un ancien résultat de combat ne doit jamais survivre au démarrage
    // d'une nouvelle séquence de combat.
    if (message.context === 'combat') this.removeQueuedContext('combat');

    if (message.context === 'combat') {
      this.displayCritical(message);
      return;
    }

    if (this.current()) {
      if (this.queue.some(item => item.text === text) || this.current()?.text === text) return;
      this.addToHistory(message);
      this.enqueue(message);
      return;
    }
    this.addToHistory(message);
    this.display(message);
  }

  /** Invalide les notifications d'un contexte devenu obsolète. */
  cancelContext(context: ToastContext): void {
    this.removeQueuedContext(context);
    if (this.current()?.context !== context) return;

    this.clearCurrentTimers();
    this.current.set(null);
    this.isDismissing.set(false);
    this.displayNextQueued();
  }

  /** Réinitialise les événements affichés pour une nouvelle partie. */
  clearHistory(): void {
    this.history.set([]);
  }

  dismiss(): void {
    if (!this.current() || this.isDismissing()) return;

    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.isDismissing.set(true);
    this.fadeTimer = setTimeout(() => this.finishDismissal(), this.toastFadeDuration);
  }

  private display(message: ToastMessage): void {
    this.current.set(message);
    this.schedule(message);
    if (message.audioCue) this.audioService?.play(message.audioCue);
  }

  /** Affiche immédiatement un événement critique, sans attendre la FIFO. */
  private displayCritical(message: ToastMessage): void {
    const displaced = this.current();
    if (displaced) {
      if (displaced.priority === 'important' && displaced.context !== 'combat') {
        this.enqueue(displaced);
      }
      this.clearCurrentTimers();
      this.current.set(null);
      this.isDismissing.set(false);
    }
    this.addToHistory(message);
    this.display(message);
  }

  private enqueue(message: ToastMessage): void {
    if (this.queue.length >= this.queueLimit) {
      const normalIndex = this.queue.findIndex(item => item.priority === 'normal');
      this.queue.splice(normalIndex >= 0 ? normalIndex : 0, 1);
    }
    this.queue.push(message);
  }

  private removeQueuedContext(context: ToastContext): void {
    for (let index = this.queue.length - 1; index >= 0; index--) {
      if (this.queue[index]?.context === context) this.queue.splice(index, 1);
    }
  }

  private clearCurrentTimers(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    if (this.fadeTimer !== null) clearTimeout(this.fadeTimer);
    this.timer = null;
    this.fadeTimer = null;
  }

  private displayNextQueued(): void {
    const next = this.queue.shift() ?? null;
    if (next) this.display(next);
  }

  private addToHistory(message: ToastMessage): void {
    this.history.update(history => [...history, message].slice(-this.historyLimit));
  }

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

  private finishDismissal(): void {
    this.fadeTimer = null;
    this.isDismissing.set(false);
    if (this.queue.length > 0) this.displayNextQueued();
    else this.current.set(null);
  }
}
