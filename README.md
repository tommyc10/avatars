# avatars

Animated bot avatars with living faces, and a home for my own. The first is
**Dragon**: a small flying green dragon with a head and snout, a body,
two horns, bat wings, clawed feet and a curled tail, wearing pink headphones.

The collection now also includes **Forest spirit**, **Winged dragon** and
**Phoenix**, based on the three chosen images in `assets/references/`.
They are native canvas shapes with coloured anatomy, rather than animated
PNGs, so their eyes and whole bodies use the same live rig as the dragon.
The outlines are an initial adaptation of the reference artwork; future
shape refinements belong in the generator.
The headphone dragon now has articulated wings, feet/claws and a swaying
tail. While awake it hovers and flaps; feet tuck further during a hop.
Sleeping folds the wings, drops the feet and settles the body. The mint
winged dragon also flaps and hovers while retaining its original head shape.

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
<BotAvatar type="forest-spirit" />
<BotAvatar type="winged-dragon" state="working" />
<BotAvatar type="phoenix" state="sleeping" />
<BotAvatar type="winged-dragon" headphones headphoneColor="#FF5FA2" />
<BotAvatar type="dragon" headphones={false} />
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

For the new fantasy avatars, `color` recolours the body and its matching
details; `accent` recolours the ivory horns, green antlers or golden beak.
`headphones` adds the shared accessory (off by default for the new types,
on for the original dragon). `headphoneColor` controls it separately, so
adding headphones never changes a creature's anatomy colours. On the
original dragon, the existing `accent` prop still colours its headphones
unless `headphoneColor` overrides it. A custom `path` replaces both the
type's anatomy and accessories, as it did before.

## Run the demo

```sh
npm install
npm run dev        # http://localhost:5182, add ?still to freeze the poses
npm run typecheck
npm test           # geometry generation, original shapes, rig behaviour
npm run build      # production demo in dist/
```

The demo shows the dragon next to the library's shapes, big, in all three
states, in a few colourways, and on a light background.
The new playground lets you select any of the four fantasy avatars, switch between
idle / working / sleeping, toggle headphones, pause and change colours.
It also shows each type in all three states and at 24–72px.

## How the dragon works

The library turns an SVG outline in a 100×100 box into an extruded, lit
solid. The `plastic` shading bakes a pillow-shaped height field from the
outline and lights it with a matcap. The dragon is just more outlines:

- **Body** (the "Dragon" block in `scripts/gen-shapes.mjs`): a smaller
  superellipse head, a wider snout, an overlapping torso, two horns swept
  along curves that taper to a round tip, and a rounded brow spike.
  Every subpath winds clockwise, so
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
- **Movement**: `src/parts.ts` resolves wing, foot and tail hinges from
  the shared `Pose.time` clock and blended state weights. Wings flap and
  narrow on the downstroke, each foot and its three claws use one hinge,
  and the tail sways. The renderer projects each hinge through yaw and
  pitch without baking a new material every frame. The original shared
  ticker still handles all animation; pause, speed and reduced motion
  apply to the articulated pieces as well as the body and eyes.

## Adding an avatar

1. Add the outline (and any parts) to `scripts/gen-shapes.mjs`, then run
   `npm run shapes`. `src/shapes.ts` is generated, so don't edit it by
   hand.
2. Add the type to `BotAvatarType` in `src/types.ts`.
3. Add a preset in `src/presets.ts`: its colour, where the face sits, and
   optionally `accent`, `partsDepth` and `nostrils`.
4. Put it in the demo row and check it at 24px as well as big.

For a multicolour character, define an ordered list in `layers` in the
generator. Each piece uses `body` or `accent`, an optional `lightness`
adjustment, a relative `depth`, and a `placement` of `behind` or `surface`.
Behind pieces (wings, horns, ears and antlers) tuck under the head.
Surface pieces (a beak or belly colour) follow its front cap and are clipped
to it, disappearing on the back during a spin. Set `depth: 0` for a printed
marking, with optional `opacity`. Material keys stay stable when headphones
are toggled, so accessory forms cannot be mistaken for anatomy forms.
`whenFace` can restrict a detail to a face variant: the phoenix beak is
replaced by the animated mouth when `face="mouth"` is requested.
For articulated pieces, set `motion` (`wing-left`, `wing-right`,
`foot-left`, `foot-right`, or `tail`) and a `pivot` in design coordinates.
Set `flight: true` on the preset for a hover while awake. These are data
settings, so another creature can use the same movement without adding
a special case to the renderer.

`botAvatarLayers` and `botAvatarHeadphones` are exported alongside the
existing shapes for consumers that use the renderer directly. Pass resolved
`layers` to `drawBotAvatarFrame`, using a stable `key` for each anatomy piece
or accessory. The React component resolves these automatically.

## Gotchas

- Legacy parts always draw behind the body. The headband passes behind the horns
  and the cups tuck behind the cheeks, which is why this works for
  headphones. New coloured front details use surface layers instead.
- Keep thin parts at least ~5 units thick. Thinner than that, the plastic
  shades them as a flat tube and they vanish at small sizes.
- Accents get the same default `saturation` (1.5) as the body, so a pure
  grey picks up a blue tint. Pick a warm-ish grey if you want it neutral.
- Reduced motion: as upstream, each avatar holds the still pose of its
  state with no animation.
- React only. Upstream's React Native and SwiftUI ports aren't included.
