// p5 2.x is published without its type definitions; the meadow uses it untyped.
declare module 'p5' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p5: any
  export default p5
}
