# telnet experiment

define a level 0 support subset and serve some basic menus over telnet+tcp using
as little code as possible and only node.js built ins

allows targeting an interface for eg text games etc at practically any hardware
with TCP capability - eg retro machines with modern network adapter add-ons 
etc 

by being extremely conservative at level 0, we can ensure operability even with 
clients that are closer to text-over-tcp than proper telnet 

### transport differences

levels describe capability (charset, layout, formatting) not transport - the 
same level 0 content is served over telnet/tcp, http, and cli, but there are 
minor transport-specific differences (eg echo is stream-only, form inputs are
http-only) - these are not level differences but still need to be considered

## sessions

basic session support; first screen welcomes user, gives them the option to 
start a new session or resume an existing one

when starting a new session, a unique token is generated and can be viewed 
from the main menu - the user can use this token to resume later

session id is 16 chars, base32 (reduce char ambiguity) eg:

base32 chars: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`

session id: `YPAEPYNKSK3JRX6X`

display for user: `YPAE PYNK SK3J RX6X`

collision chance low but verify each token is unique anyway

this was chosen as a reasonable trade off between combinatorial space and 
ease of memorizing and/or writing it down

a more secure username/password system can be layered over this later to protect
any non-trivial user data - not in scope for this iteration

allow entering in lowercase, with or without spaces, with hyphens etc

sessions are held in memory and auto-saved to disk when modified - this avoids
the need for an explicit save command while keeping persistence simple

## terminal capability

do not assume any negotiation capability (see content negotation below)

level 0 is the universal floor - the minimum capability set that any client
can be assumed to have

beyond level 0, capabilities are independent axes rather than a strict
hierarchy of levels - a client declares (or the server detects) what it can
do along each axis (charset, width, color, cursor, etc) and the server adapts

this is capability-based rather than feature-based because retro hardware
capabilities don't stack neatly - a C64 has color but PETSCII not ASCII, a
VT100 has cursor control but no color, etc

capabilities are discovered through a combination of negotiation where
possible (eg telnet NAWS/TTYPE), and for features outside the purview of
negotiation, allowing the user to configure their terminal with a capability
wizard, eg:

```
YOU ARE ABOUT TO ENABLE {feature}

IF THE OUTPUT ON NEXT SCREEN IS NOT 
READABLE TYPE U + ENTER TO UNDO
```

auto-detected capabilities are applied as defaults; the wizard confirms or
overrides them; the resulting profile is stored in the session

see capability taxonomy below for the full set of axes

## level 0

### character set

no reliance on lowercase, special symbols, extended ASCII / Unicode etc

- A–Z
- 0–9
- SPACE

these should also be broadly available; if we find that in practise some clients
don't support them, consider moving them to a higher capability requirement:

- .,-: 

### layout

no assumptions about fixed width fonts, alignment precision etc

- 40 cols
- line based

### formatting

No:

- colour
- cursor movement
- ANSI codes
- control sequences

use `\r\n` for output linebreaks for max compatibility

### structure style

use position + spacing, not punctuation, for meaning

avoid ascii art etc

short and long forms shown and both can be used

```
COMMANDS

S START
O OPTIONS
Q QUIT
```

### input 

assume only:

- A–Z
- 0–9
- SPACE

does not mean that the user cannot enter other characters, just that they 
should not be relied on; eg depending on context, the user may type in a 
token as eg `ypae-pynk-sk3j-rx6x`, but it's equivalent to typing 
eg `YPAEPYNKSK3JRX6X`

### input model

line based only, prompt is `{ GT }{ SPACE }`:

```
> 
```

user types something then presses ENTER to submit:

```
> S
```

handle: 

- `\r`
- `\n`
- `\r\n`

trim leading/trailing whitespace, collapse multiple whitespace to single space, 
max input 128 characters

also watch out for clients sending eg null or bel - discard control 
characters < 32 except CR and LF

### command style

space separated, no punctuation, case-insensitive

verbose:

```
START 
PLACE C4
WAIT 5
FIRE 1
```

short:

```
S
P C4
W 5
F 1
```

we will still treat the users input as being case-sensitive for certain 
situations, for example, if we ask the user for their name and store it in 
their session, we will store it as it was typed (perhaps still trimming 
leading/trailing ws)

### error handling

```
INVALID COMMAND
```

No:

- editing
- cursor movement
- backspace

on blank inputs, eg just ENTER, ignore and resend current screen and prompt

### echo mode

always echo back, do not assume client provides echo, even though almost all
clients will - keeps it sane for oddball clients and those that are closer to
text-over-tcp than actual Telnet

### content negotiation

level 0 does not use option negotiation

if a client sends a negotiation command, do not enable anything

parse and consume negotiation bytes so they do not affect command/input parsing

swallow iac etc

- reply WONT to DO/DONT
- reply DONT to WILL/WONT

### output pacing

not part of the level 0 contract, but keep in mind for slow clients (eg 
WiModem232 bridging TCP to serial at low baud rates) - TCP backpressure 
should handle most cases, and screens are small enough to fit typical buffers,
but a per-line delay may be needed if real hardware testing reveals issues

write one line and if socket.write returns false wait for drain

100ms delay between lines - it seems conservative, but so is assuming only 
uppercase letters are available - we want to *guarantee* the broadest support
possible - modern consumers can assume that it's "part of the charm"

we can add faster (negotiated and/or user configurable) output pacing as a
capability upgrade

## capability taxonomy

capabilities are grouped by direction and concern - level 0 values shown in
parens as the default/minimum for each axis

### output - screen geometry

- **width**: 20 | 40 | 64 | 80 | custom (40)
- **height**: 16 | 24 | 25 | custom | unlimited/scrollback (unlimited)
- **scroll**: line (teletype, append-only) | screen (fixed page, clear/redraw) (line)

### output - text rendering

- **charset**: upper-subset | ascii | petscii | atascii | ... (upper-subset)
- **style**: none | inverse | ansi-attr (bold/underline/inverse/blink) (none)
- **color**: none | ansi-8 | ansi-256 (none)
- **drawing**: none | semigraphics (block chars, box drawing) (none)

### output - cursor control

- **addressing**: none (teletype) | addressable (move to row,col) (none)
- **clear**: none | screen (can clear and redraw) (none)

### input

- **input**: line (buffered, enter to submit) | char (keystroke-at-a-time) (line)
- **editing**: none | backspace | line-edit (local echo, cursor-within-line) (none)
- **keys**: alpha (printable + enter) | arrows | function (F-keys) (alpha)

### transport

- **flow**: none | xon-xoff | implicit (TCP backpressure) (none)
- **encoding**: 7bit | 8bit | utf8 (7bit)

### notes

scroll + addressing together define the rendering model - level 0 is
scroll:line + addressing:none (a teletype) - once you have both scroll:screen
and addressing:addressable you're in curses territory

input:char is the big unlock for interactivity - it's what separates "type a
letter and press enter" from "press a key and something happens" - but it
implies the server handles echo, which means the server needs to know about
editing too

height matters once you have scroll:screen - you need to know how many rows
to fill - with scroll:line (level 0) it's irrelevant

encoding vs charset are different axes - a PETSCII machine is 8bit encoding
with a non-ASCII charset - a VT100 is 7bit ASCII - a modern terminal is utf8
ASCII-superset

## application framework

some things we support beyond just implementing the telnet-style server and 
level 0 contract:

- router - express style path matching with params, redirect, middleware etc
- screen dsl - structured screen assembly helpers
- screen model - screens composed of screenparts, flattened at render time
- response types - menu (choose from list), input (freeform input), 
  end (goodbye)
- transport abstractions - telnet/TCP, CLI/readline, HTTP and stateless 
  - html transport, uses forms, links etc
  - shell transport, stateless args based CLI with command chaining and users'
    current path persisted between calls
- connection state - per connection session binding (separate from session 
  storage)    
- session store; file backed, dirty-flag + auto-save

