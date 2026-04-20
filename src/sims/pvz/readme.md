# goal

not to perfectly simulate pvz - but to be close enough that the levels play out
much the same - slight differences here and there are no big deal, though as
levels and waves get more complex we might have to tighten it up a bit to 
maintain cadence

# todo

we have a lot of places where instead of using a random range for a number, we
simplified by just picking a midpoint number - it would be nice for replays
to play out slightly differently so look into adding ranges to more things

---

towers should have optional ranges (puff/chomper etc) and infinite if not set,
but can wait til we have those plants

---

armour - we currently just roll it into hp - we will need this later though

## done

nb - these are just sketches, it's important to note that we didn't necessarily 
implement them exactly like the sketch, we just followed the general intent

---

manual mower launch - we support it but it's actually from pvz2! we left it in
behind canLaunch on the level def (defaults false). the ux filters the command
out and canLaunchMower rejects with launchNotAllowed when disabled.

---

adaptive pacing - waves are currently fixed - pvz does something like, if all
zombies cleared, send next wave early - we need this because stalling is an
important strat

---

the logical board should be bigger, eg contain addressable but not 
interactable cols on the right where zombies enter - projectiles/mower can 
actually hit the zombies in these cols, even if the player can't plant here

---

wave system is wrong - the zombies inside a wave don't have time offsets - they
spawn:

- all at once
- randomly between x 10.25 to 10.75
- have random speeds in a range, so they appear to spread out

we need to implement logical board per above - peas and mowers can go there,
can't plant, and the views can ignore oob - I think we throw an error somewhere
currently which we shouldn't do
we also need to update zombie defs to have a range instead of fixed speed, as 
a tuple [ from, to ] then use random.range when we spawn the zombie

---

wave point system - we currently hard code the waves eg:

```
{
  startTime: 190,
  spawns: [
    { kind: 'normal' },
    { kind: 'normal' },
    { kind: 'normal' },
    { kind: 'normal' },
    { kind: 'normal' },
    { kind: 'normal' },
    { kind: 'normal' },
    { kind: 'normal' },
  ]
}
```

Pvz has hard coded waves too, but also random waves - we need to add these

ZombieDef should get a waveCost:

normal 1
cone 2
bucket 4

Then a spawn can either be hardcoded (as above), or be a whitelist of zombies
to choose:

```
{
  startTime: 190,
  spawns: [
    { kind: 'normal' },
    { kind: 'normal' },
    [ 'cone', 'bucket' ]
  ]
}
```

The formula is (3/wave)+1 points; plus multiplers for flag waves etc; so we 
should add `pointMultipler?: 2.5` to the wave type; we also need to add 
weighted random to random.ts? or just existing pick is enough?

normal zombies are *always* allowed regardless of whitelist, so `[]` is actually
`[ 'normal' ]` - this ensures remaining points can always be spent

the whitelist is filtered to only include zombies that can be afforded from
the wave point budget at each point spend

How does state store spawns now that they're random?

1. add levelRng to state - we can re-seed a random instance with this number 
   whenever we need to recalculate the actual spawns - pros, small change to
   state, in line with other "derive don't store" decisions, cons, overhead

2. store the spawns directly in state, on new state calculate them once,
   pros, easy and fast, cons, bloats state, inconsistent with other decisions

(note from future Nik - we used 1)

---

extract common levelDef values, eg `plantableTiles: allTiles` etc to a base 
LevelDef - make the existing level defs partial and extend

---

1-3 needs cherry bomb:

buyCost: 150
buyCd: 50
hp: technically 300 but invulnerable while fuse is lit
1 second fuse on planting (can use actionCd)
insta-kill all zombies in 3x3 pattern, destroys plant

how can we make this behaviour reusable, so it can be applied to any plant?
maybe add { explodes?: '3x3' } (we can add types other than 3x3 later if needed)
to PlantDef?

---

deprioritize recently mowed rows when spawning random-row zombies - it tracks
which wave the mower fired on per row then weights the row selection for new
spawns accordingly:

```
since fired/chance
0–1	0.01	Nearly zero chance (~1%)
2	  0.5	  Half weight
3+	1.0	  Normal
```

so we will need to add weighted to random

---

replay log:

```
{time} req { reqid } { playerLogLine } 
{time} res { reqid } { simEventLine[ 0 ] } 
{time} res { reqid } { simEventLine[ 1 ] } //etc
```

where time is state.time

if an error (state.error) occurs then it will be:

```
{time} req { reqid } { playerLogLine } 
{time} res { reqid } { error } 
```

---

when playing, the sim log is overwhelming - especially zombies biting 

we need to add:

a setting to the test-app sub app, can be configured from either the main game
menu or while playing, that sets the logging level

we should also extend the logging to log every single event however small - 
these include plant buy cooldowns becoming available, and anything else useful
we can think of 

the log levels should be (initial, we will refine):

- none
- minimal; wave spawned (we don't have currently), plant died, zombie started 
  biting, zombie died
- detailed; everything except `proj fired`, `proj hit` and `zombie biting`
- verbose; everything

we will need a data def to define what gets logged at which level

---

the multi-per tile approach in view is pretty good, but could be better:

if a plant and a projectile are on the same tile, just show the plant
if a projectile and a zombie are on the same tile, just show the zombie

otherwise, behave as normal

---

wave timing (again lol)

in real game, there are a few exceptions in early game, but for the most part:

first wave - 18 seconds
subsequent waves - 28 seconds later (actually 25-31)

we currently hard code (excepting wave acceleration mechanic) the wave start
times

---

place a plant on a zombie - at the moment it pushes the zombie to the right as 
a side effect of the "is zombie coming into range to bite a plant" mechanic

in real game, zombie stops walking and starts biting, but stays where they are

---

real game has anti-clumping - we are seeing RNG produce most or all zombies in
one lane on wave spawn - find the rough weighting used by real game and apply

---

in the real game it seems that at the beginning of the level, only some plants
are available immediately (sunflowers and ...?), especially once seed packets 
are available - other plants have to wait out their buy cooldown
