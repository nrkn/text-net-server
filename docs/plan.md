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
