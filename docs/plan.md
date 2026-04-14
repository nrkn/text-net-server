# plan

things that we're going to do next

if we do them remember to remove from here and maybe add to the app framework
section in readme, and maybe also to the `done` section below

## current WIP

pvz sim from definitely

## definitely

things we definitely want, but maybe not just yet

### src/modules

currently, even though they mount as sub-apps, notes and guessing game are 
hard coded into test-app; if we create a second app we would have to copy them
over. they are theoretically standalone if passed eg STATIC_DIR and LOGS_DIR,
we should move them to src/modules using something like:

`createGuessingGame( staticDir, logsDir )`

the impending pvz sim sub-app should also use this system, but we'll build it
inside test-app first so we can shake out any additional complexity

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

no attempt made for parity with css - use a very small subset and only add 
features as they are needed/useful

we might also use an alternate syntax that's easier to parse (possibly even
based on our existing text format), but css syntax is used above for familiarity

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

### structured command response

do we need an additional response type for structured commands? it's not 
strictly necessary, as the existing freeform input can handle it well enough, 
but having it as a screen part would mean that clients that take raw json can 
produce better UX if they know the command structure, eg you could actually 
display a palette of plants, click one, click the board tile to plant, then the 
client sends the appropriate structured command

but we could also use the existing meta part to decorate this data for rich
clients 

think about it!

## future

when the server is relatively stable, we can start using it to make some things

### bbs

with some message boards and a few games

### pvz demake

why? firstly - it will be a lot of fun to make. secondly, it's a really good 
stress test for the system and overall philosophy. thirdly, people will 
probably think it's neat, so could be a draw for our little bbs, or help get
some eyes on text-net-server

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

### db

we need a way to persist state outside of sessions (session.data can maybe 
however link to the state - eg session.data.chess.storeName or etc) - for 
example, for game sims and etc

because we have no external deps as a rule, it has to be simple and robust

probably the best bet is an append only log, with in memory snapshots created
by replaying the log to avoid constantly hitting the disk; we can also store 
disk snapshots intermittently so that we don't have the replay the entire log 

we are running in node so we have a single thread and file writes (especially 
appends) are pretty reliably atomic 

worst thing that can happen is that a single log entry gets corrupted, we can
detect and skip bad entries

this is why it makes more sense than eg a JSON store, where we can run into all 
kinds of issues doing read-modify-write

if logs start taking up too much space, we can snapshot then truncate the log

might look something like:

```
1710000000 POST general nik "hello world"
1710000012 GUESS_GAME nik 42
```

append only logs can be used in a variety of ways depending on use case

for example, a log that was handling some state might do (json-path syntax over 
the state object):

```
1710000000 set foo/bar/0 "hello"
1710000012 delete foo/bar/1
```

framework can provide helpers for the above

or a game sim might be like:

```
1710000000 new-game
1710000032 seed 16798
1710000123 player move n
1710000134 player move e
1710000134 game spawn bat 13,34
```

in this case, it's specific to the game, so the game itself handles 
replay/reducing

use cases:

- system log; connections, telnet negotiation, errors etc
- input log; raw user traversal per session, for debugging, replays etc
- domain log; sim events with custom reducer

contract would be something like one entry per line, timestamp first, rest of 
the line format is up to the writer/consumer

text for compact/human readable logs, NDJSON for more complex data

in src/sims/readme.md we talk about game sims being pure and just taking a dep
for persistence - this enables that

we could also do something, at the low log level, that's a bit like the zone 
allocator in doom - a log can be marked static (a game in progress, system log 
etc) or purgable (completed games, temporary data etc) and if (when haha) we run 
out of disk, it can tidy up from purgable, doesn't have to be smart, can delete
oldest, biggest etc; todo consider how this interacts with snapshots

### json http transport

`src/lib/app/create-json-handler.ts` - serves `TextScreen` as json rather 
than html; shares the same `startHttp` transport and request flow as the html 
handler (token-in-url, per-request router, auto-save) but returns raw screen 
model as json with a `token` field; no renderer needed

the client sends input via the screen's `response.path` template (e.g. 
`/name/:name`) - the client substitutes the param client-side and navigates 
via GET, so no POST or server-tracked input path is needed for the client; 
the handler also supports POST with `{ "input": "..." }` using server-tracked 
`_inputPath` in `session.data` for non-browser clients

error responses are json: `{ "error": "NOT FOUND", "status": 404 }`; 
content-type is `application/json`; CORS headers included for cross-origin 
clients

text sanitization (uppercase, charset stripping) is left to the client - the 
json transport serves the raw screen model as-is

a reference client is provided at `clients/json/index.html` - a single-file 
browser client that fetches from the json handler and renders screens using 
DOM elements; supports keyboard shortcuts for menu items (press the short key 
directly, no modifier needed)

test-app entry point: `src/test-app/json.ts`; npm script: `npm run json`

### richer screen parts (headings)

heading parts (`h1`–`h4`) - a new `HeadingPart` type 
`{ type: 'heading', level: 1|2|3|4, text: string }` added to the screen model

dsl: `h1('title')` through `h4('title')`; text format: `# title` through 
`#### title` (markdown-style)

at level 0 headings render identically to paragraphs (semantic only); the json 
client renders them as proper `<h1>`–`<h4>` elements

existing views updated - title-like first paragraphs in static `.txt` files 
and programmatic views converted to `h1`

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
