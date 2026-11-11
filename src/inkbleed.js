/*!
 * Vruntime Ink Theme — organic "ink bleed" light/dark theme transition.
 * Copyright (c) 2026 Vruntime Labs. Licensed under the Vruntime Labs
 * Attribution License v1.0 (see LICENSE). Credit to "Vruntime Labs" is required.
 */

const MASK_W = 160; // low-res mask; browser upscales it, giving soft ink edges
const MASK_H = 90;

// --- tiny seeded value-noise (original implementation) ---------------------
function makeNoise(seed) {
  const P = 256;
  const grid = new Float32Array(P * P);
  let s = seed >>> 0 || 1;
  for (let i = 0; i < grid.length; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    grid[i] = s / 4294967296;
  }
  const at = (x, y) => grid[((y & 255) << 8) | (x & 255)];
  const smooth = (t) => t * t * (3 - 2 * t);
  const value = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const u = smooth(x - xi), v = smooth(y - yi);
    const a = at(xi, yi), b = at(xi + 1, yi);
    const c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  return (x, y) => {
    let amp = 0.5, f = 1, sum = 0;
    for (let o = 0; o < 4; o++) { sum += amp * value(x * f, y * f); amp *= 0.5; f *= 2.03; }
    return sum / 0.9375; // ~0..1
  };
}

const defaults = {
  attribute: 'data-theme',      // attribute set on <html>
  storageKey: 'vr-theme',       // localStorage key ('' to disable persistence)
  duration: 1400,
  initialTheme: null,               // ms
  roughness: 0.55,              // 0 = clean circle, 1 = very ragged bleed
  scale: 3.2,                   // noise frequency
  edge: 0.09,                   // softness of the ink edge
  easing: (t) => 1 - Math.pow(1 - t, 3),
  onChange: null,               // (theme) => void
};

function readStored(key) {
  try { return key ? localStorage.getItem(key) : null; } catch { return null; }
}
function writeStored(key, v) {
  try { if (key) localStorage.setItem(key, v); } catch { /* ignore */ }
}

/**
 * Create a theme controller.
 * @param {Partial<typeof defaults>} [options]
 */
export function createInkTheme(options = {}) {
  const o = { ...defaults, ...options };
  const root = document.documentElement;
  const noise = makeNoise(Math.floor(Math.random() * 1e9));
  let animating = false;

  const systemPrefersDark = () =>
    window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;

  function get() {
    const cur = root.getAttribute(o.attribute);
    return cur === 'dark' || cur === 'light' ? cur : systemPrefersDark() ? 'dark' : 'light';
  }

  function apply(theme) {
    root.setAttribute(o.attribute, theme);
    root.style.colorScheme = theme;
    writeStored(o.storageKey, theme);
    if (o.onChange) o.onChange(theme);
  }

  // Build the alpha mask for progress p (0..1) as a data URL.
  function buildMask(canvas, ctx, img, p, ox, oy, aspect) {
    const maxR = Math.hypot(Math.max(ox, 1 - ox) * aspect, Math.max(oy, 1 - oy)) * 1.25;
    const front = p * (maxR + o.roughness * 0.6);
    const data = img.data;
    let i = 0;
    for (let y = 0; y < MASK_H; y++) {
      const ny = y / (MASK_H - 1);
      for (let x = 0; x < MASK_W; x++) {
        const nx = x / (MASK_W - 1);
        const dist = Math.hypot((nx - ox) * aspect, ny - oy);
        const n = noise(nx * o.scale * aspect + 11.3, ny * o.scale + 4.7);
        const d = dist + (n - 0.5) * o.roughness * 1.2;
        const t = (front - d) / o.edge;
        const a = t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
        data[i] = data[i + 1] = data[i + 2] = 0;
        data[i + 3] = (a * 255) | 0;
        i += 4;
      }
    }
    ctx.putImageData(img, 0, 0);
    return canvas.toDataURL('image/png');
  }

  async function set(theme, origin) {
    if (theme === get() && root.hasAttribute(o.attribute)) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!document.startViewTransition || reduced || animating) return apply(theme);

    const rect = origin instanceof Element ? origin.getBoundingClientRect() : null;
    const px = rect ? rect.left + rect.width / 2 : origin?.x ?? innerWidth / 2;
    const py = rect ? rect.top + rect.height / 2 : origin?.y ?? innerHeight / 2;
    const ox = px / innerWidth, oy = py / innerHeight, aspect = innerWidth / innerHeight;

    animating = true;
    const transition = document.startViewTransition(() => apply(theme));
    const style = document.createElement('style');
    style.textContent =
      '@keyframes vr-hold{from{opacity:1}to{opacity:1}}' +
      '::view-transition-group(root){animation-duration:' + o.duration + 'ms}' +
      '::view-transition-old(root),::view-transition-new(root){animation:vr-hold ' + o.duration + 'ms linear both;mix-blend-mode:normal}' +
      '::view-transition-new(root){-webkit-mask-size:100% 100%;mask-size:100% 100%;' +
      '-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;' +
      '-webkit-mask-image:var(--vr-mask);mask-image:var(--vr-mask)}';
    document.head.appendChild(style);

    const canvas = document.createElement('canvas');
    canvas.width = MASK_W; canvas.height = MASK_H;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(MASK_W, MASK_H);

    try { await transition.ready; } catch { style.remove(); animating = false; return; }

    const start = performance.now();
    await new Promise((resolve) => {
      const frame = (now) => {
        const t = Math.min(1, (now - start) / o.duration);
        const url = buildMask(canvas, ctx, img, o.easing(t), ox, oy, aspect);
        root.style.setProperty('--vr-mask', `url(${url})`);
        t < 1 ? requestAnimationFrame(frame) : resolve();
      };
      requestAnimationFrame(frame);
    });

    root.style.removeProperty('--vr-mask');
    await transition.finished.catch(() => {});
    style.remove();
    animating = false;
  }

  function toggle(origin) {
    return set(get() === 'dark' ? 'light' : 'dark', origin);
  }

  // Initial theme: stored choice, else system preference. No animation.
  const stored = readStored(o.storageKey);
  const initial = stored === 'dark' || stored === 'light' ? stored
    : o.initialTheme === 'dark' || o.initialTheme === 'light' ? o.initialTheme
    : systemPrefersDark() ? 'dark' : 'light';
  apply(initial);

  return { get, set, toggle };
}

/** Wire a button: click toggles the theme, bleeding out from the button. */
export function bindToggle(button, theme) {
  const handler = () => theme.toggle(button);
  button.addEventListener('click', handler);
  return () => button.removeEventListener('click', handler);
}
