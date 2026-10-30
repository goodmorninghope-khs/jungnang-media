/* 중랑정책미디어 · JUNGNANG SIGNAL × 아궁이
   진열: Aside 통합 데스크 / 원본 제작실: GPT 사이트(실시간 연동) / 원장: GitHub jungnang-signal */
'use strict';
window.DESK_ALIAS = window.DESK_ALIAS || {}; // 편집국 직송판 id → 제작실 판 id (같은 지면·날짜)

const PM = 'https://jungnang-policy-media.goodmorninghope.chatgpt.site';
const AA = 'https://jungnang-agungi-archive.goodmorninghope.chatgpt.site';
const SNAP = window.SNAP || { signal: [], aa: [], ledger: { items: [], ax2030_legend: {} } };
const AXL = SNAP.ledger.ax2030_legend || {};
const LOCAL_RE = /중랑|면목|상봉|망우|사가정|묵동|신내|중화동|용마|먹골/;

let signal = [], aa = [], ledger = SNAP.ledger.items || [], live = { signal: false, aa: false };
const state = { date: null, chokSeries: '전체', chokSrc: '전체', chokQ: '', qAx: '전체', shelfSeries: '전체', shelfQ: '' };

const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nd = d => (d || '').replace(/\./g, '-').slice(0, 10);
const fmt = d => d ? d.replace(/-/g, '.') : '';
const abs = (base, p) => !p ? '' : /^https?:/.test(p) ? p : base + '/' + p.replace(/^\.?\//, '');
const WD = ['일', '월', '화', '수', '목', '금', '토'];
const wd = d => WD[new Date(d + 'T12:00:00+09:00').getDay()];

const _ta = document.createElement('textarea');
function plain(html) { let s = String(html || '').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' '); for (let k = 0; k < 2 && /&(#x?[0-9a-f]+|[a-z]+);/i.test(s); k++) { _ta.innerHTML = s; s = _ta.value; } return s.replace(/\s+/g, ' ').trim(); }
function questionOf(it) {
  const m = plain(it.body).match(/(?:WEEKLY BIG Q|PEOPLE Q|JUNGNANG Q|BIG Q|함께 살필 질문|오늘의 질문)\s*[:|]?\s*["“]?([^?]{10,280}\?)/i);
  return m ? m[1].replace(/^[*·\-\s]+/, '').trim() : '';
}
function volOf(it) {
  const m = plain(it.body).slice(0, 600).match(/제\s?(\d+)\s?호\s*·\s*Vol\.?\s?(\d+)/i) || plain(it.body).slice(0, 600).match(/Vol\.?\s?(\d+)/i);
  return m ? 'Vol.' + (m[2] || m[1]) : '';
}
const NEWS = /(chosun|joongang|donga|hani|khan|yna|yonhap|newsis|news1|nocutnews|ohmynews|pressian|sedaily|etnews|zdnet|ytn|kbs|imbc|sbs|jtbc|munhwa|segye|kmib|hankookilbo|hankyung|mk\.co|mt\.co|edaily|asiae|fnnews|heraldcorp|newspim|dailian|inews24|bloter|aitimes|digitaltoday|ddaily|boannews|naver|daum|youtube|youtu\.be|seoul\.co\.kr|kyeonggi|mediatoday|sisain|hankyoreh|biz\.chosun|kukinews|ajunews|newstapa|wikitree|insight|tistory|brunch|medium\.com|substack|linkedin|facebook|x\.com|twitter)/i;
function srcTypes(it) {
  const hosts = [...String(it.body || '').matchAll(/href="(https?:\/\/[^"]+)"/g)].map(m => { try { return new URL(m[1]).hostname.toLowerCase(); } catch { return ''; } }).filter(Boolean);
  const c = { 해외: 0, 국내연구: 0, 정부: 0, 언론: 0 };
  for (const h of hosts) {
    if (/goodmorninghope|chatgpt\.site|vercel\.app|github/.test(h)) continue;
    if (NEWS.test(h)) c.언론++;
    else if (/\.re\.kr$|kdi|krihs|kipa|krila|kihasa|nia\.or\.kr|stepi|kiep|kli\.re|nars\.go\.kr|nabo\.go\.kr|si\.re\.kr|seoulsolution/.test(h)) c.국내연구++;
    else if (/\.go\.kr$|korea\.kr$|\.or\.kr$|kosis\.kr|\.seoul\.kr$/.test(h)) c.정부++;
    else if (/\.kr$/.test(h)) c.언론++;
    else c.해외++;
  }
  return Object.entries(c).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ k, n }));
}
const isLocal = it => LOCAL_RE.test(it.title || '');
const isPub = it => !['제작 기록'].includes(it.series);

function enrich(list) {
  const axMap = {};
  for (const l of ledger) if (l.id && l.id.startsWith('site:')) axMap[l.id.slice(5)] = l.ax2030 || [];
  return list.map(it => {
    const d = nd(it.date);
    return Object.assign({}, it, {
      d, vol: volOf(it), q: questionOf(it), src: srcTypes(it), local: isLocal(it), ax: axMap[it.id] || [],
      img: (it.images && it.images[0]) ? abs(PM, it.images[0]) : (it.thumb ? abs(PM, it.thumb) : '')
    });
  }).sort((a, b) => (b.d || '0').localeCompare(a.d || '0'));
}

async function loadLive() {
  try {
    const r = await fetch('/feed/signal.json', { cache: 'no-store' });
    if (r.ok) { const j = await r.json(); if (Array.isArray(j) && j.length) { signal = enrich(j); live.signal = true; } }
  } catch (e) { }
  /* 편집국 직송판: Claude 편집국이 새벽에 올린 판(data/editions.json)을 제작실 반영 전에 먼저 진열한다. 같은 지면·날짜가 제작실에 들어오면 제작실 판을 쓴다. */
  try {
    const r = await fetch('/data/editions.json', { cache: 'no-store' });
    if (r.ok) {
      const j = await r.json(); const desk = Array.isArray(j) ? j : (j.items || []);
      const key = it => (it.series || '') + '|' + nd(it.date);
      const have = new Set(signal.map(key));
      for (const it of desk) { if (it && it.id && have.has(key(it))) { const hit = signal.find(x => key(x) === key(it)); if (hit && hit.id !== it.id) window.DESK_ALIAS[it.id] = hit.id; } }
      const add = desk.filter(it => it && it.series && it.date && !have.has(key(it)));
      if (add.length) { signal = enrich(add).concat(signal).sort((a, b) => (b.d || '0').localeCompare(a.d || '0')); live.signal = true; live.desk = add.length; }
    }
  } catch (e) { }
  try {
    const r = await fetch('/feed/aa/catalog.js', { cache: 'no-store' });
    if (r.ok) { const t = await r.text(); const m = t.match(/const records\s*=\s*(\[[\s\S]*?\]);\s*(?:const|let|var|function|window|$)/); if (m) { const j = JSON.parse(m[1]); if (j.length) { aa = j; live.aa = true; } } }
  } catch (e) { }
}

/* ---------- 공통 조각 ---------- */
const PREVIEW = { '2026-10-29': '창간 예비호 ①', '2026-10-30': '창간 예비호 ②', '2026-11-02': '창간 예비호 ③', '2026-11-03': '창간 예비호 ④', '2026-11-04': '창간 예비호 ⑤', '2026-11-05': '창간 예비호 ⑥', '2026-11-06': '창간 예비호 ⑦', '2026-11-09': '창간 예비호 ⑧', '2026-11-10': '창간 예비호 ⑨', '2026-11-11': '창간호' };
const special = it => it.series === 'MORNING' && PREVIEW[it.d] ? PREVIEW[it.d] : '';
const seriesLabel = it => ['두부', '제작 기록', '공공AX 파일럿', 'PEOPLE'].includes(it.series) ? it.series : it.series + ' SIGNAL';
const role = it => it.series === 'WEEKLY' ? '침' : '촉';
function tags(it, opt = {}) {
  let h = '';
  for (const s of it.src.slice(0, 2)) h += `<span class="tag src-${s.k}" title="본문 출처 링크 ${s.n}건">${s.k === '국내연구' ? '국내 연구' : s.k === '정부' ? '정부·공공' : s.k}</span>`;
  if (it.local && opt.local !== false) h += `<span class="tag local" title="제목에 중랑 지명">중랑 현안</span>`;
  for (const a of it.ax) h += `<span class="tag ax" title="${esc(AXL[a] || '')}">AX ${a}</span>`;
  return h;
}
function card(it) {
  return `<article class="card">
    ${it.img ? `<a href="#/read/${encodeURIComponent(it.id)}"><img loading="lazy" src="${esc(it.img)}" alt=""></a>` : ''}
    <span class="series">${esc(seriesLabel(it))}${it.vol ? ' · ' + it.vol : ''}${special(it) ? ' · ' + special(it) : ''} · ${role(it)}</span>
    <h4><a href="#/read/${encodeURIComponent(it.id)}">${esc(it.title)}</a></h4>
    <div class="meta">${it.d ? fmt(it.d) + ' (' + wd(it.d) + ')' : '발행일 원본 참조'}${it.topic ? ' · ' + esc(it.topic) : ''}</div>
    <div>${tags(it)}</div>
    ${it.desc ? `<p>${esc(it.desc)}</p>` : ''}
    ${it.q ? `<div class="q">Q. ${esc(it.q)}</div>` : ''}
  </article>`;
}
function setNav(r) { document.querySelectorAll('#nav a[data-r]').forEach(a => a.classList.toggle('on', a.dataset.r === r)); }
function openModal(html) { $('#modalInner').innerHTML = `<button class="close" onclick="closeModal()">닫기 ×</button>` + html; $('#modal').hidden = false; }
function closeModal() { $('#modal').hidden = true; $('#modalInner').innerHTML = ''; }
window.closeModal = closeModal;
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });

/* ---------- 오늘 ---------- */
function weekRange(d) { const t = new Date(d + 'T12:00:00+09:00'); const mon = new Date(t); mon.setDate(t.getDate() - ((t.getDay() + 6) % 7)); const sun = new Date(mon); sun.setDate(mon.getDate() + 6); const f = x => x.toISOString().slice(0, 10); return [f(mon), f(sun)]; }
function gauge(list) {
  const pick = list.filter(it => ['MORNING', 'WEEKLY'].includes(it.series) && it.d).slice(0, 10);
  const loc = pick.filter(i => i.local).length, ext = pick.length - loc;
  const pe = pick.length ? Math.round(ext / pick.length * 100) : 0;
  return `<div class="note"><b>편집 계기판</b> · 최근 MORNING·WEEKLY ${pick.length}건의 머리기사: 외부 ${ext} : 중랑 현안 ${loc} (목표 8 : 2)
    <div class="gauge"><span style="width:${pe}%;background:var(--navy)">외부 ${pe}%</span><span style="width:${100 - pe}%;background:var(--red)">${100 - pe ? '중랑 ' + (100 - pe) + '%' : ''}</span></div>
    <span class="muted" style="font-size:12px">제목에 중랑 지명이 들어간 호를 '중랑 현안'으로 셉니다. 통합 데스크가 매주 점검합니다.</span></div>`;
}
function viewToday() {
  setNav('');
  const pubs = signal.filter(isPub);
  const dates = [...new Set(pubs.map(i => i.d).filter(Boolean))].sort().reverse();
  if (!state.date || !dates.includes(state.date)) state.date = dates[0];
  const i = dates.indexOf(state.date);
  const day = pubs.filter(x => x.d === state.date);
  const lead = day.find(x => x.series === 'MORNING') || day[0];
  const others = day.filter(x => x !== lead);
  const weekly = pubs.filter(x => x.series === 'WEEKLY' && x.d && x.d <= state.date)[0];
  const q = (lead && lead.q) || (day.find(x => x.q) || {}).q || '';
  const [ws, we] = weekRange(state.date);
  const week = pubs.filter(x => x.d >= ws && x.d <= we && !day.includes(x));
  const before = new Date() < new Date('2026-11-11T00:00:00+09:00');
  $('#main').innerHTML = `
  <div class="founding-banner"><div><span class="eyebrow">${before ? 'D-' + Math.ceil((new Date('2026-11-11T00:00:00+09:00') - new Date()) / 864e5) + ' · 창간 예비호 파일럿 (10/29 ① ~ 11/10 ⑨, 평일)' : '창간 2026.11.11'}</span><br><b>중랑정책미디어 창간호 · 2026년 11월 11일(수) MORNING Vol.34</b><br><span class="muted">시그널과 아궁이가 한 지붕 아래로. 머리는 밖에서, 처방은 중랑에 · 외부 8 : 중랑 2</span></div><a class="btn" href="#/founding">창간사와 편집헌장 읽기 →</a></div>
  <div class="edition">
    <button ${i >= dates.length - 1 ? 'disabled' : ''} onclick="goDate(1)">← 이전 판</button>
    <div class="mid"><span class="eyebrow">TODAY'S EDITION</span><b>${fmt(state.date)} (${wd(state.date)}) 판</b><span class="meta">${day.length}개 발행 기록 · ${live.signal ? '제작실 실시간 연동' : '10/28 스냅샷'}</span></div>
    <button ${i <= 0 ? 'disabled' : ''} onclick="goDate(-1)">다음 판 →</button>
  </div>
  <section class="front">
    <div class="lead">
      ${lead ? `<span class="eyebrow">${esc(seriesLabel(lead))}${lead.vol ? ' · ' + lead.vol : ''}${special(lead) ? ' · ' + special(lead) : ''} · 오늘의 촉</span>
      <h1><a href="#/read/${encodeURIComponent(lead.id)}">${esc(lead.title)}</a></h1>
      <p class="dek">${esc(lead.desc || '')}</p>
      <div>${tags(lead)}</div>
      <div class="meta">${fmt(lead.d)} 발행${lead.topic ? ' · ' + esc(lead.topic) : ''}${lead.edition ? ' · ' + esc(lead.edition) : ''}</div>
      <p style="margin-top:12px"><a class="btn" href="#/read/${encodeURIComponent(lead.id)}">본문과 출처 읽기</a></p>` : '<p>이 날의 발행 기록이 없습니다.</p>'}
    </div>
    <div class="col">
      ${weekly ? `<span class="eyebrow">이번 주 침 · WEEKLY${weekly.vol ? ' ' + weekly.vol : ''}</span>
      <h3><a href="#/read/${encodeURIComponent(weekly.id)}">${esc(weekly.title)}</a></h3>
      <div class="meta">${fmt(weekly.d)} · 국장회의 의제</div><div>${tags(weekly)}</div>` : ''}
      ${others.filter(x => x !== weekly).map(x => `<hr style="border:0;border-top:1px solid var(--line)"><span class="eyebrow">같은 날 ${esc(seriesLabel(x))}</span><h3 style="font-size:17px"><a href="#/read/${encodeURIComponent(x.id)}">${esc(x.title)}</a></h3>`).join('')}
    </div>
    <aside class="qpanel">
      <span class="eyebrow">JUNGNANG Q · 오늘의 질문</span>
      <div class="q">${esc(q || '오늘은 질문 하나를 남겨 두지 않았습니다.')}</div>
      <p>답을 서둘러 만들기보다, 밖의 사례에 비추어 중랑이 물어야 할 것을 남깁니다.</p>
      <p><a href="#/q">질문 서가 전체 →</a></p>
      <hr style="border:0;border-top:1px solid rgba(255,255,255,.25)">
      <span class="eyebrow">편집의 기준</span>
      <p>머리는 밖에서 · 사실·해석·제안 구분 · 정정과 이전 판 보존 · 침은 의견이며 결정이 아님</p>
    </aside>
  </section>
  <h2 class="sec">이번 주의 촉과 침 <span class="en">${fmt(ws)} – ${fmt(we).slice(5)}</span></h2>
  <div class="grid">${week.map(card).join('') || '<p class="muted">이 주의 다른 발행물이 없습니다.</p>'}</div>
  <h2 class="sec">촉 레이더 <span class="en">GPT 후보 → CLAUDE 확인</span></h2>
  <div id="chokRadar" class="note">이 날의 GPT 촉 후보를 불러오는 중…</div>
  <h2 class="sec">계기판 <span class="en">EDITORIAL GAUGE</span></h2>
  ${gauge(pubs)}`;
  loadChok(i === 0 ? todayKST() : state.date, i === 0 ? state.date : null);
}
function todayKST() { return new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10); }
async function loadChok(d, fallback) {
  const box = document.getElementById('chokRadar'); if (!box) return;
  try {
    let r = await fetch('/feed/chok/CHOK-' + d.replace(/-/g, '') + '.md', { cache: 'no-store' });
    if (!r.ok && fallback && fallback !== d) { d = fallback; r = await fetch('/feed/chok/CHOK-' + d.replace(/-/g, '') + '.md', { cache: 'no-store' }); }
    if (!r.ok) throw 0;
    const t = await r.text();
    const cands = [...t.matchAll(/^###\s*(.+)$/gm)].map(m => m[1].replace(/\*\*/g, ''));
    const urls = [...t.matchAll(/https?:\/\/[^\s)>\]]+/g)].map(m => m[0]);
    box.innerHTML = '<b>' + fmt(d) + '(' + wd(d) + ') GPT 촉 레이더 후보 ' + cands.length + '건</b> · Claude 편집국이 원문을 확인해 고릅니다.<ul style="margin:6px 0 0;padding-left:18px">' + cands.map(c => '<li>' + esc(c) + '</li>').join('') + '</ul><span class="muted" style="font-size:12px">원문 링크 ' + urls.length + '개 · 원장: jungnang-signal/inbox/chok/CHOK-' + d.replace(/-/g, '') + '.md</span>';
  } catch (e) { box.innerHTML = '<span class="muted">이 날의 GPT 촉 후보 파일이 없습니다(창간 기획단 운영은 2026-10-29부터).</span>'; }
}
window.goDate = step => { const dates = [...new Set(signal.filter(isPub).map(i => i.d).filter(Boolean))].sort().reverse(); const i = dates.indexOf(state.date) + step; if (dates[i]) { state.date = dates[i]; viewToday(); } };

/* ---------- 촉 ---------- */
function viewChok() {
  setNav('chok');
  const SER = ['전체', 'MORNING', 'WEEKLY AX', 'ISSUE', '두부', 'PEOPLE', '공공AX 파일럿'];
  const SRC = ['전체', '해외', '국내연구', '정부', '언론'];
  const kw = state.chokQ.trim().toLowerCase();
  const list = signal.filter(isPub).filter(x => x.series !== 'WEEKLY')
    .filter(x => state.chokSeries === '전체' || x.series === state.chokSeries)
    .filter(x => state.chokSrc === '전체' || x.src.some(s => s.k === state.chokSrc))
    .filter(x => !kw || (x.title + ' ' + x.desc + ' ' + x.topic + ' ' + plain(x.body)).toLowerCase().includes(kw));
  $('#main').innerHTML = `
  <h2 class="sec">촉 · SIGNAL <span class="en">OUTSIDE IN</span></h2>
  <p class="secDesc">국내외 기사·연구보고서·정부 원문·다른 도시의 실행에서 신호와 잡음을 가려 읽습니다. 출처 배지는 본문 원문 링크를 바탕으로 자동 표시합니다.</p>
  <div class="room">
    <div><b>MORNING</b>평일 07:00 · 외부 신호 2~3개와 중랑 Q 하나</div>
    <div><b>WEEKLY AX</b>월 09:00 · 공공 AX 국내외 동향과 AX2030 설계 근거</div>
    <div><b>두부 · PEOPLE</b>화 06:00 · 국내외 리더의 Do와 不 · 넷째 주는 PEOPLE</div>
    <div><b>ISSUE</b>격주 금 · 해외 연구보고서 한 편을 깊게</div>
  </div>
  <div class="chips">${SER.map(s => `<button class="chip ${state.chokSeries === s ? 'on' : ''}" onclick="setF('chokSeries','${s}')">${s}</button>`).join('')}</div>
  <div class="chips">${SRC.map(s => `<button class="chip ${state.chokSrc === s ? 'on' : ''}" onclick="setF('chokSrc','${s}')">출처: ${s === '국내연구' ? '국내 연구' : s === '정부' ? '정부·공공' : s}</button>`).join('')}</div>
  <input class="search" placeholder="제목·본문·주제로 찾기" value="${esc(state.chokQ)}" oninput="state.chokQ=this.value;clearTimeout(window._t);window._t=setTimeout(()=>{viewChok();const s=document.querySelector('.search');s.focus();s.setSelectionRange(s.value.length,s.value.length)},250)">
  <p class="meta">${list.length}건</p>
  <div class="grid">${list.map(card).join('')}</div>`;
}
window.state = state;
window.setF = (k, v) => { state[k] = v; route(); };

/* ---------- 침 ---------- */
const FAM = [
  { name: '골목경제 · 이어가게', t: (x, c) => c === '골목경제' },
  { name: '망우 · 도시의 기억', t: (x, c) => c === '도시·기억' },
  { name: '노무현의 일하는 방식 × AX2030', t: x => /노무현/.test(x) },
  { name: 'AX2030 거버넌스', t: x => /거버넌스|governance/i.test(x) },
  { name: 'AX2030 로드맵', t: x => /로드맵/.test(x) },
  { name: 'AX 루프 · 순환도', t: x => /루프|순환/.test(x) },
  { name: '사람 중심 AX', t: x => /사람/.test(x) },
  { name: '비전 · 새로운 연결, 다른 경험', t: (x, c) => /새로운 연결|비전|파노라마|경험/.test(x) || c === '중랑 비전' },
  { name: '그 밖의 정책지도', t: () => true }
];
function families() {
  const g = FAM.map(f => ({ name: f.name, items: [] }));
  for (const r of aa) { const i = FAM.findIndex(f => f.t(r.title, r.category)); g[i].items.push(r); }
  g.forEach(f => f.items.sort((a, b) => (b.date || '').localeCompare(a.date || '')));
  return g.filter(f => f.items.length);
}
window.zoom = id => { const r = aa.find(x => x.id === id); if (r) openModal(`<h3 style="margin:4px 0">${esc(r.title)}</h3><p class="meta">${esc(r.category)} · ${esc(r.date)} · 제작 당시의 구상</p><img src="${esc(abs(AA, r.image))}" alt="${esc(r.title)}">`); };
window.zoomImg = src => openModal(`<img src="${esc(src)}" alt="">`);
function viewChim() {
  setNav('chim');
  const weeklies = signal.filter(x => x.series === 'WEEKLY');
  const gung = ledger.filter(x => x.series === '아궁이(궁리)').sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const fam = families();
  $('#main').innerHTML = `
  <h2 class="sec">침 · 아궁이 <span class="en">INSIDE OUT</span></h2>
  <p class="secDesc">밖에서 얻은 촉을 중랑의 처방으로 바꾸는 방입니다. 아아(아궁이 아카이브)가 이 방으로 들어왔습니다. 침은 편집국의 의견이며, 행정의 결정이 아닙니다.</p>
  <div class="flow"><div class="f1"><b>촉 · 觸</b>밖에서 무엇이 바뀌었나</div><div class="f2"><b>읽기</b>왜 의미 있나</div><div class="f3"><b>침 · 鍼</b>중랑에 적용한다면</div><div class="f4"><b>질문</b>오늘의 중랑 Q</div></div>
  <h2 class="sec">이번 주 침 <span class="en">WEEKLY · 수 08:00 · 국장회의</span></h2>
  <p class="secDesc">지난주 촉 가운데 중랑에 적용할 후보 세 가지를 제안형으로 올립니다. 중랑 현안은 이 코너에서만, 외부 사례와 짝지어 다룹니다.</p>
  <div class="grid">${weeklies.map(card).join('')}</div>
  <h2 class="sec">아궁이 레시피 <span class="en">MONTHLY · 마지막 금요일</span></h2>
  <div class="note"><b>첫 레시피 2026.11.27(금) 예정.</b> 한 달 촉 가운데 하나를 골라 착상 → 문답 → 구조 → 한 장으로 정책지도를 만듭니다. 새 시각물은 이 코너에서만 만들고, 출발한 촉(외부 신호)을 함께 적습니다.</div>
  <h2 class="sec">정책지도 <span class="en">AGUNGI MAPS · ${aa.length}장 · ${fam.length}묶음</span></h2>
  <p class="secDesc">같은 생각의 여러 판본을 한 묶음으로 모았습니다. 큰 그림은 가장 최근 판이며, 아래 작은 그림이 이전 판본입니다. 이미지 속 일정·수치·협력관계는 제작 당시의 구상입니다.</p>
  <div class="grid">${fam.map(f => { const r = f.items[0]; return `<div class="family"><img loading="lazy" src="${esc(abs(AA, r.thumb || r.image))}" alt="${esc(r.title)}" onclick="zoom('${r.id}')"><div class="body"><h4>${esc(f.name)}</h4><div class="meta">대표: ${esc(r.title)} · ${esc(r.date)} · 판본 ${f.items.length}</div>${f.items.length > 1 ? `<div class="versions">${f.items.slice(1).map(v => `<img loading="lazy" src="${esc(abs(AA, v.thumb || v.image))}" title="${esc(v.title)} · ${esc(v.date)}" onclick="zoom('${v.id}')">`).join('')}</div>` : ''}</div></div>`; }).join('')}</div>
  <h2 class="sec">궁리 노트 <span class="en">${gung.length} QUESTIONS</span></h2>
  <p class="secDesc">아궁이 대화에서 나온 질문과 궁리의 요지입니다(원장 기록). 상태는 대부분 '구상'입니다.</p>
  <div class="grid">${gung.map(g => `<article class="card"><span class="series">아궁이 궁리 · ${esc(g.status || '')}</span><h4>${esc(g.title)}</h4><div class="meta">${fmt(nd(g.date))}${g.topic ? ' · ' + esc(g.topic) : ''}</div><div>${(g.ax2030 || []).map(a => `<span class="tag ax" title="${esc(AXL[a] || '')}">AX ${a}</span>`).join('')}</div><p>${esc(g.desc)}</p></article>`).join('')}</div>
  <h2 class="sec">아궁이의 문법 <span class="en">뜻과 땀으로 때를 짓는다</span></h2>
  <div class="room"><div><b>01 착상</b>누구의 하루에서 무엇이 걸리는가.</div><div><b>02 문답</b>넓히고, 의심하고, 근거를 확인한다.</div><div><b>03 구조</b>기존 자산을 연결하고 작은 실험을 설계한다.</div><div><b>04 1장</b>오늘의 판단과 다음 행동을 압축한다.</div></div>
  <p class="muted" style="font-size:14px">좋은 질문 → 작은 실험 → 주민 경험 확인 → 다음 정책과 부서로 학습 연결. 원본 아카이브: <a href="${AA}" target="_blank" rel="noopener">아아 ↗</a></p>`;
}

/* ---------- 질문 서가 ---------- */
function viewQ() {
  setNav('q');
  const list = signal.filter(x => x.q).filter(x => state.qAx === '전체' || x.ax.includes(state.qAx));
  $('#main').innerHTML = `
  <h2 class="sec">질문 서가 <span class="en">JUNGNANG Q</span></h2>
  <p class="secDesc">"중랑은 답을 공유하기보다 프롬프트를 공유하는 물음공동체." 발행물이 남긴 질문을 AX2030 5대 전략별로 모았습니다.</p>
  <div class="chips">${['전체', '①', '②', '③', '④', '⑤'].map(a => `<button class="chip ${state.qAx === a ? 'on' : ''}" onclick="setF('qAx','${a}')">${a === '전체' ? '전체' : a + ' ' + esc(AXL[a] || '')}</button>`).join('')}</div>
  <p class="meta">${list.length}개의 질문</p>
  <table class="t"><tr><th style="width:110px">날짜</th><th>질문</th><th style="width:30%">출발한 지면</th></tr>
  ${list.map(x => `<tr><td>${fmt(x.d) || '원본 참조'}</td><td style="font-family:var(--serif);font-size:16px;color:var(--navy)">${esc(x.q)}</td><td><a href="#/read/${encodeURIComponent(x.id)}">${esc(seriesLabel(x))}${x.vol ? ' ' + x.vol : ''}</a><br><span class="meta">${esc(x.title)}</span></td></tr>`).join('')}</table>`;
}

/* ---------- 서가 ---------- */
function viewShelf() {
  setNav('shelf');
  const groups = ['전체', ...new Set(ledger.map(x => x.series))];
  const kw = state.shelfQ.trim().toLowerCase();
  const list = ledger.filter(x => state.shelfSeries === '전체' || x.series === state.shelfSeries)
    .filter(x => !kw || (x.title + ' ' + (x.desc || '') + ' ' + (x.topic || '')).toLowerCase().includes(kw))
    .slice().sort((a, b) => nd(b.date || '0').localeCompare(nd(a.date || '0')));
  const ids = new Set(signal.map(s => s.id));
  $('#main').innerHTML = `
  <h2 class="sec">서가 <span class="en">LEDGER · ${ledger.length}</span></h2>
  <p class="secDesc">초기 파일럿부터 현재 발행본, 아궁이 궁리·시각물, 기획·운영 기록까지 원장(GitHub jungnang-signal/archive) 전체입니다. 사이트에 지면이 있는 기록은 제목을 눌러 읽고, '원장 전용'은 GPT 대화 원본에만 있습니다.</p>
  <div class="chips">${groups.map(s => `<button class="chip ${state.shelfSeries === s ? 'on' : ''}" onclick="setF('shelfSeries','${esc(s)}')">${esc(s)}</button>`).join('')}</div>
  <input class="search" id="shelfSearch" placeholder="원장에서 찾기" value="${esc(state.shelfQ)}" oninput="state.shelfQ=this.value;clearTimeout(window._t);window._t=setTimeout(()=>{viewShelf();const s=document.getElementById('shelfSearch');s.focus();s.setSelectionRange(s.value.length,s.value.length)},250)">
  <p class="meta">${list.length}건 · 원장 기준일 ${esc(SNAP.ledger.updated || '')}</p>
  <table class="t"><tr><th style="width:96px">날짜</th><th style="width:120px">시리즈</th><th>제목</th><th style="width:120px">어디</th><th style="width:70px">AX</th></tr>
  ${list.map(x => { const sid = x.id.startsWith('site:') ? x.id.slice(5) : ''; const link = sid && ids.has(sid); return `<tr><td>${fmt(nd(x.date)) || '미상'}</td><td>${esc(x.series)}${x.no ? '<br><span class="meta">' + esc(x.no) + '</span>' : ''}</td><td>${link ? `<a href="#/read/${encodeURIComponent(sid)}">${esc(x.title)}</a>` : x.series === '아궁이(시각물)' ? `<a href="#/chim">${esc(x.title)}</a>` : esc(x.title)}${x.desc ? `<br><span class="meta">${esc(x.desc.slice(0, 120))}${x.desc.length > 120 ? '…' : ''}</span>` : ''}</td><td>${(x.where || []).map(esc).join(', ')}${!link && x.series !== '아궁이(시각물)' && (x.where || []).includes('GPT 대화') ? '<br><span class="tag">원장 전용</span>' : ''}</td><td>${(x.ax2030 || []).join(' ')}</td></tr>`; }).join('')}</table>`;
}

/* ---------- 읽기 ---------- */
function viewRead(id) {
  setNav('');
  const it = signal.find(x => x.id === id) || signal.find(x => x.id === (window.DESK_ALIAS || {})[id]);
  if (!it) { $('#main').innerHTML = '<p>기록을 찾지 못했습니다. <a href="#/shelf">서가로</a></p>'; return; }
  const body = String(it.body || '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" ');
  const imgs = (it.images || []).map(p => abs(PM, p));
  const vers = (it.versions || []).filter(v => v && (v.body || v.label));
  const rel = signal.filter(x => x !== it && isPub(x) && x.ax.some(a => it.ax.includes(a))).slice(0, 4);
  const orig = [it.md && `<a class="btn" target="_blank" rel="noopener" href="${esc(abs(PM, it.md))}">원본 MD</a>`, it.pdf && `<a class="btn" target="_blank" rel="noopener" href="${esc(abs(PM, it.pdf))}">원본 PDF</a>`].filter(Boolean).join(' ');
  $('#main').innerHTML = `<article class="reader">
    <p><a href="javascript:history.back()" class="meta">← 돌아가기</a></p>
    <span class="eyebrow">${esc(seriesLabel(it))}${it.vol ? ' · ' + it.vol : ''}${special(it) ? ' · ' + special(it) : ''} · ${role(it)}</span>
    <h1>${esc(it.title)}</h1>
    <div class="meta">${it.d ? fmt(it.d) + ' (' + wd(it.d) + ') 발행' : '발행일 원본 참조'}${it.topic ? ' · ' + esc(it.topic) : ''}${it.edition ? ' · ' + esc(it.edition) : ''}</div>
    <div style="margin:8px 0">${tags(it)}</div>
    ${it.desc ? `<p style="font-family:var(--serif);font-size:18px">${esc(it.desc)}</p>` : ''}
    ${it.q ? `<div class="chimbox"><b>JUNGNANG Q</b> · ${esc(it.q)}</div>` : ''}
    ${pairOf(it.id) ? `<div class="note"><b>두 시선</b> · 같은 날 같은 지면을 다른 엔진도 냈습니다. <a href="#/fusion">융복합 통합본 「${esc(pairOf(it.id).title)}」 읽기 →</a></div>` : ''}
    ${imgs.length ? `<div class="imgs">${imgs.map(s => `<img loading="lazy" src="${esc(s)}" alt="지면" onclick="zoomImg('${esc(s)}')">`).join('')}</div>` : ''}
    <div class="body">${body || '<p class="muted">본문은 원본 지면에서 읽을 수 있습니다.</p>'}</div>
    ${vers.length ? `<h3>이전 판본 · 정정</h3>${vers.map((v, k) => `<details><summary>${esc(v.label || '판본 ' + (k + 1))}</summary><div class="body">${v.body || ''}</div></details>`).join('')}` : ''}
    <p style="margin-top:16px">${orig}</p>
    ${rel.length ? `<div class="related"><span class="eyebrow">같은 AX2030 전략으로 이어 읽기</span><div class="grid" style="margin-top:10px">${rel.map(card).join('')}</div></div>` : ''}
  </article>`;
  window.scrollTo(0, 0);
}

/* ---------- 창간호 ---------- */
function viewFounding() {
  setNav('founding');
  $('#main').innerHTML = `
  <span class="eyebrow">창간호 · 2026년 11월 11일(수) · MORNING Vol.34 · 예비호 ①~⑨ 파일럿 뒤</span>
  <h2 class="sec" style="font-size:34px;margin-top:6px">밖을 읽고, 중랑의 다음을 묻습니다</h2>
  <div class="essay">
    <p>JUNGNANG SIGNAL은 2026년 9월, "외부의 변화를 신호와 잡음으로 구분하는 중랑 정책 미디어"로 첫발을 뗐습니다. 아궁이는 그보다 먼저 불을 지폈습니다. 아침마다 궁리한 질문을 한 장의 정책지도로 굽는 부엌이었습니다. 두 달 동안 MORNING 24호, WEEKLY 4호, WEEKLY AX 3호, 두부 3호가 나갔고, 정책지도 59장과 궁리 27개가 쌓였습니다. 밖을 읽는 일과 안에서 궁리하는 일이 서로의 재료가 됐습니다.</p>
    <p>오늘 신호와 부엌을 한 지붕 아래로 모아 <b>중랑정책미디어</b>를 엽니다. 약속은 하나입니다. <b>밖에서의 촉이, 중랑을 건강하게 하는 침으로.</b></p>
    <p>머리는 밖에서 고릅니다. 국내외 연구보고서, 정부 원문, 다른 도시와 다른 나라의 실행이 우리의 재료입니다. 지면의 여덟은 바깥에, 둘은 중랑에 둡니다. 중랑은 "중랑에 적용한다면"이라는 제안으로 등장합니다. 바깥을 넓게 읽을수록 안을 깊이 볼 수 있다고 믿습니다. 다른 곳에서 먼저 해 본 일을 우리 골목에 대어 보고, 그 성과가 어떤 조건에서 나왔는지 함께 살피겠습니다.</p>
    <p>우리는 감시하고 채점하는 신문보다 곁에서 조언하는 동료가 되려 합니다. 잘한 일에서 출발해 한 걸음 더 나아갈 길을 찾겠습니다. 사실과 해석과 제안은 나눠 적습니다. 침은 함께 검토할 의견이고, 결정은 행정의 몫입니다. 숙제보다 영감이 되도록 덜 내고 더 읽히게, 3분이면 읽히게 만들겠습니다. 매 호 끝에는 질문 하나를 남깁니다. 서로의 경험으로 답을 보태는 물음공동체를 동료들과 가꾸고 싶기 때문입니다.</p>
    <p>호수는 이어 갑니다. 지난 두 달의 실험이 이 매체의 뿌리이기 때문입니다. 10월 29일부터 아홉 번의 예비호로 손을 맞췄습니다. 11월 11일, MORNING은 Vol.34로 창간호를 내고 평일 아침마다 여러분 책상에 닿겠습니다. 밖에서 들고 온 촉 하나와 중랑에 건네는 침 하나를 담겠습니다. 바깥을 향한 촉과 동료를 향한 귀를 함께 열겠습니다.</p>
    <p><b>새로운 연결, 다른 경험.</b></p>
    <p class="muted" style="font-size:15px">중랑정책주방(정책실) · 창간사 · 2026.10.29 발행인 확정 · Claude와 GPT가 각각 쓴 글을 Aside 통합 데스크가 합침</p>
  </div>

  <h2 class="sec">촉침 편집헌장 v1.1 <span class="en">2026.10.29 파일럿 적용 · 11.11 창간 · 두 엔진 공통</span></h2>
  <ol class="charter">
    <li><b>머리는 밖에서.</b> 머리기사와 1면 신호는 국내외 연구보고서, 정부 원문, 해외·다른 도시 실행 사례에서 고른다. 중랑 현안을 머리로 올리지 않는다.</li>
    <li><b>외부 8 : 중랑 2.</b> 한 호 신호는 2~3개(해외 1, 국내 연구·정부 1, 다른 도시 현장 1). 중랑은 각 신호 끝 "중랑에 적용한다면" 단락에서 이름으로 등장한다.</li>
    <li><b>글의 순서.</b> 촉(무엇이 바뀌었나, 원문 링크) → 읽기(왜 의미 있나) → 침(중랑에 적용한다면, 작은 실험 하나) → 오늘의 중랑 Q.</li>
    <li><b>근거의 위계.</b> ① 연구보고서·공식 통계·정부 원문 ② 해외 도시·기관 실행 사례 ③ 언론(교차 확인). 매주 해외 연구 1편 이상.</li>
    <li><b>제안형 어조.</b> "없다·않았다·아직 확인 전" 같은 미비 지적형 제목을 쓰지 않는다. 부서를 거론하거나 평가하지 않는다.</li>
    <li><b>의견임을 밝힌다.</b> 사실·해석·제안을 구분한다. 침은 편집국의 의견이며 행정 결정이 아니다.</li>
    <li><b>3분 읽기.</b> MORNING 한 신호는 촉 2줄, 읽기 2줄, 침 1줄. 깊은 내용은 ISSUE로 넘긴다.</li>
    <li><b>현안은 '침' 코너로.</b> 꼭 다룰 중랑 현안은 수요일 WEEKLY '이번 주 침'에서 외부 사례와 짝지어 제안으로만 다룬다.</li>
    <li><b>한 자리 한 엔진.</b> 같은 날 같은 시리즈를 두 엔진이 따로 내지 않는다.</li>
    <li><b>해외와 국내의 균형.</b> 밖 80 안에서 해외 40 : 국내 40(정부 원문·국책·지역 연구·다른 지자체 실행) 안팎. 한 호 3개면 해외 1~2, 국내 1~2.</li>
    <li><b>잘한 데서 더 잘하자.</b> 중랑이 등장할 때는 이미 하고 있는 일·잘된 점을 먼저 적고, 밖의 사례로 "한 걸음 더하면"을 제안한다.</li>
    <li><b>솔루션 저널리즘.</b> 고발하거나 채점하지 않는다. 다른 곳이 어떻게 풀었는지(방법), 무엇이 나아졌는지(증거), 한계, 중랑이 배울 점을 함께 푼다.</li>
    <li><b>지시가 아니라 조언과 자문.</b> "~해야 한다" 대신 "~해 보면 어떨까요·~를 검토해 볼 만합니다". 판단과 결정은 각 부서와 발행인의 몫이다.</li>
    <li><b>원장이 기준.</b> 모든 발행물은 GitHub jungnang-signal/archive에 출처 유형과 AX2030 전략(①~⑤)을 함께 기록한다. 호수는 Claude 편집국 기록이 기준이다.</li>
  </ol>

  <h2 class="sec">발행 리듬 <span class="en">내부 독자 주 8~9건</span></h2>
  <table class="t cal"><tr><th></th><th>월</th><th>화</th><th>수</th><th>목</th><th>금</th><th>토·일</th></tr>
    <tr><th>06:00</th><td></td><td><span class="cell c4">두부 (넷째 주 PEOPLE)</span></td><td></td><td></td><td></td><td rowspan="3" class="muted">휴간<br>(10/31부터)</td></tr>
    <tr><th>07:00</th><td><span class="cell c1">MORNING</span></td><td><span class="cell c1">MORNING</span></td><td><span class="cell c1">MORNING</span></td><td><span class="cell c1">MORNING</span></td><td><span class="cell c1">MORNING</span></td></tr>
    <tr><th>08:00~09:00</th><td><span class="cell c5">WEEKLY AX</span></td><td></td><td><span class="cell c2">WEEKLY 침 (국장회의)</span></td><td></td><td><span class="cell c3">격주 ISSUE · 월말 아궁이 레시피</span></td></tr>
  </table>
  <p class="muted" style="font-size:14px">소포(소상공인판, 월 07:33)는 외부 독자 매체로 따로 이어 갑니다.</p>

  <h2 class="sec">Vol. 체계 <span class="en">전통을 잇는 호수</span></h2>
  <table class="t"><tr><th>시리즈</th><th>지난 호</th><th>다음 호</th><th>창간 뒤 첫 호</th></tr>
    <tr><td>MORNING</td><td>Vol.24 (10/28 수)</td><td>예비호 ① Vol.25 (10/29) · ② 26 (10/30) · ③ 27 (11/2) · ④ 28 · ⑤ 29 · ⑥ 30 · ⑦ 31 · ⑧ 32 (11/9) · ⑨ 33 (11/10)</td><td><b>Vol.34 = 창간호 (11/11 수)</b>, 이후 평일</td></tr>
    <tr><td>WEEKLY AX</td><td>Vol.3 (10/26 월)</td><td colspan="2">Vol.4 (11/2) · Vol.5 (11/9)</td></tr>
    <tr><td>두부</td><td>Vol.3 (10/27 화)</td><td colspan="2">Vol.4 (11/3) · Vol.5 (11/10) · 넷째 주(11/24)는 PEOPLE</td></tr>
    <tr><td>WEEKLY 침</td><td>Vol.4 (10/28 수)</td><td colspan="2">Vol.5 (11/4, '이번 주 침' 첫 호) · <b>Vol.6 창간 특집 (11/11)</b></td></tr>
    <tr><td>ISSUE · 아궁이 레시피</td><td>수시</td><td colspan="2">ISSUE 격주 금 (11/13 첫 회) · 레시피 11/27(금)</td></tr>
  </table>

  <h2 class="sec">두 엔진의 역할 <span class="en">통합 데스크(Aside) 배분 v1</span></h2>
  <table class="t"><tr><th style="width:18%">일</th><th>Claude · 편집국</th><th>GPT · 촉 레이더와 제작실</th><th style="width:22%">Aside · 통합 데스크</th></tr>
    <tr><td>지면 글</td><td><b>MORNING · WEEKLY AX · 두부 · WEEKLY 침 · ISSUE · PEOPLE</b>를 쓰고 검증한다. 호수 기록의 기준.</td><td>같은 자리의 별도 제작본은 내지 않는다.</td><td>헌장 준수 점검</td></tr>
    <tr><td>밖의 촉</td><td>촉 후보 가운데 고르고 원문을 확인한다.</td><td><b>촉 레이더</b>: 해외 연구보고서·국제기구·해외 도시 사례를 넓게 찾아 GPT자문 폴더에 매일 전날 저녁 "촉 후보 3~5"를 남긴다. 전호 사후 의견은 이어 간다.</td><td>출처 다양성(해외 비중) 점검</td></tr>
    <tr><td>아궁이</td><td>궁리 정리·문서화·사실 확인, 레시피 본문</td><td><b>착상·초광폭 탐색·정책지도 시각물</b>, 월말 아궁이 레시피 그림</td><td>정책지도 묶음 정리</td></tr>
    <tr><td>국장회의 의제</td><td>WEEKLY 침 한 본으로 낸다.</td><td>「중랑 주간 정책의제 5」는 별도 발행을 멈추고 월요일 촉 후보로 보낸다.</td><td>중복 점검</td></tr>
    <tr><td>진열</td><td>드라이브 03_발행본에 완성본 저장(현행).</td><td><b>원본 제작실</b>: 기존 GPT 사이트·아아의 매일 갱신을 이어 간다.</td><td><b>창간 매체 사이트</b>: 제작실 데이터를 실시간으로 받아 촉·침·서가로 진열</td></tr>
    <tr><td>융복합</td><td>두 시선이 갈린 판단을 '두 시선' 상자로 지면에 남긴다.</td><td>다른 판단은 GPT자문 폴더에 근거와 함께 남긴다.</td><td>월 1회 융복합 통합본</td></tr>
    <tr><td>소포</td><td>-</td><td>소상공인판 발행(현행)</td><td>-</td></tr>
    <tr><td>원장·점검</td><td>원장 기록</td><td>-</td><td>매주 월 07:30 통합 점검 리포트(비율·어조·중복·출처·원장)</td></tr>
  </table>
  <p class="muted" style="font-size:14px">배분은 기존 「두 엔진」 규약(Claude 편집국장, GPT 외부 고문, 아궁이 착상은 GPT·정리는 Claude)을 이어받아 '밖의 촉'을 GPT의 넓은 탐색에 맡긴 것입니다. 발행인이 언제든 바꿀 수 있습니다.</p>

  <h2 class="sec">세 개의 방 <span class="en">촉 · 침 · 서가</span></h2>
  <div class="room"><div><b>오늘</b>오늘의 촉, 이번 주 침, 오늘의 중랑 Q, 편집 계기판</div><div><b>촉 · SIGNAL</b>MORNING · WEEKLY AX · ISSUE · 두부 · PEOPLE</div><div><b>침 · 아궁이</b>이번 주 침 · 아궁이 레시피 · 정책지도 · 궁리 노트</div><div><b>서가</b>원장 ${ledger.length}건 전체와 질문 서가</div></div>`;
  window.scrollTo(0, 0);
}


/* ---------- 융복합 ---------- */
const CONV = window.CONV || { pairs: [], themes: [], lenses: {}, thesis: {}, method: [] };
state.fuSeries = '전체';
function pairOf(id) { return CONV.pairs.find(p => p.claude.ids.includes(id) || p.gpt.ids.includes(id)); }
function srcLinks(ids) { return ids.map(id => { const it = signal.find(x => x.id === id); return it ? `<a href="#/read/${encodeURIComponent(id)}">「${esc(it.title)}」</a>` : ''; }).join(' '); }
function viewFusion() {
  setNav('fusion');
  const SER = ['전체', ...new Set(CONV.pairs.map(p => p.series))];
  const list = CONV.pairs.filter(p => state.fuSeries === '전체' || p.series === state.fuSeries);
  const L = CONV.lenses;
  $('#main').innerHTML = `
  <h2 class="sec">융복합 <span class="en">TWO LENSES, ONE PAGE</span></h2>
  <p class="secDesc">같은 날 같은 지면을 Claude 편집국과 GPT가 따로 낸 열한 짝을 나란히 읽고, 두 시선을 한 지면으로 합쳤습니다. 원본은 지우지 않고 그대로 이어 읽을 수 있습니다. 원장: GitHub jungnang-signal archive/convergence/2026-10.md</p>
  <div class="qpanel" style="margin-bottom:18px"><span class="eyebrow">10월의 공통 명제</span><div class="q">${esc(CONV.thesis.head)}</div><p style="font-size:15px;opacity:.9">${esc(CONV.thesis.body)}</p></div>
  <div class="room" style="grid-template-columns:repeat(3,1fr)">
    <div><b>도착</b>주민에게 실제로 닿았는가</div><div><b>정정</b>틀렸을 때 어디서 고치는가</div><div><b>책임</b>누가 끝까지 맡고, 바뀐 이유를 어디에 남기는가</div>
  </div>
  <h2 class="sec">두 시선 <span class="en">CLAUDE × GPT</span></h2>
  <div class="grid" style="grid-template-columns:1fr 1fr">
    ${['claude', 'gpt'].map(k => `<div class="card"><span class="series">${esc(L[k].name)}</span><ul style="margin:4px 0 6px;padding-left:18px;font-size:14px">${L[k].strength.map(s => '<li>' + esc(s) + '</li>').join('')}</ul><p class="muted" style="font-size:13px">한계: ${esc(L[k].limit)}</p></div>`).join('')}
  </div>
  <div class="note"><b>융복합 원칙</b> · ${esc(L.rule)}</div>
  <h2 class="sec">열한 짝 <span class="en">SAME SLOT, TWO EDITIONS</span></h2>
  <div class="chips">${SER.map(s => `<button class="chip ${state.fuSeries === s ? 'on' : ''}" onclick="setF('fuSeries','${s}')">${s}</button>`).join('')}</div>
  ${list.map(p => `<article class="card" id="${p.id}" style="margin-bottom:16px">
    <span class="series">${esc(p.series)} ${esc(p.vol)} · ${fmt(p.date)} · 융복합</span>
    <h4 style="font-size:21px">${esc(p.title)}</h4>
    <div>${p.ax.map(a => `<span class="tag ax" title="${esc(AXL[a] || '')}">AX ${a}</span>`).join('')}</div>
    <div class="grid" style="grid-template-columns:1fr 1fr;margin:8px 0">
      <div style="border-left:4px solid var(--navy);padding-left:10px"><b style="color:var(--navy)">Claude의 시선</b><p>${esc(p.claude.view)}</p><div class="meta">원본: ${srcLinks(p.claude.ids)}</div></div>
      <div style="border-left:4px solid var(--green);padding-left:10px"><b style="color:var(--green)">GPT의 시선</b><p>${esc(p.gpt.view)}</p><div class="meta">원본: ${srcLinks(p.gpt.ids)}</div></div>
    </div>
    <p><b>겹친 곳</b> · ${esc(p.overlap)}</p>
    <p><b>갈린 곳</b> · ${esc(p.diverge)}</p>
    <div class="chimbox"><b>융복합 침 · 중랑에 적용한다면</b><br>${esc(p.chim)}</div>
    <div class="q">Q. ${esc(p.q)}</div>
  </article>`).join('')}
  <h2 class="sec">주제별 융복합 지도 <span class="en">AX2030 5대 전략</span></h2>
  <div class="grid">${CONV.themes.map(t => `<article class="card"><span class="series">AX ${esc(t.ax)} · ${esc(t.name)}</span><h4>${esc(t.head)}</h4>
    <p style="font-size:13px"><b style="color:var(--navy)">Claude</b> · ${t.claude.map(esc).join(' · ')}</p>
    <p style="font-size:13px"><b style="color:var(--green)">GPT</b> · ${t.gpt.map(esc).join(' · ')}</p>
    <p style="font-size:13px"><b style="color:var(--red)">아궁이</b> · ${t.agungi.map(esc).join(' · ')}</p>
    <div class="chimbox" style="font-size:14px">${esc(t.fusion)}</div>
    <div class="q">다음 걸음(제안) · ${esc(t.next)}</div></article>`).join('')}</div>
  <h2 class="sec">앞으로의 융복합 문법 <span class="en">HOW WE MERGE</span></h2>
  <ol>${CONV.method.map(m => '<li>' + esc(m) + '</li>').join('')}</ol>`;
}

/* ---------- 라우터 ---------- */
function route() {
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  if (h.startsWith('read/')) return viewRead(h.slice(5));
  if (h === 'chok') return viewChok();
  if (h === 'chim') return viewChim();
  if (h === 'q') return viewQ();
  if (h === 'fusion') return viewFusion();
  if (h === 'shelf') return viewShelf();
  if (h === 'founding') return viewFounding();
  return viewToday();
}
window.addEventListener('hashchange', () => { route(); if (!location.hash.includes('read/')) window.scrollTo(0, 0); });

(async function init() {
  const now = new Date();
  $('#todayLabel').textContent = now.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  signal = enrich(SNAP.signal || []); aa = SNAP.aa || [];
  route();
  const autoDate = state.date;
  await loadLive();
  if (live.signal && state.date === autoDate) state.date = null; // 실시간 데이터가 오면 최신 판으로
  if (live.signal || live.aa) route();
})();
