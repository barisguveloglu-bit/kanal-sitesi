import * as api from "@minecraft/server";
import { world, system } from "@minecraft/server";
import { bilgiYaz, hataYaz, gecerliMi } from "../yardimcilar.js";

import {
  BOT_ACIK, BOT_KIMLIK, BOT_TAVAN, BOT_KURTARMA_MENZIL, BOT_KURTARMA_YAKIN,
  BOT_TARAMA, BOT_CAGIR_YAKIN, BOT_DOGUM_YAKIN, BOT_KAYIT_ANAHTAR,
  BOT_SAHIP_OZELLIK, BOT_DURUM_OZELLIK, BOT_OLAY_TAKIP, BOT_OLAY_BEKLE,
  BOT_SCRIPT_MENZIL
} from "../ayarlar.js";

/* ============================================================
   BOT DEFTERI  --  Asama 1

   Depodaki ILK ozel VARLIK. Su ana kadar sadece esya vardi.

   ---- MIMARIYI BELIRLEYEN KISIT ----
   @minecraft/server'da YOL BULMA API'SI YOK. Script'ten bir
   varliga "su koordinata yuru" denemiyor. O yuzden is bolundu:

     YURUMEYI  vanilla AI yapar (minecraft:behavior.follow_owner,
               kurdun/kedinin kullandigi hedef). Gercek yol
               bulma, bedava, akici.
     KURTARMAYI script yapar. Bot cok geride kaldiysa, sikistiysa
               ya da baska boyuttaysa yanina isinlaniyor --
               vanilla takip bunlarin hicbirini cozmuyor.

   ---- BELIRSIZ NOKTA (bilerek iki yollu) ----
   follow_owner bir SAHIP ister ve sahip tameable.tame(oyuncu)
   ile atanir. Bu cagrinin bu API surumundeki tam sekli kesin
   DEGIL. O yuzden:

     tame() tuttuysa  -> vanilla yuruyor, script sadece 24 blokta
                         kurtariyor
     tutmadiysa       -> script takibi: 8 blokta isinlaniyor

   Hangisinin calistigi Content Log'a yaziliyor; tablet denemesi
   soyleyecek. Tahmin edilmiyor.

   ---- NEDEN AYRI DEFTER (is listesine girmiyor) ----
   Kalp ve kafeslerdeki ders. Bot kalici; is listesinde dursaydi
   oyuncunun iki is yuvasindan birini sonsuza kadar tutardi ve
   bot varken tek elle oynamak zorunda kalirdin.
   ============================================================ */

/* oyuncuId -> { botId, boyutId, durum, evcil } */
const defter = new Map();

/* oyuncuId -> bir sonraki tarama tick'i */
const sonraki = new Map();

let tameUyarisi = false;

/* ---------------- Kalicilik ---------------- */

let kaliciDestek;

function kaliciMi() {
  if (kaliciDestek === undefined) {
    kaliciDestek = (typeof world.setDynamicProperty === "function") &&
                   (typeof world.getDynamicProperty === "function");
    if (!kaliciDestek) {
      bilgiYaz("UYARI: dunya ozellikleri yok. Botlar kaydedilemiyor; " +
               "dunyadan cikip girersen bot sahipsiz kalir.");
    }
  }
  return kaliciDestek;
}

/* Kayit bicimi kisa tutuluyor (dunya ozelliginin boyut siniri var):
     [[oyuncuId, botId, boyutId, durum], ...]                     */
function yaz() {
  if (!kaliciMi()) return;
  try {
    const dizi = [];
    for (const [oyuncuId, b] of defter) {
      dizi.push([oyuncuId, b.botId, b.boyutId, b.durum]);
    }
    world.setDynamicProperty(BOT_KAYIT_ANAHTAR,
                             dizi.length === 0 ? undefined : JSON.stringify(dizi));
  } catch (e) {
    hataYaz("bot.yaz", e);
  }
}

let okundu = false;

function oku() {
  if (okundu) return;
  okundu = true;
  if (!kaliciMi()) return;
  try {
    const ham = world.getDynamicProperty(BOT_KAYIT_ANAHTAR);
    if (typeof ham !== "string" || ham.length === 0) return;
    const dizi = JSON.parse(ham);
    if (!Array.isArray(dizi)) return;
    for (const satir of dizi) {
      if (!Array.isArray(satir) || satir.length < 2) continue;
      defter.set(String(satir[0]), {
        botId: String(satir[1]),
        boyutId: satir[2],
        durum: satir[3] === "bekle" ? "bekle" : "takip",
        /* evcil bilgisi KAYDEDILMIYOR: tame() dunya yeniden
           yuklenince de gecerli mi bilmiyoruz. Ilk taramada
           yeniden deneniyor.                                   */
        evcil: undefined
      });
    }
    bilgiYaz("bot defteri okundu: " + defter.size + " bot.");
  } catch (e) {
    hataYaz("bot.oku", e);
  }
}

/* ---------------- Varligi bulma ----------------
   world.getEntity(id) her surumde yok; yoksa boyut taramasina
   dusuluyor (pahali, o yuzden sadece yedek).                   */

let getEntityDestek;

function varligiBul(kayit) {
  if (getEntityDestek === undefined) {
    getEntityDestek = (typeof world.getEntity === "function");
    if (!getEntityDestek) {
      bilgiYaz("world.getEntity yok; bot aramasi boyut taramasiyla " +
               "yapilacak (biraz daha pahali).");
    }
  }

  if (getEntityDestek) {
    try {
      const v = world.getEntity(kayit.botId);
      if (v && gecerliMi(v)) return v;
    } catch (e) {
      hataYaz("bot.getEntity", e);
    }
    return undefined;
  }

  try {
    const boyut = world.getDimension(kayit.boyutId || "minecraft:overworld");
    for (const v of boyut.getEntities({ type: BOT_KIMLIK })) {
      if (v.id === kayit.botId) return v;
    }
  } catch (e) {
    hataYaz("bot.varligiBul", e);
  }
  return undefined;
}

/* ---------------- Sorgu ---------------- */

export function botAl(oyuncuId) {
  oku();
  return defter.get(oyuncuId);
}

export function botVarMi() {
  oku();
  return BOT_ACIK && defter.size > 0;
}

export function botSayisi() {
  oku();
  return defter.size;
}

/* Bir varligin sahibi kim? Varligin KENDI ozelliginden okunuyor.
   Dunya kaydi silinse bile bot bunu tasiyor, yani dokununca
   kendini yeniden baglayabiliyor.                              */
export function botunSahibi(varlik) {
  try {
    if (typeof varlik.getDynamicProperty !== "function") return undefined;
    const s = varlik.getDynamicProperty(BOT_SAHIP_OZELLIK);
    return (typeof s === "string" && s.length > 0) ? s : undefined;
  } catch (e) {
    return undefined;
  }
}

function ozellikYaz(varlik, ad, deger) {
  try {
    if (typeof varlik.setDynamicProperty === "function") {
      varlik.setDynamicProperty(ad, deger);
    }
  } catch (e) {
    /* Varlik ozellikleri bazi surumlerde yok. Dunya kaydi zaten
       var, bu sadece yedek -- sessizce gecilebilir.            */
  }
}

/* ---------------- Evcillestirme ----------------
   follow_owner'in calismasi icin botun bir SAHIBI olmali.     */
function evcillestir(varlik, oyuncu) {
  try {
    const t = varlik.getComponent("minecraft:tameable");
    if (t && typeof t.tame === "function") {
      t.tame(oyuncu);
      return true;
    }
  } catch (e) {
    hataYaz("bot.evcillestir", e);
  }

  if (!tameUyarisi) {
    tameUyarisi = true;
    bilgiYaz("BOT: tameable.tame() kullanilamadi. Vanilla takip " +
             "(follow_owner) calismayacak; bot SCRIPT TAKIBIYLE " +
             "yurutulecek -- " + BOT_SCRIPT_MENZIL + " bloktan " +
             "uzaklasinca yanina isinlanir.");
  }
  return false;
}

/* ---------------- Dogurma ---------------- */

export function botCagir(oyuncu) {
  oku();
  if (!BOT_ACIK) return { hata: "Bot kapali (ayarlar.js: BOT_ACIK)." };

  const kayit = defter.get(oyuncu.id);

  // Zaten varsa: dogurma, yanina getir
  if (kayit) {
    const v = varligiBul(kayit);
    if (v) {
      yanaGetir(v, oyuncu);
      kayit.durum = "takip";
      durumUygula(v, kayit);
      yaz();
      return { tasindi: true };
    }
    /* Kayit var ama varlik yok -- oldurulmus ya da chunk
       yuklenmemis olabilir. Kaydi dusurup yenisini doguruyoruz;
       aksi halde bot bir daha asla gelmezdi.                   */
    defter.delete(oyuncu.id);
  }

  if (defter.size >= BOT_TAVAN * 1 && defter.has(oyuncu.id)) {
    return { hata: "Zaten botun var." };
  }

  /* DIKKAT -- burada varlikIste() YOK, bilerek.

     Ilk yazilista varlikIste(1) vardi ve bot HIC dogmuyordu.
     Sebep main.js'teki tick dongusu:

         if (isler.length === 0) return;
         butceSifirla();

     Butce ancak AKTIF IS varken doluyor. Bot cagirmak anlik bir
     istek; o anda calisan bir is yoksa butce 0'da kaliyor ve
     spawn sonsuza kadar reddediliyordu.

     Zaten butce dongu icinde tick basina ONLARCA sey doguran
     yetenekler icin var (ok yagmuru, TNT yagmuru). Tek bir bot
     bir kez doguyor ve zaten iki kapiya takili: BEKLEME (3 sn)
     ve BOT_TAVAN (oyuncu basina 1).                            */

  let varlik;
  const nokta = yanNokta(oyuncu, BOT_DOGUM_YAKIN);
  try {
    varlik = oyuncu.dimension.spawnEntity(BOT_KIMLIK, nokta);
  } catch (e) {
    hataYaz("bot.spawnEntity", e);
    return {
      hata: "Bot varligi oyuna kayitli degil (" + BOT_KIMLIK + "). " +
            "Behavior pack etkin mi?"
    };
  }
  if (!varlik) return { hata: "Bot dogurulamadi." };

  const evcil = evcillestir(varlik, oyuncu);
  ozellikYaz(varlik, BOT_SAHIP_OZELLIK, oyuncu.id);
  ozellikYaz(varlik, BOT_DURUM_OZELLIK, "takip");

  const yeni = {
    botId: varlik.id,
    boyutId: oyuncu.dimension.id,
    durum: "takip",
    evcil
  };
  defter.set(oyuncu.id, yeni);
  durumUygula(varlik, yeni);
  yaz();

  return { dogdu: true, evcil };
}

export function botGeri(oyuncu) {
  oku();
  const kayit = defter.get(oyuncu.id);
  if (!kayit) return false;

  const v = varligiBul(kayit);
  if (v) {
    try {
      v.remove();
    } catch (e) {
      hataYaz("bot.remove", e);
    }
  }
  defter.delete(oyuncu.id);
  sonraki.delete(oyuncu.id);
  yaz();
  return true;
}

/* ---------------- Durum: takip / bekle ---------------- */

export function botDurum(oyuncu, durum) {
  oku();
  const kayit = defter.get(oyuncu.id);
  if (!kayit) return undefined;

  kayit.durum = (durum === "bekle") ? "bekle" : "takip";
  const v = varligiBul(kayit);
  if (v) {
    durumUygula(v, kayit);
    ozellikYaz(v, BOT_DURUM_OZELLIK, kayit.durum);
  }
  yaz();
  return kayit.durum;
}

/* Varlik JSON'undaki olayi calistirir. "bekle" grubu hareket
   hizini 0 yapiyor, "takip" grubu geri aciyor. triggerEvent
   her surumde var ama olay adi JSON'da yoksa sessizce hicbir
   sey olmuyor -- o yuzden script takibi de duruma bakiyor.    */
function durumUygula(varlik, kayit) {
  try {
    if (typeof varlik.triggerEvent !== "function") return;
    varlik.triggerEvent(kayit.durum === "bekle" ? BOT_OLAY_BEKLE : BOT_OLAY_TAKIP);
  } catch (e) {
    hataYaz("bot.durumUygula", e);
  }
}

/* ---------------- Isinlanma ---------------- */

function yanNokta(oyuncu, uzaklik) {
  const k = oyuncu.location;
  let yon;
  try {
    yon = oyuncu.getViewDirection();
  } catch (e) {
    yon = { x: 0, y: 0, z: 1 };
  }
  /* Bakis yonunun SAGINA koy: tam onune koyarsak nisani
     kapatir, tam arkasina koyarsak gorunmez.                  */
  const sag = { x: -yon.z, z: yon.x };
  const u = Math.hypot(sag.x, sag.z) || 1;
  return {
    x: k.x + (sag.x / u) * uzaklik,
    y: k.y,
    z: k.z + (sag.z / u) * uzaklik
  };
}

function yanaGetir(varlik, oyuncu) {
  try {
    varlik.teleport(yanNokta(oyuncu, BOT_CAGIR_YAKIN),
                    { dimension: oyuncu.dimension });
  } catch (e) {
    /* Bazi surumlerde teleport secenek almiyor; secenegsiz dene */
    try {
      varlik.teleport(yanNokta(oyuncu, BOT_CAGIR_YAKIN));
    } catch (e2) {
      hataYaz("bot.yanaGetir", e2);
    }
  }
}

/* ---------------- Her tick ----------------
   Merkezi tick yoneticisinden cagriliyor. Defter bosken dongu
   hic donmuyor -- iksir ve kalptekiyle ayni kural.            */

export function botTara(oyuncular) {
  if (!BOT_ACIK || defter.size === 0) return;

  const simdi = system.currentTick;

  for (const oyuncu of oyuncular) {
    const kayit = defter.get(oyuncu.id);
    if (!kayit) continue;

    const ne = sonraki.get(oyuncu.id) || 0;
    if (simdi < ne) continue;
    sonraki.set(oyuncu.id, simdi + BOT_TARAMA);

    if (!gecerliMi(oyuncu)) continue;

    const v = varligiBul(kayit);
    if (!v) continue;              // chunk yuklu degil; defterden SILME

    // Bekle durumundayken kurtarma da yok: dur dedik, duracak
    if (kayit.durum === "bekle") continue;

    /* Evcillestirme dunya yeniden yuklenince bilinmiyor olabilir;
       bir kez daha denenip sonuc saklaniyor.                    */
    if (kayit.evcil === undefined) {
      kayit.evcil = evcillestir(v, oyuncu);
      durumUygula(v, kayit);
    }

    try {
      const ayniBoyut = (v.dimension && oyuncu.dimension &&
                         v.dimension.id === oyuncu.dimension.id);

      if (!ayniBoyut) {
        yanaGetir(v, oyuncu);
        kayit.boyutId = oyuncu.dimension.id;
        yaz();
        continue;
      }

      const a = v.location, b = oyuncu.location;
      const uzaklik = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

      /* Vanilla takip calisiyorsa sadece "gercekten kayboldu"
         durumunda karisiyoruz (24 blok). Calismiyorsa botun
         yaninda kalmasinin tek yolu biziz (8 blok).            */
      const esik = kayit.evcil ? BOT_KURTARMA_MENZIL : BOT_SCRIPT_MENZIL;
      if (uzaklik > esik) yanaGetir(v, oyuncu);
    } catch (e) {
      hataYaz("bot.tara", e);
    }
  }
}

/* ---------------- Kayit denetimi ----------------
   v3.5'te 11/11 ESYA sessizce kaydolmamisti; kolDenetimi() o
   yuzden yazildi. Varlik kaydi daha kirilgan (behavior pack
   etkin degilse hic yok), ayni denetim burada.                */
export function botDenetimi() {
  if (!BOT_ACIK) {
    bilgiYaz("bot: kapali (BOT_ACIK = false).");
    return;
  }
  const EntityTypes = api.EntityTypes;
  if (!EntityTypes || typeof EntityTypes.get !== "function") {
    bilgiYaz("EntityTypes bu surumde yok, bot varlik denetimi atlandi.");
    return;
  }
  let tip;
  try {
    tip = EntityTypes.get(BOT_KIMLIK);
  } catch (e) {
    tip = undefined;
  }
  if (tip) {
    bilgiYaz("bot denetimi: " + BOT_KIMLIK + " kayitli. Sohbete 'bot' yaz.");
  } else {
    bilgiYaz("KRITIK: " + BOT_KIMLIK + " oyuna KAYITLI DEGIL. Bot " +
             "cagrilamaz. Muhtemel sebep: behavior pack'teki entities/ " +
             "klasoru dunyaya yuklenmemis ya da varlik JSON'u reddedildi.");
  }
}

/* Testler ve oyuncu cikisi icin. */
export function botUnut(oyuncuId) {
  sonraki.delete(oyuncuId);
}

export function defteriUnut() {
  defter.clear();
  sonraki.clear();
  okundu = false;
  tameUyarisi = false;
}
