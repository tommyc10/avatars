import type { Pose } from './engine';
import type { BotAvatarPartMotion } from './types';

export type PartMatrix = [number, number, number, number, number, number];

/** One clock drives wings, feet and the tail; sleeping folds/settles them. */
export function partTransform(pose: Pose, motion: BotAvatarPartMotion, pivot: readonly [number, number]): PartMatrix {
  const time = pose.time ?? 0;
  const [idle, working, sleeping] = pose.w;
  const awake = idle + working;
  const side = motion.endsWith('left') ? -1 : 1;
  let angle = 0, sx = 1, sy = 1, dy = 0;
  if (motion.startsWith('wing')) {
    const flap = Math.sin(time * (5 + 5 * working));
    angle = side * (awake * (0.08 + 0.36 * flap) + sleeping * 0.5);
    sx = 1 - 0.24 * awake * (0.5 + 0.5 * flap) - 0.35 * sleeping;
    sy = 1 - 0.12 * awake * (0.5 - 0.5 * flap);
  } else if (motion.startsWith('foot')) {
    const tuck = awake * (0.5 + 0.5 * Math.min(1, Math.max(0, -pose.y / 18)));
    angle = side * (0.18 * tuck + 0.07 * awake * Math.sin(time * 5 + side * 0.6));
    dy = -6 * tuck + 1.2 * awake * Math.sin(time * 5 + side * 0.6);
  } else {
    angle = awake * (0.08 + 0.17 * Math.sin(time * 2.6));
  }
  const c = Math.cos(angle), s = Math.sin(angle);
  const a = c * sx, b = s * sx, d = c * sy, cc = -s * sy;
  const [x, y] = pivot;
  return [a, b, cc, d, x - a * x - cc * y, y - b * x - d * y + dy];
}

/** A small hover layered over the existing hop; sleep returns to ground. */
export function flightLift(pose: Pose): number {
  const awake = pose.w[0] + pose.w[1];
  return awake ? -awake * (5 + 2 * Math.sin((pose.time ?? 0) * 3.6)) : 0;
}
