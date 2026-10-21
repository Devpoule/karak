# Recette de publication — V2.4-06

**Date :** 21 octobre 2026
**Périmètre :** artefact Angular de production local
**Verdict technique :** recette locale réussie
**Publication OVH :** non effectuée

## Objectif

Vérifier qu'un build de production peut être servi comme un site statique,
que les routes Angular se rechargent directement et que les fonctionnalités
essentielles de la publication restent disponibles sur ordinateur et mobile.

Cette recette ne modifie aucune règle du jeu et ne constitue pas une
autorisation de diffusion. Le statut des droits est suivi dans
[`RIGHTS_AUDIT.md`](../RIGHTS_AUDIT.md).

## Commande reproductible

Depuis la racine du projet :

```powershell
npm run test:e2e:production
```

Cette commande exécute successivement le build production, la vérification de
l'artefact d'hébergement, puis Chromium sur ce même dossier statique avec un
serveur local et fallback Angular.

## Résultats

| Contrôle | Résultat |
|---|---|
| Build production | Réussi |
| Vérification de l'artefact | Réussie, 212 assets |
| Routes `/`, `/play`, `/codex`, `/continuity-prototype` | 4/4 réussies, rechargement direct vérifié |
| Assets, manifest et icônes PWA | Réussis ; asset inexistant en 404 |
| Sauvegarde et restauration | Réussi |
| Paramètres et persistance | Réussi |
| Affichage mobile 390 × 844 | Réussi, sans débordement horizontal |
| Scénarios Chromium ciblés | **7/7 réussis** |
| Suite Angular complète | **365/370** |
| `git diff --check` | Réussi |

Les cinq échecs Angular appartiennent à `src/app/components/combat-overlay/` et
étaient déjà connus avant cette recette. Aucun scénario de la recette de
publication ne les reproduit.

## Limites et décision

- Le serveur local vérifie le contenu du livrable et le fallback d'une
  configuration Apache équivalente ; il ne remplace pas une vérification sur
  le domaine OVH réel.
- Aucun test navigateur sur OVH, DNS, HTTPS, permissions FTP/SFTP ou cache du
  service worker en production n'a été réalisé.
- Aucun transfert ni déploiement n'a été effectué.
- La diffusion publique reste bloquée par l'audit des droits tant que les
  autorisations et attributions requises ne sont pas documentées.

La recette technique locale est donc **conforme**, avec publication externe
encore conditionnelle aux droits et à une recette OVH séparée.
