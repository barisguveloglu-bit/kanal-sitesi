import { system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import { patlamaIste } from "../butce.js";
import {
  hataYaz, gecerliMi, kollariIndir, parcacikAt, actionbarYaz, yukseklikAraligi
} from "../yardimcilar.js";
import {
  ISINTOP_MENZIL, ISINTOP_HIZ, ISINTOP_YARICAP, ISINTOP_HASAR,
  ISINTOP_HAZIRLIK, ISINTOP_PARCACIK, ISINTOP_HAZIR_PARCACIK,
  ISINTOP_DELIP_GECER, ISINTOP_TAVAN,
  ISINTOP_PATLAR, ISINTOP_PATLAMA, ISINTOP_BLOK_KIRAR
} from "../ayarlar.js";

/* ISIN TOPU -- once elinde topluyorsun, sonra firlatiyorsun.

   Fikir Gunes modundan ("Sari Particle At" + "Yesil Top"): script
   ile ilerleyen, her tick onunu tarayan bir mermi. Bizde boyle bir
   sey yoktu -- toprak topu blok yaziyor, buz mizragi dikit
   koyuyor; ikisi de "ucan mermi" degil.

   REFERANSTAKI HATALAR VE BURADAKI KARSILIKLARI

   1. Her atis kendi system.runInterval'ini aciyordu; butceye
      girmiyor, ust uste biniyordu. Burasi merkezi is listesinde,
      yani AYNI_ANDA tavani ve tick olcumu gecerli.

   2. Oyuncu cikinca interval CALISMAYA DEVAM ediyordu (icerideki
      "if (!p) return" sadece o tick'i atliyor, intervali
      kapatmiyor). Burasi is oldugu icin playerLeave hepsini
      durduruyor.

   3. Hem getEntities hem getPlayers taraniyordu. Bedrock'ta
      getEntities zaten oyunculari da kapsiyor, yani her hedef iki
      kez islenip iki kat hasar aliyordu. Burada tek tarama var.

   4. Durumlar oyuncu ADIYLA (player.name) anahtarlaniyordu. Ad
      degisebilir; burada her sey oyuncu KIMLIGIYLE.

   5. Mermi dunya sinirini ya da duvari gozetmiyordu; havada
      suzulup gidiyordu. Burasi hem sinira hem KATI BLOGA carpinca
      duruyor.                                                    */
yetenekKaydet({
  kimlik: "isin_topu",
  ad: "Isin Topu",
  esyasiz: true,
  sira: 175,

  olustur(oyuncu) {
    const boyut = oyuncu.dimension;
    const sinir = yukseklikAraligi(boyut);
    const oyuncuId = oyuncu.id;

    let yon, poz;
    try {
      yon = oyuncu.getViewDirection();
      const bas = oyuncu.getHeadLocation();
      // Kendi tarama yaricapinin disindan basla, kendini vurma
      poz = {
        x: bas.x + yon.x * (ISINTOP_YARICAP + 0.5),
        y: bas.y + yon.y * (ISINTOP_YARICAP + 0.5),
        z: bas.z + yon.z * (ISINTOP_YARICAP + 0.5)
      };
    } catch (e) {
      hataYaz("isin_topu.baslangic", e);
      kollariIndir(oyuncu);
      return undefined;
    }

    /* HAZIRLIK asamasi referanstaki "Yesil Top"tan: elinde
       toplanirken parcacik donuyor, sonra firliyor. Iptali de
       var -- hazirlik biterken oyuncu gitmisse atis olmuyor.   */
    let hazirlikKalan = ISINTOP_HAZIRLIK;
    let gidilen = 0;
    const vurulan = new Set();     // ayni hedefe iki kez hasar yok
    let vurusSayisi = 0;

    /* Patlama, top DURDUGU anda oluyor: hedefe carpinca, duvara
       carpinca ya da menzil dolunca. Patlama butcesi tick basina
       1 oldugu icin sirasini beklemesi gerekebilir; o yuzden
       ayri bir asama olarak tutuluyor.                         */
    let patlamaNoktasi = null;

    // Tarama secenekleri her tick yeniden uretilmesin
    const _tarama = {
      location: { x: 0, y: 0, z: 0 },
      maxDistance: ISINTOP_YARICAP,
      excludeTypes: ["minecraft:item", "minecraft:xp_orb"]
    };
    const _koord = { x: 0, y: 0, z: 0 };

    function katiMi(x, y, z) {
      if (y < sinir.min || y > sinir.max) return true;
      _koord.x = Math.floor(x); _koord.y = Math.floor(y); _koord.z = Math.floor(z);
      try {
        const b = boyut.getBlock(_koord);
        if (!b) return true;            // yuklenmemis chunk: dur
        return !b.isAir;
      } catch (e) {
        return true;
      }
    }

    /* Top durdu: patlayacaksa noktayi kaydet ve isi ACIK birak
       (patlama butcesi icin bir tick daha gerekebilir), yoksa
       hemen bitir.                                             */
    function patlamayiKur() {
      if (!ISINTOP_PATLAR) return true;
      patlamaNoktasi = { x: poz.x, y: poz.y, z: poz.z };
      return false;
    }

    return {
      ad: "isin_topu",
      oyuncuId: oyuncuId,

      calis() {
        /* --- 0. asama: patlama sirasini bekliyorsa --- */
        if (patlamaNoktasi) {
          if (patlamaIste(1) === 0) return false;   // butce dolu
          try {
            boyut.createExplosion(patlamaNoktasi, ISINTOP_PATLAMA, {
              breaksBlocks: ISINTOP_BLOK_KIRAR,
              causesFire: false,
              allowUnderwater: true
            });
          } catch (e) {
            hataYaz("isin_topu.patlat", e);
          }
          return true;
        }

        /* --- 1. asama: elinde topla --- */
        if (hazirlikKalan > 0) {
          hazirlikKalan--;
          if (!gecerliMi(oyuncu)) return true;
          try {
            const bas = oyuncu.getHeadLocation();
            parcacikAt(boyut, ISINTOP_HAZIR_PARCACIK, bas);
          } catch (e) {
            hataYaz("isin_topu.hazirlik", e);
            return true;
          }
          if (hazirlikKalan === 0) {
            /* Firlarken bakis yonunu TEKRAR oku: hazirlik
               sirasinda nisan degistirebilmelisin.            */
            try {
              yon = oyuncu.getViewDirection();
              const bas = oyuncu.getHeadLocation();
              poz.x = bas.x + yon.x * (ISINTOP_YARICAP + 0.5);
              poz.y = bas.y + yon.y * (ISINTOP_YARICAP + 0.5);
              poz.z = bas.z + yon.z * (ISINTOP_YARICAP + 0.5);
            } catch (e) {
              hataYaz("isin_topu.firlat", e);
              return true;
            }
          }
          return false;
        }

        /* --- 2. asama: ilerle ve tara --- */
        if (gidilen >= ISINTOP_MENZIL) return patlamayiKur();

        poz.x += yon.x * ISINTOP_HIZ;
        poz.y += yon.y * ISINTOP_HIZ;
        poz.z += yon.z * ISINTOP_HIZ;
        gidilen += ISINTOP_HIZ;

        // Duvara ya da dunya sinirina carptiysa bitir
        if (katiMi(poz.x, poz.y, poz.z)) {
          parcacikAt(boyut, ISINTOP_PARCACIK, poz);
          return patlamayiKur();
        }

        parcacikAt(boyut, ISINTOP_PARCACIK, poz);

        _tarama.location.x = poz.x;
        _tarama.location.y = poz.y;
        _tarama.location.z = poz.z;

        let yakin;
        try {
          /* TEK tarama: getEntities oyunculari da kapsiyor.
             Referans ayrica getPlayers cagirip herkesi iki kez
             vuruyordu.                                          */
          yakin = boyut.getEntities(_tarama);
        } catch (e) {
          hataYaz("isin_topu.getEntities", e);
          return true;
        }

        for (const varlik of yakin) {
          try {
            if (varlik.id === oyuncuId) continue;      // atani vurma
            if (vurulan.has(varlik.id)) continue;
            if (!gecerliMi(varlik)) continue;

            vurulan.add(varlik.id);
            varlik.applyDamage(ISINTOP_HASAR);
            vurusSayisi++;

            if (!ISINTOP_DELIP_GECER) return patlamayiKur();  // ilk hedefte dur
            if (vurusSayisi >= ISINTOP_TAVAN) return patlamayiKur();
          } catch (e) {
            hataYaz("isin_topu.hasar", e);
          }
        }

        return false;
      },

      bitir() {
        try {
          if (gecerliMi(oyuncu)) {
            actionbarYaz(oyuncu, vurusSayisi > 0
              ? "§e☀ §f" + vurusSayisi + " isabet" +
                (ISINTOP_PATLAR ? " §8· patladi" : "")
              : (ISINTOP_PATLAR ? "§7Isin topu patladi" : "§7Isin topu bosa gitti"));
          }
        } catch (e) {
          hataYaz("isin_topu.bitir", e);
        }
        kollariIndir(oyuncu);
      }
    };
  }
});
