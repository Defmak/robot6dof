# Bras robot industriel 6 DDL

Application web 3D (Three.js) représentant un bras robot industriel à 6 degrés de liberté.

## Lancer l'application

```bash
cd bras-robot-6ddl
npm install        # installe three.js en local
npm start          # sert le site sur http://localhost:8080
```

Ouvrir ensuite http://localhost:8080 dans un navigateur.

## Fonctionnalités

- **Vue 3D manipulable** : orbite (glisser), zoom (molette), panoramique (clic droit) via OrbitControls.
- **6 curseurs** : un par degré de liberté, avec limites d'angle réalistes et valeur affichée en degrés.
- **Mode démo** : animation cyclique du robot entre plusieurs poses (bouton « ▶ Mode démo »), avec tracé de la trajectoire du TCP (outil).
- **Lecture TCP** : position 3D de l'effecteur (TCP) en temps réel.
- Bouton « ⟲ Position initiale » pour revenir à la pose de repos.

## Structure

- `index.html` — page et import map
- `css/style.css` — interface
- `js/kinematics.js` — définition des 6 articulations, limites, poses de la démo, logique d'animation
- `js/robot3d.js` — construction du modèle 3D hiérarchique (6 groupes d'articulations imbriqués)
- `js/main.js` — scène Three.js, contrôles, curseurs, boucle d'animation
- `test/` — tests Node (`npm test`) : cinématique, limites, poses de démo, géométrie du TCP
