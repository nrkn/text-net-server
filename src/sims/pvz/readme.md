# todo

the logical board should be bigger, eg contain addressable but not interactable 
cols on the right where zombies enter - projectiles/mower can actually hit the 
zombies in these cols, even if the player can't plant here

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

adaptive pacing - waves are currently fixed - pvz does something like, if all
zombies cleared, send next wave early - we need this because stalling is an
important strat

towers should have optional ranges (puff/chomper etc) and infinite if not set,
but can wait til we have those plants

deprioritize recently mowed rows when spawning random-row zombies
