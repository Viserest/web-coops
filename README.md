# Coop's Pizzeria Website

[View](https://coopspizzeria.com)

## Webpages

| Page                   | Link                   |
| ---------------------- | ---------------------- |
| | |
| Home                   | `/`                    |
| About                  | `/about`               |
| Menus                  | `/menu/:category+`     |
| Newsletter View        | `/newsletter/:id_link` |
| Newsletter Unsubscribe | `/confirm/:id_link`    |
| Account register       | `/account/register`    |
| Account login          | `/account/login`       |
| Account dashboard      | `/account/dashboard`   |
| Admin dashboard        | `/account/admin`       |

### APIs

#### Version 1

|                 | Method | Link                             | Params |
| --------------- | ------ | -------------------------------- | ------ |
| *Files*         | LCRD   | `/api/v1/files`                  | |
| *Newsletter*    | POST   | `/api/v1/newsletter/subscribe`   | Body: { name: string, email: string } |
|                 | POST   | `/api/v1/newsletter/unsubscribe` | Body: { id_link: Uuid } |
| *Users*         | LRUD   | `/api/v1/users`                  | |
|                 | C:POST | `/api/v1/users/register`         | { name: string, email: string, password: string } |
| *Sessions*      | LRD    | `/api/v1/sessions`               | |
|                 | C:POST | `/api/v1/users/login`            | { email: string, password: string } |
| *Messages*      | LCRUD  | `/api/v1/messages`               | |
|                 | POST   | `/api/v1/messages/:id/send`      | Body: { id_to?: Uuid } |
| *Links*         | LRD    | `/api/v1/links`                  | |
| *Addresses*     | LCRUD  | `/api/v1/addresses`              | |
| *Categories*    | LCRUD  | `/api/v1/categories`             | |
| *Menu Items*    | LCRUD  | `/api/v1/menu_items`             | |
| *Menu Options*  | LCRUD  | `/api/v1/menu_options`           | |
| *Orders*        | LCRUD  | `/api/v1/orders`                 | |
| *Order Items*   | LCRUD  | `/api/v1/order_items`            | |

Most endpoints use a schema like this:
```
GET /api/v1/XXX
  Query:
    limit?: number
    offset?: number
    user_id?: UUID   # Admin only

  User session:
    List where owner_user_id = session.user_id.
    Ignore or reject user_id if supplied.

  Admin session:
    If user_id is supplied, list that user.
    Otherwise, list where owner_user_id = session.user_id.

POST /api/v1/XXX
  Body:
    ...fields
    user_id?: UUID   # Admin only

  User session:
    Create with owner_user_id = session.user_id.
    Ignore or reject a supplied user_id.

  Admin session:
    Create with owner_user_id = body.user_id if supplied;
    otherwise use session.user_id.

GET /api/v1/XXX/:id
  User session:
    Return only if owner_user_id = session.user_id.
  Admin session:
    May return any.

PUT /api/v1/XXX/:id
  User session:
    Update only if owner_user_id = session.user_id.
  Admin session:
    May update any.

DELETE /api/v1/XXX/:id
  User session:
    Delete only if owner_user_id = session.user_id.
  Admin session:
    May delete any.
```

## Running
```
npm run dev               Run locally
npm run start             Run locally
npm run deploy            Deploy to cloudflare
npm run test              Run tests
npm run cf-typegen        Regenerate worker types
npx drizzle-kit generate  Regenerate sql migrations
```

## Project Tree

```
src/          Website typescript code
  // project files:
  index.ts    Configurations as X_OPTIONS
  context.ts  Types, variables, and itty-router
  schema.ts   Website storage schemas
  pages.ts    All pages, public and private
  apis.ts     All apis, public and private
  // utils:
  tag.ts      Creating elements without javascript html sdk
  uuid.ts     Handle uuids formated as hex, hyphenated-hex, or byte form
  utils.ts    Common functions
  form.ts     Create a form which allows rendering to html and typecasting
  handler.ts  HTTP API for SQL queries: list, post, get, put, delete
test/*        Website tests before publishing
static/*      Static content like css and javascript
migrations/*  Sql statements for Cloudflare D1 Database
```
