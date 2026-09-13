import { world } from "@minecraft/server";
import { bilgiYaz, hataYaz, kaliciYaz } from "../yardimcilar.js";
import { HAPIS_TAVAN, HAPIS_KAYIT_ANAHTAR, DEFTER_TAVAN } from "../ayarlar.js";

/* ============================================================
   KAFES DEFTERI
   Hapis artik SURESIZ: kafes sen acana kadar duruyor. Bu yuzden
   "hangi kafes kimin ve nerede" bilgisini bir yerde tutmak sart.

   Neden is listesinde tutulmuyor: is listesi tick doengusunun
   isi ve AYNI_ANDA (2) ile sinirli. Suresiz bir kafes orada
   dursaydi oyuncunun iki yuvasindan birini sonsuza kadar
   tutardi, baska yetenek kullanamazdi.

   Neden dunya ozelligine yaziliyor: script yeniden yuklenince
   (dunyadan cikip girince) modul degiskenleri sifirlanir ve
   kafesler SAHIPSIZ kalirdi -- dunyada duran ama acilamayan
   demir kutular. Tam da referansin hatasi. Dunya ozelligi
   kaydediliyor, yani kafes cikip girince de acilabiliyor.
   ============================================================ */

/* oyuncuId -> [ {boyutId, merkez:{x,y,z}, konan:[{x,y,z}]}, ... ] */
const defter = new Map();

/* Dunya ozellikleri her surumde yok; ozellik tespitiyle
   cagriliyor. Yoksa defter yalniz bellekte kalir -- kafesler
   oyun boyunca calisir, sadece dunyadan cikinca unutulur.     */
let kaliciDestek;

function kaliciMi() {
  if (kaliciDestek === undefined) {
    kaliciDestek = (typeof world.setDynamicProperty === "function") &&
                   (typeof world.getDynamicProperty === "function");
    if (!kaliciDestek) {
      bilgiYaz("UYARI: dunya ozellikleri yok. Kafesler kaydedilemiyor; " +
               "dunyadan cikip girersen acik kafesler unutulur.");
    }
  }
  return kaliciDestek;
}

/* Kayit bicimi bilerek kisa: dunya ozelliginin boyut siniri var.
     [ [oyuncuId, boyutId, cx, cy, cz, dx,dy,dz, dx,dy,dz, ...], ... ]
   Konan bloklar merkeze GORE saklaniyor; degerler kucuk oldugu
   icin JSON cok daha kisa cikiyor.                              */
function yaz() {
  if (!kaliciMi()) return;
  try {
    const dizi = [];
    for (const [oyuncuId, kafesler] of defter) {
      for (const k of kafesler) {
        const satir = [oyuncuId, k.boyutId, k.merkez.x, k.merkez.y, k.merkez.z];
        for (const n of k.konan) {
          satir.push(n.x - k.merkez.x, n.y - k.merkez.y, n.z - k.merkez.z);
        }
        dizi.push(satir);
      }
    }
    /* ---- BOYUT SINIRI  (v7.80) ----
       Dunya ozelliginin 32767 baytlik siniri var ve bu defter
       OYUNCU SAYISIYLA buyuyor: her oyuncu HAPIS_TAVAN (8)
       kafes tutabiliyor, her kafes 34 blok.

       Olculdu (kutuKabugu(1,3) = 34 blok, kayit basina ~385
       bayt):
            1 oyuncu ->  3.080 bayt
            4 oyuncu -> 12.320 bayt
            8 oyuncu -> 24.640 bayt
           16 oyuncu -> 49.280 bayt  ### SINIR ASILDI ###
       Yani ~11 oyuncuda tasiyor. Tasinca `setDynamicProperty`
       istisna atiyor, `hataYaz` yutuyor ve defter SESSIZCE
       yazilmiyor -- kalp defterinde duzeltilen hatanin
       birebir aynisi.

       `kaliciYaz` tasma olunca EN ESKI kayitlari dusuruyor.
       Kafes kaybolmuyor, yalnizca dunyada kalan bir kafesin
       defter kaydi dusuyor; bu, hicbir seyin yazilmamasindan
       iyi.                                                  */
    if (dizi.length === 0) {
      world.setDynamicProperty(HAPIS_KAYIT_ANAHTAR, undefined);
    } else {
      kaliciYaz(HAPIS_KAYIT_ANAHTAR, dizi,
                (d, oran) => {
                  const at = Math.max(1, Math.ceil(d.length * oran));
                  return d.length > at ? d.slice(at) : undefined;
                }, DEFTER_TAVAN);
    }
  } catch (e) {
    hataYaz("kafesDefteri.yaz", e);
  }
}

let okundu = false;

function oku() {
  if (okundu) return;
  okundu = true;
  if (!kaliciMi()) return;

  try {
    const ham = world.getDynamicProperty(HAPIS_KAYIT_ANAHTAR);
    if (typeof ham !== "string" || ham.length === 0) return;

    const dizi = JSON.parse(ham);
    if (!Array.isArray(dizi)) return;

    for (const satir of dizi) {
      if (!Array.isArray(satir) || satir.length < 5) continue;
      const oyuncuId = satir[0];
      const boyutId = satir[1];
      const merkez = { x: satir[2], y: satir[3], z: satir[4] };
      const konan = [];
      for (let i = 5; i + 2 < satir.length; i += 3) {
        konan.push({
          x: merkez.x + satir[i],
          y: merkez.y + satir[i + 1],
          z: merkez.z + satir[i + 2]
        });
      }
      const liste = defter.get(oyuncuId);
      const kafes = { boyutId, merkez, konan };
      if (liste) liste.push(kafes);
      else defter.set(oyuncuId, [kafes]);
    }
  } catch (e) {
    /* Bozuk kayit yuzunden paket acilmasin. Kayit atilir, en
       kotusu eski kafesler elle kirilir.                       */
    hataYaz("kafesDefteri.oku", e);
  }
}

export function kafesEkle(oyuncuId, boyutId, merkez, konan) {
  oku();
  const kafes = { boyutId, merkez, konan };
  const liste = defter.get(oyuncuId);
  if (liste) liste.push(kafes);
  else defter.set(oyuncuId, [kafes]);
  yaz();
  return kafes;
}

export function kafesSayisi(oyuncuId) {
  oku();
  const liste = defter.get(oyuncuId);
  return liste ? liste.length : 0;
}

export function tavanDoldu(oyuncuId) {
  return kafesSayisi(oyuncuId) >= HAPIS_TAVAN;
}

/* Verilen noktaya EN YAKIN kafes. Ayni boyutta olmasi sart --
   Nether'dayken Overworld'deki kafesi acmaya calismak, yuklu
   olmayan chunk'ta blok yazmak demek olurdu.                  */
export function enYakinKafes(oyuncuId, boyutId, konum) {
  oku();
  const liste = defter.get(oyuncuId);
  if (!liste || liste.length === 0) return undefined;

  let enIyi, enIyiUzaklik = Infinity;
  for (const k of liste) {
    if (k.boyutId !== boyutId) continue;
    const dx = k.merkez.x - konum.x;
    const dy = k.merkez.y - konum.y;
    const dz = k.merkez.z - konum.z;
    const u = dx * dx + dy * dy + dz * dz;
    if (u < enIyiUzaklik) { enIyiUzaklik = u; enIyi = k; }
  }
  if (!enIyi) return undefined;
  return { kafes: enIyi, uzaklik: Math.sqrt(enIyiUzaklik) };
}

export function kafesSil(oyuncuId, kafes) {
  oku();
  const liste = defter.get(oyuncuId);
  if (!liste) return;
  const i = liste.indexOf(kafes);
  if (i !== -1) liste.splice(i, 1);
  if (liste.length === 0) defter.delete(oyuncuId);
  yaz();
}

/* Testler icin: defteri sifirla (dunyadan cikip girmeyi taklit) */
export function defteriUnut() {
  defter.clear();
  okundu = false;
}
