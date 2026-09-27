// Chapter 3: C. V. Raman's discovery. The heavy syahi in the middle of the dayan pulls the head's
// modes into a near-harmonic series 1 : 2 : 3 : 4 : 5, which is why the dayan has a clear pitch.
import { THREE, M, torus } from '../kit.js';
import { MODES, ratio, makeMembrane, makePlayer, ratioBoard, boardMesh, sound, strokeTones, SA, noteOf, fmtHz, compact } from '../tabla.js';

const R = 2.0, Y = 1.25;
const REP = [0, 0, 1, 2, 4, 6];                 // a mode that shows each harmonic 1–5

export default {
  id: 'syahi',
  short: 'Raman’s syahi',
  title: 'The black spot that makes a note',
  subtitle: 'C. V. Raman showed how the syahi turns a thud into a tone.',
  view: { pos: [0.3, 5.9, 8.4], target: [-0.3, 0.9, 1.3] },
  learn: `<p>Most drums give a thud. The dayan gives a <b>note</b> you can sing, and it is tuned to the song's home note, <b>Sa</b>. In 1920 <b>C. V. Raman</b>, with Sivakali Kumar, showed why in the journal <i>Nature</i>, and in 1934 he explained it in full in the <i>Proceedings of the Indian Academy of Sciences</i>.</p>
    <p>The secret is the <b>syahi</b>. It adds a lot of <b>mass</b> in the middle of the skin, and it is thickest at the centre. The heavy centre slows down the modes that move it most, and leaves others alone. With the right weight and taper, the first nine modes crowd into five groups at <b>1 : 2 : 3 : 4 : 5</b>: a proper <b>harmonic series</b>, just like a string's.</p>
    <p>Raman matched each harmonic to its modes: (0,1) gives the first; (1,1) the second; (2,1) and (0,2) the third; (3,1) and (1,2) the fourth; and (4,1), (2,2) and (0,3) the fifth. The maker builds the syahi layer by layer and <b>listens</b>, rubbing and adding until the tone rings true.</p>
    <p class="tip"><b>Try it:</b> slide the syahi from nothing to finished and watch the orange bars snap onto the green lines. Then flip “Remove the syahi” and strike: the note turns back into a thud.</p>`,
  terms: [
    { t: 'Loaded membrane', d: 'A drumhead with extra mass added, like the syahi, which moves its modes.' },
    { t: 'Harmonic series', d: 'Overtones at 2, 3, 4, 5 times the lowest frequency. Our ears hear them as one clear note.' },
    { t: 'Degenerate modes', d: 'Different modes that end up at the same frequency, like (2,1) and (0,2) on the dayan.' },
    { t: 'Sa', d: 'The home note of Indian music. The dayan is tuned to it.' },
    { t: 'C. V. Raman', d: 'Indian physicist (1888–1970) who explained the tabla and mridangam, and won the 1930 Nobel Prize for the Raman effect.' },
  ],
  defaults: { load: 1, bare: false, harm: 2 },
  onChange(s, key) { if (key === 'bare' && !s.bare && s.load < 0.05) s.load = 1; },
  controls: [
    { key: 'load', type: 'range', label: 'How much syahi', min: 0, max: 1, step: 0.01, ends: ['none', 'finished'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'bare', type: 'toggle', label: 'Remove the syahi', hint: 'Same skin, same tuning of the lowest mode, no black spot.' },
    { key: 'harm', type: 'seg', label: 'Show the mode for harmonic', options: [1, 2, 3, 4, 5].map((v) => ({ v, label: String(v) })) },
    { key: 'hear', type: 'buttons', label: 'Hear it', items: [
      { label: '♪ Tun (centre)', act: (s, inst) => inst.hit('tun') },
      { label: '♪ Tin (open skin)', act: (s, inst) => inst.hit('tin') },
      { label: '♪ With, then without', act: (s, inst) => inst.compare() },
    ] },
  ],
  quiz: [
    { q: 'What did C. V. Raman show about the dayan?', options: ['That its shell makes the note', 'That the syahi’s mass makes its overtones nearly harmonic, 1 : 2 : 3 : 4 : 5', 'That it has no overtones', 'That goatskin is magnetic'], answer: 1, why: 'The loaded centre shifts the modes so they bunch into five groups at whole-number ratios, which our ears hear as a clear pitch.' },
    { q: 'Which two modes join to make the dayan’s third harmonic?', options: ['(0,1) and (1,1)', '(2,1) and (0,2)', '(4,1) and (0,3)', '(1,2) and (3,1)'], answer: 1, why: 'On a plain skin they sit at 2.14 and 2.30. The syahi pulls them both to about 3 times the lowest mode.' },
    { q: 'Why does the syahi need iron filings?', options: ['For the colour', 'They are heavy, adding mass in a thin, stiff layer', 'To make it magnetic', 'To stop it drying'], answer: 1, why: 'Iron is dense, so a thin layer adds a lot of weight without making the skin thick and dead.' },
  ],
  reel: [
    { ms: 5600, caption: 'C. V. Raman showed why the dayan sings: its black syahi adds weight to the middle.', set: { bare: false, harm: 3 }, anim: { load: [0, 1] }, view: { pos: [0.4, 6.2, 7.6], target: [0.2, 0.9, 1.3] }, spin: 0 },
    { ms: 5000, caption: 'The weight pulls the overtones into line at 1, 2, 3, 4, 5: a real musical note.', set: { bare: false, load: 1, harm: 2 }, act: (s, inst) => inst.hit('tin', true), view: { pos: [1.2, 5.4, 5.2], target: [0.9, 1.1, 0.4] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); root.position.x = 0.9; stage.root.add(root);
    const withS = makeMembrane(R, { syahiR: 0.44, nr: 36, ns: 96, amp: 0.3, dome: 0.06, slow: 0.9 });
    const without = makeMembrane(R, { syahiR: 0, nr: 36, ns: 96, amp: 0.3, slow: 0.9 });
    [withS, without].forEach((m) => { m.mesh.position.y = Y; root.add(m.mesh); });
    const rim = torus(R + 0.06, 0.08, M.matte(0x5a3a24), 96); rim.rotation.x = Math.PI / 2; rim.position.y = Y; root.add(rim);
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.06, R * 1.1, Y, 64, 1, true), M.clear(0xe0b890, 0.14)); shell.position.y = Y / 2; root.add(shell);
    const board = ratioBoard(900, 380);
    const bm = boardMesh(board, 4.6, 1.94); bm.scale.setScalar(0.85); bm.position.set(-1.3, 0.9, R + 1.6); bm.rotation.x = -0.55; root.add(bm);
    const lSy = stage.label('Syahi', [0, Y + 0.35, 0], root, 'hot');
    const lMode = stage.label('', [0, Y + 0.7, -R - 0.2], root);
    const P = makePlayer({ dayan: withS }); P.lastT = 10;
    let holding = -1, holdKey = '', timer = null;
    const cur = (s) => (s.bare ? 0 : s.load);
    return {
      hit(bol, quiet = false) { holding = -1; holdKey = ''; P.heads.dayan.clear(); P.hit(bol, { quiet }); },
      compare() {
        const s = this._s;
        const a = strokeTones('tin', { load: 1 }), b = strokeTones('tin', { load: 0 });
        sound(a, { click: 0.3 }); clearTimeout(timer); timer = setTimeout(() => sound(b, { click: 0.3 }), 1100);
        holding = -1; holdKey = ''; P.heads.dayan.clear(); P.hit('tin', { quiet: true });
      },
      update(dt, s) {
        dt = Math.max(0, dt); this._s = s;
        const load = cur(s), head = s.bare ? without : withS;
        if (withS.mesh.visible === s.bare) holdKey = '';
        withS.mesh.visible = !s.bare; without.mesh.visible = s.bare;
        withS.heavy = load;
        P.heads.dayan = head; P.load = load;
        lSy.visible = !s.bare && load > 0.05;
        const k = REP[s.harm], key = `${s.harm}|${load.toFixed(2)}|${s.bare}`;
        if (P.lastT > 1.6 && key !== holdKey) {
          const [h0, , b0] = holdKey.split('|');
          const same = holding === k && h0 === String(s.harm) && b0 === String(s.bare) && head.live.length;
          holdKey = key;
          if (same) head.retune(ratio(k, load)); else { holding = k; head.hold(k, 1, 0.3, ratio(k, load)); }
        }
        P.update(dt);
        (s.bare ? withS : without).update(dt);
        const d = MODES[k];
        lMode.element.textContent = holding >= 0 ? `Mode (${d.m},${d.n}) → ${ratio(k, load).toFixed(2)} × the lowest` : 'Struck: many modes at once';
        board.update({ title: load > 0.95 ? 'With the syahi: overtones at 1, 2, 3, 4, 5' : load < 0.05 ? 'No syahi: overtones out of line' : 'Adding the syahi, layer by layer', note: 'Green dashes: harmonics. Orange: the nine lowest modes.', harm: true,
          items: MODES.map((m, i) => ({ r: ratio(i, load), a: 0.95 - i * 0.07, label: '', on: i === k })) });
      },
      readout: (s) => {
        const load = cur(s), rs = MODES.map((_, i) => ratio(i, load));
        const groups = [1, 2, 3, 4, 5].map((h) => MODES.map((m, i) => (m.h === h ? rs[i] : null)).filter((x) => x !== null));
        const worst = Math.max(...groups.flatMap((g, i) => g.map((r) => Math.abs(r / (i + 1) - 1))));
        return compact(`<div class="big">${worst < 0.03 ? 'A clear note' : worst < 0.12 ? 'Nearly a note' : 'A thud'}: ${(worst * 100).toFixed(0)}% off harmonic</div>
          <div class="row"><span>Harmonic 2 from (1,1)</span><b>${rs[1].toFixed(2)} ×</b></div>
          <div class="row"><span>Harmonic 3 from (2,1) and (0,2)</span><b>${rs[2].toFixed(2)}, ${rs[3].toFixed(2)} ×</b></div>
          <div class="row"><span>Harmonic 4 from (3,1) and (1,2)</span><b>${rs[4].toFixed(2)}, ${rs[5].toFixed(2)} ×</b></div>
          <div class="row"><span>Harmonic 5 from (4,1), (2,2), (0,3)</span><b>${rs[6].toFixed(2)}, ${rs[7].toFixed(2)}, ${rs[8].toFixed(2)} ×</b></div>
          <div class="row"><span>Tuned to Sa</span><b>${noteOf(SA['C♯']).name}, ${fmtHz(SA['C♯'])}</b></div>
          <small>End points: Bessel zeros for the bare skin, Raman’s near-harmonic ratios for a finished dayan. In between is a simple blend.</small>`, stage);
      },
      dispose() { clearTimeout(timer); },
    };
  },
};
