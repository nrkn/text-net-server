# telnet experiment

define a level 0 support subset and serve some basic menus over telnet+tcp using
as little code as possible and only node.js built ins

allows targeting an interface for eg text games etc at practically any hardware
with TCP capability - eg retro machines with modern network adapter add-ons 
etc 

by being extremely conservative at level 0, we can ensure operability even with 
clients that are closer to text-over-tcp than proper telnet 

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

first, we will work against a level 0 capability subset

later, we will provide more levels

these will work through a combination of negotiation where possible, and for
features outside the purview of negotiation, allowing the user to configure 
their terminal with a capability wizard, eg:

```
YOU ARE ABOUT TO ENABLE {feature}

IF THE OUTPUT ON NEXT SCREEN IS NOT 
READABLE TYPE U + ENTER TO UNDO
```

this will unlock extended level support beyond the level 0 below, eg 
extended ascii/petscii, 80 columns, ANSI, raw character mode, cursor support
etc etc etc

## level 0

### character set

no reliance on lowercase, special symbols, extended ASCII / Unicode etc

- A–Z
- 0–9
- SPACE

these should also be broadly available; if we find that in practise some clients
don't support them, consider moving them to level 1:

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

PRESS H FOR HELP
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

we can add faster (negotiated and/or user configurable) output pacing at 
subsequent levels
