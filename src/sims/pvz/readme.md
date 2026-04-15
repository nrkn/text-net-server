# todo

make the current event log first class - at the moment, if you borrow the 
terminology from text-net-server, the player event log is requests - the event 
log is responses, but only advancing generates a response; you could also say 
more strictly that the reduced state is the response, but I'm thinking you can 
produce a combined log which is like: 

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

towers should have optional ranges (puff/chomper etc) and infinite if not set,
but can wait til we have those plants

## done

nb - these are just sketches, didn't necessarily implement them exactly 
like this

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
a tuple [ 0.29, 0.4 ] then use random.rangeInt when we spawn the zombie

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
