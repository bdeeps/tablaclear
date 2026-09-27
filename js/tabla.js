// TablaClear's shared parts: circular-membrane modes (Bessel functions), Raman's loaded-membrane
// harmonics, the strokes (bols) and which modes each one excites, a small WebAudio modal-synthesis
// drum voice, the teentaal theka, computer-keyboard input, and 3D models of the dayan and bayan.
// Scene units: 1 unit = 10 cm. y is up, the drum heads face up. The player sits on the +z side
// (towards the default camera), so the dayan (right hand) is at +x and the bayan (left hand) at −x.
import { THREE, M, clamp, torus, tube, box, canvasTexture } from './kit.js';
import { audio } from './ui.js';

export const TAU = Math.PI * 2;

// ---------------------------------------------------------------- notes
// Equal temperament with A4 = 440 Hz (see PianoClear's scale chapter).
export const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
export const freqOfMidi = (m) => 440 * 2 ** ((m - 69) / 12);
export function noteOf(f) {
  const x = 69 + 12 * Math.log2(f / 440), m = Math.round(x);
  return { name: NOTE_NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1), cents: (x - m) * 100, midi: m };
}
export const fmtHz = (f) => (f < 1000 ? f.toFixed(f < 100 ? 1 : 0) + ' Hz' : (f / 1000).toFixed(2) + ' kHz');
export const cents = (f, ref) => 1200 * Math.log2(f / ref);
// The dayan is tuned to the song's Sa. A 5½-inch (14 cm) dayan usually sits around C♯4 to D4.
export const SA = { C: freqOfMidi(60), 'C♯': freqOfMidi(61), D: freqOfMidi(62) };

// ---------------------------------------------------------------- Bessel functions
// J_m(x) by Bessel's integral, J_m(x) = (1/π)∫₀^π cos(mτ − x sin τ) dτ. The integrand is smooth and
// periodic, so a 64-point midpoint sum is accurate to many digits for the x < 10 we need.
export function besselJ(m, x) {
  let s = 0; const N = 64;
  for (let i = 0; i < N; i++) { const t = ((i + 0.5) * Math.PI) / N; s += Math.cos(m * t - x * Math.sin(t)); }
  return s / N;
}

// ---------------------------------------------------------------- modes of a drumhead
// An ideal circular membrane of radius a and tension T (per unit length) with area density σ rings
// at f_mn = j_mn/(2πa) · √(T/σ), where j_mn is the n-th zero of J_m (Abramowitz & Stegun, table 9.5).
// m counts nodal diameters, n counts nodal circles (including the rim).
// h is the harmonic each mode joins on a well-made dayan, from C. V. Raman (Proc. Indian Acad. Sci. A 1,
// 179, 1934) and Rossing & Sykes (Percussive Notes 19, 1982): (0,1) → 1; (1,1) → 2; (2,1) and (0,2) → 3;
// (3,1) and (1,2) → 4; (4,1), (2,2) and (0,3) → 5. The small offsets in `loaded` follow the scatter of a
// few percent seen in measured drums (Fletcher & Rossing, The Physics of Musical Instruments, §18.6).
export const MODES = [
  { m: 0, n: 1, j: 2.4048, h: 1, loaded: 1.0 },
  { m: 1, n: 1, j: 3.8317, h: 2, loaded: 1.99 },
  { m: 2, n: 1, j: 5.1356, h: 3, loaded: 2.98 },
  { m: 0, n: 2, j: 5.5201, h: 3, loaded: 3.02 },
  { m: 3, n: 1, j: 6.3802, h: 4, loaded: 3.97 },
  { m: 1, n: 2, j: 7.0156, h: 4, loaded: 4.03 },
  { m: 4, n: 1, j: 7.5883, h: 5, loaded: 4.96 },
  { m: 2, n: 2, j: 8.4172, h: 5, loaded: 5.01 },
  { m: 0, n: 3, j: 8.6537, h: 5, loaded: 5.04 },
];
MODES.forEach((d) => {
  d.bare = d.j / MODES[0].j;
  let mx = 0; for (let i = 0; i <= 200; i++) mx = Math.max(mx, Math.abs(besselJ(d.m, (d.j * i) / 200)));
  d.max = mx;
});
// Frequency ratio of mode k to the fundamental, for a syahi that is fraction `load` (0–1) complete.
// A simple blend between the bare membrane and a finished dayan: the real drum only lines up when
// the syahi has the right mass and taper, which makers find by ear, layer by layer.
export const ratio = (k, load = 1) => { const d = MODES[k]; return d.bare * Math.pow(d.loaded / d.bare, clamp(load, 0, 1)); };
// The shape of mode k at radius ρ (0–1 of the head) and angle θ, with its nodal diameters turned by th.
export const shape = (k, rho, th = 0, ang = 0) => { const d = MODES[k]; return (besselJ(d.m, d.j * clamp(rho, 0, 1)) / d.max) * Math.cos(d.m * (ang - th)); };

// Which modes a strike excites. A short tap at radius ρs, angle θs gives mode k an initial speed in
// proportion to its shape there. A finger resting at (ρd, θd) damps any mode that moves there: the
// round modes (m = 0) lose most of their ring, while a mode with nodal diameters simply turns so that
// a node line runs through the finger, and survives. That is why "na" and "tin" lose the fundamental.
export function excite(strike, damp = null, dampK = 0.92) {
  return MODES.map((d, k) => {
    let a, th = strike.th;
    if (damp && d.m > 0) { th = damp.th + Math.PI / (2 * d.m); a = Math.abs(shape(k, strike.r, th, strike.th)); }
    else a = Math.abs(shape(k, strike.r, th, strike.th));
    let kill = 0;
    if (damp && d.m === 0) kill = dampK * Math.abs(shape(k, damp.r));
    return { k, a: a * (1 - kill), th, damped: kill > 0.3, turned: !!(damp && d.m > 0) };
  });
}

// ---------------------------------------------------------------- the bols
// Where each stroke lands (ρ as a fraction of the head's radius; θ in radians, 0 = +x, π/2 = towards
// the player) and where a finger rests to damp it. Descriptions follow standard tabla pedagogy and
// Fletcher & Rossing §18.6.
const RING = { r: 0.46, th: 1.75 };            // ring finger resting on the syahi's edge, player side
export const BOLS = {
  na: { name: 'Na / Ta', hand: 'dayan', zone: 'kinar', strike: { r: 0.86, th: 0.7 }, damp: RING, gain: 1, sus: 1, click: 0.5,
    how: 'Index finger flicks the kinar (rim) while the ring finger rests on the syahi’s edge.' },
  tin: { name: 'Tin', hand: 'dayan', zone: 'maidan', strike: { r: 0.68, th: 0.75 }, damp: RING, gain: 0.9, sus: 1, click: 0.3,
    how: 'Index finger strikes the maidan, the open skin, with the ring finger resting on the syahi.' },
  tun: { name: 'Tun', hand: 'dayan', zone: 'syahi', strike: { r: 0.06, th: 0 }, damp: null, gain: 1, sus: 1.25, click: 0.2,
    how: 'Index finger strikes the centre of the syahi and lifts off. Nothing damps it.' },
  te: { name: 'Te / Ti', hand: 'dayan', zone: 'syahi', strike: { r: 0.25, th: 1.2 }, damp: null, flat: true, gain: 0.8, sus: 0.1, click: 0.9,
    how: 'The middle fingers slap flat onto the syahi and stay there: a short, dry click.' },
  ge: { name: 'Ge / Ghe', hand: 'bayan', zone: 'maidan', strike: { r: 0.72, th: -0.4 }, damp: null, gain: 1, sus: 1, click: 0.25,
    how: 'Middle finger strikes the bayan’s maidan while the wrist rests lightly: an open boom.' },
  ke: { name: 'Ke / Ka', hand: 'bayan', zone: 'syahi', strike: { r: 0.3, th: 1.4 }, damp: null, flat: true, gain: 0.9, sus: 0.08, click: 0.8,
    how: 'The flat hand slaps the bayan and stays down, killing the ring: a dull knock.' },
};
// Compound bols: both hands at once.
export const COMBO = { dha: ['na', 'ge'], dhin: ['tin', 'ge'], ta: ['na'], tin: ['tin'], na: ['na'], tun: ['tun'], te: ['te'], ge: ['ge'], ke: ['ke'] };
export const BOL_LABEL = { dha: 'Dha', dhin: 'Dhin', ta: 'Ta', tin: 'Tin', na: 'Na', tun: 'Tun', te: 'Te', ge: 'Ge', ke: 'Ke' };

// Decay times of the dayan's harmonics in seconds: a few tenths of a second, the fundamental longest
// (Rossing & Sykes measured decay times of this order). A bare head radiates its round (0,1) mode so
// well that it dies almost at once, which is part of the "thud".
const TAU_LOADED = [0, 0.8, 0.6, 0.45, 0.36, 0.3];
const TAU_BARE = [0, 0.14, 0.32, 0.26, 0.2, 0.16];
// The bayan: a strong low mode and a few weaker overtones (the off-centre syahi lines them up only
// roughly). A 9–10 inch bayan struck open sounds near 80–110 Hz.
export const BAYAN_MODES = [{ r: 1, a: 1, tau: 1.1 }, { r: 1.98, a: 0.28, tau: 0.5 }, { r: 2.9, a: 0.12, tau: 0.3 }];
export const BAYAN_F0 = 92;
// Pressing the heel of the palm into the bayan stretches the skin: the tension rises and f ∝ √T.
// We model T/T₀ = 1 + 1.56·press, so a full press raises the pitch by √2.56 = 1.6 (about 8 semitones),
// in the range tabla players reach in a gamak.
export const pressRatio = (p) => Math.sqrt(1 + 1.56 * clamp(p, 0, 1));

// Everything a single stroke does: dayan modes and bayan modes with frequency, amplitude and decay.
export function strokeTones(stroke, { sa = SA['C♯'], load = 1, bayanF = BAYAN_F0, press = 0 } = {}) {
  const b = BOLS[stroke];
  if (!b) return [];
  if (b.hand === 'dayan') {
    const ex = excite(b.strike, b.damp);
    const bare = 1 - clamp(load, 0, 1);
    const out = ex.map((e) => {
      const d = MODES[e.k];
      const tau = (TAU_LOADED[d.h] * (1 - bare) + TAU_BARE[d.h] * bare) * b.sus * (e.a < 0.02 ? 0.5 : 1);
      // A fingertip is soft and touches for a millisecond or so, so higher modes get less (÷h).
      const amp = e.a / d.h;
      return { drum: 'dayan', k: e.k, f: sa * ratio(e.k, load), a: amp, tau, th: e.th };
    });
    const top = Math.max(...out.map((t) => t.a), 1e-6);           // same loudness for every stroke
    out.forEach((t) => { t.a *= b.gain / top; });
    return out;
  }
  const g = Math.abs(besselJ(0, 2.4048 * b.strike.r)) * 0.5 + 0.5;
  return BAYAN_MODES.map((m, i) => ({ drum: 'bayan', k: i, f: bayanF * m.r * pressRatio(press), a: b.gain * m.a * g, tau: m.tau * b.sus, th: 0 }));
}

// ---------------------------------------------------------------- voice (WebAudio modal synthesis)
// Each mode is a sine with a fast attack and an exponential decay; a short band-passed noise burst
// adds the finger's click. Loud strokes start a touch sharp and settle, as real skins do.
// Sound starts only after a real click or key press, respects the mute button, and never plays while
// the studio is recording (body.gb-reel or ?reel=1).
let ctx = null, gestured = false, V = null;
if (typeof window !== 'undefined') {
  const mark = () => { gestured = true; };
  ['pointerdown', 'keydown', 'touchstart'].forEach((t) => window.addEventListener(t, mark, { capture: true, passive: true }));
}
export const recording = () => typeof document !== 'undefined' && (document.body.classList.contains('gb-reel') || /[?&]reel=1/.test(location.search));
function ready() {
  if (audio.muted || recording()) { if (V) V.master.gain.value = 0; return null; }
  if (!gestured && !navigator.userActivation?.hasBeenActive) return null;
  try {
    ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    if (!V) {
      const master = ctx.createGain(); master.gain.value = 0.9;
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
      master.connect(comp).connect(ctx.destination);
      const conv = ctx.createConvolver(), len = Math.floor(ctx.sampleRate * 1.2), ir = ctx.createBuffer(2, len, ctx.sampleRate);
      let seed = 7;
      const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed / 2147483647) * 2 - 1; };
      for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = rnd() * Math.exp((-6 * i) / len); }
      conv.buffer = ir;
      const wet = ctx.createGain(); wet.gain.value = 0.12; wet.connect(conv).connect(master);
      const bus = ctx.createGain(); bus.gain.value = 1; bus.connect(master); bus.connect(wet);
      const nb = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.25), ctx.sampleRate), nd = nb.getChannelData(0);
      for (let i = 0; i < nd.length; i++) nd[i] = rnd();
      V = { master, bus, noise: nb, bayan: [] };
    }
    V.master.gain.value = 0.9;
    return ctx;
  } catch { return null; }
}

// Play a list of tones from strokeTones(). glide: { to (ratio), at (s), tc (s) } bends the bayan.
export function sound(tones, { glide = null, click = 0.4, vol = 1 } = {}) {
  const c = ready();
  if (!c || !tones.length) return;
  const t = c.currentTime + 0.004;
  for (const p of tones) {
    const a = p.a * vol * 0.22;
    if (a < 0.002) continue;
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(p.f * (1 + 0.012 * Math.min(1, p.a)), t);
    o.frequency.setTargetAtTime(p.f, t, 0.03);
    if (glide && p.drum === 'bayan') o.frequency.setTargetAtTime(p.f * glide.to, t + (glide.at ?? 0.08), glide.tc ?? 0.12);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(a, t + 0.002);
    g.gain.setTargetAtTime(0, t + 0.002, Math.max(0.01, p.tau));
    o.connect(g).connect(V.bus);
    const end = t + 0.05 + p.tau * 7;
    o.start(t); o.stop(end);
    if (p.drum === 'bayan') { V.bayan.push({ o, f: p.f, end }); }
  }
  V.bayan = V.bayan.filter((b) => b.end > c.currentTime);
  if (click > 0) {
    const src = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
    src.buffer = V.noise; bp.type = 'bandpass'; bp.Q.value = 1.2;
    bp.frequency.value = tones[0].drum === 'bayan' ? 700 : 2600;
    g.gain.setValueAtTime(0.18 * click * vol, t); g.gain.setTargetAtTime(0, t, 0.012);
    src.connect(bp).connect(g).connect(V.bus); src.start(t); src.stop(t + 0.12);
  }
}
// Bend any bayan tone that is still ringing (the palm pressing after the strike). r is relative to
// the pitch the stroke started at.
export function bendBayan(r) {
  if (!ctx || !V || audio.muted || recording()) return;
  const now = ctx.currentTime;
  V.bayan.forEach((b) => { if (b.end > now) { try { b.o.frequency.setTargetAtTime(b.f * r, now, 0.06); } catch { /* stopped */ } } });
}

// ---------------------------------------------------------------- the teentaal theka
// Teentaal: 16 beats (matras) in four vibhags of four. Claps (tali) on 1 (sam, X), 5 and 13; a wave
// (khali, 0) on 9, where the bayan falls silent: dha becomes ta, dhin becomes tin.
export const TEENTAAL = ['dha', 'dhin', 'dhin', 'dha', 'dha', 'dhin', 'dhin', 'dha', 'dha', 'tin', 'tin', 'ta', 'ta', 'dhin', 'dhin', 'dha'];
export const TALI = { 0: 'X', 4: '2', 8: '0', 12: '3' };

// ---------------------------------------------------------------- the player
// Holds the tuning and turns bols into sounds and head vibrations. `heads` = { dayan, bayan } are
// membranes from makeMembrane (either may be missing).
export function makePlayer(heads = {}, opts = {}) {
  const P = {
    sa: opts.sa ?? SA['C♯'], load: opts.load ?? 1, bayanF: opts.bayanF ?? BAYAN_F0, press: 0, pressShown: 0, heads,
    last: null, lastTones: [], lastT: 0, theka: null, bpm: 100, beat: -1, flash: {}, onBol: null,
    hit(bol, { quiet = false, glide = null } = {}) {
      const parts = COMBO[bol] || [bol];
      let all = [];
      parts.forEach((st) => {
        const tones = strokeTones(st, { sa: this.sa, load: this.load, bayanF: this.bayanF, press: this.press });
        all = all.concat(tones);
        const h = BOLS[st].hand === 'dayan' ? this.heads.dayan : this.heads.bayan;
        if (h) h.hit(tones, BOLS[st]);
        if (!quiet) sound(tones, { click: BOLS[st].click, glide: BOLS[st].hand === 'bayan' ? glide : null });
        this.flash[st] = 1;
      });
      this.last = bol; this.lastTones = all; this.lastT = 0;
      this.onBol?.(bol);
      return all;
    },
    setPress(p) { this.press = clamp(p, 0, 1); bendBayan(pressRatio(this.press) / pressRatio(this.pressAtHit ?? 0)); },
    play(on = true) { this.theka = on ? { t: 0 } : null; this.beat = -1; },
    get playing() { return !!this.theka; },
    update(dt) {
      dt = Math.max(0, dt);
      this.lastT += dt;
      for (const k in this.flash) this.flash[k] = Math.max(0, this.flash[k] - dt * 3);
      if (this.theka) {
        const spb = 60 / this.bpm;
        this.theka.t += dt;
        const b = Math.floor(this.theka.t / spb) % 16;
        if (b !== this.beat) { this.beat = b; this.hit(TEENTAAL[b]); }
      }
      this.pressShown += (this.press - this.pressShown) * Math.min(1, dt * 12);
      this.heads.dayan?.update(dt); this.heads.bayan?.update(dt);
    },
  };
  // Remember the press at each bayan strike so a later bend is relative to it.
  const hit0 = P.hit.bind(P);
  P.hit = (bol, o) => { if ((COMBO[bol] || [bol]).some((x) => BOLS[x].hand === 'bayan')) P.pressAtHit = P.press; return hit0(bol, o); };
  return P;
}

// ---------------------------------------------------------------- computer keyboard
// Right hand (dayan): J na, K tin, L tun, H te. Left hand (bayan): D ge, S ke. Both: F dha, G dhin.
// Hold Shift to press the bayan with the heel of the palm. Space starts or stops the theka.
export const KEYMAP = { j: 'na', k: 'tin', l: 'tun', h: 'te', d: 'ge', s: 'ke', f: 'dha', g: 'dhin' };
export function tablaKeys(P, { theka = true, onPress = null } = {}) {
  const busy = () => /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || document.getElementById('modal')?.hidden === false;
  const kd = (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || busy()) return;
    if (e.key === 'Shift') { onPress ? onPress(true) : P.setPress(1); return; }
    if (e.code === 'Space' && theka) { if (document.activeElement?.tagName === 'BUTTON') document.activeElement.blur(); e.preventDefault(); if (!e.repeat) P.play(!P.playing); return; }
    const b = KEYMAP[e.key.toLowerCase()];
    if (b && !e.repeat) { e.preventDefault(); P.hit(b); }
  };
  const ku = (e) => { if (e.key === 'Shift') { onPress ? onPress(false) : P.setPress(0); } };
  const blur = () => { if (onPress) onPress(false); else P.setPress(0); };
  window.addEventListener('keydown', kd); window.addEventListener('keyup', ku); window.addEventListener('blur', blur);
  return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); window.removeEventListener('blur', blur); P.play(false); };
}

// ---------------------------------------------------------------- 3D: a vibrating membrane
// A polar grid of radius R facing up. style 'tabla' colours the kinar, maidan and syahi (syahiR as a
// fraction of R, syahiOff its centre offset as fractions of R); style 'heat' colours up (warm) and
// down (cool) so the node lines show. amp is the drawn height of a full-strength mode.
const C_SYAHI = new THREE.Color(0x17130f), C_MAIDAN = new THREE.Color(0xdcc9a0), C_KINAR = new THREE.Color(0xc4a57a);
const C_NEUT = new THREE.Color(0x9aa6bd), C_UP = new THREE.Color(0xff7a59), C_DOWN = new THREE.Color(0x5b8cff);
export function makeMembrane(R, { nr = 28, ns = 80, style = 'tabla', syahiR = 0.42, syahiOff = [0, 0], kinar = 0.86, amp = 0.05, dome = 0.016, slow = 1.3 } = {}) {
  const N = (nr + 1) * ns, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), base = new Float32Array(N);
  const rho = new Float32Array(N), ang = new Float32Array(N), ring = new Uint16Array(N), inSy = new Uint8Array(N);
  let v = 0;
  for (let i = 0; i <= nr; i++) for (let j = 0; j < ns; j++, v++) {
    const r = i / nr, a = (j / ns) * TAU;
    rho[v] = r; ang[v] = a; ring[v] = i;
    const x = r * Math.cos(a), z = r * Math.sin(a);
    pos[v * 3] = x * R; pos[v * 3 + 2] = z * R;
    const ds = Math.hypot(x - syahiOff[0], z - syahiOff[1]);
    let c = C_MAIDAN, h = 0;
    if (style === 'tabla') {
      if (ds < syahiR) { c = C_SYAHI; h = dome * (1 - (ds / syahiR) ** 2) + 0.004; inSy[v] = 1; }
      else if (r > kinar) { c = C_KINAR; h = 0.006; }
    } else c = C_NEUT;
    base[v] = h; pos[v * 3 + 1] = h;
    col[v * 3] = c.r; col[v * 3 + 1] = c.g; col[v * 3 + 2] = c.b;
  }
  const idx = [];
  for (let i = 0; i < nr; i++) for (let j = 0; j < ns; j++) {
    const a = i * ns + j, b = i * ns + ((j + 1) % ns), c = (i + 1) * ns + j, d = (i + 1) * ns + ((j + 1) % ns);
    if (i > 0) idx.push(a, c, b); idx.push(b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: style === 'tabla' ? 0.62 : 0.5, metalness: 0, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(g, mat); mesh.castShadow = true; mesh.receiveShadow = true;
  // Mode shapes by ring, computed once.
  const J = MODES.map((d) => Float32Array.from({ length: nr + 1 }, (_, i) => besselJ(d.m, (d.j * i) / nr) / d.max));
  const live = [], tmp = new THREE.Color();
  const api = {
    mesh, R, live, amp, heavy: 0,
    // Tones from strokeTones(): each dayan mode starts ringing (drawn slowed down).
    hit(tones, bol) {
      if (tones[0]?.drum === 'bayan') {
        const e = excite(bol.strike, null);
        e.forEach((x) => { if (x.a > 0.05 && MODES[x.k].h <= 3) live.push({ k: x.k, a: x.a * tones[0].a * (MODES[x.k].h === 1 ? 1 : 0.4), th: x.th, w: TAU * slow * MODES[x.k].bare, tau: Math.max(0.2, tones[0].tau * 1.6), ph: 0 }); });
      } else tones.forEach((t) => { if (t.a > 0.03) live.push({ k: t.k, a: t.a, th: t.th, w: TAU * slow * (t.f / tones[0].f) * (MODES[0].bare), tau: Math.max(0.12, t.tau * 2.2), ph: 0 }); });
      while (live.length > 40) live.shift();
    },
    // A single mode ringing steadily (for showing mode shapes).
    hold(k, a = 1, th = 0, rate = 1) { live.length = 0; if (k >= 0) live.push({ k, a, th, w: TAU * slow * rate, tau: Infinity, ph: 0 }); },
    clear() { live.length = 0; },
    retune(rate) { live.forEach((l) => { if (l.tau === Infinity) l.w = TAU * slow * rate; }); },
    energy() { return live.reduce((s, l) => s + l.a, 0); },
    update(dt) {
      dt = Math.max(0, dt);
      for (let i = live.length - 1; i >= 0; i--) { const l = live[i]; l.ph += l.w * dt; if (l.tau !== Infinity) { l.a *= Math.exp(-dt / l.tau); if (l.a < 0.004) live.splice(i, 1); } }
      const p = g.attributes.position.array, cc = g.attributes.color.array;
      for (let v2 = 0; v2 < N; v2++) {
        let y = 0;
        for (let q = 0; q < live.length; q++) {
          const l = live[q], d = MODES[l.k];
          let s = J[l.k][ring[v2]] * Math.cos(d.m * (ang[v2] - l.th)) * Math.cos(l.ph);
          if (inSy[v2] && api.heavy && d.h > 1) s *= 1 - 0.55 * api.heavy;
          y += l.a * s;
        }
        p[v2 * 3 + 1] = base[v2] + y * amp;
        if (style === 'heat') {
          const k = clamp(Math.abs(y) * 1.4, 0, 1);
          tmp.copy(C_NEUT).lerp(y > 0 ? C_UP : C_DOWN, k);
          if (Math.abs(y) < 0.04 && live.length) tmp.lerp(new THREE.Color(0xffffff), 0.6);
          cc[v2 * 3] = tmp.r; cc[v2 * 3 + 1] = tmp.g; cc[v2 * 3 + 2] = tmp.b;
        }
      }
      g.attributes.position.needsUpdate = true;
      if (style === 'heat') g.attributes.color.needsUpdate = true;
      g.computeVertexNormals();
    },
  };
  return api;
}

// ---------------------------------------------------------------- 3D: the drums
const WOOD = 0x5e2f1a, LEATHER = 0x5a3a24, STRAP = 0x8a5a36, GATTA = 0xa0683a, CUSH = 0x7a1f2b;
const lathe = (prof, mat, seg = 72) => {
  const g = new THREE.LatheGeometry(prof.map(([y, r]) => new THREE.Vector2(Math.max(0, r), y)), seg);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; return m;
};
const lerpProf = (prof, y) => {
  for (let i = 1; i < prof.length; i++) if (y <= prof[i][0]) { const [y0, r0] = prof[i - 1], [y1, r1] = prof[i]; return r0 + ((r1 - r0) * (y - y0)) / Math.max(1e-6, y1 - y0); }
  return prof[prof.length - 1][1];
};

// Dayan: a 14 cm (5½ in) head on a hollowed block of sheesham about 26 cm tall. Bayan: a 23 cm head
// on a copper or brass bowl about 25 cm tall. Typical sizes, e.g. india-instruments.com's tabla pages.
export const DAYAN = { H: 2.6, R: 0.7, syahiR: 0.44, prof: [[0, 0.8], [0.12, 0.84], [0.7, 0.9], [1.3, 0.92], [1.9, 0.87], [2.45, 0.79], [2.6, 0.76]] };
export const BAYAN = { H: 2.45, R: 1.15, syahiR: 0.34, syahiOff: [0.12, 0.3], prof: [[0, 0.02], [0.04, 0.5], [0.3, 0.95], [0.8, 1.36], [1.35, 1.48], [1.85, 1.4], [2.25, 1.24], [2.45, 1.19]] };

// Builds one drum. Returns parts for exploding, the membrane, pick zones and strap updates.
export function makeDrum(kind, { gattas = kind === 'dayan', lift = 0.22 } = {}) {
  const D = kind === 'dayan' ? DAYAN : BAYAN;
  const group = new THREE.Group();
  const body = new THREE.Group(); body.position.y = lift; group.add(body);
  // Shell: outer wall, rim and a hollow inside (the dayan is carved out about two thirds of its depth).
  const shellMat = kind === 'dayan' ? M.matte(WOOD, { roughness: 0.55 }) : M.metal(0xb8734a, { roughness: 0.32, metalness: 0.85 });
  const inner = kind === 'dayan' ? [[D.H, 0.66], [2.2, 0.64], [1.2, 0.58], [0.9, 0.3], [0.88, 0]] : D.prof.map(([y, r]) => [y, Math.max(0, r - 0.05)]).reverse();
  const prof = [...D.prof.map(([y, r]) => [y, r]), ...inner];
  const shell = lathe(prof, shellMat); shellMat.side = THREE.DoubleSide; body.add(shell);
  // Head (pudi).
  const headG = new THREE.Group(); headG.position.y = D.H + 0.02; body.add(headG);
  const head = makeMembrane(D.R, { nr: kind === 'dayan' ? 28 : 40, ns: kind === 'dayan' ? 80 : 140, syahiR: D.syahiR, syahiOff: D.syahiOff || [0, 0], kinar: 0.84, amp: kind === 'dayan' ? 0.05 : 0.08 });
  headG.add(head.mesh);
  // Skin wrapping down over the rim, and the gajra (braided ring) around the edge.
  const wrap = lathe([[0.0, D.R], [-0.02, D.R + 0.04], [-0.14, D.R + 0.07], [-0.15, D.R + 0.05]], M.matte(0xc9ad84), 72); headG.add(wrap);
  const gajra = new THREE.Group(); headG.add(gajra);
  gajra.add(torus(D.R + 0.08, 0.06, M.matte(LEATHER, { roughness: 0.7 }), 96));
  gajra.children[0].rotation.x = Math.PI / 2; gajra.children[0].position.y = -0.06;
  const NG = 16;
  for (let i = 0; i < NG; i++) {         // the braid's loops (ghar) the straps pass through
    const a = ((i + 0.5) / NG) * TAU, l = torus(0.05, 0.022, M.matte(0x3f2718), 12);
    l.position.set(Math.cos(a) * (D.R + 0.13), -0.08, Math.sin(a) * (D.R + 0.13)); l.rotation.y = -a; gajra.add(l);
  }
  // Bottom ring (gudri) the straps wrap round.
  const gudri = torus(D.prof[1][1] * 0.8, 0.06, M.matte(LEATHER), 64); gudri.rotation.x = Math.PI / 2; gudri.position.y = 0.05; body.add(gudri);
  // Straps (baddhi): V pairs from two gajra loops down to one point on the gudri, 8 V's.
  const straps = new THREE.Group(); body.add(straps);
  const strapMat = M.matte(STRAP, { roughness: 0.65 });
  const gat = [];
  const gattaMat = M.matte(GATTA, { roughness: 0.5 });
  for (let k = 0; k < 8; k++) {
    const mid = ((2 * k + 1) / NG) * TAU;
    if (gattas) {
      const gm = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.42, 20), gattaMat); gm.castShadow = true;
      gm.userData.angle = mid; body.add(gm); gat.push(gm);
    }
  }
  let gY = 1.25;
  const setGattas = (y) => {
    gY = y;
    straps.children.forEach((c) => { c.geometry.dispose(); });
    straps.clear();
    for (let k = 0; k < 8; k++) {
      const mid = ((2 * k + 1) / NG) * TAU;
      for (const side of [-1, 1]) {
        const aTop = mid + side * (0.5 / NG) * TAU, aBot = mid;
        const pts = [];
        const yTop = D.H - 0.1, yBot = 0.05;
        for (let q = 0; q <= 8; q++) {
          const u = q / 8, y = yTop + (yBot - yTop) * u;
          let a = aTop + (aBot - aTop) * u, r = lerpProf(D.prof, y) + 0.035;
          if (gattas) {                            // strands run over the gatta, spread apart around it
            const d = Math.abs(y - gY), bump = Math.max(0, 1 - d / 0.35);
            r += 0.2 * bump; a = a + side * 0.07 * bump;
          }
          pts.push([Math.cos(a) * r, y, Math.sin(a) * r]);
        }
        straps.add(tube(pts, 0.022, strapMat, false, 24));
      }
    }
    gat.forEach((gm) => { const a = gm.userData.angle, r = lerpProf(D.prof, gY) + 0.13; gm.position.set(Math.cos(a) * r, gY, Math.sin(a) * r); gm.rotation.set(0, 0, 0); });
  };
  setGattas(gattas ? 1.25 : 0);
  // Cushion ring (chutta or indri) under the drum.
  const cushion = torus(kind === 'dayan' ? 0.62 : 0.7, 0.16, M.matte(CUSH, { roughness: 0.9 }), 48);
  cushion.rotation.x = Math.PI / 2; cushion.position.y = 0.14; group.add(cushion);
  if (kind === 'bayan') body.position.y = 0.2;
  // Invisible pick zones over the head, one per stroke area.
  const zone = (geo, bol, y = 0.05) => { const z = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })); z.rotation.x = -Math.PI / 2; z.position.y = y; z.userData.bol = bol; headG.add(z); return z; };
  const zones = [];
  if (kind === 'dayan') {
    zones.push(zone(new THREE.CircleGeometry(D.R * D.syahiR, 40), 'tun', 0.06));
    zones.push(zone(new THREE.RingGeometry(D.R * D.syahiR, D.R * 0.84, 48), 'tin'));
    zones.push(zone(new THREE.RingGeometry(D.R * 0.84, D.R + 0.12, 48), 'na'));
  } else {
    const s = zone(new THREE.CircleGeometry(D.R * D.syahiR * 1.1, 40), 'ke', 0.07); s.position.x = D.syahiOff[0] * D.R; s.position.z = D.syahiOff[1] * D.R; zones.push(s);
    zones.push(zone(new THREE.CircleGeometry(D.R + 0.1, 48), 'ge'));
  }
  return { group, body, shell, shellMat, headG, head, gajra, wrap, straps, gudri, gattas: gat, cushion, zones, D, setGattas, get gY() { return gY; } };
}

// A marker for a strike or a resting finger on a head: a glowing ring and a small fingertip.
export function marker(color, r = 0.1) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.RingGeometry(r * 0.8, r, 32), M.glow(color, { transparent: true, opacity: 0.95, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; g.add(ring);
  const tip = new THREE.Mesh(new THREE.CapsuleGeometry(r * 0.75, r * 3, 6, 12), M.matte(0xd9a07c, { roughness: 0.6 }));
  tip.position.y = r * 2.6; g.add(tip);
  g.ring = ring; g.tip = tip;
  return g;
}
// Place a marker at (ρ, θ) on a head of radius R (in the head group's frame).
export const onHead = (o, R, rho, th, y = 0.03) => { o.position.set(Math.cos(th) * rho * R, y, Math.sin(th) * rho * R); };

// ---------------------------------------------------------------- boards
// A chart of mode frequencies as ratios of the fundamental, with harmonic lines 1…5.
// items: [{ r, a (0–1 height), label, on }]
export function ratioBoard(w = 900, h = 360) {
  const st = { items: [], title: '', note: '', harm: true };
  const b = canvasTexture(w, h, (c, W, H) => {
    c.clearRect(0, 0, W, H); c.fillStyle = 'rgba(7,8,12,.86)'; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(255,255,255,.85)'; c.font = '28px sans-serif'; c.fillText(st.title, 26, 42);
    c.fillStyle = 'rgba(255,255,255,.55)'; c.font = '20px sans-serif'; c.fillText(st.note, 26, 74);
    const x0 = 50, x1 = W - 40, X = (r) => x0 + ((r - 0.6) / (5.6 - 0.6)) * (x1 - x0), yb = H - 56, top = 100;
    if (st.harm) for (let n = 1; n <= 5; n++) {
      c.strokeStyle = 'rgba(92,225,169,.5)'; c.setLineDash([6, 6]); c.lineWidth = 2;
      c.beginPath(); c.moveTo(X(n), top); c.lineTo(X(n), yb); c.stroke(); c.setLineDash([]);
      c.fillStyle = 'rgba(92,225,169,.9)'; c.font = '18px sans-serif'; c.fillText(n + '×', X(n) - 10, top - 6);
    }
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x0, yb); c.lineTo(x1, yb); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.5)'; c.font = '17px sans-serif'; c.fillText('frequency ÷ lowest mode  →', x1 - 250, yb + 40);
    st.items.forEach((it) => {
      const x = X(it.r), hh = Math.max(4, (yb - top - 30) * clamp(it.a, 0, 1));
      c.fillStyle = it.on ? '#8ef0ff' : 'rgba(255,181,71,.85)';
      c.fillRect(x - 6, yb - hh, 12, hh);
      if (it.label) { c.save(); c.translate(x + 5, yb + 8); c.fillStyle = it.on ? '#8ef0ff' : 'rgba(255,255,255,.7)'; c.font = (it.on ? 'bold ' : '') + '16px sans-serif'; c.fillText(it.label, -18, 16); c.restore(); }
    });
  });
  b.update = (o) => { const key = JSON.stringify(o); if (key !== b.key) { b.key = key; Object.assign(st, o); b.redraw(); } };
  return b;
}

// The teentaal cycle board: 16 cells in four vibhags with tali and khali marks; the current beat lit.
export function cycleBoard(w = 1000, h = 330) {
  const st = { beat: -1, bpm: 100 };
  const b = canvasTexture(w, h, (c, W, H) => {
    c.clearRect(0, 0, W, H); c.fillStyle = 'rgba(7,8,12,.88)'; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(255,255,255,.85)'; c.font = '28px sans-serif'; c.fillText('Teentaal: 16 beats, 4 + 4 + 4 + 4', 26, 42);
    c.fillStyle = 'rgba(255,255,255,.55)'; c.font = '20px sans-serif'; c.fillText(`${Math.round(st.bpm)} beats a minute · X = sam (clap), 2 and 3 = claps, 0 = khali (wave)`, 26, 74);
    const cw = (W - 60) / 16, y0 = 120;
    for (let i = 0; i < 16; i++) {
      const x = 30 + i * cw + Math.floor(i / 4) * 0, on = i === st.beat, khali = i >= 8 && i < 12;
      c.fillStyle = on ? '#8ef0ff' : khali ? 'rgba(122,162,255,.18)' : 'rgba(255,181,71,.14)';
      c.fillRect(x + 3, y0, cw - 6, 120);
      c.fillStyle = on ? '#07080c' : 'rgba(255,255,255,.9)'; c.font = (on ? 'bold ' : '') + '22px sans-serif';
      const t = BOL_LABEL[TEENTAAL[i]]; c.fillText(t, x + cw / 2 - c.measureText(t).width / 2, y0 + 70);
      c.fillStyle = on ? '#07080c' : 'rgba(255,255,255,.4)'; c.font = '15px sans-serif'; c.fillText(String(i + 1), x + cw / 2 - 5, y0 + 108);
      if (TALI[i] !== undefined) { c.fillStyle = TALI[i] === '0' ? '#7aa2ff' : '#ffb547'; c.font = 'bold 26px sans-serif'; c.fillText(TALI[i], x + cw / 2 - 8, y0 - 12); }
      if (i % 4 === 0 && i) { c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(x - 1, y0 - 6, 3, 132); }
    }
    c.fillStyle = 'rgba(255,255,255,.55)'; c.font = '18px sans-serif';
    c.fillText('Khali: the bayan rests, so Dha → Ta and Dhin → Tin. Listen for the missing boom.', 26, H - 30);
  });
  b.update = (o) => { const key = `${o.beat}|${Math.round(o.bpm)}`; if (key !== b.key) { b.key = key; Object.assign(st, o); b.redraw(); } };
  return b;
}

export function boardMesh(board, w, h) {
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: board.tex, transparent: true, side: THREE.DoubleSide }));
}

// On narrow screens, keep the headline and the first rows of a readout.
export function compact(html, stage, rows = 2) {
  if (stage.host.clientWidth >= 560) return html;
  let k = 0;
  return html.replace(/<small>[\s\S]*?<\/small>/g, '').replace(/<div class="(row|no)">[\s\S]*?<\/div>/g, (m) => (++k <= rows ? m : ''));
}

export { box };
