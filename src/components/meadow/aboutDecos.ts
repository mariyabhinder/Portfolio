// The decoration on the right of the About Me page. It is drawn in the p5 scene (meadow.ts drawAbout), not as DOM.
// x, y, w are in design pixels (1440 x 1024); drawn back to front. `at` is where in the page's 0-1 (state.about) each piece starts to come in.
// Currently empty: the jharoka, her cut-out and everything around them were removed.

export const ABOUT_DESIGN = { w: 1440, h: 1024 }

export const RIGHT_SIDE: { src: string; x: number; y: number; w: number; at: number; rotate?: number; flip?: boolean; arch?: boolean; m?: number }[] = []
