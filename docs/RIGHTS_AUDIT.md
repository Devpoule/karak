# Audit des droits de diffusion

**Date de l'audit :** 29 octobre 2026
**Statut :** **DIFFUSION PUBLIQUE NON AUTORISÉE PAR CET AUDIT**

Cet audit est un relevé technique de provenance et de documentation. Il ne
constitue pas un avis juridique et ne remplace pas la confirmation des droits
par les ayants droit ou les titulaires des licences concernées.

## Périmètre et méthode

L'audit couvre le contenu public du dépôt, les dépendances d'exécution et les
documents de déploiement. Il a consisté à :

- rechercher les fichiers de licence, d'attribution et de crédits dans le dépôt ;
- recenser les fichiers sous `public/` et calculer leur empreinte SHA-256 ;
- inspecter les métadonnées binaires et les marqueurs C2PA connus ;
- examiner l'historique Git des assets ;
- vérifier les licences déclarées par les dépendances directes et le `package-lock.json` pour les dépendances transitives.

La vérification reproductible est disponible avec :

```powershell
npm run audit:rights
```

La commande conserve les métadonnées présentes et n'affirme pas qu'un asset
est libre de droits lorsqu'aucune information n'est détectée.

## Résultats

### Assets du projet

Le dépôt contient actuellement :

| Groupe | Constat | Statut des droits dans le dépôt |
|---|---|---|
| `public/assets` | 225 fichiers PNG | Source, auteur, licence et autorisation non documentés |
| `public/assets/rules/karak-base.pdf` | Manuel officiel local | Conditions de redistribution non documentées |
| `public/assets/rules/karak-base-01.png` à `-08.png` | Pages du manuel | Conditions de redistribution non documentées |
| `public/favicon.ico`, manifest et icônes PWA | Assets de l'application | Attribution ou autorisation non documentée |

Le dépôt ne contient pas de fichier `LICENSE`, `COPYING`, `NOTICE`,
`ATTRIBUTION` ou `CREDITS` établissant les droits de diffusion des assets.
L'historique Git décrit les ajouts et conversions de fichiers, mais ne fournit
pas de preuve de licence ou d'autorisation pour leur usage public.

La commande d'audit identifie 52 fichiers avec un marqueur technique ou de
droit : 50 fichiers portent des marqueurs C2PA/OpenAI Media Service et 2
portent le marqueur `Copyright`. Ces marqueurs apportent une information
technique de provenance et doivent être conservés ; ils ne constituent pas, à
eux seuls, une licence de diffusion du jeu, de ses règles, de sa marque ou des
éléments fournis en entrée. Les 215 autres fichiers publics sans marqueur ont
une provenance inconnue, et non une licence implicite.

Le site officiel présente Karak comme un jeu de société commercial et fournit
son manuel officiel [sur la page produit Albi](https://www.albi.eu/en/karak-2?p=eC_karak_ii_eC_games-puzzles).
Le nom, les règles, les textes et les pages du manuel doivent donc rester
traités comme des contenus tiers tant que leur autorisation de redistribution
n'est pas établie.

### Dépendances d'exécution

Les licences déclarées par les dépendances directes sont les suivantes :

| Dépendance | Version auditée | Licence déclarée |
|---|---:|---|
| `@angular/common`, `@angular/compiler`, `@angular/core`, `@angular/forms`, `@angular/platform-browser`, `@angular/router`, `@angular/service-worker` | 22.2.3 | MIT |
| `rxjs` | 7.8.2 | Apache-2.0 |
| `tslib` | 2.8.1 | 0BSD |

Les dépendances transitives sont décrites dans les champs de licence du
`package-lock.json`. Elles ne sont pas copiées dans l'artefact statique de
production ; cette observation ne dispense pas de conserver les notices
requises si une redistribution de paquet ou de code source est réalisée.

Les conditions [OpenAI](https://openai.com/en-GB/policies/oct-2024-row-terms/)
indiquent notamment la relation de propriété des outputs entre l'utilisateur
et OpenAI dans la mesure permise par la loi, tout en laissant à l'utilisateur
la responsabilité du contenu fourni, des droits nécessaires et du respect des
lois applicables. Cela ne suffit donc pas à établir seul la clearance de
chaque asset ou de la marque Karak.

## Conditions préalables à une diffusion publique

La publication sur OVH reste bloquée jusqu'à obtention et archivage de :

1. l'autorisation nécessaire pour le nom, la marque, les règles et les textes spécifiques à Karak ;
2. un inventaire des assets indiquant pour chaque groupe la source, l'auteur, la licence, l'attribution exigée, la preuve et le périmètre de diffusion ;
3. une décision explicite concernant le PDF officiel et ses huit images : autorisation de redistribution ou retrait du bundle public ;
4. la confirmation des conditions applicables aux assets générés avec OpenAI, notamment les droits sur les éléments fournis en entrée, les ressemblances et les marques tierces ;
5. une relecture finale de l'audit après toute substitution ou suppression d'asset.

Le dépôt peut continuer à être utilisé pour le développement et les tests
privés. Cet audit ne l'autorise pas à être publié sans les vérifications
ci-dessus. Aucun transfert OVH n'a été effectué.

## Registre de décision

| Domaine | Preuve actuelle | Décision |
|---|---|---|
| Code applicatif | Dépôt Angular privé, licences des dépendances déclarées | À maintenir sous revue de diffusion |
| Assets générés | Marqueurs C2PA/OpenAI sur 50 fichiers | Vérifier les conditions et les inputs |
| Assets sans marqueur | 215 fichiers publics sans provenance détectée | Identifier source et autorisation |
| Manuel et pages de règles | Contenu officiel localisé dans `public/assets/rules` | Autorisation ou retrait requis |
| Nom et contenu Karak | Référence à un produit tiers | Autorisation requise avant publication |

## Conclusion

Le ticket met en place une méthode d'audit et rend le blocage de diffusion
visible dans la documentation. Il ne conclut pas à une autorisation de
publication : la préparation technique du build est terminée, mais la preuve
des droits de diffusion reste à obtenir.
