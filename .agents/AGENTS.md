# Règles et Directives Projet Écolisa

## 1. Composants UI Standardisés
- **Listes Déroulantes (Dropdowns)** : **NE JAMAIS utiliser le tag HTML `<select>` natif**. Utiliser impérativement le composant personnalisé `CustomSelect` (`src/components/common/CustomSelect.tsx`).
- **Sélecteur de Date** : Utiliser `CustomDatePicker` (`src/components/common/CustomDatePicker.tsx`).

## 2. Adaptation Thématique (Mode Clair / Mode Sombre)
- Tous les composants, cartes, popovers et fenêtres modales doivent réagir dynamiquement au mode clair et au mode sombre.
- Préférer les variables de design Ecolisa (`var(--bg-surface)`, `var(--bg-sunken)`, `var(--border)`, `var(--text-primary)`, `var(--text-secondary)`, `var(--sidebar-popover-bg)`) ou les utilitaires Tailwind adaptés aux deux modes (ex: `bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100`).
- Ne jamais laisser de cartes sombres isolées (ex: `bg-slate-900` sans équivalent clair `bg-white`) lorsque l'application est en mode clair.

## 3. Système de Design & Finitions Premium
- **Ombres** : Éliminer toutes les ombres lourdes ou artificielles (`shadow-lg`, `shadow-2xl`, `shadow-indigo-600/30`). Privilégier les bordures nettes de 1px et les micro-ombres (`shadow-xs`).
- **Rayons de courbure (Border Radius)** :
  - Cartes et conteneurs extérieurs : `rounded-2xl` (16px)
  - Sous-cartes, modales et menus déroulants : `rounded-xl` (12px)
  - Contrôles interactifs (boutons, inputs, déclencheurs de select) : `rounded-lg` (8px)
  - Micro-puces / Badges : `rounded-md` (6px) ou `rounded-full`

## 4. Vérification & Build
- Vérification TypeScript : `npm run lint` (alias `tsc --noEmit`).
- Build production : `npm run build` (`tsc && vite build`).
- Toujours passer `npm run lint` avant de considérer une tâche terminée.
