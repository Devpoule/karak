import { KeyEquipment, SpellEquipment, WeaponEquipment } from './equipment';

export type InventorySlot<TItem = never> = TItem | null;

export interface PlayerInventory {
  weapons: InventorySlot<WeaponEquipment>[];
  spells: InventorySlot<SpellEquipment>[];
  key: InventorySlot<KeyEquipment>;
}

export const PLAYER_INVENTORY_CAPACITY = {
  weapons: 2,
  spells: 3,
  key: 1,
} as const;

export function createEmptyPlayerInventory(): PlayerInventory {
  return {
    weapons: Array.from({ length: PLAYER_INVENTORY_CAPACITY.weapons }, () => null),
    spells: Array.from({ length: PLAYER_INVENTORY_CAPACITY.spells }, () => null),
    key: null,
  };
}
