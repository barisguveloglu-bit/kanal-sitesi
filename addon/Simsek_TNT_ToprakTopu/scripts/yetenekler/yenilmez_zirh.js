import { system } from "@minecraft/server";
import {
  hataYaz, gecerliMi, olayaAbone, sohbeteYaz, actionbarYaz, parcacikAt
} from "../yardimcilar.js";
import {
  YENILMEZ_ACIK, YENILMEZ_PARCALAR, YENILMEZ_SARJ, YENILMEZ_DOLUM,
  YENILMEZ_OLDURME_SEBEP, YENILMEZ_OLDURME_HASAR,
  YENILMEZ_HERKESE, YENILMEZ_SES, YENILMEZ_PARCACIK, YENILMEZ_SUS
} from "../ayarlar.js";

/* YENILMEZ ZIRH                                      v7.90

   Kullanicinin istegi ve KAYNAKTA NE BULUNDUGU ayarlar.js'te
   olculu yazili. Ozeti: Avaritia'da oyle bir mekanik YOK;
   oradaki `immortal` etiketi yalniz modun kendi silahlarini
   atlatiyor. Buradaki sey yeni yazildi.

   ---- NE KESIN, NE DEGIL ----
   Geri iyilestirme KESIN calisir: Avaritia'nin dusme hasarini
   iptal ederken kullandigi teknigin aynisi
   (`health.setCurrentValue(current + damage)`).

   `/kill`i kesin engelleyebilecegim bir kanca Bedrock'ta YOK
   ve oyunda deneyemiyorum. O yuzden iki is AYRI yazildi:
   iyilestirme ayri, oldurme girisimi bildirimi ayri. Kod
   "herhalde olur" diye bir sey iddia etmiyor -- hangisinin
   tuttugu oyunda gorulecek.                                 */

/* oyuncuId -> { sarj, sonDolum, sonMesaj } */
const defter = new Map();

export function yenilmezUnut(oyuncuId) {
  if (oyuncuId === undefined) defter.clear();
  else defter.delete(oyuncuId);
}
export function yenilmezDurum(oyuncuId) { return defter.get(oyuncuId); }

function kayit(oyuncuId, simdi) {
  let d = defter.get(oyuncuId);
  if (!d) {
    d = { sarj: YENILMEZ_SARJ, sonDolum: simdi, sonMesaj: -99999 };
    defter.set(oyuncuId, d);
  }
  /* Zamanla doluyor. Kac dolum gectiyse o kadar ekleniyor --
     tek tek saymak yerine bolme, cunku iki vurus arasinda
     dakikalar gecmis olabilir.                              */
  const gecen = simdi - d.sonDolum;
  if (gecen >= YENILMEZ_DOLUM) {
    const adet = Math.floor(gecen / YENILMEZ_DOLUM);
    d.sarj = Math.min(YENILMEZ_SARJ, d.sarj + adet);
    d.sonDolum += adet * YENILMEZ_DOLUM;
  }
  return d;
}

/* Dort parca BIRDEN takili mi. Tek parca eksikse zirh yok --
   kaynaktaki `hasHelmet && hasChest && hasLegs && hasBoots`
   ile ayni kural.                                           */
export function zirhTam(oyuncu) {
  let ekip;
  try {
    ekip = oyuncu.getComponent("minecraft:equippable");
    if (!ekip || typeof ekip.getEquipment !== "function") return false;
  } catch (e) { return false; }
  for (const [yuva, tip] of Object.entries(YENILMEZ_PARCALAR)) {
    let esya;
    try { esya = ekip.getEquipment(yuva); } catch (e) { return false; }
    if (!esya || esya.typeId !== tip) return false;
  }
  return true;
}

/* Oldurme girisimi mi: sebep listede, ya da hasar devasa.  */
export function oldurmeGirisimi(sebep, hasar) {
  if (sebep && YENILMEZ_OLDURME_SEBEP.indexOf(sebep) !== -1) return true;
  return typeof hasar === "number" && hasar >= YENILMEZ_OLDURME_HASAR;
}

/* Ingilizce, komut hatasi gibi duran mesaj. Kullanicinin
   istegi: "hem havalilik hem de guzel bir mekanik".        */
function oldurulemezMesaji(ad, sarj) {
  return [
    "§4§l✖ COMMAND FAILED",
    "§cTarget is protected by the §4§lARMOR OF THE LEGEND§c.",
    "§7» §f/kill §7cannot be executed on this entity.",
    "§8Entity: §7" + ad + " §8· Status: §4UNDYING §8· Charges: §7" +
      sarj + "§8/" + YENILMEZ_SARJ
  ].join("\n");
}

function mesajVer(oyuncu, metin, simdi, d) {
  /* Susturma: /kill spam'i sohbeti bogmasin.               */
  if (simdi - d.sonMesaj < YENILMEZ_SUS) return false;
  d.sonMesaj = simdi;
  try {
    if (YENILMEZ_HERKESE) sohbeteYaz(metin);
    else oyuncu.sendMessage(metin);
  } catch (e) { hataYaz("yenilmez.mesaj", e); }
  return true;
}

/* Hasari geri iyilestir. Avaritia'nin dusme hasarini iptal
   ederken kullandigi teknigin aynisi.                       */
function geriIyilestir(oyuncu, hasar) {
  let c;
  try { c = oyuncu.getComponent("minecraft:health"); }
  catch (e) { return false; }
  if (!c || typeof c.setCurrentValue !== "function") return false;
  const maks = c.effectiveMax || c.defaultValue || 20;
  /* SINIR BURASI: can TAVANI. Bir zamanlar ayrica bir
     "tavan hasar" ayari vardi; mutasyon bataryasi onu OLU
     gosterdi (kaldirildi, hicbir madde dusmedi) cunku
     `Math.min(maks, ...)` zaten sınırlıyor. Silindi.      */
  try {
    c.setCurrentValue(Math.min(maks, (c.currentValue || 0) + hasar));
    return true;
  } catch (e) { hataYaz("yenilmez.iyilestir", e); return false; }
}

export function yenilmezKur() {
  if (!YENILMEZ_ACIK) return false;
  return olayaAbone("entityHurt", (olay) => {
    try {
      const o = olay && olay.hurtEntity;
      if (!o || o.typeId !== "minecraft:player") return;
      if (!gecerliMi(o)) return;
      if (!zirhTam(o)) return;

      const hasar = (olay && typeof olay.damage === "number") ? olay.damage : 0;
      if (hasar <= 0) return;
      let sebep;
      try { sebep = olay.damageSource && olay.damageSource.cause; }
      catch (e) { sebep = undefined; }

      const simdi = system.currentTick;
      const d = kayit(o.id, simdi);

      /* SARJ BITTIYSE ZIRH SOGUYOR. Sinirsiz olsaydi hem bu
         depodaki kurali cignerdi hem duelloyu bitirirdi.   */
      if (d.sarj <= 0) {
        try {
          actionbarYaz(o, "§8✖ §7Zırh soğuyor §8· " +
            Math.ceil((YENILMEZ_DOLUM - (simdi - d.sonDolum)) / 20) + " sn");
        } catch (e) { /* onemsiz */ }
        return;
      }

      if (!geriIyilestir(o, hasar)) return;
      d.sarj -= 1;

      try {
        parcacikAt(o.dimension, YENILMEZ_PARCACIK, o.location);
        o.dimension.playSound(YENILMEZ_SES, o.location);
      } catch (e) { /* gorsel/ses onemsiz */ }

      let ad = "?";
      try { ad = o.name || "?"; } catch (e) { /* onemsiz */ }

      if (oldurmeGirisimi(sebep, hasar)) {
        mesajVer(o, oldurulemezMesaji(ad, d.sarj), simdi, d);
      } else {
        try {
          actionbarYaz(o, "§4✖ §fZırh tuttu §8· " + d.sarj + "/" +
                          YENILMEZ_SARJ + " şarj");
        } catch (e) { /* onemsiz */ }
      }
    } catch (e) {
      hataYaz("yenilmez.hasar", e);
    }
  });
}
