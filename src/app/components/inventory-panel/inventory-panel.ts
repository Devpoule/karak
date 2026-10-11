import { Component, DoCheck, Input, OnDestroy } from '@angular/core';
import { GameService } from '../../services/game.service';
import { PLAYER_INVENTORY_CAPACITY, PlayerInventory } from '../../models/inventory';
import { Player, PlayerPosition } from '../../models/player';
import { PlacedTile } from '../../models/tile';
import { Equipment, KeyEquipment, SpellEquipment, WeaponEquipment } from '../../models/equipment';
import { PlayerService } from '../../services/player.service';
import { ExplorationService } from '../../services/exploration.service';
import { getHeroDefinition } from '../../data/hero-definitions';

type InventoryGroup = 'weapons' | 'spells' | 'key';

interface DropSelection {
  readonly player: Player;
  readonly kind: Equipment['kind'];
  readonly index: number;
  readonly equipment: Equipment;
  readonly position: PlayerPosition;
}

interface HealingPortalSelection {
  readonly player: Player;
  readonly target: Player | null;
  readonly destination: PlacedTile | null;
}

/** Affichage de l’inventaire et demande de dépôt volontaire via GameService. */
@Component({
  imports: [],
  selector: 'app-inventory-panel',
  styleUrl: './inventory-panel.scss',
  templateUrl: './inventory-panel.html',
})
export class InventoryPanel implements DoCheck, OnDestroy {
  @Input() player: Player | null = null;

  constructor(
    private readonly gameService: GameService,
    private readonly playerService: PlayerService,
    private readonly explorationService: ExplorationService,
  ) {}

  private dropSelection: DropSelection | null = null;
  private pendingHealingPortalSelection: HealingPortalSelection | null = null;
  private healingPortalSelectionOpen = false;

  get selectedDrop(): DropSelection | null {
    if (this.dropSelection && !this.isSelectionCurrent(this.dropSelection)) {
      this.dropSelection = null;
    }
    return this.dropSelection;
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
    return !!this.player && this.player === this.gameService.activePlayer
      && this.player.controller === 'human' && this.gameService.phase() === 'playing'
      && !this.gameService.turnTransitionPending() && !this.gameService.hasPendingTileResolution
      && !this.explorationService.pendingTile
      && this.player.recoveryState === 'none'
      && this.player.inventory.spells.some(spell => spell?.effect === 'healing-portal')
      && this.gameService.getHealingFountains().length > 0;
  }

  get isHealingPortalSelectionOpen(): boolean {
    if (this.healingPortalSelectionOpen && !this.isHealingPortalSelectionCurrent()) {
      this.resetHealingPortalSelection();
    }
    return this.healingPortalSelectionOpen;
  }

  get healingPortalSelection(): HealingPortalSelection | null {
    return this.pendingHealingPortalSelection;
  }

  get healingTargets(): readonly Player[] {
    return this.playerService.players;
  }

  /** Nom lisible d'une cible du Portail, sans exposer son identifiant technique. */
  getPlayerDisplayName(player: Player, index?: number): string {
    const name = player.heroId ? getHeroDefinition(player.heroId)?.name : undefined;
    return name ?? `Héros ${(index ?? 0) + 1}`;
  }

  get healingFountains(): readonly PlacedTile[] {
    return this.gameService.getHealingFountains();
  }

  openHealingPortalSelection(): void {
    if (!this.canUseHealingPortal) return;
    this.healingPortalSelectionOpen = true;
    this.pendingHealingPortalSelection = { player: this.player!, target: null, destination: null };
  }

  selectHealingPortalTarget(target: Player): void {
    if (!this.isHealingPortalSelectionOpen || !this.healingTargets.includes(target)) return;
    if (!this.pendingHealingPortalSelection) return;
    this.pendingHealingPortalSelection = { ...this.pendingHealingPortalSelection, target };
  }

  selectHealingPortalDestination(destination: PlacedTile): void {
    if (!this.isHealingPortalSelectionOpen || !this.healingFountains.includes(destination)) return;
    if (!this.pendingHealingPortalSelection) return;
    this.pendingHealingPortalSelection = { ...this.pendingHealingPortalSelection, destination };
  }

  confirmHealingPortal(): void {
    const selection = this.healingPortalSelection;
    if (!selection?.target || !selection.destination || !this.isHealingPortalSelectionCurrent()) {
      this.resetHealingPortalSelection();
      return;
    }
    this.gameService.useHealingPortal(selection.target, selection.destination);
    this.resetHealingPortalSelection();
  }

  cancelHealingPortal(): void {
    this.resetHealingPortalSelection();
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
  highlightedGroups: InventoryGroup[] = [];

  private observedPlayer: Player | null = null;
  private observedItems: unknown[] = [];
  private feedbackTimer: ReturnType<typeof setTimeout> | null = null;

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
    if (this.healingPortalSelectionOpen && !this.isHealingPortalSelectionCurrent()) {
      this.resetHealingPortalSelection();
    }

    const current = [...this.weaponSlots, ...this.spellSlots, this.keyItem];

    if (this.player !== this.observedPlayer) {
      this.dropSelection = null;
      this.observedPlayer = this.player;
      this.observedItems = current;
      this.clearFeedback();
      return;
    }

    const previous = this.observedItems;
    if (current.length === previous.length && current.every((item, i) => item === previous[i])) {
      return;
    }

    this.observedItems = current;
    const added = (start: number, end: number): boolean =>
      current.slice(start, end).some(item => item != null && !previous.includes(item));

    const groups: InventoryGroup[] = [];
    const weaponEnd = this.capacity.weapons;
    const spellEnd = weaponEnd + this.capacity.spells;
    if (added(0, weaponEnd)) groups.push('weapons');
    if (added(weaponEnd, spellEnd)) groups.push('spells');
    if (added(spellEnd, spellEnd + 1)) groups.push('key');

    this.clearFeedback();
    if (!groups.length) return;

    this.highlightedGroups = groups;
    this.feedbackTimer = setTimeout(() => this.clearFeedback(), 1100);
  }

  isHighlighted(group: InventoryGroup): boolean {
    return this.highlightedGroups.includes(group);
  }

  private clearFeedback(): void {
    if (this.feedbackTimer !== null) {
      clearTimeout(this.feedbackTimer);
      this.feedbackTimer = null;
    }
    this.highlightedGroups = [];
  }

  ngOnDestroy(): void {
    this.clearFeedback();
    this.resetHealingPortalSelection();
  }

  private resetHealingPortalSelection(): void {
    this.pendingHealingPortalSelection = null;
    this.healingPortalSelectionOpen = false;
  }

  private isHealingPortalSelectionCurrent(): boolean {
    if (!this.healingPortalSelectionOpen || !this.player || this.player !== this.gameService.activePlayer) {
      return false;
    }
    if (!this.canUseHealingPortal) return false;
    const selection = this.pendingHealingPortalSelection;
    if (!selection) return true;
    return (!selection.target || this.healingTargets.includes(selection.target))
      && (!selection.destination || this.healingFountains.includes(selection.destination));
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
