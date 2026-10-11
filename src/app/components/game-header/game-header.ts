import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { signal } from '@angular/core';
import { HERO_DEFINITIONS } from '../../data/hero-definitions';
import { HeroDefinition } from '../../models/hero';

@Component({
  imports: [RouterLink],
  selector: 'app-game-header',
  styleUrl: './game-header.scss',
  templateUrl: './game-header.html',
})
export class GameHeader {
  @Input() context: 'game' | 'rules' = 'game';
  @Input() showHeroGlossary = false;
  readonly heroes = HERO_DEFINITIONS;
  readonly selectedHero = signal<HeroDefinition | null>(null);
  readonly heroGlossaryOpen = signal(false);

  selectHero(hero: HeroDefinition): void {
    this.selectedHero.set(hero);
  }

  toggleHeroGlossary(): void {
    this.heroGlossaryOpen.update(open => !open);
    if (!this.heroGlossaryOpen()) this.selectedHero.set(null);
  }

  closeHeroDetails(): void {
    this.selectedHero.set(null);
  }
}
