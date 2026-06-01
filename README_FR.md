<p align="center">
   <a href="./README.md">EN</a>
</p>
<p align="center">
   <img src="art/logo-brand-light-mode.png#gh-light-mode-only" alt="XetaInvest Logo" height="230"/>
   <img src="art/logo-brand-dark-mode.png#gh-dark-mode-only" alt="XetaInvest Logo" height="230"/>
</p>

|Tests unitaires|Version stable|Laravel|Licence|
|:------:|:-------:|:------:|:-------:|
|[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/XetaIO/XetaInvest/tests.yml?style=flat-square)](https://github.com/XetaIO/Xetainvest/actions/workflows/tests.yml)|[![Latest Stable Version](https://img.shields.io/github/v/release/xetaio/xetainvest?style=flat-square)](https://github.com/XetaIO/XetaInvest/releases)| [![Laravel 13.0](https://img.shields.io/badge/Laravel-13.0-f4645f.svg?style=flat-square)](http://laravel.com) |[![License](https://img.shields.io/badge/license-MIT-brightgreen.svg?style=flat-square)](https://github.com/XetaIO/XetaInvest/blob/master/LICENSE)|

**XetaInvest** est une application web moderne pour la gestion de portefeuilles d'investissement, l'analyse financière et la gestion de budget, conçue pour les investisseurs particuliers et les passionnés de finance.

## Fonctionnalités principales

- **Gestion multi-portefeuilles** : Ajoutez, modifiez et suivez plusieurs portefeuilles (actions, ETF, etc.).
- **Suivi des positions** : Enregistrez vos transactions (achat, vente, dividendes) et visualisez l'évolution de vos avoirs dans le temps.
- **Statistiques avancées** : Analysez la performance de vos portefeuilles (gains, rendements, allocation, etc.).
- **Budget & épargne** : Module de budget mensuel, calcul automatique de l'épargne disponible à investir.
- **Calculateur d'intérêt composé** : Projetez la croissance de votre capital sur plusieurs scénarios (optimiste, médian, pessimiste) avec une fréquence de capitalisation personnalisable.
- **Fonctionnalités IA** :
   - **Assistant IA** : Posez des questions sur vos investissements, les marchés ou des concepts financiers en langage naturel.
   - **Génération de rapports de portefeuille** : Obtenez des rapports détaillés et des analyses générées par IA sur vos portefeuilles.
   - **Analyse de watchlist** : Générez des synthèses intelligentes et des analyses risque/rendement pour vos listes de suivi.
- **Actualités financières** : Agrégation de news et d'analyses pour vos actifs suivis.
- **Watchlists** : Créez des listes de suivi personnalisées.
- **Sécurité** : Authentification forte (2FA, passkeys), politiques strictes sur toutes les données sensibles.

## Stack technique

- **Back-end** : Laravel 13 (PHP 8.4), Fortify/Sanctum (auth), Policies, Eloquent, Pest (tests)
- **Front-end** : React 19, Inertia.js, TypeScript, Tailwind CSS 4, shadcn/ui, Recharts
- **Base de données** : PostgreSQL

## Installation

### Prérequis
- PHP >= 8.4
- Node.js >= 20
- Composer >= 2.6
- PostgreSQL >= 15

### 1. Cloner le dépôt
```bash
git clone <repo-url>
cd XetaInvest
```

### 2. Installer les dépendances
```bash
composer install
npm install
```

### 3. Configurer l'environnement
Copiez `.env.example` en `.env` et renseignez vos variables (DB, mail, etc.) :
```bash
cp .env.example .env
```
Générez la clé d'application :
```bash
php artisan key:generate
```

### 4. Créer la base de données
Créez une base PostgreSQL et renseignez les identifiants dans `.env` :
```
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=xetainvest
DB_USERNAME=postgres
DB_PASSWORD=secret
```

### 5. Lancer les migrations et seeders
```bash
php artisan migrate --seed
```

### 6. Démarrer le serveur de développement
```bash
composer run dev
```
Cela lance le backend Laravel, le frontend Vite et le worker de queue.

Accédez à l'application sur : [http://xetainvest.test](http://xetainvest.test) (via Laravel Herd) ou [http://localhost:8000](http://localhost:8000)

### 7. Lancer les tests
```bash
php artisan test
npm run lint
```

## Tâches planifiées

XetaInvest utilise le scheduler Laravel pour automatiser les tâches récurrentes (imports de données, génération de rapports, etc.).

Pour garantir l'exécution des commandes planifiées, ajoutez une tâche cron sur votre serveur :

```bash
* * * * * cd /path/to/XetaInvest && php artisan schedule:run >> /dev/null 2>&1
```

Cela déclenchera le scheduler chaque minute et exécutera les tâches dues définies dans `app/Console/Kernel.php`.

## Sécurité
- Authentification forte (2FA, passkeys, email)
- Toutes les routes sensibles protégées par des policies
- Données sensibles chiffrées en base (tokens, secrets)
- Audits réguliers (`npm audit`, `composer audit`)

## Captures d'écran

Des captures de présentation sont disponibles dans le dossier [`docs/screenshots/`](docs/screenshots/).

## Bibliothèque finance-query

XetaInvest intègre la bibliothèque [finance-query](https://github.com/Verdenroz/finance-query) pour l'extraction et l'analyse avancée de données financières.

Pour plus de détails, voir la [documentation finance-query](https://github.com/Verdenroz/finance-query).

## Contribuer
- Forkez le repo, créez une branche, ouvrez une PR.
- Respectez le style de code (`vendor/bin/pint --dirty`, `npm run lint`).
- Ajoutez des tests pour toute nouvelle fonctionnalité.

## Licence
MIT
