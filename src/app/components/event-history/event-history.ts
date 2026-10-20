import { Component, HostListener, computed, signal } from '@angular/core';

import { ToastService } from '../../services/toast.service';

/** Journal consultatif des notifications déjà produites pendant la partie. */
@Component({
  selector: 'app-event-history',
  imports: [],
  templateUrl: './event-history.html',
  styleUrl: './event-history.scss',
})
export class EventHistory {
  readonly isOpen = signal(false);
  readonly entries = computed(() => [...this.toastService.history()].reverse());

  constructor(readonly toastService: ToastService) {}

  toggle(): void {
    this.isOpen.update((isOpen) => !isOpen);
  }

  close(): void {
    this.isOpen.set(false);
  }

  @HostListener('document:keydown.escape', ['$event'])
  closeOnEscape(event: Event): void {
    if (!this.isOpen()) return;
    event.preventDefault();
    this.close();
  }
}
