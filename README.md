<p align="center">
   <a href="./README_FR.md">🇫🇷</a>
</p>

<p align="center">
   <img src="art/logo-brand-light-mode.png#gh-light-mode-only" alt="XetaInvest Logo" height="230"/>
   <img src="art/logo-brand-dark-mode.png#gh-dark-mode-only" alt="XetaInvest Logo" height="230"/>
</p>

|                                                                                             Unit Tests                                                                                             |                                                                     Stable Version                                                                     |                                                    Laravel                                                    |                                                                      License                                                                       |
| :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :----------------------------------------------------------------------------------------------------------------------------------------------------: | :-----------------------------------------------------------------------------------------------------------: | :------------------------------------------------------------------------------------------------------------------------------------------------: |
| [![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/XetaIO/XetaInvest/tests.yml?style=flat-square)](https://github.com/XetaIO/Xetainvest/actions/workflows/tests.yml) | [![Latest Stable Version](https://img.shields.io/github/v/release/xetaio/xetainvest?style=flat-square)](https://github.com/XetaIO/XetaInvest/releases) | [![Laravel 13.0](https://img.shields.io/badge/Laravel-13.0-f4645f.svg?style=flat-square)](http://laravel.com) | [![License](https://img.shields.io/badge/license-MIT-brightgreen.svg?style=flat-square)](https://github.com/XetaIO/XetaInvest/blob/master/LICENSE) |

**XetaInvest** is a modern web application for managing investment portfolios, financial analysis, and budgeting, designed for individual investors and finance enthusiasts.

## Main Features

- **Multi-portfolio management**: Add, edit, and track multiple portfolios (stocks, ETFs, etc.).
- **Position tracking**: Record your transactions (buy, sell, dividends) and visualize your holdings over time.
- **Advanced statistics**: Analyze your portfolio performance (gains, returns, allocation, etc.).
- **Budget & savings**: Monthly budgeting module, automatic calculation of available savings for investment.
- **Compound interest calculator**: Project your capital growth over several scenarios (optimistic, median, pessimistic) with customizable compounding frequency.
- **AI features**:
    - **AI Chat Assistant**: Ask questions about your investments, markets, or financial concepts in natural language.
    - **Portfolio report generation**: Get detailed, AI-generated reports and insights on your portfolios.
    - **Watchlist analysis**: Generate smart summaries and risk/return analysis for your watchlists.
- **Financial news**: Aggregation of news and analysis for your tracked assets.
- **Watchlists**: Create custom watchlists.
- **Security**: Strong authentication (2FA, passkeys), strict policies on all sensitive data.

## Technical Stack

- **Back-end**: Laravel 13 (PHP 8.3+), Fortify/Sanctum (auth), Policies, Eloquent, Pest (tests)
- **Front-end**: React 19, Inertia.js, TypeScript, Tailwind CSS 4, shadcn/ui, Recharts
- **Database**: PostgreSQL 16+

## Installation and updates

### Prerequisites

- PHP 8.3 or later with the extensions required by Laravel and PostgreSQL (`pdo_pgsql`, `mbstring`, `openssl`, `tokenizer`, `ctype`, `fileinfo`, etc.)
- Composer 2.6 or later
- Node.js 20.19+ or 22.12+ and npm
- PostgreSQL 16 or later
- Git

After installing the PHP dependencies, `composer check-platform-reqs` can be used to check the PHP version and extensions.

### Local installation

1. Clone the repository:

```bash
git clone https://github.com/XetaIO/XetaInvest.git
cd XetaInvest
```

2. Install the locked PHP and JavaScript dependencies:

```bash
composer install
npm ci
```

3. Create the environment file:

```bash
# macOS / Linux
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env

php artisan key:generate
```

4. Create a PostgreSQL database:

```bash
createdb -U postgres xetainvest
```

Alternatively, create it with your PostgreSQL administration tool. Then configure at least the following values in `.env`:

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

Configure mail delivery, `FINANCE_QUERY_*`, and `OPENAI_*` in the same file when the corresponding features are needed. Never commit `.env`.

5. Create the database tables:

```bash
php artisan migrate
```

For a development database containing a test user and demonstration data, use `php artisan migrate --seed`. Do not run the seeders in production.

6. Start Laravel, the queue listener, and Vite:

```bash
composer run dev
```

The application is available at [http://localhost:8000](http://localhost:8000), or at [http://xetainvest.test](http://xetainvest.test) when using Laravel Herd.

7. Run the main validation commands:

```bash
composer test
npm run lint:check
npm run format:check
npm run types:check
npm run test:frontend
npm run build
```

### Updating a local installation

Commit or stash local changes first, then run:

```bash
git pull --ff-only
composer install
npm ci
php artisan optimize:clear
php artisan migrate
```

Restart `composer run dev` after the update. Use `composer install` and `npm ci` to reproduce the versions in `composer.lock` and `package-lock.json`; do not use `composer update` or `npm update` unless intentionally updating dependencies in a development branch.

### Production server installation

The following procedure targets a conventional Linux server with Nginx or Apache, PHP-FPM, and PostgreSQL. Replace `/var/www/xetainvest` and `www-data` with the path and service account used by your server.

1. Clone the repository and select the branch or release to deploy:

```bash
git clone https://github.com/XetaIO/XetaInvest.git /var/www/xetainvest
cd /var/www/xetainvest
git checkout main
```

For a stable deployment, a release tag can be checked out instead of `main`.

2. Create `.env` and configure production:

```bash
cp .env.example .env
```

At minimum, set `APP_ENV=production`, `APP_DEBUG=false`, the public HTTPS `APP_URL`, PostgreSQL credentials, mail delivery, and any required finance or AI API credentials. Keep `APP_KEY` unchanged after the application is in use.

3. Install dependencies, generate the first application key, build the frontend, and initialize the database:

```bash
composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction
php artisan key:generate --force
npm ci
npm run build
php artisan migrate --force
php artisan storage:link
php artisan optimize
```

Do not add `--seed` on a production server.

4. Give the PHP-FPM service account write access only where Laravel needs it:

```bash
chown -R www-data:www-data storage bootstrap/cache
chmod -R ug+rwX storage bootstrap/cache
```

5. Configure the virtual host with `/var/www/xetainvest/public` as its document root. Enable HTTPS, route requests through `public/index.php`, and do not expose the repository root or `.env`. The health endpoint is `/up`.

6. Keep the database queue running with a process manager such as Supervisor or systemd. The managed command should be equivalent to:

```bash
php /var/www/xetainvest/artisan queue:work --sleep=3 --tries=3 --timeout=180
```

7. Run the Laravel scheduler every minute under the same service account as PHP-FPM:

```bash
* * * * * cd /var/www/xetainvest && php artisan schedule:run >> /dev/null 2>&1
```

Scheduled portfolio snapshots and AI reports are defined in `routes/console.php` and use the `Europe/Paris` timezone.

### Updating a production server

Back up the PostgreSQL database and persistent files before every update. Review the release notes for additional steps, then run the following from the application directory:

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

When deploying release tags, replace `git pull --ff-only origin main` with `git checkout <new-release-tag>`. Restart PHP-FPM only when the PHP runtime or OPcache configuration requires it. If an update command fails, leave maintenance mode enabled, fix or restore the deployment, and run `php artisan up` only when the application is healthy.

## Security

- Strong authentication (2FA, passkeys, email)
- All sensitive routes protected by policies
- Encrypted data in the database (tokens, secrets)
- Regular security audits (`npm audit`, `composer audit`)

## Screenshots

You can find presentation screenshots of XetaInvest in the [`docs/screenshots/`](docs/screenshots/) folder.

## finance-query Library

XetaInvest integrates the [finance-query](https://github.com/Verdenroz/finance-query) library to provide advanced financial data extraction and analysis features.

For more details, see the [finance-query documentation](https://github.com/Verdenroz/finance-query).

## Contributing

- Fork the repo, create a branch, open a PR.
- Follow the code style (`vendor/bin/pint --dirty`, `npm run lint`).
- Add tests for any new feature.

## License

MIT
