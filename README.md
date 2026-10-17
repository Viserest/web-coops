# Coop's Pizzeria Website

[View](https://coopspizzeria.com)

## Webpages

|                 | Page            | Link                   | Method | Params |
| --------------- | --------------- | ---------------------- | ------ | ------ |
| **Public**      | | | | |
|                 | Index           | `/`                    | GET  | |
|                 | Menus           | `/menu/:type_menu`     | GET  | Path: { type_menu: lunch/dinner/specials } |
|                 | View newsletter | `/newsletter/:id_link` | GET  | Path: { id_link: string } |
|                 | Unsubscribe     | `/confirm/:id_link`    | GET  | Path: { id_link: string } |
| **Public API**  | | | | |
|                 | Subscribe       | `/api/subscribe`       | POST | Body: { name: string, email: string } |
|                 | Unsubscribe     | `/api/unsubscribe`     | POST | Body: { id_link: string } |
| **Private**     | | | | |
|                 | Dashboard       | `/admin`               | GET  | |
| **Private API** | | | | |
| *Message*       | List   | `/api/message`          | GET    | [^1] |
|                 | Create | `/api/message`          | POST   | Body: { subject: string, text: string, file_id?: string } |
|                 | Read   | `/api/message/:id`      | GET    | [^2] |
|                 | Update | `/api/message/:id`      | PUT    | [^2]; Body: { subject?: string, text?: string, file_id?: string } |
|                 | Delete | `/api/message/:id`      | DELETE | [^2] |
|                 | Send   | `/api/message/:id/send` | POST   | [^2]; Body: { to?: string[] } |
| *Subscriber*    | List   | `/api/subscriber`       | GET    | [^1] |
|                 | Create | `/api/subscriber`       | POST   | Body: { name: string, email: string } |
|                 | Read   | `/api/subscriber/:id`   | GET    | [^2] |
|                 | Update | `/api/subscriber/:id`   | PUT    | [^2]; Body: { name?: string, email?: string } |
|                 | Delete | `/api/subscriber/:id`   | DELETE | [^2] |
| *Link*          | List   | `/api/link`             | GET    | [^1] |
|                 | Read   | `/api/link/:id`         | GET    | [^2] |
|                 | Delete | `/api/link/:id`         | DELETE | [^2] |

[^1]: Query: { limit: number, offset: number }
[^2]: Path: { id: string }

## Project Tree

```
src/          Website typescript code
  index.ts    Default page and itty-router
  tag.ts      Creating elements without javascript html sdk
  uuid.ts     Handle uuids formated as hex, hyphenated-hex, or byte form
  handler.ts  HTTP API for SQL queries: list, post, get, put, delete
  schema.ts   Website storage schemas
  public.ts   Public pages
  admin.ts    Private admin pages
test/*        Website tests before publishing
static/*      Static content like css and javascript
migrations/*  Sql statements for Cloudflare D1 Database
```
