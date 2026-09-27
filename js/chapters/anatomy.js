// Chapter 1: the pair. A wooden dayan and a metal bayan, taken apart layer by layer.
import { THREE, M, exploder } from '../kit.js';
import { makeDrum, makePlayer, tablaKeys, BOL_LABEL, DAYAN, BAYAN, noteOf, fmtHz, compact } from '../tabla.js';

const XD = 1.25, XB = -1.55;

export default {
  id: 'anatomy',
  short: 'The pair',
  title: 'Two drums, one instrument',
  subtitle: 'A wooden dayan for the right hand, a metal bayan for the left.',
  view: { pos: [1.4, 5.2, 8.4], target: [-0.7, 2.1, 0] },
  learn: `<p>A tabla is really <b>two drums</b> played together. The small one on the right is the <b>dayan</b> (“right”). Its shell is carved from one block of hard wood such as <b>sheesham</b> (Indian rosewood) and hollowed out. The big one on the left is the <b>bayan</b> (“left”), a bowl of <b>copper</b>, brass or steel, or sometimes clay.</p>
    <p>The head is called the <b>pudi</b>, and it is made of goatskin in layers. An extra ring of skin round the edge is the <b>kinar</b> (or chanti). The open skin inside it is the <b>maidan</b>. In the middle sits the black <b>syahi</b>: dozens of thin layers of a paste made from <b>iron filings</b>, soot, <b>cooked rice</b> or flour and gum, each one rubbed smooth before the next. On the bayan the syahi sits off to one side.</p>
    <p>The head is laced onto the drum by a braided leather ring, the <b>gajra</b>. Leather straps, the <b>baddhi</b>, run from the gajra down to a ring at the bottom and back up, many times round. On the dayan, eight wooden blocks, the <b>gatta</b>, sit under the straps for tuning. Each drum rests on a cloth <b>cushion ring</b> (chutta or indri) so it can be tilted.</p>
    <p class="tip"><b>Try it:</b> take both drums apart, then turn on the see-through shells. Click the heads to play them: the kinar, the maidan and the syahi each give a different stroke. Or use the keys J K L on the dayan and D S on the bayan, and F for “dha”.</p>`,
  terms: [
    { t: 'Dayan', d: 'The right-hand drum: smaller, with a wooden shell and a clear, tuned pitch.' },
    { t: 'Bayan', d: 'The left-hand drum: a big metal or clay bowl with a deep, bendable boom.' },
    { t: 'Pudi', d: 'The whole drumhead: goatskin layers with the kinar, maidan and syahi.' },
    { t: 'Syahi', d: 'The black spot: many hardened layers of paste with iron filings, soot, rice and gum.' },
    { t: 'Gajra', d: 'The braided leather ring round the edge of the head that the straps pass through.' },
    { t: 'Baddhi and gatta', d: 'The leather straps that pull the head tight, and the wooden blocks under them used to tune it.' },
  ],
  defaults: { explode: 0, xray: false },
  controls: [
    { key: 'explode', type: 'range', label: 'Take them apart', min: 0, max: 1, step: 0.01, ends: ['together', 'apart'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'xray', type: 'toggle', label: 'See-through shells', hint: 'The dayan is hollowed out about two thirds of the way down.' },
    { key: 'play', type: 'buttons', label: 'Play a stroke', items: [
      { label: 'Na', act: (s, inst) => inst.hit('na') },
      { label: 'Tun', act: (s, inst) => inst.hit('tun') },
      { label: 'Ge', act: (s, inst) => inst.hit('ge') },
      { label: 'Dha', act: (s, inst) => inst.hit('dha') },
    ] },
  ],
  quiz: [
    { q: 'Which drum does a tabla player usually play with the right hand?', options: ['The bayan', 'The dayan', 'Both equally', 'Neither, it uses sticks'], answer: 1, why: 'Dayan means “right”. It is the smaller wooden drum with the clear pitch. The bayan (“left”) is the big bass drum.' },
    { q: 'What is the syahi made of?', options: ['Black paint', 'Rubber', 'Many thin layers of paste with iron filings, soot, rice or flour and gum', 'A metal plate'], answer: 2, why: 'The maker builds it up layer by layer, polishing each one. Its weight is what gives the dayan its musical tone.' },
    { q: 'What do the wooden gatta blocks do?', options: ['They are decoration', 'They let the player tune the dayan by changing how tight the straps are', 'They stop the drum rolling', 'They make it louder'], answer: 1, why: 'Hammering a gatta down pulls its pair of straps tighter, which stretches the head and raises its pitch.' },
  ],
  reel: [
    { ms: 5600, caption: 'A tabla is two drums: a wooden dayan for the right hand and a metal bayan for the left.', set: { xray: false, explode: 0 }, act: (s, inst) => inst.hit('dha', true), view: { pos: [0.5, 4.6, 5.4], target: [-0.1, 1.7, 0] }, spin: 0.35 },
    { ms: 5600, caption: 'Each head is goatskin in layers: a rim called the kinar, open skin, and a black syahi in the middle.', set: { xray: true }, anim: { explode: [0, 1] }, view: { pos: [0.5, 5.4, 6.4], target: [-0.1, 2.2, 0] }, spin: 0.3 },
  ],

  build({ stage }) {
    const d = makeDrum('dayan'), b = makeDrum('bayan');
    d.group.position.x = XD; b.group.position.x = XB;
    d.group.rotation.y = 0.4; b.group.rotation.y = -0.3;
    stage.root.add(d.group, b.group);
    stage.pickables.push(...d.zones, ...b.zones);

    // Exploded extras: the head's layers, shown lifted above each drum.
    const layers = (drum, D) => {
      const g = new THREE.Group(); drum.body.add(g); g.position.y = D.H + 0.05; g.visible = false;
      const kin = new THREE.Mesh(new THREE.RingGeometry(D.R * 0.84, D.R + 0.02, 64), M.matte(0xc4a57a, { side: THREE.DoubleSide }));
      kin.rotation.x = -Math.PI / 2; g.add(kin);
      const sy = new THREE.Group(); g.add(sy);
      const off = D.syahiOff || [0, 0];
      for (let i = 0; i < 4; i++) {
        const r = D.R * D.syahiR * (1 - i * 0.2);
        const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.012, 48), M.matte(0x1b1712, { roughness: 0.4 }));
        m.position.set(off[0] * D.R, i * 0.1, off[1] * D.R); sy.add(m);
      }
      return { g, kin, sy };
    };
    const ld = layers(d, DAYAN), lb = layers(b, BAYAN);
    const setExplode = exploder([
      { obj: d.headG, off: [0, 1.4, 0] }, { obj: b.headG, off: [0, 1.4, 0] },
      { obj: ld.g, off: [0, 2.3, 0] }, { obj: lb.g, off: [0, 2.3, 0] },
      { obj: d.straps, off: [0, 0, 0] },
      ...d.gattas.map((g) => ({ obj: g, off: [Math.cos(g.userData.angle) * 0.6, 0, Math.sin(g.userData.angle) * 0.6] })),
      { obj: d.cushion, off: [0, -0.1, 0] },
      { obj: d.body, off: [0, 0.35, 0] }, { obj: b.body, off: [0, 0.35, 0] },
    ]);
    const L = (t, obj, pos, cls) => stage.label(t, pos, obj, cls);
    const labels = [
      L('Dayan: sheesham wood', d.group, [0.3, 1.2, 1.0], 'hot'),
      L('Bayan: copper bowl', b.group, [-0.5, 1.2, 1.4], 'hot'),
      L('Syahi', d.headG, [0, 0.12, 0]),
      L('Gajra', d.headG, [0.95, -0.05, 0]),
      L('Baddhi straps', d.body, [-0.35, 0.8, 0.9]),
      L('Gatta', d.body, [0.95, 1.2, 0.25]),
      L('Cushion ring', b.cushion, [0.9, 0.1, 0.4]),
      L('Kinar', ld.kin, [0.75, 0, 0.1]),
      L('Maidan', d.headG, [0.1, 0.05, 0.5]),
      L('Syahi layers', ld.sy, [0, 0.45, 0]),
    ];
    const whenOut = [labels[7], labels[9], labels[8]];
    const minor = [labels[3], labels[4], labels[6]];
    const P = makePlayer({ dayan: d.head, bayan: b.head });
    const off = tablaKeys(P, { theka: false });
    let lastBol = '';
    P.onBol = (bol) => { lastBol = bol; };
    return {
      hit(bol, quiet = false) { P.hit(bol, { quiet }); },
      pick(o) { if (o.userData.bol) P.hit(o.userData.bol); },
      update(dt, s) {
        dt = Math.max(0, dt);
        P.update(dt);
        setExplode(s.explode);
        const out = s.explode > 0.35;
        ld.g.visible = lb.g.visible = s.explode > 0.05;
        whenOut.forEach((l) => { l.visible = out; });
        labels[2].visible = !out;
        const narrow = stage.host.clientWidth < 560;
        minor.forEach((l) => { l.visible = !narrow; });
        const see = s.xray || s.explode > 0.05;
        [d, b].forEach((x) => { x.shellMat.transparent = see; x.shellMat.opacity = see ? 0.35 : 1; x.shellMat.depthWrite = !see; });
      },
      readout: () => compact(`<div class="big">Dayan and bayan</div>
          <div class="row"><span>Dayan head</span><b>about 14 cm across, tuned to Sa: ${noteOf(P.sa).name}, ${fmtHz(P.sa)}</b></div>
          <div class="row"><span>Bayan head</span><b>about 23 cm across, a boom near ${fmtHz(P.bayanF)}</b></div>
          <div class="row"><span>Tuning blocks (gatta)</span><b>8 on the dayan</b></div>
          ${lastBol ? `<div class="row"><span>Last stroke</span><b>${BOL_LABEL[lastBol]}</b></div>` : '<small>Click the kinar, maidan or syahi to play, or press J K L, D S, F.</small>'}`, stage),
      dispose() { off(); },
    };
  },
};
