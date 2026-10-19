# Karak — raccordements géométriques (prototype)

25 images PNG 512 × 512. Les bords correspondant à une ouverture sont remplacés progressivement sur une profondeur de 72 px par un profil de référence commun (24 px identiques, puis transition douce de 48 px). Le profil est tourné pour les ouvertures verticales.

**Important :** les ouvertures sont alignées exactement aux bords, mais la jonction n’est pas certifiée parfaitement invisible dans les textures et les murs. La correction peut introduire des motifs répétés ou une transition perceptible à 24–72 px du bord. Les bords fermés ne sont pas uniformisés.

## Topologie supposée (à confirmer avec les règles du jeu)

T=haut, R=droite, B=bas, L=gauche.

- `corner-01` : RB
- `corner-02` : RB
- `corner-03` : RB
- `corner-04` : RB
- `corner-room` : TL
- `cross` : TRBL
- `crossroads-room` : TRBL
- `healing-corner` : LB
- `portal-straight-01` : LR
- `portal-straight-02` : LR
- `portal-straight-03` : LR
- `portal-straight-04` : LR
- `start` : TRBL
- `straight-01` : LR
- `straight-02` : LR
- `straight-03` : LR
- `straight-04` : LR
- `straight-room` : TB
- `t-junction-01` : LRB
- `t-junction-02` : LRB
- `t-junction-03` : LRB
- `t-junction-04` : LRB
- `t-junction-05` : LRB
- `t-junction-room` : TLB
- `tile-back` : aucune ouverture

## Mesures

Différence maximale de couleurs sur les bords ouverts opposés : [('straight-01', 'straight-03', 0), ('corner-01', 'straight-02', 9), ('cross', 't-junction-01', 24)] (0 attendu).
