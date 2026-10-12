/** Identifiant stable de provenance d'un contenu documentaire ou métier. */
export type ContentOrigin = 'base' | 'regent';

/** Métadonnées partagées par les héros, monstres et futurs contenus. */
export interface ContentOriginDefinition {
  readonly id: ContentOrigin;
  readonly name: string;
  readonly description: string;
  readonly image?: string;
}

/** Référentiel unique des éditions connues par l'application. */
export const CONTENT_ORIGINS: Record<ContentOrigin, ContentOriginDefinition> = {
  base: {
    id: 'base',
    name: 'Jeu de base',
    description: 'Contenu du jeu de base de Karak.',
  },
  regent: {
    id: 'regent',
    name: 'Karak Régent',
    description: 'Contenu de l’extension Karak Régent.',
  },
};

/** Retourne les métadonnées d'une provenance connue. */
export function contentOrigin(origin: ContentOrigin): ContentOriginDefinition {
  return CONTENT_ORIGINS[origin];
}
