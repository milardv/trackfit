# React + TypeScript + Vite

## Deploiement GitHub Pages

Le projet est configure pour un deploiement automatique vers GitHub Pages.

### 1) Activer Pages dans le repo

- GitHub > `Settings` > `Pages`
- `Source`: **GitHub Actions**

### 2) Push sur `main`

Chaque push sur `main` lance le workflow:

- `.github/workflows/deploy-pages.yml`

Le build Vite detecte automatiquement le nom du repo et applique le bon `base` pour Pages.

### 3) URL de production

Apres le premier deploiement, l'app sera disponible sur:

- `https://<username>.github.io/<repo>/`

### Notes Firebase

Si tu utilises Firebase Auth Google en production, ajoute aussi ce domaine dans:

- Firebase Console > Authentication > Settings > Authorized domains
- domaine a ajouter: `<username>.github.io`

### Secret GitHub pour Gemini

Pour que les requetes Gemini fonctionnent apres deploiement GitHub Pages:

1. Ouvrir le repo GitHub > `Settings` > `Secrets and variables` > `Actions`
2. Ajouter un secret `GEMINI_API_KEY` avec ta cle API
3. Relancer le workflow `Deploy to GitHub Pages`

## Sync Wger vers sharedExercises

Le repo contient maintenant un script de sync pour peupler `sharedExercises`
depuis l'API officielle Wger, avec:

- preference de traduction FR, fallback EN puis premiere traduction disponible
- mapping de categorie vers des labels compatibles Trackfit
- reprise des consignes texte depuis la description Wger
- selection du media principal (image/video) quand il existe
- conservation de la licence source Wger
- tag `isMachine` et `trackingMode` inferes par heuristiques

### Prerequis Firebase

Le script ecrit avec `firebase-admin`, donc il lui faut des credentials admin.
Tu peux utiliser au choix:

- `FIREBASE_SERVICE_ACCOUNT_JSON` avec le JSON complet du service account
- `GOOGLE_APPLICATION_CREDENTIALS` pointant vers un fichier JSON local

Optionnel:

- `FIREBASE_PROJECT_ID` pour forcer le projet cible

### Commandes

Dry run sans ecriture Firestore:

```bash
npm run sync:shared-exercises -- --dry-run --limit 20
```

Sync complet:

```bash
npm run sync:shared-exercises
```

Options utiles:

- `--limit 100` pour tronquer le nombre d'exercices synchronises
- `--page-size 100` pour ajuster la pagination Wger
- `--skip-deactivate-missing` pour ne pas desactiver les anciens docs Wger absents du fetch courant

## Assets PWA

Les icones PWA sont generees automatiquement a partir de `public/icon.svg`.

### Prerequis

- `ffmpeg` installe sur la machine

### Commande

```bash
npm run generate:pwa-assets
```

Fichiers regeneres:

- `public/icon-192.png`
- `public/icon-512.png`
- `public/apple-touch-icon.png`

Tu peux aussi fournir une autre source SVG:

```bash
npm run generate:pwa-assets -- --input public/mon-icon.svg
```

## Estimation IA (duree + calories)

La creation de seance utilise une estimation locale + Gemini directement depuis le front.

- Fallback automatique: formule locale si Gemini ne repond pas
- Champs enregistres sur le plan: `estimatedDurationMin`, `estimatedCaloriesKcal`, `estimationSource`, `estimatedAt`

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
