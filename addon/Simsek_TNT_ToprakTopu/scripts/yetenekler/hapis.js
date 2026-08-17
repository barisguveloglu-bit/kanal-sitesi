import { yetenekKaydet } from "./kayit.js";
import { yapiOrIsi, yapiSokIsi, kutuKabugu } from "./_gecici_yapi.js";
import {
  kafesEkle, kafesSil, enYakinKafes, kafesSayisi, tavanDoldu
} from "./_kafes_defteri.js";
import {
  hataYaz, kollariIndir, kilitliHedef, varlikKonumu, actionbarYaz
} from "../yardimcilar.js";
import {
  HAPIS_MENZIL, HAPIS_ACI, HAPIS_YARICAP, HAPIS_YUKSEK,
  HAPIS_BLOK, HAPIS_TAVAN, HAPIS_AC_MENZIL
} from "../ayarlar.js";

/* HAPIS -- baktigin hedefin etrafina demir parmaklik orer.

   Referans mod (Kevin1545) tek satirdi:
     execute positioned ^^^10 at @e[r=10,c=1] run
       fill ~1 ~2 ~1 ~-1 ~ ~-1 iron_bars

   Referansta "iron_bars" TUM PAKETTE tek bir yerde geciyor: bu
   komutta. Yani kafesi acan hicbir sey yok, kurdugun kafes
   sonsuza kadar duruyor ve elle kirmaktan baska caresi yok.

   Referansin dort kusuru ve burada ne yapildigi:
     1. DOLU 3x3x3 dolduruyor (hedefin hucresi dahil) -> ICI BOS
        kabuk; taban ve tavan kapali, hedefin iki kati bos
     2. "keep" yok, orada ne varsa yok ediyor -> sadece HAVA olan
        yere koyuluyor
     3. acilamiyor -> AC/KAPA var (asagida)
     4. @e[r=10,c=1] oyuncunun kendisini kapsiyor ve bakis yonune
        bakmiyor -> kilitliHedef

   ---- AC / KAPA ----
   Kafes SURESIZ; kendiliginden acilmiyor. Ayni yetenek iki is
   yapiyor, neye baktigina gore:

     onunde hedef VAR   -> yeni kafes kurar
     onunde hedef YOK   -> EN YAKIN kafesini acar

   Yani nisan alip kapatiyorsun, bosluga bakip aciyorsun. Yeni
   bir girdi ya da menu gerekmiyor; jest duzeni aynen kaliyor.

   Kafesler dunya ozelligine kaydediliyor (bkz. _kafes_defteri.js),
   yani dunyadan cikip girsen de acabiliyorsun.                  */

const KAFES = kutuKabugu(HAPIS_YARICAP, HAPIS_YUKSEK);

yetenekKaydet({
  kimlik: "hapis",
  ad: "Hapis",
  esyasiz: true,
  sira: 150,

  olustur(oyuncu) {
    const boyut = oyuncu.dimension;
    const oyuncuId = oyuncu.id;

    const hedef = kilitliHedef(oyuncu, {
      menzil: HAPIS_MENZIL, aci: HAPIS_ACI
    });

    /* ---- Hedef yok: EN YAKIN KAFESI AC ---- */
    if (!hedef) {
      return kafesAc(oyuncu, boyut, oyuncuId);
    }

    /* ---- Hedef var: YENI KAFES KUR ---- */
    if (tavanDoldu(oyuncuId)) {
      actionbarYaz(oyuncu, "§c" + HAPIS_TAVAN + " kafes acik §7· once birini ac " +
                   "§8(bosluga bak + zipla)");
      kollariIndir(oyuncu);
      return undefined;
    }

    const k = varlikKonumu(hedef);
    if (!k) {
      // Hedef bu tick icinde yok oldu; hata degil
      kollariIndir(oyuncu);
      return undefined;
    }

    /* Kafesin tabani hedefin ayaginin BIR ALT kati; boylece hedef
       kabugun icinde kaliyor.                                    */
    const merkez = {
      x: Math.floor(k.x),
      y: Math.floor(k.y) - 1,
      z: Math.floor(k.z)
    };

    actionbarYaz(oyuncu, "§8⛓ §fhapsedildi §7· " + kisaAd(hedef));

    return yapiOrIsi({
      ad: "hapis",
      oyuncu: oyuncu,
      merkez: merkez,
      noktalar: KAFES,
      blok: HAPIS_BLOK,
      tamamlandi(konan) {
        if (konan.length === 0) return;   // her yer doluydu, kayda gerek yok
        kafesEkle(oyuncuId, boyut.id, merkez, konan);
      },
      bittiMesaji(n) {
        if (n === 0) return "§7Kafes kurulamadi §8· etrafi zaten doluydu";
        return "§7Kafes kuruldu §8· " + n + " parmaklik §7· " +
               "acmak icin §fbosluga bak + zipla";
      }
    });
  }
});

function kafesAc(oyuncu, boyut, oyuncuId) {
  let konum;
  try {
    konum = oyuncu.location;
  } catch (e) {
    hataYaz("hapis.location", e);
    kollariIndir(oyuncu);
    return undefined;
  }

  const bulunan = enYakinKafes(oyuncuId, boyut.id, konum);

  if (!bulunan) {
    actionbarYaz(oyuncu, kafesSayisi(oyuncuId) > 0
      ? "§7Bu boyutta acik kafesin yok"
      : "§7Hedef de yok, acik kafes de yok");
    kollariIndir(oyuncu);
    return undefined;
  }

  /* Cok uzaktaki kafesi kazara acmayalim: uzaktaki blok yazimi
     yuklenmemis chunk'a denk gelir ve sessizce basarisiz olur.  */
  if (bulunan.uzaklik > HAPIS_AC_MENZIL) {
    actionbarYaz(oyuncu, "§7En yakin kafes §f" + Math.round(bulunan.uzaklik) +
                 " blok §7uzakta §8(en fazla " + HAPIS_AC_MENZIL + ")");
    kollariIndir(oyuncu);
    return undefined;
  }

  const kafes = bulunan.kafes;
  actionbarYaz(oyuncu, "§a⛓ §fkafes aciliyor");

  return yapiSokIsi({
    ad: "hapis_ac",
    oyuncu: oyuncu,
    boyut: boyut,
    konan: kafes.konan,
    blok: HAPIS_BLOK,
    bittiMesaji(n) {
      /* Defterden ancak is bitince siliniyor: yarida kesilirse
         kayit durur ve kafes yine acilabilir.                   */
      kafesSil(oyuncuId, kafes);
      const kalan = kafesSayisi(oyuncuId);
      return "§7Kafes acildi §8· " + n + " parmaklik" +
             (kalan > 0 ? " §7· §f" + kalan + " kafes daha acik" : "");
    }
  });
}

/* "minecraft:zombie" -> "zombie" */
function kisaAd(varlik) {
  try {
    const t = varlik.typeId || "";
    const i = t.indexOf(":");
    return i === -1 ? t : t.slice(i + 1);
  } catch (e) {
    return "hedef";
  }
}
