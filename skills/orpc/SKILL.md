---
name: orpc
description: Comprehensive guide for oRPC (v1), the end-to-end type-safe RPC + OpenAPI library. Use when defining contracts, procedures, routers, clients, middleware, metadata, or OpenAPI specs with @orpc/*. Covers correct APIs and corrects common misconceptions from LLM-generated content (tRPC habits, invented APIs).
---

# oRPC Expert Guide

oRPC (OpenAPI Remote Procedure Call) is a TypeScript library for building end-to-end type-safe APIs. A procedure is an input schema + output schema + handler; contract-first development separates the *definition* (`@orpc/contract`) from the *implementation* (`@orpc/server`). Validation accepts any [Standard Schema](https://github.com/standard-schema/standard-schema) library (Zod, Valibot, ArkType, Effect Schema, ...). This skill covers correct v1 usage and addresses common misconceptions from LLM-generated content.

## Quick Reference

```typescript
import { os } from '@orpc/server'          // server builder (implements + procedures)
import { oc } from '@orpc/contract'         // contract builder (definition only)
import { implement } from '@orpc/server'    // contract -> implementer (replaces os)
import { ORPCError, call } from '@orpc/server'
import { RPCHandler } from '@orpc/server/fetch'   // or '@orpc/server/node'
import { createORPCClient, safe, isDefinedError } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import type { RouterClient } from '@orpc/server'
import type { ContractRouterClient } from '@orpc/contract'
import { OpenAPIGenerator } from '@orpc/openapi'         // spec generation (separate package)
import { ZodToJsonSchemaConverter } from '@orpc/zod/zod4'
```

**Core mental model:**
```typescript
os.input(InSchema).output(OutSchema).handler(({ input, context }) => out)
//  ↑ validate request         ↑ validate response   ↑ your logic
// oc = same chain MINUS .handler/.use (definition only). implement(contract) gives back an `os`.
// procedure['~orpc'] = { meta, route, inputSchema?, outputSchema?, errorMap }  <- runtime introspection
```

`os` and `oc` are pre-built singleton instances (not constructors). Each `.input()`/`.use()`/`.meta()` returns a **new** immutable builder — chain, don't mutate.

---

## Common Misconceptions

**LLM outputs frequently apply tRPC habits or invent APIs.** Use this table to correct them:

| Wrong (common in AI outputs) | Correct |
|------------------------------|---------|
| `os.query(...)` / `os.mutation(...)` | `os.handler(...)` — oRPC has **no** query/mutation distinction |
| `t.procedure` / `initTRPC.create()` | `os` (server) or `oc` (contract); no `initTRPC`/`createCallerFactory` |
| `import { os } from '@orpc/contract'` | `os` is from `@orpc/server`; `oc` is from `@orpc/contract` |
| `import { RPCHandler } from '@orpc/server'` | `from '@orpc/server/fetch'` or `'@orpc/server/node'` (adapter subpath) |
| `import { RPCLink } from '@orpc/client'` | `from '@orpc/client/fetch'` |
| `os.middleware(...).use(...)` returns void | builders are immutable; capture the returned value |
| `oc.handler(...)` / `oc.use(...)` | contract builder has no `.handler`/`.use`; use `implement(contract)` then `.handler` |
| `new ORPCError({ code: 'NOT_FOUND' })` | `new ORPCError('NOT_FOUND', { message, data })` — code is the **first positional** arg |
| `error.code === 404` | `.code` is a string (`'NOT_FOUND'`); HTTP status is `.status` |
| `OpenAPIGenerator` converts Effect schemas | it ships **zod / valibot / arktype** converters only — **no Effect converter** |
| `RPCHandler` serves OpenAPI/REST | `RPCHandler` speaks oRPC's binary RPC protocol; use `OpenAPIHandler` for REST |
| `handler.handle(req)` returns a `Response` | returns `{ matched, response }`; you must check `matched` and return `response` |
| `.errors({ NOT_FOUND: z.object(...) })` | error map values are objects: `{ NOT_FOUND: { data: z.object(...) } }` |

---

## Contract-First: Define → Implement

The contract (`oc`) carries only input/output/errors/route/meta — no handlers, no business logic. It is the single source of truth that the server, every client, and tooling all derive from.

```typescript
// contract.ts — definition (shippable to clients, no logic leaked)
import { oc } from '@orpc/contract'
import * as z from 'zod'

export const planet = oc
  .input(z.object({ id: z.number().int() }))
  .output(z.object({ id: z.number(), name: z.string() }))

export const contract = { planet: { find: planet } }  // nestable plain object
```

```typescript
// server.ts — implement(contract) returns an `os` shaped like the contract tree
import { implement } from '@orpc/server'
import { contract } from './contract'

const os = implement(contract)   // fully replaces os from @orpc/server

const findPlanet = os.planet.find
  .handler(({ input }) => ({ id: input.id, name: 'Earth' }))

export const router = os.router({ planet: { find: findPlanet } })
//                       ↑ os.router() enforces the contract at runtime — use it at the root
```

A normal router can also be **converted back** to a contract for the client (`minifyContractRouter` from `@orpc/contract`, or `unlazyRouter` from `@orpc/server` if it contains lazy routes). With contract-first you skip this — the contract is already lightweight.

---

## Procedures, Routers, RPCHandler, Hono

A procedure is the only thing with a `.handler`; everything else (`.input`, `.output`, `.use`, `.errors`, `.meta`, `.route`) is optional configuration. A router is a plain nestable object of procedures.

```typescript
import { os } from '@orpc/server'

const ping = os
  .input(z.object({ name: z.string() }))
  .output(z.object({ id: z.number() }))   // explicit .output speeds up TS inference
  .handler(async ({ input }) => ({ id: 1 }))

const router = { ping, nested: { ping } }
```

Mount on Hono via the Fetch adapter. `handle()` returns `{ matched, response }`; if unmatched, fall through to the next route:

```typescript
import { Hono } from 'hono'
import { RPCHandler } from '@orpc/server/fetch'

const handler = new RPCHandler(router)
const app = new Hono()

app.use('/rpc/*', async (c, next) => {
  const { matched, response } = await handler.handle(c.req.raw, {
    prefix: '/rpc',
    context: {},   // initial context goes here (see Context below)
  })
  if (matched) return c.newResponse(response.body, response)
  await next()
})
```

`RPCHandler` enables a `StrictGetMethodPlugin` by default (security). It speaks the proprietary RPC protocol — pair it only with `RPCLink`, never hand-rolled HTTP.

---

## Client Usage: Server-Side vs Client-Side

**Server-side** (same process — no network): call procedures directly.

```typescript
import { call, createRouterClient } from '@orpc/server'

await call(router.planet.find, { id: 1 }, { context: {} })        // one-off
const client = createRouterClient(router, { context: {} })         // whole router
await client.planet.find({ id: 1 })
```

**Client-side** (over the wire): build an `RPCLink`, wrap with `createORPCClient`, type it with `RouterClient` (or `ContractRouterClient` when only the contract is available).

```typescript
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import type { RouterClient } from '@orpc/server'

const link = new RPCLink({
  url: 'http://localhost:3000/rpc',
  headers: () => ({ authorization: 'Bearer token' }),
})
const client: RouterClient<typeof router> = createORPCClient(link)
await client.planet.find({ id: 1 })
```

Clients are plain objects — merge by assigning into a new object. Client context (`new RPCLink<Ctx>(...)`, `client.x(input, { context })`) lets you vary per-call behavior.

---

## Error Handling

Throw `ORPCError(code, options)` — **code is the first positional arg**, a string. Unknown thrown `Error`s become `INTERNAL_SERVER_ERROR`. `ORPCError.data` is sent to the client, so never put secrets there.

```typescript
throw new ORPCError('NOT_FOUND', { message: 'No such planet' })
throw new ORPCError('RATE_LIMITED', { data: { retryAfter: 60 } })
```

For **type-safe** errors, declare them in the contract/procedure with `.errors` (values are objects, optionally with a `data` schema). The handler/middleware receives a typed `errors` factory:

```typescript
const base = oc.errors({
  RATE_LIMITED: { data: z.object({ retryAfter: z.number() }) },
  UNAUTHORIZED: {},
})

const proc = implement(base).handler(async ({ errors }) => {
  throw errors.RATE_LIMITED({ data: { retryAfter: 60 } })
})
```

On the client, use `safe` + `isDefinedError` to discriminate declared errors from unknown ones:

```typescript
const [error, data, isDefined] = await safe(client.proc(input))
if (isDefinedError(error)) console.log(error.data.retryAfter)   // typed
else if (error) { /* unknown */ } else { /* success: data */ }
```

Input/output validation failures arrive as an `ORPCError` with `code === 'BAD_REQUEST'` and `cause instanceof ValidationError`; the per-field issues surface in `error.data.issues` (Standard Schema issue shape: `{ path, message }`).

---

## Middleware & Context

Middleware is a function that must call `next()` (and may augment context, inspect input, or rewrite output). Context is type-safe DI: **initial context** is passed at `handler.handle({ context })`; **execution context** is produced by middleware.

```typescript
const base = os.$context<{ headers: Headers }>()   // declare required initial context

const requireAuth = base.middleware(async ({ context, next }) => {
  const user = parseJWT(context.headers.get('authorization'))
  if (!user) throw new ORPCError('UNAUTHORIZED')
  return next({ context: { user } })   // merged into context downstream
})

const me = base.use(requireAuth).handler(({ context }) => context.user)
```

Middleware can read input (`os.middleware(async ({ next }, input: number) => ...)`, attach via `.use(mw, input => input.id)`), modify output, and compose with `.concat`. Built-ins: `onStart`, `onSuccess`, `onError`, `onFinish` from `@orpc/server`. Beware applying the same `.use` at both router and procedure level — it runs twice (see dedupe-middleware best practice).

---

## Metadata

Metadata is typed key-value config attached to procedures, read at runtime by middleware/tooling. Seed the type with `.$meta<T>({})`, set with `.meta()` (repeated calls shallow-merge), read at `procedure['~orpc'].meta`.

```typescript
interface Meta { cache?: boolean }

const base = os.$meta<Meta>({})   // required: defines initial meta shape

const cacheMw = base.use(async ({ procedure, next, path }, input, output) => {
  if (!procedure['~orpc'].meta.cache) return next()     // read meta here
  const key = path.join('/') + JSON.stringify(input)
  if (store.has(key)) return output(store.get(key))
  const r = await next()
  store.set(key, r.output)
  return r
})

const cached = base.meta({ cache: true }).handler(() => expensive())
```

---

## OpenAPI / Introspection

For zod/valibot/arktype contracts, generate a spec with `@orpc/openapi` (a **separate** package from `@orpc/server`). Use `.route({ method, path })` on procedures and the `OpenAPIHandler` (not `RPCHandler`) to serve REST.

```typescript
import { OpenAPIGenerator } from '@orpc/openapi'
import { ZodToJsonSchemaConverter } from '@orpc/zod/zod4'

const gen = new OpenAPIGenerator({ schemaConverters: [new ZodToJsonSchemaConverter()] })
const spec = await gen.generate(routerOrContract, { info: { title: 'API', version: '1.0.0' } })
```

**There is no Effect Schema converter** in `@orpc/openapi`. For Effect-based contracts, introspect the contract directly and convert with Effect's own JSON Schema emitter, or implement a custom `ConditionalSchemaConverter` (the interface: `condition(schema)` + `convert(schema, options): [required, jsonSchema]`, gated on `schema['~standard'].vendor`).

Walk a contract tree to its leaf procedures with `isContractProcedure`, then read the live schemas off `~orpc` (`inputSchema`/`outputSchema` are **optional** — guard for `undefined`):

```typescript
import { isContractProcedure } from '@orpc/contract'
import { Schema } from 'effect'

function* leaves(node: unknown, path: string[] = []): Generator<[string, unknown]> {
  if (isContractProcedure(node)) { yield [path.join('.'), node]; return }
  if (node && typeof node === 'object')
    for (const [k, v] of Object.entries(node)) yield* leaves(v, [...path, k])
}

for (const [dotted, proc] of leaves(contract)) {
  const def = (proc as any)['~orpc']                 // { meta, route, inputSchema?, outputSchema?, errorMap }
  // The Effect inputSchema retains a live AST; emit draft-2020-12 JSON Schema directly:
  if (def.inputSchema) Schema.toJsonSchemaDocument(def.inputSchema)  // Document<"draft-2020-12">
}
```

---

## When NOT to Use oRPC

| Scenario | Recommendation |
|----------|----------------|
| Public REST API consumed by non-TS clients | Plain OpenAPI/REST framework; oRPC's RPC protocol shines for TS↔TS |
| Already standardized on tRPC with no OpenAPI need | tRPC is fine; oRPC's edge is the OpenAPI + contract-first story |
| GraphQL graph with deep relations / field selection | Use GraphQL; oRPC is procedure-call shaped |
| No schema validation desired at all | oRPC's value (validation + inference) largely evaporates |
| Need REST endpoints but reaching for `RPCHandler` | Use `OpenAPIHandler` + `@orpc/openapi`, not `RPCHandler` |

---

## Resources

- [oRPC Documentation](https://orpc.dev/docs/getting-started)
- [Contract-First](https://orpc.dev/docs/contract-first/define-contract)
- [Metadata](https://orpc.dev/docs/metadata) · [Middleware](https://orpc.dev/docs/middleware) · [Context](https://orpc.dev/docs/context)
- [Error Handling](https://orpc.dev/docs/error-handling) · [Client Error Handling](https://orpc.dev/docs/client/error-handling)
- [OpenAPI Specification](https://orpc.dev/docs/openapi/openapi-specification) · [Hono Adapter](https://orpc.dev/docs/adapters/hono)
- [oRPC GitHub](https://github.com/unnoq/orpc) · [Standard Schema](https://github.com/standard-schema/standard-schema)
