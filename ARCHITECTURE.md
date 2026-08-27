# Architecture

This Angular application is organized around the sprint ownership model and the
documented clean architecture split used by the broader TT Mail Assistant
project.

## `src/app/core`

Core owns domain and data-layer concerns that are shared by the application:
typed models, API access, authentication state, route guards, and HTTP
interceptors. Feature pages should use these APIs instead of duplicating backend
URLs or token handling.

## `src/app/shared`

Shared contains the reusable design system. Components here are standalone,
token-driven, and intentionally free of page-specific business behavior. Feature
teams should compose these controls when building their Sprint 2 and Sprint 3
pages.

## `src/app/features`

Features are presentation-layer route boundaries. Sprint 1 includes only the
placeholder page components required to verify routing and ownership. Real
Users, Health, Settings, Audit, Admins, Dashboard, and Login content belongs to
later sprints.

## Styling

Design tokens live in `src/styles/_tokens.scss` as both SCSS variables and CSS
custom properties. Component styles should consume those tokens rather than
hardcoding palette values.
