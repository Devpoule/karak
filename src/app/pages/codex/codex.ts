import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { HERO_DEFINITIONS } from '../../data/hero-definitions';
import { HeroDefinition } from '../../models/hero';
import { contentOrigin } from '../../models/content-origin';
import { MonsterTokenDefinition } from '../../models/token';
import { getTokenDefinition } from '../../data/token-definitions';
import { CODEX_BESTIARY, BestiaryEntry } from '../../data/codex-bestiary';
import { CODEX_RULE_SECTIONS } from '../../data/codex-rules';
import { CODEX_LORE } from '../../data/codex-lore';
import { ScrollTopButton } from '../../components/scroll-top-button/scroll-top-button';

/** Encyclopédie dédiée au lore des héros de Karak. */
@Component({
  imports: [ScrollTopButton],
  selector: 'app-codex',
  templateUrl: './codex.html',
  styleUrl: './codex.scss',
})
export class Codex implements OnInit {
  readonly heroes = HERO_DEFINITIONS;
  readonly bestiary = CODEX_BESTIARY;
  readonly rules = CODEX_RULE_SECTIONS;
  readonly lore = CODEX_LORE;
  /** Origine explicite du Codex, utilisée pour un retour déterministe. */
  returnContext: 'home' | 'game' = 'home';
  section: 'universe' | 'heroes' | 'bestiary' | 'rules' = 'universe';
  selectedHero = this.heroes[0];
  selectedMonster = this.bestiary[0];

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
  ) {}

/** Gere ngOnInit et applique les gardes necessaires avant mutation. */
  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      this.returnContext = params.get('from') === 'game' ? 'game' : 'home';
    });

    this.route.fragment.subscribe(fragment => {
      if (!fragment) return;
      this.section = fragment === 'heroes' || fragment === 'bestiary'
        ? fragment
        : fragment === 'rules' || fragment.startsWith('rules-')
          ? 'rules'
          : 'universe';
      setTimeout(() => document.getElementById(fragment)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    });
  }

/** Gere selectHero et applique les gardes necessaires avant mutation. */
  selectHero(hero: HeroDefinition): void {
    this.selectedHero = hero;
  }

/** Gere selectSection et applique les gardes necessaires avant mutation. */
  selectSection(section: 'universe' | 'heroes' | 'bestiary' | 'rules'): void { this.section = section; }
/** Gere selectMonster et applique les gardes necessaires avant mutation. */
  selectMonster(monster: BestiaryEntry): void { this.selectedMonster = monster; }
/** Gere monsterDefinition et applique les gardes necessaires avant mutation. */
  monsterDefinition(monster: BestiaryEntry): MonsterTokenDefinition | null {
    const definition = getTokenDefinition(monster.tokenId);
    return definition?.kind === 'monster' ? definition : null;
  }
/** Gere originLabel et applique les gardes necessaires avant mutation. */
  originLabel(origin: 'base' | 'regent'): string { return contentOrigin(origin).name; }

/** Gere goBack et applique les gardes necessaires avant mutation. */
  goBack(): void {
    void this.router.navigateByUrl(this.returnContext === 'game' ? '/play' : '/');
  }
}
