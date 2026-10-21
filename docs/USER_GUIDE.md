# Karak — Guide utilisateur

## Démarrer

Ouvrez Karak depuis l'URL fournie par l'hébergement. Depuis l'accueil :

- **Jouer** ouvre la préparation d'une partie ;
- **Découvrir l'univers du jeu** ouvre le Codex, ses règles, ses héros et son bestiaire ;
- **Tutoriel** présente les cinq grandes étapes du jeu ;
- **Paramètres** règle le confort d'affichage et les sons.

Sur un navigateur compatible, le menu propose également l'installation de Karak
comme application. L'installation PWA est facultative : l'application reste
utilisable dans un onglet.

## Préparer une partie

La préparation se déroule en quatre étapes :

1. choisir entre 2 et 5 aventuriers ;
2. choisir le nombre de personnes jouant sur l'appareil, ou laisser les autres
   joueurs être contrôlés par l'IA ;
3. révéler les héros ;
4. lancer les dés dans l'ordre demandé pour déterminer le premier joueur, puis
   entrer dans le donjon.

Le mode **Simuler une partie IA contre IA** permet d'observer une partie sans
action humaine. Une égalité au meilleur lancer déclenche une manche de
départage pour les joueurs concernés.

## Jouer un tour

Le plateau affiche le donjon, les héros, les objets et les commandes
disponibles. Le compteur central indique les mouvements restants du joueur
actif.

Selon la situation, les actions peuvent inclure :

- déplacer le héros vers une tuile accessible ;
- explorer une ouverture et orienter la nouvelle tuile avant confirmation ;
- résoudre un combat ou une décision obligatoire ;
- récupérer un équipement ou un trésor ;
- utiliser un portail ou une fontaine lorsqu'une action est proposée ;
- terminer volontairement le tour.

Les décisions obligatoires doivent être résolues avant de poursuivre les
actions du tour. Les actions facultatives sont présentées par l'interface
lorsqu'elles sont disponibles.

Les fiches des joueurs ouvrent l'inventaire, les points de vie et les pouvoirs
du héros. Le **Journal** conserve les notifications récentes de la partie et
se ferme avec son bouton ou avec Échap.

## Combats et pouvoirs

Lorsqu'un combat commence, suivez la carte de combat : elle présente les dés,
les bonus et les choix autorisés par la situation. Certains pouvoirs de héros
proposent une décision supplémentaire ; l'interface indique alors les actions
possibles.

Les pouvoirs, les monstres, les équipements et les règles détaillées sont
consultables dans le Codex. En cas de doute, le [référentiel des règles du
projet](RULES.md) renvoie au manuel officiel et distingue les règles du jeu
des adaptations d'interface.

## Fin de partie

Lorsque le Dragon est vaincu, l'écran **Fin de la partie** affiche le ou les
vainqueurs et le classement final. Le score affiché tient compte des trésors
collectés, conformément aux règles présentées dans le Codex.

Pour commencer une nouvelle aventure, revenez à l'accueil puis sélectionnez
**Jouer**. Quitter une partie en cours demande une confirmation afin d'éviter
une sortie accidentelle.

## Confort, accessibilité et mobile

Le panneau **Paramètres** est disponible depuis l'accueil et l'en-tête de la
partie :

- animations selon le système ou réduites ;
- texte standard ou agrandi ;
- contraste standard ou renforcé ;
- sons activés ou désactivés, désactivés par défaut.

Les préférences sont conservées dans le navigateur. Les commandes sont
utilisables au clavier avec Tab, Entrée ou Espace. Échap ferme les panneaux,
fiches et dialogues ouverts lorsque le composant concerné le permet. Sur
mobile, utilisez les commandes de caméra fixes et faites défiler les panneaux
du HUD si nécessaire.

Le lien **Aller au contenu principal** est disponible au clavier sur les
écrans concernés.

## Continuité locale

La continuité d'une partie est liée au stockage local du navigateur. Le
parcours public ne propose pas de bouton manuel d'export ou d'import : évitez
de supprimer les données du site si vous souhaitez conserver une reprise
locale. Une donnée absente, incompatible ou corrompue est rejetée et ne doit
pas être considérée comme une sauvegarde récupérable.

La navigation privée, le nettoyage du stockage du site, un changement de
domaine ou certains réglages de navigateur peuvent empêcher cette continuité.
Le jeu reste alors utilisable en démarrant une nouvelle partie.

## Dépannage rapide

| Symptôme | Action recommandée |
|---|---|
| Une route directe ne s'ouvre pas après publication | Vérifier que le contenu complet du build est servi avec le fichier `.htaccess`. |
| Les images ne chargent pas | Vérifier que le dossier `assets` a été transféré sans modifier ses noms. |
| La PWA affiche une ancienne version | Fermer les onglets Karak, attendre l'activation de la mise à jour puis recharger. |
| La partie locale n'est pas reprise | Vérifier le domaine, le mode de navigation et le stockage local du navigateur. |
| Le son ne se fait pas entendre | Vérifier le réglage **Sons** et l'autorisation audio du navigateur. |

Pour une installation OVH, consulter la [procédure de déploiement](DEPLOYMENT.md)
et la [documentation PWA](PWA.md). Aucun identifiant OVH ne doit être demandé
ou saisi dans l'application.
