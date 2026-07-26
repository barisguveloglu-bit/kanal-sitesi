/*
 * KANLI GÖZ — göz çizimi
 * ---------------------------------------------------------------
 * Gözü SVG olarak üretir. Görsel dosya yok, her şey kodla çiziliyor:
 * iris lifleri, kript lekeleri, limbal halka, kan damarları ve
 * dış kadran halkası.
 *
 * Katmanlar (içten dışa):
 *   göz bebeği → iris lifleri → kollaret → kriptler → limbal halka
 *   → kan damarları → ince çember → kadran halkası
 */

const GOZ_AYAR = {
  merkez: 400,
  bebekYaricap: 76,
  irisIc: 84,
  irisDis: 226,
  kollaret: 132,
  limbal: 232,
  inceCember: 300,
  kadranIc: 328,
  kadranDis: 352,
  lifSayisi: 320,
  kadranSayisi: 190,
  damarSayisi: 46,
  kriptSayisi: 16,
};

/*
 * Sabit görünüm için tohumlu rastgele — her yenilemede aynı göz çizilir.
 * mulberry32: basit doğrusal üreteçlerin aksine ardışık değerleri
 * kümelenmiyor, yoksa lifler bir tarafta topaklanıyor.
 */
function rastgeleUret(tohum) {
  let t = tohum >>> 0;
  return function () {
    t = (t + 0x6d2b79f5) >>> 0;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function kutupsal(merkez, aci, yaricap) {
  return [
    merkez + Math.cos(aci) * yaricap,
    merkez + Math.sin(aci) * yaricap,
  ];
}

function gozSvgUret() {
  const a = GOZ_AYAR;
  const C = a.merkez;
  const rast = rastgeleUret(20260726);
  const TAU = Math.PI * 2;
  const parcalar = [];

  /* --- İris lifleri --- */
  const lifler = [];
  for (let i = 0; i < a.lifSayisi; i++) {
    const aci = (i / a.lifSayisi) * TAU;
    const dis = a.irisDis - 16 + rast() * 18;
    const ic = a.irisIc + rast() * 6;
    const [x1, y1] = kutupsal(C, aci, ic);
    const [x2, y2] = kutupsal(C, aci, dis);
    const solukluk = (0.22 + rast() * 0.62).toFixed(2);
    const kalinlik = (0.6 + rast() * 1.5).toFixed(2);
    lifler.push(
      `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="url(#lifBoya)" stroke-width="${kalinlik}" opacity="${solukluk}"/>`
    );
  }

  /* Lifleri kıran ikinci katman — dokuyu derinleştiriyor */
  const kirikLifler = [];
  const kirikSayisi = Math.floor(a.lifSayisi / 2);
  for (let i = 0; i < kirikSayisi; i++) {
    // Eşit dağıt, üstüne sapma ver — saf rastgele açı topaklanma yapıyor
    const aci = (i / kirikSayisi) * TAU + (rast() - 0.5) * 0.12;
    const bas = a.kollaret + rast() * 40;
    const son = bas + 30 + rast() * 60;
    const [x1, y1] = kutupsal(C, aci, bas);
    const [x2, y2] = kutupsal(C, aci, Math.min(son, a.irisDis - 6));
    kirikLifler.push(
      `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#ffa270" stroke-width="0.7" opacity="${(0.04 + rast() * 0.11).toFixed(2)}"/>`
    );
  }

  /* --- Kript lekeleri (irisin koyu boşlukları) --- */
  const kriptler = [];
  for (let i = 0; i < a.kriptSayisi; i++) {
    const aci = (i / a.kriptSayisi) * TAU + rast() * 0.3;
    const r = a.kollaret + 6 + rast() * 46;
    const [x, y] = kutupsal(C, aci, r);
    const rx = 7 + rast() * 13;
    const ry = 4 + rast() * 8;
    const donme = ((aci * 180) / Math.PI).toFixed(1);
    kriptler.push(
      `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" transform="rotate(${donme} ${x.toFixed(1)} ${y.toFixed(1)})" fill="#2b0805" opacity="${(0.3 + rast() * 0.4).toFixed(2)}"/>`
    );
  }

  /* --- Kan damarları (irisin dışına taşan) --- */
  const damarlar = [];
  for (let i = 0; i < a.damarSayisi; i++) {
    const aci = (i / a.damarSayisi) * TAU + (rast() - 0.5) * 0.1;
    const bas = a.limbal + 4;
    // İnce çemberi aşmasınlar — yoksa kadran halkasını çizik gibi keserler
    const son = Math.min(bas + 22 + rast() * 46, a.inceCember - 8);
    const sapma = (rast() - 0.5) * 0.34;
    const [x1, y1] = kutupsal(C, aci, bas);
    const [xk, yk] = kutupsal(C, aci + sapma * 0.5, (bas + son) / 2);
    const [x2, y2] = kutupsal(C, aci + sapma, son);
    damarlar.push(
      `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} Q${xk.toFixed(1)} ${yk.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}" fill="none" stroke="#8e1d12" stroke-width="${(0.4 + rast() * 0.8).toFixed(2)}" opacity="${(0.06 + rast() * 0.2).toFixed(2)}"/>`
    );
  }

  /* --- Dış kadran halkası --- */
  const kadran = [];
  for (let i = 0; i < a.kadranSayisi; i++) {
    const aci = (i / a.kadranSayisi) * TAU - Math.PI / 2;
    const uzun = i % 10 === 0;
    const ic = a.kadranIc + (uzun ? -6 : 0);
    const dis = a.kadranDis - (uzun ? 0 : 6 + rast() * 7);
    const [x1, y1] = kutupsal(C, aci, ic);
    const [x2, y2] = kutupsal(C, aci, dis);
    kadran.push(
      `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#e8ddd4" stroke-width="${uzun ? 1.5 : 1}" opacity="${uzun ? 0.75 : (0.25 + rast() * 0.4).toFixed(2)}"/>`
    );
  }

  parcalar.push(`
  <defs>
    <radialGradient id="irisParilti" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ff7a45" stop-opacity="0.85"/>
      <stop offset="45%" stop-color="#d63a1e" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#3a0b06" stop-opacity="0"/>
    </radialGradient>
    <!-- Lif rengi yarıçapa göre değişmeli: göz bebeğinin dibinde parlak,
         dış kenarda koyu. Bu yüzden userSpaceOnUse radyal gradyan. -->
    <radialGradient id="lifBoya" gradientUnits="userSpaceOnUse"
                    cx="${C}" cy="${C}" r="${a.irisDis}">
      <stop offset="0%" stop-color="#ffcda3"/>
      <stop offset="26%" stop-color="#ff8b4a"/>
      <stop offset="55%" stop-color="#e04a22"/>
      <stop offset="80%" stop-color="#a52a14"/>
      <stop offset="100%" stop-color="#4d1108"/>
    </radialGradient>
    <radialGradient id="bebekBoya" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#000000"/>
      <stop offset="78%" stop-color="#080304"/>
      <stop offset="100%" stop-color="#1e0704"/>
    </radialGradient>
    <radialGradient id="limbalBoya" cx="50%" cy="50%" r="50%">
      <stop offset="82%" stop-color="#2a0906" stop-opacity="0"/>
      <stop offset="94%" stop-color="#1a0503" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#0a0202" stop-opacity="0.35"/>
    </radialGradient>
    <filter id="yumusakParilti" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="26"/>
    </filter>
    <filter id="hafifBulanik" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="1.1"/>
    </filter>
  </defs>`);

  /* Arka parıltı */
  parcalar.push(
    `<circle cx="${C}" cy="${C}" r="${a.irisDis + 34}" fill="url(#irisParilti)" filter="url(#yumusakParilti)" class="goz-parilti"/>`
  );

  /* İris tabanı */
  parcalar.push(
    `<circle cx="${C}" cy="${C}" r="${a.irisDis}" fill="#4a0f08"/>`
  );

  /* Lifler — yavaş dönüyor */
  parcalar.push(
    `<g class="goz-lifler" filter="url(#hafifBulanik)">${lifler.join("")}${kirikLifler.join("")}</g>`
  );

  /* Kollaret halkası */
  parcalar.push(
    `<circle cx="${C}" cy="${C}" r="${a.kollaret}" fill="none" stroke="#ffb488" stroke-width="1.6" opacity="0.2"/>`,
    `<circle cx="${C}" cy="${C}" r="${a.kollaret - 7}" fill="none" stroke="#8f2415" stroke-width="5" opacity="0.28"/>`
  );

  parcalar.push(`<g>${kriptler.join("")}</g>`);

  /* Limbal halka — irisin koyu dış sınırı */
  parcalar.push(
    `<circle cx="${C}" cy="${C}" r="${a.irisDis}" fill="url(#limbalBoya)"/>`,
    `<circle cx="${C}" cy="${C}" r="${a.limbal}" fill="none" stroke="#160403" stroke-width="13" opacity="0.7"/>`
  );

  parcalar.push(`<g>${damarlar.join("")}</g>`);

  /* Göz bebeği — nefes alıp veriyor */
  parcalar.push(
    `<g class="goz-bebek" style="transform-origin:${C}px ${C}px">
       <circle cx="${C}" cy="${C}" r="${a.bebekYaricap + 5}" fill="#120302" opacity="0.9"/>
       <circle cx="${C}" cy="${C}" r="${a.bebekYaricap}" fill="url(#bebekBoya)"/>
       <circle cx="${C}" cy="${C}" r="${a.bebekYaricap}" fill="none" stroke="#ff5a3c" stroke-width="1.2" opacity="0.4"/>
     </g>`
  );

  /* Işık yansıması — irisin üst kenarında, çok hafif */
  parcalar.push(
    `<ellipse cx="${C - 96}" cy="${C - 112}" rx="52" ry="30" fill="#fff1e6" opacity="0.045" transform="rotate(-34 ${C - 96} ${C - 112})" filter="url(#yumusakParilti)"/>`
  );

  /* İnce çember */
  parcalar.push(
    `<circle cx="${C}" cy="${C}" r="${a.inceCember}" fill="none" stroke="#c0392a" stroke-width="1.2" opacity="0.4"/>`
  );

  /* Kadran halkası — ters yönde dönüyor */
  parcalar.push(
    `<g class="goz-kadran" style="transform-origin:${C}px ${C}px">${kadran.join("")}</g>`
  );

  /* Tepedeki kırmızı işaret */
  parcalar.push(
    `<rect x="${C - 3}" y="${C - a.kadranDis - 16}" width="6" height="34" rx="2" fill="#ff3b2d" class="goz-isaret"/>`
  );

  return `<svg viewBox="0 0 800 800" class="goz-svg" role="img"
    aria-label="Kanlı Göz — kırmızı iris ve siyah göz bebeği">${parcalar.join("")}</svg>`;
}

function gozuKur() {
  const hedef = document.querySelector("[data-goz]");
  if (!hedef) return;
  hedef.innerHTML = gozSvgUret();
}
