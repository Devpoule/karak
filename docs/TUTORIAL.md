# Didacticiel jouable

La route `/tutorial` est une aventure indépendante, fournie par des services
Angular au niveau de la route. Elle réutilise le plateau, le HUD, les combats,
l'exploration et les règles de mouvement existants, mais ne lit ni n'écrit la
sauvegarde de la partie normale.

## Choix numérique : scénario déterministe

`src/app/data/tutorial-scenario.ts` décrit les poses par tuile source et
direction. Une branche découverte avant l'autre ne peut donc pas déplacer ses
récompenses. Les jetons des salles sont révélés au premier passage réel, comme
dans le flux normal, mais leur identité est définie par le scénario.

Les deux branches restent accessibles dans n'importe quel ordre. Les combats,
leurs résultats, les pertes de vie, les récupérations, les récompenses, le
coffre et la fontaine conservent les règles normales : aucun dé ni résultat
n'est forcé. La complétion demande des transitions réelles (mouvement, pose,
combat résolu, téléportation et arrivée à la sortie), jamais un clic sur une
étape d'aide.

## Aide contextuelle

L'aide est non bloquante et limitée à une carte active. Elle peut être réduite
par son contrôle, Échap ou un clic extérieur ; « Compris » ferme définitivement
la carte concernée pour la session. Elle est suspendue lors des combats et des
décisions obligatoires afin de ne pas recouvrir les contrôles du jeu.

La progression visible sur le plateau est une check-list en lecture seule :
elle reflète directement les objectifs de `TutorialSessionService`. Elle peut
être repliée sans modifier la session et est repliée par défaut sur petit écran.

