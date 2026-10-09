/** Catégories d'objets équipables dans Karak. */
export type EquipmentKind = 'weapon' | 'spell' | 'key';

interface BaseEquipment {
  readonly id: string;
  readonly name: string;
  readonly image: string;
  readonly kind: EquipmentKind;
}

export interface WeaponEquipment extends BaseEquipment {
  readonly kind: 'weapon';
  readonly attackBonus: number;
}

export interface SpellEquipment extends BaseEquipment {
  readonly kind: 'spell';
  readonly effect: 'magic-attack' | 'healing-portal';
}

export interface KeyEquipment extends BaseEquipment {
  readonly kind: 'key';
}

export type Equipment = WeaponEquipment | SpellEquipment | KeyEquipment;
