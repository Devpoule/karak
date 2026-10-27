import { Injectable } from '@angular/core';
import { TUTORIAL_SCENARIO } from '../data/tutorial-scenario';
import { PlacedTile } from '../models/tile';
import { TokenDefinitionId } from '../models/token';

/**
 * Lecture seule du scénario du didacticiel. Il ne possède aucun état de jeu :
 * DungeonService et les services existants restent les sources de vérité.
 */
@Injectable()
export class TutorialScenarioService {
  private readonly placements = TUTORIAL_SCENARIO.placements;

  /** Héros humain utilisé par la session indépendante du didacticiel. */
  get heroId(): typeof TUTORIAL_SCENARIO.heroId {
    return TUTORIAL_SCENARIO.heroId;
  }

  /** Coordonnées de la tuile qui valide le dernier objectif. */
  get exit(): typeof TUTORIAL_SCENARIO.exit {
    return TUTORIAL_SCENARIO.exit;
  }

  /** Aides contextuelles ; elles n'ont aucun pouvoir de validation métier. */
  get helpDefinitions(): typeof TUTORIAL_SCENARIO.helps {
    return TUTORIAL_SCENARIO.helps;
  }

  /** Identifiants des lieux nécessaires à la branche ouest. */
  get requiredWestLocationIds(): typeof TUTORIAL_SCENARIO.requiredWestLocations {
    return TUTORIAL_SCENARIO.requiredWestLocations;
  }

  /** Identifiants des lieux nécessaires à la branche est. */
  get requiredEastLocationIds(): typeof TUTORIAL_SCENARIO.requiredEastLocations {
    return TUTORIAL_SCENARIO.requiredEastLocations;
  }

  /** Retourne la tuile déterministe du scénario lorsque la source est non ambiguë. */
  getDefinitionIdForSource(source: PlacedTile): string | null {
    const choices = this.placements.filter(placement =>
      placement.source.x === source.x && placement.source.y === source.y,
    );
    if (choices.length === 0) return null;
    const [first] = choices;
    return choices.every(choice => choice.definitionId === first.definitionId)
      ? first.definitionId
      : null;
  }

  /**
   * Retourne le jeton prédéfini d'une salle.
   *
   * `null` signifie que la salle scénarisée doit rester vide. `undefined`
   * signifie qu'elle doit suivre le tirage normal du didacticiel.
   */
  getRoomTokenId(tile: PlacedTile): TokenDefinitionId | null | undefined {
    const placement = this.placements.find(placement =>
      placement.target.x === tile.x && placement.target.y === tile.y,
    );
    return placement?.tokenId;
  }

  /** Retourne la configuration du bestiaire autorisé pour les tirages libres. */
  getAllowedMonsterTokenIds(): readonly TokenDefinitionId[] {
    return TUTORIAL_SCENARIO.allowedMonsterTokenIds;
  }

  /** Traduit une tuile posée en identifiant de progression pédagogique. */
  getLocationId(tile: PlacedTile): string | null {
    return this.placements.find(placement =>
      placement.target.x === tile.x && placement.target.y === tile.y,
    )?.id ?? null;
  }

  /** Compare la position d'une tuile avec la sortie du scénario. */
  isExit(tile: PlacedTile): boolean {
    return tile.x === this.exit.x && tile.y === this.exit.y;
  }

}

