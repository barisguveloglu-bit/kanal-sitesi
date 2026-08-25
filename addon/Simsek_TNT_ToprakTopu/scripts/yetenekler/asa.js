import { system, world } from "@minecraft/server";
import {
  hataYaz, gecerliMi, olayaAbone, parcacikAt, varlikKonumu, actionbarYaz
} from "../yardimcilar.js";
import { botunSahibi } from "./_bot_defteri.js";
import {
  mezarEkle, mezariBul, mezarSil, tavanDoldu
} from "./_mezar_defteri.js";
import {
  SERSEM_VURUS, SERSEM_PENCERE, SERSEM_SURE, SERSEM_YAVASLIK, SERSEM_KOR,
  SERSEM_CIVILE, SERSEM_GUCSUZ, ASA_BILDIR,
  MEZAR_ACIK, MEZAR_YARICAP, MEZAR_YUKSEK, MEZAR_BLOK,
  DISMONT_ESYA, MEZAR_ANAHTAR_ADET,
  ASA_OYUNCUDA, ASA_ESYA,
  DONDUR_GIRDI_KILIT, DONDUR_KAMERA_KILIT
} from "../ayarlar.js";

/* ============================================================
   EL-HARKOS'UN ASASI  (v4.50)

   Kullanicinin tarifi, adim adim:

     "2-3 kere vurdugunda karsidaki kisi bir anda yere duser,
      yerde kalir, hareket edemez ama kafasini cevirebilir.
      Yerdeyken asayi bir kez daha kaldirdiginda bir mezar gibi
      bir yapi acilir, o karakteri alir. 10 dismont tasi ile
      mezara kazarsam aciliyor ve karakter kurtulabiliyor."

   Zincir:
     3 vurus (araliksiz)  ->  SERSEM   (yerde, kilitli)
     sersemken 1 vurus    ->  MEZAR    (suresiz, kapali)
     10 dismont ile kaz   ->  ACILIR   (tutsak serbest)

   ---- "HAREKET EDEMEZ AMA KAFASINI CEVIREBILIR" ----
   Bu cumlenin oyundaki tam karsiligi:
     inputpermission set @s movement disabled
     inputpermission set @s camera   enabled
   Ayni mekanizma dondur.js'te v4.33'ten beri var; ikinci bir
   kopya yazilmadi, ayarlari (DONDUR_GIRDI_KILIT /
   DONDUR_KAMERA_KILIT) oradan okunuyor.

   ---- KILIT HEP CIFT ----
   Referans modlarin en can sikici huyu suresiz etkiydi: acan
   komut ayri dosyada, kapatan ayri; unutursan oyuncu sonsuza
   kadar kilitli. Burada kilidi acan her yol onu kapatmayi da
   garanti ediyor:
     - sersemlik suresi dolunca      -> serbest
     - mezar acilinca                -> serbest
     - hedef gecersizlesince (oldu)  -> kayit dusuyor
   ============================================================ */

/* ---------------- Sahibe bildirim ----------------  (v4.59)

   Kullanici oyunda denedi ve "yere sermesini goremedim" dedi.
   Hakliydi: mobda girdi kilidi yok, yavaslik da disaridan
   gorunmuyor -- zincir CALISSA BILE hicbir belirtisi yoktu.

   Artik her adim actionbar'a dusuyor. Boylece "calismiyor" ile
   "calisiyor ama gorunmuyor" birbirinden ayrilabiliyor; hangi
   adimda takildigi tek bakista belli.                        */
function sahibeYaz(bot, metin) {
  if (!ASA_BILDIR) return;
  try {
    /* v4.83: asayi OYUNCU tasiyorsa "sahip" onun kendisi.
       botunSahibi() bir oyuncu icin bos doner ve bildirim
       sessizce duserdi -- yani oyuncu zincirin isledigini
       goremezdi.                                            */
    if (bot && bot.typeId === "minecraft:player") {
      actionbarYaz(bot, metin);
      return;
    }
    const id = botunSahibi(bot);
    if (!id) return;
    /* ONCE getAllPlayers: aradigimiz sey bir OYUNCU ve bu yol
       her surumde kesin calisiyor. world.getEntity oyuncu
       kimligiyle her yerde ayni davranmiyor -- bota once onu
       sorunca bildirim sessizce dusuyordu.                    */
    let oyuncu;
    try {
      oyuncu = world.getAllPlayers().find((p) => p.id === id);
    } catch (e) {
      oyuncu = undefined;
    }
    if (!oyuncu && typeof world.getEntity === "function") {
      oyuncu = world.getEntity(id);
    }
    if (oyuncu) actionbarYaz(oyuncu, metin);
  } catch (e) {
    /* Bildirim gonderilemedi: yetenegin kendisi etkilenmiyor. */
  }
}

/* ---------------- Vurus sayaci ---------------- */

/* botId -> [vurus tick'leri]. Okazor'un serisiyle ayni kalip. */
const vuruslar = new Map();

/* kurbanId -> {varlik, bitis, oyuncuMu} */
const sersemler = new Map();

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
    /* Komut eski surumlerde yok. Yavaslik zaten uygulaniyor,
       yani yetenek yine calisiyor -- sadece oyuncu zorlayarak
       yurüyebilir.                                            */
  }
}

export function sersemMi(varlik) {
  try {
    return varlik && sersemler.has(varlik.id);
  } catch (e) {
    return false;
  }
}

/* Hedefi yere serer. */
function sersemlet(kurban) {
  if (!gecerliMi(kurban)) return false;
  try {
    kurban.addEffect("slowness", SERSEM_SURE,
                     { amplifier: SERSEM_YAVASLIK, showParticles: false });
  } catch (e) {
    /* Efekt verilemedi: girdi kilidi hala is goruyor. */
  }
  if (SERSEM_KOR) {
    try {
      kurban.addEffect("blindness", SERSEM_SURE,
                       { amplifier: 0, showParticles: false });
    } catch (e) { /* onemsiz */ }
  }
  girdiKilidi(kurban, false);

  /* MOBLARI CIVILEME (v4.59). Oyuncuyu inputpermission
     tutuyor ama mobda oyle bir sey yok; yavaslik 255 bile
     yerinde duran bir Warden'in VURMASINI engellemiyor --
     kullanici tam bunu gordu.

     Cozum: dustugu noktayi kaydet, her taramada oraya geri
     isinla. Yurumeye calisiyor, yerinden oynayamiyor.        */
  let nokta;
  try { nokta = varlikKonumu(kurban); } catch (e) { nokta = undefined; }

  /* Ustelik vurusu da islemesin: Gucsuzluk yakin dovus
     hasarini dusuruyor. "Yerde yatan adam" vurmamali.        */
  if (SERSEM_GUCSUZ) {
    try {
      kurban.addEffect("weakness", SERSEM_SURE,
                       { amplifier: SERSEM_GUCSUZ, showParticles: false });
    } catch (e) { /* efekt yoksa gecilir */ }
  }

  sersemler.set(kurban.id, {
    varlik: kurban,
    nokta: nokta,
    bitis: system.currentTick + SERSEM_SURE
  });

  try {
    parcacikAt(kurban.dimension, "minecraft:large_explosion",
               varlikKonumu(kurban));
  } catch (e) { /* parcacik yoksa onemsiz */ }
  return true;
}

/* Sersemligi bitirir ve kilidi MUTLAKA acar. */
export function ayilt(kurbanId) {
  const kayit = sersemler.get(kurbanId);
  if (!kayit) return false;
  sersemler.delete(kurbanId);
  const v = kayit.varlik;
  if (gecerliMi(v)) {
    girdiKilidi(v, true);
    try { v.removeEffect("slowness"); } catch (e) { /* onemsiz */ }
    try { v.removeEffect("weakness"); } catch (e) { /* onemsiz */ }
  }
  return true;
}

/* Suresi dolanlari serbest birakir. Merkezi dongu cagiriyor. */
export function asaTara() {
  if (sersemler.size === 0) return;
  const simdi = system.currentTick;
  for (const [id, kayit] of sersemler) {
    if (!gecerliMi(kayit.varlik)) { sersemler.delete(id); continue; }
    if (simdi >= kayit.bitis) { ayilt(id); continue; }

    /* Civileme: dustugu noktaya geri. Oyuncuda gerek yok,
       onu girdi kilidi zaten tutuyor -- ustune isinlanma
       eklemek kamerayi sarsardi.                             */
    if (!SERSEM_CIVILE || !kayit.nokta) continue;
    if (kayit.varlik.typeId === "minecraft:player") continue;
    try {
      const s = varlikKonumu(kayit.varlik);
      const dx = s.x - kayit.nokta.x, dz = s.z - kayit.nokta.z;
      /* Kucuk kaymalar icin isinlanma cagirmiyoruz: her
         taramada teleport hem pahali hem titretiyor.         */
      if (dx * dx + dz * dz > 0.25) {
        kayit.varlik.teleport(kayit.nokta);
      }
    } catch (e) {
      /* Isinlanamadi: yavaslik ve gucsuzluk yine gecerli. */
    }
  }
}

/* ---------------- Mezar ---------------- */

/* Ici bos, disi kapali bir kutu: tutsak icinde durur.
   kutuKabugu() kullanilmadi cunku o kure/kubbe icin yazilmis;
   mezar kare ve kucuk -- 3x3 taban, MEZAR_YUKSEK boy.        */
function mezarNoktalari() {
  const r = MEZAR_YARICAP;
  const noktalar = [];
  for (let x = -r - 1; x <= r + 1; x++) {
    for (let z = -r - 1; z <= r + 1; z++) {
      for (let y = -1; y <= MEZAR_YUKSEK; y++) {
        const kenar = (Math.abs(x) > r || Math.abs(z) > r ||
                       y === -1 || y === MEZAR_YUKSEK);
        if (kenar) noktalar.push({ x, y, z });
      }
    }
  }
  return noktalar;
}

const MEZAR_KABUK = mezarNoktalari();

/* Mezari kurar. Tutsak icine isinlaniyor cunku kabuk onun
   BULUNDUGU yere kuruluyor ve arada yarim blok kayma olursa
   duvarin icinde kalabilir.                                   */
function mezarAc(kurban) {
  if (!MEZAR_ACIK) return false;
  if (tavanDoldu()) return false;
  if (!gecerliMi(kurban)) return false;

  const boyut = kurban.dimension;
  const k = varlikKonumu(kurban);
  const merkez = { x: Math.floor(k.x), y: Math.floor(k.y), z: Math.floor(k.z) };
  const konan = [];

  for (const n of MEZAR_KABUK) {
    const p = { x: merkez.x + n.x, y: merkez.y + n.y, z: merkez.z + n.z };
    try {
      const blok = boyut.getBlock(p);
      if (!blok) continue;
      /* SADECE HAVAYA koyuluyor: oyuncunun evini mezara
         cevirmek geri alinamaz bir hata olurdu. Hapis
         kafesinde de ayni kural var.                          */
      if (!blok.isAir) continue;
      blok.setType(MEZAR_BLOK);
      konan.push(p);
    } catch (e) {
      /* Yuklenmemis parca ya da dunya siniri: atlaniyor. */
    }
  }

  if (konan.length === 0) return false;

  try {
    kurban.teleport({ x: merkez.x + 0.5, y: merkez.y, z: merkez.z + 0.5 },
                    { dimension: boyut });
  } catch (e) {
    /* Isinlanamadi: mezar yine kuruldu, tutsak kenarda. */
  }

  mezarEkle(boyut.id, merkez, konan, kurban.id);
  return true;
}

/* Mezari acar: butun bloklari havaya cevirir, tutsagi serbest
   birakir. Donen: acildi mi.                                   */
export function mezariAc(boyut, mezar) {
  if (!mezar) return false;
  for (const n of mezar.k) {
    try {
      const blok = boyut.getBlock({ x: n[0], y: n[1], z: n[2] });
      if (!blok) continue;
      /* SADECE kendi blogumuz sokuluyor: aradan gecen sure
         icinde oyuncu oraya bir sey koyduysa ona dokunma.    */
      if (blok.typeId !== MEZAR_BLOK) continue;
      blok.setType("minecraft:air");
    } catch (e) {
      /* Parca yuklu degil: kalanlar denenmeye devam ediyor. */
    }
  }
  if (mezar.i) ayilt(mezar.i);
  mezarSil(mezar);
  return true;
}

/* ---------------- Vurus zinciri ----------------
   bot_ilkel.js:botVurdu buradan cagiriyor. Donen deger sadece
   bilgi amacli.                                                */
export function asaVurusu(bot, kurban, simdikiTick) {
  if (!gecerliMi(kurban)) return "yok";

  /* v4.83: asayi oyuncu da tasiyabiliyor. Bildirimlerde
     "El-Harkos gomdu" yazmak yanlis olurdu -- gomen sensin. */
  let vuran = "El-Harkos";
  try {
    if (bot && bot.typeId === "minecraft:player") vuran = "Asa";
  } catch (e) { /* tipi okunamadi: varsayilan kalsin */ }

  /* Zaten yerdeyse bu vurus MEZARI aciyor -- "yerdeyken asayi
     bir kez daha kaldirdiginda".                              */
  if (sersemler.has(kurban.id)) {
    if (mezarAc(kurban)) {
      vuruslar.delete(bot.id);
      sahibeYaz(bot, "§8⚰ §fMezar açıldı §7· " + vuran + " gömdü");
      return "mezar";
    }
    sahibeYaz(bot, "§8⚰ §7Mezar açılamadı §8(yer dolu ya da tavan)");
    return "sersem";
  }

  const liste = (vuruslar.get(bot.id) || [])
    .filter((v) => simdikiTick - v.tick <= SERSEM_PENCERE && v.hedef === kurban.id);
  liste.push({ tick: simdikiTick, hedef: kurban.id });

  if (liste.length >= SERSEM_VURUS) {
    vuruslar.set(bot.id, []);
    if (sersemlet(kurban)) {
      sahibeYaz(bot, "§3⬤ §fYere serildi §7· bir vuruş daha = mezar");
      return "sersem";
    }
    return "yok";
  }
  vuruslar.set(bot.id, liste);
  sahibeYaz(bot, "§3⬤ §7" + vuran + " §f" + liste.length + "§7/" + SERSEM_VURUS);
  return "sayiyor";
}

/* Bot geri gonderilince sayaci da unutulsun. */
export function asaUnut(botId) {
  vuruslar.delete(botId);
}

/* ---------------- Kurtarma ----------------
   "10 tane ile mezara kazarsam aciliyor."

   Blogu KIRMAK tetikliyor (kullanici "kazarsam" dedi). Yeterli
   tasi yoksa blok geri konuyor: yoksa mezar delik delik olur ve
   tutsak anahtarsiz kacardi.                                   */

function dismontSayisi(oyuncu) {
  try {
    const env = oyuncu.getComponent("minecraft:inventory");
    const kutu = env && env.container;
    if (!kutu) return 0;
    let toplam = 0;
    for (let i = 0; i < kutu.size; i++) {
      const e = kutu.getItem(i);
      if (e && e.typeId === DISMONT_ESYA) toplam += e.amount;
    }
    return toplam;
  } catch (e) {
    hataYaz("asa.dismontSayisi", e);
    return 0;
  }
}

/* Envanterden adet kadar dismont dusurur. Donen: dusurulen. */
function dismontHarca(oyuncu, adet) {
  let kalan = adet;
  try {
    const env = oyuncu.getComponent("minecraft:inventory");
    const kutu = env && env.container;
    if (!kutu) return 0;
    for (let i = 0; i < kutu.size && kalan > 0; i++) {
      const e = kutu.getItem(i);
      if (!e || e.typeId !== DISMONT_ESYA) continue;
      if (e.amount <= kalan) {
        kalan -= e.amount;
        kutu.setItem(i, undefined);
      } else {
        e.amount -= kalan;
        kutu.setItem(i, e);
        kalan = 0;
      }
    }
  } catch (e) {
    hataYaz("asa.dismontHarca", e);
  }
  return adet - kalan;
}

/* ---------------- ASA OYUNCUNUN ELINDE ----------------  (v4.83)

   Zincirin kendisi degismedi; sadece IKINCI bir tetik eklendi.
   asaVurusu() sayaci vuranin kimligiyle tutuyor, yani oyuncu
   da bot da ayni koddan geciyor.

   VURANIN ELINE BAKILIYOR, envanterine degil: asayi cantada
   tasimak yetmez, kullanman gerekir.                          */
function asaTasiyorMu(varlik) {
  try {
    const e = varlik.getComponent("minecraft:equippable");
    if (!e || typeof e.getEquipment !== "function") return false;
    const esya = e.getEquipment("Mainhand");
    return !!esya && esya.typeId === ASA_ESYA;
  } catch (e) {
    return false;
  }
}

let oyuncuUyarisi = false;

export function asaOyuncuKancasi() {
  if (!ASA_OYUNCUDA) return;
  const vurus = olayaAbone("entityHitEntity", (olay) => {
    try {
      const vuran = olay.damagingEntity;
      const kurban = olay.hitEntity;
      if (!vuran || !kurban) return;
      if (vuran.typeId !== "minecraft:player") return;   // botun yolu ayri
      if (!asaTasiyorMu(vuran)) return;
      asaVurusu(vuran, kurban, system.currentTick);
    } catch (e) {
      hataYaz("asa.oyuncuVurusu", e);
    }
  });

  if (!vurus && !oyuncuUyarisi) {
    oyuncuUyarisi = true;
    hataYaz("asa.oyuncuVurusu", new Error(
      "entityHitEntity yok. Asa oyuncunun elinde zincir " +
      "baslatamaz; El-Harkos'un kendi yolu etkilenmiyor."));
  }
}

let kirmaUyarisi = false;

export function asaKancalari() {
  const kirma = olayaAbone("playerBreakBlock", (olay) => {
    try {
      const oyuncu = olay.player;
      const konum = olay.block ? olay.block.location : olay.blockLocation;
      if (!oyuncu || !konum) return;
      const boyut = oyuncu.dimension;

      const mezar = mezariBul(boyut.id, konum);
      if (!mezar) return;                 // bizim blogumuz degil

      const eldeki = dismontSayisi(oyuncu);
      if (eldeki < MEZAR_ANAHTAR_ADET) {
        /* Yetmiyor: kirdigi blogu GERI KOY, yoksa mezar delinip
           tutsak anahtarsiz kacardi.                           */
        try {
          const b = boyut.getBlock(konum);
          if (b) b.setType(MEZAR_BLOK);
        } catch (e) { /* geri konamadi */ }
        try {
          oyuncu.sendMessage(
            "§8⚰ §7Mezar taşı direniyor. §f" + MEZAR_ANAHTAR_ADET +
            " dismont taşı§7 gerekiyor — sende §f" + eldeki + "§7 var.");
        } catch (e) { /* mesaj gonderilemedi */ }
        return;
      }

      dismontHarca(oyuncu, MEZAR_ANAHTAR_ADET);
      mezariAc(boyut, mezar);
      try {
        oyuncu.sendMessage("§6⚰ §fMezar açıldı. §7" + MEZAR_ANAHTAR_ADET +
                           " dismont taşı harcandı.");
      } catch (e) { /* mesaj gonderilemedi */ }
    } catch (e) {
      hataYaz("asa.playerBreakBlock", e);
    }
  });

  if (!kirma && !kirmaUyarisi) {
    kirmaUyarisi = true;
    hataYaz("asa.kirma", new Error(
      "playerBreakBlock yok. El-Harkos mezar acabilir ama mezar " +
      "dismont tasiyla ACILAMAZ -- sadece suresi dolan sersemlik " +
      "calisir."));
  }
}

asaKancalari();
asaOyuncuKancasi();
