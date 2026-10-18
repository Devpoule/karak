import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

import { getHeroDefinition } from '../../data/hero-definitions';
import { HeroPowerId } from '../../models/hero';
import { Player } from '../../models/player';
import { LifePanel } from '../life-panel/life-panel';
import { HeroPanel } from '../hero-panel/hero-panel';
import { InventoryPanel } from '../inventory-panel/inventory-panel';
import { TreasurePanel } from '../treasure-panel/treasure-panel';
import { CodexDialog } from '../codex-dialog/codex-dialog';

/**
 * Position de la fiche joueur dans l'interface.
 *
 * Cette information permet notamment de différencier
 * les joueurs affichés à gauche et à droite.
 */
export type PlayerSide = 'left' | 'right';

export interface PowerSelection {
  powerId: HeroPowerId | null;
  trigger: HTMLElement | null;
}


/**
 * Fiche visuelle d'un joueur.
 *
 * Elle regroupe les différents panneaux qui composent
 * l'interface personnelle d'un joueur :
 *
 * - points de vie ;
 * - héros ;
 * - inventaire ;
 * - trésors.
 *
 * Le composant ne contient aucune logique de jeu.
 * Il reçoit les informations préparées par le HUD et
 * les transmet aux panneaux concernés.
 */
@Component({
  selector: 'app-player-sidebar',
  imports: [
    LifePanel,
    HeroPanel,
    InventoryPanel,
    TreasurePanel,
    CodexDialog,
  ],
  templateUrl: './player-sidebar.html',
  styleUrl: './player-sidebar.scss',
})
export class PlayerSidebar {
  selectedPowerId: HeroPowerId | null = null;
  biographyOpen = false;
  curseDialogOpen = false;

  // ==========================================================
  // CONFIGURATION DU JOUEUR
  // ==========================================================

  /**
   * Côté occupé par la fiche dans l'interface.
   */
  @Input({ required: true }) side!: PlayerSide;


  /**
   * Joueur représenté par la fiche.
   */
  @Input() player: Player | null = null;

  /**
   * Index réel du joueur dans la partie, utilisé pour afficher J1...J5.
   */
  @Input() playerIndex: number | null = null;

  /**
   * Indique si le joueur représenté est celui dont c'est le tour.
   */
  @Input() isActive = false;

  /**
   * Demande au HUD d'appliquer le même comportement que la languette basse.
   */
  @Output() playerTabClicked = new EventEmitter<void>();

  /** Informe le HUD de la sélection d’un pouvoir à consulter. */
  @Output() powerSelected = new EventEmitter<PowerSelection>();


  // ==========================================================
  // PANNEAUX VISIBLES
  // ==========================================================

  /**
   * Affiche les panneaux liés au personnage :
   * points de vie et héros.
   */
  @Input() showPlayer = true;


  /**
   * Affiche le panneau d'inventaire.
   */
  @Input() showInventory = true;

  get heroDefinition() {
    return this.player?.heroId ? getHeroDefinition(this.player.heroId) ?? null : null;
  }

/** Gere togglePower et applique les gardes necessaires avant mutation. */
  togglePower(powerId: HeroPowerId, event?: Event): void {
    if (this.player?.isCursed) return;
    this.biographyOpen = false;
    this.selectedPowerId = this.selectedPowerId === powerId ? null : powerId;
    this.powerSelected.emit({
      powerId: this.selectedPowerId,
      trigger: event?.currentTarget instanceof HTMLElement ? event.currentTarget : null,
    });
  }

/** Gere toggleBiography et applique les gardes necessaires avant mutation. */
  toggleBiography(): void {
    this.selectedPowerId = null;
    this.biographyOpen = !this.biographyOpen;
  }

/** Gere openCurseDialog et applique les gardes necessaires avant mutation. */
  openCurseDialog(): void {
    this.selectedPowerId = null;
    this.biographyOpen = false;
    this.curseDialogOpen = true;
  }

/** Gere closeDetails et applique les gardes necessaires avant mutation. */
  closeDetails(): void {
    this.selectedPowerId = null;
    this.biographyOpen = false;
    this.curseDialogOpen = false;
    this.powerSelected.emit({ powerId: null, trigger: null });
  }

/** Gere powerImage et applique les gardes necessaires avant mutation. */
  powerImage(powerIndex: number): string {
    const hero = this.heroDefinition;
    const powerKind = powerIndex === 0 ? 'primary' : 'secondary';
    return hero
      ? `/assets/heroes/${hero.id}/character-${powerKind}-power.png`
      : '';
  }

/** Gere onEscape et applique les gardes necessaires avant mutation. */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeDetails();
  }

  get selectedPower() {
    return this.heroDefinition?.powers.find(power => power.id === this.selectedPowerId) ?? null;
  }


}
