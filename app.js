/* Krémvilág – egyoldalas bemutató webshop (hash-útvonalak, kosár a böngészőben) */
'use strict';
const VERSION = '2';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const app = $('#app');
const ft = n => n.toLocaleString('hu-HU').replace(/ /g, ' ') + ' Ft';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

let S = null; // site.json

/* ---------- osztályozás ---------- */
const SKINS = [
  { k: 'szaraz', name: 'Száraz bőr', d: 'Feszül, hámlik, tápanyagra és vízre szomjazik.', cats: ['száraz bőr', 'száraz bőrre'], img: 'media/hero-arc.jpg' },
  { k: 'erzekeny', name: 'Érzékeny bőr', d: 'Könnyen kipirosodik, reagál — nyugtatás és védelem.', cats: ['érzékeny bőr', 'bőrnyugtató'], img: 'media/szem.jpg' },
  { k: 'problemas', name: 'Pattanásos, zsíros bőr', d: 'Faggyúszabályozás, tisztítás, egyensúly.', cats: ['aknés bőrre', 'zsíros bőrre'], img: 'media/homlok.jpg' },
  { k: 'rosacea', name: 'Rosaceás bőr', d: 'Tágult erek, pír — célzott kuperózis-ápolás.', cats: ['rosaceás bőr'], img: 'media/ajak.jpg' },
  { k: 'erett', name: 'Érett bőr', d: 'Ránctalanítás, feszesítés, regenerálás.', cats: ['érett bőr', 'ránctalanító hatás', 'finom ráncokra', 'öregedés gátló', 'öregedésgátló', 'feszesítés'], img: 'media/hero-nyak.jpg' },
  { k: 'faradt', name: 'Fáradt, fakó bőr', d: 'Vitamin, ragyogás, friss tónus.', cats: ['fáradt', 'fakó', 'bőrmegújító'], img: 'media/szerum.jpg' },
  { k: 'pigment', name: 'Pigmentfoltos bőr', d: 'Egyenletes bőrtónus, halványítás.', cats: ['pigmentfoltokra'], img: 'media/maszk.jpg' },
];
const TYPES = [
  { k: 'krem', name: 'Arckrém', cats: ['arckrém', 'krém', 'nappali krém', 'éjszakai krém'] },
  { k: 'szerum', name: 'Szérum, ampulla', cats: ['szérum', 'ampulla'] },
  { k: 'tisztito', name: 'Tisztítás', cats: ['Arctisztító', 'lemosó', 'tonik', 'gél'] },
  { k: 'maszk', name: 'Maszk', cats: ['maszk'] },
  { k: 'hamlaszto', name: 'Hámlasztás', cats: ['hámlasztás', 'arcradír'] },
  { k: 'szem', name: 'Szemkörnyék', cats: ['szemkörnyékápoló'] },
  { k: 'ajak', name: 'Ajak, szájkörnyék', cats: ['ajakápoló', 'szájkörnyék ápoló', 'szájfény'] },
  { k: 'test', name: 'Testápolás', cats: ['testápolási termékek', 'cellulit', 'stria kezelés', 'testradír', 'testápolás', 'testpermet', 'olaj', 'fogyasztás'] },
  { k: 'nap', name: 'Napozás', cats: ['napozás', 'fényvédő', 'vízálló'] },
  { k: 'vegan', name: 'Vegán, natúr', cats: ['vegán', 'NATUR TERMÉK'] },
];
const BRANDS = [
  { k: 'alissi', name: 'Alissi Brontë', page: 'alissi-bronte-termekek', tag: 'Spanyol luxus-biokozmetikum — 100%-os tisztaságú hatóanyagok, arany, kaviár, gyémántpor.' },
  { k: 'skeyndor', name: 'Skeyndor', page: 'skeyndor-termekek', tag: 'Több mint 50 éve a tudományos bőrápolás élvonalában — 50 ország szalonjaiban.' },
  { k: 'kleanthous', name: 'Kleanthous', page: 'kleanthous-termekek', tag: 'Ciprusi professzionális linea — egyedülálló hatóanyag-szállító rendszerrel.' },
];
const brandKey = n => BRANDS.find(b => b.name === n)?.k;
const has = (p, list) => p.cats.some(c => list.includes(c));
const skinOf = k => SKINS.find(s => s.k === k);
const typeOf = k => TYPES.find(s => s.k === k);
const pimg = p => p.images[0] || 'img/placeholder.svg';
const bySlug = slug => S.products.find(p => p.slug === slug);

/* ---------- kosár ---------- */
const cart = {
  items: (() => { try { return JSON.parse(localStorage.getItem('kv-cart') || '[]'); } catch { return []; } })(),
  save() { try { localStorage.setItem('kv-cart', JSON.stringify(this.items)); } catch {} renderCart(); },
  add(id, q = 1) {
    const it = this.items.find(i => i.id === id);
    it ? it.q += q : this.items.push({ id, q });
    this.save();
    const b = $('#cartBtn'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
    toast('Kosárba tettem ✓');
  },
  set(id, q) { this.items = this.items.map(i => i.id === id ? { ...i, q } : i).filter(i => i.q > 0); this.save(); },
  get lines() { return this.items.map(i => ({ ...i, p: S.products.find(p => p.id === i.id) })).filter(l => l.p); },
  get total() { return this.lines.reduce((s, l) => s + l.p.price * l.q, 0); },
  get count() { return this.items.reduce((s, i) => s + i.q, 0); },
};

function renderCart() {
  $('#cartCount').textContent = cart.count;
  const left = S.shop.freeShipping - cart.total;
  const pct = Math.min(100, cart.total / S.shop.freeShipping * 100);
  $('#shipMeter').innerHTML = (left > 0
    ? `Még <b>${ft(left)}</b> és ingyen szállítjuk FoxPost csomagpontra`
    : `🎉 Ingyenes szállítás FoxPost csomagpontra`) + `<div class="bar"><i style="width:${pct}%"></i></div>`;
  const L = cart.lines;
  $('#drawerItems').innerHTML = L.length ? L.map(l => `
    <div class="ci">
      <a href="#/termek/${l.p.slug}"><img src="${pimg(l.p)}" alt=""></a>
      <div><div class="n">${esc(l.p.name)}</div>
        <div class="q"><button data-q="${l.p.id}" data-d="-1">−</button><span>${l.q}</span><button data-q="${l.p.id}" data-d="1">+</button></div></div>
      <b>${ft(l.p.price * l.q)}</b>
    </div>`).join('') : `<div class="empty"><p style="font-size:40px;margin:0">🧴</p><p>Még üres a kosarad.</p><a class="btn btn-ghost" href="#/termekek">Termékek böngészése</a></div>`;
  $('#drawerFoot').innerHTML = L.length ? `<div class="sum"><span>Összesen</span><b>${ft(cart.total)}</b></div><a class="btn btn-gold" href="#/penztar">Tovább a pénztárhoz</a>` : '';
}
document.addEventListener('click', e => {
  const q = e.target.closest('[data-q]');
  if (q) { const id = +q.dataset.q; const it = cart.items.find(i => i.id === id); cart.set(id, (it?.q || 0) + +q.dataset.d); }
  const a = e.target.closest('[data-add]');
  if (a) { e.preventDefault(); cart.add(+a.dataset.add, +(a.dataset.n || 1)); }
});
const drawer = open => { $('#drawer').classList.toggle('open', open); $('#drawer').setAttribute('aria-hidden', !open); };
$('#cartBtn').onclick = () => drawer(true);
$('#drawerClose').onclick = () => drawer(false);
$('#drawer').onclick = e => { if (e.target.id === 'drawer') drawer(false); };

function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 1800); }

/* ---------- keresés ---------- */
function searchOpen(open) {
  $('#search').classList.toggle('open', open);
  if (open) { $('#searchInput').value = ''; $('#searchResults').innerHTML = ''; setTimeout(() => $('#searchInput').focus(), 30); }
}
$('#searchBtn').onclick = () => searchOpen(true);
$('#search').onclick = e => { if (e.target.id === 'search') searchOpen(false); };
document.addEventListener('keydown', e => { if (e.key === 'Escape') { searchOpen(false); drawer(false); } if (e.key === '/' && !/input|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); searchOpen(true); } });
const match = (p, q) => { const h = norm(p.name + ' ' + p.brand + ' ' + p.cats.join(' ') + ' ' + p.tags.join(' ')); return norm(q).split(/\s+/).every(w => h.includes(w)); };
$('#searchInput').oninput = e => {
  const q = e.target.value.trim();
  if (q.length < 2) { $('#searchResults').innerHTML = ''; return; }
  const r = S.products.filter(p => match(p, q)).slice(0, 12);
  $('#searchResults').innerHTML = r.length ? r.map(p => `<a class="sr" href="#/termek/${p.slug}"><img src="${pimg(p)}" alt=""><span>${esc(p.name)}</span><b>${ft(p.price)}</b></a>`).join('')
    : `<div class="sr" style="grid-template-columns:1fr">Nincs találat erre: „${esc(q)}”</div>`;
};
window.addEventListener('hashchange', () => searchOpen(false));

/* ---------- 3D néző (viewer3d.mjs, igény szerint töltve) ---------- */
let viewers = [];
const v3dLib = () => (v3dLib.p ||= import('./viewer3d.mjs'));
function mount3d(el, p, opts) {
  if (!el || !p?.shape) return;
  v3dLib().then(m => { if (el.isConnected) viewers.push(m.mount(el, p, opts)); }).catch(() => el.classList.add('no3d'));
}
function disposeViewers() { viewers.forEach(v => v.dispose()); viewers = []; }
const hint3d = '<span class="v3d-hint">↔ Húzd el a forgatáshoz</span><span class="v3d-load">3D betöltése…</span>';

/* ---------- komponensek ---------- */
const card = p => `
  <article class="card glass">
    ${!p.inStock ? '<span class="badge">Elfogyott</span>' : ''}
    <a href="#/termek/${p.slug}" class="card-img"><img src="${pimg(p)}" alt="${esc(p.name)}" loading="lazy"></a>
    <div class="card-body">
      <span class="card-brand">${esc(p.brand)}</span>
      <a href="#/termek/${p.slug}" class="card-name">${esc(p.name)}</a>
      <div class="card-foot"><span class="price">${ft(p.price)}</span>
        <button class="add" ${p.inStock ? `data-add="${p.id}"` : 'disabled'} aria-label="Kosárba"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button></div>
    </div>
  </article>`;
const head = (num, title, sub, more) => `
  <div class="sec-head rv"><div><span class="sec-num">${num}</span><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div>${more || ''}</div>`;

/* ---------- oldalak ---------- */
function home() {
  const P = S.products;
  const fresh = P.filter(p => p.brand === 'Alissi Brontë').slice(0, 12);
  const show = ['alissi-bronte-purissimo-cream-50-ml', 'alissi-bronte-perfect-tone-feherito-szerum-30-ml', 'alissi-bronte-tensine-in-up-krem-50-ml', 'alissi-bronte-diamond-peel-100-ml', 'alissi-bronte-serenity-orchid-szerum-erzekeny-borre-30-ml']
    .map(bySlug).filter(p => p && p.shape);
  setTimeout(() => showcase(show));
  const bestSkeyndor = P.filter(p => p.brand === 'Skeyndor' && p.inStock).slice(0, 8);
  const posts = S.posts.slice(0, 3);
  const skinN = s => P.filter(p => has(p, s.cats)).length;
  return `
  <section class="hero"><div class="wrap hero-grid">
    <div class="hero-text">
      <span class="pill"><span class="dot"></span>Szalonminőség otthon · ingyenes szaktanácsadás</span>
      <h1>A bőröd <em>megérdemli</em> a profi ápolást</h1>
      <p class="lead">Professzionális kozmetikumok az Alissi Brontë, a Skeyndor és a Kleanthous kínálatából — bőrtípusra szabva, kozmetikus tanácsával.</p>
      <div class="hero-cta"><a class="btn btn-gold" href="#/borom">Megkeresem a bőrtípusomat →</a><a class="btn btn-ghost" href="#/termekek">Összes termék</a></div>
    </div>
    <div class="hero-side">
      <div class="hero-portrait"><video src="media/hero-arc.mp4" poster="media/hero-arc.jpg" autoplay muted loop playsinline></video></div>
      <div class="float glass f1"><span class="ico">🚚</span><div><b>Ingyenes szállítás</b><small>30 000 Ft felett · FoxPost</small></div></div>
      <div class="float glass f2"><span class="ico">✨</span><div><b>${P.length} profi termék</b><small>3 szalonmárka</small></div></div>
      <div class="float glass f3"><span class="ico">💬</span><div><b>Kozmetikai tanácsadás</b><small>ingyenes · szalonunkban</small></div></div>
    </div>
  </div><div class="scroll-hint">görgess<i></i></div></section>

  <div class="wrap stats">
    <div class="stat glass rv"><b data-count="${P.length}">${P.length}</b><span>professzionális termék</span></div>
    <div class="stat glass rv"><b data-count="7">7</b><span>bőrtípusra válogatva</span></div>
    <div class="stat glass rv"><b data-count="14">14</b><span>napos visszaküldés</span></div>
    <div class="stat glass rv"><b data-count="${S.posts.length}">${S.posts.length}</b><span>szakcikk a blogon</span></div>
  </div>

  <section class="quote wrap rv"><p>Minden bőr más történetet mesél. Mi segítünk <em>meghallani</em> — és megadni neki azt, amire valóban szüksége van.</p></section>

  <section class="sec wrap">
    ${head('01', 'Milyen a bőröd?', 'Válaszd ki, mi jellemzi leginkább — megmutatjuk a hozzá illő termékeket.', '<a class="link-more" href="#/borom">Bőrtípus-választó →</a>')}
    <div class="bento">
      ${SKINS.map((s, i) => `<a href="#/borom/${s.k}" class="skin glass rv ${i === 0 ? 'big' : i === 3 || i === 4 ? 'wide' : ''}">
        <div class="bgimg" style="background-image:url(${s.img})"></div>
        <span class="pill count">${skinN(s)} termék</span>
        <h3>${s.name}</h3><p>${s.d}</p></a>`).join('')}
    </div>
  </section>

  <section class="sec wrap">
    ${head('02', 'Újdonságok', 'Friss érkezés az Alissi Brontë laboratóriumából — forgasd körbe!', '<a class="link-more" href="#/termekek?marka=alissi">Mind →</a>')}
    ${show.length ? `<div class="showcase glass rv">
      <div class="v3d" id="home3d">${hint3d}</div>
      <div class="sc-info" id="scInfo"></div>
    </div>` : ''}
    <div class="rail rv">${fresh.map(card).join('')}</div>
  </section>

  <section class="sec wrap">
    ${head('03', 'A mi márkáink', 'Kizárólag szalonokban használt, professzionális linea — most otthonra is.', '<a class="link-more" href="#/markak">Márkák →</a>')}
    <div class="brands">${BRANDS.map(b => { const ps = P.filter(p => p.brand === b.name); return `
      <a class="brand-card glass rv" href="#/marka/${b.k}"><span class="sec-num">${ps.length} termék</span><h3>${b.name}</h3><p>${b.tag}</p>
      <div class="imgs">${ps.slice(0, 5).map(p => `<img src="${pimg(p)}" alt="" loading="lazy">`).join('')}</div></a>`; }).join('')}</div>
  </section>

  <section class="sec wrap">
    ${head('04', 'Otthoni mini kezelés', 'Négy lépés, ahogy a kozmetikus is csinálná — a saját fürdőszobádban.')}
    <div class="ritual">
      ${[['Tisztítás', 'Az arctisztítás az alap: lemosó és tonik reggel-este, hogy a hatóanyagok be tudjanak jutni.', 'homlok', 'tisztito'],
         ['Hámlasztás', 'Heti 1–2 peeling eltávolítja az elhalt hámsejteket — ragyogóbb, simább bőr.', 'hero-vall', 'hamlaszto'],
         ['Maszk', 'Professzionális arcmaszk: intenzív hidratálás, feszesítés vagy nyugtatás — otthoni karnevál.', 'maszk', 'maszk'],
         ['Szérum és krém', 'A koncentrált szérum után a befejező krém zárja a kezelést.', 'szerum', 'szerum']]
        .map(([t, d, img, k], i) => `<a class="step glass rv" href="#/termekek?tipus=${k}"><div class="ph" style="background-image:url(media/${img}.jpg)"><span class="n">0${i + 1}</span></div><div class="t"><h3>${t}</h3><p>${d}</p></div></a>`).join('')}
    </div>
  </section>

  <section class="sec wrap">
    ${head('05', 'Skeyndor kedvencek', 'Tudományos bőrápolás, ahogy a szalonokban.', '<a class="link-more" href="#/marka/skeyndor">Mind →</a>')}
    <div class="rail rv">${bestSkeyndor.map(card).join('')}</div>
  </section>

  <section class="sec wrap">
    <div class="advice glass rv">
      <div class="ph" style="background-image:url(media/ket-no.jpg)"></div>
      <div class="t"><span class="sec-num">06</span><h2>Nem tudod, mi kell a bőrödnek?</h2>
        <p class="muted">Kozmetikusunk ingyen segít: szalonunkban bőrdiagnosztikával, telefonon vagy e-mailben tanácsot adunk, melyik termék illik hozzád.</p>
        <div class="hero-cta"><a class="btn btn-gold" href="tel:+36309661111">Hívj: +36 30/966-11-11</a><a class="btn btn-ghost" href="#/kapcsolat">Írj nekünk</a></div></div>
    </div>
    <div class="perks">
      <div class="perk glass rv"><span class="ico">🚚</span><b>Ingyenes szállítás</b><span>FoxPost csomagpontra 30 000 Ft felett</span></div>
      <div class="perk glass rv"><span class="ico">↩️</span><b>14 napos visszaküldés</b><span>bontatlan termékekre</span></div>
      <div class="perk glass rv"><span class="ico">🔒</span><b>Biztonságos fizetés</b><span>bankkártya, utánvét, átutalás</span></div>
      <div class="perk glass rv"><span class="ico">💆‍♀️</span><b>Szaktanácsadás</b><span>ingyenes, szalonunkban</span></div>
    </div>
  </section>

  <section class="sec wrap">
    ${head('07', 'A bőrápolás tudománya', 'Cikkek kozmetikusainktól — termékcsaládokról, rutinokról, bőrproblémákról.', '<a class="link-more" href="#/blog">Blog →</a>')}
    <div class="posts">${posts.map(postCard).join('')}</div>
  </section>`;
}
function showcase(list) {
  const el = $('#home3d'); if (!el || !list.length) return;
  let k = 0, viewer = null;
  const info = () => {
    const p = list[k];
    $('#scInfo').innerHTML = `<span class="card-brand">${esc(p.brand)}</span><h3>${esc(p.name)}</h3>
      <div class="prose sc-desc">${p.short || ''}</div>
      <div class="sc-buy"><span class="price">${ft(p.price)}</span>
        ${p.inStock ? `<button class="btn btn-gold" data-add="${p.id}">Kosárba</button>` : '<span class="stock no">● Elfogyott</span>'}
        <a class="btn btn-ghost" href="#/termek/${p.slug}">Részletek</a></div>
      <div class="sc-pick">${list.map((x, i) => `<button class="${i === k ? 'on' : ''}" data-k="${i}" aria-label="${esc(x.name)}"><img src="${pimg(x)}" alt=""></button>`).join('')}</div>`;
    $$('#scInfo [data-k]').forEach(b => b.onclick = () => { k = +b.dataset.k; info(); viewer?.setProduct(list[k]); });
  };
  info();
  v3dLib().then(m => { if (el.isConnected) { viewer = m.mount(el, list[0]); viewers.push(viewer); } }).catch(() => el.classList.add('no3d'));
}
const postCard = x => `<a class="post glass rv" href="#/blog/${x.slug}"><div class="ph" style="background-image:url(${x.image || 'media/szerum.jpg'})"></div>
  <div class="t"><time>${x.date.replaceAll('-', '. ')}.</time><h3>${esc(x.title)}</h3><p>${esc(x.excerpt)}</p></div></a>`;

function shop(params) {
  const st = {
    q: params.get('q') || '', marka: params.get('marka') || '', bor: params.get('bor') || '', tipus: params.get('tipus') || '',
    rend: params.get('rend') || 'ajanlott', keszlet: params.get('keszlet') === '1',
  };
  const html = `
  <section class="page wrap">
    <div class="page-head rv"><span class="sec-num">Webshop</span><h1>Termékek</h1><p>Szűrj márkára, bőrtípusra vagy terméktípusra — vagy keress rá arra, ami a bőrödnek kell.</p></div>
    <div class="shop">
      <aside class="filters glass" id="filters">
        <div><h4>Márka</h4><div class="chips">${BRANDS.map(b => `<button class="chip" data-f="marka" data-v="${b.k}">${b.name}</button>`).join('')}</div></div>
        <div><h4>Bőrtípus</h4><div class="chips">${SKINS.map(s => `<button class="chip" data-f="bor" data-v="${s.k}">${s.name}</button>`).join('')}</div></div>
        <div><h4>Terméktípus</h4><div class="chips">${TYPES.map(s => `<button class="chip" data-f="tipus" data-v="${s.k}">${s.name}</button>`).join('')}</div></div>
        <label class="chip" style="cursor:pointer;align-self:flex-start"><input type="checkbox" id="fStock" style="accent-color:var(--gold)"> Csak raktáron lévők</label>
        <button class="btn btn-ghost" id="fReset" style="justify-content:center">Szűrők törlése</button>
      </aside>
      <div>
        <div class="toolbar">
          <button class="btn btn-ghost filter-toggle" id="fToggle">Szűrők</button>
          <input type="search" id="fQ" placeholder="Keresés a termékek között…">
          <select id="fSort"><option value="ajanlott">Ajánlott</option><option value="olcso">Ár szerint növekvő</option><option value="draga">Ár szerint csökkenő</option><option value="nev">Név szerint</option></select>
          <span class="result-n" id="fN"></span>
        </div>
        <div class="grid" id="fGrid"></div>
      </div>
    </div>
  </section>`;
  setTimeout(() => {
    $('#fQ').value = st.q; $('#fSort').value = st.rend; $('#fStock').checked = st.keszlet;
    const draw = () => {
      let r = S.products.filter(p =>
        (!st.marka || brandKey(p.brand) === st.marka) &&
        (!st.bor || has(p, skinOf(st.bor).cats)) &&
        (!st.tipus || has(p, typeOf(st.tipus).cats)) &&
        (!st.keszlet || p.inStock) &&
        (!st.q || match(p, st.q)));
      if (st.rend === 'olcso') r.sort((a, b) => a.price - b.price);
      if (st.rend === 'draga') r.sort((a, b) => b.price - a.price);
      if (st.rend === 'nev') r.sort((a, b) => a.name.localeCompare(b.name, 'hu'));
      if (st.rend === 'ajanlott') r.sort((a, b) => b.inStock - a.inStock);
      $$('.chip[data-f]').forEach(c => c.classList.toggle('on', st[c.dataset.f] === c.dataset.v));
      $('#fN').textContent = r.length + ' termék';
      $('#fGrid').innerHTML = r.length ? r.map(card).join('') : `<div class="empty glass" style="grid-column:1/-1"><p>Nincs ilyen termék. Próbálj kevesebb szűrőt.</p></div>`;
      const qs = new URLSearchParams(Object.entries(st).filter(([k, v]) => v && !(k === 'rend' && v === 'ajanlott')).map(([k, v]) => [k, v === true ? '1' : v])).toString();
      history.replaceState(null, '', '#/termekek' + (qs ? '?' + qs : ''));
    };
    $$('.chip[data-f]').forEach(c => c.onclick = () => { st[c.dataset.f] = st[c.dataset.f] === c.dataset.v ? '' : c.dataset.v; draw(); });
    $('#fQ').oninput = e => { st.q = e.target.value.trim(); draw(); };
    $('#fSort').onchange = e => { st.rend = e.target.value; draw(); };
    $('#fStock').onchange = e => { st.keszlet = e.target.checked; draw(); };
    $('#fReset').onclick = () => { Object.assign(st, { q: '', marka: '', bor: '', tipus: '', keszlet: false }); $('#fQ').value = ''; $('#fStock').checked = false; draw(); };
    $('#fToggle').onclick = () => $('#filters').classList.toggle('open');
    draw();
  });
  return html;
}

function product(slug) {
  const p = bySlug(slug);
  if (!p) return notFound();
  const skins = SKINS.filter(s => has(p, s.cats));
  const rel = S.products.filter(x => x.id !== p.id && x.brand === p.brand && x.cats.some(c => p.cats.includes(c))).slice(0, 8);
  setTimeout(() => {
    let n = 1;
    mount3d($('#pd3d'), p);
    $$('.thumbs button').forEach(b => b.onclick = () => {
      const main = $('.gallery .main');
      if (b.dataset.mode === '3d') main.classList.add('is3d');
      else { main.classList.remove('is3d'); main.querySelector('img').src = b.dataset.src; }
      $$('.thumbs button').forEach(x => x.classList.toggle('on', x === b));
    });
    $$('.qty button').forEach(b => b.onclick = () => { n = Math.max(1, n + +b.dataset.d); $('.qty span').textContent = n; $('#buyBtn').dataset.n = n; });
  });
  return `
  <section class="page wrap">
    <div class="pd">
      <div class="gallery rv">
        <div class="main ${p.shape ? 'is3d' : ''}">
          ${p.shape ? `<div class="v3d" id="pd3d">${hint3d}</div>` : ''}
          <img src="${pimg(p)}" alt="${esc(p.name)}">
        </div>
        ${p.shape || p.images.length > 1 ? `<div class="thumbs">
          ${p.shape ? `<button class="on t3d" data-mode="3d"><b>3D</b></button>` : ''}
          ${p.images.map((s, i) => `<button class="${!p.shape && !i ? 'on' : ''}" data-src="${s}"><img src="${s}" alt=""></button>`).join('')}
        </div>` : ''}</div>
      <div class="rv">
        <a class="card-brand" href="#/marka/${brandKey(p.brand)}">${esc(p.brand)}</a>
        <h1>${esc(p.name)}</h1>
        <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap"><span class="price">${ft(p.price)}</span>
          <span class="stock ${p.inStock ? 'ok' : 'no'}">${p.inStock ? '● Raktáron' : '● Jelenleg elfogyott'}</span></div>
        ${p.short ? `<div class="prose">${p.short}</div>` : ''}
        <div class="buy">${p.inStock ? `<div class="qty"><button data-d="-1">−</button><span>1</span><button data-d="1">+</button></div><button class="btn btn-gold" id="buyBtn" data-add="${p.id}" data-n="1">Kosárba teszem</button>`
          : `<a class="btn btn-ghost" href="#/kapcsolat">Érdeklődöm, mikor érkezik</a>`}</div>
        ${skins.length ? `<div><span class="muted" style="font-size:14px">Ajánlott:</span><div class="tags">${skins.map(s => `<a class="chip" href="#/borom/${s.k}">${s.name}</a>`).join('')}</div></div>` : ''}
        <div class="tags">${p.cats.filter(c => !/^(SKEYNDOR|ALISSI|KLEANTHOUS)$/.test(c)).map(c => `<span class="pill">${esc(c)}</span>`).join('')}</div>
        <div class="perks" style="grid-template-columns:1fr 1fr;margin-top:6px">
          <div class="perk glass"><span class="ico">🚚</span><b>Ingyenes szállítás</b><span>30 000 Ft felett</span></div>
          <div class="perk glass"><span class="ico">💬</span><b>Kérdésed van?</b><span><a href="tel:+36309661111">+36 30/966-11-11</a></span></div>
        </div>
      </div>
    </div>
    ${p.desc ? `<div class="box glass prose rv"><h2 style="margin-top:0">Részletes leírás</h2>${p.desc}</div>` : ''}
    ${rel.length ? `<div class="sec">${head('', 'Ehhez illik még', '')}<div class="rail">${rel.map(card).join('')}</div></div>` : ''}
  </section>`;
}

function skinPage(k) {
  const s = skinOf(k);
  const list = s ? S.products.filter(p => has(p, s.cats)).sort((a, b) => b.inStock - a.inStock) : [];
  return `
  <section class="page wrap">
    <div class="page-head rv"><span class="sec-num">Bőrtípus-választó</span><h1>${s ? s.name : 'Milyen a bőröd?'}</h1><p>${s ? s.d : 'Kattints arra, ami leginkább jellemző rád — azonnal mutatjuk a hozzá illő termékeket.'}</p></div>
    <div class="skin-pick rv">${SKINS.map(x => `<button class="${x.k === k ? 'on' : ''}" onclick="location.hash='#/borom/${x.k}'"><b>${x.name}</b><span>${S.products.filter(p => has(p, x.cats)).length} termék</span></button>`).join('')}</div>
    ${s ? `<div class="grid">${list.map(card).join('')}</div>` : `<div class="advice glass rv"><div class="ph" style="background-image:url(media/hero-arc.jpg)"></div><div class="t"><h2>Bizonytalan vagy?</h2><p class="muted">Gyere be bőrdiagnosztikára, vagy hívj minket — kozmetikusunk ingyen segít eligazodni.</p><a class="btn btn-gold" href="tel:+36309661111" style="align-self:flex-start">+36 30/966-11-11</a></div></div>`}
  </section>`;
}

function brandsPage() {
  return `<section class="page wrap"><div class="page-head rv"><span class="sec-num">Márkák</span><h1>Szalonmárkáink</h1><p>Professzionális kozmetikumok, amelyeket a kozmetikusok is használnak — most otthonra.</p></div>
    <div class="brands">${BRANDS.map(b => { const ps = S.products.filter(p => p.brand === b.name); return `
      <a class="brand-card glass rv" href="#/marka/${b.k}"><span class="sec-num">${ps.length} termék</span><h3>${b.name}</h3><p>${b.tag}</p>
      <div class="imgs">${ps.slice(0, 5).map(p => `<img src="${pimg(p)}" alt="" loading="lazy">`).join('')}</div></a>`; }).join('')}</div></section>`;
}

function brandPage(k) {
  const b = BRANDS.find(x => x.k === k);
  if (!b) return notFound();
  const intro = S.brandIntro[b.page];
  const list = S.products.filter(p => p.brand === b.name).sort((a, c) => c.inStock - a.inStock);
  return `<section class="page wrap">
    <div class="page-head rv"><span class="sec-num">Márka · ${list.length} termék</span><h1>${b.name}</h1><p>${b.tag}</p></div>
    ${intro ? `<div class="box glass prose rv" style="margin-bottom:26px">${intro.paras.slice(0, 3).map(t => `<p>${esc(t)}</p>`).join('')}</div>` : ''}
    <div class="grid">${list.map(card).join('')}</div></section>`;
}

function blog() {
  return `<section class="page wrap"><div class="page-head rv"><span class="sec-num">Blog</span><h1>A bőrápolás tudománya</h1><p>${S.posts.length} cikk kozmetikusainktól — termékcsaládok, rutinok, bőrproblémák.</p></div>
    <div class="posts">${S.posts.map(postCard).join('')}</div></section>`;
}
function article(slug) {
  const x = S.posts.find(p => p.slug === slug);
  if (!x) return notFound();
  const more = S.posts.filter(p => p !== x).slice(0, 3);
  return `<section class="page wrap"><article class="article rv">
    <a class="link-more" href="#/blog">← Blog</a>
    <div class="page-head" style="margin-top:16px"><span class="sec-num">${x.date.replaceAll('-', '. ')}.</span><h1>${esc(x.title)}</h1></div>
    ${x.image ? `<div class="cover" style="background-image:url(${x.image})"></div>` : ''}
    <div class="prose">${x.html}</div></article>
    <div class="sec">${head('', 'További cikkek', '')}<div class="posts">${more.map(postCard).join('')}</div></div></section>`;
}
function legal(slug) {
  const x = S.pages[slug];
  if (!x) return notFound();
  return `<section class="page wrap"><article class="article"><div class="page-head"><h1>${esc(x.title)}</h1></div><div class="box glass prose">${x.html}</div></article></section>`;
}
function contact() {
  setTimeout(() => {
    $('#cForm').onsubmit = e => {
      e.preventDefault();
      e.target.outerHTML = `<div class="done glass"><h3>Köszönjük, ${esc(new FormData(e.target).get('nev'))}!</h3><p class="muted">Ez a bemutató változat, így az üzenet most nem megy el. Élesben ide érkezik: <b>${S.shop.email}</b></p></div>`;
    };
  });
  return `<section class="page wrap"><div class="page-head rv"><span class="sec-num">Kapcsolat</span><h1>Szívesen segítünk</h1><p>Kérdésed van egy termékről, vagy nem tudod, mi illik a bőrödhöz? Kozmetikusunk ingyen tanácsot ad.</p></div>
    <div class="contact">
      <div class="box glass rv" style="margin:0">
        <div class="perks" style="grid-template-columns:1fr 1fr;margin:0 0 18px">
          <a class="perk glass" href="tel:+36309661111"><span class="ico">📞</span><b>Telefon</b><span>${S.shop.phone}</span></a>
          <a class="perk glass" href="mailto:${S.shop.email}"><span class="ico">✉️</span><b>E-mail</b><span>${S.shop.email}</span></a>
          <div class="perk glass"><span class="ico">📍</span><b>Szalonunk</b><span>${S.shop.address}</span></div>
          <div class="perk glass"><span class="ico">🕗</span><b>Nyitvatartás</b><span>${S.shop.hours}</span></div>
        </div>
        <form class="form" id="cForm"><input name="nev" placeholder="Neved" required><input name="email" type="email" placeholder="E-mail címed" required><textarea name="uzenet" placeholder="Miben segíthetünk?" required></textarea><button class="btn btn-gold" style="align-self:flex-start">Üzenet küldése</button></form>
      </div>
      <div class="map rv"><div><span class="pill"><span class="dot"></span>Szalonunk</span><h2 style="font-size:32px">${S.shop.address}</h2><span class="muted">${S.shop.hours}</span>
        <a class="btn btn-gold" href="https://www.openstreetmap.org/?mlat=47.5206&mlon=19.0578#map=17/47.5206/19.0578" target="_blank" rel="noopener">Térkép megnyitása</a></div></div>
    </div></section>`;
}
function checkout() {
  const L = cart.lines;
  if (!L.length) return `<section class="page wrap"><div class="empty glass"><p style="font-size:40px;margin:0">🧴</p><p>Üres a kosarad.</p><a class="btn btn-gold" href="#/termekek">Vásárlás</a></div></section>`;
  const ship = cart.total >= S.shop.freeShipping ? 0 : 1290;
  setTimeout(() => {
    $('#oForm').onsubmit = e => {
      e.preventDefault();
      const f = new FormData(e.target);
      e.target.outerHTML = `<div class="done glass"><h3>Köszönjük a rendelést, ${esc(f.get('nev'))}!</h3>
        <p class="muted">Ez a bemutató változat: a rendelés most nem megy el, a kosarad megmarad. Élesben a webshop rendeléskezelője kapja meg, és visszaigazolást küld a(z) <b>${esc(f.get('email'))}</b> címre.</p>
        <a class="btn btn-ghost" href="#/termekek">Vissza a termékekhez</a></div>`;
    };
  });
  return `<section class="page wrap"><div class="page-head"><span class="sec-num">Pénztár</span><h1>Rendelés</h1></div>
    <div class="contact">
      <form class="box glass form" id="oForm" style="margin:0">
        <input name="nev" placeholder="Teljes név" required><input name="tel" placeholder="Telefonszám" required><input name="email" type="email" placeholder="E-mail" required>
        <input name="cim" placeholder="Szállítási cím vagy FoxPost csomagpont" required>
        <select name="mod" class="chip" style="padding:12px 16px;border-radius:14px;background:rgba(255,226,214,.06);color:var(--ink)"><option>FoxPost csomagpont</option><option>Házhozszállítás</option><option>Személyes átvétel a szalonban</option></select>
        <textarea name="megj" placeholder="Megjegyzés (nem kötelező)"></textarea>
        <button class="btn btn-gold" style="align-self:flex-start">Rendelés elküldése</button>
        <p class="muted" style="font-size:13px">A rendeléssel elfogadod az <a href="#/oldal/altalanos-szerzodesi-feltetelek" style="color:var(--gold)">ÁSZF</a>-et és az <a href="#/oldal/adatvedelmi-nyilatkozat" style="color:var(--gold)">adatvédelmi nyilatkozatot</a>.</p>
      </form>
      <div class="box glass" style="margin:0">${L.map(l => `<div class="ci"><img src="${pimg(l.p)}" alt=""><div class="n">${esc(l.p.name)}<div class="muted">${l.q} db</div></div><b>${ft(l.p.price * l.q)}</b></div>`).join('')}
        <div class="drawer-foot" style="padding:16px 0 0;border:0"><div class="sum" style="font-size:15px"><span>Szállítás</span><span>${ship ? ft(ship) : 'ingyenes'}</span></div><div class="sum"><span>Fizetendő</span><b>${ft(cart.total + ship)}</b></div></div></div>
    </div></section>`;
}
const notFound = () => `<section class="page wrap"><div class="empty glass"><h1>Ez az oldal nem található</h1><p><a class="btn btn-gold" href="#/">Vissza a főoldalra</a></p></div></section>`;

/* ---------- útválasztó ---------- */
function route() {
  const [path, qs] = location.hash.slice(1).split('?');
  const seg = (path || '/').split('/').filter(Boolean);
  const params = new URLSearchParams(qs || '');
  const r = seg[0] || '';
  const view = {
    '': () => home(), termekek: () => shop(params), termek: () => product(seg[1]), borom: () => skinPage(seg[1]),
    markak: () => brandsPage(), marka: () => brandPage(seg[1]), blog: () => seg[1] ? article(seg[1]) : blog(),
    oldal: () => legal(seg[1]), kapcsolat: () => contact(), penztar: () => checkout(),
  }[r] || notFound;
  if (route.last === r + '/' + (seg[1] || '') && r === 'termekek') return; // a szűrő maga írja át a címet
  route.last = r + '/' + (seg[1] || '');
  disposeViewers();
  app.innerHTML = view();
  drawer(false);
  $('#navLinks').classList.remove('open');
  $$('#navLinks a').forEach(a => a.classList.toggle('on', a.getAttribute('href').slice(2).split('/')[0] === (r === 'termek' ? 'termekek' : r === 'marka' ? 'markak' : r)));
  document.body.classList.toggle('deep', r !== '');
  document.title = r ? ($('h1')?.textContent || 'Krémvilág') + ' · Krémvilág' : 'Krémvilág';
  window.scrollTo({ top: 0, behavior: 'instant' });
  reveal();
}
window.addEventListener('hashchange', route);
$('#menuBtn').onclick = () => $('#navLinks').classList.toggle('open');

/* ---------- megjelenés, számlálók ---------- */
const io = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  e.target.classList.add('in'); io.unobserve(e.target);
  $$('[data-count]', e.target).forEach(countUp);
}), { threshold: .12 });
function reveal() {
  $$('.rv:not(.in)').forEach(el => { const r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) el.classList.add('in', 'seen'); else io.observe(el); });
  $$('.rv.seen [data-count]').forEach(countUp);
}
function countUp(el) {
  const to = +el.dataset.count, t0 = performance.now();
  const step = t => { const k = Math.min(1, (t - t0) / 1400); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

/* ---------- mozgó háttér: krémet kenő nők videói váltakozva ---------- */
const SCENES = ['hero-kez', 'hero-nyak', 'hero-vall', 'hero-arc'];
async function background() {
  const box = $('#bgMedia');
  // media.json: mely jelenetekhez van már mozgó videó (a többi kép, lassú Ken Burns-mozgással)
  let vids = [];
  try { vids = (await (await fetch('media/media.json', { cache: 'no-store' })).json()).videos || []; } catch {}
  const els = SCENES.map(n => {
    if (!vids.includes(n)) { const im = new Image(); im.src = `media/${n}.jpg`; im.alt = ''; box.appendChild(im); return im; }
    const v = document.createElement('video');
    Object.assign(v, { muted: true, loop: true, playsInline: true, preload: 'auto', poster: `media/${n}.jpg` });
    v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
    v.src = `media/${n}.mp4`;
    // ha nincs videó (vagy nem játszható), a képet mutatjuk lassú Ken Burns-mozgással
    v.onerror = () => { const im = new Image(); im.src = `media/${n}.jpg`; im.alt = ''; im.className = v.className; v.replaceWith(im); els[els.indexOf(v)] = im; };
    box.appendChild(v);
    return v;
  });
  let i = 0;
  const show = () => {
    els.forEach((el, k) => {
      el.classList.toggle('on', k === i);
      if (el.tagName === 'VIDEO') { if (k === i) { el.currentTime = 0; el.play().catch(() => {}); } else setTimeout(() => el.pause(), 2500); }
    });
    i = (i + 1) % els.length;
  };
  show();
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) setInterval(show, 9000);
}

/* csillámló krémcseppek a háttérben */
function sparkle() {
  const c = $('#sparkle'), x = c.getContext('2d');
  let W, H, dots;
  const size = () => {
    W = c.width = innerWidth * devicePixelRatio; H = c.height = innerHeight * devicePixelRatio;
    dots = Array.from({ length: Math.round(innerWidth / 18) }, () => ({ x: Math.random() * W, y: Math.random() * H, r: (Math.random() * 1.8 + .4) * devicePixelRatio, v: Math.random() * .25 + .05, p: Math.random() * 6.28 }));
  };
  size(); addEventListener('resize', size);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const tick = t => {
    x.clearRect(0, 0, W, H);
    for (const d of dots) {
      d.y -= d.v * devicePixelRatio; d.x += Math.sin(t / 2000 + d.p) * .2;
      if (d.y < -10) { d.y = H + 10; d.x = Math.random() * W; }
      const a = .25 + .35 * Math.sin(t / 700 + d.p) ** 2;
      x.beginPath(); x.arc(d.x, d.y, d.r, 0, 6.28);
      x.fillStyle = `rgba(246,220,192,${a})`; x.shadowColor = 'rgba(246,220,192,.8)'; x.shadowBlur = 8 * devicePixelRatio; x.fill();
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ---------- frissítés-jelző (új verzió esetén gomb) ---------- */
async function checkUpdate() {
  try {
    const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
    const v = (await r.json()).version;
    if (v && v !== VERSION) $('#updateBtn').hidden = false;
  } catch {}
}
$('#updateBtn').onclick = () => location.reload();
setInterval(checkUpdate, 60000);

/* ---------- indítás ---------- */
(async () => {
  background(); sparkle();
  S = await (await fetch('data/site.json?v=' + VERSION)).json();
  renderCart();
  route();
  addEventListener('scroll', () => $('#nav').style.background = scrollY > 40 ? 'rgba(30,18,23,.82)' : '', { passive: true });
})();
