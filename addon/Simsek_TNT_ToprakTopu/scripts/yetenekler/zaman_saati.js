import { system, world } from "@minecraft/server";
import {
  hataYaz, bilgiYaz, gecerliMi, actionbarYaz, varlikKonumu, parcacikAt
} from "../yardimcilar.js";
import {
  SAAT_ACIK, SAAT_DONDURMA_SURE, SAAT_DONDURMA_SEVIYE,
  SAAT_TELEKINEZ_MENZIL, SAAT_TELEKINEZ_ONDE, SAAT_TELEKINEZ_FIRLAT,
  SAAT_TELEKINEZ_HASAR, SAAT_TELEKINEZ_EZME,
  SAAT_TELEKINEZ_ARALIK, SAAT_HAPIS_Y, SAAT_HAPIS_SURE, SAAT_HAPIS_TARAMA,
  SAAT_KAYIT_ANAHTAR, SAAT_GERI_TICK
} from "../ayarlar.js";

/* ================================================================
   ZAMAN SAATI                                              v7.2

   Gerekcenin tamami ayarlar.js'teki ZAMAN SAATI bolumunde.
   Bes mod: Durdur / Ac / Geri Al / Telekinez / Saate Al.

   ---- KAYNAKTAKI KILITLENME BURADA COZULUYOR ----
   Kaynak saate alinan oyuncunun eski konumunu YALNIZ bellekte
   tutuyordu; dunya yeniden yuklenince kurban y=-500'de,
   korlukle, hareketi kapali ve geri donus bilgisi olmadan
   kaliyordu. Burada kayit DUNYA OZELLIGINDE ve ustune bir de
   sure siniri var: saat sahibi cikip gitse bile kurban geri
   geliyor.
   ================================================================ */

/* oyuncuId -> secili mod (0..4) */
const modlar = new Map();
/* saatciId -> hedefVarlikId  (telekinez) */
const tutulan = new Map();
/* kurbanId -> { x, y, z, boyut, bitis, saatci } */
const hapistekiler = new Map();

export const MOD_ADLARI = [
  "Zamanı Durdur", "Zamanı Aç", "Zamanı Geri Al", "Telekinez",
  "Oyuncuyu Saate Al"
];

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
    for (const [id, k] of hapistekiler) {
      dizi.push([id, k.x, k.y, k.z, k.boyut, k.bitis]);
    }
    world.setDynamicProperty(SAAT_KAYIT_ANAHTAR,
      dizi.length === 0 ? undefined : JSON.stringify(dizi));
  } catch (e) {
    hataYaz("saat.yaz", e);
  }
}

let okundu = false;

function oku() {
  if (okundu) return;
  okundu = true;
  if (!kaliciMi()) return;
  try {
    const ham = world.getDynamicProperty(SAAT_KAYIT_ANAHTAR);
    if (typeof ham !== "string" || !ham) return;
    for (const s of JSON.parse(ham)) {
      if (Array.isArray(s) && s.length >= 6) {
        hapistekiler.set(String(s[0]), {
          x: Number(s[1]), y: Number(s[2]), z: Number(s[3]),
          boyut: String(s[4]), bitis: Number(s[5])
        });
      }
    }
    bilgiYaz("Zaman Saati defteri okundu: " + hapistekiler.size + " kurban.");
  } catch (e) {
    hataYaz("saat.oku", e);
  }
}

export function saatUnut(oyuncuId) {
  if (oyuncuId === undefined) {
    modlar.clear(); tutulan.clear(); hapistekiler.clear();
    yaz();
    okundu = false;
    return;
  }
  modlar.delete(oyuncuId);
  tutulan.delete(oyuncuId);
  /* Kurban kaydi SILINMIYOR: saati tutan cikinca kurbanin
     yerin 500 blok altinda kalmasi kaynagin hatasiydi.
     Kayit duruyor, sure dolunca tarama geri getiriyor.      */
  yaz();
}

export function saatModu(oyuncuId) { return modlar.get(oyuncuId); }
export function saatModuSec(oyuncuId, mod) {
  if (mod === undefined || mod === null) modlar.delete(oyuncuId);
  else modlar.set(oyuncuId, mod);
}
export function saatHapisSayisi() { return hapistekiler.size; }
export function saatHapisteMi(id) { return hapistekiler.has(id); }
export function saatTutulan(saatciId) { return tutulan.get(saatciId); }

function komut(varlik, satir) {
  try {
    if (typeof varlik.runCommand === "function") varlik.runCommand(satir);
    return true;
  } catch (e) {
    return false;
  }
}

/* ---------------- 0: ZAMANI DURDUR ---------------- */
function zamaniDurdur(oyuncu) {
  let sayi = 0;
  try {
    for (const p of world.getAllPlayers()) {
      if (p.id === oyuncu.id) continue;
      dondur(p, true);
      sayi++;
      try { p.sendMessage("§d[Zaman] Zaman durdu."); } catch (e) { /* */ }
    }
  } catch (e) {
    hataYaz("saat.durdur.oyuncular", e);
  }
  /* Moblar: kaynak `effect @e[type=!player]` diyor. Bizde
     ayni ama menzille sinirli degil -- kaynagin niyeti "her
     sey dursun".                                            */
  komut(oyuncu, "effect @e[type=!player] slowness " +
        Math.ceil(SAAT_DONDURMA_SURE / 20) + " " +
        SAAT_DONDURMA_SEVIYE + " true");
  actionbarYaz(oyuncu, "§d⏳ §fZaman durdu §8· " + sayi + " oyuncu");
}

function dondur(hedef, kapali) {
  try {
    if (kapali) {
      hedef.addEffect("slowness", SAAT_DONDURMA_SURE,
                      { amplifier: SAAT_DONDURMA_SEVIYE, showParticles: false });
      hedef.addEffect("jump_boost", SAAT_DONDURMA_SURE,
                      { amplifier: 0, showParticles: false });
    } else {
      hedef.removeEffect("slowness");
      hedef.removeEffect("jump_boost");
    }
  } catch (e) { /* efekt yoksa yalniz inputpermission kalir */ }
  komut(hedef, "inputpermission set @s movement " +
        (kapali ? "disabled" : "enabled"));
}

/* ---------------- 1: ZAMANI AC ---------------- */
function zamaniAc(oyuncu) {
  let sayi = 0;
  try {
    for (const p of world.getAllPlayers()) {
      if (p.id === oyuncu.id) continue;
      dondur(p, false);
      sayi++;
      try { p.sendMessage("§a[Zaman] Zaman yeniden akıyor."); } catch (e) { /* */ }
    }
  } catch (e) {
    hataYaz("saat.ac", e);
  }
  komut(oyuncu, "effect @e[type=!player] slowness 0");
  actionbarYaz(oyuncu, "§a🔓 §fZaman açıldı §8· " + sayi + " oyuncu");
}

/* ---------------- 2: ZAMANI GERI AL ---------------- */
function zamaniGeriAl(oyuncu) {
  /* Kaynak `time add -500` diyor: DUNYA VAKTI geri gidiyor,
     baska hicbir sey degismiyor. Adi buyuk, isi kucuk --
     oldugu gibi alindi, abartilmadi.                        */
  komut(oyuncu, "time add " + SAAT_GERI_TICK);
  actionbarYaz(oyuncu, "§b⏮ §fVakit " + Math.abs(SAAT_GERI_TICK) +
               " tick geri alındı");
}

/* ---------------- 3: TELEKINEZ ---------------- */
function nisanAl(oyuncu, menzil, yalnizOyuncu) {
  try {
    const vurus = oyuncu.getEntitiesFromViewDirection({ maxDistance: menzil });
    for (const v of vurus) {
      const e = v.entity || v;
      if (!e || e.id === oyuncu.id) continue;
      if (!gecerliMi(e)) continue;
      if (yalnizOyuncu && e.typeId !== "minecraft:player") continue;
      return e;
    }
  } catch (e) {
    hataYaz("saat.nisan", e);
  }
  return undefined;
}

function telekinez(oyuncu) {
  const tutulanId = tutulan.get(oyuncu.id);
  if (tutulanId) {
    /* Ikinci basis: FIRLAT. */
    const hedef = varligiBul(oyuncu, tutulanId);
    tutulan.delete(oyuncu.id);
    if (!hedef) {
      actionbarYaz(oyuncu, "§c🔮 §fHedef kayboldu");
      return;
    }
    try {
      const yon = oyuncu.getViewDirection();
      const k = oyuncu.location;
      hedef.teleport({
        x: k.x + yon.x * SAAT_TELEKINEZ_FIRLAT,
        y: k.y + yon.y * SAAT_TELEKINEZ_FIRLAT,
        z: k.z + yon.z * SAAT_TELEKINEZ_FIRLAT
      }, { dimension: oyuncu.dimension });
      try { hedef.removeEffect("levitation"); } catch (e) { /* */ }
      /* v7.6: CARPMA HASARI. Kaynakta firlatma hicbir sey
         hissettirmiyordu -- hedef yalniz yer degistiriyordu.
         Vuran OYUNCU olarak yaziliyor ki beceri XP'si ve olum
         mesaji dogru kisiye gitsin (goz lazerinde v4.95'te
         ogrenilen ayni ders).                              */
      if (SAAT_TELEKINEZ_HASAR > 0) {
        try {
          hedef.applyDamage(SAAT_TELEKINEZ_HASAR,
                            { cause: "entityAttack", damagingEntity: oyuncu });
        } catch (e) {
          /* damagingEntity kabul edilmezse sebepsiz uygula --
             hasar kaybolmasin. */
          try { hedef.applyDamage(SAAT_TELEKINEZ_HASAR); } catch (e2) { /* */ }
        }
      }
      /* Yumusak dusus: firlatma bir saldiri, infaz degil --
         Ender Kilici'nda verilen ayni karar. Carpma hasari
         VAR ama ustune bir de dusus hasariyla oldurulmuyor. */
      hedef.addEffect("slow_falling", 200,
                      { amplifier: 0, showParticles: false });
    } catch (e) {
      hataYaz("saat.firlat", e);
    }
    actionbarYaz(oyuncu, "§5🔮 §fHedef " + SAAT_TELEKINEZ_FIRLAT +
                 " blok fırlatıldı");
    return;
  }

  const hedef = nisanAl(oyuncu, SAAT_TELEKINEZ_MENZIL, false);
  if (!hedef) {
    actionbarYaz(oyuncu, "§c🔮 §fHedef yok §8· birine bak");
    return;
  }
  tutulan.set(oyuncu.id, hedef.id);
  try {
    hedef.addEffect("levitation", 600, { amplifier: 0, showParticles: false });
    hedef.addEffect("slow_falling", 600, { amplifier: 0, showParticles: false });
  } catch (e) { /* efekt yoksa isinlanma yine tutuyor */ }
  actionbarYaz(oyuncu, "§5🔮 §fYakalandı §8· tekrar bas, fırlat");
}

function varligiBul(oyuncu, id) {
  try {
    /* Kaynak `dimension.getEntities()` cagiriyor -- SUZGECSIZ,
       her iki tick'te bir. Bizde once dogrudan kimlikle
       araniyor; API'de yoksa menzille sinirli bir tarama.   */
    if (typeof world.getEntity === "function") {
      const v = world.getEntity(id);
      if (v && gecerliMi(v)) return v;
      return undefined;
    }
    const yakin = oyuncu.dimension.getEntities({
      location: oyuncu.location,
      maxDistance: SAAT_TELEKINEZ_MENZIL + SAAT_TELEKINEZ_FIRLAT
    });
    return yakin.find((v) => v.id === id && gecerliMi(v));
  } catch (e) {
    return undefined;
  }
}

/* ---------------- 4: SAATE AL / CIKAR ---------------- */
function saateAl(oyuncu) {
  /* Kaynak `saatteOlanlar.size > 0` deyip SIRALI ILKINI
     birakiyor: iki kisi saatteyse hangisini birakacagini
     secemiyorsun. Bizde defter saati TUTANA bagli.         */
  for (const [id, k] of hapistekiler) {
    if (k.saatci === oyuncu.id) {
      cikar(id, k, oyuncu, undefined);
      return;
    }
  }

  const hedef = nisanAl(oyuncu, SAAT_TELEKINEZ_MENZIL, true);
  if (!hedef) {
    actionbarYaz(oyuncu, "§c⌚ §fBir oyuncuya bak");
    return;
  }
  let k;
  try { k = hedef.location; } catch (e) { return; }
  hapistekiler.set(hedef.id, {
    x: k.x, y: k.y, z: k.z,
    boyut: hedef.dimension.id,
    bitis: system.currentTick + SAAT_HAPIS_SURE,
    saatci: oyuncu.id
  });
  yaz();
  try {
    hedef.teleport({ x: 0, y: SAAT_HAPIS_Y, z: 0 },
                   { dimension: hedef.dimension });
    /* Kaynagin efektleri: korluk + direnc + doygunluk + ates
       bagisikligi. Direnc ve doygunluk kurbani OLDURMEMEK
       icin -- oradan aynen alindi.                          */
    for (const [ad, sev] of [["blindness", 0], ["resistance", 255],
                             ["saturation", 255], ["fire_resistance", 0]]) {
      hedef.addEffect(ad, SAAT_HAPIS_SURE + 100,
                      { amplifier: sev, showParticles: false });
    }
    dondur(hedef, true);
    hedef.sendMessage("§6[Saat] §fSaate alındınız §8· " +
                      Math.round(SAAT_HAPIS_SURE / 20) + " saniye");
  } catch (e) {
    hataYaz("saat.hapis", e);
  }
  actionbarYaz(oyuncu, "§6⌚ §fOyuncu saate alındı");
}

function cikar(id, kayit, saatci, kurbanVarlik) {
  /* ---- KAYIT ANCAK KURBAN BULUNUNCA SILINIYOR ----
     Ilk yazdigimda once siliyordum, sonra ariyordum. Testte
     goruldu: dunya yeniden yuklendikten sonra kurban
     bulunamayinca kayit gidiyor ve kurban y=-500'de KALIYOR
     -- yani kaynagin kilitlenmesini baska bir yoldan geri
     getirmisim. Artik bulunamazsa kayit DURUYOR ve bir
     sonraki taramada tekrar deneniyor.                      */
  const kurban = kurbanVarlik && gecerliMi(kurbanVarlik)
    ? kurbanVarlik
    : varligiBul(saatci || {}, id);
  if (!kurban) return false;
  hapistekiler.delete(id);
  yaz();
  try {
    const boyut = (kurban.dimension && kurban.dimension.id === kayit.boyut)
      ? kurban.dimension : kurban.dimension;
    kurban.teleport({ x: kayit.x, y: kayit.y, z: kayit.z },
                    { dimension: boyut });
    /* Kaynak burada `effect @s clear` diyor: kurbanin ICTIGI
       IKSIRI de siliyor. Yalniz BIZIM verdiklerimiz
       kaldiriliyor.                                          */
    for (const ad of ["blindness", "resistance", "saturation",
                      "fire_resistance"]) {
      try { kurban.removeEffect(ad); } catch (e) { /* */ }
    }
    dondur(kurban, false);
    kurban.sendMessage("§a[Saat] §fSerbest bırakıldınız.");
  } catch (e) {
    hataYaz("saat.cikar", e);
  }
  if (saatci && gecerliMi(saatci)) {
    actionbarYaz(saatci, "§a⌚ §fOyuncu serbest");
  }
  return true;
}

/* ---------------- MODU CALISTIR ---------------- */
export function saatCalistir(oyuncu, mod) {
  if (!SAAT_ACIK) return false;
  if (mod === undefined) return false;
  try {
    switch (mod) {
      case 0: zamaniDurdur(oyuncu); return true;
      case 1: zamaniAc(oyuncu); return true;
      case 2: zamaniGeriAl(oyuncu); return true;
      case 3: telekinez(oyuncu); return true;
      case 4: saateAl(oyuncu); return true;
      default: return false;
    }
  } catch (e) {
    hataYaz("saat.calistir", e);
    return false;
  }
}

/* ---------------- TARAMA ---------------- */
let sonrakiTelekinez = 0;
let sonrakiHapis = 0;

export function saatTara(oyuncular) {
  if (!SAAT_ACIK) return;
  oku();
  /* Iki defter de bosken HIC DONME: deponun kurali. */
  if (tutulan.size === 0 && hapistekiler.size === 0) return;
  const simdi = system.currentTick;

  /* Telekinez: hedefi oyuncunun onunde tut. */
  if (tutulan.size > 0 && simdi >= sonrakiTelekinez) {
    sonrakiTelekinez = simdi + SAAT_TELEKINEZ_ARALIK;
    for (const oyuncu of oyuncular) {
      const id = tutulan.get(oyuncu.id);
      if (!id) continue;
      const hedef = varligiBul(oyuncu, id);
      if (!hedef) { tutulan.delete(oyuncu.id); continue; }
      try {
        const yon = oyuncu.getViewDirection();
        const k = oyuncu.location;
        hedef.teleport({
          x: k.x + yon.x * SAAT_TELEKINEZ_ONDE,
          y: k.y + yon.y * SAAT_TELEKINEZ_ONDE + 2,
          z: k.z + yon.z * SAAT_TELEKINEZ_ONDE
        }, { dimension: oyuncu.dimension });
        /* v7.6: EZME. Havada tutmak artik zararsiz degil.
           Kucuk ama surekli: her taramada (2 tick) uygulaniyor.
           Yeni bir tarama DONGUSU acmiyor -- zaten burada
           donuyoruz, bu yuzden bedava.                      */
        if (SAAT_TELEKINEZ_EZME > 0) {
          try {
            hedef.applyDamage(SAAT_TELEKINEZ_EZME,
                              { cause: "entityAttack", damagingEntity: oyuncu });
          } catch (e) {
            try { hedef.applyDamage(SAAT_TELEKINEZ_EZME); } catch (e2) { /* */ }
          }
        }
      } catch (e) { tutulan.delete(oyuncu.id); }
    }
  }

  /* Hapis: suresi dolani GERI GETIR. Kaynakta sure yoktu ve
     kurtarma yalniz saat sahibinin elindeydi.               */
  if (hapistekiler.size > 0 && simdi >= sonrakiHapis) {
    sonrakiHapis = simdi + SAAT_HAPIS_TARAMA;
    for (const [id, kayit] of [...hapistekiler]) {
      if (simdi < kayit.bitis) continue;
      /* Kurban ZATEN elimizde: tarama butun oyuncularin
         listesiyle cagriliyor. Kimlikle yeniden aramak hem
         gereksiz hem de dunya yeniden yuklendikten sonra
         basarisiz oluyordu (testte goruldu).                */
      const kurban = oyuncular.find((p) => p.id === id);
      if (!kurban) continue;          // cevrede degil: kayit DURUYOR
      if (!cikar(id, kayit, undefined, kurban)) continue;
      try {
        parcacikAt(kurban.dimension, "minecraft:totem_particle",
                   varlikKonumu(kurban));
      } catch (e) { /* */ }
    }
  }
}
