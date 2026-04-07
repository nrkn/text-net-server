# plan

things that we're going to do next

if we do them remember to remove from here and maybe add to the app framework
section in readme, and maybe also to the `done` section below

## definitely

things we definitely want, but maybe not just yet

### frag

```
frag( ...screenParts )
```

### cap in dsl and text mode

```
cap({
  charmode: 'press h',
  pointer: 'click h',
  default: 'type h and press enter'
})
```

```
--cap
charmode press h
pointer click h
default type h and press enter
--
```

Seems like inline cap text syntax could be awkward - maybe:

```
To see help <<charmode press h|pointer click h|default type h and press enter>>
```

### capability wizard and telnet negogiation

*plan goes here*

but at least start the cap wizard before doing the stack nav - it will be a good
test of if we even need that

### json http transport

a new http transport that serves `TextScreen` as json rather than html

the current html transport targets HTML 2 capability (forms, links, 
accesskey as a progressive enhancement) - it's designed for the broadest 
browser support, but the html rendering is opinionated and limited

the json transport serves the screen model directly, allowing modern browser
clients (or any http client) to interpret and render screens however they want

#### how it works

same request flow as the html transport:

- token-in-url scheme (`/<TOKEN>/path`) for session binding
- POST body for input submission (json body instead of form-encoded)
- per-request router creation, dispatch, capture
- auto-save on dirty session

the response is the captured `TextScreen` serialized as json:

```json
{
  "parts": [
    { "type": "paragraph", "lines": ["HELLO USER"] },
    { "type": "menu", "menu": { 
        "title": "COMMANDS", 
        "items": [["N", "NEW GAME", "/new"], ["Q", "QUIT", "/quit"]] 
    }}
  ],
  "response": { 
    "type": "menu", 
    "menu": { 
      "title": "", 
      "items": [["N", "NEW GAME", "/new"], ["Q", "QUIT", "/quit"]] 
    }
  },
  "token": "YPAEPYNKSK3JRX6X"
}
```

`token` is included in the response body (created on `/new`, present when 
session is active) so the client knows which token to use in subsequent 
requests - no need to parse it from url redirects

#### input submission

POST json body rather than form-encoded:

```json
{ "input": "YPAEPYNKSK3JRX6X" }
```

the handler reads `input`, applies it to the input path from the current 
screen's response, and dispatches - same as the html transport but without 
the hidden `_inputPath` field (the server tracks it)

#### error responses

json errors instead of html error pages:

```json
{ "error": "NOT FOUND", "status": 404 }
```

#### implementation notes

- new file: `src/lib/app/create-json-handler.ts` - largely parallel to 
  `create-http-handler.ts` but returns json instead of calling `renderHtml`
- no new renderer needed - `TextScreen` is already a plain object, just 
  `JSON.stringify` it (possibly with a thin wrapper to add `token`)
- shares the same `HttpRequest`/`HttpResponse` types and `startHttp` transport
- the test-app gets a new entry point (eg `src/test-app/json.ts`) and npm 
  script
- content-type: `application/json`
- text sanitization (uppercase, charset stripping) is a rendering concern - 
  the json transport should serve the raw screen model as-is, leaving 
  sanitization to the client; this means the json handler bypasses 
  `renderText` entirely

### richer screen parts

initially, headers:

h1, h2, h3, h4

dsl:

```ts
h1('hello world')
```

text:

```
# hello world
```

in current level 0 state these are entirely semantic - they will render 
identically to paragraphs - but later when we have capabilities, they may render
bold, a different color, etc

initial output, with level 0 uppercase etc applied:

```
HELLO WORLD

```

later, other new parts might include lists etc

## maybe

### styling

tss - text style sheets

this is more like a "probably" but we'll keep it in maybe for now as it's quite
large in scope

css like - extend dsl and text format to allow tagging content (tags, similar to 
HTML classes) 

media-query like syntax for capabilities

currently text blocks (paragraphs, menus etc) emit an extra blank line as a 
separator - this is the kind of thing that could be controlled by tss, eg 

```css
/* one line-feed */
p { 
  margin-bottom: 1lf; 
} 

/* or maybe */
p::after {
  content: '\r\n';
}
```

capabilities, text decorations etc:

```css
@cap ansi-attr {
  h1 {
    font-weight: bold;
  }
}

@cap ascii {
  h1::before {
    content: '-=< ';
  }

  h1::after {
    content: ' >=-';
  }
}
```

no attempt made for parity with css - use a small subset - add features as they 
are needed/useful

### gemini transport

request-response transport like http; gemini has a native input mechanism - 
status codes 10/11 cause the client to prompt for freeform text, which is 
URL-encoded and sent as the query on a follow-up request to the same URI; 
status 11 hides input (for tokens etc)

session tokens go in the URL path like the http transport; output is gemtext 
(line-oriented format with links, headings, lists) — needs a gemtext renderer 
alongside html and text

mandatory TLS; one connection per request; port 1965

### websocket transport

persistent bidirectional stream like telnet — fits the existing line-based 
`CreateHandler` pattern directly; client sends lines, server writes to the 
stream

works through firewalls and browsers unlike raw telnet; could share the same 
http server (upgrade handshake on the existing port)

### stack based nav

replace res.redirect with:

- res.push
- res.pop
- res.replace

useful for modals, wizards etc

could be either explicit (you call manually from route handlers), or automatic,
framework uses semantic meaning (eg is this a menu) to decide what to push and
pop, or some combination of the two (have to be careful that they interact 
gracefully)

### flash middleware

allow a route to send a message to the next screen, cleared after display

shown at the top before the normal screen render

## future

when the server is relatively stable, we can start using it to make some things

### pvz demake

basic ui:

```
   0 1 2 3 4 5 6 7 8 9 

A  L S . . . . . . Z .  
B  L S . . . . . . . Z 
C  L . . P . O . Z . . 
D  L S . P . Z . Z . C  
E  L S . . . . . . . . 
```

key:

```
L Lawnmower
S Sunflower
P Peashooter
O Pea Projectile
Z Zombie
C Conehead Zombie
```

when multiple objects on one tile:

```
   0 1 2 3 4 5 6 7 8 9 

A  L S . . . . . . Z .  
B  L S . . . . . . . Z 
C  L . . P . .:1:. . . 
D  L S . P-Z . . Z . C  
E  L S . . . . . .:2:Z 


1 C6 Pea, Zombie
2 E8 Buckethead, Zombie, Zombie
```

also note above where Peashooter being bitten by zombie `P-Z`

real time sim but with always paused mechanic; player makes actions while 
"paused", then chooses how many seconds to advance, eg `a 0.5` or `advance 10`

### integrate with other text systems

fidonet et al have news/message passing systems - investigate and implement

## done

things that were on one of the lists above, but we did 'em

### text based screen format and static middleware

static middleware auto-discovers `.txt` files in a directory and registers 
routes for them; filenames starting with `_` are excluded from routing 
(reserved for includes etc)

custom text format supports: plain text paragraphs, menu blocks, meta blocks,
table blocks, `__input` and `__end` commands, `__inc` includes (with cycle 
detection and depth limit), and `{{key fallback}}` / `{{/path fallback}}` 
session templates

multi-pass parser: includes first, then templates, then blocks and commands

full syntax reference: `docs/text-format.md`

### allow multiple menus

eg: 

```
screen(  
  p('this is some screen'),
  'you can pick from simple options',
  menu(
    'basic options',
    [ 'A' 'Foo', '/foo' ]
    [ 'B' 'Bar', '/bar' ]
  ),
  'but you can also do more advanced things',
  menu(
    'advanced options',
    [ 'C' 'Baz', '/baz' ]
    [ 'D' 'Qux', '/qux' ]
  ),
  // etc
)
```

the screen.response.menu remains a single menu; multiple menus in the body get 
merged. throws if merging a menu causes ambiguity


### subrouting / sub-apps

`app.mount(prefix, setupFn, options)` - mount a sub-application at a path 
prefix; the sub-app is a regular `setupRoutes` function that doesn't know its 
mount point

enables:

- reusable modules - session/token management, common views etc as mountable 
  route modules
- composable apps - a bbs mounts games at `/chess`, `/forum` etc; each game 
  is also a standalone app
- namespace isolation - routes, middleware, and session data are scoped to the 
  mount prefix

#### how mount works

mount creates a proxy app object that the sub-app's `setupRoutes` receives:

- `subApp.on(path, ...handlers)` -> registers as 
  `app.on(prefix + path, ...wrappedHandlers)`
- `subApp.use(...handlers)` -> middleware only runs for paths under the prefix
- `subApp.mount(subPrefix, fn)` -> nests further: `prefix + subPrefix`
- `req.path` inside sub-app handlers shows the path with prefix stripped 
  (`/games/chess/board` -> `/board`)
- `res.redirect(path)` inside sub-app handlers prepends the prefix 
  (`/board` -> `/games/chess/board`)

static middleware (`useStaticRoutes`) works unchanged - it calls `app.on()`, 
which the proxy prefixes automatically; templates and includes are unaffected

#### session data scoping

mount takes an optional data key:

```ts
app.mount('/games/chess', chessSetupRoutes, { dataKey: 'chess' })
```

sub-app sees `session.data` but it's transparently scoped - reads and writes 
go to `session.data.chess` on the real session; template tags using `{{/key}}` 
resolve against the scoped data

when no `dataKey` is provided, the sub-app shares the parent's full 
`session.data` (useful for utility modules like session management that need 
access to top-level session properties)

#### end response in sub-apps

when standalone, `end` closes the connection / ends the session as normal

when mounted, `end` is intercepted by mount's wrapper and converted to a 
redirect back to the parent app; the sub-app's goodbye text is discarded 
(it's for standalone mode only)

the return path is required in mount options:

```ts
app.mount('/games/chess', chessSetupRoutes, { 
  dataKey: 'chess', returnPath: '/games' 
})
```

#### standalone vs embedded

a sub-app exports its core routes separately from session management:

```ts
// chess/routes.ts - core game routes (no session management)
export const setupChessRoutes: SetupRoutes = (app, state, sessions) => {
  useStaticRoutes(app, 'data/chess/static', () => state.session)
  app.on('/move/:move', ...)
  app.on('/board', ...)
}
```

standalone - wraps core routes with session management:

```ts
// chess/standalone.ts
createStreamHandler((app, state, sessions) => {
  useSessionRoutes(app, state, sessions)
  setupChessRoutes(app, state, sessions)
}, sessions, '/welcome')
```

embedded in a parent app:

```ts
// bbs/routes.ts
setupRoutes = (app, state, sessions) => {
  useSessionRoutes(app, state, sessions)
  app.mount('/chess', setupChessRoutes, { dataKey: 'chess', returnPath: '/games' })
  app.mount('/forum', setupForumRoutes, { dataKey: 'forum', returnPath: '/games' })
}
```

#### reusable session routes

extract current session/token management from test-app/routes.ts into a shared
module (`useSessionRoutes`) that any app can mount; provides `/welcome`, 
`/new`, `/resume`, `/resume/:token`, `/token` - the test-app itself would use 
it as the first consumer

has default views, but consumers can override

#### implementation notes

- mount is implemented on the router, not the transport/handler layer - the 
  proxy app is a thin wrapper over `app.on` and `app.use`
- scoped middleware wraps each handler to check path prefix before executing
- session data scoping passes a modified `state` to the sub-app where 
  `state.session.data` is proxied to `session.data[dataKey]`
- no changes needed to transports, renderers, or the static text system
