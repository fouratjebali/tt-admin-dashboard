# TT Admin Dashboard

Angular admin dashboard shell for TT Mail Assistant.

This guide explains how a teammate can configure the project on a fresh PC and
start developing safely.

## 1. Prerequisites

Install these tools before cloning the project:

- Node.js `22.x` recommended. The project was created with Node `22.14.0`.
- npm `10.x` recommended. The project was created with npm `10.9.2`.
- Git.
- Google Chrome, needed for the Angular/Karma smoke test.

Check versions:

```sh
node --version
npm --version
git --version
```

## 2. Clone the repository

```sh
git clone https://github.com/fouratjebali/tt-admin-dashboard.git
cd tt-admin-dashboard
```

Use `develop` for integration work:

```sh
git checkout develop
git pull
```

Create a feature branch from `develop`:

```sh
git checkout -b feature/<your-name>/<page-name>
```

Example:

```sh
git checkout -b feature/islem/users-page
```

## 3. Install dependencies

```sh
npm install
```

If npm fails with a certificate error such as
`UNABLE_TO_VERIFY_LEAF_SIGNATURE`, run:

```sh
npm install --strict-ssl=false
```

This uses a command-level workaround only. Do not commit npm registry or SSL
configuration changes.

## 4. Configure backend and Microsoft auth

The Angular app talks only to the backend API. It must not connect directly to
PostgreSQL; the backend owns database access through its `DATABASE_URL`.

The app reads integration settings from:

- `src/environments/environment.development.ts` for local development.
- `src/environments/environment.ts` for production builds.

For local development, the backend should run on `http://localhost:8000` and the
Angular API base URL should be:

```ts
export const environment = {
  apiBaseUrl: 'http://localhost:8000/api/v1',
  microsoftAuth: {
    clientId: '<azure-app-client-id>',
    tenantId: 'common',
    redirectUri: 'http://localhost:4200/login',
    scopes: ['openid', 'profile', 'email', 'User.Read'],
  },
};
```

Replace `<azure-app-client-id>` with the Azure application client ID configured
for Microsoft/Outlook OAuth. The backend validates access and roles from its
`users` table.

Admin API requests are sent below:

```txt
${apiBaseUrl}/admin/*
```

Examples:

- `POST /api/v1/auth/microsoft`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/me`
- `GET /api/v1/admin/me`
- `GET /api/v1/admin/overview`
- `GET /api/v1/admin/users`
- `GET /api/v1/admin/audit-logs`
- `GET /api/v1/admin/planning/imports`
- `GET /api/v1/admin/planning/sessions`
- `GET /api/v1/admin/planning/drafts`

## 5. Run the project

Start the Angular dev server:

```sh
npm start
```

Open:

```txt
http://localhost:4200/
```

Protected routes redirect to `/login` until a backend `session_token` is present
and validated with `GET /api/v1/auth/me`.

## 6. Useful commands

Run lint:

```sh
npm run lint
```

Format files:

```sh
npm run format
```

Build:

```sh
npm run build
```

Run the smoke test once in headless Chrome:

```sh
npx ng test --watch=false --browsers=ChromeHeadless
```

Run tests in watch mode:

```sh
npm test
```

## 7. Pre-commit checks

Husky and lint-staged are configured. On commit, staged files are checked with:

- `eslint --fix` for `*.ts`, `*.html`, and `*.scss`.
- `prettier --write` for `*.ts`, `*.html`, `*.scss`, `*.json`, and `*.md`.

If hooks are not installed after cloning, run:

```sh
npm run prepare
```

Then try committing again.

## 8. Project structure

```txt
src/app/
  core/
    services/       auth and typed API services
    guards/         route guards
    interceptors/   JWT HTTP interceptor
    models/         shared TypeScript interfaces
  shared/
    components/     reusable design-system components
  features/
    login/          Microsoft admin sign-in route
    dashboard/      route placeholder
    users/          route placeholder
    health/         route placeholder
    settings/       route placeholder
    audit/          route placeholder
    admins/         route placeholder
src/styles/
  _tokens.scss      SCSS variables and CSS custom properties
```

More details are in `ARCHITECTURE.md`.

## 9. Branch and PR rules

Branch naming:

- `main`: production branch, no direct pushes.
- `develop`: integration branch, no direct pushes.
- `feature/<dev-name>/<page-name>`: page work.
- `chore/fourat/<task>`: configuration and maintenance work.

Open pull requests into `develop`. Every PR needs review before merge.

At the end of a sprint, `develop` is merged into `main` after integration
testing.

## 10. Troubleshooting

If `ng` is not recognized, use the local CLI through npm:

```sh
npx ng version
npx ng serve
```

If dependencies look corrupted after a failed install, remove `node_modules` and
install again:

```sh
npm install
```

If Chrome tests fail because Chrome is missing, install Google Chrome and rerun:

```sh
npx ng test --watch=false --browsers=ChromeHeadless
```

If port `4200` is already used, run on another port:

```sh
npx ng serve --port 4300
```
