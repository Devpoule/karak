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
import { AudioService } from '../../services/audio.service';

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
    private readonly audioService: AudioService,
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      this.returnContext = params.get('from') === 'game' ? 'game' : 'home';
      if (this.returnContext === 'home') this.audioService.playHomeMusic();
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

  selectHero(hero: HeroDefinition): void {
    this.selectedHero = hero;
  }

  selectSection(section: 'universe' | 'heroes' | 'bestiary' | 'rules'): void { this.section = section; }
  selectMonster(monster: BestiaryEntry): void { this.selectedMonster = monster; }
  monsterDefinition(monster: BestiaryEntry): MonsterTokenDefinition | null {
    const definition = getTokenDefinition(monster.tokenId);
    return definition?.kind === 'monster' ? definition : null;
  }
  originLabel(origin: 'base' | 'regent'): string { return contentOrigin(origin).name; }

  /** Ferme le Codex lorsque l'utilisateur clique dans le décor extérieur. */
  onPageClick(event: MouseEvent): void {
    const target = event.target;
    if (target === event.currentTarget || (target instanceof HTMLElement && target.classList.contains('codex-page__atmosphere'))) {
      this.goBack();
    }
  }

  goBack(): void {
    void this.router.navigateByUrl(this.returnContext === 'game' ? '/play' : '/');
  }
}
