# text-net-server

a text application server targeting practically any hardware with TCP 
capability - retro machines with modern network adapters, minimal telnet 
clients, web browsers, CLIs - using only node.js built ins

## application framework

- router - express style path matching with params, redirect, middleware etc
- screen dsl - structured screen assembly helpers (`screen()`, `p()`, `menu()`,
  `tab()`, `input()`, `end()`, `meta()`)
- screen model - screens composed of typed parts (paragraph, menu, table, meta),
  flattened at render time
- response types - menu (choose from list), input (freeform input), 
  end (goodbye) - exactly one per screen
- multiple menus per screen - menus in the body are merged into a single 
  response; throws on ambiguous commands
- table parts - column-width allocation and word-wrap within 40 cols
- meta parts - arbitrary key-value metadata attached to screens
- static text middleware - auto-discovers `.txt` files in a directory and 
  registers routes; `_`-prefixed files excluded from routing (used for 
  includes/partials)
- text screen format and parser - custom `.txt` format supporting plain text 
  paragraphs, menu blocks, meta blocks, table blocks, `__input` and `__end` 
  commands, comments
- include system - `__inc` directive inlines other `.txt` files; cycle 
  detection and max depth limit
- template system - `{{key fallback}}` for session properties, 
  `{{/path fallback}}` for session.data deep paths; resolved after includes, 
  before parsing
- transport abstractions - telnet/TCP, CLI/readline, HTTP and stateless 
  - html transport, uses forms, links etc
  - json transport, serves raw `TextScreen` as json over the same http 
    layer; token in response body; CORS enabled; no rendering - clients 
    interpret the screen model directly; reference browser client at 
    `clients/json/index.html`
  - shell transport, stateless args based CLI with command chaining and users'
    current path persisted between calls
- connection state - per connection session binding (separate from session 
  storage)    
- session store; file backed, dirty-flag + auto-save
- sub-app mounting - `mount(app, state, sessions, prefix, setupRoutes, opts)` 
  mounts a sub-application at a path prefix; the sub-app receives a proxy 
  router that transparently prefixes routes, strips prefixes from `req.path`, 
  prepends prefixes on `res.redirect`, and rewrites screen paths; `end` 
  responses in mounted sub-apps are intercepted and converted to a redirect 
  back to the parent app; optional `dataKey` scopes `session.data` so the 
  sub-app reads/writes a nested object transparently; supports nesting
- reusable session routes - `useSessionRoutes(app, state, sessions, opts?)` 
  registers session management routes (`/welcome`, `/new`, `/resume`, 
  `/resume/:token`, `/token`, `/setname`, `/name/:name`, `/quit`); ships with 
  default static views in `data/session/static/`; consumers can override 
  individual views by providing a `staticDir` with replacement `.txt` files

### transport differences

levels describe capability (charset, layout, formatting) not transport - the 
same level 0 content is served over telnet/tcp, http, and cli, but there are 
minor transport-specific differences (eg echo is stream-only, form inputs are
http-only) - these are not level differences but still need to be considered

### sessions

basic session support; first screen welcomes user, gives them the option to 
start a new session or resume an existing one

session id is 16 chars, base32 (reduce char ambiguity), displayed in groups of 
4 - sessions are held in memory and auto-saved to disk when modified

a more secure username/password system can be layered over this later to protect
any non-trivial user data - not in scope for this iteration

## level 0

the universal floor - the minimum capability set that any client can be 
assumed to have: uppercase A-Z, 0-9, space; 40 cols; line-based I/O; no 
formatting, colour, cursor control, or negotiation

full definition: [docs/level-0.md](docs/level-0.md)

## capabilities

beyond level 0, capabilities are independent axes rather than a strict
hierarchy - a client declares (or the server detects) what it can do along 
each axis (charset, width, color, cursor, etc) and the server adapts

full taxonomy: [docs/capabilities.md](docs/capabilities.md)

## docs

- [docs/text-format.md](docs/text-format.md) - syntax reference for `.txt` screen files
- [docs/level-0.md](docs/level-0.md) - level 0 definition and contract
- [docs/capabilities.md](docs/capabilities.md) - capability taxonomy
- [docs/plan.md](docs/plan.md) - roadmap and done list
- [docs/guidelines.md](docs/guidelines.md) - code style and conventions

