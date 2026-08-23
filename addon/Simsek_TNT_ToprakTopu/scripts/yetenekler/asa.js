import { system } from "@minecraft/server";
import { hataYaz, gecerliMi, olayaAbone, parcacikAt, varlikKonumu } from "../yardimcilar.js";
import {
  mezarEkle, mezariBul, mezarSil, tavanDoldu
} from "./_mezar_defteri.js";
import {
  SERSEM_VURUS, SERSEM_PENCERE, SERSEM_SURE, SERSEM_YAVASLIK, SERSEM_KOR,
  MEZAR_ACIK, MEZAR_YARICAP, MEZAR_YUKSEK, MEZAR_BLOK,
  DISMONT_ESYA, MEZAR_ANAHTAR_ADET,
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

  sersemler.set(kurban.id, {
    varlik: kurban,
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
  }
  return true;
}

/* Suresi dolanlari serbest birakir. Merkezi dongu cagiriyor. */
export function asaTara() {
  if (sersemler.size === 0) return;
  const simdi = system.currentTick;
  for (const [id, kayit] of sersemler) {
    if (!gecerliMi(kayit.varlik)) { sersemler.delete(id); continue; }
    if (simdi >= kayit.bitis) ayilt(id);
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

  /* Zaten yerdeyse bu vurus MEZARI aciyor -- "yerdeyken asayi
     bir kez daha kaldirdiginda".                              */
  if (sersemler.has(kurban.id)) {
    if (mezarAc(kurban)) {
      vuruslar.delete(bot.id);
      return "mezar";
    }
    return "sersem";
  }

  const liste = (vuruslar.get(bot.id) || [])
    .filter((v) => simdikiTick - v.tick <= SERSEM_PENCERE && v.hedef === kurban.id);
  liste.push({ tick: simdikiTick, hedef: kurban.id });

  if (liste.length >= SERSEM_VURUS) {
    vuruslar.set(bot.id, []);
    return sersemlet(kurban) ? "sersem" : "yok";
  }
  vuruslar.set(bot.id, liste);
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
