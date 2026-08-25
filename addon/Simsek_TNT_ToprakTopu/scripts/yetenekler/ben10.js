import { system } from "@minecraft/server";
import { hataYaz, actionbarYaz, eldekiEsya } from "../yardimcilar.js";
import { BEN10_ACIK, BEN10_TARAMA, BEN10_SURE, BEN10 } from "../ayarlar.js";

/* ================================================================
   BEN 10 -- YARATIK OLMAK                                 v4.92

   Kullanici: "Elmas kafayi, dort kolu, yuzen ceneyi ve Ates
   topunu ekle SADECE."

   ---- IS BOLUMU ----
   GORUNUS oyuncu modeli paketinde (Simsek_Oyuncu_Modeli):
   elindeki esyaya gore player.entity.json baska bir geometri
   ciziyor. Script'e o is DUSMUYOR -- v4.90'da kurulan makine.

   Bu dosyanin tek isi GUCLER: elinde hangi yaratik varsa onun
   efektlerini vermek.

   ---- NEDEN "ELINDE" ----
   query.get_equipped_item_name yalniz main_hand ve off_hand
   okuyabiliyor (zirh yuvalarini okuyamiyor). Gorunus o sorguya
   bagli oldugu icin GUC de ayni kosula bagli olmali -- yoksa
   "yaratik gibi gorunuyorum ama gucum yok" ya da tersi olurdu.
   Iki taraf TEK kaynaktan besleniyor: elindeki esya.
   ================================================================ */

/* oyuncuId -> bir sonraki tazeleme tick'i */
const sonraki = new Map();
/* oyuncuId -> son bilinen yaratik (mesaj icin) */
const sonYaratik = new Map();

export function ben10Unut(oyuncuId) {
  sonraki.delete(oyuncuId);
  sonYaratik.delete(oyuncuId);
}

/* Elinde ya da yan elinde hangi yaratik var? */
export function elindekiYaratik(oyuncu) {
  let bilesen;
  try {
    bilesen = oyuncu.getComponent("minecraft:equippable");
  } catch (e) {
    bilesen = undefined;
  }

  const adaylar = [];
  try {
    const el = eldekiEsya(oyuncu);
    if (el) adaylar.push(el.typeId);
  } catch (e) { /* elde bir sey yok */ }
  if (bilesen && typeof bilesen.getEquipment === "function") {
    for (const yuva of ["Mainhand", "Offhand"]) {
      try {
        const e = bilesen.getEquipment(yuva);
        if (e) adaylar.push(e.typeId);
      } catch (e) { /* yuva okunamadi */ }
    }
  }

  for (const kimlik of adaylar) {
    if (typeof kimlik !== "string") continue;
    const anahtar = kimlik.startsWith("pa:") ? kimlik.slice(3) : kimlik;
    if (BEN10.has(anahtar)) return anahtar;
  }
  return undefined;
}

export function ben10Tara(oyuncular) {
  if (!BEN10_ACIK) return;
  const simdi = system.currentTick;

  for (const oyuncu of oyuncular) {
    let anahtar;
    try {
      anahtar = elindekiYaratik(oyuncu);
    } catch (e) {
      continue;
    }

    const onceki = sonYaratik.get(oyuncu.id);
    if (onceki !== anahtar) {
      sonYaratik.set(oyuncu.id, anahtar);
      /* Ilk taramada (onceki undefined) ve elin bosalinca
         degil, sadece DEGISIMDE yaz.                        */
      if (onceki !== undefined || anahtar) {
        const t = anahtar ? BEN10.get(anahtar) : undefined;
        try {
          actionbarYaz(oyuncu, t
            ? "§a⌚ §f" + t.ad + " §8· " + t.tur
            : "§7⌚ İnsan halindesin");
        } catch (e) { /* mesaj onemli degil */ }
      }
      /* Yaratik degisince efektleri HEMEN ver: bir tarama
         beklemek "aldim ama bir sey olmadi" hissi verirdi.  */
      sonraki.set(oyuncu.id, 0);
    }
    if (!anahtar) continue;

    if (simdi < (sonraki.get(oyuncu.id) || 0)) continue;
    sonraki.set(oyuncu.id, simdi + BEN10_TARAMA);

    const t = BEN10.get(anahtar);
    for (const [ad, , seviye] of t.efektler) {
      try {
        oyuncu.addEffect(ad, BEN10_SURE, {
          amplifier: seviye,
          /* Parcacik KAPALI: bes efekt birden acikken oyuncu
             parcacik bulutuna donuyor (zirh sistemindeki
             dersin aynisi).                                 */
          showParticles: false
        });
      } catch (e) {
        /* Efekt adi bu surumde yoksa digerleri yine verilsin. */
      }
    }
  }
}

/* Menu icin: yaratik listesi. */
export function yaratikListesi(oyuncuId, secili) {
  const liste = [];
  for (const [anahtar, t] of BEN10) {
    liste.push({
      anahtar, ad: t.ad, tur: t.tur, ozet: t.ozet,
      secili: anahtar === secili
    });
  }
  return liste;
}
