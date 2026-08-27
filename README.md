# TT Admin Dashboard

Angular admin dashboard shell for TT Mail Assistant.

## Development

Install dependencies:

```sh
npm install
```

Run locally:

```sh
npm start
```

Lint and build:

```sh
npm run lint
npm run build
```

## Backend URL

The API base URL is configured in `src/environments/environment.ts` and
`src/environments/environment.development.ts`.

For local development, change `environment.development.ts`:

```ts
export const environment = {
  apiBaseUrl: 'http://localhost:3000',
};
```

All admin API calls are made below `${apiBaseUrl}/admin/*`.
