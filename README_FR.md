<p align="center">
   <a href="./README.md">EN</a>
</p>
<p align="center">
   <img src="art/logo-brand-light-mode.png#gh-light-mode-only" alt="XetaInvest Logo" height="230"/>
   <img src="art/logo-brand-dark-mode.png#gh-dark-mode-only" alt="XetaInvest Logo" height="230"/>
</p>

|                                                                                          Tests unitaires                                                                                           |                                                                     Version stable                                                                     |                                                    Laravel                                                    |                                                                      Licence                                                                       |
| :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :----------------------------------------------------------------------------------------------------------------------------------------------------: | :-----------------------------------------------------------------------------------------------------------: | :------------------------------------------------------------------------------------------------------------------------------------------------: |
| [![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/XetaIO/XetaInvest/tests.yml?style=flat-square)](https://github.com/XetaIO/Xetainvest/actions/workflows/tests.yml) | [![Latest Stable Version](https://img.shields.io/github/v/release/xetaio/xetainvest?style=flat-square)](https://github.com/XetaIO/XetaInvest/releases) | [![Laravel 13.0](https://img.shields.io/badge/Laravel-13.0-f4645f.svg?style=flat-square)](http://laravel.com) | [![License](https://img.shields.io/badge/license-MIT-brightgreen.svg?style=flat-square)](https://github.com/XetaIO/XetaInvest/blob/master/LICENSE) |

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

- **Back-end** : Laravel 13 (PHP 8.3+), Fortify/Sanctum (auth), Policies, Eloquent, Pest (tests)
- **Front-end** : React 19, Inertia.js, TypeScript, Tailwind CSS 4, shadcn/ui, Recharts
- **Base de données** : PostgreSQL 16+

## Installation et mises à jour

### Prérequis

- PHP 8.3 ou supérieur avec les extensions nécessaires à Laravel et PostgreSQL (`pdo_pgsql`, `mbstring`, `openssl`, `tokenizer`, `ctype`, `fileinfo`, etc.)
- Composer 2.6 ou supérieur
- Node.js 20.19+ ou 22.12+ et npm
- PostgreSQL 16 ou supérieur
- Git

Après l'installation des dépendances PHP, la commande `composer check-platform-reqs` permet de vérifier la version de PHP et les extensions.

### Installation locale

1. Clonez le dépôt :

```bash
git clone https://github.com/XetaIO/XetaInvest.git
cd XetaInvest
```

2. Installez les versions verrouillées des dépendances PHP et JavaScript :

```bash
composer install
npm ci
```

3. Créez le fichier d'environnement :

```bash
# macOS / Linux
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env

php artisan key:generate
```

4. Créez une base PostgreSQL :

```bash
createdb -U postgres xetainvest
```

Vous pouvez également la créer avec votre outil d'administration PostgreSQL. Configurez ensuite au minimum les valeurs suivantes dans `.env` :

```dotenv
APP_NAME=XetaInvest
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8000
APP_LOCALE=fr

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=xetainvest
DB_USERNAME=postgres
DB_PASSWORD=secret
```

Configurez aussi l'envoi des e-mails, `FINANCE_QUERY_*` et `OPENAI_*` dans ce fichier lorsque les fonctionnalités correspondantes sont utilisées. Ne commitez jamais `.env`.

5. Créez les tables de la base :

```bash
php artisan migrate
```

Pour obtenir une base de développement avec un utilisateur de test et des données de démonstration, utilisez `php artisan migrate --seed`. N'exécutez pas les seeders en production.

6. Démarrez Laravel, le listener de queue et Vite :

```bash
composer run dev
```

L'application est accessible sur [http://localhost:8000](http://localhost:8000), ou sur [http://xetainvest.test](http://xetainvest.test) avec Laravel Herd.

7. Lancez les principales vérifications :

```bash
composer test
npm run lint:check
npm run format:check
npm run types:check
npm run test:frontend
npm run build
```

### Mise à jour d'une installation locale

Commitez ou mettez de côté vos modifications locales, puis exécutez :

```bash
git pull --ff-only
composer install
npm ci
php artisan optimize:clear
php artisan migrate
```

Redémarrez `composer run dev` après la mise à jour. Utilisez `composer install` et `npm ci` pour reproduire les versions de `composer.lock` et `package-lock.json` ; n'utilisez pas `composer update` ou `npm update` sauf pour mettre volontairement à jour les dépendances dans une branche de développement.

### Installation sur un serveur de production

La procédure suivante cible un serveur Linux classique avec Nginx ou Apache, PHP-FPM et PostgreSQL. Remplacez `/var/www/xetainvest` et `www-data` par le chemin et le compte de service utilisés sur votre serveur.

1. Clonez le dépôt et sélectionnez la branche ou la version à déployer :

```bash
git clone https://github.com/XetaIO/XetaInvest.git /var/www/xetainvest
cd /var/www/xetainvest
git checkout main
```

Pour un déploiement stable, vous pouvez sélectionner un tag de version à la place de `main`.

2. Créez `.env` et configurez la production :

```bash
cp .env.example .env
```

Renseignez au minimum `APP_ENV=production`, `APP_DEBUG=false`, l'`APP_URL` publique en HTTPS, les identifiants PostgreSQL, l'envoi des e-mails et les éventuelles clés d'API finance ou IA. Ne changez plus `APP_KEY` une fois l'application utilisée.

3. Installez les dépendances, générez la première clé d'application, compilez le frontend et initialisez la base :

```bash
composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction
php artisan key:generate --force
npm ci
npm run build
php artisan migrate --force
php artisan storage:link
php artisan optimize
```

N'ajoutez pas `--seed` sur un serveur de production.

4. Accordez au compte PHP-FPM les droits d'écriture uniquement là où Laravel en a besoin :

```bash
chown -R www-data:www-data storage bootstrap/cache
chmod -R ug+rwX storage bootstrap/cache
```

5. Configurez l'hôte virtuel avec `/var/www/xetainvest/public` comme racine web. Activez HTTPS, transmettez les requêtes à `public/index.php` et n'exposez ni la racine du dépôt ni `.env`. L'endpoint de contrôle est `/up`.

6. Maintenez la queue de base de données active avec un gestionnaire de processus comme Supervisor ou systemd. La commande gérée doit être équivalente à :

```bash
php /var/www/xetainvest/artisan queue:work --sleep=3 --tries=3 --timeout=180
```

7. Exécutez le scheduler Laravel chaque minute avec le même compte de service que PHP-FPM :

```bash
* * * * * cd /var/www/xetainvest && php artisan schedule:run >> /dev/null 2>&1
```

Les snapshots de portefeuille et les rapports IA planifiés sont définis dans `routes/console.php` et utilisent le fuseau `Europe/Paris`.

### Mise à jour d'un serveur de production

Sauvegardez la base PostgreSQL et les fichiers persistants avant chaque mise à jour. Consultez les notes de version pour détecter d'éventuelles étapes supplémentaires, puis exécutez les commandes suivantes depuis le dossier de l'application :

```bash
cd /var/www/xetainvest

php artisan down --retry=60

git fetch --tags
git pull --ff-only origin main

composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction
php artisan optimize:clear
npm ci
npm run build

php artisan migrate --force
php artisan optimize
php artisan queue:restart

php artisan up
```

Pour déployer des tags de version, remplacez `git pull --ff-only origin main` par `git checkout <nouveau-tag>`. Redémarrez PHP-FPM uniquement si l'environnement PHP ou la configuration OPcache le nécessite. Si une commande de mise à jour échoue, conservez le mode maintenance, corrigez ou restaurez le déploiement, puis exécutez `php artisan up` seulement lorsque l'application est saine.

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
