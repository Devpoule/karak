import { Component, DoCheck, Input, OnDestroy } from '@angular/core';

import {
  PLAYER_INVENTORY_CAPACITY,
  PlayerInventory,
} from '../../models/inventory';
import { Player } from '../../models/player';

type InventoryGroup = 'weapons' | 'spells' | 'key';

/** Inventaire visuel : détecte les acquisitions sans toucher aux règles du jeu. */
@Component({
  imports: [],
  selector: 'app-inventory-panel',
  styleUrl: './inventory-panel.scss',
  templateUrl: './inventory-panel.html',
})
export class InventoryPanel implements DoCheck, OnDestroy {
  @Input() player: Player | null = null;

  readonly capacity = PLAYER_INVENTORY_CAPACITY;
  highlightedGroups: InventoryGroup[] = [];

  private observedPlayer: Player | null = null;
  private observedItems: unknown[] = [];
  private feedbackTimer: ReturnType<typeof setTimeout> | null = null;

  get inventory(): PlayerInventory | null {
    return this.player?.inventory ?? null;
  }

  get weaponSlots(): unknown[] {
    return this.inventory?.weapons ?? Array.from({ length: this.capacity.weapons }, () => null);
  }

  get spellSlots(): unknown[] {
    return this.inventory?.spells ?? Array.from({ length: this.capacity.spells }, () => null);
  }

  get hasKey(): boolean {
    return this.inventory?.key !== null && this.inventory?.key !== undefined;
  }

  ngDoCheck(): void {
    const current = [...this.weaponSlots, ...this.spellSlots, this.inventory?.key ?? null];

    // L'ouverture d'une autre fiche ne constitue pas une acquisition.
    if (this.player !== this.observedPlayer) {
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
