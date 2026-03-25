# code guidelines and conventions

Avoid classes, `this`, prototypes etc - use closures and module scope to 
encapsulate state instead

Prefer plain objects

Avoid boilerplate, JSDOC style-comments etc - comments should be small and 
focused, and avoided completely if code can instead be written descriptively 
enough though structure and clear, unambiguous naming

Use TS types but avoid over-typing - allow type inference to do as much work
as possible; prefer `type` to `interface` for consistency

Avoid hoisting - no `var`, no `function` keyword (prefer arrow funcs bound to 
const/let) etc

Use ASI
