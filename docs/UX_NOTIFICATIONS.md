# Notifications en jeu

Les notifications non bloquantes sont affichées par `ToastService` et `ToastContainer`.

- Leur durée est égale aux deux tiers de la durée historique, avec le même calcul relatif à la longueur du message.
- Leur disparition conserve le toast dans l’interface pendant 300 ms afin d’appliquer une évaporation progressive (opacité, flou et léger retrait).
- Les messages en attente restent dans leur file et sont affichés après la fin complète de l’animation.
- Les nouvelles notifications doivent continuer à utiliser `ToastService` afin de conserver cette convention commune.
