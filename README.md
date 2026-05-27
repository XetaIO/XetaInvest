
<p align="center">
   <img src="art/logo-brand-light-mode.png#gh-light-mode-only" alt="XetaInvest Logo" height="230"/>
   <img src="art/logo-brand-dark-mode.png#gh-dark-mode-only" alt="XetaInvest Logo" height="230"/>
</p>

|Unit Tests|Stable Version|Downloads|Laravel|License|
|:------:|:-------:|:------:|:-------:|:------:|
|[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/XetaIO/XetaInvest/tests.yml?style=flat-square)](https://github.com/XetaIO/Xetainvest/actions/workflows/tests.yml)|[![Latest Stable Version](https://img.shields.io/github/v/release/xetaio/xetainvest?style=flat-square)](https://github.com/XetaIO/XetaInvest/releases)|[![Total Downloads](https://img.shields.io/github/downloads/xetaio/xetainvest/total?style=flat-square)](https://packagist.org/packages/xetaio/xetaravel)| [![Laravel 13.0](https://img.shields.io/badge/Laravel-13.0-f4645f.svg?style=flat-square)](http://laravel.com) |[![License](https://img.shields.io/badge/license-MIT-brightgreen.svg?style=flat-square)](https://github.com/XetaIO/XetaInvest/blob/master/LICENSE)|


**XetaInvest** is a modern web application for managing investment portfolios, financial analysis, and budgeting, designed for individual investors and finance enthusiasts.

## Main Features

- **Multi-portfolio management**: Add, edit, and track multiple portfolios (stocks, ETFs, crypto, etc.).
- **Position tracking**: Record your transactions (buy, sell, dividends) and visualize your holdings over time.
- **Advanced statistics**: Analyze your portfolio performance (gains, returns, allocation, etc.).
- **Budget & savings**: Monthly budgeting module, automatic calculation of available savings for investment.
- **Compound interest calculator**: Project your capital growth over several scenarios (optimistic, median, pessimistic) with customizable compounding frequency.
- **Financial news**: Aggregation of news and analysis for your tracked assets.
- **Watchlists**: Create custom watchlists.
- **Security**: Strong authentication (2FA, passkeys), strict policies on all sensitive data.

## Technical Stack

- **Back-end**: Laravel 13 (PHP 8.4), Fortify/Sanctum (auth), Policies, Eloquent, Pest (tests)
- **Front-end**: React 19, Inertia.js, TypeScript, Tailwind CSS 4, shadcn/ui, Recharts
- **Database**: PostgreSQL

## Installation

### Prerequisites
- PHP >= 8.4
- Node.js >= 20
- Composer >= 2.6
- PostgreSQL >= 15

### 1. Clone the repository
```bash
git clone <repo-url>
cd XetaInvest
```

### 2. Install dependencies
```bash
composer install
npm install
```

### 3. Configure environment
Copy `.env.example` to `.env` and set your variables (DB, mail, etc.):
```bash
cp .env.example .env
```
Generate the application key:
```bash
php artisan key:generate
```

### 4. Create the database
Create a PostgreSQL database and set credentials in `.env`:
```
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=xetainvest
DB_USERNAME=postgres
DB_PASSWORD=secret
```

### 5. Run migrations and seeders
```bash
php artisan migrate --seed
```

### 6. Start the development server
```bash
composer run dev
```
This will start the Laravel backend, Vite frontend, and the queue worker.

Access the app at: [http://xetainvest.test](http://xetainvest.test) (via Laravel Herd) or [http://localhost:8000](http://localhost:8000)

### 7. Run tests
```bash
php artisan test
npm run lint
```

## Security
- Strong authentication (2FA, passkeys, email)
- All sensitive routes protected by policies
- Encrypted data in the database (tokens, secrets)
- Regular security audits (`npm audit`, `composer audit`)


## Screenshots

You can find presentation screenshots of XetaInvest in the [`docs/screenshots/`](docs/screenshots/) folder.

## finance-query Library

XetaInvest integrates the [finance-query](https://github.com/Verdenroz/finance-query) library to provide advanced financial data extraction and analysis features:

- **Natural language financial queries**: Users can ask questions about their portfolios or the market in plain English or French.
- **Data extraction**: The library parses and interprets financial statements, ratios, and metrics from various sources.
- **Integration**: Used in AI chat modules and reporting tools for smart insights and recommendations.

For more details, see the [finance-query documentation](https://github.com/Verdenroz/finance-query).

## Contributing
- Fork the repo, create a branch, open a PR.
- Follow the code style (`vendor/bin/pint --dirty`, `npm run lint`).
- Add tests for any new feature.

## License
MIT
