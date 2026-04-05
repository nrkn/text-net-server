# sims

Sims for games etc

They should be pure and know nothing about the project framework - when they 
need to do things like save/load or etc, they should be provided deps to do so

eg:

```ts
const guessingGameSim = createGuessingGame({ save, load })
```