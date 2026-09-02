/* v4.63 -- IKI YENI IKSIRIN GERCEK DOKULARI

   Kullanici istegi (birebir):
     "kanka yeni eklenen bu iki tane iksirin texture paketini
      bulabildin mi bulmalisin cunku yani iyi olur o yuzden
      dosyalari tekrardan yukledim detayli sekilde arastirma yap"

   v4.62'de StarOxine ve Element'in ikonlari URETILMISTI (duz sise)
   ve renkleri HATIRDAN yazilmisti. Ikisi de yanlisti. Referans
   modlarin kaynak paketleri acildi, dokular piksel sayilarak
   olculdu (bkz. addon/kaynak_doku/NEREDEN.md).

   Bu dosya uc seyi kilitliyor:

   1. GERCEK SANAT PAKETE GIRDI. Pakettaki ikon, kaynak_doku/
      altindaki dosyanin BIREBIR AYNISI olmali. Kopyalama
      sessizce dusesse (dosya adi degisti, temizlik sildi) ikon
      yine "calisir" gorunur -- ama uretilen duz sise doner ve
      kimse fark etmez.

   2. ELEMENT'IN IKI GOZU AYRI. Referansin en ozgun fikri buydu:
      bir goz buz, obur goz ates. Tek renk varsayimi koda gomulu
      oldugu surece bu sessizce tek renge duser.

   3. ICME PARLAMASI SANATLA AYNI RENKTE. ayarlar.js'teki
      KADEMELER.renk elle yazilan bir sayi; doku degisince
      birlikte degismezse iksir bir renkte gorunup baska renkte
      parliyor. Deponun tekrar eden dersi: elle yazilan her sabit
      eninde sonunda kaynagindan ayrisiyor.                     */

import { readFileSync, existsSync } from "node:fs";
import { inflateSync } from "node:zlib";

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const RP = KOK + "/Simsek_Kol_Kaynak";
const KAYNAK = KOK + "/kaynak_doku";

let gecti = 0;
const hatalar = [];
function ol(ad, kosul, ek) {
  if (kosul) { gecti++; return; }
  hatalar.push(ad + (ek ? "  -> " + ek : ""));
}

/* ---- Kucuk PNG cozucu ----
   Sadece 8 bit, colortype 6 (RGBA), interlace 0 destekleniyor.
   Bize yeten bu; baska bicimle karsilasirsa BAGIRIYOR, sessizce
   gecmiyor -- yoksa test "sorun yok" der ve hicbir sey sinamaz. */
function pngOku(yol) {
  const d = readFileSync(yol);
  const en = d.readUInt32BE(16), boy = d.readUInt32BE(20);
  const derinlik = d[24], tur = d[25], aralama = d[28];
  if (derinlik !== 8 || tur !== 6 || aralama !== 0) {
    throw new Error(yol + ": desteklenmeyen PNG (bit=" + derinlik +
                    " tur=" + tur + " aralama=" + aralama + ")");
  }
  let i = 8;
  const parcalar = [];
  while (i < d.length) {
    const uz = d.readUInt32BE(i);
    const ad = d.toString("ascii", i + 4, i + 8);
    if (ad === "IDAT") parcalar.push(d.subarray(i + 8, i + 8 + uz));
    i += 12 + uz;
  }
  const ham = inflateSync(Buffer.concat(parcalar));
  const satirBayt = en * 4;
  const cikti = Buffer.alloc(boy * satirBayt);
  let p = 0;
  for (let y = 0; y < boy; y++) {
    const suzgec = ham[p++];
    const satir = ham.subarray(p, p + satirBayt); p += satirBayt;
    const hedef = cikti.subarray(y * satirBayt, (y + 1) * satirBayt);
    const ust = y > 0 ? cikti.subarray((y - 1) * satirBayt, y * satirBayt) : null;
    for (let x = 0; x < satirBayt; x++) {
      const a = x >= 4 ? hedef[x - 4] : 0;
      const b = ust ? ust[x] : 0;
      const c = (ust && x >= 4) ? ust[x - 4] : 0;
      let v = satir[x];
      if (suzgec === 1) v += a;
      else if (suzgec === 2) v += b;
      else if (suzgec === 3) v += (a + b) >> 1;
      else if (suzgec === 4) {
        const t = a + b - c;
        const pa = Math.abs(t - a), pb = Math.abs(t - b), pc = Math.abs(t - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      } else if (suzgec !== 0) {
        throw new Error(yol + ": bilinmeyen suzgec " + suzgec);
      }
      hedef[x] = v & 255;
    }
  }
  return {
    en, boy,
    piksel(x, y) {
      const o = (y * en + x) * 4;
      return [cikti[o], cikti[o + 1], cikti[o + 2], cikti[o + 3]];
    },
  };
}

/* ---- 1. Gercek sanat pakete girdi mi ---- */
const SANAT = ["staroxine", "element"];
for (const k of SANAT) {
  const kay = KAYNAK + "/iksir_" + k + ".png";
  const pak = RP + "/textures/item/iksir_" + k + ".png";
  ol("kaynak doku duruyor: " + k, existsSync(kay), kay);
  ol("pakette ikon var: " + k, existsSync(pak), pak);
  if (existsSync(kay) && existsSync(pak)) {
    ol("pakettaki ikon kaynagin birebir aynisi: " + k,
       readFileSync(kay).equals(readFileSync(pak)),
       "kopyalama dustu -- uretilen duz sise girmis olabilir");
    const im = pngOku(pak);
    ol("ikon 32x32: " + k, im.en === 32 && im.boy === 32,
       im.en + "x" + im.boy);
  }
}

/* Uretilen siseler hala uretiliyor mu -- kopyalama yolu
   digerlerini bozmadi. */
for (const k of ["nitroksin", "hiperoksin"]) {
  const im = pngOku(RP + "/textures/item/iksir_" + k + ".png");
  ol("uretilen sise 16x16: " + k, im.en === 16 && im.boy === 16,
     im.en + "x" + im.boy);
}

/* ---- 2. Goz kaplamalari (v4.64: referans teknigi) ----

   Goz artik 64x64'te iki duz piksel degil; 512x512'lik bir
   dokuda cekirdek + hale + yukselen sacaklar. Asagidaki
   sinamalar ALT PIKSEL degil MC PIKSELI konusuyor: MC piksel
   basina OLCEK alt piksel var.

   kol_uret.py: GOZ_SATIR = 12, GOZ_SUTUNLAR = ((9,10),(13,14)) */
const GOZ_SATIR = 12;
const SOL = [9, 10], SAG = [13, 14];
const OLCEK = 8;                 // kol_uret.py GOZ_OLCEK
const DOKU = 64 * OLCEK;

const TUM_GOZLER = ["goz_beyaz", "goz_yesil", "goz_kirmizi", "goz_ates",
                    "goz_kan", "goz_mavi", "goz_yildiz", "goz_element"];

function gozDoku(ad) { return pngOku(RP + "/textures/entity/" + ad + ".png"); }

/* Bir MC pikselinin ORTASINDAKI alt piksel. Cekirdek tam opak
   oldugu icin ortasi her zaman saf renktir -- kenarina bakmak
   hale ile karisir. */
function ortaPiksel(im, mx, my) {
  return im.piksel(mx * OLCEK + (OLCEK >> 1), my * OLCEK + (OLCEK >> 1));
}

/* Cozunurluk: hepsi ayni ve buyuk olmali. Biri 64'te kalirsa
   o gozun sacaklari kare kare gorunur. */
for (const ad of TUM_GOZLER) {
  for (const t of [ad, ad + "_lazer"]) {
    const im = gozDoku(t);
    ol(t + " dokusu " + DOKU + "x" + DOKU,
       im.en === DOKU && im.boy === DOKU, im.en + "x" + im.boy);
  }
}

/* Olculen renkler -- referans modlarin kendi dokularindan. */
const OLCULEN = {
  goz_yildiz:  { sol: "255,245,0,255",  sag: "255,245,0,255" },
  goz_element: { sol: "56,225,255,255", sag: "255,178,0,255" },
};
for (const [ad, bek] of Object.entries(OLCULEN)) {
  const im = gozDoku(ad);
  for (const [yan, xs, b] of [["sol", SOL, bek.sol], ["sag", SAG, bek.sag]]) {
    const g = xs.map((x) => ortaPiksel(im, x, GOZ_SATIR).join(","));
    ol(ad + " " + yan + " goz cekirdegi olculen renkte",
       g.every((v) => v === b), g.join(" | ") + " != " + b);
  }
}

/* Element'in iki gozu GERCEKTEN farkli olmali -- asil kilit bu. */
{
  const im = gozDoku("goz_element");
  ol("Element'in iki gozu ayri renkte",
     ortaPiksel(im, SOL[0], GOZ_SATIR).join(",") !==
     ortaPiksel(im, SAG[0], GOZ_SATIR).join(","),
     "ikisi de ayni");
}

/* Cift renk digerlerini bozmadi: tek renkli gozler hala tek renk. */
for (const ad of ["goz_beyaz", "goz_mavi", "goz_kan", "goz_yildiz"]) {
  const im = gozDoku(ad);
  ol(ad + " iki gozu de ayni renk",
     ortaPiksel(im, SOL[0], GOZ_SATIR).join(",") ===
     ortaPiksel(im, SAG[0], GOZ_SATIR).join(","), "renkler ayrilmis");
}

/* ---- Cekirdek tam opak, tam yerinde ---- */
for (const ad of TUM_GOZLER) {
  const im = gozDoku(ad);
  let bos = 0;
  for (const x of [...SOL, ...SAG]) {
    for (let sy = GOZ_SATIR * OLCEK; sy < (GOZ_SATIR + 1) * OLCEK; sy++) {
      for (let sx = x * OLCEK; sx < (x + 1) * OLCEK; sx++) {
        if (im.piksel(sx, sy)[3] !== 255) bos++;
      }
    }
  }
  ol(ad + " cekirdegi tam opak", bos === 0, bos + " alt piksel delik");
}

/* ---- Boyali alan KAFANIN ON YUZUNDEN tasmamali ----
   On yuz MC x=8..15, y=8..15. Tasan piksel kafanin ustune,
   arkasina ya da yanina duser: yuzde degil, ENSEDE parlayan
   bir leke olur. Hale ve sacak eklendigi icin bu artik gercek
   bir risk -- eskiden tek satir boyaniyordu, tasma imkansizdi. */
/* v4.73: LAZER varyanti artik ISIN RENK YAMASI da tasiyor.
   Isin kutularinin her yuzu o yamaya bakiyor (per-face UV),
   yani yama yuzun DISINDA olmak ZORUNDA. Kural daraltildi:
   on yuz disinda SADECE yama olabilir, baska hicbir sey.

   Ustelik yamanin yeri geometrinin UV'siyle AYNI olmali --
   biri kayarsa isin yanlis renge ya da saydama duser ve bu
   oyunda "isin gorunmuyor" diye ortaya cikar.               */
/* v4.75: isin kutulari artik "isin" kemiginde (goz kemigiyle
   ayri malzeme alabilsinler diye). Kemik adindan bul --
   bones[0].cubes.slice(1) diye okumak sessizce BOS liste
   donduruyordu ve yama "tasma" sayiliyordu.                */
const ISIN_KUTULARI = (() => {
  const geo = JSON.parse(readFileSync(
    RP + "/models/entity/simsek_goz_lazer.geo.json", "utf8"));
  const kemikler = geo["minecraft:geometry"][0].bones;
  const isin = kemikler.find((b) => b.name === "isin");
  return isin ? isin.cubes : kemikler[0].cubes.slice(1);
})();
const ISIN_UV = ISIN_KUTULARI.map((c) => c.uv.north.uv);

function yamadaMi(mx, my) {
  return ISIN_UV.some(([ux, uy]) =>
    mx >= ux && mx < ux + 2 && my >= uy && my < uy + 2);
}

for (const ad of TUM_GOZLER) {
  for (const t of [ad, ad + "_lazer"]) {
    const im = gozDoku(t);
    const lazerMi = t.endsWith("_lazer");
    let disarida = 0;
    for (let y = 0; y < im.boy; y++) {
      for (let x = 0; x < im.en; x++) {
        if (im.piksel(x, y)[3] === 0) continue;
        const mx = x / OLCEK, my = y / OLCEK;
        if (mx >= 8 && mx < 16 && my >= 8 && my < 16) continue;   // on yuz
        if (lazerMi && yamadaMi(mx, my)) continue;                // isin yamasi
        disarida++;
      }
    }
    ol(t + " on yuzden tasmiyor", disarida === 0,
       disarida + " alt piksel yerinde degil");
  }
}

/* ---- ISIN: geometri ve doku birbirini tutuyor mu ---- */
{
  const geo = JSON.parse(readFileSync(
    RP + "/models/entity/simsek_goz_lazer.geo.json", "utf8"));
  const tanim = geo["minecraft:geometry"][0];
  ol("isinli geometri ayri kimlikte",
     tanim.description.identifier === "geometry.simsek_goz_lazer",
     tanim.description.identifier);

  /* ---- v4.75: ISIN AYRI KEMIKTE ----
     Malzeme render denetleyicisinde KEMIK basina veriliyor;
     goz entity_alphablend'de kalirken isin entity_emissive'e
     gececek diye ayrildi. Kemik Head'in cocugu -- kafa donunce
     isin de donuyor.                                          */
  const kafaKemik = tanim.bones.find((b) => b.parent === undefined);
  const isinKemik = tanim.bones.find((b) => b.name === "isin");
  ol("goz kemigi tek kubunda kaldi", kafaKemik.cubes.length === 1,
     kafaKemik.cubes.length + " kutu");
  ol("isin kendi kemiginde", isinKemik !== undefined);
  ol("isin kemigi kafanin cocugu", isinKemik.parent === kafaKemik.name,
     String(isinKemik.parent));

  const isinlar = isinKemik.cubes;
  ol("IKI isin var", isinlar.length === 2, isinlar.length + " kutu");
  for (const c of isinlar) {
    ol("isin kesiti KARE", c.size[0] === c.size[1],
       c.size[0] + "x" + c.size[1]);
    ol("isin uzun", c.size[2] >= 100, c.size[2] + " birim");
    /* Her yuz ayni yamaya bakmali: kutu-UV bu kadar uzun bir
       kutuda dokuyu gerer, yuz basina UV sart.              */
    const yuzler = Object.keys(c.uv || {});
    ol("alti yuzun de UV'si var", yuzler.length === 6, yuzler.join(","));
  }

  /* Yatay yer GOZ SUTUNLARIYLA ayni olmali: isin gozden
     ciksin, alnindan ya da yanagindan degil.               */
  const beklenen = [[1, 3], [-3, -1]];
  const gercek = isinlar.map((c) => [c.origin[0], c.origin[0] + c.size[0]])
    .sort((a, b) => b[0] - a[0]);
  ol("isinlar goz sutunlarinda",
     JSON.stringify(gercek) === JSON.stringify(beklenen),
     JSON.stringify(gercek) + " beklenen " + JSON.stringify(beklenen));

  /* Dikey yer GOZ SATIRINA oturmali (model y = 40 - satir) */
  const gozOrta = 40 - GOZ_SATIR - 0.5;
  for (const c of isinlar) {
    const orta = c.origin[1] + c.size[1] / 2;
    ol("isin goz satirina ortalanmis", Math.abs(orta - gozOrta) < 0.01,
       orta + " beklenen " + gozOrta);
  }

  /* Gorunurluk kutusu isini kapsamali, yoksa model eleniyor */
  const uzunBlok = isinlar[0].size[2] / 16;
  ol("gorunurluk kutusu isini kapsiyor",
     tanim.description.visible_bounds_width >= uzunBlok * 2,
     tanim.description.visible_bounds_width + " / isin " + uzunBlok + " blok");

  /* Menzil iki yerde yazili: ayarlar.js ve kol_uret.py.
     Ayrisirsa isin gordugunden baska yerde vurur.           */
  const ayarlarSrc = readFileSync(
    KOK + "/Simsek_TNT_ToprakTopu/scripts/ayarlar.js", "utf8");
  const menzil = Number(/LAZER_MENZIL = (\d+)/.exec(ayarlarSrc)[1]);
  ol("isin boyu LAZER_MENZIL ile ayni", uzunBlok === menzil,
     uzunBlok + " blok vs menzil " + menzil);
}

/* ---- Normal goz ISINSIZ kalmali ---- */
{
  const geo = JSON.parse(readFileSync(
    RP + "/models/entity/simsek_goz.geo.json", "utf8"));
  ol("normal gozde isin YOK",
     geo["minecraft:geometry"][0].bones[0].cubes.length === 1,
     "iksir icer icmez isin cikardi");
  for (const ad of TUM_GOZLER) {
    const at = JSON.parse(readFileSync(
      RP + "/attachables/" + ad + ".json", "utf8"));
    ol(ad + " sade geometride",
       at["minecraft:attachable"].description.geometry.default ===
       "geometry.simsek_goz");
    const lz = JSON.parse(readFileSync(
      RP + "/attachables/" + ad + "_lazer.json", "utf8"));
    ol(ad + "_lazer isinli geometride",
       lz["minecraft:attachable"].description.geometry.default ===
       "geometry.simsek_goz_lazer");
  }
}

/* ---- Iki goz BIRLESMEMELI ----
   Aralarinda 2 MC pikseli var (x=11,12). Hale yuvarlak olunca
   orayi dolduruyor ve iki goz tek bir vizor cubugu gibi
   goruluyordu (v4.18'de "gozluk gibi durdu" diye kaldirilan
   seyin aynisi). GOZ_HALE_YATAY bunu kisiyor; sinir alfa 150. */
for (const ad of TUM_GOZLER) {
  for (const t of [ad, ad + "_lazer"]) {
    const im = gozDoku(t);
    let en = 0;
    for (let mx = 11; mx <= 12; mx++) {
      for (let sy = GOZ_SATIR * OLCEK; sy < (GOZ_SATIR + 1) * OLCEK; sy++) {
        for (let sx = mx * OLCEK; sx < (mx + 1) * OLCEK; sx++) {
          en = Math.max(en, im.piksel(sx, sy)[3]);
        }
      }
    }
    ol(t + " iki gozu birlestirmiyor", en <= 150, "bosluk alfasi " + en);
  }
}

/* ---- Hale gercekten ARA TONLU olmali ----
   Sadece 0 ve 255 varsa hale hic cizilmemis demektir; oyun
   icinde de goz eski haline (duz blok) doner. Ayrica bu,
   attachable malzemesinin neden entity_alphablend olmasi
   gerektiginin sebebi -- "armor" malzemesi ara tonlari keser. */
for (const ad of TUM_GOZLER) {
  const im = gozDoku(ad);
  let ara = 0;
  for (let y = 0; y < im.boy; y++) {
    for (let x = 0; x < im.en; x++) {
      const a = im.piksel(x, y)[3];
      if (a > 0 && a < 255) ara++;
    }
  }
  ol(ad + " halesi ara tonlu", ara > 100, "sadece " + ara + " ara ton");
}

/* ---- Sacaklar cekirdegin USTUNDE olmali ---- */
for (const ad of TUM_GOZLER) {
  const im = gozDoku(ad);
  let ust = 0;
  for (let sy = 0; sy < GOZ_SATIR * OLCEK - 1; sy++) {
    for (const x of [...SOL, ...SAG]) {
      for (let sx = x * OLCEK; sx < (x + 1) * OLCEK; sx++) {
        if (im.piksel(sx, sy)[3] > 200) ust++;
      }
    }
  }
  ol(ad + " sacaklari var", ust > 8, "cekirdek ustunde " + ust + " parlak nokta");
}

/* ---- Lazer varyanti: ayni goz, "sesi acilmis" hali ---- */
function dolu(im) {
  let n = 0;
  for (let y = 0; y < im.boy; y++)
    for (let x = 0; x < im.en; x++) if (im.piksel(x, y)[3] > 0) n++;
  return n;
}
for (const ad of TUM_GOZLER) {
  const nrm = gozDoku(ad), laz = gozDoku(ad + "_lazer");
  ol(ad + " lazeri daha genis", dolu(laz) > dolu(nrm),
     dolu(laz) + " vs " + dolu(nrm));
  const t = (p) => p[0] + p[1] + p[2];
  ol(ad + " lazeri daha parlak",
     t(ortaPiksel(laz, SOL[0], GOZ_SATIR)) >
     t(ortaPiksel(nrm, SOL[0], GOZ_SATIR)), "lazer daha koyu");
  /* ...ama RENGINI kaybetmemeli: beyaza fazla cekilince butun
     iksirlerin lazeri ayni kreme donuyordu. */
  const l = ortaPiksel(laz, SOL[0], GOZ_SATIR);
  const beyazlik = Math.min(l[0], l[1], l[2]) / Math.max(1, Math.max(l[0], l[1], l[2]));
  const n = ortaPiksel(nrm, SOL[0], GOZ_SATIR);
  const nBeyaz = Math.min(n[0], n[1], n[2]) / Math.max(1, Math.max(n[0], n[1], n[2]));
  ol(ad + " lazeri rengini koruyor", beyazlik < nBeyaz + 0.35,
     "lazer beyazlik " + beyazlik.toFixed(2) + " normal " + nBeyaz.toFixed(2));
}

/* ---- Envanter ikonu: KOL degil GOZ ----
   v4.63'e kadar 16 gozun hepsi envanterde renkli bir KOL
   silueti olarak goruluyordu (esya_ikonu cagriliyordu).
   Referansin ikonu iki 3x2 blok; bizimki de oyle.          */
for (const ad of TUM_GOZLER) {
  const im = pngOku(RP + "/textures/item/" + ad + ".png");
  ol(ad + " ikonu 16x16", im.en === 16 && im.boy === 16,
     im.en + "x" + im.boy);
  /* Iki blok: x=4..6 ve x=9..11, y=9..10 tam opak */
  let cekirdek = 0;
  for (const bx of [4, 9])
    for (let y = 9; y <= 10; y++)
      for (let x = bx; x < bx + 3; x++)
        if (im.piksel(x, y)[3] === 255) cekirdek++;
  ol(ad + " ikonunda iki goz var", cekirdek === 12, cekirdek + "/12 piksel");
  /* Aradaki bosluk (x=7,8) TAMAMEN bos -- yoksa tek cubuk olur */
  let arada = 0;
  for (let y = 0; y < 16; y++)
    for (const x of [7, 8]) if (im.piksel(x, y)[3] > 0) arada++;
  ol(ad + " ikonunda gozler ayri", arada === 0, arada + " piksel arada");
  /* Kol silueti kalintisi: eski ikon y=2..14 arasi doluydu */
  let tepe = 0;
  for (let y = 0; y <= 6; y++)
    for (let x = 0; x < 16; x++) if (im.piksel(x, y)[3] > 0) tepe++;
  ol(ad + " ikonu kol silueti degil", tepe === 0,
     tepe + " piksel ust bolgede (eski kol ikonu?)");
}

/* ---- Ikon rengi doku rengiyle ayni olmali ---- */
for (const [ad, bek] of Object.entries(OLCULEN)) {
  const im = pngOku(RP + "/textures/item/" + ad + ".png");
  ol(ad + " ikonunun sol gozu doku rengiyle ayni",
     im.piksel(5, 9).join(",") === bek.sol,
     im.piksel(5, 9).join(",") + " != " + bek.sol);
  ol(ad + " ikonunun sag gozu doku rengiyle ayni",
     im.piksel(10, 9).join(",") === bek.sag,
     im.piksel(10, 9).join(",") + " != " + bek.sag);
}

/* ---- Attachable ve geometri: referanstan alinan kod ---- */
{
  const geo = JSON.parse(readFileSync(
    RP + "/models/entity/simsek_goz.geo.json", "utf8"));
  const kutu = geo["minecraft:geometry"][0].bones[0].cubes[0];
  ol("goz kutusunda inflate YOK", kutu.inflate === undefined,
     "inflate " + kutu.inflate + " -- dokuyu geriyor, haleyi bozar");
  ol("goz kutusu 0.2 one kaydirilmis", kutu.origin[2] === -4.2,
     "origin z " + kutu.origin[2]);
}
for (const ad of TUM_GOZLER) {
  for (const t of [ad, ad + "_lazer"]) {
    const at = JSON.parse(readFileSync(
      RP + "/attachables/" + t + ".json", "utf8"));
    const d = at["minecraft:attachable"].description;
    ol(t + " malzemesi entity_alphablend",
       d.materials.default === "entity_alphablend",
       d.materials.default + " -- alpha test haleyi keser");
    ol(t + " kaskin altinda kalmiyor",
       (d.scripts || {}).parent_setup === "variable.helmet_layer_visible = 0.0;");
  }
}

/* ---- 3. Icme parlamasi ile sanat ayni rengi soyluyor mu ---- */
const ayarlar = readFileSync(
  KOK + "/Simsek_TNT_ToprakTopu/scripts/ayarlar.js", "utf8");

function kademeRengi(kimlik) {
  const i = ayarlar.indexOf('kimlik: "' + kimlik + '"');
  if (i < 0) return null;
  const m = /renk:\s*\[([^\]]+)\]/.exec(ayarlar.slice(i, i + 900));
  return m ? m[1].split(",").map((s) => parseFloat(s.trim())) : null;
}

/* Parlama 0.0-1.0, doku 0-255. Elle yazilan sayi olculen renkten
   0.06'dan fazla ayrilmamali (yuvarlama payi). */
const PARLAMA = {
  staroxine: [255, 223, 76],    // sisenin sivi rengi
  element:   [56, 225, 255],    // buz gozu -- lazer donduruyor
};
for (const [kimlik, renk] of Object.entries(PARLAMA)) {
  const r = kademeRengi(kimlik);
  ol(kimlik + " parlama rengi okundu", !!r && r.length === 3, String(r));
  if (r && r.length === 3) {
    const sapma = r.map((v, i) => Math.abs(v - renk[i] / 255));
    ol(kimlik + " parlamasi doku rengiyle ayni",
       Math.max(...sapma) <= 0.06,
       "ayarlar " + r.join(",") + " doku " +
       renk.map((v) => (v / 255).toFixed(2)).join(","));
  }
}

/* Element'in parlamasi iki gozunden BIRINE esit olmali --
   ortalama alinip camur bir renk cikmasin. */
{
  const r = kademeRengi("element");
  const buz = [56, 225, 255].map((v) => v / 255);
  const ates = [255, 178, 0].map((v) => v / 255);
  const yakin = (a) => r && Math.max(...r.map((v, i) => Math.abs(v - a[i]))) <= 0.06;
  ol("Element parlamasi iki gozden birine esit", yakin(buz) || yakin(ates),
     String(r));
}

/* ---- 4. Sekiz iksirin hepsinde ikon var ---- */
for (const k of ["nitroksin", "grinoksin", "redoksin", "firenoksin",
                 "kan_iksiri", "hiperoksin", "staroxine", "element"]) {
  ol("ikon dosyasi var: " + k,
     existsSync(RP + "/textures/item/iksir_" + k + ".png"));
}

/* ---- 5. ISININ RENGI DOYGUN, SOLUK DEGIL (v4.75) ----
   Kullanici oyun ici goruntuyle referansi karsilastirdi:
   "bizimki birazcik soluk gibi geldi."

   OLCUM: oyun ici isin (79,101,115), bizim doku (176,224,255)
   -> ucu de tam %45. Yani dunya isigi golgeliyor. Soluklugun
   ikinci sebebi doku: yama gozun BEYAZA CEKILMIS halinden
   aliniyordu, doygunluk oluyordu.

   REFERANS (Element Iksiri modu V2, canli okundu):
     textures/entity/pamobile/pa_element_lazer.png
     (0,255,243) 280 piksel  ve  (255,98,0) 124 piksel
   Ikisi de TAM DOYGUN. Kural bu: isin doygun olacak.       */
{
  const UV_OLCEK = OLCEK;
  /* Bir rengin doygunlugu: (maks - min) / maks. Beyaz ~0,
     tam doygun renk 1.                                     */
  const doygunluk = ([r, g, b]) => {
    const mx = Math.max(r, g, b);
    return mx === 0 ? 0 : (mx - Math.min(r, g, b)) / mx;
  };

  /* Nitroksin'in gozu BEYAZ; doygunlastirmak onu maviye
     cevirirdi, kimlik karisirdi. O yuzden disarida.        */
  const RENKLI = ["goz_yesil", "goz_kirmizi", "goz_ates",
                  "goz_kan", "goz_mavi", "goz_yildiz", "goz_element"];

  for (const ad of RENKLI) {
    const im = gozDoku(ad + "_lazer");
    for (const [ux, uy] of ISIN_UV) {
      const p = im.piksel(ux * UV_OLCEK + 4, uy * UV_OLCEK + 4);
      const d = doygunluk(p);
      ol(ad + " isini doygun (referans gibi)", d >= 0.9,
         "doygunluk " + d.toFixed(2) + " renk " + p.slice(0, 3).join(","));
      /* En parlak kanal tavana YAKIN olmali: golgelenince
         bile renk kalsin.
         Tam 255 SART DEGIL -- goz_kan bilerek koyu bordo
         (205, 0, 48), yoksa Redoksin'le ayni kirmiziya
         dusuyordu (v4.76). Sinir 200: hala parlak bir renk,
         ama koyu tona da yer birakiyor.                     */
      ol(ad + " isini tam parlaklikta", Math.max(...p.slice(0, 3)) >= 200,
         "maks kanal " + Math.max(...p.slice(0, 3)));
    }
  }

  /* Beyaz goz beyaz KALMALI (doygunluk carpani sifiri
     buyutemez -- bilincli).                                */
  {
    const im = gozDoku("goz_beyaz_lazer");
    const [ux, uy] = ISIN_UV[0];
    const p = im.piksel(ux * UV_OLCEK + 4, uy * UV_OLCEK + 4);
    ol("beyaz goz isini beyaz kaldi", doygunluk(p) < 0.2,
       "doygunluk " + doygunluk(p).toFixed(2) + " renk " + p.slice(0, 3).join(","));
  }

  /* ---- IKI KIRMIZI AYRI KALMALI (v4.76) ----
     Kullanici: "Kan ve Redoksin kirmizi olsunlar ama farkli
     kirmizi turu olsun."

     Bu KENDILIGINDEN olmuyor: iki gozun de tonu birebir ayni
     saf kirmizi (yesil ve mavi kanallari esit), doygunluk
     tavana cekilince ikisi de (255,0,0) oluyordu. Renkler
     LAZER_ISIN_RENK'te ELLE veriliyor -- yani biri silinirse
     sessizce eski hale doner. Burasi onu yakalar.

     Ayrica Firenoksin'in turuncusuyla da karismamali.       */
  {
    const yama = (ad) => {
      const im = gozDoku(ad + "_lazer");
      const [ux, uy] = ISIN_UV[0];
      return im.piksel(ux * UV_OLCEK + 4, uy * UV_OLCEK + 4).slice(0, 3);
    };
    const uzak = (a, b) =>
      Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);

    const redoksin = yama("goz_kirmizi");
    const kan = yama("goz_kan");
    const ates = yama("goz_ates");

    ol("iki kirmizi AYRI renkte", uzak(redoksin, kan) >= 80,
       redoksin.join(",") + " / " + kan.join(",") +
       " (uzaklik " + uzak(redoksin, kan) + ")");
    /* Ikisi de HALA kirmizi olmali: kirmizi kanal baskin.   */
    for (const [ad, r] of [["Redoksin", redoksin], ["Kan", kan]]) {
      ol(ad + " hala kirmizi (R baskin)",
         r[0] > r[1] + 60 && r[0] > r[2] + 60, r.join(","));
    }
    ol("Redoksin Firenoksin'in turuncusuna kacmadi",
       uzak(redoksin, ates) >= 80,
       redoksin.join(",") + " / " + ates.join(","));
  }

  /* Element'in IKI gozu IKI ayri renk: sol buz, sag ates.
     Ayni renge duserse iki mod ayirt edilemez.             */
  {
    const im = gozDoku("goz_element_lazer");
    const [sol, sag] = ISIN_UV.map(([ux, uy]) =>
      im.piksel(ux * UV_OLCEK + 4, uy * UV_OLCEK + 4).slice(0, 3));
    ol("Element'in iki isini ayri renkte",
       Math.max(...sol.map((v, i) => Math.abs(v - sag[i]))) > 60,
       sol.join(",") + " / " + sag.join(","));
  }

  /* ---- Parlama kurulumu ----
     Alfa PARLAKLIK maskesi (entity_emissive); 255 = hic
     parlamaz. Yama gozun UV alaninin DISINDA oldugu icin bu
     alfa gozu etkilemiyor.                                 */
  const at = JSON.parse(readFileSync(
    RP + "/attachables/goz_mavi_lazer.json", "utf8"))["minecraft:attachable"].description;
  const parlak = at.materials.isin !== undefined;
  ol("isin kemigine AYRI malzeme verilmis", parlak,
     JSON.stringify(at.materials));
  if (parlak) {
    ol("isin malzemesi emissive", at.materials.isin === "entity_emissive",
       at.materials.isin);
    ol("goz malzemesi harmanlamada KALDI (hale icin sart)",
       at.materials.default === "entity_alphablend", at.materials.default);
    ol("ozel render denetleyicisi bagli",
       at.render_controllers.length === 1 &&
       at.render_controllers[0] === "controller.render.simsek_goz_lazer",
       at.render_controllers.join(","));
    /* Alfa 255 olsa malzeme hicbir sey yapmazdi -- sessizce
       eski gorunume donerdik.                              */
    const im = gozDoku("goz_mavi_lazer");
    const [ux, uy] = ISIN_UV[0];
    const a = im.piksel(ux * UV_OLCEK + 4, uy * UV_OLCEK + 4)[3];
    ol("isin yamasinin alfasi parlama icin dusuk", a > 0 && a < 200,
       "alfa " + a);
  }

  /* NORMAL (isinsiz) gozler eski kurulumda kalmali: orada
     ozel malzeme/denetleyici isi yok.                      */
  const normal = JSON.parse(readFileSync(
    RP + "/attachables/goz_mavi.json", "utf8"))["minecraft:attachable"].description;
  ol("normal goz vanilla denetleyicide",
     normal.render_controllers[0] === "controller.render.armor" &&
     normal.materials.isin === undefined,
     normal.render_controllers.join(","));
}

if (hatalar.length) {
  console.error("KALDI:");
  for (const h of hatalar) console.error("  - " + h);
  process.exit(1);
}
console.log("doku.mjs  gecti: " + gecti + "  kaldi: yok");
