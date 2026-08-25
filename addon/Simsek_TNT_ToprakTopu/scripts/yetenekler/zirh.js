import { world, system } from "@minecraft/server";
import { hataYaz, gecerliMi, actionbarYaz } from "../yardimcilar.js";
import {
  ZIRH_ACIK, ZIRH_PARCALAR, ZIRH_TAM_TAKIM_SART, ZIRH_MODLAR,
  ZIRH_VARSAYILAN_MOD, ZIRH_TARAMA, ZIRH_SURE, ZIRH_KAYIT_ANAHTAR
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
  okundu = false;
}

export function zirhUnutOyuncu(oyuncuId) {
  sonraki.delete(oyuncuId);
  takimliydi.delete(oyuncuId);
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

/* ---------------- Tarama ---------------- */
export function zirhTara(oyuncular) {
  if (!ZIRH_ACIK) return;
  oku();
  const simdi = system.currentTick;

  for (const oyuncu of oyuncular) {
    let takimli;
    try {
      takimli = takimVarMi(oyuncu);
    } catch (e) {
      continue;
    }

    const onceki = takimliydi.get(oyuncu.id);
    if (onceki !== takimli) {
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
    if (!takimli) continue;

    if (simdi < (sonraki.get(oyuncu.id) || 0)) continue;
    sonraki.set(oyuncu.id, simdi + ZIRH_TARAMA);

    const t = ZIRH_MODLAR.get(modAl(oyuncu.id));
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
