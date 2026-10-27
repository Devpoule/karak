import { Direction } from '../models/tile';
import { TokenDefinitionId } from '../models/token';

/** Identifiants stables des jalons obligatoires du didacticiel. */
export type TutorialObjectiveId =
  | 'movement'
  | 'exploration'
  | 'combat'
  | 'west-branch'
  | 'east-branch'
  | 'portal'
  | 'exit';

export type TutorialHelpTarget = 'board' | 'hud';
export type TutorialGuidanceStep =
  | 'movement'
  | 'explore-direction'
  | 'explore-rotate'
  | 'explore-confirm'
  | 'combat'
  | 'branches'
  | 'portal'
  | 'exit';

export interface TutorialHelpDefinition {
  readonly id: string;
  readonly notion: string;
  readonly title: string;
  readonly message: string;
  readonly target: TutorialHelpTarget;
  readonly display: 'expanded' | 'collapsed';
  readonly validates: readonly TutorialObjectiveId[];
}

export interface TutorialScenarioPlacement {
  readonly id: string;
  readonly source: { readonly x: number; readonly y: number };
  readonly direction: Direction;
  readonly target: { readonly x: number; readonly y: number };
  readonly definitionId: string;
  /** null désigne explicitement une salle vide ; undefined ne fait pas partie du scénario. */
  readonly tokenId?: TokenDefinitionId | null;
  readonly branch?: 'west' | 'east' | 'trunk' | 'portal' | 'exit';
}

/**
 * Carte déterministe du didacticiel.
 *
 * Le choix d'une tuile dépend toujours de la tuile source, puis de la
 * direction sélectionnée : découvrir une branche en premier ne déplace donc
 * jamais les récompenses de l'autre branche.
 */
export const TUTORIAL_SCENARIO = {
  heroId: 'argentus' as const,
  /** Bestiaire autorisé pour les tirages non scénarisés du didacticiel. */
  allowedMonsterTokenIds: ['giant-spider', 'giant-rat'] as const,
  exit: { x: 1, y: 8 },
  requiredWestLocations: ['west-swordsman', 'west-key-guardian'] as const,
  requiredEastLocations: ['east-rat', 'east-fountain', 'east-return'] as const,
  placements: [
    {
      id: 'movement-corridor',
      source: { x: 0, y: 0 },
      direction: 'south',
      target: { x: 0, y: 1 },
      definitionId: 'straight-01',
      branch: 'trunk',
    },
    {
      id: 'exploration-corridor',
      source: { x: 0, y: 1 },
      direction: 'south',
      target: { x: 0, y: 2 },
      definitionId: 'straight-02',
      branch: 'trunk',
    },
    {
      id: 'spider-room',
      source: { x: 0, y: 2 },
      direction: 'south',
      target: { x: 0, y: 3 },
      definitionId: 'straight-room',
      tokenId: 'giant-spider',
      branch: 'trunk',
    },
    {
      id: 'crossroads',
      source: { x: 0, y: 3 },
      direction: 'south',
      target: { x: 0, y: 4 },
      definitionId: 't-junction-01',
      branch: 'trunk',
    },
    {
      id: 'west-swordsman',
      source: { x: 0, y: 4 },
      direction: 'west',
      target: { x: -1, y: 4 },
      definitionId: 'crossroads-room',
      tokenId: 'giant-rat',
      branch: 'west',
    },
    {
      id: 'west-key-guardian',
      source: { x: -1, y: 4 },
      direction: 'south',
      target: { x: -1, y: 5 },
      definitionId: 't-junction-room',
      tokenId: 'giant-spider',
      branch: 'west',
    },
    {
      id: 'west-chest',
      source: { x: -1, y: 5 },
      direction: 'east',
      target: { x: 0, y: 5 },
      definitionId: 'crossroads-room',
      tokenId: 'closed-chest',
      branch: 'west',
    },
    {
      id: 'east-rat',
      source: { x: 0, y: 4 },
      direction: 'east',
      target: { x: 1, y: 4 },
      definitionId: 'crossroads-room',
      tokenId: 'giant-rat',
      branch: 'east',
    },
    {
      id: 'east-fountain',
      source: { x: 1, y: 4 },
      direction: 'east',
      target: { x: 2, y: 4 },
      definitionId: 'healing-corner',
      branch: 'east',
    },
    {
      id: 'east-return',
      source: { x: 2, y: 4 },
      direction: 'south',
      target: { x: 2, y: 5 },
      definitionId: 'corner-room',
      tokenId: null,
      branch: 'east',
    },
    {
      id: 'convergence-from-west',
      source: { x: 0, y: 5 },
      direction: 'east',
      target: { x: 1, y: 5 },
      definitionId: 'cross',
      branch: 'trunk',
    },
    {
      id: 'convergence-from-east',
      source: { x: 2, y: 5 },
      direction: 'west',
      target: { x: 1, y: 5 },
      definitionId: 'cross',
      branch: 'trunk',
    },
    {
      id: 'portal-one',
      source: { x: 1, y: 5 },
      direction: 'south',
      target: { x: 1, y: 6 },
      definitionId: 'portal-straight-01',
      branch: 'portal',
    },
    {
      id: 'portal-two',
      source: { x: 1, y: 6 },
      direction: 'south',
      target: { x: 1, y: 7 },
      definitionId: 'portal-straight-02',
      branch: 'portal',
    },
    {
      id: 'exit',
      source: { x: 1, y: 7 },
      direction: 'south',
      target: { x: 1, y: 8 },
      definitionId: 'straight-03',
      branch: 'exit',
    },
  ] satisfies readonly TutorialScenarioPlacement[],
  helps: [
    {
      id: 'move',
      notion: 'Déplacement',
      title: 'Avancez dans le donjon',
      message: 'Sélectionnez une destination éclairée pour dépenser un mouvement.',
      target: 'board',
      display: 'expanded',
      validates: ['movement'],
    },
    {
      id: 'explore',
      notion: 'Exploration',
      title: 'Révélez une nouvelle tuile',
      message: 'Les marqueurs ambrés indiquent les passages encore inexplorés. Choisissez-en un pour tirer une tuile.',
      target: 'board',
      display: 'expanded',
      validates: ['exploration'],
    },
    {
      id: 'explore-direction',
      notion: 'Exploration · passage',
      title: 'Choisissez le passage à explorer',
      message: 'Vous pouvez choisir n’importe quelle sortie ambrée disponible. Le didacticiel ne bloque pas les autres directions autorisées.',
      target: 'board',
      display: 'expanded',
      validates: ['exploration'],
    },
    {
      id: 'explore-rotate',
      notion: 'Exploration · orientation',
      title: 'Orientez la tuile',
      message: 'Tournez la tuile révélée jusqu’à raccorder ses passages à la tuile quittée. Les rotations restent libres.',
      target: 'board',
      display: 'expanded',
      validates: ['exploration'],
    },
    {
      id: 'explore-confirm',
      notion: 'Exploration · placement',
      title: 'Validez le placement',
      message: 'Quand les passages sont raccordés, confirmez l’emplacement pour entrer réellement dans la nouvelle tuile.',
      target: 'board',
      display: 'expanded',
      validates: ['exploration'],
    },
    {
      id: 'combat',
      notion: 'Combat',
      title: 'Résolvez un vrai combat',
      message: 'Entrez dans une salle avec un monstre et lancez les dés : le résultat compte, victoire ou non.',
      target: 'board',
      display: 'expanded',
      validates: ['combat'],
    },
    {
      id: 'branches',
      notion: 'Exploration libre',
      title: 'Parcourez les deux branches',
      message: 'Les salles à l’ouest et à l’est peuvent être visitées dans l’ordre de votre choix.',
      target: 'board',
      display: 'expanded',
      validates: ['west-branch', 'east-branch'],
    },
    {
      id: 'portal',
      notion: 'Portail',
      title: 'Essayez les portails',
      message: 'Une fois les deux portails découverts, utilisez le bouton du portail pour vous téléporter.',
      target: 'board',
      display: 'expanded',
      validates: ['portal'],
    },
    {
      id: 'exit',
      notion: 'Sortie',
      title: 'Rejoignez la sortie',
      message: 'Atteignez physiquement la dernière tuile marquée Sortie pour terminer.',
      target: 'board',
      display: 'expanded',
      validates: ['exit'],
    },
  ] satisfies readonly TutorialHelpDefinition[],
} as const;

