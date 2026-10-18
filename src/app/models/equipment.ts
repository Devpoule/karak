/** Catégories d'objets équipables dans Karak. */
export type EquipmentKind = 'weapon' | 'spell' | 'key';

/** Contrat de donnees BaseEquipment utilise par le domaine ou l interface. */
interface BaseEquipment {
  readonly id: string;
  readonly name: string;
  readonly image: string;
  readonly kind: EquipmentKind;
}

/** Contrat de donnees WeaponEquipment utilise par le domaine ou l interface. */
export interface WeaponEquipment extends BaseEquipment {
  readonly kind: 'weapon';
  readonly attackBonus: number;
}

/** Contrat de donnees SpellEquipment utilise par le domaine ou l interface. */
export interface SpellEquipment extends BaseEquipment {
  readonly kind: 'spell';
  readonly effect: 'magic-attack' | 'healing-portal';
}

/** Contrat de donnees KeyEquipment utilise par le domaine ou l interface. */
export interface KeyEquipment extends BaseEquipment {
  readonly kind: 'key';
}

export type Equipment = WeaponEquipment | SpellEquipment | KeyEquipment;
