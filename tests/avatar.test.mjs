import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, copyFileSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
async function source(name) {
  const code = ts.transpileModule(readFileSync(resolve(root, 'src', name), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
}
const { SHAPE_PATHS, SHAPE_PARTS, SHAPE_LAYERS, HEADPHONE_PATH } = await source('shapes.ts');
const { botAvatarPresets, botAvatarTypes } = await source('presets.ts');
const { Sim, restPose } = await source('engine.ts');
const { partTransform, flightLift } = await source('parts.ts');
const fantasy = ['forest-spirit', 'winged-dragon', 'phoenix'];
const advance = (sim, seconds) => { for (let i = 0; i < Math.round(seconds * 60); i++) sim.update(1 / 60); };

test('every selectable type has a body, preset and valid anatomy', () => {
  assert.deepEqual(Object.keys(SHAPE_PATHS).sort(), [...botAvatarTypes].sort());
  for (const type of ['dragon', ...fantasy]) {
    assert.equal(botAvatarPresets[type].face, 'eyes');
    assert.ok(SHAPE_LAYERS[type].length > 0);
    for (const layer of SHAPE_LAYERS[type]) {
      assert.match(layer.path, /^M/);
      assert.ok(layer.path.endsWith('Z'));
      assert.ok(!/NaN|Infinity|undefined/.test(layer.path));
      assert.ok(layer.depth >= 0 && layer.depth <= 1);
      assert.ok(['behind', 'surface'].includes(layer.placement));
    }
  }
  assert.match(HEADPHONE_PATH, /^M/);
  assert.equal(botAvatarPresets.dragon.headphones, true);
});

test('the eighteen upstream outlines and accessories are unchanged', () => {
  const paths = Object.fromEntries(Object.entries(SHAPE_PATHS).filter(([type]) => type !== 'dragon' && !fantasy.includes(type)));
  assert.equal(Object.keys(paths).length, 18);
  const parts = { droid: SHAPE_PARTS.droid, mech: SHAPE_PARTS.mech };
  const hash = createHash('sha256').update(JSON.stringify({ paths, parts })).digest('hex');
  assert.equal(hash, '950bbb52798e5e56470d8d8a12961972b1429039a80f6d6a051964d54c7f3e2f');
});

test('dragon wings, feet, claws and tail have stable shared hinges', () => {
  const layers = SHAPE_LAYERS.dragon;
  for (const motion of ['wing-left', 'wing-right', 'foot-left', 'foot-right', 'tail']) assert.ok(layers.some(layer => layer.motion === motion));
  for (const motion of ['foot-left', 'foot-right']) {
    const pieces = layers.filter(layer => layer.motion === motion);
    assert.equal(pieces.length, 2);
    assert.deepEqual(pieces[0].pivot, pieces[1].pivot);
  }
  assert.equal(botAvatarPresets.dragon.flight, true);
  assert.equal(botAvatarPresets['winged-dragon'].flight, true);
});

test('parts move while awake, tuck in the air, and stay still while sleeping', () => {
  const idle = restPose('default');
  const wing = partTransform(idle, 'wing-left', [34, 64]);
  assert.notDeepEqual(wing, partTransform({ ...idle, time: 0.4 }, 'wing-left', [34, 64]));
  assert.deepEqual(wing, partTransform(idle, 'wing-left', [34, 64]));
  const footY = p => { const m = partTransform(p, 'foot-left', [39, 82]); return m[1] * 39 + m[3] * 82 + m[5]; };
  assert.ok(footY({ ...idle, y: -26 }) < footY(idle));
  const sleep = restPose('sleeping');
  for (const motion of ['wing-left', 'wing-right', 'foot-left', 'foot-right', 'tail']) assert.deepEqual(partTransform(sleep, motion, [50, 50]), partTransform({ ...sleep, time: 5 }, motion, [50, 50]));
  assert.equal(flightLift(sleep), 0);
  assert.ok(flightLift(idle) < 0);
  assert.notEqual(flightLift(idle), flightLift({ ...idle, time: 0.4 }));
});

test('shape generation reproduces the checked-in module', () => {
  const temp = mkdtempSync(resolve(tmpdir(), 'avatar-shapes-'));
  try {
    mkdirSync(resolve(temp, 'scripts'));
    mkdirSync(resolve(temp, 'src'));
    copyFileSync(resolve(root, 'scripts/gen-shapes.mjs'), resolve(temp, 'scripts/gen-shapes.mjs'));
    execFileSync(process.execPath, [resolve(temp, 'scripts/gen-shapes.mjs')]);
    assert.equal(readFileSync(resolve(temp, 'src/shapes.ts'), 'utf8'), readFileSync(resolve(root, 'src/shapes.ts'), 'utf8'));
  } finally { rmSync(temp, { recursive: true, force: true }); }
});

test('the shared rig transitions through work, sleep and wake with finite poses', () => {
  const sim = new Sim(0.3, 'default');
  for (const [state, index] of [['working', 1], ['sleeping', 2], ['default', 0]]) {
    sim.setState(state);
    advance(sim, 4);
    assert.ok(sim.pose.w[index] > 0.99);
    assert.ok(Math.abs(sim.pose.w.reduce((a, b) => a + b, 0) - 1) < 1e-6);
    for (const value of Object.values(sim.pose).flat()) assert.ok(Number.isFinite(value));
  }
  assert.deepEqual(restPose('sleeping').w, [0, 0, 1]);
});

test('pointer attraction and click hops use the original rig', () => {
  const sim = new Sim(0.3, 'default');
  sim.setJump({ every: 0 });
  sim.setPointer(0.8, -0.5, 1);
  advance(sim, 0.5);
  assert.ok(sim.pose.lookX > 0);
  sim.poke();
  let highest = 0, turn = 0;
  for (let i = 0; i < 90; i++) { sim.update(1 / 60); highest = Math.min(highest, sim.pose.y); turn = Math.max(turn, Math.abs(sim.pose.yaw)); }
  assert.ok(highest < -10, `hop reached ${highest}`);
  assert.ok(turn > Math.PI, `spin reached ${turn}`);
});
