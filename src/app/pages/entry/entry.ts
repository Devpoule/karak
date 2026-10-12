import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Écran d'entrée immersif, distinct du conteneur de partie active. */
@Component({
  selector: 'app-entry',
  imports: [RouterLink],
  templateUrl: './entry.html',
  styleUrl: './entry.scss',
})
export class Entry {}
