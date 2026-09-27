// Chapter 4: the bols. Where a finger lands, and where another finger rests, picks which modes ring.
import { THREE, M, canvasTexture, clamp } from '../kit.js';
import { makeDrum, makePlayer, tablaKeys, marker, onHead, strokeTones, BOLS, COMBO, BOL_LABEL, MODES, TEENTAAL, boardMesh, compact } from '../tabla.js';

const XD = 1.15, XB = -1.5;
const LIST = ['na', 'tin', 'tun', 'te', 'ge', 'ke', 'dha', 'dhin'];

// Loudness of harmonics 1–5 on the dayan, and of the bayan's boom, for one bol.
function spectrum(bol) {
  const h = [0, 0, 0, 0, 0], parts = COMBO[bol] || [bol];
  let bay = 0, damped = false, flat = false;
  parts.forEach((st) => {
    strokeTones(st).forEach((t) => { if (t.drum === 'dayan') h[MODES[t.k].h - 1] += t.a; else if (t.k === 0) bay = t.a * (BOLS[st].flat ? 0.25 : 1); });
    if (BOLS[st].damp) damped = true;
    if (BOLS[st].flat) flat = true;
  });
  const mx = Math.max(...h, 1e-6);
  return { h: h.map((v) => v / Math.max(1, mx)), bay, damped, flat, dayan: parts.some((p) => BOLS[p].hand === 'dayan'), sus: parts.map((p) => BOLS[p].sus) };
}

export default {
  id: 'strokes',
  short: 'The strokes',
  title: 'Where you strike picks the sound',
  subtitle: 'Na, tin, tun, ge, ke and dha: each one wakes different modes.',
  view: { pos: [-0.5, 6.6, 7.2], target: [-0.95, 1.4, 1.0] },
  learn: `<p>Tabla players speak their rhythms as syllables called <b>bols</b>, and each bol is a way of striking. The trick is where one finger <b>strikes</b> and where another <b>rests</b>.</p>
    <p><b>Na</b> (or ta): the index finger flicks the <b>kinar</b> while the ring finger rests lightly on the edge of the syahi. <b>Tin</b>: the same, but struck on the open <b>maidan</b>. <b>Tun</b>: strike the <b>centre</b> and lift away. <b>Te</b>: fingers slap flat onto the syahi and stay, a dry click.</p>
    <p>Why do they sound so different? A resting finger stops the skin moving there. The round modes, which move the whole ring round the syahi, are <b>damped</b> and the fundamental fades. The modes with nodal lines just <b>turn</b> so a line runs under the finger, and keep ringing. So na and tin sound bright, and tun, struck at the centre where only the round modes move, is deep and full.</p>
    <p>On the bayan, <b>ge</b> (or ghe) is an open boom and <b>ke</b> (or ka) is a flat-hand slap that kills it. Play both hands together and you get the big bols: <b>dha = na + ge</b>, and <b>dhin = tin + ge</b>.</p>
    <p class="tip"><b>Try it:</b> pick a bol and watch the markers: orange is where the finger strikes, blue where one rests. Click the heads, or use the keys: J na, K tin, L tun, H te, D ge, S ke, F dha, G dhin. Space plays a theka.</p>`,
  terms: [
    { t: 'Bol', d: 'A spoken syllable for a tabla stroke, like na, tin, dha. Players learn rhythms by saying them.' },
    { t: 'Damping', d: 'Taking energy out of a vibration, here by resting a finger on the skin.' },
    { t: 'Open stroke', d: 'A stroke where the hand lifts off so the skin can ring, like tun or ge.' },
    { t: 'Closed stroke', d: 'A stroke where the hand stays down and stops the ring, like te or ke.' },
    { t: 'Theka', d: 'The basic pattern of bols that marks out a taal, the rhythmic cycle.' },
  ],
  defaults: { bol: 'na' },
  controls: [
    { key: 'bol', type: 'seg', label: 'Bol', options: LIST.map((v) => ({ v, label: BOL_LABEL[v] })) },
    { key: 'go', type: 'buttons', label: 'Play', items: [
      { label: '♪ Strike this bol', act: (s, inst) => inst.hit(s.bol) },
      { label: '▶ Teentaal theka', act: (s, inst) => inst.theka() },
    ] },
  ],
  quiz: [
    { q: 'In “na”, what does the ring finger resting on the syahi’s edge do?', options: ['Makes it louder', 'Damps the round modes, so the fundamental fades and the higher harmonics ring', 'Tunes the drum', 'Nothing'], answer: 1, why: 'The round modes move where the finger rests, so they are damped. Modes with nodal lines turn a line under the finger and keep ringing.' },
    { q: 'Why does “tun”, struck at the very centre, sound deep?', options: ['The centre is thicker', 'At the centre only the round modes move, and the lowest one is strongest', 'It uses the bayan', 'It is played harder'], answer: 1, why: 'Every mode with a nodal line has a node at the centre. A tap there can only start the round modes, led by the fundamental.' },
    { q: 'What is “dha”?', options: ['A bayan stroke alone', 'Na on the dayan and ge on the bayan at the same time', 'A slap with both palms', 'A rest'], answer: 1, why: 'Dha is the two drums together: the ringing na with the bass ge. Dhin is tin with ge.' },
  ],
  reel: [
    { ms: 5000, caption: 'Na: strike the rim while the ring finger rests on the syahi, and the bright upper modes ring.', set: { bol: 'na' }, act: (s, inst) => inst.hit('na', true), view: { pos: [1.5, 6.4, 3.4], target: [1.15, 2.7, 0.3] }, spin: 0 },
    { ms: 5600, caption: 'Dha is both hands at once: na on the dayan and a booming ge on the bayan.', set: { bol: 'dha' }, act: (s, inst) => inst.theka(true), view: { pos: [0.2, 4.8, 4.6], target: [-0.3, 2.0, 0.2] }, spin: 0 },
  ],

  build({ stage }) {
    const d = makeDrum('dayan'), b = makeDrum('bayan');
    d.group.position.x = XD; b.group.position.x = XB;
    stage.root.add(d.group, b.group);
    stage.pickables.push(...d.zones, ...b.zones);
    const mk = { ds: marker(0xffb547), dd: marker(0x7aa2ff), bs: marker(0xffb547, 0.13), bd: marker(0x7aa2ff, 0.13) };
    d.headG.add(mk.ds, mk.dd); b.headG.add(mk.bs, mk.bd);
    // A flat hand for the closed strokes.
    const palm = (w) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, w * 0.7), M.matte(0xd9a07c, { transparent: true, opacity: 0.8 })); m.visible = false; return m; };
    const dp = palm(0.45), bp = palm(0.7); d.headG.add(dp); b.headG.add(bp);
    const lS = stage.label('Strike', [0, 0, 0], d.headG, 'hot'), lD = stage.label('Rests here', [0, 0, 0], d.headG);
    const lBs = stage.label('Strike', [0, 0, 0], b.headG, 'hot');
    const lName = stage.label('', [0, 1.2, 0], d.headG, 'hot');
    // Spectrum board.
    const board = canvasTexture(900, 360, (c, W, H, sp, name) => {
      c.clearRect(0, 0, W, H); c.fillStyle = 'rgba(7,8,12,.86)'; c.fillRect(0, 0, W, H);
      if (!sp) return;
      c.fillStyle = 'rgba(255,255,255,.85)'; c.font = '28px sans-serif'; c.fillText(`${name}: which harmonics ring`, 26, 42);
      const lab = ['1st', '2nd', '3rd', '4th', '5th'], x0 = 60, bw = 110, yb = H - 60, top = 80;
      for (let i = 0; i < 5; i++) {
        const v = sp.dayan ? sp.h[i] : 0, hh = Math.max(3, (yb - top) * clamp(v, 0, 1));
        c.fillStyle = i === 0 && sp.damped && sp.dayan ? 'rgba(122,162,255,.9)' : '#ffb547';
        c.fillRect(x0 + i * bw, yb - hh, 70, hh);
        c.fillStyle = 'rgba(255,255,255,.75)'; c.font = '20px sans-serif'; c.fillText(lab[i], x0 + i * bw + 14, yb + 28);
      }
      c.fillStyle = 'rgba(255,255,255,.55)'; c.font = '18px sans-serif'; c.fillText('dayan harmonics', x0 + 150, yb + 52);
      const hb = Math.max(3, (yb - top) * clamp(sp.bay, 0, 1));
      c.fillStyle = sp.flat && sp.bay > 0 ? 'rgba(122,162,255,.9)' : '#5ce1a9'; c.fillRect(x0 + 5 * bw + 60, yb - hb, 90, hb);
      c.fillStyle = 'rgba(255,255,255,.75)'; c.font = '20px sans-serif'; c.fillText('bayan boom', x0 + 5 * bw + 45, yb + 28);
      if (sp.damped && sp.dayan) { c.fillStyle = 'rgba(122,162,255,.95)'; c.font = '19px sans-serif'; c.fillText('blue: damped by the resting finger', W - 330, 42); }
      if (sp.flat) { c.fillStyle = 'rgba(122,162,255,.95)'; c.font = '19px sans-serif'; c.fillText('closed stroke: dies in a flash', W - 300, 42); }
    });
    const bm = boardMesh(board, 4.4, 1.76); bm.scale.setScalar(0.7); bm.position.set(-0.3, 0.3, 2.7); bm.rotation.x = -0.75; stage.root.add(bm);

    const P = makePlayer({ dayan: d.head, bayan: b.head });
    const off = tablaKeys(P);
    let shownBol = '', beatBol = '', t = 0;
    P.onBol = (bol) => { beatBol = bol; };
    const S = { get: null };
    return {
      hit(bol, quiet = false) { P.play(false); if (S.get) S.get.bol = bol; P.hit(bol, { quiet }); },
      theka(force) { P.bpm = 100; P.play(force === true ? true : !P.playing); },
      pick(o) { if (o.userData.bol) { if (S.get) S.get.bol = o.userData.bol; P.hit(o.userData.bol); } },
      update(dt, s) {
        dt = Math.max(0, dt); S.get = s; t += dt;
        P.update(dt);
        const bol = P.playing ? beatBol || s.bol : (P.lastT < 0.6 && beatBol ? beatBol : s.bol);
        const parts = COMBO[bol] || [bol];
        const dSt = parts.find((p) => BOLS[p].hand === 'dayan'), bSt = parts.find((p) => BOLS[p].hand === 'bayan');
        // Dayan markers.
        const D = d.D, B = b.D;
        [mk.ds, mk.dd, dp, lS, lD].forEach((o) => { o.visible = false; });
        if (dSt) {
          const st = BOLS[dSt];
          if (st.flat) { dp.visible = true; onHead(dp, D.R, st.strike.r, st.strike.th, 0.06 + 0.1 * (P.flash[dSt] || 0)); }
          else {
            mk.ds.visible = lS.visible = true; onHead(mk.ds, D.R, st.strike.r, st.strike.th); mk.ds.tip.position.y = 0.18 + 0.25 * (1 - (P.flash[dSt] || 0));
            onHead(lS, D.R, st.strike.r * 1.25, st.strike.th, 0.35);
            if (st.damp) { mk.dd.visible = lD.visible = true; onHead(mk.dd, D.R, st.damp.r, st.damp.th); onHead(lD, D.R, st.damp.r, st.damp.th + 0.4, 0.3); }
          }
        }
        [mk.bs, mk.bd, bp, lBs].forEach((o) => { o.visible = false; });
        if (bSt) {
          const st = BOLS[bSt];
          if (st.flat) { bp.visible = true; onHead(bp, B.R, st.strike.r, st.strike.th, 0.07 + 0.12 * (P.flash[bSt] || 0)); }
          else { mk.bs.visible = lBs.visible = true; onHead(mk.bs, B.R, st.strike.r, st.strike.th); mk.bs.tip.position.y = 0.2 + 0.3 * (1 - (P.flash[bSt] || 0)); onHead(lBs, B.R, st.strike.r, st.strike.th, 0.45); }
        }
        const narrow = stage.host.clientWidth < 560;
        lD.visible = lD.visible && !narrow;
        lName.element.textContent = BOL_LABEL[bol];
        lName.visible = P.playing;
        if (bol !== shownBol) { shownBol = bol; board.redraw(spectrum(bol), BOL_LABEL[bol]); }
      },
      readout: (s) => {
        const bol = P.playing ? beatBol : s.bol, parts = COMBO[bol] || [bol], sp = spectrum(bol);
        const top = sp.h.map((v, i) => [v, i + 1]).filter(([v]) => v > 0.55).map(([, i]) => i);
        const how = parts.map((p) => BOLS[p].how).join(' ');
        if (P.playing) return compact(`<div class="big">Teentaal: beat ${P.beat + 1} of 16, ${BOL_LABEL[bol]}</div>
          <div class="row"><span>Tempo</span><b>${P.bpm} beats a minute</b></div>
          <div class="row"><span>Next</span><b>${TEENTAAL.slice(P.beat + 1, P.beat + 5).map((x) => BOL_LABEL[x]).join(' ')}</b></div>
          <small>Press Space or the button again to stop.</small>`, stage);
        return compact(`<div class="big">${BOL_LABEL[bol]}${parts.length > 1 ? ` = ${parts.map((p) => BOLS[p].name.split(' ')[0]).join(' + ')}` : ''}</div>
          ${sp.dayan ? `<div class="row"><span>Strongest dayan harmonics</span><b>${sp.flat ? 'none ring: closed stroke' : top.join(', ')}</b></div>` : ''}
          ${sp.dayan ? `<div class="row"><span>Fundamental</span><b>${sp.flat ? 'stopped' : sp.damped ? 'damped by the ring finger' : 'rings strongly'}</b></div>` : ''}
          ${sp.bay > 0 ? `<div class="row"><span>Bayan</span><b>${sp.flat ? 'slapped flat: a dull knock' : 'open boom'}</b></div>` : ''}
          <small>${how}</small>`, stage);
      },
      dispose() { off(); },
    };
  },
};
