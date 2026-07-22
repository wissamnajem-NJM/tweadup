# 🎓 Tweadup — Plateforme E-learning

Plateforme complète : **HTML/CSS/JS** (frontend) + **Node.js/Express** (backend) + **Neon PostgreSQL** (base de données) + **Vercel** (hébergement).

---

## 📁 Structure du projet

```
tweadup/
├── api/index.js          → Point d'entrée API pour Vercel (serverless)
├── app.js                → Application Express (routes + sécurité)
├── server.js             → Démarrage local (npm run dev)
├── config/db.js          → Connexion PostgreSQL (Neon)
├── middleware/auth.js    → JWT + contrôle des rôles
├── routes/               → auth, public, formations, student, learn, admin
├── scripts/
│   ├── schema.sql        → Schéma complet de la base (19 tables)
│   ├── initDb.js         → Crée les tables (npm run init-db)
│   ├── seed.js           → Remplit la base (npm run seed)
│   ├── seedData.js       → Les 30 formations et leurs 10 cours
│   └── contentGen.js     → Génération des contenus, quiz et examens
├── public/               → Tout le frontend (pages HTML, CSS, JS)
├── .env                  → TA configuration (à compléter)
└── vercel.json           → Routage Vercel (/api/* → serverless)
```

---

## ⚙️ ÉTAPE 1 — Configurer la base de données (obligatoire)

Ouvre le fichier **`.env`** et remplace la ligne `DATABASE_URL` par ta
**connection string Neon actuelle** :

> Neon Dashboard → ton projet → **Connection Details** → **Connection string**

Elle ressemble à :
```
DATABASE_URL=postgresql://neondb_owner:LE_MOT_DE_PASSE@ep-tiny-mud-as9jmvks.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

⚠️ **Important** : le mot de passe enregistré précédemment ne fonctionne plus
(erreur « password authentication failed »). Copie la connection string
**complète** depuis ton dashboard Neon.

Tu peux aussi changer `JWT_SECRET` (longue phrase aléatoire).

---

## 📦 ÉTAPE 2 — Installer et initialiser (dans le terminal de VS Code)

```bash
npm install
npm run setup-db
```

`npm run setup-db` fait 2 choses :
1. **init-db** : crée les 19 tables dans Neon (⚠️ efface les anciennes tables Tweadup)
2. **seed** : crée les 8 catégories, les **30 formations** avec leurs **300 cours**,
   **300 quiz** (10 questions chacun) et **30 examens finaux** (50 questions chacun),
   plus les comptes de départ.

---

## ▶️ ÉTAPE 3 — Lancer le site en local

```bash
npm run dev
```

Ouvre **http://localhost:3000** dans Chrome.

### Comptes créés automatiquement

| Rôle | Email | Mot de passe |
|---|---|---|
| 🛡️ **Admin** | `admin@gmail.com` | `Admin2005` |
| 👨‍🎓 **Étudiant démo** | `etudiant@tweadup.com` | `Etudiant2024!` |

L'étudiant démo est déjà inscrit à « Développement Web Complet » pour tester
immédiatement les cours, quiz et l'examen.

---

## 🚀 ÉTAPE 4 — Déployer sur Vercel (via GitHub)

### 1. Envoyer le projet sur GitHub (terminal VS Code)

```bash
git init
git add .
git commit -m "Tweadup - plateforme e-learning complète"
git branch -M main
git remote add origin https://github.com/TON_PSEUDO/tweadup.git
git push -u origin main
```

> Remplace `TON_PSEUDO` par ton nom d'utilisateur GitHub et crée d'abord un
> dépôt vide nommé `tweadup` sur github.com (New repository, **sans** README).
> Le fichier `.env` n'est PAS envoyé (il est dans `.gitignore`) — c'est normal et sécurisé.

### 2. Importer dans Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → importe le dépôt `tweadup`
2. Avant de cliquer Deploy, ouvre **Environment Variables** et ajoute :

| Name | Value |
|---|---|
| `DATABASE_URL` | ta connection string Neon (la même que dans `.env`) |
| `JWT_SECRET` | la même valeur que dans `.env` |
| `ADMIN_EMAIL` | `admin@gmail.com` |
| `ADMIN_PASSWORD` | `Admin2005` |

3. Clique **Deploy** → ton site est en ligne 🎉

Le dossier `public/` est servi automatiquement à la racine et `vercel.json`
redirige toutes les requêtes `/api/*` vers la fonction serverless `api/index.js`.

---

## 🧭 Parcours utilisateur

1. **Visiteur** → landing page (`/`) : stats, catégories, FAQ, contact
2. **Inscription** (`/register.html`) → profil étudiant créé automatiquement
3. **Catalogue** → « Demander l'inscription » → statut *En attente de traitement*
4. **Admin** (`/admin.html`) → onglet *Demandes* → ✅ Accepter → l'étudiant reçoit une notification
5. **Étudiant** → *Mes formations* → cours 1 débloqué → lit le cours, regarde la vidéo, passe le quiz (**≥ 70 %**) → cours 2 débloqué… jusqu'au cours 10
6. **Examen final** → 50 questions, minuterie 60 min, anti-copie, corrigé par le serveur (**≥ 70 %**)
7. **Certificat** généré automatiquement : numéro unique + QR code → téléchargeable en PDF, vérifiable sur `/verify.html`

---

## 🛠 Dépannage

| Problème | Solution |
|---|---|
| `password authentication failed` | Ta `DATABASE_URL` est périmée → recopie la connection string dans Neon |
| Le catalogue est vide | Lance `npm run setup-db` (avec la bonne `DATABASE_URL`) |
| Erreur 500 sur `/api/...` en ligne | Vérifie les 4 variables d'environnement dans Vercel → Settings → Environment Variables, puis **Redeploy** |
| « Session expirée » | Reconnecte-toi (token JWT valable 7 jours) |
| Tout recommencer à zéro | `npm run setup-db` recrée toutes les tables proprement |

---

## 🔐 Sécurité intégrée

- Mots de passe hachés avec **bcrypt** (jamais stockés en clair)
- Sessions par **JWT** signé (7 jours)
- Requêtes SQL **paramétrées** (anti-injection)
- Correction des quiz/examens **100 % côté serveur** : les bonnes réponses ne quittent jamais la base
- Examen : questions et réponses **mélangées**, minuterie, anti-copie côté client
- Certificats : numéro unique + code de vérification + QR code
- Rôles vérifiés sur **chaque route admin** côté serveur
