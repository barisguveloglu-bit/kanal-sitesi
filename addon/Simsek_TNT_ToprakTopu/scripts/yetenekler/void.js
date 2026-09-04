import { system, world, ItemStack } from "@minecraft/server";
import {
  hataYaz, bilgiYaz, gecerliMi, actionbarYaz, olayaAbone, varlikKonumu,
  parcacikAt
} from "../yardimcilar.js";
import {
  VOID_ACIK, VOID_ALET, VOID_MIGFER, VOID_SURE, VOID_TARAMA,
  VOID_KAYIT_ANAHTAR, VOID_MESAJ,
  ENDER_KILIC, ENDER_FIRLATMA, ENDER_YUMUSAK
} from "../ayarlar.js";

/* ================================================================
   VOID TAKIMI                                              v7.1

   Gerekcenin tamami ayarlar.js'teki VOID TAKIMI bolumunde.
   Burada iki mekanik var, ikisi de VURUSA bagli.

   ---- NEDEN DUSMUS.JS'IN ICINE YAZILMADI ----
   Ikisi de "zorla bir sey giydir, sonra geri ver" yapiyor ama
   Dusmus dort asamali bir DURUM MAKINESI: blok kontrolu,
   ilerleme, ates caresi, secilme, yemin. Burasi tek adim --
   vur, 30 saniye, geri al. Oraya ucuncu bir dal eklemek o
   dosyayi iki farkli seyin ortak atasi yapardi.

   ---- KAYNAKTAN AYRILDIGIMIZ YER ----
   Kaynak `replaceitem entity @a slot.armor.head` diyor: hem
   DUNYADAKI HERKESI vuruyor hem de kafadaki migferi YOK
   EDIYOR, ustelik `lock_in_slot` ile cikarilamaz yapiyor.
   Bizde yalniz vurulan kisi etkileniyor ve eski migferi
   deftere yaziliyor.
   ================================================================ */

/* oyuncuId -> { bitis, migfer }  (migfer: eski esyanin tipi) */
const defter = new Map();

function kaliciMi() {
  try {
    return typeof world.setDynamicProperty === "function" &&
           typeof world.getDynamicProperty === "function";
  } catch (e) {
    return false;
  }
}

function yaz() {
  if (!kaliciMi()) return;
  try {
    const dizi = [];
    for (const [id, k] of defter) dizi.push([id, k.bitis, k.migfer || ""]);
    world.setDynamicProperty(VOID_KAYIT_ANAHTAR,
      dizi.length === 0 ? undefined : JSON.stringify(dizi));
  } catch (e) {
    hataYaz("void.yaz", e);
  }
}

let okundu = false;

function oku() {
  if (okundu) return;
  okundu = true;
  if (!kaliciMi()) return;
  try {
    const ham = world.getDynamicProperty(VOID_KAYIT_ANAHTAR);
    if (typeof ham !== "string" || !ham) return;
    for (const s of JSON.parse(ham)) {
      if (Array.isArray(s) && s.length >= 3) {
        defter.set(String(s[0]),
                   { bitis: Number(s[1]) || 0, migfer: String(s[2]) || "" });
      }
    }
    bilgiYaz("Void defteri okundu: " + defter.size + " kurban.");
  } catch (e) {
    hataYaz("void.oku", e);
  }
}

export function voidUnut(oyuncuId) {
  if (oyuncuId === undefined) {
    /* "Hepsini unut" DUNYA KAYDINI da temizlemeli: yalniz
       bellegi silmek bir sonraki taramada eski kaydin geri
       okunmasi demek (Dusmus'te tam bu hata cikmisti).      */
    defter.clear();
    yaz();
    okundu = false;
    return;
  }
  defter.delete(oyuncuId);
  yaz();
}

export function voidDurum(oyuncuId) {
  return defter.has(oyuncuId);
}
export function voidSayisi() { return defter.size; }

function kafaBileseni(varlik) {
  try {
    const e = varlik.getComponent("minecraft:equippable");
    return (e && typeof e.getEquipment === "function") ? e : undefined;
  } catch (err) {
    return undefined;
  }
}

/* Void'i giydir. Eski migfer DEFTERE yaziliyor -- kaynak onu
   `replaceitem` ile yok ediyordu.                            */
export function voidBulastir(hedef) {
  if (!VOID_ACIK) return false;
  if (!gecerliMi(hedef)) return false;
  if (defter.has(hedef.id)) return false;      // zaten Void

  const ekip = kafaBileseni(hedef);
  if (!ekip) return false;

  let eski = "";
  try {
    const v = ekip.getEquipment("Head");
    eski = v ? v.typeId : "";
  } catch (e) {
    return false;
  }
  /* Zaten Void migferi takiyorsa eskisi diye onu yazma:
     arinca kendini geri takardi.                            */
  if (eski === VOID_MIGFER) eski = "";

  try {
    ekip.setEquipment("Head", new ItemStack(VOID_MIGFER, 1));
  } catch (e) {
    hataYaz("void.giydir", e);
    return false;
  }

  defter.set(hedef.id, { bitis: system.currentTick + VOID_SURE, migfer: eski });
  yaz();
  try {
    if (typeof hedef.sendMessage === "function") hedef.sendMessage(VOID_MESAJ);
    parcacikAt(hedef.dimension, "minecraft:dragon_breath_trail",
               varlikKonumu(hedef));
  } catch (e) { /* gorsel onemsiz */ }
  return true;
}

/* Sure dolunca Void migferi cikar, ESKI migfer geri takilir. */
function arindir(oyuncu, kayit) {
  const ekip = kafaBileseni(oyuncu);
  if (ekip) {
    try {
      /* Kafasindaki Void degilse dokunma: oyuncu arada baska
         bir sey takmis olabilir, onu silmeyelim.           */
      const simdiki = ekip.getEquipment("Head");
      if (!simdiki || simdiki.typeId === VOID_MIGFER) {
        ekip.setEquipment("Head",
          kayit.migfer ? new ItemStack(kayit.migfer, 1) : undefined);
      }
    } catch (e) {
      hataYaz("void.arindir", e);
    }
  }
  defter.delete(oyuncu.id);
  yaz();
  try {
    actionbarYaz(oyuncu, "§a§lVOID GECTI" +
      (kayit.migfer ? " §7· miğferin geri geldi" : ""));
  } catch (e) { /* onemsiz */ }
}

let sonraki = 0;

export function voidTara(oyuncular) {
  if (!VOID_ACIK) return;
  oku();
  /* Defter bosken HIC DONME: deponun kurali.                */
  if (defter.size === 0) return;
  const simdi = system.currentTick;
  if (simdi < sonraki) return;
  sonraki = simdi + VOID_TARAMA;

  for (const oyuncu of oyuncular) {
    const kayit = defter.get(oyuncu.id);
    if (!kayit) continue;
    if (simdi < kayit.bitis) {
      /* Cikarmaya calisirsa geri giydiriliyor -- kaynagin
         `lock_in_slot`unun karsiligi, ama SURELI.           */
      const ekip = kafaBileseni(oyuncu);
      if (ekip) {
        try {
          const v = ekip.getEquipment("Head");
          if (!v || v.typeId !== VOID_MIGFER) {
            ekip.setEquipment("Head", new ItemStack(VOID_MIGFER, 1));
          }
        } catch (e) { /* bir sonraki taramada tekrar denenir */ }
      }
      continue;
    }
    arindir(oyuncu, kayit);
  }
}

/* ---------------- ENDER KILICI ----------------
   Kaynak: `execute positioned ^^^2 run tp @e[r=10,c=1] ~~400~`
   400 blok dusus kesin olum, ustelik `@e` aticiyi ve evcil
   hayvanini da kapsiyor. Bizde yukseklik sinirli, yumusak
   dusus veriliyor ve yalniz VURULAN firliyor.               */
export function enderFirlat(kurban, vuran) {
  if (!VOID_ACIK) return false;
  if (!gecerliMi(kurban)) return false;
  if (vuran && kurban.id === vuran.id) return false;   // kendini firlatma

  try {
    const k = kurban.location;
    kurban.teleport({ x: k.x, y: k.y + ENDER_FIRLATMA, z: k.z },
                    { dimension: kurban.dimension });
  } catch (e) {
    hataYaz("ender.teleport", e);
    return false;
  }
  /* Yumusak dusus: firlatma bir SALDIRI, infaz degil. Hasari
     dususun kendisi veriyor, biz ayrica vurmuyoruz.         */
  try {
    kurban.addEffect("slow_falling", ENDER_YUMUSAK,
                     { amplifier: 0, showParticles: false });
  } catch (e) { /* efekt yoksa dusus sert olur */ }
  try {
    parcacikAt(kurban.dimension, "minecraft:dragon_breath_trail",
               varlikKonumu(kurban));
  } catch (e) { /* onemsiz */ }
  return true;
}

/* ---------------- VURUS KANCASI ----------------
   Iki esya da VURUNCA calisiyor, elde tutulunca degil. Tek
   abone; iki esya da ayni olaydan geciyor.                  */
if (VOID_ACIK) {
  olayaAbone("entityHurt", (olay) => {
    try {
      const vuran = olay.damageSource && olay.damageSource.damagingEntity;
      const kurban = olay.hurtEntity;
      if (!vuran || !kurban) return;
      const ekip = kafaBileseni(vuran);
      if (!ekip) return;
      let elde;
      try {
        const e = ekip.getEquipment("Mainhand");
        elde = e ? e.typeId : undefined;
      } catch (e) { return; }
      if (elde === VOID_ALET) voidBulastir(kurban);
      else if (elde === ENDER_KILIC) enderFirlat(kurban, vuran);
    } catch (e) {
      hataYaz("void.vurus", e);
    }
  });
}
