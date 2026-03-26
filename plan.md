# plan

things that we're going to do next

if we do them remember to remove from here and maybe add to the app framework
section in readme

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

the screen.response.menu remains; multiple menus get merged. throws if merging
a menu causes ambiguity

### flash middleware

allow a route to send a message to the next screen, cleared after display

shown at the top before the normal screen render

## definitely

### text based screen format and static middleware

like express:

`app.use(static('data/test-app/static'))`

text format should be:

- able to do everything our screen helper can:
  - text parts
  - menu parts
  - meta parts
  - menu response | input response | end response
- easy to parse
- easy to write  
