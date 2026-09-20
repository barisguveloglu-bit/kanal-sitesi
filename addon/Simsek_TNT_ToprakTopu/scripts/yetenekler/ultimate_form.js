import { system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import {
  hataYaz, gecerliMi, actionbarYaz, kollariIndir, parcacikAt,
  varlikKonumu, bilgiYaz
} from "../yardimcilar.js";
import {
  ULTIMATE_ACIK, ULTIMATE_KAYNAKLAR, ULTIMATE_SURE, ULTIMATE_BEKLEME,
  ULTIMATE_TAZELEME, ULTIMATE_EFEKT_SURE, ULTIMATE_PARCACIK,
  ULTIMATE_PARCACIK_ADET, ULTIMATE_SES_AC, ULTIMATE_SES_KAPA,
  ZIRH_MODLAR, MARVEL_GUCLER, BEN10
} from "../ayarlar.js";

/* ============================================================
   ULTIMATE FORM -- DORT FORMUN BIRLESIMI            v7.95

   Secimin gerekcesi ve olculen sayilar ayarlar.js'te
   ULTIMATE_KAYNAKLAR'in ustunde yazili.

   ---- EFEKTLER NEDEN BURADA HESAPLANIYOR ----
   Kaynak formlarin efektleri ayarlar.js'te zaten var. Onlari
   kopyalayip ikinci bir liste yazmak, iki listenin zamanla
   AYRISMASI demekti (deponun tekrarlayan dersi: SITE_ADRESI,
   paket adlari, KOL_ESYALARI hep bu yuzden tek kaynaktan
   turuyor). Burada da tek kaynak kaynagin kendisi: dort formun
   efektleri okunur, her efektin EN YUKSEK seviyesi alinir.

   Titan'in gucu yarin degisirse Ultimate kendiliginden dogru
   kalir; kimsenin iki yeri birden guncellemesi gerekmez.

   ---- NEDEN "EN YUKSEK", "TOPLAM" DEGIL ----
   Minecraft'ta ayni efekt iki kez verilemez; ikincisi birinciyi
   ezer. strength 53 + strength 32 diye bir sey yok, 53 var.
   Toplasaydik (85) hicbir kaynakta olmayan bir sayi uydurmus
   olurduk -- "sahte icerik yasak" kurali burada da gecerli.
   ============================================================ */

/* Ultimate acik olan oyuncular: id -> bitis tick'i.
   isinlar.js bunu OKUYOR (Titan Lazeri'nin kapisi).            */
const acik = new Map();
const bekleme = new Map();

/* isinlar.js icin: bu oyuncuda Ultimate acik mi? */
export function ultimateAcikMi(oyuncuId) {
  const bitis = acik.get(oyuncuId);
  if (bitis === undefined) return false;
  if (system.currentTick >= bitis) {
    acik.delete(oyuncuId);
    return false;
  }
  return true;
}

/* Oyuncu cikinca defteri birakmayalim. */
export function ultimateUnut(oyuncuId) {
  acik.delete(oyuncuId);
  bekleme.delete(oyuncuId);
}

/* ---- Kaynak formun efekt listesini bul ---- */
function kaynagiCoz(tablo, anahtar) {
  if (tablo === "zirh") return ZIRH_MODLAR.get(anahtar);
  if (tablo === "marvel") return MARVEL_GUCLER.get(anahtar);
  if (tablo === "ben10") {
    /* BEN10'un anahtari bicimli ("ben_atomik_proto"); taban
       adiyla ariyoruz, ilk esleseni yeter -- uc bicimin
       efektleri ayni.                                        */
    for (const [, t] of BEN10) if (t.taban === anahtar) return t;
    return undefined;
  }
  return undefined;
}

/* Dort kaynagin efektlerini birlestirir: her efektin EN YUKSEGI.
   Disa aciktir cunku test bunu dogrudan olcuyor.              */
export function birlesikEfektler() {
  const enIyi = new Map();          // efekt adi -> seviye
  const eksik = [];
  for (const [tablo, anahtar] of ULTIMATE_KAYNAKLAR) {
    const form = kaynagiCoz(tablo, anahtar);
    if (!form) { eksik.push(tablo + ":" + anahtar); continue; }
    for (const [ad, , seviye] of (form.efektler || [])) {
      const s = seviye || 0;
      if (!enIyi.has(ad) || enIyi.get(ad) < s) enIyi.set(ad, s);
    }
  }
  if (eksik.length) {
    bilgiYaz("UYARI: Ultimate kaynagi bulunamadi: " + eksik.join(", "));
  }
  return [...enIyi.entries()];
}

/* Kaynak formlarin adlari -- menude ve mesajda gosteriliyor. */
export function kaynakAdlari() {
  const adlar = [];
  for (const [tablo, anahtar] of ULTIMATE_KAYNAKLAR) {
    const f = kaynagiCoz(tablo, anahtar);
    adlar.push(f ? (f.ad || anahtar).split(" · ")[0] : anahtar);
  }
  return adlar;
}

function efektVer(oyuncu, efektler) {
  for (const [ad, seviye] of efektler) {
    try {
      oyuncu.addEffect(ad, ULTIMATE_EFEKT_SURE, {
        amplifier: seviye,
        /* Parcacik KAPALI: dokuz efekt birden acikken oyuncu
           parcacik bulutuna donuyor (ben10.js'teki ayni ders). */
        showParticles: false
      });
    } catch (e) {
      /* Efekt adi bu surumde yoksa digerleri yine gitsin. */
    }
  }
}

function halkaCiz(oyuncu) {
  try {
    const k = varlikKonumu(oyuncu);
    for (let i = 0; i < ULTIMATE_PARCACIK_ADET; i++) {
      const a = (Math.PI * 2 * i) / ULTIMATE_PARCACIK_ADET;
      parcacikAt(oyuncu.dimension, ULTIMATE_PARCACIK, {
        x: k.x + Math.cos(a) * 1.2,
        y: k.y + 0.2,
        z: k.z + Math.sin(a) * 1.2
      });
    }
  } catch (e) {
    /* Cizim sus -- yetenegin isi efektler. */
  }
}

function sesCal(oyuncu, ses) {
  try {
    oyuncu.dimension.playSound(ses, varlikKonumu(oyuncu));
  } catch (e) {
    /* playSound bu surumde yoksa yetenek yine calisti. */
  }
}

if (ULTIMATE_ACIK) {
  yetenekKaydet({
    kimlik: "ultimate_form",
    ad: "§6§lULTIMATE FORM",
    esyasiz: true,
    /* 295: isinlarin basladigi 300'un hemen altinda, var olan
       yeteneklerin (en yukarisi 270) ustunde. Bosluk bilerek. */
    sira: 295,

    olustur(oyuncu) {
      const id = oyuncu.id;
      const simdi = system.currentTick;

      /* Acikken tekrar secilirse KAPAT -- anahtar gibi calissin,
         yoksa sureyi beklemekten baska cikis yolu olmazdi.    */
      if (ultimateAcikMi(id)) {
        acik.delete(id);
        bekleme.set(id, simdi + ULTIMATE_BEKLEME);
        sesCal(oyuncu, ULTIMATE_SES_KAPA);
        actionbarYaz(oyuncu, "§7Ultimate Form kapandı");
        kollariIndir(oyuncu);
        return undefined;
      }

      const erken = bekleme.get(id) || 0;
      if (simdi < erken) {
        actionbarYaz(oyuncu, "§7Ultimate Form hazır değil §8· " +
                     ((erken - simdi) / 20).toFixed(1) + " sn");
        kollariIndir(oyuncu);
        return undefined;
      }

      const efektler = birlesikEfektler();
      if (!efektler.length) {
        actionbarYaz(oyuncu, "§cUltimate Form: kaynak form bulunamadı");
        kollariIndir(oyuncu);
        return undefined;
      }

      const bitis = simdi + ULTIMATE_SURE;
      acik.set(id, bitis);
      efektVer(oyuncu, efektler);
      halkaCiz(oyuncu);
      sesCal(oyuncu, ULTIMATE_SES_AC);
      actionbarYaz(oyuncu, "§6§lULTIMATE FORM §r§7· " +
                   kaynakAdlari().join(" + "));
      kollariIndir(oyuncu);

      let sonrakiTazeleme = simdi + ULTIMATE_TAZELEME;
      return {
        ad: "Ultimate Form",
        oyuncuId: id,
        calis() {
          if (!gecerliMi(oyuncu)) { acik.delete(id); return true; }
          const t = system.currentTick;
          if (t >= bitis) {
            acik.delete(id);
            bekleme.set(id, t + ULTIMATE_BEKLEME);
            sesCal(oyuncu, ULTIMATE_SES_KAPA);
            actionbarYaz(oyuncu, "§7Ultimate Form sona erdi");
            return true;
          }
          /* Kullanici menuden kapatmis olabilir. */
          if (!acik.has(id)) return true;
          if (t >= sonrakiTazeleme) {
            sonrakiTazeleme = t + ULTIMATE_TAZELEME;
            try { efektVer(oyuncu, efektler); halkaCiz(oyuncu); }
            catch (e) { hataYaz("ultimate.tazeleme", e); }
          }
          return false;
        },
        bitir() { acik.delete(id); }
      };
    }
  });
}
