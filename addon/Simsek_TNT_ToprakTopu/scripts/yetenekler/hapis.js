import { yetenekKaydet } from "./kayit.js";
import { geciciYapiIsi, kutuKabugu } from "./_gecici_yapi.js";
import {
  hataYaz, kollariIndir, kilitliHedef, varlikKonumu, actionbarYaz
} from "../yardimcilar.js";
import {
  HAPIS_MENZIL, HAPIS_ACI, HAPIS_YARICAP, HAPIS_YUKSEK,
  HAPIS_SURE, HAPIS_BLOK
} from "../ayarlar.js";

/* HAPIS -- baktigin hedefin etrafina demir parmaklik orer.

   Referans mod (Kevin1545) tek satirdi:
     execute positioned ^^^10 at @e[r=10,c=1] run
       fill ~1 ~2 ~1 ~-1 ~ ~-1 iron_bars

   Bu, referanstaki NADIR calisan komutlardan biri -- sozdizimi
   dogru. Ama uc sorunu var:

     1. DOLU 3x3x3 dolduruyor, hedefin durdugu hucre dahil. Yani
        kafes degil, demir blogu. Icine kimse sigmiyor.
     2. "keep" yok: orada ne varsa yok ediyor.
     3. Geri almiyor -- dunyada kalici bir demir kule kaliyor.
     4. @e[r=10,c=1] secicisi oyuncunun KENDISINI de kapsiyor ve
        bakis yonune bakmiyor (Dave1545'teki ayni hata).

   Bizimki:
     1. ICI BOS kabuk -- hedef gercekten kafesin icinde kaliyor
     2. sadece HAVA olan yere koyuyor
     3. sure dolunca kendi koydugunu geri aliyor
     4. kilitliHedef: kendini dislar, bakis konisine bakar

   Kafes hedefin KONULDUGU ANDAKI yerine oruluyor, pesinden
   gitmiyor -- zaten amaci onu orada tutmak.                     */

const KAFES = kutuKabugu(HAPIS_YARICAP, HAPIS_YUKSEK);

yetenekKaydet({
  kimlik: "hapis",
  ad: "Hapis",
  esyasiz: true,
  sira: 150,

  olustur(oyuncu) {
    const hedef = kilitliHedef(oyuncu, {
      menzil: HAPIS_MENZIL, aci: HAPIS_ACI
    });

    if (!hedef) {
      actionbarYaz(oyuncu, "§7Hapsedecek bir hedef yok");
      kollariIndir(oyuncu);
      return undefined;
    }

    const k = varlikKonumu(hedef);
    if (!k) {
      // Hedef bu tick icinde yok oldu; hata degil
      kollariIndir(oyuncu);
      return undefined;
    }

    /* Kafes hedefin AYAGININ oldugu kattan yukari doğru oruluyor,
       yani hedef kabugun icinde kaliyor. kutuKabugu y=0..YUKSEK
       arasi uretiyor; merkezi bir kat asagi almiyoruz ki taban
       hedefin ayaginin altina denk gelsin.                       */
    const merkez = {
      x: Math.floor(k.x),
      y: Math.floor(k.y) - 1,
      z: Math.floor(k.z)
    };

    let ad = "hedef";
    try {
      const t = hedef.typeId || "";
      const i = t.indexOf(":");
      ad = (i === -1) ? t : t.slice(i + 1);
    } catch (e) {
      hataYaz("hapis.typeId", e);
    }

    actionbarYaz(oyuncu, "§8⛓ §fhapsedildi §7· " + ad);

    return geciciYapiIsi({
      ad: "hapis",
      oyuncu: oyuncu,
      merkez: merkez,
      noktalar: KAFES,
      blok: HAPIS_BLOK,
      sure: HAPIS_SURE,
      bittiMesaji: (n) => "§7Kafes acildi §8· " + n + " parmaklik geri alindi"
    });
  }
});
