import { system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import {
  hataYaz, gecerliMi, kollariIndir, olayaAbone, actionbarYaz, parcacikAt
} from "../yardimcilar.js";
import {
  YUMRUK_SURE, YUMRUK_HASAR, YUMRUK_PARCACIK
} from "../ayarlar.js";

/* GUNES YUMRUGU -- bir sure boyunca yumrugun daha cok vuruyor.

   Fikir Gunes modundan ("Kirmizi Yumruk"): entityHurt olayina
   abone olup, mod acikken vurdugun her seye ek hasar ekliyor.
   Bizde "pasif mod" turunde hicbir yetenek yoktu; hepsi anlik
   ya da mermi/blok isiydi.

   REFERANSTAKI HATALAR VE BURADAKI KARSILIKLARI

   1. KALICIYDI. Menuden "Ac" deyince sonsuza kadar aciktI;
      kapatmayi unutursan oyunun sonuna kadar 5.3 ek hasar
      vuruyordun. Burasi SURELI, kendiliginden bitiyor.

   2. Durum oyuncu ADIYLA tutuluyordu (attacker.name). Burada
      kimlikle.

   3. Oyuncu cikinca kayit da parcacik dongusu de kaliyordu.
      Burada is bitince durum siliniyor, playerLeave de is
      listesini temizliyor.

   4. Referansta esyayi birakinca da mod acik kaliyordu -- kolu
      cikarip normal kilicla vursan bile ek hasar geliyordu.
      Burasi is olarak calistigi icin suresi dolunca biter;
      ayrica ek hasar sadece is acikken uygulanir.

   5. entityHurt icinde applyDamage cagirmak DIKKAT ister: verilen
      hasar yeni bir entityHurt uretir, o da yine ek hasar
      eklerse SONSUZ DONGU olur. Referansta bu korumasizdi.
      Burada "su an kendi hasarimizi uyguluyoruz" bayragi var.  */

// oyuncuId -> bitis tick'i
const aktif = new Map();

/* Kendi verdigimiz hasarin tekrar tetiklenmesini engelleyen
   bayrak. entityHurt afterEvent'i es zamanli calistigi icin
   basit bir boolean yetiyor.                                  */
let kendiHasarimiz = false;

const kuruldu = olayaAbone("entityHurt", (olay) => {
  if (kendiHasarimiz) return;
  try {
    const kaynak = olay.damageSource;
    const vuran = kaynak ? kaynak.damagingEntity : undefined;
    if (!vuran || vuran.typeId !== "minecraft:player") return;

    const bitis = aktif.get(vuran.id);
    if (bitis === undefined) return;
    if (system.currentTick > bitis) { aktif.delete(vuran.id); return; }

    const hedef = olay.hurtEntity;
    if (!hedef || !gecerliMi(hedef)) return;

    kendiHasarimiz = true;
    try {
      hedef.applyDamage(YUMRUK_HASAR);
      parcacikAt(hedef.dimension, YUMRUK_PARCACIK, hedef.location);
    } finally {
      kendiHasarimiz = false;
    }
  } catch (e) {
    hataYaz("yumruk.entityHurt", e);
  }
});

if (!kuruldu) {
  /* entityHurt yoksa yetenek yine kayitli ama ek hasar
     uygulanamaz; kullaniciya acikca soyleniyor.              */
}

yetenekKaydet({
  kimlik: "yumruk",
  ad: "Gunes Yumrugu",
  esyasiz: true,
  sira: 180,

  olustur(oyuncu) {
    if (!kuruldu) {
      actionbarYaz(oyuncu, "§cBu surumde entityHurt olayi yok, yumruk calismaz");
      kollariIndir(oyuncu);
      return undefined;
    }

    const oyuncuId = oyuncu.id;
    const bitisTick = system.currentTick + YUMRUK_SURE;
    aktif.set(oyuncuId, bitisTick);

    actionbarYaz(oyuncu, "§6✊ §fGunes Yumrugu §7· " +
                 (YUMRUK_SURE / 20).toFixed(0) + " sn §8(+" + YUMRUK_HASAR + " hasar)");

    return {
      ad: "yumruk",
      oyuncuId: oyuncuId,

      calis() {
        if (system.currentTick >= bitisTick) return true;
        if (!gecerliMi(oyuncu)) return true;
        return false;
      },

      bitir() {
        aktif.delete(oyuncuId);
        try {
          if (gecerliMi(oyuncu)) {
            actionbarYaz(oyuncu, "§7Gunes Yumrugu sondu");
          }
        } catch (e) {
          hataYaz("yumruk.bitir", e);
        }
        kollariIndir(oyuncu);
      }
    };
  }
});

/* Oyuncu cikarsa kayit kalmasin. Is listesi zaten temizleniyor
   ama bu Map ondan bagimsiz.                                   */
export function yumrukUnut(oyuncuId) {
  aktif.delete(oyuncuId);
}
