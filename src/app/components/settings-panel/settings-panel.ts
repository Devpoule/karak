import { Component, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild } from '@angular/core';
import { AudioVolume, ContrastPreference, MotionPreference, SettingsService, TextScale } from '../../services/settings.service';
import { AudioService } from '../../services/audio.service';

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

  constructor(
    readonly settings: SettingsService,
    private readonly audioService: AudioService,
  ) {}

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

  setMusicVolume(volume: AudioVolume): void {
    this.settings.setMusicVolume(volume);
    this.audioService.syncAudioSettings();
  }

  setSfxVolume(volume: AudioVolume): void {
    this.settings.setSfxVolume(volume);
    this.audioService.syncAudioSettings();
  }

  adjustMusicVolume(delta: number): void {
    this.setMusicVolume(this.settings.musicVolume() + delta as AudioVolume);
  }

  adjustSfxVolume(delta: number): void {
    this.setSfxVolume(this.settings.sfxVolume() + delta as AudioVolume);
  }

  getVolumeLabel(volume: AudioVolume): string {
    return volume === 0 ? 'Coupé' : `${volume}/5`;
  }

  reset(): void {
    this.settings.reset();
    this.audioService.syncAudioSettings();
  }

  @HostListener('document:keydown.escape', ['$event'])
  closeOnEscape(event: Event): void {
    if (!this.isOpen) return;
    event.preventDefault();
    event.stopPropagation();
    this.close();
  }
}
