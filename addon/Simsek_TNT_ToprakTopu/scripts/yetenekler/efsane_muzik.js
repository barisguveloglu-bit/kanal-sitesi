import { system, world } from "@minecraft/server";
import { hataYaz, baslikYaz, varlikKonumu } from "../yardimcilar.js";
import { kokAl, zincirNoktasi } from "./efsane.js";
import {
  EFSANE_ACIK, EFSANE_DURAK_SAYISI,
  EFSANE_MUZIK_ACIK, EFSANE_MUZIK_SES, EFSANE_MUZIK_TARAMA,
  EFSANE_MUZIK_MENZIL, EFSANE_MUZIK_BASLIK, EFSANE_MUZIK_ALT,
  EFSANE_MUZIK_KAYIT_ANAHTAR
} from "../ayarlar.js";

/* ================================================================
   UC DURAGI DA GORENE MUZIK                                v6.6

   Kullanici: "benim efsane yapisinin ucunu de gordukten sonra
   bu bir dakikalik kisim calmaya baslasin."

   ---- NEDEN AYRI DOSYA ----
   efsane.js INSAAT yapiyor: bir kere basiyorsun, blok
   koyuluyor, bitiyor. Burasi SUREKLI bir gozlem: her saniye
   kimin nerede oldugunu bakiyor. Ikisi ayni dosyada olsaydi
   "yapiyi kurmak" ile "yapiyi gormek" ayni yerde karisirdi.

   ---- DEFTER BOSKEN HIC DONMEME ----
   Zincir kurulmamissa (kok yok) ya da herkes ucunu de
   gormusse tarama TEK SATIRDA cikiyor. Deponun kurali bu:
   calismayan bir ozellik tick butcesinden yemez.

   ---- NEDEN KONUM, NEDEN BLOK DEGIL ----
   "Duragi gordu mu"yu blok okuyarak olcmek her oyuncu icin
   getBlock demek olurdu (Dusmus'te tam bu yuzden uc test
   birden dusmustu). Duraklarin koordinati zincirden ZATEN
   hesaplanabiliyor -- oyuncunun konumuyla karsilastirmak
   yetiyor, tek bir blok okumadan.
   ================================================================ */

/* oyuncuId -> gorulen duraklarin bit maskesi.
   Muzik calindiysa maske yerine -1 yaziliyor: bir daha
   calmasin ama "gordu" bilgisi de kaybolmasin.              */
const gorulen = new Map();

const TAMAM = (1 << EFSANE_DURAK_SAYISI) - 1;

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
    for (const [id, m] of gorulen) dizi.push([id, m]);
    world.setDynamicProperty(EFSANE_MUZIK_KAYIT_ANAHTAR,
      dizi.length === 0 ? undefined : JSON.stringify(dizi));
  } catch (e) {
    hataYaz("efsane_muzik.yaz", e);
  }
}

let okundu = false;

export function efsaneMuzikOku() {
  if (okundu) return;
  okundu = true;
  if (!kaliciMi()) return;
  try {
    const ham = world.getDynamicProperty(EFSANE_MUZIK_KAYIT_ANAHTAR);
    if (typeof ham !== "string" || ham.length === 0) return;
    const dizi = JSON.parse(ham);
    if (!Array.isArray(dizi)) return;
    for (const s of dizi) {
      if (Array.isArray(s) && s.length >= 2) {
        gorulen.set(String(s[0]), Number(s[1]));
      }
    }
  } catch (e) {
    hataYaz("efsane_muzik.oku", e);
  }
}

/* Oyuncu CIKINCA kayit silinmiyor: iki duragi bulmus biri
   geri geldiginde bastan baslamasin. O yuzden bu fonksiyonun
   oyuncu alan bir hali YOK -- yalnizca "hepsini unut".
   Temizleme dunya kaydina da inmeli: yalniz bellegi silmek
   bir sonraki taramada eski kaydin geri okunmasi demek
   (Dusmus'te tam bu hata cikmisti).                         */
export function efsaneMuzikUnut() {
  gorulen.clear();
  yaz();
  okundu = false;
}

/* Test ve menu icin: bu oyuncu kac durak gordu. */
export function efsaneMuzikDurum(oyuncuId) {
  const m = gorulen.get(oyuncuId);
  if (m === undefined) return { gorulen: 0, caldi: false };
  if (m === -1) return { gorulen: EFSANE_DURAK_SAYISI, caldi: true };
  let n = 0;
  for (let i = 0; i < EFSANE_DURAK_SAYISI; i++) if (m & (1 << i)) n++;
  return { gorulen: n, caldi: false };
}

/* Muzigi cal. Uc kademe: playMusic (muzik kanali, digerini
   susturur) -> playSound (oyuncuya, konumsuz) -> boyutta cal.
   Surumler arasinda hangisinin oldugu degisiyor; sessizce
   hicbir sey olmamasindansa daha kabasi calsin.             */
function muzikCal(oyuncu) {
  try {
    if (typeof oyuncu.playMusic === "function") {
      oyuncu.playMusic(EFSANE_MUZIK_SES, { fade: 1.0, loop: false });
      return true;
    }
  } catch (e) { /* asagi dus */ }
  try {
    if (typeof oyuncu.playSound === "function") {
      oyuncu.playSound(EFSANE_MUZIK_SES, { volume: 1.0 });
      return true;
    }
  } catch (e) { /* asagi dus */ }
  try {
    oyuncu.dimension.playSound(EFSANE_MUZIK_SES, varlikKonumu(oyuncu),
                               { volume: 1.0 });
    return true;
  } catch (e) {
    hataYaz("efsane_muzik.cal", e);
  }
  return false;
}

let sonraki = 0;

export function efsaneMuzikTara(oyuncular) {
  if (!EFSANE_ACIK || !EFSANE_MUZIK_ACIK) return;
  const simdi = system.currentTick;
  if (simdi < sonraki) return;
  sonraki = simdi + EFSANE_MUZIK_TARAMA;

  efsaneMuzikOku();

  /* Zincir kurulmamissa gorulecek bir sey de yok. */
  const kok = kokAl();
  if (!kok) return;

  const menzil2 = EFSANE_MUZIK_MENZIL * EFSANE_MUZIK_MENZIL;
  let yazilacak = false;

  for (const oyuncu of oyuncular) {
    let maske = gorulen.get(oyuncu.id);
    if (maske === -1) continue;               // bu oyuncuda is bitti
    const eski = (maske === undefined) ? 0 : maske;
    maske = eski;

    let konum;
    try { konum = oyuncu.location; } catch (e) { continue; }

    for (let i = 0; i < EFSANE_DURAK_SAYISI; i++) {
      const bit = 1 << i;
      if (maske & bit) continue;              // zaten gorulmus
      const n = zincirNoktasi(kok, i);
      const dx = n.x - konum.x, dz = n.z - konum.z;
      if (dx * dx + dz * dz > menzil2) continue;
      maske |= bit;
    }

    if (maske === eski) continue;             // bu oyuncuda degisen yok
    yazilacak = true;

    if (maske === TAMAM) {
      /* -1 = "caldi". Maskeyi TAMAM olarak birakmak, kayit
         geri okununca muzigin HER GIRISTE bastan calmasi
         demekti.                                            */
      gorulen.set(oyuncu.id, -1);
      try {
        baslikYaz(oyuncu, EFSANE_MUZIK_BASLIK, EFSANE_MUZIK_ALT);
      } catch (e) { hataYaz("efsane_muzik.baslik", e); }
      muzikCal(oyuncu);
    } else {
      gorulen.set(oyuncu.id, maske);
    }
  }

  if (yazilacak) yaz();
}
