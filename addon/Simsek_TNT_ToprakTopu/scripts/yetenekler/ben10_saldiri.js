import { system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import { elindekiYaratik } from "./ben10.js";
import { patlamaIste } from "../butce.js";
import {
  hataYaz, gecerliMi, actionbarYaz, kollariIndir, parcacikAt,
  yukseklikAraligi
} from "../yardimcilar.js";
import {
  BEN10_SALDIRI, BEN10_SALDIRI_ACIK, BEN10_SALDIRI_BEKLEME,
  BEN10_SALDIRI_SIRA, BEN10_MERMI_HIZ_TAVAN, BEN10_MERMI_TAVAN,
  BEN10_ALAN_TAVAN,
  BEN10, LAZER_HASAR_SEBEP
} from "../ayarlar.js";

/* ================================================================
   BEN 10 SALDIRILARI                                        v6.1

   Kullanici: "aktif saldirilari da bitirelim... referans da
   bazen yanlis bilgi verebiliyor o yuzden [jar'i tekrar
   atiyorum]."

   Sayilarin hepsi ayarlar.js:BEN10_SALDIRI'da ve o tablo jar'dan
   URETILDI. Bu dosyanin isi sayi tutmak degil, UC DAVRANIS:

     mermi   script'le ilerleyen, her tick onunu tarayan bir
             mermi. Duvara ya da dunya sinirina carpinca durur;
             patlama yariçapi varsa orada patlar.
     alan    anlik cevre hasari (+ istege bagli itme, yakma,
             patlama, dikey menzil).
     atilma  bakis yonune itme. Kaynaktaki motion / motion_dash /
             charge_leap / vax_leap / astrojump hepsi bu.

   ---- NEDEN ISIN_TOPU'NUN KODU KOPYALANMADI ----
   isin_topu.js TEK bir mermi: sabitleri ayarlar.js'ten dogrudan
   okuyor, elinde toplama asamasi var, tek parcacigi var.
   Burasi YIRMI DORT ayri mermi ve hepsinin hizi, yariçapi,
   patlamasi, yakmasi farkli. Oradaki dosyayi parametreli hale
   getirmek onu iki isin ortak atasi yapardi; ayrica orasi
   "hazirlik + firlat" akisi, burasi anlik atis.

   Ondan ALINAN sey dersleri:
     - is merkezi kuyrukta (AYNI_ANDA tavani gecerli), kendi
       runInterval'ini acmiyor
     - oyuncu cikinca is duruyor
     - tek getEntities taramasi (iki kez tarayip iki kat hasar
       vermek eski bir hataydi)
     - durumlar oyuncu KIMLIGIYLE, adiyla degil
     - dunya sinirini ve KATI BLOGU gozetiyor

   ---- KAPI ----
   Yetenek MENUDEN de secilebiliyor, o yuzden "elinde dogru
   yaratik var mi" burada da sinaniyor. Aksi hâlde Atomik'in
   nukleer topunu Gri Madde'yle atmak mumkun olurdu.

   Kapi TABAN adina bakiyor, bicime degil: Prototip/Recal/10K
   ayni turun uc gorunumu ve modda da gucleri tek dosyada.
   ================================================================ */

/* oyuncuId + yetenek -> bir sonraki atisin en erken tick'i */
const bekleme = new Map();

/* Elindeki yaratigin TABAN adi (bicim soneki atilmis). */
function elindekiTaban(oyuncu) {
  let anahtar;
  try { anahtar = elindekiYaratik(oyuncu); } catch (e) { return undefined; }
  if (!anahtar) return undefined;
  const t = BEN10.get(anahtar);
  return t ? t.taban : undefined;
}

/* ---------------- ortak: alan hasari ---------------- */
/* Merkez cevresindeki varliklara vurur. `yukseklik` verilirse
   silindir (Astro Bot'un dikey lazeri boyle: yariçap 0.5,
   yukseklik 10).                                             */
function alanVur(oyuncu, t, merkez) {
  let yakinlar;
  const menzil = t.yukseklik ? Math.max(t.yaricap, t.yukseklik) : t.yaricap;
  try {
    yakinlar = oyuncu.dimension.getEntities({
      location: merkez,
      maxDistance: menzil + 1,
      excludeTypes: ["minecraft:item", "minecraft:xp_orb"]
    });
  } catch (e) {
    hataYaz("ben10_alan.getEntities", e);
    return 0;
  }

  const adaylar = [];
  for (const varlik of yakinlar) {
    try {
      if (varlik.id === oyuncu.id) continue;
      if (!gecerliMi(varlik)) continue;
      const k = varlik.location;
      const dx = k.x - merkez.x, dy = k.y - merkez.y, dz = k.z - merkez.z;
      if (t.yukseklik) {
        /* Silindir: yatayda yariçap, dikeyde yukseklik. */
        if (dx * dx + dz * dz > t.yaricap * t.yaricap) continue;
        if (dy < -1 || dy > t.yukseklik) continue;
        adaylar.push({ varlik, uzak: Math.abs(dy) });
      } else {
        const kare = dx * dx + dy * dy + dz * dz;
        if (kare > t.yaricap * t.yaricap) continue;
        adaylar.push({ varlik, uzak: Math.sqrt(kare) });
      }
    } catch (e) {
      hataYaz("ben10_alan.suz", e);
    }
  }
  /* Tavan asilirsa EN YAKINDAKILER vurulsun, rastgele degil. */
  adaylar.sort((a, b) => a.uzak - b.uzak);

  let vuran = 0;
  for (const h of adaylar) {
    if (vuran >= BEN10_ALAN_TAVAN) break;
    try {
      if (t.hasar > 0) {
        /* Hasar turu isinlarla AYNI sebepten "fire" degil:
           bekci ve butun ates bagisikli varliklar onu tam
           yutuyor. Yakma asagida ayrica yapiliyor.          */
        h.varlik.applyDamage(t.hasar,
          { cause: LAZER_HASAR_SEBEP, damagingEntity: oyuncu });
      }
      if (t.yakma > 0) {
        try { h.varlik.setOnFire(t.yakma, true); } catch (e) { /* surum */ }
      }
      if (t.itme > 0) {
        try {
          const k = h.varlik.location;
          const dx = k.x - merkez.x, dz = k.z - merkez.z;
          const uz = Math.hypot(dx, dz) || 1;
          h.varlik.applyKnockback(dx / uz * t.itme, dz / uz * t.itme,
                                  t.itme, t.itme * 0.35);
        } catch (e) { /* itme her varlikta yok */ }
      }
      vuran++;
    } catch (e) {
      hataYaz("ben10_alan.hasar", e);
    }
  }
  return vuran;
}

/* Bakis yonune itme. applyImpulse OYUNCUDA ISLEMIYOR (bu
   depoda v4.x'te olculdu, cekme.js'te yazili); modun kendisi
   de her yerde applyKnockback kullaniyor.                    */
function itKendini(oyuncu, guc) {
  try {
    const yon = oyuncu.getViewDirection();
    const yatay = Math.hypot(yon.x, yon.z) || 1;
    oyuncu.applyKnockback(yon.x / yatay * guc, yon.z / yatay * guc,
                          guc, Math.max(0.35, yon.y * guc));
  } catch (e) {
    hataYaz("ben10_atilma.it", e);
  }
}

/* ---------------- mermi isi ---------------- */
function mermiIsi(oyuncu, t) {
  const boyut = oyuncu.dimension;
  const sinir = yukseklikAraligi(boyut);
  const oyuncuId = oyuncu.id;
  /* Hiz TAVANLI: bir tick'te 5 blok atlayan mermi duvarin
     icinden gecer. Kaynagin sayisi tabloda duruyor.          */
  const hiz = Math.min(t.hiz, BEN10_MERMI_HIZ_TAVAN);
  /* Menzil tavani tabloyu URETIRKEN de uygulaniyor ama burada
     TEKRAR uygulaniyor: tablo elle duzenlenirse (ya da yeni
     bir satir kaynaktaki ham sayiyla yazilirsa) 630 bloka
     kadar tarayan bir mermi cikardi. Ayar tek yerde, kapi iki
     yerde.                                                    */
  const menzil = Math.min(t.menzil, BEN10_MERMI_TAVAN);

  let yon, poz;
  try {
    yon = oyuncu.getViewDirection();
    const bas = oyuncu.getHeadLocation();
    poz = { x: bas.x + yon.x, y: bas.y + yon.y, z: bas.z + yon.z };
  } catch (e) {
    hataYaz("ben10_mermi.baslangic", e);
    return undefined;
  }

  let gidilen = 0;
  let patlamaNoktasi;
  /* Patlama butcesi doluysa bir tick daha bekleniyor -- ama
     SONSUZA KADAR degil. Butce hic acilmazsa (kalabalik bir
     sunucuda ya da testte) is kuyrukta asili kalirdi.
     BEKLEME kadar deneyip vazgeciyoruz: mermi zaten hasarini
     vermis oluyor, kaybolan sey yalniz patlama.              */
  let patlamaSabri = BEN10_SALDIRI_BEKLEME;
  const vurulan = new Set();

  function katiMi(x, y, z) {
    if (y < sinir.alt || y > sinir.ust) return true;
    try {
      const b = boyut.getBlock({ x: Math.floor(x), y: Math.floor(y),
                                 z: Math.floor(z) });
      if (!b) return true;             // yuklenmemis chunk: dur
      return !b.isAir && !b.isLiquid;
    } catch (e) {
      return true;
    }
  }

  function bitir() {
    if (!t.patlama) return true;
    patlamaNoktasi = { x: poz.x, y: poz.y, z: poz.z };
    return false;
  }

  return {
    ad: "ben10_mermi",
    oyuncuId,

    calis() {
      if (patlamaNoktasi) {
        if (patlamaIste(1) === 0) {
          patlamaSabri--;
          return patlamaSabri <= 0;               // sabir bitti: birak
        }
        try {
          boyut.createExplosion(patlamaNoktasi, t.patlama, {
            breaksBlocks: t.blokKirar === true,
            causesFire: (t.yakma || 0) > 0,
            allowUnderwater: true
          });
        } catch (e) {
          hataYaz("ben10_mermi.patlat", e);
        }
        return true;
      }

      if (gidilen >= menzil) return bitir();

      poz.x += yon.x * hiz;
      poz.y += yon.y * hiz;
      poz.z += yon.z * hiz;
      gidilen += hiz;

      if (katiMi(poz.x, poz.y, poz.z)) {
        parcacikAt(boyut, "minecraft:critical_hit_emitter", poz);
        return bitir();
      }
      parcacikAt(boyut, "minecraft:critical_hit_emitter", poz);

      /* Tek tarama. Ikinci bir getPlayers cagrisi eski bir
         hataydi: Bedrock'ta getEntities zaten oyunculari da
         kapsiyor ve her hedef iki kat hasar aliyordu.        */
      let yakinlar;
      try {
        yakinlar = boyut.getEntities({
          location: poz,
          maxDistance: t.yaricap + 0.5,
          excludeTypes: ["minecraft:item", "minecraft:xp_orb"]
        });
      } catch (e) {
        return true;
      }
      for (const varlik of yakinlar) {
        try {
          if (varlik.id === oyuncuId) continue;
          if (vurulan.has(varlik.id)) continue;
          if (!gecerliMi(varlik)) continue;
          vurulan.add(varlik.id);
          if (t.hasar > 0) {
            varlik.applyDamage(t.hasar,
              { cause: LAZER_HASAR_SEBEP, damagingEntity: oyuncu });
          }
          if (t.yakma > 0) {
            try { varlik.setOnFire(t.yakma, true); } catch (e) { /* surum */ }
          }
          if (t.itme > 0) {
            try {
              const yatay = Math.hypot(yon.x, yon.z) || 1;
              varlik.applyKnockback(yon.x / yatay * t.itme,
                                    yon.z / yatay * t.itme,
                                    t.itme, t.itme * 0.35);
            } catch (e) { /* itme her varlikta yok */ }
          }
          return bitir();          // mermi ilk hedefte duruyor
        } catch (e) {
          hataYaz("ben10_mermi.vur", e);
        }
      }
      return false;
    }
  };
}

/* ---------------- kayit ---------------- */
let _sira = BEN10_SALDIRI_SIRA;
for (const [kimlik, t] of BEN10_SALDIRI) {
  yetenekKaydet({
    kimlik,
    ad: t.ad,
    esyasiz: true,
    sira: _sira++,

    olustur(oyuncu) {
      if (!BEN10_SALDIRI_ACIK) {
        actionbarYaz(oyuncu, "§cBen 10 saldırıları kapalı.");
        kollariIndir(oyuncu);
        return undefined;
      }

      /* 1. Dogru yaratik elinde mi? */
      const taban = elindekiTaban(oyuncu);
      if (taban !== t.yaratik) {
        actionbarYaz(oyuncu,
          "§c" + t.ad + " için §f" + t.yaratik + " §celinde olmalı");
        kollariIndir(oyuncu);
        return undefined;
      }

      /* 2. Bekleme doldu mu? */
      const anahtar = oyuncu.id + "|" + kimlik;
      const simdi = system.currentTick;
      const erken = bekleme.get(anahtar) || 0;
      if (simdi < erken) {
        actionbarYaz(oyuncu, "§7" + t.ad + " hazır değil §8· " +
          ((erken - simdi) / 20).toFixed(1) + " sn");
        kollariIndir(oyuncu);
        return undefined;
      }
      bekleme.set(anahtar, simdi + BEN10_SALDIRI_BEKLEME);

      if (t.tur === "mermi") {
        kollariIndir(oyuncu);
        return mermiIsi(oyuncu, t);         // surekli is
      }

      if (t.tur === "atilma") {
        itKendini(oyuncu, t.guc);
        actionbarYaz(oyuncu, "§b» " + t.ad);
        kollariIndir(oyuncu);
        return undefined;
      }

      /* alan */
      if (t.itisGuc) itKendini(oyuncu, t.itisGuc);
      let merkez;
      try { merkez = oyuncu.location; } catch (e) { merkez = undefined; }
      let vuran = 0;
      if (merkez) vuran = alanVur(oyuncu, t, merkez);
      if (t.patlama && merkez) {
        try {
          if (patlamaIste(1) > 0) {
            oyuncu.dimension.createExplosion(merkez, t.patlama, {
              breaksBlocks: false, causesFire: false, allowUnderwater: true
            });
          }
        } catch (e) {
          hataYaz("ben10_alan.patlat", e);
        }
      }
      actionbarYaz(oyuncu, "§6✷ " + t.ad + " §8· " + vuran + " hedef");
      kollariIndir(oyuncu);
      return undefined;
    }
  });
}

/* Testler ve dunya degisimi icin. */
export function ben10SaldiriUnut() { bekleme.clear(); }
