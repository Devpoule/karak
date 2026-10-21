# PWA de Karak

Karak peut être installé comme application web depuis un navigateur compatible.
La PWA reste une application cliente : elle ne modifie ni les règles du jeu ni
le format des sauvegardes.

## Fonctionnement

- `manifest.webmanifest` décrit le nom, l'icône, le thème et le mode autonome ;
- le service worker Angular est généré uniquement pour le build production ;
- le shell Angular et les fichiers JavaScript/CSS sont préchargés ;
- les assets du jeu et les icônes sont mis en cache à leur première utilisation ;
- une nouvelle version est récupérée par le service worker puis activée selon
  le cycle standard Angular.

Le service worker est désactivé avec `ng serve` et pendant les tests unitaires.
Cela évite qu'un cache local masque les changements pendant le développement.

## Validation locale

```powershell
npm run prepare:hosting
npx http-server dist/karak/browser -p 4300
```

Puis ouvrir `http://127.0.0.1:4300/` dans un navigateur compatible et vérifier
le manifeste dans les outils de développement. La commande `prepare:hosting`
contrôle également la présence de `ngsw.json` et des deux icônes PWA.

La validation d'installation et du mode hors connexion doit être réalisée dans
un navigateur réel servi en HTTPS (ou sur `localhost`). Elle n'a pas été
effectuée sur OVH par ce ticket.
