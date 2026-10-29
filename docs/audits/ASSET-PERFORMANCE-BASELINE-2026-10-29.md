# Baseline performance des assets graphiques

Date de mesure : 29 octobre 2026  
Commit de référence : `44ef080` (`docs(rights): refresh provenance audit counts`)  
Branche de travail : `perf/optimize-image-assets`

## Périmètre

Inventaire réalisé sur `public/assets`, hors audio et PDF pour les mesures
graphiques. Les originaux restent la référence visuelle et de provenance.

## Mesures initiales

| Famille | Fichiers | Poids initial |
|---|---:|---:|
| Héros | 152 | 159,495 MiB |
| Jetons et équipements | 27 | 48,357 MiB |
| Panneaux du plateau | 9 | 10,758 MiB |
| Pages de règles | 8 | 11,477 MiB |
| Tuiles | 25 | 0,454 MiB |
| Illustrations et logos racine | 4 | 3,393 MiB |
| **Total** | **225** | **233,934 MiB** |

Répartition détectée par signature binaire :

- 193 fichiers réellement PNG : 221,835 MiB ;
- 32 fichiers réellement JPEG mais nommés `.png` : 12,098 MiB.

Les fichiers JPEG mal nommés sont :

- `board/karak-cover.jpg` ;
- `rules/karak-base-01.jpg` à `karak-base-08.jpg` ;
- 23 fichiers de `tiles/` ; `tiles/start.png` et `tiles/tile-back.png` sont bien
  de vrais PNG.

Les jetons et une partie des pions de héros utilisent des sources de
`1254 × 1254` pixels, alors que leur affichage est souvent beaucoup plus
petit. Les dimensions d’affichage doivent être vérifiées dans les composants
avant de produire des miniatures.

## Références centralisées

- `src/app/data/token-definitions.ts` : monstres, trésors et jetons ;
- `src/app/data/equipment-definitions.ts` : équipements ;
- `src/app/data/hero-definitions.ts` : cartes, portraits, pions et sprites ;
- `src/app/data/tile-definitions.ts` : tuiles ;
- `src/app/constants/asset-paths.constants.ts` : chemins racines ;
- composants du plateau, du HUD, du combat et du Codex : références directes
  aux panneaux et images d'interface.

## Contraintes de comparaison

Après optimisation, chaque famille devra conserver :

- ses proportions et dimensions d’affichage ;
- la transparence lorsqu’elle existe ;
- les effets visuels, bordures et rotations ;
- les originaux PNG ou JPEG comme références ;
- les preuves de provenance existantes, sans les présenter comme une licence.

## Résultats de la conversion

La conversion a été réalisée avec Chromium via `scripts/convert-image-assets.mjs`
à qualité WebP `0,95`. Les familles `rules/` et `tiles/` ont été exclues : les
premières sont des pages documentaires et les secondes sont déjà légères.

- 191 PNG candidats analysés ;
- 177 variantes WebP créées ;
- 14 PNG conservés car le gain était inférieur à 10 % ou nul ;
- gain mesuré sur les références converties : 168,351 MiB, soit 77,6 % ;
- les originaux sont conservés et aucun fichier source n'a été supprimé.

| Famille convertie | Fichiers WebP | Sources | WebP | Gain |
|---|---:|---:|---:|---:|
| Héros | 140 | 155,552 MiB | 36,063 MiB | 119,489 MiB / 76,8 % |
| Jetons et équipements | 26 | 48,062 MiB | 8,577 MiB | 39,485 MiB / 82,2 % |
| Panneaux du plateau | 8 | 10,414 MiB | 3,490 MiB | 6,924 MiB / 66,5 % |
| Illustrations et logos racine | 3 | 3,023 MiB | 0,569 MiB | 2,454 MiB / 81,2 % |
| **Total** | **177** | **217,051 MiB** | **48,700 MiB** | **168,351 MiB / 77,6 %** |

Les références applicatives des héros, monstres, équipements, panneaux du HUD,
du plateau et du Codex utilisent les variantes WebP lorsqu'elles sont
disponibles. Les images très réduites, notamment les jetons et les portraits
de pouvoir, utilisent une variante `-small.webp` plafonnée à 384 pixels ; les
originaux restent conservés comme sources. Les fichiers WebP sont des dérivés techniques : l'audit de provenance
doit continuer à être exécuté avant toute diffusion publique, et ses marqueurs
ne constituent pas une autorisation de redistribution.

### Variantes pour les petits affichages

Les jetons et portraits transparents sont souvent affichés entre 32 et 300
pixels. Une seconde conversion, limitée à 384 pixels sur le plus grand côté,
évite de charger les sources 1083 à 1254 pixels dans les inventaires, le
plateau, les combats et le Codex.

| Famille | Variantes | Source | `-small.webp` | Gain |
|---|---:|---:|---:|---:|
| Portraits transparents des héros | 13 | 4,283 MiB | 0,491 MiB | 3,792 MiB / 88,5 % |
| Jetons et objets | 27 | 8,872 MiB | 1,408 MiB | 7,463 MiB / 84,1 % |
| **Total** | **40** | **13,155 MiB** | **1,899 MiB** | **11,256 MiB / 85,6 %** |

