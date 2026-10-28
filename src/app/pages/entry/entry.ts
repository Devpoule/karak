import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AudioService } from '../../services/audio.service';

/** Écran d'entrée immersif, distinct du conteneur de partie active. */
@Component({
  selector: 'app-entry',
  imports: [RouterLink],
  templateUrl: './entry.html',
  styleUrl: './entry.scss',
})
export class Entry implements OnInit {
  constructor(private readonly audioService: AudioService) {}

  ngOnInit(): void {
    this.audioService.playHomeMusic();
  }
}
