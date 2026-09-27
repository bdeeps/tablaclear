// Chapter 2: an ideal circular drumhead. Its modes follow the zeros of Bessel functions, so they are
// not whole-number multiples of the lowest one, and a plain drum sounds like a thud, not a note.
import { THREE, M, torus } from '../kit.js';
import { MODES, makeMembrane, ratioBoard, boardMesh, sound, excite, fmtHz, compact, TAU } from '../tabla.js';

const R = 2.0, Y = 1.25;
const A = 0.07;           // radius of a dayan head in metres (14 cm across)
const SIGMA = 0.25;       // goatskin about 0.2 mm thick: roughly 0.25 kg per square metre
const f01 = (T) => (MODES[0].j / (TAU * A)) * Math.sqrt(T / SIGMA);   // f = j/(2πa)·√(T/σ)
const SHOW = 6;           // the first six modes on the selector

export default {
  id: 'membranes',
  short: 'Drumheads',
  title: 'How a plain drumhead rings',
  subtitle: 'Its overtones follow Bessel functions, not 1, 2, 3.',
  view: { pos: [0.3, 5.9, 8.4], target: [-0.3, 0.9, 1.3] },
  learn: `<p>Hit a stretched skin and it shakes in several patterns at once, called <b>modes</b>. In each one some lines stay perfectly still: <b>nodal lines</b>. They can be straight lines across the middle (<b>diameters</b>) or <b>circles</b>. A mode is named (m, n): m nodal diameters and n nodal circles, counting the rim.</p>
    <p>For a string or a flute, the modes are neatly 1, 2, 3, 4 times the lowest note: <b>harmonics</b>, which our ears hear as one clear pitch (see <a href="/pianoclear/#strings">PianoClear</a>). A round drumhead is different. Its modes come from the zeros of <b>Bessel functions</b>, and they land at <b>1 : 1.59 : 2.14 : 2.30 : 2.65 : 2.92</b>. These overtones are <b>inharmonic</b>: they don't line up, so the ear can't find a pitch and hears a <b>thud</b>.</p>
    <p>Tighter skin rings higher: the frequency grows with the <b>square root of the tension</b>, <b>f = j/(2πa) · √(T/σ)</b>, where a is the radius and σ the mass of each square metre of skin. (More on standing waves in <a href="/waveclear/">Waves and resonance</a>.)</p>
    <p class="tip"><b>Try it:</b> step through the modes and watch the still lines: warm is up, cool is down, pale is not moving. Then strike the plain drum and hear the thud.</p>`,
  terms: [
    { t: 'Mode', d: 'One pattern a skin can vibrate in, at its own frequency.' },
    { t: 'Nodal line', d: 'A line on the skin that stays still while the rest moves.' },
    { t: '(m, n)', d: 'A mode with m straight nodal lines across the middle and n nodal circles, counting the rim.' },
    { t: 'Bessel function', d: 'The wavy curve that describes how a round skin bends. Where it crosses zero sets each mode’s frequency.' },
    { t: 'Inharmonic', d: 'Overtones that are not whole-number multiples of the lowest one. They sound like a thud or a clang.' },
  ],
  defaults: { mode: 0, tension: 1200 },
  controls: [
    { key: 'mode', type: 'seg', label: 'Mode', options: MODES.slice(0, SHOW).map((d, i) => ({ v: i, label: `(${d.m},${d.n})` })), fmt: (v) => `${MODES[v].bare.toFixed(2)} × the lowest` },
    { key: 'tension', type: 'range', label: 'Skin tension', min: 400, max: 3000, step: 10, fmt: (v) => Math.round(v).toLocaleString('en') + ' N/m' },
    { key: 'hear', type: 'buttons', label: 'Hear it', items: [
      { label: '♪ This mode alone', act: (s, inst) => inst.hearMode() },
      { label: '♪ Strike the plain drum', act: (s, inst) => inst.strike() },
    ] },
  ],
  quiz: [
    { q: 'A plain drumhead’s second mode is about 1.59 times its first. Why does that make the drum sound like a thud?', options: ['1.59 is too quiet', 'It isn’t a whole-number multiple, so the overtones don’t line up into one pitch', 'The skin is too thin', 'Drums have no overtones'], answer: 1, why: 'Our ears hear a clear pitch when overtones sit at 2, 3, 4 times the lowest. 1.59, 2.14 and 2.30 don’t fit that pattern.' },
    { q: 'In mode (1,1), what stays still?', options: ['Only the rim', 'The rim and one straight line across the middle', 'The rim and a circle', 'Nothing'], answer: 1, why: 'm = 1 means one nodal diameter, and n = 1 means one nodal circle: the rim itself.' },
    { q: 'You make the skin four times as tight. What happens to its pitch?', options: ['It doubles', 'It goes up four times', 'It halves', 'It stays the same'], answer: 0, why: 'f grows with √T, and √4 = 2: one octave up.' },
  ],
  reel: [
    { ms: 5400, caption: 'A plain drumhead rings in patterns called modes, with still lines called nodes.', set: { mode: 1 }, act: (s, inst) => inst.cycle(true), view: { pos: [0.4, 6.2, 7.6], target: [0.2, 0.9, 1.3] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); root.position.x = 0.9; stage.root.add(root);
    const mem = makeMembrane(R, { style: 'heat', nr: 36, ns: 96, amp: 0.32, slow: 0.9 });
    mem.mesh.position.y = Y; root.add(mem.mesh);
    const rim = torus(R + 0.05, 0.07, M.metal(0xcfd6e0), 96); rim.rotation.x = Math.PI / 2; rim.position.y = Y; root.add(rim);
    const shellMat = M.clear(0xcfe8ff, 0.12);
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.05, R + 0.05, Y, 64, 1, true), shellMat); shell.position.y = Y / 2; root.add(shell);
    const board = ratioBoard(900, 380);
    const bm = boardMesh(board, 4.6, 1.94); bm.scale.setScalar(0.85); bm.position.set(-1.3, 0.9, R + 1.6); bm.rotation.x = -0.55; root.add(bm);
    const lMode = stage.label('', [0, Y + 0.7, -R - 0.2], root, 'hot');
    let cyc = false, ct = 0, shown = -1;
    return {
      cycle(on) { cyc = on; ct = 0; },
      hearMode(s) {
        const k = this._s.mode, f = f01(this._s.tension) * MODES[k].bare;
        sound([{ drum: 'dayan', f, a: 1, tau: 0.9 }], { click: 0 });
      },
      strike() {
        const ex = excite({ r: 0.62, th: 0.4 }), f0 = f01(this._s.tension);
        const tones = ex.map((e) => ({ drum: 'dayan', k: e.k, f: f0 * MODES[e.k].bare, a: e.a / (1 + MODES[e.k].h * 0.3), tau: e.k === 0 ? 0.14 : 0.3 - 0.015 * e.k, th: e.th }));
        sound(tones, { click: 0.4 });
        mem.clear(); mem.hit(tones, { strike: { r: 0.62, th: 0.4 } }); shown = -2;
      },
      update(dt, s) {
        dt = Math.max(0, dt); this._s = s;
        if (cyc) { ct += dt; const k = Math.floor(ct / 1.2) % SHOW; if (k !== s.mode) s.mode = k; }
        if (s.mode !== shown && (shown !== -2 || mem.energy() < 0.05)) { shown = s.mode; mem.hold(s.mode, 1, 0.3, MODES[s.mode].bare); }
        mem.update(dt);
        const d = MODES[s.mode];
        lMode.element.textContent = shown === -2 ? 'All modes at once' : `Mode (${d.m},${d.n}): ${d.m} line${d.m === 1 ? '' : 's'} across, ${d.n} circle${d.n === 1 ? '' : 's'}`;
        board.update({ title: 'Plain drumhead: modes vs harmonics', note: 'Green dashes: where harmonics would be. Orange: where the modes really are.', harm: true,
          items: MODES.map((m, i) => ({ r: m.bare, a: 0.95 - i * 0.07, label: `${m.m},${m.n}`, on: i === s.mode })) });
      },
      readout: (s) => {
        const d = MODES[s.mode], f0 = f01(s.tension), n = Math.round(d.bare);
        return compact(`<div class="big">Mode (${d.m},${d.n}): ${d.bare.toFixed(3)} × the lowest</div>
          <div class="row"><span>Bessel zero j<sub>${d.m}${d.n}</sub></span><b>${d.j.toFixed(4)}</b></div>
          <div class="row"><span>Frequency on a bare 14 cm skin</span><b>${fmtHz(f0 * d.bare)}</b></div>
          <div class="row"><span>Nearest harmonic</span><b>${n}× (off by ${Math.abs(((d.bare - n) / n) * 100).toFixed(0)}%)</b></div>
          <div class="row"><span>Lowest mode, f = j/(2πa)·√(T/σ)</span><b>${fmtHz(f0)}</b></div>
          <small>Skin taken as 0.25 kg/m², about 0.2 mm of goatskin. Ratios from the Bessel zeros: 1 : 1.59 : 2.14 : 2.30 : 2.65 : 2.92.</small>`, stage);
      },
    };
  },
};
