# plan

things that we're going to do next

if we do them remember to remove from here and maybe add to the app framework
section in readme, and maybe also to the `done` section below

## maybe

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

## definitely

things we definitely want, but maybe not just yet

### text based screen format and static middleware

like express:

`app.use(static('data/test-app/static'))`

text format should be:

- able to do everything our screen helper can:
  - text parts
  - menu parts
  - meta parts
  - menu response | input response | end response
- easy to parse
- easy to write  

extension is .txt

filenames starting with _ should not be routed - they are reserved for eg
wip views, includes etc

- static/welcome.txt -> routes as /welcome
- static/cool-game/start.txt -> routes as /cool-game/start

#### text formatting

text is plain:

```
Help

Type a command letter and press Enter.
```

`// single line comments` - ignored and stripped

menu syntax (special form of the general block)

```
==Commands
N New Session /new
R Resume Session /resume
==
```

general block syntax:

```
--{ id } // open block and id
{ content }
-- // block close
```

meta syntax (general block):

```
--meta
path /welcome
isEntry
message Hello World
--
```

eg:

```js
{ 
  type: 'meta', 
  meta: { path: '/welcome', isEntry: true, message: 'Hello World' }
}
```

table syntax (general block - columns are split on |, `\|` = literal `|`):

```
--tab
N - |Set or change your display name.
T - |Show your session token for resuming later.
H - |Show this help screen.
Q - |Quit and disconnect.
--
```

general inline/command syntax:

```
__{ id } { ...args }
```

input response sytnax (general command):

```
__input /resume/:token
```

end response syntax (general command):

```
__end Goodbye.
```

include syntax (.txt extension implied):

```
__inc _menu-main-actions
__inc cool-game/_menu-game-actions
```

literally, delete this line and insert the include. when parsing we can 
maintain a stack/queue rather than calling recursive functions - we will need
a sensible MAX_INCLUDE_DEPTH constant (throws), and also a cycle detector 
(throws)

very simple templating - inline version - replace via session `{{key}}` or 
session.data `{{/key}}`:

```
Hello {{name}}, this is visit #{{/visitCount}}
```

The second form uses json path like syntax rooted on session data, as data could 
contain anything, so eg `Your first item is #{{/items/0}}`

also, allow fallback:

```
Hello {{name User}}, this is visit #{{/visitCount 1}}
```

if you call the first form and the key does not exist, throw

inline template tags can appear anywhere - text, menu titles, table cells, even
meta 

all includes should be resolved first

implemented as traditional basic parser; line scanners + state flags eg inMenu, 
for loops, queue for includes etc - multi pass; includes, variables, blocks

## done

things that were on one of the lists above, but we did 'em

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
