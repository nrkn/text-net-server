# goal

not to perfectly simulate pvz - but to be close enough that the levels play out
much the same - slight differences here and there are no big deal, though as
levels and waves get more complex we might have to tighten it up a bit to 
maintain cadence

# todo

it's getting tedious defining the waves - and for good reason, the real game
doesn't hard code the waves it has:

LevelDef.waveCount
LevelDef.zombieWhitelist
LevelDef.heroZombie 

Every 10th wave is flag wave with 2.5x points, 
plus min(budget,8) + 1 normal zombies

Each wave's pool is the whiteList, filtered on ZombieDef.earliestWave

heroZombie is forced on the midpoint wave (math.floor), and the final wave

Every allowed zombie that hasn't appeared yet is forced to the final wave

---

we have a lot of places where instead of using a random range for a number, we
simplified by just picking a midpoint number - it would be nice for replays
to play out slightly differently so look into adding ranges to more things

---

armour - we currently just roll it into hp - we will need this later though

---

chomper *can* target vaulter, pogostick if they are frozen or buttered

---

Seed bank! Now we have enough plants that the player has to choose

We need a new player action event - PvzChoosePlantsEvent

{
  type: 'choosePlants',
  seedBank: PlantName[]
}

We need State.maxPlants - set to 6 initially in pvz-new 
We need State.seedBank: PlantName[]

We shouldn't hard code 6 anywhere, as later you can unlock 8/9 slots

If a level has no whitelist, then that level requires choosing plants (actually
how do we handle no whitelist at present, do we fall back to plantNames or...?)

If a level has a whitelist, it requires choosing plants if > 6 in whitelist

The event fails if the plants aren't in the whitelist, if exactly maxPlants is 
not chosen, if the seedBank contains dupes etc

If pvz-sim detects that plants should have been chosen but they weren't, error
and set unplayable

Places that currently use the whitelist (UI etc) should use seedBank instead

Player should only be able to place from the seedBank

test-app needs a select plants step/menu when needed, go straight to play if not

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

---

chomper! this one gets complex

it uses the state machine (currState on Plant instance)

unlike proj based plants, it can only target its own tile and the next tile to 
the right - we should add optional range to PlantDef, treat as infinite if not 
set - should be used by plantHasTarget query

we also need something like targetBlacklist?: ZombieName[] - it can't target 
pole vaulters or pogo stick zombies - but it *can* target pogo zombies with no 
stick or pole vaulters who have already vaulted - so ZombieName[] isn't enough, 
we need to know their state! importantly though, it does *try* to bite but 
counts as a miss

0/undefined (initial) IDLE, waiting for a target - if found, sets a nextAction
of 0.7, at which time it moves to CH_BITING

1 CH_BITING 
  if not tough flag (gargantuars etc - ZombieDef.isTough = true) insta kill and 
  moves to CH_EATING
  if tough, does 40 damage and moves to IDLE (0)
  if miss (zombie died during 0.7, zombie moved out of range, is vaulting, is 
  pogoing; we should have a  vaulting currState for pole vaulters so we can 
  check this - also currently vaulters teleport - they should use their 
  pre-vault speed to clear the plant instead, staying in vaulting state until 
  they "land") go back to IDLE
2 CH_EATING
  can't attack, 40 second nextAction then back to IDLE

state 2 is actually "got one", "chewing", "swallow", but those are only for anim
purposes - we currently have no graphics/anim, so we'll just add 2 seconds to 
CH_EATING to allow for those (rough estimate), 42 seconds total

---

view 

- treats pea/ice as separate, they should collapse on basis of both being proj
- key should read O:projectile, not O:pea
- use the same trick as :1: multi tiles to mark plant waiting state, but ,M,
  - ,M, - sleeping potato mine (not armed yet)
  - ,H, - chomper, digesting

---