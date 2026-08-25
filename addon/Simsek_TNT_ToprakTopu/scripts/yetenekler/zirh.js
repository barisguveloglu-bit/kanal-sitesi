import { world, system } from "@minecraft/server";
import {
  hataYaz, gecerliMi, actionbarYaz, eldekiEsya, parcacikAt
} from "../yardimcilar.js";
import {
  ZIRH_ACIK, ZIRH_PARCALAR, ZIRH_TAM_TAKIM_SART, ZIRH_MODLAR,
  ZIRH_VARSAYILAN_MOD, ZIRH_TARAMA, ZIRH_SURE, ZIRH_KAYIT_ANAHTAR,
  ZIRH_CEKIRDEK_ONEK, ZIRH_CAKMA, ZIRH_CAKMA_ACIK
} from "../ayarlar.js";

/* ================================================================
   ZIRH YUKSELTMESI                                        v4.91

   Kullanici: "bu modda alinabilir olan seylerini alacagiz ve ZIRH
   olarak takilabilir sekilde ayarlayacagiz, adi zirh yukseltmesi
   olsun."

   Kaynak: ionstrike (Max Steel) -- Palladium eklentisi, tamamen
   JSON. Sayilar powers/*.json'dan okundu; ceviri tablosu
   ayarlar.js:ZIRH_MODLAR icinde satir satir yazili.

   ---- BU DOSYA NE YAPIYOR ----
   Tek is: TAKIMI GIYEN oyuncuya SECILI MODUN efektlerini
   vermek. Zirh puani esyanin kendi bileseninden geliyor
   (minecraft:wearable protection), script'e is dusmuyor.

   ---- NEDEN EFEKT TAZELENIYOR ----
   Kalp ve donusum sistemlerindeki dersin aynisi: efektler
   olunce, sure dolunca ve SUT ICINCE siliniyor. Kaynak
   "uzerinde takim var mi" sorusu; efekt onun goruntusu.
   ZIRH_TARAMA'da bir yeniden veriliyor.

   ---- NEDEN IS LISTESINE GIRMIYOR ----
   Kalici bir durum, oyuncunun AYNI_ANDA (2) is yuvasindan
   birini sonsuza kadar tutamaz. Kalp defteri de ayni sebeple
   disarida.
   ================================================================ */

/* oyuncuId -> mod anahtari. Kalici: dunya ozelligine yaziliyor. */
const modlar = new Map();
/* oyuncuId -> bir sonraki tazeleme tick'i */
const sonraki = new Map();
/* oyuncuId -> son bilinen "takim uzerinde mi" (mesaj icin) */
const takimliydi = new Map();

let okundu = false;
function oku() {
  if (okundu) return;
  okundu = true;
  try {
    const ham = world.getDynamicProperty(ZIRH_KAYIT_ANAHTAR);
    if (typeof ham !== "string" || ham.length === 0) return;
    for (const [id, mod] of JSON.parse(ham)) {
      if (ZIRH_MODLAR.has(mod)) modlar.set(id, mod);
    }
  } catch (e) {
    hataYaz("zirh.oku", e);
  }
}

function kaydet() {
  try {
    world.setDynamicProperty(ZIRH_KAYIT_ANAHTAR,
                             JSON.stringify([...modlar.entries()]));
  } catch (e) {
    hataYaz("zirh.kaydet", e);
  }
}

/* Testler ve dunya degisimi icin. */
export function zirhUnut() {
  modlar.clear();
  sonraki.clear();
  takimliydi.clear();
  sonCekirdek.clear();
  okundu = false;
}

export function zirhUnutOyuncu(oyuncuId) {
  sonraki.delete(oyuncuId);
  takimliydi.delete(oyuncuId);
  sonCekirdek.delete(oyuncuId);
  /* Mod SECIMI silinmiyor: oyuncu geri gelince ayni modda
     olsun. Kalp defteriyle ayni mantik.                      */
}

export function modAl(oyuncuId) {
  oku();
  const m = modlar.get(oyuncuId);
  return ZIRH_MODLAR.has(m) ? m : ZIRH_VARSAYILAN_MOD;
}

export function modYaz(oyuncuId, mod) {
  if (!ZIRH_MODLAR.has(mod)) return false;
  oku();
  modlar.set(oyuncuId, mod);
  /* Hemen uygulansin: bir sonraki taramayi beklemek "sectim
     ama bir sey olmadi" hissi verirdi.                       */
  sonraki.set(oyuncuId, 0);
  kaydet();
  return true;
}

/* ---------------- Takim uzerinde mi ----------------

   DIKKAT -- getEquipment BIR KOPYA donuyor (v4.x dersi), ama
   burada sadece OKUYORUZ, yazmiyoruz; kopya sorun degil.

   Yuva adlari Bedrock'un EquipmentSlot degerleri. Esya
   kimlikleri ayarlar.js'ten geliyor, burada elle yazilmiyor. */
const YUVALAR = ["Head", "Chest", "Legs", "Feet"];

export function takimParcalari(oyuncu) {
  let bilesen;
  try {
    bilesen = oyuncu.getComponent("minecraft:equippable");
  } catch (e) {
    return 0;
  }
  if (!bilesen || typeof bilesen.getEquipment !== "function") return 0;

  let adet = 0;
  for (let i = 0; i < YUVALAR.length; i++) {
    let esya;
    try {
      esya = bilesen.getEquipment(YUVALAR[i]);
    } catch (e) {
      continue;
    }
    if (esya && esya.typeId === ZIRH_PARCALAR[i]) adet++;
  }
  return adet;
}

export function takimVarMi(oyuncu) {
  const n = takimParcalari(oyuncu);
  return ZIRH_TAM_TAKIM_SART ? n === ZIRH_PARCALAR.length : n > 0;
}

/* ---------------- MOD CEKIRDEGI ----------------  (v4.94)

   Elindeki (ya da yan elindeki) cekirdek hangi mod? Cekirdek
   bir DONUSUM anahtari: gorunusu oyuncu modeli paketi
   degistiriyor, gucleri burasi veriyor.

   Cekirdek varken TAM TAKIM SARTI ARANMIYOR: donusumun kendisi
   zaten "takimi giymis olmak" demek. Zirh parcalarini da
   giyersen zirh PUANI ustune biner -- ikisi cakismiyor.       */
export function elindekiCekirdek(oyuncu) {
  const adaylar = [];
  try {
    const el = eldekiEsya(oyuncu);
    if (el) adaylar.push(el.typeId);
  } catch (e) { /* eli bos */ }
  try {
    const b = oyuncu.getComponent("minecraft:equippable");
    if (b && typeof b.getEquipment === "function") {
      for (const yuva of ["Mainhand", "Offhand"]) {
        try {
          const e = b.getEquipment(yuva);
          if (e) adaylar.push(e.typeId);
        } catch (e) { /* yuva okunamadi */ }
      }
    }
  } catch (e) { /* bilesen yok */ }

  for (const kimlik of adaylar) {
    if (typeof kimlik !== "string") continue;
    if (!kimlik.startsWith(ZIRH_CEKIRDEK_ONEK)) continue;
    const mod = kimlik.slice(ZIRH_CEKIRDEK_ONEK.length);
    if (ZIRH_MODLAR.has(mod)) return mod;
  }
  return undefined;
}

/* Donusum caktisi: referanstaki transform_flash'in karsiligi. */
function cakma(oyuncu) {
  if (!ZIRH_CAKMA_ACIK) return;
  try {
    const k = oyuncu.location;
    /* Uc nokta: ayak, govde, kafa -- tek nokta govdenin
       icinde kaybolup gorunmuyordu.                          */
    for (const y of [0.2, 1.0, 1.8]) {
      parcacikAt(oyuncu.dimension, ZIRH_CAKMA,
                 { x: k.x, y: k.y + y, z: k.z });
    }
  } catch (e) {
    hataYaz("zirh.cakma", e);
  }
}

/* oyuncuId -> son bilinen cekirdek (caktı icin) */
const sonCekirdek = new Map();

/* ---------------- Tarama ---------------- */
export function zirhTara(oyuncular) {
  if (!ZIRH_ACIK) return;
  oku();
  const simdi = system.currentTick;

  for (const oyuncu of oyuncular) {
    let cekirdek;
    try {
      cekirdek = elindekiCekirdek(oyuncu);
    } catch (e) {
      cekirdek = undefined;
    }

    /* Cekirdek degisti -> DONUSUM. Caktı ve mesaj burada.   */
    const oncekiC = sonCekirdek.get(oyuncu.id);
    if (oncekiC !== cekirdek) {
      sonCekirdek.set(oyuncu.id, cekirdek);
      if (cekirdek) {
        cakma(oyuncu);
        const t = ZIRH_MODLAR.get(cekirdek);
        try {
          actionbarYaz(oyuncu,
            "§b⚡ §fMax Steel §8· §f" + (t ? t.ad : cekirdek) + " modu");
        } catch (e) { /* mesaj onemli degil */ }
      } else if (oncekiC !== undefined) {
        cakma(oyuncu);
        try {
          actionbarYaz(oyuncu, "§7⚡ Dönüşüm çözüldü");
        } catch (e) { /* mesaj onemli degil */ }
      }
      sonraki.set(oyuncu.id, 0);
    }

    let takimli;
    try {
      takimli = takimVarMi(oyuncu);
    } catch (e) {
      takimli = false;
    }

    const onceki = takimliydi.get(oyuncu.id);
    if (onceki !== takimli && !cekirdek) {
      takimliydi.set(oyuncu.id, takimli);
      /* Ilk taramada (onceki undefined) mesaj YOK: dunyaya
         girer girmez ekrana yazi dusmesin.                   */
      if (onceki !== undefined) {
        const t = ZIRH_MODLAR.get(modAl(oyuncu.id));
        try {
          actionbarYaz(oyuncu, takimli
            ? "§b⛨ Zırh Yükseltmesi §8· §f" + (t ? t.ad : "") + " modu"
            : "§7⛨ Zırh Yükseltmesi çıkarıldı");
        } catch (e) { /* mesaj onemli degil */ }
      }
    }
    /* Cekirdek varken tam takim SART DEGIL: donusumun kendisi
       zaten takimi giymis olmak demek.                       */
    if (!takimli && !cekirdek) continue;

    if (simdi < (sonraki.get(oyuncu.id) || 0)) continue;
    sonraki.set(oyuncu.id, simdi + ZIRH_TARAMA);

    /* Elindeki cekirdek menudeki secimi EZIYOR: gorunusun ne
       ise gucun de o olmali.                                 */
    const t = ZIRH_MODLAR.get(cekirdek || modAl(oyuncu.id));
    if (!t) continue;
    for (const [ad, , seviye] of t.efektler) {
      try {
        oyuncu.addEffect(ad, ZIRH_SURE, {
          amplifier: seviye,
          /* Parcacik KAPALI: dokuz efekt birden acikken oyuncu
             yuruyen bir parcacik bulutuna donuyordu.          */
          showParticles: false
        });
      } catch (e) {
        /* Efekt adi bu surumde yoksa digerleri yine verilsin --
           hepsini birden dusurmek gereksiz (bot_ilkel dersi). */
      }
    }
  }
}

/* Menu icin: mod listesi, siralamasi ayarlar.js'teki sira.   */
export function modListesi(oyuncuId) {
  const secili = modAl(oyuncuId);
  const liste = [];
  for (const [anahtar, t] of ZIRH_MODLAR) {
    liste.push({ anahtar, secili: anahtar === secili, ad: t.ad, ozet: t.ozet });
  }
  return liste;
}
