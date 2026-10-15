import { Component, DoCheck, EventEmitter, inject, Input, Output } from '@angular/core';

import { getHeroDefinition } from '../../data/hero-definitions';
import { HeroDefinition } from '../../models/hero';
import { Player } from '../../models/player';
import { PlayerService } from '../../services/player.service';
import { GameService } from '../../services/game.service';


/**
 * Affiche le plateau visuel réservé au héros d'un joueur.
 *
 * Le composant conserve l'asset servant de support au héros,
 * mais l'identité affichée provient désormais du joueur actif.
 *
 * Il ne gère pas encore :
 *
 * - son pouvoir spécial ;
 * - les autres états du héros pendant la partie.
 *
 * Ces informations seront ajoutées lorsque le modèle des héros
 * et l'état des joueurs seront implémentés.
 */
@Component({
  imports: [],
  selector: 'app-hero-panel',
  styleUrl: './hero-panel.scss',
  templateUrl: './hero-panel.html',
})
export class HeroPanel implements DoCheck {
  private readonly playerService = inject(PlayerService);
  readonly gameService = inject(GameService);

  /** Côté d'affichage, utilisé pour placer le médaillon vers le centre du plateau. */
  @Input() side: 'left' | 'right' = 'left';

  /** Notifie la fiche latérale que le portrait doit ouvrir la biographie. */
  @Output() readonly portraitClicked = new EventEmitter<void>();
  /** Ouvre la fiche d'information dédiée à la malédiction. */
  @Output() readonly curseClicked = new EventEmitter<void>();

  /**
   * Joueur dont le héros est représenté.
   */
  @Input() player: Player | null = null;
  @Input() curseImagePath = '/assets/tokens/curse.png';
  curseVisible = false;
  curseAnimation = '';
  private previousPlayer: Player | null = null;
  private previousCurseState = false;
  private dismissalTimer: ReturnType<typeof setTimeout> | null = null;

  ngDoCheck(): void {
    const cursed = this.player?.isCursed === true;
    if (this.player !== this.previousPlayer) {
      this.previousPlayer = this.player;
      this.previousCurseState = cursed;
      this.curseVisible = cursed;
      this.curseAnimation = '';
      return;
    }
    if (cursed === this.previousCurseState) return;
    this.previousCurseState = cursed;
    if (this.dismissalTimer) clearTimeout(this.dismissalTimer);
    this.curseAnimation = cursed ? 'hero-panel__curse--appearing' : 'hero-panel__curse--disappearing';
    this.curseVisible = true;
    if (!cursed) {
      this.dismissalTimer = setTimeout(() => {
        this.curseVisible = false;
        this.curseAnimation = '';
      }, 700);
    }
  }

  get isCursed(): boolean {
    // Rend le médaillon dépendant de la notification métier de la malédiction.
    this.playerService.curseRevision();
    return this.player?.isCursed === true;
  }

  /**
   * Le voile reste actif pendant l'attente et le tour de récupération.
   * Il ne disparaît qu'une fois que le moteur libère réellement le héros.
   */
  get isUnconscious(): boolean {
    return this.player?.recoveryState !== undefined
      && this.player.recoveryState !== 'none';
  }

  get heroDefinition(): HeroDefinition | null {
    const heroId = this.player?.heroId;

    if (!heroId) {
      return null;
    }

    return (
      getHeroDefinition(heroId)
      ?? null
    );
  }

  get isHealingPortalTarget(): boolean {
    return this.gameService.healingPortalSelection()?.target === this.player;
  }

  openBiography(): void {
    if (this.gameService.healingPortalSelection() && this.player) {
      this.gameService.selectHealingPortalTarget(this.player);
      return;
    }
    this.portraitClicked.emit();
  }
}
