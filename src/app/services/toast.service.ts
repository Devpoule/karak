import { Injectable, signal } from '@angular/core';

export type ToastTone = 'info' | 'success' | 'warning' | 'combat';
export interface ToastMessage { readonly id: number; readonly text: string; readonly tone: ToastTone; }

/** File unique de notifications informatives, non bloquantes. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly current = signal<ToastMessage | null>(null);
  private readonly queue: ToastMessage[] = [];
  private nextId = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;

  show(text: string, tone: ToastTone = 'info'): void {
    const message = { id: ++this.nextId, text, tone };
    if (this.current()) {
      if (this.queue.some(item => item.text === text) || this.current()?.text === text) return;
      this.queue.push(message);
      return;
    }
    this.display(message);
  }

  dismiss(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    const next = this.queue.shift() ?? null;
    this.current.set(next);
    if (next) this.schedule(next);
  }

  private display(message: ToastMessage): void {
    this.current.set(message);
    this.schedule(message);
  }

  private schedule(message: ToastMessage): void {
    this.timer = setTimeout(() => {
      if (this.current()?.id === message.id) this.dismiss();
    }, Math.min(5200, Math.max(2200, message.text.length * 42)));
  }
}
