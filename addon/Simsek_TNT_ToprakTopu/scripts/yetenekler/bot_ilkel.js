import { system, ItemStack } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import {
  hataYaz, gecerliMi, kollariIndir, actionbarYaz, olayaAbone
} from "../yardimcilar.js";
import {
  botCagir, botVarliklari, botSayisi, botunSahibi, ilkelKancasi
} from "./_bot_defteri.js";
import {
  ILKEL_ACIK, ILKEL_TAVAN, ILKEL_BESLI, ILKEL_ADLAR, ILKEL_OZELLIK,
  ILKEL_AURA_OYUNCU, ILKEL_KORUMA, BOT_OLAY_SAVAS_AC,
  BOT_TAVAN, BOT_TARAMA, botTuruMu,
  ILKEL_OK_HASARI, ILKEL_OK_TABAN, MOBA_ISLEMEYEN_EFEKTLER,
  ILKEL_PASIF_ACIK, ILKEL_PASIF_SURE, ILKEL_PASIF_PARCACIK,
  ILKEL_BALTA, ILKEL_BALTA_TAZELE
} from "../ayarlar.js";

/* ============================================================
   ILKEL BESLI  --  bes patron, artik senin tarafinda

   Kullanicinin getirdigi liste bes DUSMANI tarif ediyordu:
   sana vuran, seni korlestiren, kendini iyilestiren patronlar.
   Istek "bunlar benim kisisel botlarim olacak" oldu.

   ---- CEVIRI KURALI ----
   Sayilar aynen korundu (canlar, hasarlar, iyilesme miktarlari,
   efekt seviyeleri, sureler). Ters cevrilen tek sey HEDEF:

     listede                    burada
     ---------------------      ----------------------------
     "oyuncuya Yavaslik III"    botun VURDUGU seye Yavaslik III
     "30 blok civarindaki       civardaki DUSMANLARA
      oyunculara Bulanti V"     (sahip ve ekip disarida)

   Kendi botun seni korlestirseydi bu bir ozellik degil ceza
   olurdu.

   ---- NEREDE NE CALISIYOR ----
   Varlik JSON'unda (kol_uret.py:ILKEL): can, hasar, olcek,
   geri itilme bagisikligi, Miskel'in ok atmasi, Harkos'un
   sicramasi. Bunlar AI ve istatistik; script'e gerek yok.

   Burada: vurulunca/vurunca tetiklenen her sey, Harkos'un
   pasif iyilesmesi, Raxxan'in aurasi ve gizlenmesi, Okazor'un
   uc vurusluk serisi. Bunlar olay ve zaman istiyor.

   ---- OLAYA BAGIMLILIK ----
   entityHurt ve entityHitEntity her surumde YOK. olayaAbone
   ozellik tespiti yapiyor: olay yoksa paket olmuyor, sadece o
   yetenek sessizce kapaniyor ve Content Log'a bir satir
   dusuyor. Ilkel botlar yine doguyor, yine dovusuyor -- sadece
   vurusa bagli ekstralar calismiyor.
   ============================================================ */

/* ---------------- Kimlik ---------------- */

/* Bu varlik hangi ilkel uye? Degil ise undefined.

   Kimlik VARLIGIN kendi ozelliginde: dunya kaydinin bicimini
   degistirmemek icin (v4.27'de bir kez eski dunyalar
   okunamaz olmustu).                                          */
export function ilkelKimligi(varlik) {
  try {
    if (typeof varlik.getDynamicProperty !== "function") return undefined;
    const a = varlik.getDynamicProperty(ILKEL_OZELLIK);
    return (typeof a === "string" && ILKEL_BESLI.has(a)) ? a : undefined;
  } catch (e) {
    return undefined;
  }
}

function tanim(anahtar) {
  return ILKEL_BESLI.get(anahtar);
}

/* ---------------- Can islemleri ---------------- */

function canBileseni(varlik) {
  try {
    return varlik.getComponent("minecraft:health");
  } catch (e) {
    return undefined;
  }
}

/* Iyilestir. Tavan asilmiyor -- "20 HP iyilestir" tam dolu
   bir cana 20 daha eklemek demek degil.                       */
function iyilestir(varlik, miktar) {
  const c = canBileseni(varlik);
  if (!c || typeof c.setCurrentValue !== "function") return false;
  try {
    const simdiki = c.currentValue;
    const tavan = (typeof c.effectiveMax === "number") ? c.effectiveMax
                : (typeof c.defaultValue === "number") ? c.defaultValue
                : simdiki + miktar;
    if (simdiki >= tavan) return false;
    c.setCurrentValue(Math.min(tavan, simdiki + miktar));
    return true;
  } catch (e) {
    hataYaz("ilkel.iyilestir", e);
    return false;
  }
}

function tamDoldur(varlik) {
  const c = canBileseni(varlik);
  if (!c || typeof c.setCurrentValue !== "function") return false;
  try {
    const tavan = (typeof c.effectiveMax === "number") ? c.effectiveMax
                : c.defaultValue;
    if (typeof tavan !== "number") return false;
    c.setCurrentValue(tavan);
    return true;
  } catch (e) {
    hataYaz("ilkel.tamDoldur", e);
    return false;
  }
}

function efektVer(hedef, liste, secenek) {
  if (!liste) return;
  const parcacik = (secenek && secenek.parcacik !== undefined)
    ? secenek.parcacik : true;
  const sureSecenek = secenek && secenek.sure;
  for (const [ad, sure, seviye] of liste) {
    try {
      hedef.addEffect(ad, sureSecenek || sure,
                      { amplifier: seviye, showParticles: parcacik });
    } catch (e) {
      /* Efekt adi bu surumde yoksa digerleri yine verilsin --
         hepsini birden dusurmek gereksiz.                     */
    }
  }
}

/* ---------------- Balta (v4.48) ----------------

   "Bunlar genel olarak Ilkel Besli'nin tamaminda olsun."

   Uc parca birden gerekiyor, biri eksikse balta gorunmuyor:
     1) varlik JSON'unda minecraft:equippable  (kol_uret.py)
     2) geometride "rightItem" kemigi          (kol_uret.py)
     3) esyanin ele konmasi                    (burasi)

   Ele koyma NEDEN script tarafinda: equipment ganimet tablosu
   da yapardi ama onun yuvaya dagitim kurali surumden surume
   degisiyor ve testten gecmiyor. Burada tek satir, sinanabilir
   ve dunya yeniden yuklenince kendi kendine tazeleniyor.      */

let baltaUyarisi = false;

function eldekiEsya(varlik) {
  try {
    const e = varlik.getComponent("minecraft:equippable");
    if (!e || typeof e.getEquipment !== "function") return undefined;
    return e.getEquipment("Mainhand");
  } catch (e) {
    return undefined;
  }
}

/* Baltayi ana ele koyar. Zaten duruyorsa dokunmuyor -- her
   taramada yeni ItemStack uretmek bosuna is olurdu.           */
export function baltaVer(varlik) {
  let bilesen;
  try {
    bilesen = varlik.getComponent("minecraft:equippable");
  } catch (e) {
    bilesen = undefined;
  }
  if (!bilesen || typeof bilesen.setEquipment !== "function") {
    if (!baltaUyarisi) {
      baltaUyarisi = true;
      hataYaz("ilkel.balta", new Error(
        "minecraft:equippable bulunamadi. Ilkel Besli baltasiz " +
        "dovusur; guclerinin hicbiri etkilenmez."));
    }
    return false;
  }

  const simdiki = eldekiEsya(varlik);
  if (simdiki && simdiki.typeId === ILKEL_BALTA) return true;

  try {
    bilesen.setEquipment("Mainhand", new ItemStack(ILKEL_BALTA, 1));
    return true;
  } catch (e) {
    if (!baltaUyarisi) {
      baltaUyarisi = true;
      /* En olasi sebep: kaynak paket etkin degil ya da eski
         surumu etkin, yani esya oyunun defterinde yok.        */
      hataYaz("ilkel.balta", e);
    }
    return false;
  }
}

/* ---------------- Cagirma ---------------- */

/* Bir uyeyi cagirir. Donen deger: {hata} ya da {dogdu, ad}.

   Normal botCagir kullaniliyor, sonra varlik ilkel olayina
   sokuluyor. Yani bu bot her sey yapabiliyor: odun toplar,
   derin tarama yapar, teslim eder -- ustelik 1750 canla.     */
export function ilkelCagir(oyuncu, anahtar) {
  if (!ILKEL_ACIK) return { hata: "İlkel Beşli kapalı (ILKEL_ACIK)." };

  const t = tanim(anahtar);
  if (!t) return { hata: "Bilinmeyen üye: " + anahtar };

  /* Ayni isimden ILKEL_TAVAN taneden fazlasi olmasin: bunlar
     isimli kisiler, kalabalik degil.                          */
  const mevcut = ilkelSayisi(oyuncu.id, anahtar);
  if (mevcut >= ILKEL_TAVAN) {
    return { hata: t.ad + " zaten yanında (" + mevcut + "/" + ILKEL_TAVAN + ")." };
  }

  const sonuc = botCagir(oyuncu, t.kimlik);
  if (sonuc.hata) return sonuc;

  /* DIKKAT -- botCagir'in "tavan" alani IKI ANLAMDA kullaniliyor:
       basarida      tavan: BOT_TAVAN   (sayi, bilgi amacli)
       tavan dolunca tavan: true        (bayrak)
     Yani "if (sonuc.tavan)" basarili cagriyi da yakaliyor. Ilk
     yazimda tam bu oldu: bot doguyordu ama "tavandasin" hatasi
     donuyordu. Dogru sinama DOGDU alani.                       */
  if (!sonuc.dogdu) {
    return { hata: "Bot tavanındasın (" + BOT_TAVAN + "). Önce birkaçını geri gönder." };
  }

  const varlik = sonuc.varlik;
  if (!varlik) return { hata: "Bot doğdu ama varlığa ulaşılamadı." };

  return ilkelYap(varlik, anahtar) ? { dogdu: true, ad: t.ad }
                                   : { hata: "Üye dönüşümü başarısız." };
}

/* Dogan varligi uye olarak ISARETLER.

   v4.34'te burada triggerEvent ile bilesen grubu ekleniyordu;
   v4.35'te her uye kendi varligi oldugu icin istatistikleri
   zaten varlik JSON'unda. Geriye kimlik ve isim kaldi.        */
export function ilkelYap(varlik, anahtar) {
  const t = tanim(anahtar);
  if (!t) return false;

  try {
    if (typeof varlik.setDynamicProperty === "function") {
      varlik.setDynamicProperty(ILKEL_OZELLIK, anahtar);
    }
  } catch (e) {
    /* Ozellik yazilamadi: bot yine guclu (bilesen grubu tuttu)
       ama script tarafi onu tanimaz. Adi yine de takilsin.    */
  }

  /* Koruma gorevi: ekip savasi kapali olsa bile bu bes uye
     savasa hazir doguyor. Isleri bu.                          */
  if (ILKEL_KORUMA) {
    try {
      if (typeof varlik.triggerEvent === "function") {
        varlik.triggerEvent(BOT_OLAY_SAVAS_AC);
      }
    } catch (e) {
      hataYaz("ilkel.koruma", e);
    }
  }

  /* Balta ve sinif ozellikleri dogar dogmaz (v4.48). Ikisi de
     bakim() taramasinda tazeleniyor; buradaki cagri sadece "ilk
     karede zaten oyle gorunsun" icin -- bir tarama beklemek
     uyeyi bos elle dogurmak olurdu.                           */
  baltaVer(varlik);
  pasifVer(varlik, t);

  /* Isim etiketi rutbeyle: kim kimin ustu, bakinca belli olsun.
       [1] Ilkel Savasci Okazor · Ekip Lideri                   */
  try {
    varlik.nameTag = "§6[" + t.rutbe + "] §f" + t.ad + " §7· " + t.unvan;
  } catch (e) {
    // Isim takilamadi; oynanis etkilenmiyor
  }
  return true;
}

export function ilkelSayisi(oyuncuId, anahtar) {
  let n = 0;
  for (const { varlik } of botVarliklari(oyuncuId)) {
    const a = ilkelKimligi(varlik);
    if (a && (anahtar === undefined || a === anahtar)) n++;
  }
  return n;
}

/* Hangi uyeler yanindaysa listesi. Durum raporu icin.        */
export function ilkelListesi(oyuncuId) {
  const bulunan = [];
  for (const { varlik } of botVarliklari(oyuncuId)) {
    const a = ilkelKimligi(varlik);
    if (a) bulunan.push(a);
  }
  return bulunan;
}

/* ---------------- Dusman ayrimi ----------------
   Bir varlik bu botun DUSMANI mi? Sahibi ve ekip arkadaslari
   asla. Oyuncular ayara bagli: yaninda oynayan arkadasini
   surekli mide bulantisinda tutmak ozellik degil eziyet.     */
function dusmanMi(varlik, sahipId) {
  try {
    if (!gecerliMi(varlik)) return false;
    if (varlik.id === sahipId) return false;
    if (botTuruMu(varlik.typeId)) return false;             // ekip arkadasi
    if (varlik.typeId === "minecraft:item" ||
        varlik.typeId === "minecraft:xp_orb") return false;
    if (varlik.typeId === "minecraft:player") return ILKEL_AURA_OYUNCU;
    return true;
  } catch (e) {
    return false;
  }
}

/* ---------------- Vurus olaylari ---------------- */

/* Okazor'un serisi: botId -> [vurus tick'leri] */
const seriler = new Map();

/* Bu efekt listesi bir MOBA bir sey yapar mi?
   Sadece Korluk/Bulanti gibi "ekran efektlerinden" olusan bir
   liste zombiye karsi yok hukmunde.                          */
function moblaraIsler(liste) {
  for (const [ad] of liste) {
    if (!MOBA_ISLEMEYEN_EFEKTLER.has(ad)) return true;
  }
  return false;
}

/* Bot BIR SEYE vurdu. Menzilli uyelerde bu ok degdiginde de
   cagriliyor (v4.47) -- oncesinde sadece yakin dovus vardi ve
   Miskel'in imza yetenegi hic tetiklenmiyordu.               */
function botVurdu(bot, kurban, simdikiTick) {
  const anahtar = ilkelKimligi(bot);
  if (!anahtar) return;
  const t = tanim(anahtar);

  // Kajaros: sabit efekt listesi
  if (t.vurusEfekt) efektVer(kurban, t.vurusEfekt);

  /* Miskel: iki secenekten biri. Listede "VEYA" yaziyordu,
     yani her vuruste yazi tura.

     v4.47 -- YAZI TURA ARTIK HEDEFE BAKIYOR. Secenekten biri
     Korluk XVI: oyuncuya karsi yikici, moba karsi hicbir sey.
     Hedef oyuncu degilse moba islemeyen secenekler eleniyor,
     yani zombi her zaman Solgunluk yiyor. Oyuncuya karsi yazi
     tura AYNEN duruyor -- listedeki "VEYA" orada anlamli.    */
  if (t.vurusEfektSecim) {
    let secenekler = t.vurusEfektSecim;
    let oyuncuMu = false;
    try { oyuncuMu = kurban.typeId === "minecraft:player"; } catch (e) { /* tipi okunamadi */ }
    if (!oyuncuMu) {
      const isleyen = secenekler.filter(moblaraIsler);
      /* Hicbiri islemiyorsa eski davranisa donuluyor: bos liste
         "efekt yok" demek olurdu, o da bir gerileme.           */
      if (isleyen.length > 0) secenekler = isleyen;
    }
    const i = Math.floor(Math.random() * secenekler.length);
    efektVer(kurban, secenekler[i]);
  }

  /* Okazor: "4 saniyelik araliklarla ust uste 3 kez vurmayi
     basarirsa cani tamamen yenilenir." Pencere disinda kalan
     vuruslar dusuyor, yani seri gercekten ARALIKSIZ olmali.  */
  if (t.seri) {
    const liste = (seriler.get(bot.id) || [])
      .filter((tk) => simdikiTick - tk <= t.seri.pencere);
    liste.push(simdikiTick);
    if (liste.length >= t.seri.adet) {
      if (tamDoldur(bot)) liste.length = 0;    // seri harcandi
    }
    seriler.set(bot.id, liste);
  }
}

/* Bot HASAR ALDI. */
function botVuruldu(bot) {
  const anahtar = ilkelKimligi(bot);
  if (!anahtar) return;
  const t = tanim(anahtar);
  if (t.vurulunca) iyilestir(bot, t.vurulunca);
}

/* ---------------- Menzilli vurus (v4.47) ----------------

   Okun hedefi mesru mu? Ok gecerken sahibine ya da ekip
   arkadasina degebilir; ekstra hasar oraya BINMEMELI.

   dusmanMi() burada KULLANILMIYOR bilerek: o fonksiyon
   ILKEL_AURA_OYUNCU'ya bakip oyunculari eliyor, cunku yanindaki
   arkadasini surekli bulantida tutmamak icin yazilmisti. Ama
   Miskel'in asil parladigi yer gercek bir OYUNCUYA karsi
   dovusmek. Burada sadece sahip ve ekip disarida.             */
function okHedefiMi(kurban, sahipId) {
  try {
    if (!gecerliMi(kurban)) return false;
    if (sahipId && kurban.id === sahipId) return false;
    if (botTuruMu(kurban.typeId)) return false;
    if (kurban.typeId === "minecraft:item" ||
        kurban.typeId === "minecraft:xp_orb") return false;
    return true;
  } catch (e) {
    return false;
  }
}

/* Botun attigi mermi bir seye degdi.

   Bedrock'ta okun hasari aticinin attack.damage'inden bagimsiz
   sabit bir sayi. Miskel'in ayarlardaki 28 hasari bu yuzden
   oynanista hic kullanilmiyordu. Aradaki farki burada
   kapatiyoruz -- sayiyi UYDURMUYORUZ, ayardakine ESITLIYORUZ.

   Hasar cinsi "magic": buyucu icin dogru olan bu ve zirhtan
   etkilenmiyor. Zirhli bir hedefe karsi Miskel'in yine
   etkisiz kalmasi ayni sorunun tekrari olurdu.                */
function okVurdu(bot, kurban, simdikiTick) {
  const anahtar = ilkelKimligi(bot);
  if (!anahtar) return;
  const t = tanim(anahtar);

  if (!okHedefiMi(kurban, botunSahibi(bot))) return;

  if (ILKEL_OK_HASARI && typeof t.hasar === "number") {
    const ek = Math.max(0, t.hasar - ILKEL_OK_TABAN);
    if (ek > 0) {
      try {
        kurban.applyDamage(ek, { cause: "magic", damagingEntity: bot });
      } catch (e) {
        /* applyDamage secenekleri bazi surumlerde farkli.
           Sade cagriyi dene; o da olmazsa efektler yine gecerli. */
        try { kurban.applyDamage(ek); } catch (e2) { /* hasar binmedi */ }
      }
    }
  }

  /* Imza yetenegi: yakin dovusteki ile ayni yol. */
  botVurdu(bot, kurban, simdikiTick);
}

let olayUyarisi = false;

function olaylariKur() {
  const vurus = olayaAbone("entityHitEntity", (olay) => {
    try {
      const bot = olay.damagingEntity;
      const kurban = olay.hitEntity;
      if (!bot || !kurban) return;
      if (!botTuruMu(bot.typeId)) return;
      botVurdu(bot, kurban, system.currentTick);
    } catch (e) {
      hataYaz("ilkel.entityHitEntity", e);
    }
  });

  const hasar = olayaAbone("entityHurt", (olay) => {
    try {
      const bot = olay.hurtEntity;
      if (!bot || !botTuruMu(bot.typeId)) return;
      botVuruldu(bot);
    } catch (e) {
      hataYaz("ilkel.entityHurt", e);
    }
  });

  /* Menzilli uyelerin (Miskel) tek vurus yolu bu olay.
     Yoksa Miskel yine ok atar, ama oku sadece vanilla hasarini
     verir ve imza yetenegi tetiklenmez -- yani v4.46'daki
     "etkisiz kaliyor" durumuna geri doner. Sessiz kalmamali.  */
  const mermi = olayaAbone("projectileHitEntity", (olay) => {
    try {
      const bot = olay.source;
      if (!bot || !botTuruMu(bot.typeId)) return;
      const bilgi = (typeof olay.getEntityHit === "function")
        ? olay.getEntityHit() : undefined;
      const kurban = bilgi && bilgi.entity;
      if (!kurban) return;                  // bloga carpti, varliga degil
      okVurdu(bot, kurban, system.currentTick);
    } catch (e) {
      hataYaz("ilkel.projectileHitEntity", e);
    }
  });

  if (!mermi) {
    hataYaz("ilkel.mermi", new Error(
      "projectileHitEntity yok. Miskel ok atmaya devam eder ama " +
      "oku sadece vanilla hasarini verir (~2 kalp) ve Korluk/" +
      "Solgunluk tetiklenmez."));
  }

  if ((!vurus || !hasar) && !olayUyarisi) {
    olayUyarisi = true;
    /* Sessiz kalmasin: "Kajaros neden korlestirmiyor" sorusunun
       cevabi burada.                                          */
    hataYaz("ilkel.olaylar", new Error(
      "entityHitEntity/entityHurt yok. Ilkel Besli doguyor ve " +
      "dovusuyor ama vurusa bagli ekstralar (iyilesme, korluk, " +
      "Okazor serisi) calismaz."));
  }
}

olaylariKur();

/* ---------------- Zamana bagli yetenekler ----------------
   _bot_defteri.js'teki tarama dongusunden cagriliyor (kanca
   ile -- o dosya bu dosyayi import ETMIYOR, dairesel olurdu).

   Tarama BOT_TARAMA (20 tick) araliginda donuyor. Harkos'un
   "tik basina 0,5 HP"si burada 20 x 0.5 = 10 can oluyor, yani
   listedeki hizin AYNISI.                                    */
/* Sinif ozellikleri (v4.48): unvanina gore surekli kendine
   verdigi efektler. Sure ayardan geliyor ve taramadan uzun --
   iki tarama arasinda dusup uye savunmasiz kalmasin.          */
function pasifVer(varlik, t) {
  if (!ILKEL_PASIF_ACIK || !t || !t.pasif) return;
  efektVer(varlik, t.pasif, {
    sure: ILKEL_PASIF_SURE,
    parcacik: ILKEL_PASIF_PARCACIK
  });
}

function bakim(varlik, oyuncu) {
  const anahtar = ilkelKimligi(varlik);
  if (!anahtar) return;
  const t = tanim(anahtar);

  // Sinifina gore surekli efektler (v4.48)
  pasifVer(varlik, t);

  /* Balta dustuyse ya da dunya yeniden yuklendiyse geri koy. */
  if (ILKEL_BALTA_TAZELE) baltaVer(varlik);

  // Harkos: pasif iyilesme
  if (t.tikIyilesme) iyilestir(varlik, t.tikIyilesme * BOT_TARAMA);

  // Raxxan: gizlenme, ansizin iyilesme, bulanti aurasi
  if (t.gizlenme && Math.random() < t.gizlenme.sans) {
    try {
      varlik.addEffect("invisibility", t.gizlenme.sure,
                       { amplifier: 0, showParticles: false });
    } catch (e) {
      // efekt yoksa gorunur kalir
    }
  }
  if (t.ansizinIyilesme && Math.random() < t.ansizinIyilesme.sans) {
    iyilestir(varlik, t.ansizinIyilesme.miktar);
  }
  if (t.aura) {
    let yakin;
    try {
      yakin = varlik.dimension.getEntities({
        location: varlik.location,
        maxDistance: t.aura.menzil,
        excludeTypes: ["minecraft:item", "minecraft:xp_orb"]
      });
    } catch (e) {
      yakin = [];
    }
    for (const v of yakin) {
      if (!dusmanMi(v, oyuncu.id)) continue;
      efektVer(v, [t.aura.efekt]);
    }
  }
}

ilkelKancasi(bakim);

/* Bot geri gonderilince serisi de unutulsun. */
export function ilkelUnut(botId) {
  seriler.delete(botId);
}

/* ---------------- Yetenek kaydi ----------------
   Hedef (hangi uye) yetenek cercevesinden gecmiyor; derin
   taramadaki kalibin aynisi.                                 */

const bekleyen = new Map();      // oyuncuId -> anahtar

export function ilkelHedefSec(oyuncuId, anahtar) {
  bekleyen.set(oyuncuId, anahtar);
}

export function ilkelHedefUnut(oyuncuId) {
  bekleyen.delete(oyuncuId);
}

/* Yazilan adi anahtara cevirir ("suikastci" -> "harkos"). */
export function ilkelAdCoz(kelime) {
  if (!kelime) return undefined;
  return ILKEL_ADLAR.get(String(kelime));
}

yetenekKaydet({
  kimlik: "bot_ilkel",
  ad: "Bot: İlkel Beşli",
  esyasiz: true,
  sira: 248,

  olustur(oyuncu) {
    const anahtar = bekleyen.get(oyuncu.id);
    bekleyen.delete(oyuncu.id);

    /* Uye soylenmediyse SIRADAKI eksik uye cagriliyor: menuden
       bes kez basinca besi de gelsin diye.                    */
    const secilen = anahtar || sonrakiEksik(oyuncu.id);
    if (!secilen) {
      actionbarYaz(oyuncu, "§6İlkel Beşli'nin hepsi yanında.");
      kollariIndir(oyuncu);
      return undefined;
    }

    let sonuc;
    try {
      sonuc = ilkelCagir(oyuncu, secilen);
    } catch (e) {
      hataYaz("bot_ilkel", e);
      kollariIndir(oyuncu);
      return undefined;
    }

    try {
      if (sonuc.hata) {
        oyuncu.sendMessage("§c" + sonuc.hata);
      } else {
        const t = tanim(secilen);
        oyuncu.sendMessage(
          "§6⚔ §f" + t.ad + "§7 yanında. §8" + t.can + " can · " +
          t.hasar + " hasar\n§7" + ozetle(secilen) +
          "\n§8Yanındakiler: " + (ilkelListesi(oyuncu.id).length) + "/" +
          ILKEL_BESLI.size);
      }
    } catch (e) {
      hataYaz("bot_ilkel.duyuru", e);
    }

    kollariIndir(oyuncu);
    return undefined;         // anlik is; surekli is acmiyor
  }
});

/* Hangi uye eksik? RUTBE SIRASIYLA: once lider, sonra asagi
   dogru. Menude "cagir"a bastikca ekip yukaridan kuruluyor.   */
function sonrakiEksik(oyuncuId) {
  const var_ = new Set(ilkelListesi(oyuncuId));
  for (const anahtar of rutbeSirasi()) {
    if (!var_.has(anahtar)) return anahtar;
  }
  return undefined;
}

/* Uyeler rutbeye gore sirali (1 = lider). Menu, rapor ve
   "sonraki eksik" hep bunu kullaniyor -- sira tek yerde.      */
export function rutbeSirasi() {
  return [...ILKEL_BESLI.keys()]
    .sort((a, b) => ILKEL_BESLI.get(a).rutbe - ILKEL_BESLI.get(b).rutbe);
}

/* Pasif efektlerin menude gorunen adlari. */
const PASIF_TR = {
  resistance: "Direnç",
  fire_resistance: "Ateş Bağışıklığı",
  regeneration: "Yenilenme",
  strength: "Güç",
  speed: "Hız",
  jump_boost: "Zıplama",
  night_vision: "Gece Görüşü"
};

/* Uyenin ne yaptigini tek satirda anlat. Ezberlemek zorunda
   kalma diye.                                                */
export function ozetle(anahtar) {
  const t = tanim(anahtar);
  if (!t) return "";
  const p = [];
  if (t.vurulunca) p.push("vurulunca +" + t.vurulunca + " can");
  if (t.vurusEfekt) p.push("vurdugunu yavaslatir/kor eder");
  if (t.vurusEfektSecim) {
    /* v4.47: oku artik tam hasarini tasiyor ve moba karsi hep
       ise yarayan tarafi seciyor. Menude de boyle yaziyor ki
       "neden zayif" sorusu bir daha sorulmasin.               */
    p.push(ILKEL_OK_HASARI ? "oku tam hasar vurur · oyuncuyu kor eder, mobu soldurur"
                           : "vurdugunu kor eder ya da soldurur");
  }
  if (t.tikIyilesme) p.push("surekli kendini iyilestirir");
  if (t.aura) p.push(t.aura.menzil + " blokta dusmani bulandirir");
  if (t.gizlenme) p.push("ara ara gorunmez olur");
  if (t.seri) p.push(t.seri.adet + " ust uste vurursa cani dolar");
  /* Sinif ozellikleri (v4.48). Adlari ayardan degil buradan
     okunuyor cunku ayarda oyunun efekt kimligi var; menude
     Turkcesi lazim. Listede olmayan bir efekt eklenirse
     kimligiyle yaziliyor -- sessizce dusmesin.               */
  if (ILKEL_PASIF_ACIK && t.pasif) {
    const romen = ["I", "II", "III", "IV", "V"];
    p.push(t.pasif
      .map(([ad, , sv]) => (PASIF_TR[ad] || ad) + " " + (romen[sv] || sv + 1))
      .join(", "));
  }
  return p.join(" · ");
}
