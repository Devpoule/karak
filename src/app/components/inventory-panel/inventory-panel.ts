import { Component, DoCheck, Input, OnDestroy } from '@angular/core';
import { GameService, HealingPortalSelection } from '../../services/game.service';
import { PLAYER_INVENTORY_CAPACITY, PlayerInventory } from '../../models/inventory';
import { Player, PlayerPosition } from '../../models/player';
import { PlacedTile } from '../../models/tile';
import { Equipment, KeyEquipment, SpellEquipment, WeaponEquipment } from '../../models/equipment';
import { PlayerService } from '../../services/player.service';
import { ExplorationService } from '../../services/exploration.service';
import { DecisionCard, DecisionCardAction } from '../decision-card/decision-card';

interface DropSelection {
  readonly player: Player;
  readonly kind: Equipment['kind'];
  readonly index: number;
  readonly equipment: Equipment;
  readonly position: PlayerPosition;
}

/** Affichage de l’inventaire et demande de dépôt volontaire via GameService. */
@Component({
  standalone: true,
  imports: [DecisionCard],
  selector: 'app-inventory-panel',
  styleUrl: './inventory-panel.scss',
  templateUrl: './inventory-panel.html',
})
export class InventoryPanel implements DoCheck, OnDestroy {
  @Input() player: Player | null = null;
  @Input() playerIndex: number | null = null;

  constructor(
    private readonly gameService: GameService,
    private readonly playerService: PlayerService,
    private readonly explorationService: ExplorationService,
  ) {}

  private dropSelection: DropSelection | null = null;

  get selectedDrop(): DropSelection | null {
    if (this.dropSelection && !this.isSelectionCurrent(this.dropSelection)) {
      this.dropSelection = null;
    }
    return this.dropSelection;
  }

  /** Actions de confirmation du dépôt volontaire. */
  get dropActions(): readonly DecisionCardAction[] {
    return [
      { label: 'Déposer', kind: 'primary', disabled: !this.canDropEquipment },
      { label: 'Annuler' },
    ];
  }

  /** Résout le choix de dépôt en réutilisant les gardes existantes. */
  resolveDropAction(index: number): void {
    if (index === 0) this.confirmDrop();
    else this.cancelDrop();
  }

  get canDropEquipment(): boolean {
    return !!this.player && this.player === this.gameService.activePlayer
      && this.player.controller === 'human' && this.gameService.phase() === 'playing'
      && !this.gameService.turnTransitionPending()
      && !this.gameService.hasPendingTileResolution
      && !this.explorationService.pendingTile;
  }

  selectDrop(kind: Equipment['kind'], index: number, equipment: Equipment): void {
    if (!this.canDropEquipment || !this.player?.position) return;
    this.dropSelection = {
      player: this.player,
      kind,
      index,
      equipment,
      position: { ...this.player.position },
    };
  }

  cancelDrop(): void {
    this.dropSelection = null;
  }

  get canUseHealingPortal(): boolean {
    return !!this.player && this.player === this.gameService.activePlayer && this.gameService.canUseHealingPortal;
  }

  get isHealingPortalSelectionOpen(): boolean {
    return this.gameService.healingPortalSelection() !== null;
  }

  get healingPortalSelection(): HealingPortalSelection | null {
    return this.gameService.healingPortalSelection();
  }

  openHealingPortalSelection(): void {
    if (!this.canUseHealingPortal) return;
    this.gameService.openHealingPortalSelection();
  }

  get healingPortalIndex(): number {
    return this.spellSlots.findIndex(spell => spell?.effect === 'healing-portal');
  }

  /** Conserve l'action de dépôt volontaire du portail, séparée de son usage. */
  dropHealingPortal(): void {
    const index = this.healingPortalIndex;
    const portal = index >= 0 ? this.spellSlots[index] : null;
    if (portal) this.selectDrop('spell', index, portal);
  }

  /** Ouvre le mode visuel du portail au lieu de proposer son dépôt au sol. */
  handleSpellClick(index: number, spell: SpellEquipment): void {
    if (spell.effect === 'healing-portal' && this.canUseHealingPortal) {
      this.cancelDrop();
      if (this.isHealingPortalSelectionOpen) {
        this.gameService.closeHealingPortalSelection();
        return;
      }
      this.openHealingPortalSelection();
      return;
    }
    this.selectDrop('spell', index, spell);
  }

  /** Compatibilité avec les tests et intégrations existantes ; l'UI utilise désormais les portraits. */
  selectHealingPortalTarget(target: Player): void {
    if (!this.isHealingPortalSelectionOpen) return;
    this.gameService.selectHealingPortalTarget(target);
  }

  /** Compatibilité avec les tests et intégrations existantes ; l'UI utilise désormais le plateau. */
  selectHealingPortalDestination(destination: PlacedTile): void {
    if (!this.isHealingPortalSelectionOpen) return;
    this.gameService.selectHealingPortalDestination(destination);
  }

  confirmHealingPortal(): void {
    const selection = this.healingPortalSelection;
    if (!selection?.target || !selection.destination || !this.isHealingPortalSelectionOpen) {
      this.gameService.closeHealingPortalSelection();
      return;
    }
    this.gameService.useHealingPortal(selection.target, selection.destination);
    this.gameService.closeHealingPortalSelection();
  }

  cancelHealingPortal(): void {
    this.gameService.closeHealingPortalSelection();
  }

  confirmDrop(): void {
    const selected = this.selectedDrop;
    if (!selected || !this.player || !this.isSelectionCurrent(selected)) {
      this.dropSelection = null;
      return;
    }
    if (this.gameService.dropInventoryEquipment(selected.player, selected.kind, selected.index)) {
      this.dropSelection = null;
    }
  }

  readonly capacity = PLAYER_INVENTORY_CAPACITY;
  readonly highlightedSlots = new Set<string>();

  private observedPlayer: Player | null = null;
  private observedAcquisitionRevision = 0;
  private readonly feedbackTimers = new Map<string, ReturnType<typeof setTimeout>>();

  get inventory(): PlayerInventory | null {
    // La lecture du signal lie le template aux mutations métier de l'inventaire.
    this.playerService.inventoryRevision();
    return this.player?.inventory ?? null;
  }

  get weaponSlots(): (WeaponEquipment | null)[] {
    return this.inventory?.weapons ?? Array.from({ length: this.capacity.weapons }, () => null);
  }

  get spellSlots(): (SpellEquipment | null)[] {
    return this.inventory?.spells ?? Array.from({ length: this.capacity.spells }, () => null);
  }

  get keyItem(): KeyEquipment | null {
    return this.inventory?.key ?? null;
  }

  get hasKey(): boolean {
    return this.keyItem !== null;
  }

  ngDoCheck(): void {
    if (this.dropSelection && !this.isSelectionCurrent(this.dropSelection)) {
      this.dropSelection = null;
    }

    if (this.player !== this.observedPlayer) {
      this.dropSelection = null;
      this.observedPlayer = this.player;
      this.observedAcquisitionRevision = this.playerService.lastEquipmentAcquisition()?.revision ?? 0;
      this.clearFeedback();
      return;
    }

    const acquisition = this.playerService.lastEquipmentAcquisition();
    if (!acquisition || acquisition.revision <= this.observedAcquisitionRevision) return;
    this.observedAcquisitionRevision = acquisition.revision;
    if (acquisition.player !== this.player) return;
    this.highlightSlot(`${acquisition.kind}-${acquisition.slotIndex}`);
  }

  isSlotHighlighted(kind: 'weapon' | 'spell' | 'key', index: number): boolean {
    return this.highlightedSlots.has(`${kind}-${index}`);
  }

  private highlightSlot(slotKey: string): void {
    this.clearSlotFeedback(slotKey);
    this.highlightedSlots.add(slotKey);
    this.feedbackTimers.set(slotKey, setTimeout(() => {
      this.highlightedSlots.delete(slotKey);
      this.feedbackTimers.delete(slotKey);
    }, 5500));
  }

  private clearSlotFeedback(slotKey: string): void {
    const timer = this.feedbackTimers.get(slotKey);
    if (timer !== undefined) clearTimeout(timer);
    this.feedbackTimers.delete(slotKey);
    this.highlightedSlots.delete(slotKey);
  }

  private clearFeedback(): void {
    this.feedbackTimers.forEach(timer => clearTimeout(timer));
    this.feedbackTimers.clear();
    this.highlightedSlots.clear();
  }

  ngOnDestroy(): void {
    this.clearFeedback();
    this.gameService.closeHealingPortalSelection();
  }

  /** Vérifie qu'une confirmation vise encore exactement le contexte sélectionné. */
  private isSelectionCurrent(selection: DropSelection): boolean {
    const player = this.player;
    if (!player || player !== selection.player || !player.position) return false;
    if (!this.canDropEquipment) return false;
    if (player.position.x !== selection.position.x || player.position.y !== selection.position.y) {
      return false;
    }

    const currentEquipment = this.getEquipmentAt(player, selection.kind, selection.index);
    return currentEquipment === selection.equipment;
  }

  private getEquipmentAt(
    player: Player,
    kind: Equipment['kind'],
    index: number,
  ): Equipment | null {
    if (kind === 'key') return index === 0 ? player.inventory.key : null;
    return player.inventory[kind === 'weapon' ? 'weapons' : 'spells'][index] ?? null;
  }
}
