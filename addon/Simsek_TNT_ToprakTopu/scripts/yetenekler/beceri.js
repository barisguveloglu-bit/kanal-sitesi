import { world } from "@minecraft/server";
import { hataYaz, actionbarYaz } from "../yardimcilar.js";
import {
  BECERI_ACIK, BECERI_AGACI, BECERI_KAYIT_ANAHTAR,
  BECERI_XP_CARPAN, BECERI_XP_TABAN, BECERI_TAVAN_KADEME,
  BECERI_SALDIRI_ADIM, BECERI_ZIRH_ADIM
} from "../ayarlar.js";

/* ================================================================
   BEN 10 BECERI AGACI                                     v4.98

   Kullanici: "oyunda bu mod kuruldugunda yanda bir sekme
   aciyor ve orada bir skill secilebiliyor, ekstra yeteneklerini
   arttirabiliyoruz."

   O sekme Palladium'un yetenek ekrani. Agacin kendisi
   ayarlar.js:BECERI_AGACI icinde ve MODUN KENDI dosyalarindan
   cikarildi (44 dugum, adlari modun kendi Turkce metni).

   ---- BU DOSYA NE TUTUYOR ----
   Oyuncu basina, UZAYLI TURU basina:
       kademe . 0..BECERI_TAVAN_KADEME
       xp     . o kademedeki birikim
       puan   . harcanmamis yetenek puani
       acik   . acilmis dugum anahtarlari
   Modda da boyle: her uzaylinin AYRI seviyesi ve AYRI puani
   var (Petrosapien.Level, Petrosapien.SkillPoint...).

   ---- TUR BASINA, BICIM BASINA DEGIL ----
   Bizde her uzaylinin uc bicimi var (Recal/Prototip/10K) ama
   agac TURE ait: modda da oyle, seviye tabelasi turun adiyla
   aciliyor. Yani Prototip Elmas Kafa'yla kazandigin puani
   10K'da harciyorsun.

   ---- NEDEN IS LISTESINE GIRMIYOR ----
   Kalici bir defter, tick basina is yapmiyor: sadece bir
   canli oldugunde ve menu acildiginda dokunuluyor. Kalp
   defteriyle ayni sinif.
   ================================================================ */

/* oyuncuId -> { taban -> {kademe, xp, puan, acik:[...]} } */
const defter = new Map();
let okundu = false;

function bos() { return { kademe: 0, xp: 0, puan: 0, acik: [] }; }

function oku() {
  if (okundu) return;
  okundu = true;
  try {
    const ham = world.getDynamicProperty(BECERI_KAYIT_ANAHTAR);
    if (typeof ham !== "string" || ham.length === 0) return;
    for (const [id, turler] of JSON.parse(ham)) {
      const m = new Map();
      for (const [taban, d] of turler) {
        if (!BECERI_AGACI.has(taban)) continue;
        /* Bilinmeyen dugum anahtarlarini SUZ: agac degisirse
           eski kayit yeni agaca uymayan bir sey tasimasin.  */
        const gecerli = new Set(BECERI_AGACI.get(taban).map((n) => n.anahtar));
        m.set(taban, {
          kademe: Math.min(d.kademe | 0, BECERI_TAVAN_KADEME),
          xp: d.xp | 0,
          puan: d.puan | 0,
          acik: (d.acik || []).filter((a) => gecerli.has(a))
        });
      }
      defter.set(id, m);
    }
  } catch (e) {
    hataYaz("beceri.oku", e);
  }
}

function kaydet() {
  try {
    const dizi = [];
    for (const [id, turler] of defter) {
      dizi.push([id, [...turler.entries()]]);
    }
    world.setDynamicProperty(BECERI_KAYIT_ANAHTAR, JSON.stringify(dizi));
  } catch (e) {
    hataYaz("beceri.kaydet", e);
  }
}

/* Testler ve dunya degisimi icin. */
export function beceriUnut() {
  defter.clear();
  okundu = false;
}

export function beceriAl(oyuncuId, taban) {
  oku();
  const t = defter.get(oyuncuId);
  const d = t && t.get(taban);
  return d ? { ...d, acik: [...d.acik] } : bos();
}

function yaz(oyuncuId, taban, d) {
  oku();
  let t = defter.get(oyuncuId);
  if (!t) { t = new Map(); defter.set(oyuncuId, t); }
  t.set(taban, d);
  kaydet();
}

/* Kademe atlama esigi. xp.js:
     maxXp = currentLevel === 0 ? 100 : 100 * currentLevel   */
export function gerekenXp(kademe) {
  return kademe === 0 ? BECERI_XP_TABAN : BECERI_XP_TABAN * kademe;
}

/* ---------------- XP ----------------

   xp.js: uzayli halindeyken bir canliyi oldurunce
       xp += round(hedefin maks cani * 0.425)
   Tavan kademede XP birikmiyor (modda da oyle: kademe 10'da
   skor sifirlanip donuluyor).

   Donen deger: kac kademe atlandi (0 ise mesaj yok).         */
export function beceriXpVer(oyuncu, taban, maksCan) {
  if (!BECERI_ACIK) return 0;
  if (!BECERI_AGACI.has(taban)) return 0;
  const d = beceriAl(oyuncu.id, taban);
  if (d.kademe >= BECERI_TAVAN_KADEME) {
    if (d.xp !== 0) { d.xp = 0; yaz(oyuncu.id, taban, d); }
    return 0;
  }
  const kazanc = Math.round((maksCan || 0) * BECERI_XP_CARPAN);
  if (kazanc <= 0) return 0;

  d.xp += kazanc;
  let atlanan = 0;
  /* Dongu: tek olumde birden fazla kademe atlanabilir (modda
     tek adim atiyor ama esik dusukken bir devin olumu iki
     kademe verebilir; puani kaybetmek yanlis olurdu).       */
  while (d.kademe < BECERI_TAVAN_KADEME && d.xp >= gerekenXp(d.kademe)) {
    d.xp -= gerekenXp(d.kademe);
    d.kademe += 1;
    d.puan += 1;
    atlanan += 1;
  }
  if (d.kademe >= BECERI_TAVAN_KADEME) d.xp = 0;
  yaz(oyuncu.id, taban, d);

  if (atlanan > 0) {
    try {
      actionbarYaz(oyuncu,
        "§a★ Kademe " + d.kademe + " §8· §f+" + atlanan + " yetenek puanı");
    } catch (e) { /* mesaj onemli degil */ }
  }
  return atlanan;
}

/* ---------------- Dugum acma ---------------- */

/* Dugumun acilabilmesi icin: onkosulu acik ve puan yetiyor.
   Donen: {olur, sebep}                                       */
export function acilirMi(oyuncuId, taban, anahtar) {
  const agac = BECERI_AGACI.get(taban);
  if (!agac) return { olur: false, sebep: "Bu tür yok" };
  const dugum = agac.find((n) => n.anahtar === anahtar);
  if (!dugum) return { olur: false, sebep: "Böyle bir beceri yok" };
  const d = beceriAl(oyuncuId, taban);
  if (d.acik.includes(anahtar)) return { olur: false, sebep: "Zaten açık" };
  if (dugum.gerek && !d.acik.includes(dugum.gerek)) {
    const onceki = agac.find((n) => n.anahtar === dugum.gerek);
    return { olur: false,
             sebep: "Önce §f" + (onceki ? onceki.ad : dugum.gerek) + "§7 gerek" };
  }
  if (d.puan < dugum.ucret) {
    return { olur: false,
             sebep: dugum.ucret + " puan gerek §8(elinde " + d.puan + ")" };
  }
  return { olur: true, sebep: "" };
}

export function beceriAc(oyuncuId, taban, anahtar) {
  if (!BECERI_ACIK) return { olur: false, sebep: "Beceriler kapalı" };
  const sonuc = acilirMi(oyuncuId, taban, anahtar);
  if (!sonuc.olur) return sonuc;
  const agac = BECERI_AGACI.get(taban);
  const dugum = agac.find((n) => n.anahtar === anahtar);
  const d = beceriAl(oyuncuId, taban);
  d.puan -= dugum.ucret;
  d.acik.push(anahtar);
  yaz(oyuncuId, taban, d);
  return { olur: true, sebep: "", dugum };
}

/* ---------------- Acilan dugumlerin EFEKTI ----------------

   Kucuk artislar tek tek seviyeye cevrilemez: Bedrock'ta Guc
   seviye basina +3, Direnc seviye basina %20. O yuzden
   katkilar TOPLANIP bir kez ceviriliyor -- boylece "+1
   saldiri" ucuncu kez alindiginda gercekten bir seviye
   kazandiriyor. Tek tek cevirseydik uc kez +1 almak HICBIR
   sey vermezdi (her biri round(1/3) = 0).

   Donen: [[efekt, 0, seviye], ...] -- ben10.js'in tablosuyla
   ayni bicim, dogrudan ustune eklenebilir.                   */
export function beceriEfektleri(oyuncuId, taban) {
  if (!BECERI_ACIK) return [];
  const agac = BECERI_AGACI.get(taban);
  if (!agac) return [];
  const d = beceriAl(oyuncuId, taban);
  if (d.acik.length === 0) return [];

  let saldiri = 0, zirh = 0, yuzme = 0;
  for (const anahtar of d.acik) {
    const n = agac.find((x) => x.anahtar === anahtar);
    if (!n || !n.etki) continue;
    const [tur, deger] = n.etki;
    if (tur === "saldiri") saldiri += deger;
    else if (tur === "zirh") zirh += deger;
    else if (tur === "yuzme") yuzme += deger;
  }

  const cikti = [];
  const gucSeviye = Math.floor(saldiri / BECERI_SALDIRI_ADIM);
  if (gucSeviye > 0) cikti.push(["strength", 0, gucSeviye - 1]);
  const direncSeviye = Math.floor(zirh / BECERI_ZIRH_ADIM);
  if (direncSeviye > 0) cikti.push(["resistance", 0, Math.min(direncSeviye - 1, 3)]);
  if (yuzme > 0) cikti.push(["conduit_power", 0, 0]);
  return cikti;
}

/* ---------------- Menu icin ---------------- */
export function beceriListesi(oyuncuId, taban) {
  const agac = BECERI_AGACI.get(taban);
  if (!agac) return { durum: bos(), dugumler: [] };
  const d = beceriAl(oyuncuId, taban);
  const dugumler = agac.map((n) => {
    const acik = d.acik.includes(n.anahtar);
    const s = acik ? { olur: false, sebep: "" }
                   : acilirMi(oyuncuId, taban, n.anahtar);
    return { ...n, acik, alinabilir: s.olur, sebep: s.sebep };
  });
  return { durum: d, dugumler, gereken: gerekenXp(d.kademe) };
}
