# avatars

Animated bot avatars with living faces, and a home for my own. The first is
**Dragon**: a chubby green dragon with two horns, a brow spike and nostrils,
wearing pink headphones.

Built on [bot-avatars](https://libraries.dev/bots) by Jakub Antalik (MIT,
see `LICENSE`). The library's eighteen shapes are all still here. The
dragon uses the same renderer, so it has the same glossy plastic, the
same face, and the same motion as the rest of them.

## Use it

```tsx
import { BotAvatar } from './src';

<BotAvatar type="dragon" />
<BotAvatar type="dragon" state={busy ? 'working' : 'default'} size={36} />
<BotAvatar type="dragon" color="#9A62FF" accent="#FFD32B" />   {/* purple, yellow phones */}
<BotAvatar type="dragon" face="mouth" />                        {/* adds a smile */}
```

- `state`: `default` looks around and jumps now and then, `working` hops
  and spins with a laugh, `sleeping` drops its head with shut lids.
- A click makes it hop and flip, and the eyes follow a pointer nearby.
- Every prop from upstream works the same (`size`, `shading`, `speed`,
  `paused`, `seed`, the jump tuning and so on). See
  [libraries.dev/bots](https://libraries.dev/bots).
- **New:** `accent` sets the colour of the thin parts (the headphones).
  It defaults to the type's own accent (`#FF5FA2` for the dragon), or the
  body colour for types without one, so the mech and droid antennae look
  as they always did.

## Run the demo

```sh
npm install
npm run dev        # http://localhost:5182, add ?still to freeze the poses
```

The demo shows the dragon next to the library's shapes, big, in all three
states, in a few colourways, and on a light background.

## How the dragon works

The library turns an SVG outline in a 100×100 box into an extruded, lit
solid. The `plastic` shading bakes a pillow-shaped height field from the
outline and lights it with a matcap. The dragon is just more outlines:

- **Body** (the "Dragon" block in `scripts/gen-shapes.mjs`): a superellipse
  head, two horns swept along curves that taper to a round tip, and a
  rounded triangle for the brow spike. Every subpath winds clockwise, so
  where they overlap the nonzero fill keeps them solid and doesn't cut a
  hole.
- **Headphones** are the dragon's *parts*: an arc band and two
  rounded-rectangle cups. Upstream already draws parts (the mech's
  antennae) behind the body with less depth. Here parts can also have
  their own colour (`partsColor` in `draw.ts`, set by `accent`) and a
  per-type depth (`partsDepth: 0.75`, so the cups look chunky).
- **Nostrils**: a `nostrils` flag on the preset. `drawFace` places two
  small ink dots on the same face sphere as the eyes, so they slide round
  when the head turns.

## Adding an avatar

1. Add the outline (and any parts) to `scripts/gen-shapes.mjs`, then run
   `npm run shapes`. `src/shapes.ts` is generated, so don't edit it by
   hand.
2. Add the type to `BotAvatarType` in `src/types.ts`.
3. Add a preset in `src/presets.ts`: its colour, where the face sits, and
   optionally `accent`, `partsDepth` and `nostrils`.
4. Put it in the demo row and check it at 24px as well as big.

## Gotchas

- Parts always draw behind the body. The headband passes behind the horns
  and the cups tuck behind the cheeks, which is why this works for
  headphones. Anything that has to sit in front of the face needs a
  change to `draw.ts`.
- Keep thin parts at least ~5 units thick. Thinner than that, the plastic
  shades them as a flat tube and they vanish at small sizes.
- Accents get the same default `saturation` (1.5) as the body, so a pure
  grey picks up a blue tint. Pick a warm-ish grey if you want it neutral.
- Reduced motion: as upstream, each avatar holds the still pose of its
  state with no animation.
- React only. Upstream's React Native and SwiftUI ports aren't included.
