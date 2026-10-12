import { Component } from '@angular/core';
import { Location } from '@angular/common';

import { HERO_DEFINITIONS } from '../../data/hero-definitions';
import { HeroDefinition } from '../../models/hero';
import { contentOrigin } from '../../models/content-origin';
import { MonsterTokenDefinition } from '../../models/token';
import { getTokenDefinition } from '../../data/token-definitions';
import { CODEX_BESTIARY, BestiaryEntry } from '../../data/codex-bestiary';
import { CODEX_RULE_SECTIONS } from '../../data/codex-rules';

/** Encyclopédie dédiée au lore des héros de Karak. */
@Component({
  imports: [],
  selector: 'app-codex',
  templateUrl: './codex.html',
  styleUrl: './codex.scss',
})
export class Codex {
  readonly heroes = HERO_DEFINITIONS;
  readonly bestiary = CODEX_BESTIARY;
  readonly rules = CODEX_RULE_SECTIONS;
  section: 'heroes' | 'bestiary' | 'rules' = 'heroes';
  selectedHero = this.heroes[0];
  selectedMonster = this.bestiary[0];

  constructor(private readonly location: Location) {}

  selectHero(hero: HeroDefinition): void {
    this.selectedHero = hero;
  }

  selectSection(section: 'heroes' | 'bestiary' | 'rules'): void { this.section = section; }
  selectMonster(monster: BestiaryEntry): void { this.selectedMonster = monster; }
  monsterDefinition(monster: BestiaryEntry): MonsterTokenDefinition | null {
    const definition = getTokenDefinition(monster.tokenId);
    return definition?.kind === 'monster' ? definition : null;
  }
  originLabel(origin: 'base' | 'regent'): string { return contentOrigin(origin).name; }

  goBack(): void {
    this.location.back();
  }
}
