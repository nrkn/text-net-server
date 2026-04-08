# text screen format

syntax reference for `.txt` screen files used by the static middleware

## file routing

files are auto-discovered in the static directory and routed by path:

- `static/welcome.txt` → routes as `/welcome`
- `static/cool-game/start.txt` → routes as `/cool-game/start`

filenames starting with `_` are not routed - reserved for includes, partials,
wip views etc

## processing order

files are processed in three passes:

1. **includes** - `__inc` directives are resolved first
2. **templates** - `{{...}}` tags are interpolated
3. **parsing** - blocks, commands, and text are parsed into screen parts

## plain text

plain text becomes paragraph parts; blank lines separate paragraphs:

```
Help

Type a command letter and press Enter.
```

## comments

single line comments - ignored and stripped:

```
// this is a comment
```

must be at the start of the line (after trim)

## headings

markdown-style headings using `#` through `####`:

```
# Main Title
## Section
### Subsection
#### Minor
```

produces heading parts with levels 1-4; at level 0 these render identically to
paragraphs (semantic only) but capable renderers may style them differently

## menu blocks

menu syntax is a special form of the general block - `==` opens with a title
and `==` closes:

```
==Commands
N New Session /new
R Resume Session /resume
==
```

each line inside is: `{short} {long} {path}`

multiple menus per screen are supported - they are merged into a single 
response; throws if merging causes ambiguous commands

## general blocks

opened with `--{id}` and closed with `--`:

```
--{id}
{content}
--
```

### meta

arbitrary key-value metadata attached to the screen:

```
--meta
path /welcome
isEntry
message Hello World
--
```

keys without a value are treated as `true`; numeric strings are parsed as
numbers; everything else is a string

produces:

```js
{ type: 'meta', meta: { path: '/welcome', isEntry: true, message: 'Hello World' } }
```

### tab

table block - columns are split on `|`, use `\|` for a literal pipe:

```
--tab
N - |Set or change your display name.
T - |Show your session token for resuming later.
H - |Show this help screen.
Q - |Quit and disconnect.
--
```

columns are auto-sized to fit within 40 cols with word-wrap

## inline commands

general form: `__{id} {args}`

### __input

sets the screen response to freeform input; the path uses `:param` syntax
for the user's input:

```
__input /resume/:token
```

### __end

sets the screen response to end (disconnect); the argument is the goodbye
message:

```
__end Goodbye.
```

### __inc

includes another `.txt` file inline (extension is implied):

```
__inc _menu-main-actions
__inc cool-game/_menu-game-actions
```

the include directive is replaced with the contents of the referenced file;
includes are resolved recursively with a max depth of 10 and cycle detection
(both throw on violation)

all includes are resolved before template interpolation and parsing

## templates

session variable interpolation using `{{...}}` tags; can appear anywhere -
text, menu titles, table cells, meta values

### session properties

`{{key}}` reads a top-level session property; throws if the key is not found
or is empty:

```
Hello {{name}}
```

### session data (deep path)

`{{/path}}` reads from session.data using `/`-separated path segments:

```
Your first item is {{/items/0}}
```

### fallback values

both forms support a fallback after a space - used when the key is missing or
empty:

```
Hello {{name User}}
Visit #{{/visitCount 1}}
```

## response types

every screen must have exactly one response type:

- **menu** - one or more menu blocks in the screen (merged automatically)
- **input** - an `__input` command
- **end** - an `__end` command

mixing menu with input or end is not allowed; only one input or end per screen
