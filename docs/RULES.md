# Karak — règles métier et sources

## Source officielle disponible

La référence locale est `public/assets/rules/karak-base.pdf`, accompagnée de huit captures `public/assets/rules/karak-base-01.png` à `karak-base-08.png`. Le manuel prévaut sur le code. Une règle non explicitement lisible dans ces sources reste `INCERTAINE`.

## Règles confirmées et couvertes par le projet

- Un héros dispose de mouvements pendant son tour ; une résolution obligatoire prime sur le déplacement.
- Les armes ajoutent leur force au combat. Dans le catalogue actuel : dague `+1`, épée `+2`, hache `+3`.
- Le Tir magique ajoute `+1` après le lancer des dés ; il peut être utilisé avant la résolution. Les utilisations ordinaires sont consommées à la résolution. Argentus conserve ses Tirs magiques lorsqu'il n'est pas maudit ; la malédiction retire cette exception.
- Une égalité, une victoire et une défaite ont des conséquences distinctes ; le verdict métier ne doit pas être recalculé dans l'interface.
- Une clé ouvre un coffre et est consommée. Un coffre ouvert fournit un trésor ; les trésors ordinaires valent `1` point.
- Le trésor d'un monstre vaut `1` point ; le rubis du Dragon vaut `1,5` point.
- Vaincre le Dragon attribue le rubis, puis la partie se termine et le classement se fait selon les points de trésor. L'implémentation retient tous les joueurs ex æquo au meilleur score ; aucun départage supplémentaire n'est inventé.
- Le Portail de guérison est distinct d'une tuile `healing-fountain`. Il téléporte un héros choisi vers une fontaine découverte, restaure tous ses PV, retire sa malédiction, consomme un exemplaire et ne termine pas le tour. Argentus ne conserve pas ce portail.
- Les états `pending`, `resting` et `none` représentent respectivement une récupération attendue, le tour de repos en cours et la possibilité de jouer normalement.
- Une victoire contre une momie peut produire une malédiction ; son attribution et sa résolution passent par les états métier dédiés.
- Aderyn remporte également un combat à égalité et peut traverser une tuile occupée par un monstre ; ces deux pouvoirs sont désactivés lorsqu'elle est maudite.
- Horan peut relancer les deux dés une fois par combat ; Victorius peut relancer une fois chaque dé affichant 1, dans la limite d'une relance par combat. Ces relances sont indisponibles lorsqu'ils sont maudits.
- Taia reçoit `+1` à l'attaque après son premier déplacement du tour ; ce bonus est capturé au lancer et désactivé par la malédiction. Son choix de jetons à l'exploration reste à intégrer.
- Argentus peut franchir une séparation entre deux tuiles déjà découvertes et adjacentes ; la Marche astrale est désactivée par la malédiction. Le déplacement consomme un mouvement comme les autres déplacements.
- Xanros peut sacrifier une vie après le lancer pour obtenir `+1` une seule fois par combat, y compris avec une seule vie restante ; la malédiction désactive ce pouvoir. Il peut aussi échanger sa position avec un autre héros au début du tour, en consommant les quatre mouvements ; la cible et les tuiles doivent être valides.

## Adaptation numérique

Les capacités d'inventaire, les signaux de réactivité, les délais d'animation, l'automatisation IA et certains choix de présentation sont des décisions numériques. Ils ne constituent pas des règles officielles supplémentaires.

Les capacités particulières des héros ne sont considérées comme officielles dans le moteur que lorsqu'elles sont effectivement implémentées et couvertes. Les bonus non implémentés restent nuls ; il ne faut pas les déduire d'un nom d'asset ou d'une hypothèse.

## Points à surveiller

- Vérifier chaque règle de héros et chaque cas limite directement dans le manuel avant extension.
- Distinguer les tuiles `portal` des fontaines `healing-fountain` et des objets `heart`.
- Distinguer coffre, jeton de monstre, équipement au verso et trésor.
- Documenter toute divergence entre le manuel et l'implémentation avant de la corriger.
