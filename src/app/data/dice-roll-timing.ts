/**
 * Cadencement commun des animations de lancer de dés.
 *
 * Les deux usages concernés sont le lancer de combat et la détermination
 * du premier joueur. Centraliser ces valeurs évite qu'un écran paraisse
 * artificiellement plus rapide que l'autre après une évolution visuelle.
 */
export const DICE_ROLL_DELAYS_MS = [
  70,
  70,
  80,
  90,
  105,
  125,
  150,
  180,
  215,
  260,
  315,
] as const;

/** Temps de stabilisation avant l'affichage des valeurs métier finales. */
export const DICE_RESULT_SETTLE_DELAY_MS = 180;

/** Temps de lecture du résultat avant le verdict ou l'étape suivante. */
export const DICE_RESULT_DISPLAY_DELAY_MS = 1050;
