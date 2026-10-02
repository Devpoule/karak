import { HeroId } from './hero';
import { Direction } from './tile';


/**
 * Position d'un joueur dans le donjon.
 *
 * Les coordonnées utilisent le même repère logique que les
 * tuiles placées dans DungeonService.
 *
 * La tuile de départ se trouve en (0, 0).
 */
export interface PlayerPosition {
  x: number;
  y: number;
}


/**
 * État minimal d'un joueur pendant une partie.
 *
 * Contrairement à HeroDefinition, qui décrit les propriétés
 * statiques d'un héros, Player contient les informations qui
 * peuvent évoluer au cours de la partie.
 *
 * Ce modèle sera enrichi progressivement lorsque les mécaniques
 * correspondantes seront réellement introduites.
 */
export interface Player {
  heroId: HeroId;

  position: PlayerPosition;

  /**
   * Direction vers laquelle le héros est actuellement orienté.
   *
   * CHOIX D'IMPLÉMENTATION :
   *
   * cette information permet de sélectionner directement
   * l'asset graphique correspondant parmi les quatre
   * orientations disponibles pour chaque pion.
   */
  facing: Direction;
}
