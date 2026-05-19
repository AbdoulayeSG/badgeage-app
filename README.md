# BadgeApp — Système de badgeage et contrôle de présence

Application web complète de gestion de présence par QR code, construite avec React + Vite + Tailwind CSS et Firebase.

---

## 🚀 Installation

### Prérequis
- Node.js 18+
- Un projet Firebase (gratuit)

### 1. Installer les dépendances
```bash
cd badgeage-app
npm install
```

### 2. Configurer Firebase

#### a) Créer un projet Firebase
1. Aller sur [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Créer un nouveau projet
3. **Activer Authentication** → Email/Mot de passe
4. **Activer Firestore Database** (mode production)
5. Ajouter une **application web** (`</>`) et copier la configuration

#### b) Créer le fichier `.env`
Copier `.env.example` en `.env` et remplir les valeurs :
```bash
copy .env.example .env
```
Puis éditer `.env` :
```env
VITE_FIREBASE_API_KEY=votre_api_key
VITE_FIREBASE_AUTH_DOMAIN=votre_projet.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=votre_projet_id
VITE_FIREBASE_STORAGE_BUCKET=votre_projet.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=votre_sender_id
VITE_FIREBASE_APP_ID=votre_app_id
```

#### c) Règles Firestore
Dans Firebase Console → Firestore → Règles, coller le contenu du fichier `firestore.rules`.

### 3. Lancer en développement
```bash
npm run dev
```
Application disponible sur [http://localhost:5173](http://localhost:5173)

### 4. Build de production
```bash
npm run build
```

---

## 📋 Fonctionnalités

| Page | Description |
|------|-------------|
| 🔐 Login / Inscription | Auth sécurisée Firebase |
| 📊 Tableau de bord | Stats + courbe fréquentation 7 jours |
| 👥 Groupes | Créer, modifier, supprimer |
| 👤 Personnes | Ajouter, QR code PNG téléchargeable |
| 📷 Scanner | Caméra → enregistre arrivée/départ |
| 📅 Calendrier | Vue mensuelle des présences |
| 📈 Statistiques | Graphiques sur 7/14/30 jours |

---

## 🗄️ Structure Firestore

```
groups/        { userId, name, description, createdAt }
people/        { userId, groupId, firstName, lastName, email, phone, qrString, createdAt }
attendanceLogs/{ userId, personId, date, arrivalTime, departureTime, status }
```

---

## 🏗️ Structure du projet

```
src/
├── context/AuthContext.jsx    # Auth Firebase
├── components/
│   ├── Layout.jsx             # Sidebar
│   └── ProtectedRoute.jsx
├── pages/
│   ├── Login.jsx / Register.jsx
│   ├── Dashboard.jsx
│   ├── Groups.jsx
│   ├── People.jsx             # QR code
│   ├── Scanner.jsx            # Caméra
│   ├── Calendar.jsx
│   └── Statistics.jsx
├── firebase.js
├── App.jsx
└── index.css
```

---

## 🔒 Sécurité
Chaque utilisateur ne voit que ses propres données (`userId` isolé).  
Les règles Firestore (`firestore.rules`) bloquent tout accès non autorisé.

## 📱 Stack
React 19 · Vite · Tailwind CSS v4 · Firebase (Auth + Firestore) · recharts · html5-qrcode · qrcode.react · uuid · lucide-react
