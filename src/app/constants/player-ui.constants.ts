/**
 * Libellé stable des joueurs.
 *
 * Le numéro J1 à J5 reste une identité de position dans la partie.
 * La couleur d'identité est désormais portée par HeroDefinition.
 */
export const PLAYER_UI_CONFIG = [
  {
    label: 'J1',
  },
  {
    label: 'J2',
  },
  {
    label: 'J3',
  },
  {
    label: 'J4',
  },
  {
    label: 'J5',
  },
] as const;


/**
 * Libellé d'un joueur.
 */
export type PlayerUiConfig =
  (typeof PLAYER_UI_CONFIG)[number];


/**
 * Retourne le libellé correspondant
 * à l'index du joueur.
 *
 * Les joueurs utilisent des index compris entre 0 et 4 :
 *
 * 0 -> J1
 * 1 -> J2
 * 2 -> J3
 * 3 -> J4
 * 4 -> J5
 */
export function getPlayerUiConfig(
  playerIndex: number,
): PlayerUiConfig {
  return PLAYER_UI_CONFIG[playerIndex];
}
