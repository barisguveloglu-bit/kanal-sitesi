/*
 * 3D Türkiye haritası (mafya.html)
 * -----------------------------------------------------------------
 * Düz WebGL; dış kütüphane, derleme adımı yok. Veri iki dosyada:
 *   assets/harita/harita-veri.js  yükseklik ızgarası, il kimlik haritası, il noktaları
 *   assets/harita/renk.jpg        gölgeli fiziki harita dokusu
 * İkisi de harita ekrana yaklaşınca yüklenir; sayfanın ilk açılışını
 * yavaşlatmaz. Nasıl üretildikleri ve lisansları: assets/harita/KAYNAK.md
 *
 * Hangi ilin hangi cepheye bağlı olduğu ve derebeyi bilgisi data.js'ten
 * gelir (IL_DEREBEYLERI, KOMUTANLAR), renkler style.css'teki
 * [data-bolge] --bolge-renk'ten. Burada tekrar yazılmaz.
 *
 * WebGL yoksa ya da dosyalar inmezse harita yerine kısa bir not çıkar;
 * il seçimi ve bilgi kutusu yine çalışır, 81 il listesi zaten aşağıda.
 */
(function () {
  "use strict";

  const kok = document.querySelector("[data-harita3d]");
  if (!kok) return;

  const sahne = kok.querySelector("[data-harita3d-sahne]");
  const durum = kok.querySelector("[data-harita3d-durum]");
  const araclar = kok.querySelector("[data-harita3d-araclar]");
  const etiketKutusu = kok.querySelector("[data-harita3d-etiketler]");
  const ipucu = kok.querySelector("[data-harita3d-ipucu]");
  const bilgi = kok.querySelector("[data-harita3d-bilgi]");
  const lejant = kok.querySelector("[data-harita3d-lejant]");
  const kabartmaDugme = kok.querySelector("[data-harita3d-kabartma]");

  const VERI_ADRESI = "assets/harita/harita-veri.js";
  const DOKU_ADRESI = "assets/harita/renk.jpg";
  const GORUS = (40 * Math.PI) / 180; // dikey görüş açısı
  const ZEMIN = [10 / 255, 10 / 255, 12 / 255]; // --bg
  const KALKIS_KM = 9; // seçili ilin yukarı kalkması
  const KABARTMALAR = [12, 24, 4]; // yükseklik abartısı (kat)
  const azHareket =
    !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const iller = typeof IL_DEREBEYLERI !== "undefined" ? IL_DEREBEYLERI : [];
  const komutanlar = typeof KOMUTANLAR !== "undefined" ? KOMUTANLAR : [];
  const ilNo = new Map(iller.map((d) => [d.plaka, d]));
  const komutanNo = new Map(komutanlar.map((k) => [k.id, k]));

  function kacis(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);
  }
  const iki = (n) => String(n).padStart(2, "0");

  /* ---------------------------------------------------------------
     Harita dışı parçalar: lejant, bilgi kutusu, 81 il listesine bağ.
     Bunlar WebGL olmadan da çalışır. (Sitede giriş alanı yok; il
     seçmenin klavye ve ekran okuyucu yolu listedeki düğmeler.)
     --------------------------------------------------------------- */
  lejant.innerHTML = komutanlar
    .map((k) => `
      <li data-bolge="${kacis(k.id)}">
        <span class="harita3d-renk" aria-hidden="true"></span>
        ${kacis(k.bolge)} Cephesi · ${k.ad ? kacis(k.ad) : "isimsiz komutan"}
      </li>`)
    .join("");

  // app.js'in bastığı 81 il kutusuna "Haritada göster" düğmesi ekle.
  // icerik-hazir birden çok kez gelebilir; aynı kutuya iki düğme konmasın.
  function listeyiBagla() {
    document.querySelectorAll(".derebeyi").forEach((kutu) => {
      if (kutu.dataset.haritaBagli) return;
      const plaka = kutu.querySelector(".derebeyi-plaka");
      const no = plaka ? parseInt(plaka.textContent, 10) : 0;
      const d = ilNo.get(no);
      if (!d) return;
      kutu.dataset.haritaBagli = "1";
      const dugme = document.createElement("button");
      dugme.type = "button";
      dugme.className = "derebeyi-haritada";
      dugme.textContent = "Haritada göster";
      dugme.setAttribute("aria-label", `${d.il}: haritada göster`);
      dugme.addEventListener("click", () => haritayaGit(no));
      kutu.appendChild(dugme);
    });
  }
  document.addEventListener("icerik-hazir", listeyiBagla);
  listeyiBagla();

  // Önce haritaya kay, il kaydırma bitince seçilsin. Kayarken bilgi
  // kutusu büyürse tarayıcının kaydırma çapası yumuşak kaydırmayı yarıda
  // kesiyor (telefonda harita ekranın üstünde kalıyordu).
  function haritayaGit(no) {
    const r = kok.getBoundingClientRect();
    if (azHareket || (r.top >= 0 && r.top < window.innerHeight * 0.4)) {
      kok.scrollIntoView({ block: "start" });
      sec(no, true);
      return;
    }
    let bitti = false;
    const devam = () => {
      if (bitti) return;
      bitti = true;
      window.removeEventListener("scrollend", devam);
      clearTimeout(zaman);
      sec(no, true);
    };
    const zaman = setTimeout(devam, 1500);
    window.addEventListener("scrollend", devam);
    kok.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function bilgiGoster(no) {
    const d = ilNo.get(no);
    if (!d) {
      bilgi.innerHTML =
        '<p class="harita3d-ipucu-metin">Haritada bir ile dokun: oranın derebeyi ve ' +
        "bağlı olduğu cephe burada çıkar.</p>";
      return;
    }
    const k = komutanNo.get(d.komutan);
    bilgi.innerHTML = `
      <div class="harita3d-il" data-bolge="${kacis(d.komutan)}">
        <span class="harita3d-plaka">${iki(d.plaka)}</span>
        <h3>${kacis(d.il)}</h3>
        <p class="harita3d-derebeyi">
          <strong>${d.ad ? kacis(d.ad) : "İsimsiz derebeyi"}</strong>${d.kim ? " — " + kacis(d.kim) : ""}
        </p>
        ${k ? `<p class="harita3d-cephe">${kacis(k.bolge)} Cephesi · Komutan: ${k.ad ? kacis(k.ad) : "isimsiz"}</p>` : ""}
      </div>`;
  }
  bilgiGoster(0);

  /* ---------------------------------------------------------------
     Matris yardımcıları (sütun öncelikli, WebGL düzeni)
     --------------------------------------------------------------- */
  function perspektif(fy, en, yakin, uzak) {
    const t = 1 / Math.tan(fy / 2), nf = 1 / (yakin - uzak);
    return new Float32Array([
      t / en, 0, 0, 0,
      0, t, 0, 0,
      0, 0, (uzak + yakin) * nf, -1,
      0, 0, 2 * uzak * yakin * nf, 0,
    ]);
  }

  function bakis(g, h, y) {
    let zx = g[0] - h[0], zy = g[1] - h[1], zz = g[2] - h[2];
    let l = Math.hypot(zx, zy, zz);
    zx /= l; zy /= l; zz /= l;
    let xx = y[1] * zz - y[2] * zy, xy = y[2] * zx - y[0] * zz, xz = y[0] * zy - y[1] * zx;
    l = Math.hypot(xx, xy, xz);
    xx /= l; xy /= l; xz /= l;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    return new Float32Array([
      xx, yx, zx, 0,
      xy, yy, zy, 0,
      xz, yz, zz, 0,
      -(xx * g[0] + xy * g[1] + xz * g[2]),
      -(yx * g[0] + yy * g[1] + yz * g[2]),
      -(zx * g[0] + zy * g[1] + zz * g[2]),
      1,
    ]);
  }

  function carp(a, b) {
    const o = new Float32Array(16);
    for (let s = 0; s < 4; s++) {
      for (let r = 0; r < 4; r++) {
        o[s * 4 + r] =
          a[r] * b[s * 4] + a[4 + r] * b[s * 4 + 1] + a[8 + r] * b[s * 4 + 2] + a[12 + r] * b[s * 4 + 3];
      }
    }
    return o;
  }

  function ters(a) {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10;
    const b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11;
    const b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30;
    const b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31;
    const b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) return null;
    det = 1 / det;
    return new Float32Array([
      (a11 * b11 - a12 * b10 + a13 * b09) * det,
      (a02 * b10 - a01 * b11 - a03 * b09) * det,
      (a31 * b05 - a32 * b04 + a33 * b03) * det,
      (a22 * b04 - a21 * b05 - a23 * b03) * det,
      (a12 * b08 - a10 * b11 - a13 * b07) * det,
      (a00 * b11 - a02 * b08 + a03 * b07) * det,
      (a32 * b02 - a30 * b05 - a33 * b01) * det,
      (a20 * b05 - a22 * b02 + a23 * b01) * det,
      (a10 * b10 - a11 * b08 + a13 * b06) * det,
      (a01 * b08 - a00 * b10 - a03 * b06) * det,
      (a30 * b04 - a31 * b02 + a33 * b00) * det,
      (a21 * b02 - a20 * b04 - a23 * b00) * det,
      (a11 * b07 - a10 * b09 - a12 * b06) * det,
      (a00 * b09 - a01 * b07 + a02 * b06) * det,
      (a31 * b01 - a30 * b03 - a32 * b00) * det,
      (a20 * b03 - a21 * b01 + a22 * b00) * det,
    ]);
  }

  function donustur(m, x, y, z) {
    return [
      m[0] * x + m[4] * y + m[8] * z + m[12],
      m[1] * x + m[5] * y + m[9] * z + m[13],
      m[2] * x + m[6] * y + m[10] * z + m[14],
      m[3] * x + m[7] * y + m[11] * z + m[15],
    ];
  }

  /* ---------------------------------------------------------------
     Durum
     --------------------------------------------------------------- */
  let V = null;          // HARITA_VERI
  let resim = null;      // renk.jpg
  let yuks = null;       // yükseklik ızgarası (km, abartısız)
  let kimlik = null;     // il kimlik haritası (plaka, 0 = Türkiye dışı)
  let GX = 0, GZ = 0, GEN = 1, YUK = 1;

  let tuval = null, gl = null, kayip = false, hazir = false;
  let program = null, konum = {}, tampon = null, indeksTampon = null;
  let indeksSayisi = 0, indeksTuru = 0;
  let dokuRenk = null, dokuTint = null, dokuSecim = null, secimTampon = null;

  let abartiSira = 0;
  let abarti = KABARTMALAR[0];
  let secili = 0;
  let kalkis = 0, kalkisHedef = 0;
  let tamEkran = false;
  let planli = false;
  let mvp = null, tersMvp = null;

  const kam = { hx: 0, hz: 0, yon: 0, egim: 0.95, uzak: 1500 };
  let enYakin = 45, enUzak = 4000;
  let ucus = null;

  /* ---------------------------------------------------------------
     Arazi örnekleme
     --------------------------------------------------------------- */
  function yukseklik(x, z) {
    const u = x / GEN + 0.5, v = z / YUK + 0.5;
    if (!yuks || u < 0 || u > 1 || v < 0 || v > 1) return 0;
    const fx = u * (GX - 1), fz = v * (GZ - 1);
    const i = Math.min(GX - 2, Math.floor(fx)), j = Math.min(GZ - 2, Math.floor(fz));
    const a = fx - i, b = fz - j, k = j * GX + i;
    return (
      (yuks[k] * (1 - a) + yuks[k + 1] * a) * (1 - b) +
      (yuks[k + GX] * (1 - a) + yuks[k + GX + 1] * a) * b
    );
  }

  function kimlikAl(u, v) {
    if (!kimlik || u < 0 || u >= 1 || v < 0 || v >= 1) return 0;
    return kimlik[Math.floor(v * V.il.yukseklik) * V.il.genislik + Math.floor(u * V.il.genislik)];
  }

  // Çizilen yüzeyin yüksekliği: abartı ve seçili ilin kalkışı dahil.
  function yuzey(x, z) {
    const kalk = secili && kimlikAl(x / GEN + 0.5, z / YUK + 0.5) === secili ? kalkis : 0;
    return yukseklik(x, z) * abarti + kalk;
  }

  /* ---------------------------------------------------------------
     Kamera
     --------------------------------------------------------------- */
  function sigdirUzaklik() {
    const en = Math.max(0.3, tuval.clientWidth / Math.max(1, tuval.clientHeight));
    const t = Math.tan(GORUS / 2);
    return Math.max((GEN * 0.47) / (t * en), (YUK * 0.6) / t);
  }

  function baslangicKamera() {
    // Dar ekranda ülke ince bir şerit gibi kalmasın: biraz daha yukarıdan bak.
    const dar = tuval.clientWidth / Math.max(1, tuval.clientHeight) < 1.3;
    return { hx: 0, hz: YUK * 0.05, yon: 0, egim: dar ? 1.05 : 0.95, uzak: sigdirUzaklik() };
  }

  function sinirla() {
    kam.egim = Math.min(1.45, Math.max(0.22, kam.egim));
    kam.uzak = Math.min(enUzak, Math.max(enYakin, kam.uzak));
    kam.hx = Math.min(GEN / 2, Math.max(-GEN / 2, kam.hx));
    kam.hz = Math.min(YUK / 2, Math.max(-YUK / 2, kam.hz));
  }

  function matrisKur() {
    const ce = Math.cos(kam.egim), se = Math.sin(kam.egim);
    const hy = yukseklik(kam.hx, kam.hz) * abarti;
    const hedef = [kam.hx, hy, kam.hz];
    const goz = [
      kam.hx + kam.uzak * Math.sin(kam.yon) * ce,
      hy + kam.uzak * se,
      kam.hz + kam.uzak * Math.cos(kam.yon) * ce,
    ];
    // Kamera hiçbir zaman dağın içine girmesin.
    const alt = yukseklik(goz[0], goz[2]) * abarti + 3;
    if (goz[1] < alt) goz[1] = alt;
    const en = tuval.width / Math.max(1, tuval.height);
    const yakin = Math.max(0.5, kam.uzak * 0.02);
    const uzak = kam.uzak * 3 + Math.max(GEN, YUK) * 2;
    mvp = carp(perspektif(GORUS, en, yakin, uzak), bakis(goz, hedef, [0, 1, 0]));
    tersMvp = ters(mvp);
  }

  function uc(hedef, sure) {
    const h = Object.assign({}, hedef);
    if (h.yon !== undefined) {
      let d = h.yon - kam.yon;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      h.yon = kam.yon + d;
    }
    if (azHareket || !sure) {
      Object.assign(kam, h);
      ucus = null;
      sinirla();
      iste();
      return;
    }
    ucus = { bas: Object.assign({}, kam), hedef: h, t0: performance.now(), sure };
    requestAnimationFrame(ucusAdimi);
  }

  function ucusAdimi() {
    if (!ucus) return;
    const t = Math.min(1, (performance.now() - ucus.t0) / ucus.sure);
    const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    for (const ad in ucus.hedef) {
      if (ad === "uzak") {
        const a = Math.log(ucus.bas.uzak), b = Math.log(ucus.hedef.uzak);
        kam.uzak = Math.exp(a + (b - a) * e);
      } else {
        kam[ad] = ucus.bas[ad] + (ucus.hedef[ad] - ucus.bas[ad]) * e;
      }
    }
    sinirla();
    iste();
    if (t < 1) requestAnimationFrame(ucusAdimi);
    else ucus = null;
  }

  function dondur(dx, dy) {
    kam.yon -= dx * 0.006;
    kam.egim += dy * 0.005;
    sinirla();
    iste();
  }

  // Ekrandaki sürüklemeyi zemindeki kaymaya çevir: harita parmağı izlesin.
  function kaydir(dx, dy) {
    const k = (2 * kam.uzak * Math.tan(GORUS / 2)) / Math.max(1, tuval.clientHeight);
    const s = Math.sin(kam.yon), c = Math.cos(kam.yon);
    const ileri = (dy * k) / Math.max(Math.sin(kam.egim), 0.35);
    kam.hx += -c * dx * k - s * ileri;
    kam.hz += s * dx * k - c * ileri;
    sinirla();
    iste();
  }

  function yakinlas(kat) {
    kam.uzak *= kat;
    sinirla();
    iste();
  }

  /* ---------------------------------------------------------------
     Seçim: ekrandaki noktadan ışın, arazide ilk değdiği yer
     --------------------------------------------------------------- */
  function ilBul(px, py) {
    if (!tersMvp) return 0;
    const nx = (px / tuval.clientWidth) * 2 - 1, ny = 1 - (py / tuval.clientHeight) * 2;
    const a = donustur(tersMvp, nx, ny, -1), b = donustur(tersMvp, nx, ny, 1);
    const p0 = [a[0] / a[3], a[1] / a[3], a[2] / a[3]];
    const p1 = [b[0] / b[3], b[1] / b[3], b[2] / b[3]];
    const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
    if (Math.abs(d[1]) < 1e-9) return 0;

    // Işını arazinin bulunabileceği yükseklik aralığıyla sınırla.
    const tepe = V.yukselti.hmaxKm * abarti + KALKIS_KM + 1;
    let t0 = (tepe - p0[1]) / d[1], t1 = (0 - p0[1]) / d[1];
    if (t0 > t1) [t0, t1] = [t1, t0];
    t0 = Math.max(t0, 0);
    t1 = Math.min(t1, 1);
    if (t0 >= t1) return 0;

    const boy = Math.hypot(d[0], d[1], d[2]) * (t1 - t0);
    const adim = Math.min(6000, Math.max(80, Math.ceil(boy / 1.5)));
    const nokta = (t) => [p0[0] + d[0] * t, p0[1] + d[1] * t, p0[2] + d[2] * t];
    let once = t0;
    for (let i = 1; i <= adim; i++) {
      const t = t0 + ((t1 - t0) * i) / adim;
      const q = nokta(t);
      if (q[1] <= yuzey(q[0], q[2])) {
        let alt = once, ust = t;
        for (let k = 0; k < 10; k++) {
          const m = (alt + ust) / 2, r = nokta(m);
          if (r[1] <= yuzey(r[0], r[2])) ust = m;
          else alt = m;
        }
        const s = nokta(ust);
        return kimlikAl(s[0] / GEN + 0.5, s[2] / YUK + 0.5);
      }
      once = t;
    }
    return 0;
  }

  function sec(no, ucarak) {
    secili = ilNo.has(no) ? no : 0;
    bilgiGoster(secili);
    if (!hazir) return;
    secimDokusuGuncelle();
    kalkis = 0;
    kalkisHedef = secili ? KALKIS_KM : 0;
    if (ucarak && secili) {
      const b = V.iller[secili];
      const kapsam = Math.max(b[2] * GEN, b[3] * YUK);
      uc({
        hx: (b[0] - 0.5) * GEN,
        hz: (b[1] - 0.5) * YUK,
        uzak: Math.min(900, Math.max(enYakin * 2.5, kapsam * 2.8)),
      }, 750);
    }
    iste();
  }

  /* ---------------------------------------------------------------
     WebGL
     --------------------------------------------------------------- */
  const KOSE = `
attribute vec2 a_uv;
attribute float a_h;
attribute float a_il;
uniform mat4 u_mvp;
uniform vec2 u_boyut;
uniform float u_abarti;
uniform float u_secili;
uniform float u_kalkis;
varying vec2 v_uv;
varying float v_uzak;
void main() {
  v_uv = a_uv;
  float kalk = (u_secili > 0.5 && abs(a_il - u_secili) < 0.5) ? u_kalkis : 0.0;
  gl_Position = u_mvp * vec4((a_uv.x - 0.5) * u_boyut.x, a_h * u_abarti + kalk,
                             (a_uv.y - 0.5) * u_boyut.y, 1.0);
  v_uzak = gl_Position.w;
}`;

  const PARCA = `
precision mediump float;
uniform sampler2D u_renk;
uniform sampler2D u_tint;
uniform sampler2D u_secim;
uniform vec3 u_zemin;
uniform vec2 u_sis;
uniform float u_tintGuc;
varying vec2 v_uv;
varying float v_uzak;
void main() {
  vec3 c = texture2D(u_renk, v_uv).rgb;
  vec4 t = texture2D(u_tint, v_uv);
  c = c * (1.0 - t.a * u_tintGuc) + t.rgb * u_tintGuc;
  float s = texture2D(u_secim, v_uv).r;
  vec3 vurgu = c * 0.68 + t.rgb * 0.5 + vec3(0.03);
  c = mix(c, vurgu, s);
  float kx = smoothstep(0.0, 0.03, v_uv.x) * smoothstep(0.0, 0.03, 1.0 - v_uv.x);
  float ky = smoothstep(0.0, 0.06, v_uv.y) * smoothstep(0.0, 0.06, 1.0 - v_uv.y);
  c = mix(u_zemin, c, kx * ky);
  c = mix(c, u_zemin, smoothstep(u_sis.x, u_sis.y, v_uzak) * 0.85);
  gl_FragColor = vec4(c, 1.0);
}`;

  function golgelendirici(tur, kaynak) {
    const g = gl.createShader(tur);
    gl.shaderSource(g, kaynak);
    gl.compileShader(g);
    if (!gl.getShaderParameter(g, gl.COMPILE_STATUS)) {
      throw new Error("gölgelendirici: " + gl.getShaderInfoLog(g));
    }
    return g;
  }

  function dokuAyarla(mipmap) {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mipmap ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    if (mipmap) gl.generateMipmap(gl.TEXTURE_2D);
  }

  function glKur() {
    program = gl.createProgram();
    gl.attachShader(program, golgelendirici(gl.VERTEX_SHADER, KOSE));
    gl.attachShader(program, golgelendirici(gl.FRAGMENT_SHADER, PARCA));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error("bağlama: " + gl.getProgramInfoLog(program));
    }
    gl.useProgram(program);
    konum = {};
    ["u_mvp", "u_boyut", "u_abarti", "u_secili", "u_kalkis", "u_renk", "u_tint", "u_secim",
      "u_zemin", "u_sis", "u_tintGuc"].forEach((ad) => (konum[ad] = gl.getUniformLocation(program, ad)));

    /* Arazi ağı. 32 bitlik indeks yoksa ızgara yarıya iner (65 536 köşe sınırı). */
    const buyukIndeks =
      (typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext) ||
      !!gl.getExtension("OES_element_index_uint");
    const adim = buyukIndeks ? 1 : 2;
    const gx = Math.floor((GX - 1) / adim) + 1, gz = Math.floor((GZ - 1) / adim) + 1;
    const kose = new Float32Array(gx * gz * 4);
    let p = 0;
    for (let j = 0; j < gz; j++) {
      for (let i = 0; i < gx; i++) {
        const si = Math.min(GX - 1, i * adim), sj = Math.min(GZ - 1, j * adim);
        const u = si / (GX - 1), v = sj / (GZ - 1);
        kose[p++] = u;
        kose[p++] = v;
        kose[p++] = yuks[sj * GX + si];
        kose[p++] = kimlikAl(Math.min(u, 0.9999), Math.min(v, 0.9999));
      }
    }
    const IndeksDizisi = gx * gz > 65535 ? Uint32Array : Uint16Array;
    const ind = new IndeksDizisi((gx - 1) * (gz - 1) * 6);
    let q = 0;
    for (let j = 0; j < gz - 1; j++) {
      for (let i = 0; i < gx - 1; i++) {
        const a = j * gx + i, b = a + 1, c = a + gx, d = c + 1;
        ind[q++] = a; ind[q++] = c; ind[q++] = b;
        ind[q++] = b; ind[q++] = c; ind[q++] = d;
      }
    }
    indeksSayisi = ind.length;
    indeksTuru = IndeksDizisi === Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;

    tampon = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tampon);
    gl.bufferData(gl.ARRAY_BUFFER, kose, gl.STATIC_DRAW);
    indeksTampon = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indeksTampon);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, ind, gl.STATIC_DRAW);

    const ozellik = (ad, boyut, kayma) => {
      const yer = gl.getAttribLocation(program, ad);
      gl.enableVertexAttribArray(yer);
      gl.vertexAttribPointer(yer, boyut, gl.FLOAT, false, 16, kayma);
    };
    ozellik("a_uv", 2, 0);
    ozellik("a_h", 1, 8);
    ozellik("a_il", 1, 12);

    /* Renk dokusu. Çok eski cihazlarda 2048 sığmazsa küçült. */
    let kaynak = resim;
    const enBuyuk = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    if (resim.width > enBuyuk) {
      const c = document.createElement("canvas");
      c.width = enBuyuk;
      c.height = Math.round((resim.height * enBuyuk) / resim.width);
      c.getContext("2d").drawImage(resim, 0, 0, c.width, c.height);
      kaynak = c;
    }
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    dokuRenk = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, dokuRenk);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, kaynak);
    dokuAyarla(true);
    const anizo =
      gl.getExtension("EXT_texture_filter_anisotropic") ||
      gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic");
    if (anizo) {
      const en = gl.getParameter(anizo.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
      gl.texParameterf(gl.TEXTURE_2D, anizo.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, en));
    }

    /* Cephe rengi dokusu: renk zaten alfa ile çarpılmış (kenarda kararma olmasın). */
    const ig = V.il.genislik, iy = V.il.yukseklik;
    const renk = ilRenkleri();
    const tint = new Uint8Array(ig * iy * 4);
    for (let i = 0; i < ig * iy; i++) {
      const r = renk[kimlik[i]];
      if (!r) continue;
      tint[i * 4] = r[0];
      tint[i * 4 + 1] = r[1];
      tint[i * 4 + 2] = r[2];
      tint[i * 4 + 3] = 255;
    }
    dokuTint = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, dokuTint);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, ig, iy, 0, gl.RGBA, gl.UNSIGNED_BYTE, tint);
    dokuAyarla(true);

    dokuSecim = gl.createTexture();
    secimDokusuGuncelle();

    gl.uniform1i(konum.u_renk, 0);
    gl.uniform1i(konum.u_tint, 1);
    gl.uniform1i(konum.u_secim, 2);
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(ZEMIN[0], ZEMIN[1], ZEMIN[2], 1);
  }

  function secimDokusuGuncelle() {
    if (!gl || !dokuSecim) return;
    const ig = V.il.genislik, iy = V.il.yukseklik;
    if (!secimTampon) secimTampon = new Uint8Array(ig * iy);
    for (let i = 0; i < secimTampon.length; i++) {
      secimTampon[i] = secili && kimlik[i] === secili ? 255 : 0;
    }
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, dokuSecim);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, ig, iy, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, secimTampon);
    dokuAyarla(true);
  }

  function hexRenk(metin, yedek) {
    const m = /#([0-9a-f]{6})/i.exec(metin || "");
    if (!m) return yedek;
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function ilRenkleri() {
    const bolge = {};
    lejant.querySelectorAll("[data-bolge]").forEach((li) => {
      bolge[li.dataset.bolge] = hexRenk(getComputedStyle(li).getPropertyValue("--bolge-renk"), [200, 60, 50]);
    });
    const sonuc = new Array(256).fill(null);
    for (const d of iller) sonuc[d.plaka] = bolge[d.komutan] || [180, 180, 180];
    return sonuc;
  }

  /* ---------------------------------------------------------------
     Çizim (yalnızca bir şey değişince)
     --------------------------------------------------------------- */
  function iste() {
    if (planli || !hazir) return;
    planli = true;
    requestAnimationFrame(ciz);
  }

  function boyutla() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(tuval.clientWidth * dpr));
    const h = Math.max(1, Math.round(tuval.clientHeight * dpr));
    if (tuval.width !== w || tuval.height !== h) {
      tuval.width = w;
      tuval.height = h;
      enUzak = sigdirUzaklik() * 1.7;
      sinirla();
    }
  }

  function ciz() {
    planli = false;
    if (!hazir || kayip || !tuval.clientWidth) return;
    boyutla();

    if (kalkis !== kalkisHedef) {
      kalkis = azHareket ? kalkisHedef : kalkis + (kalkisHedef - kalkis) * 0.22;
      if (Math.abs(kalkisHedef - kalkis) < 0.05) kalkis = kalkisHedef;
      if (kalkis !== kalkisHedef) iste();
    }

    matrisKur();
    gl.viewport(0, 0, tuval.width, tuval.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, dokuRenk);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, dokuTint);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, dokuSecim);
    gl.uniformMatrix4fv(konum.u_mvp, false, mvp);
    gl.uniform2f(konum.u_boyut, GEN, YUK);
    gl.uniform1f(konum.u_abarti, abarti);
    gl.uniform1f(konum.u_secili, secili);
    gl.uniform1f(konum.u_kalkis, kalkis);
    gl.uniform3f(konum.u_zemin, ZEMIN[0], ZEMIN[1], ZEMIN[2]);
    gl.uniform2f(konum.u_sis, kam.uzak * 1.3, kam.uzak * 3.4 + 300);
    gl.uniform1f(konum.u_tintGuc, 0.18);
    gl.drawElements(gl.TRIANGLES, indeksSayisi, indeksTuru, 0);
    etiketleriYerlestir();
  }

  /* ---------------------------------------------------------------
     Etiketler: uzaktan cepheler, yakından il adları
     --------------------------------------------------------------- */
  let etiketler = [];

  function etiketleriKur() {
    etiketKutusu.innerHTML = "";
    etiketler = [];
    const ekle = (html, u, v, tur, no, bolge) => {
      const el = document.createElement("span");
      el.className = "harita3d-etiket" + (tur === "cephe" ? " harita3d-etiket-cephe" : "");
      if (bolge) el.dataset.bolge = bolge;
      el.innerHTML = html;
      etiketKutusu.appendChild(el);
      etiketler.push({ el, u, v, tur, no, w: 0, h: 0 });
    };
    for (const k of komutanlar) {
      let su = 0, sv = 0, sw = 0;
      for (const d of iller) {
        const b = d.komutan === k.id && V.iller[d.plaka];
        if (!b) continue;
        const w = b[2] * b[3];
        su += b[0] * w; sv += b[1] * w; sw += w;
      }
      if (sw) {
        ekle(
          `<span class="harita3d-etiket-bolge">${kacis(k.bolge)}</span>` +
            (k.ad ? `<span class="harita3d-etiket-komutan">${kacis(k.ad)}</span>` : ""),
          su / sw, sv / sw, "cephe", 0, k.id
        );
      }
    }
    const alan = (d) => (V.iller[d.plaka] ? V.iller[d.plaka][2] * V.iller[d.plaka][3] : 0);
    iller
      .slice()
      .sort((a, b) => alan(b) - alan(a))
      .forEach((d) => {
        const b = V.iller[d.plaka];
        if (b) ekle(kacis(d.il), b[0], b[1], "il", d.plaka, null);
      });
    etiketleriOlc();
  }

  function etiketleriOlc() {
    for (const e of etiketler) {
      e.el.hidden = false;
      const r = e.el.getBoundingClientRect();
      e.w = r.width;
      e.h = r.height;
      e.el.hidden = true;
    }
  }

  function etiketleriYerlestir() {
    const w = tuval.clientWidth, h = tuval.clientHeight;
    const ppk = h / (2 * kam.uzak * Math.tan(GORUS / 2)); // km başına piksel
    const sira = [];
    for (const e of etiketler) if (e.no && e.no === secili) sira.push(e);
    for (const e of etiketler) if (e.tur === "cephe") sira.push(e);
    for (const e of etiketler) if (e.tur === "il" && e.no !== secili) sira.push(e);

    const yerlesen = [];
    for (const e of sira) {
      const oncelikli = e.tur === "il" && secili > 0 && e.no === secili;
      let goster = e.tur === "cephe" ? ppk < 1.15 : ppk > 0.75 || oncelikli;
      if (goster && e.w) {
        const x = (e.u - 0.5) * GEN, z = (e.v - 0.5) * YUK;
        const p = donustur(mvp, x, yuzey(x, z) + 2, z);
        if (p[3] <= 0) goster = false;
        else {
          const sx = (p[0] / p[3] * 0.5 + 0.5) * w;
          const sy = (0.5 - (p[1] / p[3]) * 0.5) * h;
          const x0 = sx - e.w / 2, y0 = sy - e.h / 2, x1 = x0 + e.w, y1 = y0 + e.h;
          const disarida = x1 < 4 || x0 > w - 4 || y1 < 4 || y0 > h - 4;
          const cakisir = yerlesen.some((r) => x0 < r[2] + 6 && x1 + 6 > r[0] && y0 < r[3] + 3 && y1 + 3 > r[1]);
          if (disarida || (cakisir && !oncelikli)) goster = false;
          else {
            yerlesen.push([x0, y0, x1, y1]);
            e.el.style.transform = `translate(${Math.round(x0)}px, ${Math.round(y0)}px)`;
          }
        }
      } else goster = false;
      if (e.el.hidden === goster) e.el.hidden = !goster;
    }
  }

  /* ---------------------------------------------------------------
     Dokunma, fare, klavye
     --------------------------------------------------------------- */
  const isaretler = new Map();
  let ikili = null;
  let cokParmak = false;

  function ikiliOlc() {
    const [a, b] = [...isaretler.values()];
    return {
      mesafe: Math.hypot(b.x - a.x, b.y - a.y),
      aci: Math.atan2(b.y - a.y, b.x - a.x),
      ox: (a.x + b.x) / 2,
      oy: (a.y + b.y) / 2,
    };
  }

  function olaylariKur() {
    tuval.addEventListener("contextmenu", (e) => e.preventDefault());

    tuval.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" && e.button !== 0 && e.button !== 2) return;
      ucus = null;
      try { tuval.setPointerCapture(e.pointerId); } catch (_) { /* eski tarayıcı */ }
      isaretler.set(e.pointerId, {
        x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY,
        t0: performance.now(), kaydir: e.button === 2 || e.shiftKey || e.ctrlKey || e.metaKey,
        surukledi: false,
      });
      if (isaretler.size >= 2) {
        cokParmak = true;
        ikili = isaretler.size === 2 ? ikiliOlc() : null;
      }
    });

    tuval.addEventListener("pointermove", (e) => {
      const p = isaretler.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      if (Math.hypot(p.x - p.x0, p.y - p.y0) > 6) p.surukledi = true;
      if (isaretler.size === 1) {
        if (p.kaydir) kaydir(dx, dy);
        else dondur(dx, dy);
      } else if (isaretler.size === 2) {
        const s = ikiliOlc();
        if (ikili) {
          if (ikili.mesafe > 0 && s.mesafe > 0) kam.uzak *= ikili.mesafe / s.mesafe;
          let da = s.aci - ikili.aci;
          da = Math.atan2(Math.sin(da), Math.cos(da));
          kam.yon += da;
          kaydir(s.ox - ikili.ox, s.oy - ikili.oy);
        }
        ikili = s;
      }
    });

    const birak = (e) => {
      const p = isaretler.get(e.pointerId);
      if (!p) return;
      isaretler.delete(e.pointerId);
      const dokunus =
        e.type === "pointerup" && !p.surukledi && !cokParmak && !p.kaydir &&
        performance.now() - p.t0 < 600;
      if (dokunus) {
        const r = tuval.getBoundingClientRect();
        sec(ilBul(e.clientX - r.left, e.clientY - r.top), false);
      }
      ikili = isaretler.size === 2 ? ikiliOlc() : null;
      if (isaretler.size === 0) cokParmak = false;
    };
    tuval.addEventListener("pointerup", birak);
    tuval.addEventListener("pointercancel", birak);

    let ipucuZaman = 0;
    tuval.addEventListener("wheel", (e) => {
      // Sayfa kayarken harita farkında olmadan büyümesin: önce haritaya
      // tıklamak (odak) ya da Ctrl/⌘ gerekir. Tam ekranda serbest.
      if (!(tamEkran || e.ctrlKey || e.metaKey || document.activeElement === tuval)) {
        if (ipucu) {
          ipucu.hidden = false;
          clearTimeout(ipucuZaman);
          ipucuZaman = setTimeout(() => (ipucu.hidden = true), 1600);
        }
        return;
      }
      e.preventDefault();
      ucus = null;
      const birim = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
      yakinlas(Math.exp(Math.max(-60, Math.min(60, e.deltaY * birim)) * 0.004));
    }, { passive: false });

    tuval.addEventListener("keydown", (e) => {
      let islendi = true;
      const k = e.key;
      if (k === "ArrowLeft") e.shiftKey ? kaydir(60, 0) : dondur(-20, 0);
      else if (k === "ArrowRight") e.shiftKey ? kaydir(-60, 0) : dondur(20, 0);
      else if (k === "ArrowUp") e.shiftKey ? kaydir(0, 60) : dondur(0, -20);
      else if (k === "ArrowDown") e.shiftKey ? kaydir(0, -60) : dondur(0, 20);
      else if (k === "+" || k === "=") yakinlas(1 / 1.25);
      else if (k === "-" || k === "_") yakinlas(1.25);
      else if (k === "0" || k === "Home") uc(baslangicKamera(), 600);
      else islendi = false;
      if (islendi) {
        e.preventDefault();
        ucus = null;
      }
    });

    araclar.addEventListener("click", (e) => {
      const d = e.target.closest("[data-eylem]");
      if (!d) return;
      switch (d.dataset.eylem) {
        case "yakinlas": uc({ uzak: kam.uzak / 1.6 }, 250); break;
        case "uzaklas": uc({ uzak: kam.uzak * 1.6 }, 250); break;
        case "egim": uc({ egim: kam.egim > 1.15 ? 0.55 : kam.egim > 0.75 ? 1.38 : 0.95 }, 400); break;
        case "sifirla": uc(baslangicKamera(), 650); break;
        case "tamekran": tamEkranDegistir(); break;
      }
    });

    kabartmaDugme.addEventListener("click", () => {
      abartiSira = (abartiSira + 1) % KABARTMALAR.length;
      abarti = KABARTMALAR[abartiSira];
      kabartmaDugme.textContent = `Kabartma: ${abarti}×`;
      iste();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && tamEkran) tamEkranDegistir(false);
    });

    if ("ResizeObserver" in window) new ResizeObserver(() => iste()).observe(sahne);
    else window.addEventListener("resize", iste);

    tuval.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      kayip = true;
    });
    tuval.addEventListener("webglcontextrestored", () => {
      kayip = false;
      try {
        glKur();
        iste();
      } catch (hata) {
        acilamadi(hata);
      }
    });
  }

  function tamEkranDegistir(ac) {
    tamEkran = ac === undefined ? !tamEkran : !!ac;
    kok.classList.toggle("tam-ekran", tamEkran);
    document.documentElement.classList.toggle("harita3d-acik", tamEkran);
    const d = araclar.querySelector('[data-eylem="tamekran"]');
    d.setAttribute("aria-pressed", String(tamEkran));
    d.setAttribute("aria-label", tamEkran ? "Tam ekrandan çık" : "Tam ekran");
    requestAnimationFrame(() => {
      etiketleriOlc();
      iste();
    });
    if (tamEkran) tuval.focus({ preventScroll: true });
    else d.focus({ preventScroll: true });
  }

  /* ---------------------------------------------------------------
     Yükleme: harita ekrana yaklaşınca
     --------------------------------------------------------------- */
  function durumYaz(metin) {
    durum.textContent = metin;
    durum.hidden = !metin;
  }

  function acilamadi(hata) {
    gl = null;
    hazir = false;
    if (tuval) tuval.hidden = true;
    araclar.hidden = true;
    etiketKutusu.hidden = true;
    kabartmaDugme.hidden = true;
    durumYaz(
      "Bu cihazda 3D harita açılamadı. 81 il ve derebeyleri aşağıdaki listede."
    );
    if (window.console) console.warn("3D harita:", hata);
  }

  function veriYukle() {
    return new Promise((coz, reddet) => {
      if (typeof HARITA_VERI !== "undefined") return coz(HARITA_VERI);
      const s = document.createElement("script");
      s.src = VERI_ADRESI;
      s.onload = () =>
        typeof HARITA_VERI !== "undefined" ? coz(HARITA_VERI) : reddet(new Error("veri boş"));
      s.onerror = () => reddet(new Error("veri inmedi"));
      document.head.appendChild(s);
    });
  }

  function resimYukle(adres) {
    return new Promise((coz, reddet) => {
      const im = new Image();
      im.onload = () => coz(im);
      im.onerror = () => reddet(new Error("doku inmedi"));
      im.src = adres;
    });
  }

  function baytlar(b64) {
    const ikili = atob(b64);
    const b = new Uint8Array(ikili.length);
    for (let i = 0; i < ikili.length; i++) b[i] = ikili.charCodeAt(i);
    return b;
  }

  function veriyiAc() {
    GX = V.yukselti.gx;
    GZ = V.yukselti.gz;
    GEN = V.boyutKm[0];
    YUK = V.boyutKm[1];
    const yb = baytlar(V.yukselti.veri);
    yuks = new Float32Array(GX * GZ);
    for (let i = 0; i < yuks.length; i++) {
      const t = yb[i] / 255;
      yuks[i] = t * t * V.yukselti.hmaxKm; // kök kodlama: alçakta daha ince adım
    }
    const r = baytlar(V.il.rle);
    kimlik = new Uint8Array(V.il.genislik * V.il.yukseklik);
    for (let i = 0, p = 0; i + 2 < r.length; i += 3) {
      const boy = r[i + 1] | (r[i + 2] << 8);
      kimlik.fill(r[i], p, p + boy);
      p += boy;
    }
  }

  let basladi = false;
  function basla() {
    if (basladi) return;
    basladi = true;

    tuval = document.createElement("canvas");
    tuval.className = "harita3d-tuval";
    tuval.tabIndex = 0;
    tuval.setAttribute("role", "application");
    tuval.setAttribute("aria-roledescription", "3D harita");
    tuval.setAttribute("aria-label", "Türkiye'nin 3D fiziki haritası, iller cephelere göre renkli");
    tuval.setAttribute("aria-describedby", "harita3d-klavye");
    const ayar = { antialias: true, alpha: false, depth: true };
    gl = tuval.getContext("webgl2", ayar) || tuval.getContext("webgl", ayar) ||
      tuval.getContext("experimental-webgl", ayar);
    if (!gl) return acilamadi(new Error("WebGL yok"));

    durumYaz("3D harita yükleniyor…");
    Promise.all([veriYukle(), resimYukle(DOKU_ADRESI)])
      .then(([veri, im]) => {
        V = veri;
        resim = im;
        veriyiAc();
        sahne.insertBefore(tuval, sahne.firstChild);
        glKur();
        hazir = true;
        Object.assign(kam, baslangicKamera());
        boyutla();
        Object.assign(kam, baslangicKamera());
        etiketleriKur();
        olaylariKur();
        durumYaz("");
        araclar.hidden = false;
        kabartmaDugme.hidden = false;
        if (secili) sec(secili, true); // harita inmeden listeden seçilen il
        iste();
      })
      .catch(acilamadi);
  }

  durumYaz("3D harita, ekrana gelince yüklenecek.");
  if ("IntersectionObserver" in window) {
    const gozcu = new IntersectionObserver((kayitlar) => {
      if (kayitlar.some((k) => k.isIntersecting)) {
        gozcu.disconnect();
        basla();
      }
    }, { rootMargin: "400px 0px" });
    gozcu.observe(kok);
  } else {
    basla();
  }
})();
