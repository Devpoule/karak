import { Component, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild } from '@angular/core';
import { AudioPreference, ContrastPreference, MotionPreference, SettingsService, TextScale } from '../../services/settings.service';

/** Panneau de préférences de confort partagé par l'accueil et la partie. */
@Component({
  selector: 'app-settings-panel',
  templateUrl: './settings-panel.html',
  styleUrl: './settings-panel.scss',
})
export class SettingsPanel {
  @Input() compact = false;
  @Input() disabled = false;
  @Output() readonly closed = new EventEmitter<void>();
  @ViewChild('dialogElement') private dialogElement?: ElementRef<HTMLElement>;

  isOpen = false;
  private previouslyFocusedElement: HTMLElement | null = null;

  constructor(readonly settings: SettingsService) {}

  open(): void {
    if (this.disabled) return;
    this.previouslyFocusedElement = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    this.isOpen = true;
    queueMicrotask(() => this.dialogElement?.nativeElement.focus());
  }

  close(): void {
    this.isOpen = false;
    const focusTarget = this.previouslyFocusedElement;
    this.previouslyFocusedElement = null;
    queueMicrotask(() => focusTarget?.focus());
    this.closed.emit();
  }

  setMotionPreference(preference: MotionPreference): void {
    this.settings.setMotionPreference(preference);
  }

  setTextScale(scale: TextScale): void {
    this.settings.setTextScale(scale);
  }

  setContrastPreference(preference: ContrastPreference): void {
    this.settings.setContrastPreference(preference);
  }

  setAudioPreference(preference: AudioPreference): void {
    this.settings.setAudioPreference(preference);
  }

  reset(): void {
    this.settings.reset();
  }

  @HostListener('document:keydown.escape', ['$event'])
  closeOnEscape(event: Event): void {
    if (!this.isOpen) return;
    event.preventDefault();
    event.stopPropagation();
    this.close();
  }
}
