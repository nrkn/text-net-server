import { createLevel } from '../pvz-def-util.js'

// note level 1-9 in real game
export const level8 = createLevel({
  id: 8,
  plantWhitelist: [
    'peashooter', 'sunflower', 'cherryBomb', 'wallnut', 'potatoMine', 'snowPea',
    'chomper', 'repeater'
  ],
  waves: [
    // todo - and add it to the levels def too
  ]
})