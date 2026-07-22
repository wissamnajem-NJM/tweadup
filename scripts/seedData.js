// ==================================================================
//  TWEADUP — Données du catalogue : 8 catégories, 30 formations,
//  10 cours par formation, vraies vidéos YouTube par domaine.
// ==================================================================

const categories = [
  { nom: 'Développement Web',             slug: 'developpement-web',      icone: '🌐' },
  { nom: 'Programmation',                 slug: 'programmation',          icone: '💻' },
  { nom: 'Développement Mobile',          slug: 'mobile',                 icone: '📱' },
  { nom: 'Intelligence Artificielle & Data', slug: 'ia-data',             icone: '🤖' },
  { nom: 'Bases de données',              slug: 'bases-de-donnees',       icone: '🗄️' },
  { nom: 'Cybersécurité & Systèmes',      slug: 'cybersecurite-systemes', icone: '🔐' },
  { nom: 'DevOps & Cloud',                slug: 'devops-cloud',           icone: '☁️' },
  { nom: 'Design & Marketing',            slug: 'design-marketing',       icone: '🎨' }
];

const formations = [
  // -------------------- DÉVELOPPEMENT WEB --------------------
  {
    titre: 'Développement Web Complet', cat: 'developpement-web', niveau: 'Débutant', duree: 60,
    enseignant: 'Karim Benali',
    description: 'De zéro à développeur web : HTML, CSS, JavaScript, API et mise en ligne de ton premier site professionnel.',
    videos: ['G3e-cpL7ofc', 'lfmg-EJ8gm4', 'HGTJBPNC-Gw'],
    topics: [
      'Introduction au développement web : front-end, back-end et full-stack',
      'HTML5 : la structure d\'une page web',
      'CSS3 : mise en forme et mise en page',
      'Responsive design : adapter son site à tous les écrans',
      'JavaScript : les bases du langage',
      'JavaScript : manipuler le DOM',
      'Formulaires et validation côté client',
      'Introduction aux API et au format JSON',
      'Publier son site : hébergement, nom de domaine et déploiement',
      'Projet final : construire un site web complet'
    ]
  },
  {
    titre: 'HTML5 & CSS3', cat: 'developpement-web', niveau: 'Débutant', duree: 30,
    enseignant: 'Sophie Martin',
    description: 'Maîtrise les deux langages fondamentaux du web : structure sémantique avec HTML5 et mises en page modernes avec CSS3.',
    videos: ['HGTJBPNC-Gw', 'G3e-cpL7ofc', 'n4R2E7O-Ngo'],
    topics: [
      'Introduction à HTML : balises et structure',
      'Textes, liens et images en HTML',
      'Listes, tableaux et formulaires HTML',
      'HTML sémantique : header, nav, section et footer',
      'Introduction à CSS : sélecteurs et propriétés',
      'Couleurs, polices et textes en CSS',
      'Le modèle de boîte : marges, bordures et paddings',
      'Mise en page avec Flexbox',
      'Mise en page avec CSS Grid',
      'Animations et transitions CSS : projet final'
    ]
  },
  {
    titre: 'JavaScript', cat: 'developpement-web', niveau: 'Débutant', duree: 45,
    enseignant: 'Yassine El Amrani',
    description: 'Le langage incontournable du web : variables, fonctions, DOM, événements, asynchrone et projets interactifs.',
    videos: ['lfmg-EJ8gm4', '22WQ6u7Cd-c', 'voLJ3CmaM1s'],
    topics: [
      'Introduction à JavaScript et premiers scripts',
      'Variables, types de données et opérateurs',
      'Conditions et boucles',
      'Fonctions et portée des variables',
      'Tableaux et objets',
      'Le DOM : sélection et modification d\'éléments',
      'Les événements : clics, clavier et formulaires',
      'Programmation asynchrone : promesses et async/await',
      'Fetch API : consommer des données externes',
      'Projet final : application interactive en JavaScript'
    ]
  },
  {
    titre: 'React', cat: 'developpement-web', niveau: 'Intermédiaire', duree: 40,
    enseignant: 'Claire Dubois',
    description: 'Crée des interfaces modernes avec la bibliothèque la plus demandée : composants, hooks, router et API.',
    videos: ['CgkZ7MvWUAA', 'x4rFhThSX04'],
    topics: [
      'Introduction à React et création du premier projet',
      'JSX et composants',
      'Props et réutilisation des composants',
      'Le state avec useState',
      'Les événements et formulaires dans React',
      'Les effets avec useEffect',
      'Listes, clés et rendu conditionnel',
      'React Router : navigation entre pages',
      'Consommer une API dans React',
      'Projet final : application React complète'
    ]
  },
  {
    titre: 'Node.js & Express', cat: 'developpement-web', niveau: 'Intermédiaire', duree: 40,
    enseignant: 'Mehdi Rami',
    description: 'Construis des back-ends robustes : serveurs, API REST, base de données PostgreSQL et authentification JWT.',
    videos: ['RLtyhwFtXQA', '32M1al-Y6Ag'],
    topics: [
      'Introduction à Node.js et à son écosystème',
      'Modules, require et npm',
      'Le système de fichiers et les événements',
      'Créer un serveur HTTP natif',
      'Express : premières routes',
      'Middlewares et gestion des erreurs',
      'API REST : GET, POST, PUT et DELETE',
      'Connexion à une base de données PostgreSQL',
      'Authentification avec JWT',
      'Projet final : API REST complète'
    ]
  },
  {
    titre: 'PHP & MySQL', cat: 'developpement-web', niveau: 'Débutant', duree: 40,
    enseignant: 'Laura Bernard',
    description: 'Le duo classique du web dynamique : PHP côté serveur et MySQL pour stocker tes données en toute sécurité.',
    videos: ['zZ6vybT1HQs', 'BUCiSSyIGGU'],
    topics: [
      'Introduction à PHP et installation de l\'environnement',
      'Variables, types et opérateurs en PHP',
      'Conditions, boucles et fonctions',
      'Tableaux et superglobales',
      'Traitement des formulaires',
      'Sessions et cookies',
      'MySQL : créer une base et des tables',
      'PHP et MySQL : requêtes avec PDO',
      'Sécurité : injections SQL et mots de passe',
      'Projet final : site dynamique PHP/MySQL'
    ]
  },
  {
    titre: 'Laravel', cat: 'developpement-web', niveau: 'Intermédiaire', duree: 35,
    enseignant: 'Ahmed Tazi',
    description: 'Le framework PHP le plus élégant : routing, Blade, Eloquent, authentification et API en un temps record.',
    videos: ['2mqsVzgsV_c', 'BUCiSSyIGGU'],
    topics: [
      'Introduction à Laravel et installation',
      'Routage et contrôleurs',
      'Les vues avec Blade',
      'Migrations et modèles Eloquent',
      'Formulaires et validation',
      'Authentification avec Laravel Breeze',
      'Relations entre modèles',
      'Middlewares et autorisations',
      'API REST avec Laravel',
      'Projet final : application Laravel complète'
    ]
  },

  // -------------------- PROGRAMMATION --------------------
  {
    titre: 'Python', cat: 'programmation', niveau: 'Débutant', duree: 40,
    enseignant: 'Julie Moreau',
    description: 'Le langage le plus accessible pour débuter : syntaxe claire, projets concrets et porte d\'entrée vers la data et l\'IA.',
    videos: ['_uQrJ0TkZlc', 'K5KVEU3aaeQ', 'kqtD5dpn9C8'],
    topics: [
      'Introduction à Python et installation',
      'Variables, types de données et opérateurs',
      'Chaînes de caractères et leurs méthodes',
      'Conditions et boucles',
      'Listes, tuples et dictionnaires',
      'Fonctions et modules',
      'Gestion des erreurs et fichiers',
      'Programmation orientée objet en Python',
      'Bibliothèques utiles : requests, json et datetime',
      'Projet final : script Python complet'
    ]
  },
  {
    titre: 'Java', cat: 'programmation', niveau: 'Débutant', duree: 45,
    enseignant: 'Nicolas Petit',
    description: 'Le langage des grandes entreprises : POO rigoureuse, collections, exceptions et application console complète.',
    videos: ['xTtL8E4LzTQ', 'xk4_1vDrzzo'],
    topics: [
      'Introduction à Java et au JDK',
      'Variables, types primitifs et opérateurs',
      'Conditions et boucles en Java',
      'Méthodes et surcharge',
      'Tableaux et ArrayList',
      'Classes et objets',
      'Héritage et polymorphisme',
      'Interfaces et classes abstraites',
      'Exceptions et collections',
      'Projet final : application console Java'
    ]
  },
  {
    titre: 'C++', cat: 'programmation', niveau: 'Intermédiaire', duree: 45,
    enseignant: 'Amina Chraibi',
    description: 'Performance et contrôle : mémoire, pointeurs, POO et bibliothèque standard pour des programmes rapides.',
    videos: ['-TkoO8Z07hI', 'ZzaPdXTrSb8'],
    topics: [
      'Introduction au C++ et à la compilation',
      'Variables, types et entrées/sorties',
      'Conditions et boucles',
      'Fonctions et portée',
      'Tableaux et pointeurs',
      'Références et allocation mémoire',
      'Structures et classes',
      'Héritage et polymorphisme',
      'La bibliothèque standard (STL)',
      'Projet final : programme C++ complet'
    ]
  },
  {
    titre: 'C#', cat: 'programmation', niveau: 'Débutant', duree: 40,
    enseignant: 'Thomas Leroy',
    description: 'Le langage de l\'écosystème .NET : syntaxe moderne, POO, LINQ et bases pour le web, le desktop et les jeux.',
    videos: ['wxznTygnRfQ', 'qZpMX8Re_2Q', 'b4UhLsx-K44'],
    topics: [
      'Introduction à C# et à .NET',
      'Variables, types et opérateurs',
      'Conditions et boucles',
      'Méthodes et paramètres',
      'Tableaux et listes',
      'Classes, propriétés et objets',
      'Héritage et interfaces',
      'LINQ et collections',
      'Gestion des exceptions et fichiers',
      'Projet final : application console C#'
    ]
  },

  // -------------------- MOBILE --------------------
  {
    titre: 'Flutter', cat: 'mobile', niveau: 'Débutant', duree: 40,
    enseignant: 'Sara Bennis',
    description: 'Un seul code pour iOS et Android : widgets, navigation, état, API et publication de ta première application.',
    videos: ['3kaGC_DrUnw', 'DsTMhjaRQws'],
    topics: [
      'Introduction à Flutter et Dart',
      'Installation et premier projet Flutter',
      'Les widgets de base',
      'Mise en page : Row, Column et Container',
      'Navigation entre écrans',
      'Formulaires et champs de saisie',
      'Gestion de l\'état avec setState et Provider',
      'Consommer une API REST',
      'Animations et thèmes',
      'Projet final : application mobile Flutter'
    ]
  },
  {
    titre: 'Android avec Kotlin', cat: 'mobile', niveau: 'Intermédiaire', duree: 45,
    enseignant: 'David Renard',
    description: 'Développe des applications Android natives modernes : Kotlin, Jetpack Compose, Room et Retrofit.',
    videos: ['NMOdEHyMXBo', 'blKkRoZPxLc'],
    topics: [
      'Introduction à Android et Kotlin',
      'Android Studio et structure d\'un projet',
      'Interfaces avec XML et les vues de base',
      'Activities et cycles de vie',
      'Intents et navigation',
      'RecyclerView et listes',
      'Jetpack Compose : l\'UI moderne',
      'Bases de données avec Room',
      'Appels réseau avec Retrofit',
      'Projet final : application Android complète'
    ]
  },

  // -------------------- IA & DATA --------------------
  {
    titre: 'Intelligence Artificielle', cat: 'ia-data', niveau: 'Débutant', duree: 30,
    enseignant: 'Nadia Lahlou',
    description: 'Comprends l\'IA de A à Z : machine learning, deep learning, IA générative, enjeux éthiques et métiers du secteur.',
    videos: ['ZTt3oKiVq-w', 'TO97VtyPcdE', 'VGFpV3Qj4as'],
    topics: [
      'Introduction à l\'intelligence artificielle',
      'Histoire et grandes familles de l\'IA',
      'Machine learning vs deep learning',
      'Les données : le carburant de l\'IA',
      'Réseaux de neurones : les bases',
      'IA générative et grands modèles de langage',
      'Vision par ordinateur et traitement du langage',
      'Éthique et biais de l\'IA',
      'Outils et métiers de l\'IA',
      'Projet final : concevoir un cas d\'usage d\'IA'
    ]
  },
  {
    titre: 'Machine Learning', cat: 'ia-data', niveau: 'Intermédiaire', duree: 40,
    enseignant: 'Marc Girard',
    description: 'Crée tes premiers modèles prédictifs : régression, arbres, clustering et évaluation avec scikit-learn.',
    videos: ['hDKCxebp88A', '7eh4d6sabA0'],
    topics: [
      'Introduction au machine learning',
      'Types d\'apprentissage : supervisé, non supervisé et par renforcement',
      'Préparation et nettoyage des données',
      'Régression linéaire et logistique',
      'Arbres de décision et forêts aléatoires',
      'KNN et machines à vecteurs de support (SVM)',
      'Clustering avec K-means',
      'Évaluation des modèles : précision, rappel et F1-score',
      'Scikit-learn en pratique',
      'Projet final : modèle de machine learning complet'
    ]
  },
  {
    titre: 'Deep Learning', cat: 'ia-data', niveau: 'Avancé', duree: 45,
    enseignant: 'Ines Fassi',
    description: 'Au cœur des réseaux de neurones : CNN, RNN, TensorFlow, transfer learning et transformers.',
    videos: ['tpCFfeUEGs8', '72s6hJwyfDg'],
    topics: [
      'Introduction au deep learning',
      'Perceptron et réseaux de neurones',
      'Fonctions d\'activation et descente de gradient',
      'Rétropropagation et optimisation',
      'Réseaux convolutifs (CNN) pour les images',
      'Réseaux récurrents (RNN) et LSTM pour les séquences',
      'TensorFlow et Keras en pratique',
      'Transfer learning',
      'Transformers et mécanisme d\'attention',
      'Projet final : entraîner un réseau de neurones'
    ]
  },
  {
    titre: 'Data Science avec Python', cat: 'ia-data', niveau: 'Intermédiaire', duree: 40,
    enseignant: 'Paul Fontaine',
    description: 'Analyse des données comme un pro : NumPy, Pandas, visualisation, statistiques et premier modèle de ML.',
    videos: ['gDZ6czwuQ18', 'hDKCxebp88A'],
    topics: [
      'Introduction à la data science',
      'L\'environnement Python : Jupyter et notebooks',
      'NumPy : le calcul numérique',
      'Pandas : manipulation de données',
      'Nettoyage et préparation des données',
      'Visualisation avec Matplotlib et Seaborn',
      'Analyse exploratoire des données (EDA)',
      'Statistiques pour la data science',
      'Introduction au machine learning',
      'Projet final : analyse complète d\'un jeu de données'
    ]
  },

  // -------------------- BASES DE DONNÉES --------------------
  {
    titre: 'SQL', cat: 'bases-de-donnees', niveau: 'Débutant', duree: 25,
    enseignant: 'Leila Mansouri',
    description: 'Le langage des bases de données : requêtes, jointures, agrégations et conception d\'une base bien normalisée.',
    videos: ['7S_tz1z_5bA', 'SpfIwlAYaKk'],
    topics: [
      'Introduction aux bases de données relationnelles',
      'SELECT : interroger une table',
      'WHERE : filtrer les données',
      'ORDER BY, LIMIT et DISTINCT',
      'Fonctions d\'agrégation : COUNT, SUM et AVG',
      'GROUP BY et HAVING',
      'Jointures : INNER, LEFT et RIGHT',
      'Sous-requêtes',
      'INSERT, UPDATE et DELETE',
      'Conception d\'une base : clés et normalisation'
    ]
  },
  {
    titre: 'PostgreSQL', cat: 'bases-de-donnees', niveau: 'Intermédiaire', duree: 30,
    enseignant: 'Hugo Marchand',
    description: 'La base open source la plus avancée : tables, contraintes, index, transactions et administration.',
    videos: ['SpfIwlAYaKk', '7S_tz1z_5bA'],
    topics: [
      'Introduction à PostgreSQL et installation',
      'psql et pgAdmin : les outils',
      'Créer des tables et types de données',
      'Requêtes SELECT avancées',
      'Contraintes : clés primaires et étrangères',
      'Jointures et sous-requêtes',
      'Fonctions, vues et index',
      'Transactions et gestion de la concurrence',
      'Sauvegarde, restauration et rôles',
      'Projet final : base PostgreSQL optimisée'
    ]
  },

  // -------------------- CYBERSÉCURITÉ & SYSTÈMES --------------------
  {
    titre: 'Cybersécurité', cat: 'cybersecurite-systemes', niveau: 'Débutant', duree: 40,
    enseignant: 'Rania Idrissi',
    description: 'Protège systèmes et données : menaces, cryptographie, sécurité web, tests d\'intrusion et réponse aux incidents.',
    videos: ['s19BxFpoSd0', 'HZzXbxajz80'],
    topics: [
      'Introduction à la cybersécurité',
      'Les grandes menaces : malwares, phishing et ransomware',
      'Sécurité des réseaux',
      'Cryptographie : chiffrement et hachage',
      'Sécurité des applications web',
      'Tests d\'intrusion et hacking éthique',
      'Sécurité des systèmes Linux et Windows',
      'Gestion des identités et des accès',
      'Réponse aux incidents et forensique',
      'Projet final : audit de sécurité complet'
    ]
  },
  {
    titre: 'Linux Administration', cat: 'cybersecurite-systemes', niveau: 'Débutant', duree: 35,
    enseignant: 'Julien Robert',
    description: 'Dompte le système des serveurs : terminal, permissions, paquets, scripts Bash et sécurisation SSH.',
    videos: ['sWbUDq4S6Y8'],
    topics: [
      'Introduction à Linux et aux distributions',
      'Le terminal et les commandes de base',
      'Arborescence et manipulation des fichiers',
      'Permissions et utilisateurs',
      'Gestion des paquets',
      'Processus et services',
      'Scripts Bash',
      'Réseau sous Linux',
      'SSH et sécurisation d\'un serveur',
      'Projet final : administrer un serveur Linux'
    ]
  },

  // -------------------- DEVOPS & CLOUD --------------------
  {
    titre: 'Docker', cat: 'devops-cloud', niveau: 'Intermédiaire', duree: 30,
    enseignant: 'Fatima Zahra Alami',
    description: 'Conteneurise tes applications : images, Dockerfile, volumes, réseaux et Docker Compose.',
    videos: ['pTFZFxd4hOI', 'RqTEHSBrYFw', 'pg19Z8LL06w'],
    topics: [
      'Introduction à la conteneurisation et à Docker',
      'Installation et premiers conteneurs',
      'Images et conteneurs : les concepts clés',
      'Dockerfile : créer ses propres images',
      'Volumes et persistance des données',
      'Réseaux Docker',
      'Docker Compose : applications multi-conteneurs',
      'Registres et publication d\'images',
      'Bonnes pratiques et sécurité',
      'Projet final : application conteneurisée'
    ]
  },
  {
    titre: 'Kubernetes', cat: 'devops-cloud', niveau: 'Avancé', duree: 35,
    enseignant: 'Antoine Perrin',
    description: 'Orchestre tes conteneurs à grande échelle : pods, déploiements, services, Helm et scalabilité.',
    videos: ['2T86xAtR6Fo', 'RqTEHSBrYFw'],
    topics: [
      'Introduction à Kubernetes et à l\'orchestration',
      'Architecture : nœuds, pods et control plane',
      'Déploiements et ReplicaSets',
      'Services et exposition des applications',
      'Volumes et stockage persistant',
      'ConfigMaps et Secrets',
      'Ingress et gestion du trafic',
      'Helm : le gestionnaire de paquets',
      'Surveillance et scalabilité',
      'Projet final : déployer une application sur Kubernetes'
    ]
  },
  {
    titre: 'DevOps & CI/CD', cat: 'devops-cloud', niveau: 'Intermédiaire', duree: 35,
    enseignant: 'Salma Berrada',
    description: 'Automatise tout, du code à la production : Git, pipelines CI/CD, tests, conteneurs et monitoring.',
    videos: ['6GQRb4fGvtk', 'ixJ9ZfmyGZQ'],
    topics: [
      'Introduction à la culture DevOps',
      'Git et gestion de versions',
      'Intégration continue (CI)',
      'Déploiement continu (CD)',
      'Pipelines avec GitHub Actions',
      'Conteneurisation avec Docker',
      'Infrastructure as Code : les principes',
      'Tests automatisés et qualité',
      'Monitoring et journalisation',
      'Projet final : pipeline CI/CD complet'
    ]
  },
  {
    titre: 'Cloud Computing', cat: 'devops-cloud', niveau: 'Débutant', duree: 30,
    enseignant: 'Olivier Dumont',
    description: 'Comprends le cloud : IaaS, PaaS, SaaS, stockage, réseaux, serverless et optimisation des coûts.',
    videos: ['2LaAJq1lB1Q', 'j_StCjwpfmk'],
    topics: [
      'Introduction au cloud computing',
      'Modèles de service : IaaS, PaaS et SaaS',
      'Modèles de déploiement : public, privé et hybride',
      'Calcul et machines virtuelles dans le cloud',
      'Stockage cloud',
      'Réseaux et sécurité cloud',
      'Bases de données cloud',
      'Serverless et fonctions',
      'Coûts et optimisation',
      'Projet final : architecture cloud complète'
    ]
  },
  {
    titre: 'AWS', cat: 'devops-cloud', niveau: 'Intermédiaire', duree: 35,
    enseignant: 'Khadija El Fassi',
    description: 'Le cloud d\'Amazon : EC2, S3, IAM, VPC, RDS, Lambda et déploiement d\'une application complète.',
    videos: ['2OHr0QnEkg4', 'j_StCjwpfmk'],
    topics: [
      'Introduction à AWS et à son infrastructure',
      'IAM : identités et permissions',
      'EC2 : les serveurs virtuels',
      'S3 : le stockage d\'objets',
      'VPC : les réseaux dans AWS',
      'RDS : les bases de données managées',
      'Lambda et le serverless',
      'CloudWatch : la supervision',
      'Sécurité et bonnes pratiques',
      'Projet final : déployer une application sur AWS'
    ]
  },
  {
    titre: 'Microsoft Azure', cat: 'devops-cloud', niveau: 'Intermédiaire', duree: 30,
    enseignant: 'Maxime Olivier',
    description: 'Le cloud de Microsoft : VM, stockage, réseaux, identité Entra et préparation aux concepts de la certification AZ-900.',
    videos: ['8n-kWJetQRk', '2LaAJq1lB1Q'],
    topics: [
      'Introduction à Microsoft Azure',
      'Concepts cloud et modèles de service',
      'Comptes, abonnements et portail Azure',
      'Machines virtuelles et App Services',
      'Stockage Azure',
      'Réseaux virtuels',
      'Identité avec Microsoft Entra ID',
      'Bases de données Azure',
      'Sécurité, conformité et coûts',
      'Projet final : architecture Azure complète'
    ]
  },
  {
    titre: 'Git & GitHub', cat: 'devops-cloud', niveau: 'Débutant', duree: 20,
    enseignant: 'Yasmine Kaci',
    description: 'L\'outil indispensable du développeur : commits, branches, conflits, pull requests et collaboration.',
    videos: ['mAFoROnOfHs', 'rH3zE7VlIMs', 'zTjRZNkhiEU'],
    topics: [
      'Introduction à la gestion de versions',
      'Installation et configuration de Git',
      'Premiers commits et suivi des fichiers',
      'Historique et navigation dans les versions',
      'Branches : créer et fusionner',
      'Résoudre les conflits',
      'GitHub : dépôts distants, push et pull',
      'Pull requests et collaboration',
      'Bonnes pratiques : .gitignore, README et conventions',
      'Projet final : workflow Git complet'
    ]
  },

  // -------------------- DESIGN & MARKETING --------------------
  {
    titre: 'UI/UX Design', cat: 'design-marketing', niveau: 'Débutant', duree: 30,
    enseignant: 'François Barbier',
    description: 'Conçois des interfaces que les utilisateurs adorent : recherche, wireframes, Figma, prototypage et tests.',
    videos: ['mT_Jjn8RJdo', 'jwCmIBJ8Jtc', 'QJBP2uy8LcU'],
    topics: [
      'Introduction à l\'UI et à l\'UX design',
      'Principes de l\'expérience utilisateur',
      'Recherche utilisateur et personas',
      'Architecture de l\'information',
      'Wireframes et zonings',
      'Couleurs, typographie et grille',
      'Figma : les bases',
      'Composants et auto-layout dans Figma',
      'Prototypage et tests utilisateurs',
      'Projet final : maquette complète d\'une application'
    ]
  },
  {
    titre: 'Marketing Digital', cat: 'design-marketing', niveau: 'Débutant', duree: 30,
    enseignant: 'Emma Lefebvre',
    description: 'Fais connaître un produit en ligne : SEO, publicités, réseaux sociaux, emailing, analytics et plan complet.',
    videos: ['5altc8xTzBg'],
    topics: [
      'Introduction au marketing digital',
      'Stratégie et entonnoir de conversion',
      'SEO : le référencement naturel',
      'Publicité en ligne : Google Ads et Meta Ads',
      'Marketing des réseaux sociaux',
      'Email marketing',
      'Création de contenu et copywriting',
      'Analyse de données : Google Analytics',
      'Personal branding et communauté',
      'Projet final : plan marketing digital complet'
    ]
  }
];

module.exports = { categories, formations };
