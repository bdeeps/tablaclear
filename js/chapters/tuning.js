// Chapter 6: tuning the dayan to Sa, then playing teentaal. Hammering the gatta down tightens the
// straps; tapping the gajra fine-tunes. f ∝ √T, so a semitone needs about 12% more tension.
import { THREE, M, canvasTexture, clamp } from '../kit.js';
import { makeDrum, makePlayer, tablaKeys, cycleBoard, boardMesh, sound, SA, TEENTAAL, TALI, BOL_LABEL, noteOf, fmtHz, cents, compact } from '../tabla.js';

// Tension model: T/T_slack = 1 + 0.9·g + fine, where g (0–1) is how far the gattas have been driven
// down and each gajra tap changes the tension by ±0.5%. F_SLACK is the dayan's pitch with the gattas
// at the top; driving them all the way down raises it by √1.9 ≈ 1.38 (about 5½ semitones).
const F_SLACK = 240, K_G = 0.9, TAP = 0.005;
const tension = (s) => 1 + K_G * s.gatta + s.fine * TAP;
const pitch = (s) => F_SLACK * Math.sqrt(Math.max(0.2, tension(s)));
const gY = (g) => 1.6 - 0.75 * g;              // gatta height on the shell (scene units)

export default {
  id: 'tuning',
  short: 'Tuning to Sa',
  title: 'Tune it to Sa, then play teentaal',
  subtitle: 'Hammer the gattas, tap the gajra, and keep the 16-beat cycle.',
  view: { pos: [1.0, 6.6, 8.6], target: [-0.4, 1.4, 1.0] },
  learn: `<p>Before a concert, the tabla player tunes the dayan to the song's home note, <b>Sa</b>. If the singer's Sa is C♯, the dayan must ring at C♯ too.</p>
    <p>For big changes the player hammers the wooden <b>gatta</b> blocks <b>down</b>. Each gatta sits in a V of strap, and pushing it towards the narrow end pulls the straps tighter, which stretches the head. Then the player taps the <b>gajra</b>, the braided rim, with a small hammer: tapping it <b>down</b> tightens the head and raises the pitch, tapping it <b>up</b> from below loosens it. They go all the way round, so the head is tuned evenly.</p>
    <p>Pitch goes with the <b>square root of tension</b>, f ∝ √T. One semitone is a pitch step of about 5.9%, so it needs about <b>12%</b> more tension. A tap on the gajra moves the pitch by only a few <b>cents</b> (hundredths of a semitone).</p>
    <p>Once tuned, the tabla keeps time. <b>Teentaal</b> is a cycle of <b>16 beats</b> in four parts (<b>vibhags</b>). You clap on beats 1, 5 and 13 (<b>tali</b>) and wave on beat 9 (<b>khali</b>), where the bayan goes quiet. Beat 1, the <b>sam</b>, is where everyone lands together.</p>
    <p class="tip"><b>Try it:</b> pick a Sa, drive the gattas down until the tuner is close, then tap the gajra until the needle is in the green. Play the theka and listen for the missing bass at khali. Speed it up for drut laya.</p>`,
  terms: [
    { t: 'Gatta', d: 'A wooden block under a pair of straps. Hammered down, it tightens the head.' },
    { t: 'Cent', d: 'A hundredth of a semitone. Trained ears notice about 5 to 10 cents.' },
    { t: 'Taal', d: 'A rhythmic cycle, like teentaal’s 16 beats.' },
    { t: 'Vibhag', d: 'A section of a taal. Teentaal has four, of four beats each.' },
    { t: 'Sam and khali', d: 'Sam is beat 1, the strong landing point. Khali is the “empty” section, marked with a wave, where the bayan rests.' },
    { t: 'Laya', d: 'Tempo: vilambit (slow), madhya (medium) and drut (fast).' },
  ],
  defaults: { sa: 'C♯', gatta: 0.3, fine: 0, bpm: 100 },
  controls: [
    { key: 'sa', type: 'seg', label: 'The song’s Sa', options: Object.keys(SA).map((v) => ({ v, label: v })), fmt: (v) => fmtHz(SA[v]) },
    { key: 'gatta', type: 'range', label: 'Hammer the gattas down', min: 0, max: 1, step: 0.005, ends: ['loose', 'tight'], fmt: (v, s) => `tension × ${tension(s).toFixed(3)}` },
    { key: 'tap', type: 'buttons', label: 'Tap the gajra', items: [
      { label: '▼ Tap down (sharper)', act: (s, inst) => { s.fine += 1; inst.tap(1); } },
      { label: '▲ Tap up (flatter)', act: (s, inst) => { s.fine -= 1; inst.tap(-1); } },
    ] },
    { key: 'bpm', type: 'range', label: 'Laya (tempo)', min: 50, max: 240, step: 1, fmt: (v) => `${Math.round(v)} beats a minute, ${v < 80 ? 'vilambit' : v < 160 ? 'madhya' : 'drut'}` },
    { key: 'go', type: 'buttons', label: 'Play', items: [
      { label: '♪ Strike tin', act: (s, inst) => inst.hit('tin') },
      { label: '♪ Hear Sa', act: (s, inst) => inst.ref() },
      { label: '▶ Teentaal theka', act: (s, inst) => inst.theka() },
    ] },
  ],
  quiz: [
    { q: 'What happens when the player hammers a gatta down?', options: ['The straps loosen and the pitch drops', 'The straps tighten and the pitch rises', 'The syahi gets heavier', 'Nothing, it is decoration'], answer: 1, why: 'The gatta sits in a V of strap. Pushed towards the narrow end, it forces the straps apart and pulls them tighter.' },
    { q: 'About how much more tension raises the dayan by one semitone (5.9%)?', options: ['About 3%', 'About 6%', 'About 12%', 'About 50%'], answer: 2, why: 'f ∝ √T, so T ∝ f². 1.059² ≈ 1.12: about 12% more tension.' },
    { q: 'In teentaal, what happens at khali (beat 9)?', options: ['Everyone stops', 'The bayan rests, so dha becomes ta and dhin becomes tin', 'The tempo doubles', 'The dayan is retuned'], answer: 1, why: 'Khali, the “empty” section, is marked by a wave of the hand. Leaving out the bass tells listeners where they are in the cycle.' },
  ],
  reel: [
    { ms: 5600, caption: 'To tune it, hammer the gatta blocks down: tighter straps, higher pitch, until it rings at Sa.', set: { sa: 'C♯', fine: 0 }, anim: { gatta: [0.05, 0.371] }, act: (s, inst) => inst.hammer(true), view: { pos: [2.0, 4.6, 5.0], target: [0.4, 1.6, 0.4] }, spin: 0.2 },
    { ms: 6000, caption: 'Then it keeps time: teentaal, 16 beats, with the bass falling silent at khali.', set: { sa: 'C♯', gatta: 0.371, fine: 0, bpm: 140 }, act: (s, inst) => inst.theka(true), view: { pos: [1.8, 5.2, 6.2], target: [0.7, 1.4, 0.8] }, spin: 0 },
  ],

  build({ stage }) {
    const d = makeDrum('dayan'), b = makeDrum('bayan', { gattas: false });
    d.group.position.x = 0.9; b.group.position.x = -2.2; b.group.position.z = -0.6;
    stage.root.add(d.group, b.group);
    stage.pickables.push(...d.zones, ...b.zones);
    // The tuning hammer (hathodi): a steel head on a short handle.
    const hammer = new THREE.Group(), pivot = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.1, 12), M.matte(0x8b5a2b)); handle.position.y = -0.55; pivot.add(handle);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.45, 16), M.metal(0xc0c6d0)); head.rotation.z = Math.PI / 2; head.position.y = 0.02; pivot.add(head);
    hammer.add(pivot); stage.root.add(hammer);
    const lGat = stage.label('Gatta', [0, 0, 0], d.body, 'hot'), lGaj = stage.label('Gajra', [0, 0.1, 1.0], d.headG);
    // Tuner.
    const tuner = canvasTexture(520, 300, (c, W, H, cc, name) => {
      c.clearRect(0, 0, W, H); c.fillStyle = 'rgba(7,8,12,.88)'; c.fillRect(0, 0, W, H);
      c.fillStyle = 'rgba(255,255,255,.85)'; c.font = '26px sans-serif'; c.fillText(`Tuner: target Sa = ${name || ''}`, 22, 38);
      const cx = W / 2, cy = H - 40, r = 190;
      c.lineWidth = 16;
      [[-50, -10, 'rgba(255,122,89,.6)'], [-10, 10, 'rgba(92,225,169,.9)'], [10, 50, 'rgba(255,122,89,.6)']].forEach(([a, b2, col]) => {
        c.strokeStyle = col; c.beginPath(); c.arc(cx, cy, r, -Math.PI / 2 + (a / 50) * 1.1, -Math.PI / 2 + (b2 / 50) * 1.1); c.stroke();
      });
      c.fillStyle = 'rgba(255,255,255,.6)'; c.font = '17px sans-serif'; c.fillText('flat', cx - r - 10, cy - 40); c.fillText('sharp', cx + r - 30, cy - 40);
      const k = clamp((cc || 0) / 50, -1, 1) * 1.1, ok = Math.abs(cc) < 10;
      c.strokeStyle = ok ? '#5ce1a9' : '#ffb547'; c.lineWidth = 5; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.sin(k) * (r - 20), cy - Math.cos(k) * (r - 20)); c.stroke();
      c.fillStyle = ok ? '#5ce1a9' : '#ffb547'; c.font = 'bold 26px sans-serif';
      const t = `${cc > 0 ? '+' : ''}${Math.round(cc)} cents`; c.fillText(t, cx - c.measureText(t).width / 2, cy - 70);
    });
    const tm = boardMesh(tuner, 2.2, 1.27); tm.position.set(3.4, 3.4, 0.2); tm.rotation.y = -0.5; stage.root.add(tm);
    const cyc = cycleBoard(1000, 330);
    const cm = boardMesh(cyc, 5.0, 1.65); cm.scale.setScalar(0.8); cm.position.set(0.2, 0.25, 2.5); cm.rotation.x = -0.8; stage.root.add(cm);

    const P = makePlayer({ dayan: d.head, bayan: b.head });
    const off = tablaKeys(P);
    let swing = 0, target = 'gajra', lastG = -1, S = null, auto = 0;
    const hammerAt = () => {
      if (target === 'gajra') { const a = 1.3; return [0.9 + Math.cos(a) * (d.D.R + 0.08), d.body.position.y + d.D.H + 0.12, Math.sin(a) * (d.D.R + 0.08)]; }
      const gm = d.gattas[2], p = new THREE.Vector3(); gm.getWorldPosition(p); return [p.x, p.y + 0.25, p.z];
    };
    return {
      hit(bol, quiet = false) { P.play(false); P.hit(bol, { quiet }); },
      ref() { sound([{ drum: 'dayan', f: SA[S.sa], a: 0.6, tau: 0.8 }, { drum: 'dayan', f: SA[S.sa] * 2, a: 0.2, tau: 0.6 }], { click: 0 }); },
      tap() { target = 'gajra'; swing = 1; P.hit('tin'); },
      hammer(on) { target = 'gatta'; auto = on ? 1 : 0; swing = 1; },
      theka(force) { P.play(force === true ? true : !P.playing); },
      update(dt, s) {
        dt = Math.max(0, dt); S = s;
        P.sa = pitch(s); P.bpm = s.bpm;
        if (Math.abs(s.gatta - lastG) > 0.004) { lastG = s.gatta; d.setGattas(gY(s.gatta)); target = 'gatta'; }
        if (auto) { auto += dt; if (swing <= 0) swing = 1; if (auto > 5) auto = 0; }
        swing = Math.max(0, swing - dt * 3.2);
        const [hx, hy, hz] = hammerAt();
        hammer.position.set(hx + 0.35, hy, hz + 0.35);
        pivot.rotation.set(0, 0, 0.5 + 0.9 * Math.sin(Math.PI * swing));
        hammer.rotation.y = target === 'gajra' ? -0.4 : -0.9;
        P.update(dt);
        const gp = d.gattas[2].position; lGat.position.set(gp.x * 1.25, gp.y + 0.4, gp.z * 1.25);
        const cc = cents(P.sa, SA[s.sa]);
        tuner.key !== `${Math.round(cc)}|${s.sa}` && (tuner.key = `${Math.round(cc)}|${s.sa}`, tuner.redraw(cc, `${s.sa}, ${fmtHz(SA[s.sa])}`));
        cyc.update({ beat: P.playing ? P.beat : -1, bpm: s.bpm });
        lGaj.visible = stage.host.clientWidth >= 560;
      },
      readout: (s) => {
        const f = pitch(s), cc = cents(f, SA[s.sa]), need = (SA[s.sa] / F_SLACK) ** 2;
        const beat = P.playing ? `<div class="row"><span>Beat ${P.beat + 1} of 16${TALI[P.beat] ? ` (${TALI[P.beat] === 'X' ? 'sam' : TALI[P.beat] === '0' ? 'khali' : 'tali'})` : ''}</span><b>${BOL_LABEL[TEENTAAL[P.beat]] || ''}</b></div>` : '';
        return compact(`<div class="big">${fmtHz(f)}: ${Math.abs(cc) < 10 ? 'in tune' : cc < 0 ? `${Math.round(-cc)} cents flat` : `${Math.round(cc)} cents sharp`}</div>
          ${beat}
          <div class="row"><span>Tension (vs slack)</span><b>× ${tension(s).toFixed(3)}</b></div>
          <div class="row"><span>Sa ${s.sa} needs</span><b>× ${need.toFixed(3)}, f ∝ √T</b></div>
          <div class="row"><span>Nearest note</span><b>${noteOf(f).name}</b></div>
          <small>One gajra tap changes the tension by 0.5%, about ${(1200 * Math.log2(Math.sqrt(1 + TAP / tension(s)))).toFixed(1)} cents.</small>`, stage);
      },
      dispose() { off(); },
    };
  },
};
