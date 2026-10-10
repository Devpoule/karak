import { Component, DoCheck, Input, OnDestroy } from '@angular/core';
import { GameService } from '../../services/game.service';
import { PLAYER_INVENTORY_CAPACITY, PlayerInventory } from '../../models/inventory';
import { Player, PlayerPosition } from '../../models/player';
import { Equipment, KeyEquipment, SpellEquipment, WeaponEquipment } from '../../models/equipment';
import { PlayerService } from '../../services/player.service';
import { ExplorationService } from '../../services/exploration.service';

type InventoryGroup = 'weapons' | 'spells' | 'key';

interface DropSelection {
  readonly player: Player;
  readonly kind: Equipment['kind'];
  readonly index: number;
  readonly equipment: Equipment;
  readonly position: PlayerPosition;
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
