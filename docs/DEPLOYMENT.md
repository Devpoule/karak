# Déploiement web de Karak

## Générer le livrable

Depuis la racine du projet :

```powershell
npm ci
npm run audit:rights
npm run prepare:hosting
```

L'audit des droits doit être lu avant toute décision de transfert. Il s'agit
d'un contrôle technique de provenance, pas d'une autorisation juridique.

La commande compile l'application puis vérifie automatiquement le livrable.
Celui-ci est généré dans `dist/karak/browser`. Le contenu de ce répertoire
doit être envoyé à la racine documentaire du domaine ou du sous-domaine OVH,
sans envoyer le répertoire parent `browser` lui-même.

La vérification contrôle la présence de `index.html`, `.htaccess` et `assets`,
la base URL racine, le fallback Angular, l'absence de cartes source et
l'absence de fichiers de développement dans le livrable. Elle peut être
relancée seule après un contrôle ou une copie locale :

```powershell
npm run verify:hosting
```

Le build production utilise l'optimisation Angular, le hachage des fichiers
JavaScript/CSS et les budgets configurés dans `angular.json`. Le fichier
`.htaccess` est copié dans le livrable pour permettre le rechargement direct
des routes Angular (`/play`, `/codex` et `/continuity-prototype`) sur un
hébergement Apache.

## Contrôles avant transfert

- vérifier que `dist/karak/browser/index.html` et `.htaccess` existent ;
- vérifier que le dossier `assets` est présent ;
- conserver les noms hachés des fichiers générés ;
- transférer le contenu complet de `dist/karak/browser` ;
- ne pas publier les sources, `node_modules`, `.angular` ou les rapports de
  test.

Les chemins d'assets actuels commencent par `/assets`. Le livrable est donc
prévu pour la racine d'un domaine ou d'un sous-domaine (`https://jeu.exemple/`),
pas pour un sous-répertoire (`https://exemple/karak/`). Le support d'un
sous-répertoire nécessite une configuration de base URL dédiée et reste hors
du périmètre de ce ticket.

## Recette locale du livrable

Après la préparation du build, la recette automatisée peut servir exactement
le dossier statique de production avec un fallback local des routes Angular :

```powershell
npm run test:e2e:production
```

Cette commande contrôle les routes publiques et leur rechargement direct, les
assets et les icônes PWA, la sauvegarde/restauration, les paramètres et un
écran mobile. Elle ne publie rien sur OVH. Le serveur local de recette ne
remplace pas une vérification navigateur sur le domaine OVH réel.

## Installation OVH sans toucher au site existant

Le déploiement doit utiliser une racine documentaire dédiée à Karak, par
exemple celle d'un sous-domaine. Il ne faut pas envoyer le contenu de Karak
dans la racine documentaire actuellement utilisée par `justindev.fr`.

Avant tout transfert :

1. créer ou identifier la racine documentaire dédiée dans l'espace OVH ;
2. conserver une copie de la version actuellement publiée dans cette racine ;
3. transférer uniquement le contenu de `dist/karak/browser` ;
4. vérifier les permissions usuelles de l'hébergement (dossiers `755`, fichiers
   `644`) si OVH les signale comme nécessaires ;
5. réaliser la recette ci-dessous depuis l'URL dédiée.

Pour un retour arrière, conserver l'ancien contenu jusqu'à la fin de la
recette, puis restaurer cette copie dans la même racine documentaire. Aucun
identifiant, secret ou fichier de configuration local ne doit être transféré.

Cette préparation ne configure ni DNS, ni compte OVH, ni transfert FTP/SFTP,
et ne modifie pas `justindev.fr`.

## Recette après transfert

Depuis le domaine publié, vérifier :

1. l'accueil et le chargement des images ;
2. les navigations vers `/play`, `/codex` et `/continuity-prototype` ;
3. le rechargement direct de chacune de ces URLs ;
4. le démarrage d'une partie, les paramètres, la sauvegarde et la restauration ;
5. l'absence d'erreurs dans la console et de requêtes `404` vers `assets`.

Le livrable ne doit pas être transféré tant que `docs/RIGHTS_AUDIT.md` ne
porte pas le statut de diffusion autorisée. Ce ticket prépare le livrable mais
ne déclenche aucun transfert ni déploiement OVH.

Pour tester une instance locale différente de celle du serveur de développement
habituel, Playwright accepte une URL de base explicite :

```powershell
$env:PLAYWRIGHT_BASE_URL = 'http://127.0.0.1:4300'
npx playwright test e2e/smoke.spec.ts --workers=1
```
