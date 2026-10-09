import { Component, DoCheck, Input, OnDestroy } from '@angular/core';
import { GameService } from '../../services/game.service';
import { PLAYER_INVENTORY_CAPACITY, PlayerInventory } from '../../models/inventory';
import { Player } from '../../models/player';
import { Equipment, KeyEquipment, SpellEquipment, WeaponEquipment } from '../../models/equipment';

type InventoryGroup = 'weapons' | 'spells' | 'key';

/** Affichage de l’inventaire et demande de dépôt volontaire via GameService. */
@Component({
  imports: [],
  selector: 'app-inventory-panel',
  styleUrl: './inventory-panel.scss',
  templateUrl: './inventory-panel.html',
})
export class InventoryPanel implements DoCheck, OnDestroy {
  @Input() player: Player | null = null;

  constructor(private readonly gameService: GameService) {}

  selectedDrop: { kind: Equipment['kind']; index: number; name: string } | null = null;

  get canDropEquipment(): boolean {
    return !!this.player && this.player === this.gameService.activePlayer
      && this.player.controller === 'human' && this.gameService.phase() === 'playing'
      && !this.gameService.turnTransitionPending() && !this.gameService.hasPendingTileResolution;
  }

  selectDrop(kind: Equipment['kind'], index: number, equipment: Equipment): void {
    if (!this.canDropEquipment) return;
    this.selectedDrop = { kind, index, name: equipment.name };
  }

  cancelDrop(): void {
    this.selectedDrop = null;
  }

  confirmDrop(): void {
    const selected = this.selectedDrop;
    if (!selected || !this.player || !this.canDropEquipment) return;
    if (this.gameService.dropInventoryEquipment(this.player, selected.kind, selected.index)) {
      this.selectedDrop = null;
    }
  }

  readonly capacity = PLAYER_INVENTORY_CAPACITY;
  highlightedGroups: InventoryGroup[] = [];

  private observedPlayer: Player | null = null;
  private observedItems: unknown[] = [];
  private feedbackTimer: ReturnType<typeof setTimeout> | null = null;

  get inventory(): PlayerInventory | null {
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
    const current = [...this.weaponSlots, ...this.spellSlots, this.keyItem];

    if (this.player !== this.observedPlayer) {
      this.selectedDrop = null;
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
}
