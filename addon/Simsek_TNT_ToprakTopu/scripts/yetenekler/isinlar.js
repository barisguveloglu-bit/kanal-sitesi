import { system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import { elindekiCekirdek } from "./zirh.js";
import { guctekiKahraman, gucKumesi } from "./marvel.js";
import {
  hataYaz, gecerliMi, actionbarYaz, kollariIndir, parcacikAt
} from "../yardimcilar.js";
import {
  ZIRH_ISIN, MARVEL_ISIN, ZIRH_ISIN_KALINLIK, ZIRH_ISIN_TAVAN,
  ZIRH_ISIN_ADIM, ZIRH_ISIN_BEKLEME,
  LAZER_HASAR_SEBEP
} from "../ayarlar.js";

/* ============================================================
   ISINLAR -- MAX STEEL MODLARI + MARVEL KAHRAMANLARI  v5.2

   Kullanici: "cekirdek diye adlandirdigimiz seyler vaat
   ettikleri seyleri bence vermiyorlar."

   Iki cekirdek ozetinde ISIN vaat ediyordu ve ortada isin
   yoktu:
     Isi   . "isin 20 hasar"   -> heat_mode/fire_beam_both
     Titan . 50 hasarlik lazer -> titan_mode/titan_laser

   v4.96'da yedi FiskHeroes isini buraya katilmisti. v5.2'de
   Fisk TAMAMEN kaldirildi (kullanici: "eski kahramanlari
   tamamen atiyoruz") ve yerine ALTI MARVEL ISINI geldi:
   Unibeam, Optik Isin, Kaos Isini, Zihin Tasi Isini, Alev
   Isini, Galactus Isini.

   Iki kaynak, TEK motor: ikisi de "duz bir cizgi, uzerindekilere
   vur" isi yapiyor ve ayri iki dosya iki farkli isin davranisi
   demek olurdu.

   Fark yalnizca KAPIDA: mod isini ELDEKI cekirdegi, Marvel
   isini BACAKTAKI guc esyasini istiyor. Tablodaki "mod" ya da
   "kahraman" alani hangisi oldugunu soyluyor.

   Sayilar ayarlar.js'te: ZIRH_ISIN (Ionstrike'in
   palladium:energy_beam'leri) ve MARVEL_ISIN.

   ---- NEDEN GOZ LAZERININ KODU KULLANILMADI ----
   Goz lazeri SURELI bir isin: 30 saniye acik kaliyor, duvar
   deliyor, kalkan kiriyor, buz kafesi kuruyor, kademelere
   gore mod degistiriyor. Bunlarin hicbiri kaynaktaki
   energy_beam'de yok. Oraya iki yeni dal eklemek o dosyayi
   iki farkli seyin ortak atasi yapardi; burasi ANLIK ve
   duz -- kendi dosyasi daha ucuz ve daha okunur.

   ---- CEKIRDEK SARTI IKI KEZ SINANIYOR ----
   Esya baglanmasi (kollar.js) zaten "cekirdegi tutuyorsan"
   demek, ama yetenek MENUDEN de secilebiliyor. O yuzden
   burada da sinaniyor: elindeki cekirdek bu isinin modu
   degilse atis olmuyor ve sebebi yaziliyor. Aksi hâlde
   Titan lazerini Temel cekirdegiyle atmak mumkun olurdu.
   ============================================================ */

/* oyuncuId + isin -> bir sonraki atisin en erken tick'i */
const bekleme = new Map();

function isinAt(oyuncu, t) {
  let bas, yon;
  try {
    bas = oyuncu.getHeadLocation();
    yon = oyuncu.getViewDirection();
  } catch (e) {
    hataYaz("zirh_isini.baslangic", e);
    return 0;
  }

  /* ---- Cizim: isin gorunsun ---- */
  try {
    for (let d = 1; d <= t.menzil; d += ZIRH_ISIN_ADIM) {
      parcacikAt(oyuncu.dimension, t.parcacik, {
        x: bas.x + yon.x * d,
        y: bas.y + yon.y * d,
        z: bas.z + yon.z * d
      });
    }
  } catch (e) {
    hataYaz("zirh_isini.cizim", e);
  }

  /* ---- Hedefler: tek tarama, sonra isin uzerine izdusum ----
     Goz lazeriyle ayni yontem; orada gerekcesi uzun uzun
     yazili. Ozeti: dort ayri nokta taramasi yerine bir
     tarama, hem daha dogru hem daha ucuz.                  */
  let yakin;
  try {
    yakin = oyuncu.dimension.getEntities({
      location: bas,
      maxDistance: t.menzil + ZIRH_ISIN_KALINLIK,
      excludeTypes: ["minecraft:item", "minecraft:xp_orb"]
    });
  } catch (e) {
    hataYaz("zirh_isini.getEntities", e);
    return 0;
  }

  const vurulanlar = [];
  for (const varlik of yakin) {
    try {
      if (varlik.id === oyuncu.id) continue;
      if (!gecerliMi(varlik)) continue;
      const k = varlik.location;
      const dx = k.x - bas.x, dy = k.y - bas.y, dz = k.z - bas.z;
      const ileri = dx * yon.x + dy * yon.y + dz * yon.z;
      if (ileri < 0 || ileri > t.menzil) continue;
      const sapmaKare = (dx * dx + dy * dy + dz * dz) - ileri * ileri;
      if (sapmaKare > ZIRH_ISIN_KALINLIK * ZIRH_ISIN_KALINLIK) continue;
      vurulanlar.push({ varlik, ileri });
    } catch (e) {
      hataYaz("zirh_isini.izdusum", e);
    }
  }
  /* Tavan asilirsa EN YAKINDAKILER vurulsun, rastgele degil. */
  vurulanlar.sort((a, b) => a.ileri - b.ileri);

  let vuran = 0;
  for (const h of vurulanlar) {
    if (vuran >= ZIRH_ISIN_TAVAN) break;
    try {
      /* Hasar turu goz lazeriyle AYNI sebepten "fire" degil:
         bekci ve butun ates bagisikli varliklar onu tam
         yutuyor. Ates ISINI bile ates HASARI vermiyor --
         yakma asagida ayrica yapiliyor.                     */
      h.varlik.applyDamage(t.hasar,
                           { cause: LAZER_HASAR_SEBEP, damagingEntity: oyuncu });
      if (t.yakma > 0) {
        try {
          h.varlik.setOnFire(t.yakma, true);
        } catch (e) {
          /* setOnFire bazi surumlerde yok; hasar zaten gitti */
        }
      }
      vuran++;
    } catch (e) {
      hataYaz("zirh_isini.hasar", e);
    }
  }
  return vuran;
}

/* Isinin KAPISI: uzerinde ne olmali. Tabloda "mod" varsa
   ELDEKI mod cekirdegi, "kahraman" varsa BACAKTAKI guc esyasi.

   Kapi IKI KEZ sinaniyor. Esya baglanmasi (kollar.js) zaten
   "onu tutuyorsan" demek, ama yetenek MENUDEN de secilebiliyor
   -- o yoldan Titan lazerini Temel cekirdegiyle atmak mumkun
   olurdu.                                                    */
function kapiAcik(oyuncu, t) {
  if (t.mod) {
    let c;
    try { c = elindekiCekirdek(oyuncu); } catch (e) { c = undefined; }
    return { acik: c === t.mod, gerek: t.mod + " çekirdeği" };
  }
  /* v5.2: Marvel isini ELDE degil BACAKTA aranıyor -- kaynakta
     da guc esyasi bacak yuvasinda. Takma adi (Kaptan
     Amerika -> super_soldier) gucKumesi cozuyor, burada
     kahraman adi dogrudan karsilastiriliyor ve takma ad da
     kabul ediliyor.                                          */
  let k;
  try { k = guctekiKahraman(oyuncu); } catch (e) { k = undefined; }
  const t2 = gucKumesi(k);
  const uyar = k === t.kahraman ||
               (t2 !== undefined && t2 === gucKumesi(t.kahraman));
  return { acik: uyar, gerek: t.kahraman + " gücü" };
}

/* Jest sirasi HER yetenekte benzersiz olmali (siraDenetimi
   bunu sinar): esit olsaydi menudeki sira import sirasina
   kalirdi. Tabloyu tek tek numaralamak yerine sayiyoruz --
   yeni isin eklenince kendiliginden dogru.

   BASLANGIC 300: v4.95'te 178'den sayiliyordu ve dokuz isin
   olunca 180 (Gucu Kapat) ile 185'e (Gunes Yumrugu) carpti.
   Var olan yeteneklerin en yukarisi 270; 300 hepsinin
   ustunde ve arada rahat yer var.                          */
let _sira = 300;
for (const [kimlik, t] of [...ZIRH_ISIN, ...MARVEL_ISIN]) {
  yetenekKaydet({
    kimlik,
    ad: t.ad,
    esyasiz: true,
    sira: _sira++,

    olustur(oyuncu) {
      /* 1. Dogru sey elinde mi? */
      const kapi = kapiAcik(oyuncu, t);
      if (!kapi.acik) {
        actionbarYaz(oyuncu,
          "§c" + t.ad + " için §f" + kapi.gerek + " §celinde olmalı");
        kollariIndir(oyuncu);
        return undefined;
      }

      /* 2. Bekleme doldu mu? */
      const anahtar = oyuncu.id + "|" + kimlik;
      const simdi = system.currentTick;
      const erken = bekleme.get(anahtar) || 0;
      if (simdi < erken) {
        actionbarYaz(oyuncu,
          "§7" + t.ad + " hazır değil §8· " +
          ((erken - simdi) / 20).toFixed(1) + " sn");
        kollariIndir(oyuncu);
        return undefined;
      }
      bekleme.set(anahtar, simdi + ZIRH_ISIN_BEKLEME);

      const vuran = isinAt(oyuncu, t);
      try {
        actionbarYaz(oyuncu, "§6⚡ " + t.ad + " §8· " + vuran + " hedef");
      } catch (e) {
        /* mesaj onemli degil */
      }
      kollariIndir(oyuncu);
      return undefined;      // anlik yetenek
    }
  });
}

/* Testler ve dunya degisimi icin. */
export function zirhIsinUnut() { bekleme.clear(); }
