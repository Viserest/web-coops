# Coop's Pizzeria Website

[View](https://coopspizzeria.com)

## Webpages

|                 | Method | Link                   | Params | Desc |
| --------------- | ------ | ---------------------- | ------ | ---- |
| **Public**      |        |                        | | |
| *Home Pages*    | GET    | `/`                    | | Home page |
|                 | GET    | `/menu/:type_menu`     | Path: { type_menu: lunch/dinner/specials } | Menu pages |
| *Newsletter*    | GET    | `/newsletter/:id_link` | Path: { id_link: string } | Newsletter View |
|                 | GET    | `/confirm/:id_link`    | Path: { id_link: string } | Newsletter Unsubscribe |
| **Public API**  |        | | | |
| *Newsletter*    | POST   | `/api/subscribe`       | Body: { name: string, email: string } | Newsletter Subscribe |
|                 | POST   | `/api/unsubscribe`     | Body: { id_link: string } |  Newsletter Unsubscribe |
| *Addresses*     | GET    | `/api/addresses`       | | List addresses in your account |
|                 | POST   | `/api/addresses`       | | Add address to your account |
|                 | GET    | `/api/addresses/:id`   | | Get address in your account |
|                 | PUT    | `/api/addresses/:id`   | | Update address in your account |
|                 | DELETE | `/api/addresses/:id`   | | Delete address from your account |
| **Private**     | | | | |
|                 | Dashboard       | `/admin`               | GET  | |
| **Private API** | | | | |
| *Files*         |        | `/api/files`             | | |
| *Users*         | List   | `/api/users`             | GET    | [^1] |
|                 | Create | `/api/users`             | POST   | Body: { name: string, email: string } |
|                 | Read   | `/api/users/:id`         | GET    | [^2] |
|                 | Update | `/api/users/:id`         | PUT    | [^2]; Body: { name?: string, email?: string } |
|                 | Delete | `/api/users/:id`         | DELETE | [^2] |
| *Sessions*      |        | `/api/sessions`          | | |
| *Messages*      | List   | `/api/messages`          | GET    | [^1] |
|                 | Create | `/api/messages`          | POST   | Body: { subject: string, text: string, file_id?: string } |
|                 | Read   | `/api/messages/:id`      | GET    | [^2] |
|                 | Update | `/api/messages/:id`      | PUT    | [^2]; Body: { subject?: string, text?: string, file_id?: string } |
|                 | Delete | `/api/messages/:id`      | DELETE | [^2] |
|                 | Send   | `/api/messages/:id/send` | POST   | [^2]; Body: { to?: string[] } |
| *Links*         | List   | `/api/links`             | GET    | [^1] |
|                 | Read   | `/api/links/:id`         | GET    | [^2] |
|                 | Delete | `/api/links/:id`         | DELETE | [^2] |
| *Addresses*     |        | `/api/addresses`         |
| *Menus*         |        | `/api/menu`              |
| *Menu Items*    |        | `/api/menu-items`        |
| *Menu Options*  |        | `/api/menu-options`      |
| *Orders*        |        | `/api/order`             |
| *Order Items*   |        | `/api/order-items`       |

[^1]: Query: { limit: number, offset: number }
[^2]: Path: { id: string }

## Project Tree

```
src/          Website typescript code
  index.ts    Common functions, variables, and itty-router
  tag.ts      Creating elements without javascript html sdk
  uuid.ts     Handle uuids formated as hex, hyphenated-hex, or byte form
  handler.ts  HTTP API for SQL queries: list, post, get, put, delete
  schema.ts   Website storage schemas
  public.ts   Public pages
  private.ts  Private pages
test/*        Website tests before publishing
static/*      Static content like css and javascript
migrations/*  Sql statements for Cloudflare D1 Database
```
