# todo

the logical board should be bigger, eg contain addressable but not interactable 
cols on the right where zombies enter

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
