# Soma Cafe — Backend API

Backend for **Soma Cafe**, a social platform with posts, polls, follows, notifications, direct messaging, live chat and live streams. Built with NestJS and TypeScript.

> **Status:** The production service has been shut down. This repository is a cleaned copy of the code: it contains **no user data and no credentials**. All secrets are read from environment variables (see [`env.sample`](env.sample)).

## Features

- **Accounts**: invite-code registration, login with JWT access/refresh tokens, profile editing, avatars and backgrounds, password reset by email
- **Posts**: text, images, link previews, polls, comments, likes, quotes, hashtags, mentions, bookmarks, editing and deletion
- **Social graph**: follow / unfollow, who-to-follow suggestions, mute and block
- **Moderation**: post reports, bug reports, live-chat mutes, blocks and warnings
- **Notifications**: in-app notifications with per-user settings, optional push delivery
- **Search**: users, posts and hashtags
- **Messaging**: one-to-one chat rooms (RethinkDB)
- **Live**: live-stream records, stream-start/end/recording webhooks, video posts processed with ffmpeg, real-time live chat over WebSockets
- **Custom emoji**: per-user emoji uploads plus a standard emoji set

## Tech stack

| Area | Technology |
| --- | --- |
| Framework | NestJS 8, TypeScript 4 |
| Main database | MySQL (TypeORM 0.2, entities + migrations) |
| Messaging store | RethinkDB |
| Real-time | Socket.io (`@nestjs/websockets`) |
| Auth | Passport (local + JWT) |
| Media | sharp (images), fluent-ffmpeg / ffprobe (video) |
| Email | Nodemailer + Handlebars templates |
| API docs | Swagger (`/api`) |
| Tests | Jest, Supertest |

## Project layout

```
src/
  apis/            HTTP controllers + services, one module per feature
                   (user, login, post, follow, search, messaging, stream, …;
                   several features have a v1 and a v2 module)
  repositories/    TypeORM entities, DTOs and data-access services
  auth/            Passport strategies, JWT guard, token issuing
  chat/            Live-chat WebSocket gateway
  modules/         Shared services: mail, security (password encryption), redis
  exceptions/      Custom exceptions
migrations/        TypeORM migrations
views/mail/        Handlebars email templates
public/            Static files and uploaded media (uploads are git-ignored)
test/              End-to-end test setup
```

Request flow: **controller (`apis/`) → API service → repository service (`repositories/`) → TypeORM / MySQL**. Cross-feature events (new post, notification, stream state) go through `@nestjs/event-emitter`.

## API overview

About 140 REST endpoints, grouped by route prefix. With the app running, the full interactive reference is at `http://localhost:<APP_PORT>/api`.

| Prefix | Purpose |
| --- | --- |
| `user/v1`, `user/v2` | Registration, profiles, invites, settings |
| `login/v1` | Login and token refresh |
| `reset/v1` | Password reset |
| `post/v1`, `post/v2` | Feed, posts, comments, likes, polls |
| `follow/v1`, `follow/v2` | Follow graph |
| `search/v1`, `search/v2` | Search |
| `notify/v1` | Notifications and notification settings |
| `messaging/v1` | Chat rooms and messages |
| `stream/v1` | Live streams, recordings and streaming-server webhooks |
| `mute/v1`, `block/v1`, `report/v1`, `bug/v1` | Moderation and bug reports |
| `bookmark-api`, `emoji-api`, `status/v1` | Bookmarks, emoji, health status |

**WebSockets:** the post gateway runs on the HTTP port, and the live-chat gateway runs on `WSS_PORT` (websocket transport only).

## Getting started

### Prerequisites

- Node.js 16 or newer, npm
- MySQL 5.7+ (or MariaDB)
- RethinkDB, needed only for direct messaging
- A local SMTP catcher such as MailHog, needed only for testing emails
- Linux or macOS shell (the `start:dev` and `build` scripts use POSIX syntax)

`docker-compose.yml` starts MySQL, RethinkDB and Adminer if you use Docker.

### Setup

```bash
npm install
cp env.sample .env          # then edit the values
```

Create the database named in `MYSQL_DATABASE`. In development (`NODE_ENV=development`), TypeORM `synchronize` creates the tables from the entities. Migrations live in `migrations/`:

```bash
npm run typeorm:run-migrations
```

### Run

```bash
npm run start:dev           # watch mode, NODE_ENV=development
npm run start               # plain start
npm run build && npm run start:prod
```

### Configuration

All configuration comes from `.env`. Never commit real values.

| Variable | Purpose |
| --- | --- |
| `APP_PORT`, `WSS_PORT` | HTTP / Swagger port, live-chat WebSocket port |
| `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USERNAME`, `MYSQL_PASSWORD`, `MYSQL_DATABASE` | Main database |
| `CIPHER_KEY` | 16-character key used by `SecurityService` (AES-128-CBC) |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Access- and refresh-token signing |
| `API_AUTH_LOGIN`, `API_AUTH_PASSWORD` | HTTP Basic credentials for API clients; `LoggingInterceptor` accepts a request carrying these or a JWT |
| `IMAGES_URL` | Public base URL prepended to media paths and invite links |
| `REDIS_HOST`, `REDIS_PORT`, `REDIS_DB` | Redis cache (wiring is currently commented out in `RedisModule`) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | Outgoing mail |
| `STREAM_API_URL`, `STREAM_RECORDS_FOLDER_PATH` | External streaming server and its recordings folder |
| `FCM_SERVER_KEY` | Push notifications (optional) |
| `FACEBOOK_ACCESS_TOKEN`, `TWITTER_BEARER_TOKEN` | Link-preview enrichment for Facebook / X posts (optional) |

Optional integrations stay inactive when their variables are empty.

## Tests

```bash
npm run test         # unit tests
npm run test:e2e     # end-to-end tests
npm run test:cov     # coverage
```

The existing spec files are mostly generated scaffolding. Real test coverage still has to be written.

## Known limitations

- **No seed data**: the repository ships without any database content, so a fake-data generator is needed to try the app.
- **No frontend**: the web client is not part of this repository.
- **External services**: link previews (X, Facebook, TikTok, microlink), push notifications, email and live streaming call outside services.
- **RethinkDB connection** is hardcoded to `localhost:28015` in `src/apis/messaging-api/rethinkdb.provider.ts`.
- **Request gate exits the process**: `LoggingInterceptor` (used on most controllers) calls `process.exit(1)` when a request has neither the Basic credentials nor a JWT, so a single unauthenticated request stops the server.
- **Password storage** uses reversible AES encryption rather than a one-way hash such as bcrypt or argon2.
- **Duplicated v1/v2 modules** for several features, from an in-progress API rewrite.

## License

No license has been chosen yet, so all rights are reserved by the author.
