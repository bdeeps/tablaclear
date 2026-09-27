// Chapter 5: the bayan's bending boom. The heel of the palm presses the skin, the tension rises, and
// the pitch glides up: f ∝ √T.
import { THREE, M, canvasTexture, clamp, smooth } from '../kit.js';
import { makeDrum, makePlayer, tablaKeys, pressRatio, BAYAN_F0, noteOf, fmtHz, boardMesh, compact } from '../tabla.js';

const HIST = 3.0;          // seconds of pitch shown on the chart

export default {
  id: 'bayan',
  short: 'Bending the bass',
  title: 'The bayan’s talking boom',
  subtitle: 'Press with the heel of your palm and the pitch slides up.',
  view: { pos: [0.0, 5.6, 6.6], target: [0.9, 1.9, 0.4] },
  learn: `<p>The big <b>bayan</b> gives the tabla its bass. Unlike the dayan, it isn't held to one fixed note. Its syahi sits <b>off-centre, towards the player</b>. The wrist and heel of the left hand rest at its edge, the fingers reach over to strike the open skin beyond, and the heel can <b>press</b>.</p>
    <p>Pressing pushes the skin down and stretches it, so the <b>tension</b> goes up. A tighter skin vibrates faster. For any stretched skin or string, the frequency grows with the <b>square root of the tension</b>: <b>f ∝ √T</b>. Double the tension and the pitch rises by √2, about 41%, or six semitones.</p>
    <p>So a good player strikes <b>ge</b> and then slides the heel forward while it rings: <i>ghe-e-e</i>, a boom that swoops up like a voice. This glide is called <b>gamak</b> (or meend), and it lets the bayan “talk”. A flat slap, <b>ke</b>, stops it dead.</p>
    <p class="tip"><b>Try it:</b> strike ge, then drag the palm pressure slider while it rings and watch the pitch line bend. Or press “Gamak”, or hold Shift after pressing D.</p>`,
  terms: [
    { t: 'Tension', d: 'How hard the skin is being pulled tight, in newtons for each metre of edge.' },
    { t: 'f ∝ √T', d: 'Frequency goes up with the square root of tension: four times the tension, twice the pitch.' },
    { t: 'Gamak', d: 'A sliding, swooping ornament. On the bayan, a boom that bends up as the palm presses.' },
    { t: 'Ge / Ghe', d: 'The open bayan stroke: the deep boom.' },
    { t: 'Ke / Ka', d: 'The closed bayan stroke: a flat slap that stops the ring.' },
  ],
  defaults: { press: 0 },
  controls: [
    { key: 'press', type: 'range', label: 'Palm pressure', min: 0, max: 1, step: 0.01, ends: ['resting', 'pressing hard'], fmt: (v) => `tension × ${(1 + 1.56 * v).toFixed(2)}` },
    { key: 'go', type: 'buttons', label: 'Play', items: [
      { label: '♪ Ge (open)', act: (s, inst) => inst.hit('ge') },
      { label: '♪ Gamak: strike and press', act: (s, inst) => inst.gamak() },
      { label: '♪ Ke (flat slap)', act: (s, inst) => inst.hit('ke') },
    ] },
  ],
  quiz: [
    { q: 'Why does pressing the bayan raise its pitch?', options: ['It makes the drum smaller', 'It stretches the skin, raising the tension, and f grows with √T', 'It heats the skin', 'It moves the syahi'], answer: 1, why: 'More tension means a stronger pull back to the middle, so the skin swings faster.' },
    { q: 'The tension is made 4 times bigger. What happens to the pitch?', options: ['4 times higher', 'Twice as high: one octave', 'Half', 'No change'], answer: 1, why: 'f ∝ √T, and √4 = 2.' },
    { q: 'Why is the bayan’s syahi off to one side?', options: ['By accident', 'So the heel of the hand can rest near the player while the fingers strike the open skin beyond it', 'To make it lighter', 'For decoration'], answer: 1, why: 'The wrist rests at the syahi’s edge near the player and can press, while the fingers reach over to strike the open maidan.' },
  ],
  reel: [
    { ms: 5600, caption: 'The bayan bends: press the skin with the heel of your palm and the boom slides up.', set: { press: 0 }, act: (s, inst) => inst.gamak(true), view: { pos: [0.9, 5.6, 7.2], target: [1.3, 2.0, 0.4] }, spin: 0 },
  ],

  build({ stage }) {
    const b = makeDrum('bayan'); stage.root.add(b.group);
    // The heel of the left hand, resting near the player's edge of the head.
    const hand = new THREE.Group(); b.headG.add(hand);
    const heel = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 16), M.matte(0xd9a07c, { roughness: 0.6 })); heel.scale.set(1.2, 0.45, 0.9); hand.add(heel);
    const palmM = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.16, 0.7), M.matte(0xd9a07c, { roughness: 0.6 })); palmM.position.set(-0.2, 0.2, -0.45); palmM.rotation.x = 0.35; hand.add(palmM);
    const lHeel = stage.label('Heel of the palm', [0, 0.45, 0.2], hand, 'hot');
    const lSy = stage.label('Off-centre syahi', [b.D.syahiOff[0] * b.D.R + 0.75, 0.2, b.D.syahiOff[1] * b.D.R], b.headG);
    const arrows = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.25, 16), M.glow(0xffb547)); arrows.rotation.x = Math.PI; hand.add(arrows); arrows.position.y = 0.62;
    // Pitch against time.
    const hist = [];
    const board = canvasTexture(900, 380, (c, W, H) => {
      c.clearRect(0, 0, W, H); c.fillStyle = 'rgba(7,8,12,.86)'; c.fillRect(0, 0, W, H);
      c.fillStyle = 'rgba(255,255,255,.85)'; c.font = '28px sans-serif'; c.fillText('Bayan pitch over the last 3 seconds', 26, 42);
      const x0 = 90, x1 = W - 30, y0 = 80, y1 = H - 50, lo = BAYAN_F0 * 0.9, hi = BAYAN_F0 * 1.7;
      const Y = (f) => y1 - ((f - lo) / (hi - lo)) * (y1 - y0);
      c.font = '17px sans-serif'; c.strokeStyle = 'rgba(255,255,255,.15)'; c.lineWidth = 1;
      [90, 110, 130, 150].forEach((f) => { c.beginPath(); c.moveTo(x0, Y(f)); c.lineTo(x1, Y(f)); c.stroke(); c.fillStyle = 'rgba(255,255,255,.5)'; c.fillText(f + ' Hz', 20, Y(f) + 6); });
      c.fillStyle = 'rgba(255,255,255,.5)'; c.fillText('time →', x1 - 70, H - 18);
      if (hist.length > 1) {
        const tN = hist[hist.length - 1].t;
        for (let i = 1; i < hist.length; i++) {
          const a = hist[i - 1], q = hist[i];
          if (q.a < 0.02) continue;
          c.strokeStyle = `rgba(92,225,169,${clamp(q.a * 1.2, 0.15, 1)})`; c.lineWidth = 3 + 5 * q.a;
          c.beginPath(); c.moveTo(x1 - ((tN - a.t) / HIST) * (x1 - x0), Y(a.f)); c.lineTo(x1 - ((tN - q.t) / HIST) * (x1 - x0), Y(q.f)); c.stroke();
        }
      }
    });
    const bm = boardMesh(board, 4.4, 1.86); bm.scale.setScalar(0.72); bm.position.set(3.0, 2.0, 0.6); bm.rotation.y = -0.2; stage.root.add(bm);

    const P = makePlayer({ bayan: b.head });
    let gam = null, env = 0, t = 0, redraw = 0, S = null, shift = false;
    const off = tablaKeys(P, { theka: false, onPress: (on) => { shift = on; if (!on && S) S.press = 0; } });
    return {
      hit(bol, quiet = false) { gam = null; P.press = S ? S.press : 0; P.hit(bol, { quiet }); env = bol === 'ge' ? 1 : 0.25; },
      gamak(quiet = false) { if (S) S.press = 0; P.press = 0; P.hit('ge', { quiet: quiet === true }); env = 1; gam = { t: 0 }; },
      update(dt, s) {
        dt = Math.max(0, dt); S = s; t += dt;
        if (gam) { gam.t += dt; s.press = 0.85 * smooth((gam.t - 0.15) / 0.7); if (gam.t > 1.6) gam = null; }
        if (shift) s.press = Math.min(1, s.press + dt * 2.2);
        if (Math.abs(s.press - P.press) > 0.002) P.setPress(s.press);
        P.update(dt);
        env *= Math.exp(-dt / (P.last === 'ke' ? 0.08 : 1.1));
        const f = BAYAN_F0 * pressRatio(P.press);
        hist.push({ t, f, a: env }); while (hist.length && t - hist[0].t > HIST) hist.shift();
        redraw += dt; if (redraw > 1 / 20) { redraw = 0; board.redraw(); }
        const k = P.pressShown;
        hand.position.set(-0.05, 0.28 - 0.14 * k, 0.72 - 0.12 * k);
        arrows.visible = k > 0.05; arrows.scale.setScalar(0.6 + k);
        b.head.mesh.position.y = 0;
        lSy.visible = stage.host.clientWidth >= 560;
      },
      readout: (s) => {
        const r = pressRatio(s.press), f = BAYAN_F0 * r, n = noteOf(f);
        return compact(`<div class="big">${fmtHz(f)}: ${n.name}</div>
          <div class="row"><span>Tension</span><b>× ${(1 + 1.56 * s.press).toFixed(2)} of resting</b></div>
          <div class="row"><span>Pitch, f ∝ √T</span><b>× ${r.toFixed(2)} (${(12 * Math.log2(r)).toFixed(1)} semitones up)</b></div>
          <div class="row"><span>Resting pitch</span><b>${fmtHz(BAYAN_F0)}</b></div>
          <small>A full press here raises the tension about 2.6 times, and the pitch 1.6 times. Real players reach a similar range.</small>`, stage);
      },
      dispose() { off(); },
    };
  },
};
