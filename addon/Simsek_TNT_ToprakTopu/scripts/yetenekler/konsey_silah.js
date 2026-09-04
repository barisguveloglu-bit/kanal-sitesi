import { system, ItemStack } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import {
  gecerliMi, actionbarYaz, kollariIndir, parcacikAt,
  varlikKonumu, eldekiEsya
} from "../yardimcilar.js";
import {
  KONSEY_SILAH_ACIK, KONSEY_SILAH, KONSEY_ASA_SESI,
  KONSEY_SILAH_MENZIL, KONSEY_SILAH_SURE, KONSEY_SILAH_BEKLEME,
  KONSEY_SILAH_TAVAN, KONSEY_SES_BEKLEME,
  DISMONT_ESYA, DONDUR_GIRDI_KILIT, DONDUR_KAMERA_KILIT,
  SERSEM_YAVASLIK, SERSEM_GUCSUZ
} from "../ayarlar.js";

/* ================================================================
   KONSEY SILAHLARI + AY ISIGI ASASI                        v6.3

   Kullanici: "Biyo Silah'in 'vurdugunu zehirli yap'i bizde zaten
   var... Ay Isigi'nin sesi de pakette duruyor. Bunu da hallet."

   ---- KAYNAKTAKI MEKANIK ----
   Iki silahin da MERMISI carpinca bir fonksiyon cagiriyor
   (klezy_bio_gun_bullet.json -> `biogunyap1`). O fonksiyon:
   kurbani etiketliyor, hareket/kamera/egilmeyi kapatiyor,
   kafasina bir deri takiyor ve gorunmezlik veriyor. Bobby
   Silahi ayni sey, deri `dirt`.

   Yani ikisi de "vurdugunu DONDURUP baska bir seye cevir" --
   tas.js'in isinin aynisi. O yuzden kurallar da oradan
   devralindi (dosyanin basindaki ayarlar.js notunda uc madde
   halinde yaziyor).

   ---- NEDEN TAS.JS'IN ICINE YAZILMADI ----
   Tas.js kurbani bir BLOGUN icine isinliyor: gorunumu blok
   sagliyor, zirh yuvasina hic dokunmuyor. Burada gorunumu
   DERI sagliyor ve kurban yerinde kaliyor. Iki farkli
   gorunum yolu; ortak olan yalniz kilit, ki o zaten
   asa.js'in makinesi ve ikisi de onu cagiriyor.

   ---- KAFA YUVASI: TAKTIYSAK CIKARIRIZ, TAKMADIYSAK DOKUNMAYIZ ----
   Kaynak kurbanin kafasindakini SILIYOR. Bu depoda esya
   kaybettiren hicbir sey yok, o yuzden deri YALNIZ yuva
   BOSSA takiliyor ve serbest kalinca YALNIZ bizim taktigimiz
   parca cikariliyor. Yuva doluysa gorunum atlaniyor, etki
   yine uygulaniyor ve vurana sebebi yaziliyor.
   ================================================================ */

/* kurbanId -> { varlik, bitis, deriTakildi, deri } */
const kurbanlar = new Map();
/* oyuncuId|kimlik -> bir sonraki kullanimin en erken tick'i */
const bekleme = new Map();

export function konseySilahUnut(oyuncuId) {
  if (oyuncuId === undefined) { kurbanlar.clear(); bekleme.clear(); return; }
  for (const a of [...bekleme.keys()]) {
    if (a.startsWith(oyuncuId + "|")) bekleme.delete(a);
  }
  const k = kurbanlar.get(oyuncuId);
  if (k) { serbestBirak(oyuncuId, k); }
}

/* asa.js / tas.js ile AYNI kilit. Ikinci bir kopya yazilmadi. */
function girdiKilidi(hedef, acikMi) {
  if (!DONDUR_GIRDI_KILIT) return;
  if (hedef.typeId !== "minecraft:player") return;   // moblarda komut yok
  if (typeof hedef.runCommand !== "function") return;
  const deger = acikMi ? "enabled" : "disabled";
  try {
    hedef.runCommand("inputpermission set @s movement " + deger);
    if (DONDUR_KAMERA_KILIT) {
      hedef.runCommand("inputpermission set @s camera " + deger);
    }
  } catch (e) {
    /* Komut eski surumlerde yok; yavaslik yine uygulaniyor. */
  }
}

/* Kafa yuvasi BOSSA deriyi takar. Doluysa DOKUNMAZ.
   Donen deger: taktik mi.                                    */
function deriTak(kurban, deriKimlik) {
  let bilesen;
  try {
    bilesen = kurban.getComponent("minecraft:equippable");
  } catch (e) { return false; }
  if (!bilesen) return false;
  try {
    const simdiki = bilesen.getEquipment("Head");
    if (simdiki) return false;               // dolu: dokunma
  } catch (e) { return false; }
  try {
    /* iksirler.js:90 ve bot_ilkel.js:206 ile AYNI yol --
       ucuncu bir esya uretme bicimi acilmadi.               */
    bilesen.setEquipment("Head", new ItemStack(deriKimlik, 1));
    return true;
  } catch (e) {
    /* Esya kaydolmadiysa gorunum atlanir, etki yine gider. */
    return false;
  }
}

function deriCikar(kurban) {
  try {
    const bilesen = kurban.getComponent("minecraft:equippable");
    if (bilesen) bilesen.setEquipment("Head", undefined);
  } catch (e) {
    /* Cikaramadik: kurban serbest, deri uzerinde kalabilir. */
  }
}

function serbestBirak(id, kayit) {
  kurbanlar.delete(id);
  const v = kayit.varlik;
  if (!gecerliMi(v)) return;
  girdiKilidi(v, true);
  for (const ad of ["slowness", "weakness", "poison"]) {
    try { v.removeEffect(ad); } catch (e) { /* onemsiz */ }
  }
  /* YALNIZ bizim taktigimiz parca cikariliyor. */
  if (kayit.deriTakildi) deriCikar(v);
  try {
    parcacikAt(v.dimension, "minecraft:villager_happy", varlikKonumu(v));
  } catch (e) { /* parcacik onemsiz */ }
}

/* Merkezi tarama: suresi dolani serbest birakir.
   Defter bosken HIC donmiyor -- kalp ve tas ile ayni kural. */
export function konseySilahTara() {
  if (kurbanlar.size === 0) return;
  const simdi = system.currentTick;
  for (const [id, kayit] of kurbanlar) {
    if (!gecerliMi(kayit.varlik)) { kurbanlar.delete(id); continue; }
    if (simdi >= kayit.bitis) serbestBirak(id, kayit);
  }
}

/* Freedom Stone ile erken kurtulma -- tas.js ve mezar ile
   AYNI anahtar esyasi.                                       */
export function konseySilahKir(oyuncu) {
  const kayit = kurbanlar.get(oyuncu.id);
  if (!kayit) return false;
  let bulundu = 0;
  try {
    const kap = oyuncu.getComponent("minecraft:inventory").container;
    for (let i = 0; i < kap.size; i++) {
      const e = kap.getItem(i);
      if (e && e.typeId === DISMONT_ESYA) bulundu += e.amount;
    }
  } catch (e) { return false; }
  if (bulundu <= 0) return false;
  serbestBirak(oyuncu.id, kayit);
  return true;
}

function vur(atan, hedef, t) {
  if (kurbanlar.has(hedef.id)) return false;          // zaten kurban
  if (kurbanlar.size >= KONSEY_SILAH_TAVAN) return false;

  try {
    hedef.addEffect("slowness", KONSEY_SILAH_SURE,
                    { amplifier: SERSEM_YAVASLIK, showParticles: false });
  } catch (e) { /* efekt verilemedi */ }
  try {
    hedef.addEffect("weakness", KONSEY_SILAH_SURE,
                    { amplifier: SERSEM_GUCSUZ, showParticles: false });
  } catch (e) { /* efekt verilemedi */ }
  for (const [ad, sure, seviye] of t.etki) {
    try {
      hedef.addEffect(ad, sure, { amplifier: seviye, showParticles: false });
    } catch (e) { /* efekt adi bu surumde yok */ }
  }
  girdiKilidi(hedef, false);

  const takildi = deriTak(hedef, t.deri);
  kurbanlar.set(hedef.id, {
    varlik: hedef, bitis: system.currentTick + KONSEY_SILAH_SURE,
    deriTakildi: takildi, deri: t.deri
  });
  try {
    parcacikAt(hedef.dimension, "minecraft:large_explosion",
               varlikKonumu(hedef));
  } catch (e) { /* parcacik onemsiz */ }
  return takildi;
}

function sesCal(oyuncu, ses) {
  try {
    const k = varlikKonumu(oyuncu);
    oyuncu.dimension.playSound(ses, k);
  } catch (e) {
    /* playSound bu surumde yoksa yetenek yine calisti. */
  }
}

/* Bekleme kapisi: iki yetenek turu de kullaniyor. */
function hazirMi(oyuncu, kimlik, ad, sureTick) {
  const anahtar = oyuncu.id + "|" + kimlik;
  const simdi = system.currentTick;
  const erken = bekleme.get(anahtar) || 0;
  if (simdi < erken) {
    actionbarYaz(oyuncu, "§7" + ad + " hazır değil §8· " +
                 ((erken - simdi) / 20).toFixed(1) + " sn");
    return false;
  }
  bekleme.set(anahtar, simdi + sureTick);
  return true;
}

/* ---------------- SILAHLAR ---------------- */
let _sira = 480;
for (const [kimlik, t] of KONSEY_SILAH) {
  yetenekKaydet({
    kimlik: "kns_atis_" + kimlik.replace("kns_silah_", ""),
    ad: t.ad,
    esyasiz: true,
    sira: _sira++,

    olustur(oyuncu) {
      if (!KONSEY_SILAH_ACIK) {
        actionbarYaz(oyuncu, "§cKonsey silahları kapalı.");
        kollariIndir(oyuncu);
        return undefined;
      }
      /* Yetenek MENUDEN de secilebiliyor: dogru silah elinde
         mi, burada da sinaniyor.                            */
      let elde;
      try { elde = eldekiEsya(oyuncu); } catch (e) { elde = undefined; }
      if (!elde || elde.typeId !== "pa:" + kimlik) {
        actionbarYaz(oyuncu, "§c" + t.ad + " elinde olmalı");
        kollariIndir(oyuncu);
        return undefined;
      }
      if (!hazirMi(oyuncu, kimlik, t.ad, KONSEY_SILAH_BEKLEME)) {
        kollariIndir(oyuncu);
        return undefined;
      }

      sesCal(oyuncu, t.ses);

      let hedef;
      try {
        const vurulan = oyuncu.getEntitiesFromViewDirection(
          { maxDistance: KONSEY_SILAH_MENZIL });
        hedef = vurulan && vurulan.length ? vurulan[0].entity : undefined;
      } catch (e) {
        hedef = undefined;
      }
      if (!hedef || !gecerliMi(hedef) || hedef.id === oyuncu.id) {
        actionbarYaz(oyuncu, "§7" + t.ad + " §8· hedef yok");
        kollariIndir(oyuncu);
        return undefined;
      }

      const takildi = vur(oyuncu, hedef, t);
      actionbarYaz(oyuncu, "§a☣ " + t.ad + " §8· " +
        (KONSEY_SILAH_SURE / 20) + " sn" +
        (takildi ? "" : " §7(kafa yuvası dolu, görünüm atlandı)"));
      kollariIndir(oyuncu);
      return undefined;
    }
  });
}

/* ---------------- AY ISIGI ASASI: SARKI ---------------- */
for (const [kimlik, t] of KONSEY_ASA_SESI) {
  yetenekKaydet({
    kimlik: "kns_sarki_" + kimlik.replace("kns_asa_", ""),
    ad: t.ad + " · Şarkı",
    esyasiz: true,
    sira: _sira++,

    olustur(oyuncu) {
      let elde;
      try { elde = eldekiEsya(oyuncu); } catch (e) { elde = undefined; }
      if (!elde || elde.typeId !== "pa:" + kimlik) {
        actionbarYaz(oyuncu, "§c" + t.ad + " elinde olmalı");
        kollariIndir(oyuncu);
        return undefined;
      }
      if (!hazirMi(oyuncu, kimlik, t.ad, KONSEY_SES_BEKLEME)) {
        kollariIndir(oyuncu);
        return undefined;
      }
      sesCal(oyuncu, t.ses);
      actionbarYaz(oyuncu, "§d♪ " + t.ad);
      kollariIndir(oyuncu);
      return undefined;
    }
  });
}
