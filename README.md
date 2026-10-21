# n8n-nodes-selltostate

n8n community nodes for [Sell to State](https://selltostate.com/?utm_source=github&utm_medium=referral&utm_campaign=sts-n8n): government tenders and contract awards from official procurement sources in more than 60 countries.

- **Sell to State**: search and get tenders, buyers and suppliers. Works as a tool for the n8n AI Agent.
- **Sell to State Trigger**: starts a workflow when Sell to State adds tenders that match a search.

Example workflows: new UK tenders for "payroll software" to Slack; open tenders in Germany and Austria to a Google Sheet; a buyer profile to your CRM before a sales call.

## Install

In n8n: **Settings → Community Nodes → Install**, then enter `n8n-nodes-selltostate`. See the [n8n guide](https://docs.n8n.io/integrations/community-nodes/installation/).

## Credentials

1. Create a Sell to State account with an active plan: [app.selltostate.com](https://app.selltostate.com/?utm_source=github&utm_medium=referral&utm_campaign=sts-n8n).
2. Create an API key at [app.selltostate.com/account/keys](https://app.selltostate.com/account/keys?utm_source=github&utm_medium=referral&utm_campaign=sts-n8n).
3. In n8n, add a **Sell to State API** credential and paste the key. n8n tests it against `/api/v1/whoami`.

## Operations

| Resource | Operation | API |
|---|---|---|
| Tender | Search: text, country, accepts bids, lifecycle, published window, sector, sort | `GET /api/v1/search?scope=tenders` |
| Tender | Get: one tender by ID and country | `GET /api/v1/tenders/{id}` |
| Buyer | Search, Get (profile: spend by year, sectors, top suppliers) | `GET /api/v1/search?scope=buyers`, `/api/v1/buyers/{slug}` |
| Supplier | Search, Get (profile: awards by year, sectors, top buyers) | `GET /api/v1/search?scope=suppliers`, `/api/v1/suppliers/{slug}` |

Country values are slugs: `united-kingdom`, `germany`, `new-zealand`. Several countries go in one field, separated by commas.

## Trigger

The trigger polls `GET /api/v1/search` with `sort=added_desc` and `added_after` (the time of the last poll, minus 60 seconds). It removes duplicates by tender `slug`. On the first activation it starts from the current time and does not replay old tenders. A manual test returns the 5 newest matches.

The trigger needs the Sell to State API of 21 October 2026 or later (`sort=added_desc`, `added_after`).

Sell to State can also push matches to a webhook. Set it up at [app.selltostate.com/integrations](https://app.selltostate.com/integrations?utm_source=github&utm_medium=referral&utm_campaign=sts-n8n) and receive it with the n8n Webhook node.

## Limits

The search API allows 300 calls per minute per key. A poll every 5 minutes or more is enough for tenders.

## Links

- API docs: [docs.selltostate.com](https://docs.selltostate.com/?utm_source=github&utm_medium=referral&utm_campaign=sts-n8n)
- Countries and data depth: [selltostate.com/countries](https://selltostate.com/countries/?utm_source=github&utm_medium=referral&utm_campaign=sts-n8n)
- Skills and MCP for AI agents: [getbeton/selltostate-skills](https://github.com/getbeton/selltostate-skills)
- Support: support@selltostate.com

## License

[MIT](LICENSE.md)
