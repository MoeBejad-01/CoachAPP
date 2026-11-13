// Stylised front and back body for the hero muscle map. Coordinates are in a
// 200-wide viewBox centred on x = 100. Every shape is drawn for the figure's
// left half (x < 100) and mirrored for the right.

import type { StringKey } from '../../../i18n/strings';

export type MuscleGroup = 'chest' | 'shoulders' | 'arms' | 'back' | 'core' | 'legs' | 'glutes';
export type View = 'front' | 'back';

export const VIEWBOX = { x: 22, y: 6, w: 156, h: 444 };

/** Rounded rectangle as a path, so muscles can all be <path> elements. */
const rr = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r},${y}h${w - 2 * r}a${r},${r} 0 0 1 ${r},${r}v${h - 2 * r}a${r},${r} 0 0 1 -${r},${r}h-${w - 2 * r}a${r},${r} 0 0 1 -${r},-${r}v-${h - 2 * r}a${r},${r} 0 0 1 ${r},-${r}z`;

export const HEAD = { cx: 100, cy: 33, rx: 17.5, ry: 22.5 };

export const SILHOUETTE = [
  'M100,54 L91.5,54 L90.5,69',
  'C84,74 70,76 61,79',
  'C50,82 44,92 43.5,105',
  'C42.5,124 40.5,146 40,163',
  'C37,181 33.5,201 32.5,222',
  'C31,236 29.5,248 32.5,258 C35,265 41.5,265 42.5,256 C43.5,248 43.5,240 44.5,232',
  'C47.5,212 51.5,191 54,171',
  'C56,151 59,133 63,118',
  'C65,140 68.5,161 72,184',
  'C70,199 66,213 65.5,228',
  'C64.5,256 67.5,290 71.5,318',
  'C69.5,336 66,354 67.5,372',
  'C69.5,390 73.5,404 75.5,414',
  'C73.5,422 69.5,432 73.5,438 C79.5,443 92,443 94,436 C95,428 92.5,420 92.5,412',
  'C94.5,396 96.5,372 95.5,354',
  'C94.5,340 92.5,332 92.5,322',
  'C93.5,300 96,270 98,250 L100,246 Z',
].join(' ');

const FOREARM = 'M42,172 C38,186 35,203 34,219 C36.5,225 42,225 44,220 C47,205 50.5,190 52.5,175 C50,168 45,167 42,172 Z';

export const SHAPES: Record<View, Partial<Record<MuscleGroup, string[]>>> = {
  front: {
    shoulders: ['M64,80 C54,81 46,90 45,104 C45,113 47,121 50,126 C54,117 60,108 67,101 C70,93 69,85 64,80 Z'],
    chest: ['M98.5,84 C88,81 76,83 68.5,90 C64,96 62,104 63,112 C70,121 83,125 93,122 C97,120 98.5,117 98.5,113 Z'],
    arms: [
      'M48,124 C43.5,136 42,150 43,163 C46,169 52,168 55.5,162 C58,150 60,136 61.5,122 C57,117 51,118 48,124 Z',
      FOREARM,
    ],
    core: [
      rr(88, 127.5, 10.5, 16, 3.5),
      rr(88, 147.5, 10.5, 17, 3.5),
      rr(88.5, 168.5, 10, 17, 3.5),
      'M89,189.5 h9.5 v27 C95,222 91,218 89,210 Z',
      'M85,128 C79,130 73,134 69.5,141 C69.5,157 71,172 73,186 C77,195 81,201 86,207 C86,186 86,160 86,130 Z',
    ],
    legs: [
      'M67,234 C63.5,258 64.5,286 70,308 C72.5,314 77,313 78,306 C77.5,282 77,258 78,236 C75.5,229 69.5,229 67,234 Z',
      'M79.5,231 C77.5,255 77.5,282 80.5,303 C82.5,311 88.5,311 89.5,303 C91.5,282 91.5,256 89,234 C87,227 81.5,227 79.5,231 Z',
      'M90.5,276 C86.5,288 86.5,304 90,314 C92.5,318 94,314 94,306 C94,294 93,284 90.5,276 Z',
      'M91,246 C90,258 90.5,268 92,274 C94.5,268 96.5,258 97,252 C97,248 94,245.5 91,246 Z',
      'M70,330 C66.5,344 66.5,362 70.5,378 C73,384 78,382 78.5,375 C79,358 78.5,343 76.5,331 C75,326 71.5,326 70,330 Z',
      'M80.5,334 C79.5,352 80,372 81.5,392 C83.5,396 86,393 86,388 C86.5,370 86.5,352 85,334 C84,330 81.5,330 80.5,334 Z',
      'M88,332 C92,344 94,358 92,374 C90.5,380 87.5,378 87.5,371 C87,357 86.5,344 87,333 C87.3,330 87.7,330 88,332 Z',
    ],
  },
  back: {
    shoulders: ['M63,81 C53,83 46,92 45,105 C45,114 47,121 50,126 C55,116 61,107 68,99 C69,91 67,85 63,81 Z'],
    back: [
      'M100,59 C97,64 93,69 87,73 C79,77 71,79 65,81 C73,87 82,93 90,103 C95,114 98,127 100,140 Z',
      'M71,99 C77,96 84,99 89,106 C87,114 81,119 73.5,121 C69.5,116 68.5,108 71,99 Z',
      'M64.5,123 C67.5,141 70.5,164 74,188 C82,184 90,175 96,163 C94,149 92,135 90,124 C82,127 72,127 64.5,123 Z',
      'M91,170 C89,184 89,200 91,214 C94,217 98.5,215 98.5,209 L98.5,168 C96,165 93,165 91,170 Z',
    ],
    arms: [
      'M48,123 C43.5,136 42,150 43,163 C46,169 52,168 55.5,162 C58,150 60,136 61.5,121 C57,116 51,117 48,123 Z',
      FOREARM,
    ],
    glutes: ['M98.5,204 C88,202 77,206 70,214 C66,224 66,236 70,244 C78,252 92,252 98.5,246 Z'],
    legs: [
      'M69,254 C65.5,276 66.5,298 71,316 C74,321 79,319 80,313 C80.5,292 80.5,274 82,256 C79,250 72.5,249 69,254 Z',
      'M84,255 C83,276 84,296 87,314 C90,319 93.5,317 93.5,311 C94,292 94.5,274 94,257 C91,252 86.5,251 84,255 Z',
      'M70.5,328 C66,343 66,360 71.5,375 C75.5,381 81,377 81,368 C81,353 81,339 79.5,329 C77.5,324 72.5,324 70.5,328 Z',
      'M83.5,328 C82.5,341 83.5,356 85.5,369 C88.5,376 93,374 93,365 C94,350 93.5,337 90.5,328 C88.5,324 85,324 83.5,328 Z',
    ],
  },
};

/** Where each group's callout points (left half of the figure). */
export const ANCHORS: Record<View, Partial<Record<MuscleGroup, [number, number]>>> = {
  front: { shoulders: [53, 100], chest: [82, 103], arms: [48, 150], core: [93, 162], legs: [80, 282] },
  back: { shoulders: [53, 100], back: [82, 150], arms: [49, 145], glutes: [84, 228], legs: [80, 300] },
};

export const GROUP_TEXT: Record<MuscleGroup, { name: StringKey; exercise: StringKey }> = {
  chest: { name: 'site.m.chest', exercise: 'site.m.chest.ex' },
  shoulders: { name: 'site.m.shoulders', exercise: 'site.m.shoulders.ex' },
  arms: { name: 'site.m.arms', exercise: 'site.m.arms.ex' },
  back: { name: 'site.m.back', exercise: 'site.m.back.ex' },
  core: { name: 'site.m.core', exercise: 'site.m.core.ex' },
  legs: { name: 'site.m.legs', exercise: 'site.m.legs.ex' },
  glutes: { name: 'site.m.glutes', exercise: 'site.m.glutes.ex' },
};

/** Tab order within each view, top to bottom. */
export const ORDER: Record<View, MuscleGroup[]> = {
  front: ['shoulders', 'chest', 'arms', 'core', 'legs'],
  back: ['shoulders', 'back', 'arms', 'glutes', 'legs'],
};

export const DEFAULT_GROUP: Record<View, MuscleGroup> = { front: 'chest', back: 'back' };
