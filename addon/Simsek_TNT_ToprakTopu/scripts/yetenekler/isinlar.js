import { system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import { varlikIste } from "../butce.js";
import { elindekiCekirdek } from "./zirh.js";
import { elindekiYaratik } from "./ben10.js";
import { guctekiKahraman, gucKumesi } from "./marvel.js";
import {
  hataYaz, gecerliMi, actionbarYaz, kollariIndir, parcacikAt,
  eldekiEsya, ekraniBoya, yukseklikAraligi
} from "../yardimcilar.js";
import {
  ZIRH_ISIN, MARVEL_ISIN, BEN10_ISIN, KOL_ISIN, BEN10,
  ZIRH_ISIN_KALINLIK, ZIRH_ISIN_TAVAN,
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

/* isinAt'in birakip gittigi yildirim artigi. Isin ANLIK bir
   yetenek; yalniz yildirimli olanlar is dondurup kalani
   tamamliyor.                                              */
let sonSimsek;

/* Isinin ucuna yildirim dusurur (v6.9, Simsek Kilici).

   Kaynak sekiz kez `summon lightning_bolt ^^^10` diyor --
   sekizi de AYNI noktaya. Tek noktaya dusen sekiz yildirim
   bir yildirimdan farksiz gorunur, o yuzden kucuk bir
   yayilma veriliyor.

   Butceden geciyor: sekiz varlik tek tick'te dogurmak
   tableti sarsiyor ve butun varlik dogurma isleri ayni
   defterden geciyor.                                       */
function simsekDusur(oyuncu, t, bas, yon, adet) {
  const boyut = oyuncu.dimension;
  const sinir = yukseklikAraligi(boyut);
  const uc = {
    x: bas.x + yon.x * t.menzil,
    y: bas.y + yon.y * t.menzil,
    z: bas.z + yon.z * t.menzil
  };
  const yay = t.simsekYayilma || 0;
  let dusen = 0;
  for (let i = 0; i < adet; i++) {
    if (varlikIste(1) === 0) break;          // butce dolu
    const nokta = {
      x: uc.x + (Math.random() * 2 - 1) * yay,
      y: uc.y,
      z: uc.z + (Math.random() * 2 - 1) * yay
    };
    if (nokta.y < sinir.min || nokta.y > sinir.max) continue;
    try {
      boyut.spawnEntity("minecraft:lightning_bolt", nokta);
      dusen++;
    } catch (e) {
      hataYaz("isin.simsek", e);
    }
  }
  return dusen;
}

function isinAt(oyuncu, t) {
  let bas, yon;
  try {
    bas = oyuncu.getHeadLocation();
    yon = oyuncu.getViewDirection();
  } catch (e) {
    hataYaz("zirh_isini.baslangic", e);
    return 0;
  }

  /* ---- Cizim: isin gorunsun ----
     v6.9: parcacik ISTEGE BAGLI. Simsek Kilici'nin kaynakta
     parcacigi yok, isi yildirimlar yapiyor.                */
  try {
    for (let d = 1; t.parcacik && d <= t.menzil; d += ZIRH_ISIN_ADIM) {
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

  /* v6.9: Simsek Kilici'nin siyah guc flasi ve yildirimlari.
     Ikisi de hedef bulunmasa BILE olmali: kaynak da hedefe
     bakmadan yildirimi doguruyor ve ekrani karartiyor.     */
  if (t.karart) {
    ekraniBoya(oyuncu, t.karart, t.karartSure[0], t.karartSure[1],
               t.karartSure[2]);
  }
  /* Yildirimlar TICK'E YAYILIYOR. Ilk yazdigimda hepsi tek
     cagridaydi ve butce dorduncude doluyordu: kaynagin vaat
     ettigi sekiz yildirimdan DORDU dusuyordu. Test yakaladi
     ("sekiz yildirim dustu :: 4 yildirim"). Kalanlar isin
     isinden sonra tick tick tamamlaniyor.                   */
  if (t.simsek) {
    const dusen = simsekDusur(oyuncu, t, bas, yon, t.simsek);
    sonSimsek = { kalan: t.simsek - dusen, bas, yon };
  } else {
    sonSimsek = undefined;
  }

  /* Hasari 0 olan isin (Simsek Kilici) vurmuyor: isi
     yildirimlar yapiyor. applyDamage(0) bos bir cagri
     olurdu.                                               */
  if (t.hasar <= 0) return 0;

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
      /* v6.8: buz isininin "doldurma"si. Kaynak
         `effect @e[r=10,c=1] slowness 255 255` diyor -- seviye
         255 ve geri alan hicbir sey yok. Sure sinirli, seviye
         Buz Adam'inkiyle ayni.                              */
      if (t.yavaslik !== undefined) {
        try {
          h.varlik.addEffect("slowness", t.yavaslikSure,
                             { amplifier: t.yavaslik, showParticles: true });
        } catch (e) {
          /* efekt yoksa hasar yine gitti */
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
  /* v6.8: DORDUNCU kapi turu -- ELDEKI ESYA. Kaynak komutlari
     `hasitem={item=...,location=slot.weapon.mainhand}` ile
     kapiyi ELDEKINE bagliyordu; biz de oyle yapiyoruz.

     v6.9: alan adi `kol` degil `elde` -- Simsek Kilici vanilla
     bir DEMIR KILIC istiyor, kol degil. Ad "kol" kalsaydi
     tabloya bakan biri oraya vanilla esya yazilabilecegini
     bilemezdi.                                              */
  if (t.elde) {
    let e;
    try { e = eldekiEsya(oyuncu); } catch (hata) { e = undefined; }
    return { acik: e === t.elde, gerek: t.gerek || "o eşya elinde" };
  }
  /* v6.9: BESINCI kapi turu -- KAFADAKI kostum. Code-Man'in
     siyah gucu onun kostumunu isterken, Marvel isinlari
     BACAKTAKI guc esyasini istiyor: ayni fikir, baska yuva. */
  if (t.kafa) {
    let e;
    try { e = eldekiEsya(oyuncu, "Head"); } catch (hata) { e = undefined; }
    return { acik: e === t.kafa, gerek: t.gerek || "o kostüm" };
  }
  /* v6.1: ucuncu kapi turu -- ELDEKI BEN 10 YARATIGI.
     Kapi TABAN adina bakiyor, bicime degil: Prototip/Recal/10K
     ayni turun uc gorunumu ve modda gucleri tek dosyada.     */
  if (t.yaratik) {
    let taban;
    try {
      const y = BEN10.get(elindekiYaratik(oyuncu));
      taban = y ? y.taban : undefined;
    } catch (e) { taban = undefined; }
    return { acik: taban === t.yaratik, gerek: t.yaratik + " yaratığı" };
  }
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
for (const [kimlik, t] of [...ZIRH_ISIN, ...MARVEL_ISIN, ...BEN10_ISIN,
                           ...KOL_ISIN]) {
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

      /* Butce yuzunden dusemeyen yildirimlar kaldiysa is
         donduruluyor ve tick tick tamamlaniyor. Diger butun
         isinlar ANLIK: bu dal yalniz `simsek` alani olan
         satirda calisiyor.                                  */
      const artik = sonSimsek;
      sonSimsek = undefined;
      if (!artik || artik.kalan <= 0) return undefined;

      let kalan = artik.kalan;
      return {
        ad: kimlik,
        oyuncuId: oyuncu.id,
        calis() {
          if (kalan <= 0) return true;
          const kondu = simsekDusur(oyuncu, t, artik.bas, artik.yon, kalan);
          kalan -= kondu;
          return kalan <= 0;
        }
      };
    }
  });
}

/* Testler ve dunya degisimi icin. */
export function zirhIsinUnut() { bekleme.clear(); }
