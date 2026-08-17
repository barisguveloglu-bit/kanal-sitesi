import { world, system } from "@minecraft/server";
import { bilgiYaz, hataYaz, gecerliMi } from "../yardimcilar.js";
import {
  KALP_ADIM, KALP_TAVAN, KALP_TAZELEME, KALP_SURE, KALP_DOLDUR,
  KALP_KAYIT_ANAHTAR
} from "../ayarlar.js";

/* ============================================================
   KALP DEFTERI

   Kim kac EK kalp kazandi, burada duruyor. Kalpler KALICI:
   oldugunde, dunyadan cikip girdiginde, script yeniden
   yuklendiginde kaybolmuyor.

   NEDEN AYRI BIR DEFTER (is listesine girmiyor):
   Is listesi tick doengusunun isi ve oyuncu basina AYNI_ANDA (2)
   ile sinirli. Kalici bir "kalp isi" orada dursaydi oyuncunun iki
   yuvasindan birini sonsuza kadar tutardi -- kalp aldiktan sonra
   tek elle oynamak zorunda kalirdin. Hapis kafesleri de ayni
   sebeple ayri defterde.

   NEDEN EFEKT SUREKLI TAZELENIYOR:
   Minecraft'ta efektler UC yerde silinir ve ucu de kalp
   sisteminin dogal akisinda:
     - olunce           (butun efektler gider)
     - sure dolunca     (kalici efekt diye bir sey yok)
     - sut icince       (milk_bucket her seyi siler)
   Defter kaynak, efekt sadece onun goruntusu. KALP_TAZELEME'de
   bir geri veriliyor, yani yukaridakilerin hicbiri kalpleri
   gercekten goturmuyor.

   MOTOR SINIRI: health_boost seviyesi en fazla 255, o da
   2 x (255 + 1) = 512 kalp. KALP_TAVAN bunun cok altinda
   (100) ama yine de kirpiliyor -- ayar elle degistirilirse
   sessizce bozulmasin.
   ============================================================ */

const MOTOR_SEVIYE_TAVANI = 255;
const MOTOR_KALP_TAVANI = 2 * (MOTOR_SEVIYE_TAVANI + 1);   // 512

/* oyuncuId -> ek kalp sayisi (her zaman CIFT ve > 0) */
const defter = new Map();

/* oyuncuId -> bir sonraki tazeleme tick'i */
const sonraki = new Map();

/* ---------------- Kalp <-> efekt seviyesi ----------------
   1 kalp = 2 can, health_boost seviye N = +4 can x (N+1).
   Yani kalp = 2 x (seviye + 1)  ->  seviye = kalp/2 - 1.
   Tek sayilar asagi yuvarlanir; cift olmayan kalp veremiyoruz. */

export function kalbiDuzelt(kalp) {
  let n = Math.floor(Number(kalp) || 0);
  if (n < 0) n = 0;
  if (n % 2 !== 0) n -= 1;                 // cift sayiya indir
  if (n > MOTOR_KALP_TAVANI) n = MOTOR_KALP_TAVANI;
  return n;
}

export function kalpSeviyesi(kalp) {
  const n = kalbiDuzelt(kalp);
  return n <= 0 ? -1 : (n / 2 - 1);        // -1 = efekt verme
}

/* ---------------- Kalicilik ----------------
   Dunya ozellikleri her surumde yok; ozellik tespitiyle
   cagriliyor. Yoksa defter yalniz bellekte kalir -- kalpler oyun
   boyunca durur, sadece dunyadan cikinca unutulur.             */

let kaliciDestek;

function kaliciMi() {
  if (kaliciDestek === undefined) {
    kaliciDestek = (typeof world.setDynamicProperty === "function") &&
                   (typeof world.getDynamicProperty === "function");
    if (!kaliciDestek) {
      bilgiYaz("UYARI: dunya ozellikleri yok. Kalpler kaydedilemiyor; " +
               "dunyadan cikip girersen eklenen kalpler unutulur.");
    }
  }
  return kaliciDestek;
}

/* Kayit bicimi: [[oyuncuId, kalp], ...]  -- kisa tutuluyor,
   dunya ozelliginin boyut siniri var.                          */
function yaz() {
  if (!kaliciMi()) return;
  try {
    const dizi = [];
    for (const [oyuncuId, kalp] of defter) {
      if (kalp > 0) dizi.push([oyuncuId, kalp]);
    }
    world.setDynamicProperty(KALP_KAYIT_ANAHTAR,
                             dizi.length === 0 ? undefined : JSON.stringify(dizi));
  } catch (e) {
    hataYaz("kalp.yaz", e);
  }
}

let okundu = false;

function oku() {
  if (okundu) return;
  okundu = true;
  if (!kaliciMi()) return;
  try {
    const ham = world.getDynamicProperty(KALP_KAYIT_ANAHTAR);
    if (typeof ham !== "string" || ham.length === 0) return;
    const dizi = JSON.parse(ham);
    if (!Array.isArray(dizi)) return;
    for (const satir of dizi) {
      if (!Array.isArray(satir) || satir.length < 2) continue;
      const kalp = kalbiDuzelt(satir[1]);
      if (kalp > 0) defter.set(String(satir[0]), kalp);
    }
    bilgiYaz("kalp defteri okundu: " + defter.size + " oyuncu.");
  } catch (e) {
    hataYaz("kalp.oku", e);
  }
}

/* ---------------- Sorgu ---------------- */

export function kalpAl(oyuncuId) {
  oku();
  return defter.get(oyuncuId) || 0;
}

export function kalpliVarMi() {
  oku();
  return defter.size > 0;
}

/* ---------------- Efekt uygulama ---------------- */

function canBileseni(oyuncu) {
  try {
    const c = oyuncu.getComponent("minecraft:health");
    if (c) return c;
  } catch (e) {
    hataYaz("kalp.canBileseni", e);
  }
  return undefined;
}

/* Eklenen kalpler BOS gelir. Bu yuzden ekledikten sonra can
   dolduruluyor. resetToMaxValue her surumde yok, o yuzden once
   o deneniyor, sonra setCurrentValue, en sonda instant_health --
   ucu de yoksa kalpler yine eklenir, sadece bos gelir.          */
function canDoldur(oyuncu) {
  if (!KALP_DOLDUR) return;
  const c = canBileseni(oyuncu);
  try {
    if (c && typeof c.resetToMaxValue === "function") {
      c.resetToMaxValue();
      return;
    }
    if (c && typeof c.setCurrentValue === "function") {
      const tavan = (typeof c.effectiveMax === "number") ? c.effectiveMax : undefined;
      if (tavan !== undefined) {
        c.setCurrentValue(tavan);
        return;
      }
    }
  } catch (e) {
    hataYaz("kalp.canDoldur", e);
  }
  try {
    oyuncu.addEffect("instant_health", 1, { amplifier: 10, showParticles: false });
  } catch (e) {
    hataYaz("kalp.canDoldur.instant", e);
  }
}

function efektVer(oyuncu, kalp) {
  const seviye = kalpSeviyesi(kalp);
  if (seviye < 0) return false;
  try {
    oyuncu.addEffect("health_boost", KALP_SURE, {
      amplifier: seviye, showParticles: false
    });
    return true;
  } catch (e) {
    hataYaz("kalp.efektVer", e);
    return false;
  }
}

function efektSil(oyuncu) {
  try {
    if (typeof oyuncu.removeEffect === "function") oyuncu.removeEffect("health_boost");
  } catch (e) {
    hataYaz("kalp.efektSil", e);
  }
}

/* ---------------- Ekleme / sifirlama ----------------

   Donen nesne: { eklenen, toplam, tavanaCarpti }
   eklenen 0 ise tavana gelinmis demektir.                       */

export function kalpEkle(oyuncu, istenen = KALP_ADIM) {
  oku();

  const onceki = kalpAl(oyuncu.id);
  const adim = kalbiDuzelt(istenen);
  const tavan = kalbiDuzelt(KALP_TAVAN);

  let sonraki_ = kalbiDuzelt(onceki + adim);
  if (sonraki_ > tavan) sonraki_ = tavan;

  const eklenen = sonraki_ - onceki;
  if (eklenen <= 0) {
    return { eklenen: 0, toplam: onceki, tavanaCarpti: true };
  }

  defter.set(oyuncu.id, sonraki_);
  yaz();

  efektVer(oyuncu, sonraki_);
  canDoldur(oyuncu);

  /* Tazelemeyi ileri at: az once verildi, bir sonraki tur
     gereksiz yere ustune yazmasin.                             */
  sonraki.set(oyuncu.id, system.currentTick + KALP_TAZELEME);

  return { eklenen, toplam: sonraki_, tavanaCarpti: sonraki_ >= tavan };
}

export function kalpSifirla(oyuncu) {
  oku();
  const onceki = kalpAl(oyuncu.id);
  if (onceki <= 0) return 0;

  defter.delete(oyuncu.id);
  sonraki.delete(oyuncu.id);
  yaz();
  efektSil(oyuncu);

  /* Efekt silinince maksimum can dusuyor; mevcut can tavanin
     ustunde kalirsa motor kirpiyor. Yine de acikca dolduruyoruz
     ki oyuncu "kalpleri sifirladim ve 2 canla kaldim" durumuna
     dusmesin.                                                   */
  canDoldur(oyuncu);
  return onceki;
}

/* Testler ve dunya degisimi icin: yalniz bellegi temizler. */
export function defteriUnut() {
  defter.clear();
  sonraki.clear();
  okundu = false;
}

/* ---------------- Her tick ----------------
   Merkezi tick yoneticisinden cagriliyor. Kimse kalp almamissa
   Map bos, dongu hic donmuyor -- bedava.                        */

export function kalpTara(oyuncular) {
  if (defter.size === 0) return;

  const simdi = system.currentTick;

  for (const oyuncu of oyuncular) {
    const kalp = defter.get(oyuncu.id);
    if (!kalp) continue;
    if (!gecerliMi(oyuncu)) continue;      // defterden SILME: geri gelince lazim

    const ne = sonraki.get(oyuncu.id) || 0;
    if (simdi < ne) continue;
    sonraki.set(oyuncu.id, simdi + KALP_TAZELEME);

    efektVer(oyuncu, kalp);
  }
}
