# 🏗️ SPECIFICATION TECHNIQUE & ARCHITECTURE BLUEPRINT
## SaaS Desktop Offline-First (Electron.js + Supabase)

---

## 📌 1. VUE D'ENSEMBLE DU PROJET

- **Nom du projet / Produit :** SaaS Desktop Offline-First
- **Cible :** Marché Panafricain & RDC en particulier, ainsi qu'International (African-First Architecture).
- **Plateformes supportées :** Windows, macOS, Linux (via Electron.js).
- **Modèle économique :**
  - Essai gratuit complet de 30 jours (Trial).
  - Abonnements payants à renouvellement par cycles : **1 mois**, **3 mois**, et **1 an**.
- **Exigence Fondamentale (Offline-First) :** L'application doit garantir une opérabilité à 100 % en l'absence totale de connexion Internet. Les données sont écrites localement sans latence. La synchronisation vers le Cloud Supabase et la mise à jour des droits/licences s'effectuent de façon asynchrone et transparente dès que le réseau devient disponible.

---

## 🛠️ 2. STACK TECHNIQUE OFFICIELLE & ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       CLIENT DESKTOP (Electron.js)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ UI Framework     : React + TypeScript + Vite + Tailwind CSS + Shadcn/UI     │
│ Local Database   : SQLite (via better-sqlite3) + Drizzle ORM                │
│ Security/Bridge  : ContextBridge + IPC + Validation Zod                     │
│ Hardware ID      : node-machine-id                                          │
│ Offline Crypto   : Validation locale Ed25519 (Clé Publique intégrée)       │
│ Sync Client      : PowerSync / ElectricSQL Client Sync Engine               │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │ (Sync asynchrone dès connexion)
┌─────────────────────────────────────▼───────────────────────────────────────┐
│                          BACKEND CLOUD (Supabase)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ Database         : Supabase PostgreSQL + Row Level Security (RLS)           │
│ Authentication   : Supabase Auth (JWT)                                      │
│ Business Logic   : Supabase Edge Functions (Deno / TypeScript)              │
├─────────────────────────────────────────────────────────────────────────────┤
│                         PASSERELLES DE PAIEMENT                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ RDC (Mobile)     : FlexPay API (M-Pesa, Orange, Airtel, Afrimoney)          │
│ International    : Flutterwave / Paystack API (Cartes Visa/MC & Mobile)    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ 3. DETAIL DES CHOIX TECHNIQUES

| Composant | Technologie | Rôle & Justification |
| :--- | :--- | :--- |
| **Desktop Core** | `Electron.js` + `Vite` + `TypeScript` | Environnement cross-platform stable, rechargement ultra-rapide (HMR), typage de bout en bout. |
| **Interface UI** | `React` + `Tailwind CSS` + `Shadcn/UI` | Design moderne, composants légers, réactivité fluide sans surcharge mémoire. |
| **Base Locale** | `better-sqlite3` + `Drizzle ORM` | Performances natives SQLite directes sur disque local, migrations typées et sécurisées. |
| **Cloud Database** | `Supabase` (PostgreSQL) | Solution Backend-as-a-Service complète, flexible et scalable avec support RLS. |
| **Engine Sync** | `PowerSync` (ou `ElectricSQL`) | Synchronisation bidirectionnelle SQLite ↔ Postgres avec résolution automatique des conflits. |
| **Paiement RDC** | `FlexPay API` | Intégration directe des Mobile Money de RDC (M-Pesa, Orange Money, Airtel, Afrimoney). |
| **Paiement Intl** | `Flutterwave API` | Support des cartes bancaires mondiales (Visa/Mastercard) et Mobile Money d'autres pays d'Afrique. |

---

## 🔐 4. STRATEGIE DE LICENCE ET TRIAL OFFLINE-FIRST

Afin de combiner une expérience 100 % hors-ligne et une protection contre la fraude :

1. **Génération d'Empreinte Matérielle (HWID) :**
   À la première exécution, le process Main d'Electron calcule l'empreinte unique de l'ordinateur via `node-machine-id` (combinaison CPU ID + Serial Disque).
2. **Génération de Licence Signée (Côté Serveur / Supabase) :**
   Lors de la création du compte (Trial 30 jours) ou après un paiement validé par Webhook, une Supabase Edge Function génère un jeton cryptographique signé avec une clé privée **Ed25519**.
   *Contenu du Payload :* `{ user_id, hwid, plan_type, starts_at, expires_at, grace_period_until }`.
3. **Vérification Hors-Ligne (Côté Client / Electron) :**
   - Le code client intègre uniquement la **clé publique** de vérification.
   - La validité de la licence et de la date d'expiration est contrôlée localement en mémoire sans aucun appel réseau.
4. **Période de Grâce (Grace Period) :**
   Si l'abonnement expire alors que la machine est hors-ligne, l'application accorde une période de grâce configurable (ex: 7 à 14 jours) avant de restreindre l'accès, permettant à l'utilisateur de se connecter pour renouveler.

---
## ⚡ 6. FLUX INTEGRAL DE PAIEMENT ET WORKFLOW

```
┌─────────────────┐       1. Choix du Plan (1m, 3m, 1an)        ┌─────────────────┐
│                 ├─────────────────────────────────────────────►│                 │
│ Application     │                                              │ Supabase Edge   │
│ Electron Local  │       2. Init Transaction & Payment URL     │ Function        │
│                 │◄─────────────────────────────────────────────┤                 │
└────────┬────────┘                                              └────────┬────────┘
         │                                                                │
         │ 3. Redirection / Prompt USSD Mobile Money                      │ 4. Envoi Webhook Callback
         ▼                                                                ▼
┌─────────────────────────────────┐                              ┌─────────────────┐
│ Passerelles de Paiement         │                              │                 │
│ - FlexPay (RDC Mobile Money)    ├─────────────────────────────►│ Webhook Handler │
│ - Flutterwave (Cards / Intl)    │   5. Confirmation Paiement   │ (Edge Function) │
└─────────────────────────────────┘                              └────────┬────────┘
                                                                          │
                                                                          │ 6. Calcul dates & Signature
                                                                          ▼
                                                                 ┌─────────────────┐
                                                                 │ Supabase DB     │
                                                                 │ (Table licenses)│
                                                                 └────────┬────────┘
                                                                          │
                                                                          │ 7. Sync auto si en ligne
                                                                          ▼
                                                                 ┌─────────────────┐
                                                                 │ Stockage Local  │
                                                                 │ (SQLite Client) │
                                                                 └─────────────────┘
```

---

## 🚀 7. FEUILLE DE ROUTE D'EXECUTION (POUR ANTIGRAVITY / GEMINI)

Pour implémenter ce projet pas à pas dans Project Antigravity, exécutez les modules dans cet ordre strict :

### Phase 1 : Core Electron & SQLite Local
- Initialiser le projet Electron avec Vite, React, TypeScript, Tailwind CSS, et Shadcn/UI.
- Mettre en place l'isolation IPC avec `contextBridge`.
- Configurer SQLite via `better-sqlite3` et configurer l'ORM `Drizzle`.

### Phase 2 : Moteur de Licence Offline & HWID
- Écrire le service de génération d'empreinte matérielle (`node-machine-id`).
- Implémenter la logique de vérification cryptographique `Ed25519` dans le process `Main` d'Electron.
- Créer le composant UI de blocage/avertissement en cas de licence expirée hors-ligne.

### Phase 3 : Intégration Supabase Cloud & PowerSync
- Configurer la connexion Supabase Client et l'authentification (Supabase Auth).
- Mettre en place PowerSync (ou ElectricSQL) pour la réplication bidirectionnelle arrière-plan entre SQLite et Supabase Postgres.

### Phase 4 : Edge Functions & Webhooks Paiement (FlexPay / Flutterwave)
- Écrire la Supabase Edge Function pour l'initialisation des paiements FlexPay (Mobile Money RDC) et Flutterwave.
- Écrire le handler Webhook sécurisé qui écoute le succès du paiement, génère la licence signée Ed25519, et met à jour la table `licenses`.
