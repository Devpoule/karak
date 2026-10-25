import { Component, DoCheck, effect, EventEmitter, inject, Input, OnDestroy, Output, signal } from '@angular/core';

import { getHeroDefinition, getHeroIdentityColor } from '../../data/hero-definitions';
import { HeroDefinition } from '../../models/hero';
import { Player } from '../../models/player';
import { PlayerService } from '../../services/player.service';
import { GameService } from '../../services/game.service';
import { HeroPowerCard } from '../hero-power-card/hero-power-card';

type CurseAnimation = '' | 'hero-panel__curse--appearing' | 'hero-panel__curse--disappearing';

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
  imports: [HeroPowerCard],
  selector: 'app-hero-panel',
  styleUrl: './hero-panel.scss',
  templateUrl: './hero-panel.html',
})
export class HeroPanel implements DoCheck, OnDestroy {
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
  @Input() playerIndex: number | null = null;
  /** Active le contour de la carte uniquement pour le joueur dont c'est le tour. */
  @Input() isActive = false;
  @Input() curseImagePath = '/assets/tokens/curse.png';
  readonly curseVisible = signal(false);
  readonly curseAnimation = signal<CurseAnimation>('');
  readonly substitutionFlipped = signal(false);
  private previousPlayer: Player | null = null;
  private previousCurseState = false;
  private dismissalTimer: ReturnType<typeof setTimeout> | null = null;
  private substitutionTimer: ReturnType<typeof setTimeout> | null = null;
  private substitutionPlayer: Player | null = null;
  private substitutionWaitingForAction = false;
  private observedSubstitutionRevision = 0;

  /** Synchronise l'animation avec les notifications de l'état métier. */
  private readonly curseStateEffect = effect(() => {
    this.playerService.curseRevision();
    this.syncCurseState(this.player?.isCursed === true);
  });

  /** Retourne le portrait sur une substitution terminée ou maintient le verso pendant l'action facultative. */
  private readonly substitutionEffect = effect(() => {
    const revision = this.gameService.xanrosSubstitutionRevision();
    const pendingAction = this.gameService.pendingXanrosSubstitutionAction();
    const followupResolutionPending = pendingAction !== null
      || this.gameService.pendingTreasure() !== null
      || this.gameService.pendingGroundEquipment() !== null
      || this.gameService.healingPortalSelection() !== null;
    const phase = this.gameService.phase();
    const activePlayerIndex = this.gameService.activePlayerIndex();

    if (phase !== 'playing' || (
      this.substitutionPlayer !== null
      && this.playerIndex !== activePlayerIndex
    )) {
      this.resetSubstitutionCard();
    }

    if (revision > this.observedSubstitutionRevision) {
      const player = this.gameService.lastXanrosSubstitutionPlayer();
      if (
        player === this.player
        && player?.heroId === 'xanros'
        && this.playerIndex === activePlayerIndex
      ) {
        this.showSubstitutionCard(pendingAction?.player === player);
      }
      this.observedSubstitutionRevision = revision;
    }

    if (
      this.substitutionPlayer === this.player
      && this.substitutionWaitingForAction
      && pendingAction === null
      && !followupResolutionPending
      && !this.gameService.turnTransitionPending()
    ) {
      this.substitutionWaitingForAction = false;
      this.scheduleSubstitutionReturn(0);
    }
  });

/** Gere ngDoCheck et applique les gardes necessaires avant mutation. */
  ngDoCheck(): void {
    this.syncCurseState(this.player?.isCursed === true);
    if (this.substitutionPlayer !== null && this.substitutionPlayer !== this.player) {
      this.resetSubstitutionCard();
    }
  }

/** Gere syncCurseState et applique les gardes necessaires avant mutation. */
  private syncCurseState(cursed: boolean): void {
    if (this.player !== this.previousPlayer) {
      this.previousPlayer = this.player;
      this.previousCurseState = cursed;
      this.curseVisible.set(cursed);
      this.curseAnimation.set('');
      return;
    }
    if (cursed === this.previousCurseState) return;
    this.previousCurseState = cursed;
    if (this.dismissalTimer) clearTimeout(this.dismissalTimer);
    this.curseAnimation.set(cursed ? 'hero-panel__curse--appearing' : 'hero-panel__curse--disappearing');
    this.curseVisible.set(true);
    if (!cursed) {
      this.dismissalTimer = setTimeout(() => {
        this.curseVisible.set(false);
        this.curseAnimation.set('');
        this.dismissalTimer = null;
      }, 700);
    }
  }

  /** Évite qu'une minuterie de dissipation survive à la destruction de la fiche. */
  ngOnDestroy(): void {
    this.curseStateEffect.destroy();
    this.substitutionEffect.destroy();
    if (this.dismissalTimer) {
      clearTimeout(this.dismissalTimer);
      this.dismissalTimer = null;
    }
    if (this.substitutionTimer) {
      clearTimeout(this.substitutionTimer);
      this.substitutionTimer = null;
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

  get heroColor(): string {
    return getHeroIdentityColor(this.player?.heroId);
  }

  get substitutionPower() {
    return this.heroDefinition?.powers.find(power => power.id === 'substitution') ?? null;
  }

  get substitutionMessage(): string {
    return this.substitutionWaitingForAction
      ? 'Position échangée. Choisissez une action.'
      : 'Xanros a changé de position.';
  }

  get isHealingPortalTarget(): boolean {
    return this.gameService.healingPortalSelection()?.target === this.player;
  }

  private showSubstitutionCard(waitingForAction: boolean): void {
    if (this.substitutionTimer) clearTimeout(this.substitutionTimer);
    this.substitutionTimer = null;
    this.substitutionPlayer = this.player;
    this.substitutionWaitingForAction = waitingForAction;
    this.substitutionFlipped.set(true);
    if (!waitingForAction) this.scheduleSubstitutionReturn(2500);
  }

  private scheduleSubstitutionReturn(delay: number): void {
    if (this.substitutionTimer) clearTimeout(this.substitutionTimer);
    this.substitutionTimer = setTimeout(() => {
      this.substitutionFlipped.set(false);
      this.substitutionPlayer = null;
      this.substitutionWaitingForAction = false;
      this.substitutionTimer = null;
    }, delay);
  }

  private resetSubstitutionCard(): void {
    if (this.substitutionTimer) clearTimeout(this.substitutionTimer);
    this.substitutionTimer = null;
    this.substitutionFlipped.set(false);
    this.substitutionPlayer = null;
    this.substitutionWaitingForAction = false;
  }

/** Gere openBiography et applique les gardes necessaires avant mutation. */
  openBiography(): void {
    if (this.gameService.healingPortalSelection() && this.player) {
      this.gameService.selectHealingPortalTarget(this.player);
      return;
    }
    this.portraitClicked.emit();
  }
}
