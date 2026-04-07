# sims

sims for games etc

they should be pure and know nothing about the project framework - when they 
need to do things like save/load or etc, they should be provided deps to do so

this will probably be the append-only log format we discuss in plan.md

eg:

```ts
// game can replay the existing log, append to it etc - no need to know about
// anything else in the outside world
const guessingGameSim = createGuessingGame(log)
```