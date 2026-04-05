# capability taxonomy

capabilities are grouped by direction and concern - level 0 values shown in
parens as the default/minimum for each axis

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

## output - screen geometry

- **width**: 20 | 40 | 64 | 80 | custom (40)
- **height**: 16 | 24 | 25 | custom | unlimited/scrollback (unlimited)
- **scroll**: line (teletype, append-only) | screen (fixed page, clear/redraw) (line)

## output - text rendering

- **charset**: upper-subset | ascii | petscii | atascii | ... (upper-subset)
- **style**: none | inverse | ansi-attr (bold/underline/inverse/blink) (none)
- **color**: none | ansi-8 | ansi-256 (none)
- **drawing**: none | semigraphics (block chars, box drawing) (none)

## output - cursor control

- **addressing**: none (teletype) | addressable (move to row,col) (none)
- **clear**: none | screen (can clear and redraw) (none)

## input

- **input**: line (buffered, enter to submit) | char (keystroke-at-a-time) (line)
- **editing**: none | backspace | line-edit (local echo, cursor-within-line) (none)
- **keys**: alpha (printable + enter) | arrows | function (F-keys) (alpha)

## transport

- **flow**: none | xon-xoff | implicit (TCP backpressure) (none)
- **encoding**: 7bit | 8bit | utf8 (7bit)

## notes

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
