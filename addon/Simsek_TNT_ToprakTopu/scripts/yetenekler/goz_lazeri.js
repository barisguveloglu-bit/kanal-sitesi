import { system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import { blokIste } from "../butce.js";
import { kademeAl, lazerGozuAc, lazerGozuKapat } from "./iksirler.js";
import {
  hataYaz, gecerliMi, kollariIndir, actionbarYaz, parcacikAt
} from "../yardimcilar.js";
import {
  LAZER_KALINLIK, LAZER_SURE, LAZER_ADIM, LAZER_TAVAN, LAZER_OYUNCU,
  PARCACIK_LAZER,
  LAZER_MENZIL, DUVAR_DELME_ACIK, DUVAR_DELME_YARICAP,
  DUVAR_DELME_TAVAN, KORUNAN_KUME
} from "../ayarlar.js";

/* GOZ LAZERI -- Nitroksin'in ikonik yetenegi.

   Iksir icmis olman SART: lazer gozden cikiyor, goz de iksirden
   geliyor. Kademe yoksa yetenek calismaz ve sebebini soyler.

   ---- REFERANS NASIL YAPIYORDU ----
     execute @s^^^2 /damage @e[r=2,c=1] 6 fire
     execute @s^^^4 /damage @e[r=4,c=1] 6 fire
     execute @s^^^6 /damage @e[r=6,c=1] 6 fire
     execute @s^^^8 /damage @e[r=8,c=1] 6 fire
   Bes kademenin lazeri de BIREBIR AYNIYDI: sabit 6 hasar, sabit
   8 blok. Uc sorun:

     1. NOKTA tariyordu, cizgi degil. 2/4/6/8. blokta duran
        vuruluyor, 3. blokta duran kurtuluyordu.
     2. "@e[r=2,c=1]" en yakini seciyor ama OYUNCUYU da sayiyor.
        Bu yuzden her lazerden once kendilerine instant_health
        veriyorlardi -- kendi lazerinle vurulup aninda iyilesmek.
        Yama, cozum degil.
     3. "Lazeri kapat" dugmesi de ayni dort hasar satirini
        calistiriyordu, yani kapatmak da hasar veriyordu.

   ---- BIZDE ----
   Isin bir CIZGI. Tek getEntities cagrisi yapiliyor, sonra her
   varligin isin uzerine izdusumu hesaplaniyor: ileride mi ve
   isina yeterince yakin mi. Dort ayri dunya taramasi yerine bir
   tarama -- hem daha dogru hem daha ucuz.

   Kendimizi hedef listesine hic almiyoruz, o yuzden kendini
   iyilestirme yamasina gerek yok.

   Hasar ve menzil KADEMEYE gore artiyor.                        */
yetenekKaydet({
  kimlik: "goz_lazeri",
  ad: "Goz Lazeri",
  esyasiz: true,
  sira: 170,

  olustur(oyuncu) {
    const kademe = kademeAl(oyuncu.id);
    if (!kademe || !kademe.lazer) {
      actionbarYaz(oyuncu, "§cOnce iksir icmelisin §7(lazer gozden cikar)");
      kollariIndir(oyuncu);
      return undefined;
    }

    const boyut = oyuncu.dimension;
    const ayar = kademe.lazer;

    let bas, yon;
    try {
      bas = oyuncu.getHeadLocation();
      yon = oyuncu.getViewDirection();
    } catch (e) {
      hataYaz("goz_lazeri.baslangic", e);
      kollariIndir(oyuncu);
      return undefined;
    }

    /* ---- Hedef bulma: TEK tarama, sonra isina izdusum ---- */
    let yakin;
    try {
      yakin = boyut.getEntities({
        location: bas,
        maxDistance: LAZER_MENZIL,
        excludeTypes: ["minecraft:item", "minecraft:xp_orb"]
      });
    } catch (e) {
      hataYaz("goz_lazeri.getEntities", e);
      yakin = [];
    }

    const vurulanlar = [];
    for (const varlik of yakin) {
      try {
        if (varlik.id === oyuncu.id) continue;          // kendimize asla
        if (!gecerliMi(varlik)) continue;
        if (varlik.typeId === "minecraft:player" && !LAZER_OYUNCU) continue;

        const k = varlik.location;
        const dx = k.x - bas.x, dy = k.y - bas.y, dz = k.z - bas.z;

        // Isin uzerindeki izdusum: ne kadar ILERIDE
        const ileri = dx * yon.x + dy * yon.y + dz * yon.z;
        if (ileri < 0 || ileri > LAZER_MENZIL) continue;

        // Isina dik uzaklik: ne kadar YANDA
        const sapmaKare = (dx * dx + dy * dy + dz * dz) - ileri * ileri;
        if (sapmaKare > LAZER_KALINLIK * LAZER_KALINLIK) continue;

        vurulanlar.push({ varlik, ileri });
      } catch (e) {
        hataYaz("goz_lazeri.izdusum", e);
      }
    }

    // Tavan asilirsa en YAKINDAKILER vurulsun, rastgele degil
    vurulanlar.sort((a, b) => a.ileri - b.ileri);

    let vuran = 0;
    let calinanCan = 0;
    for (const h of vurulanlar) {
      if (vuran >= LAZER_TAVAN) break;
      try {
        h.varlik.applyDamage(ayar.hasar, { cause: "fire" });

        if (ayar.ates) {
          try {
            h.varlik.setOnFire(4, true);
          } catch (e) {
            /* setOnFire bazi surumlerde yok; hasar zaten verildi */
          }
        }
        /* Grinoksin: zehir. Vanilla zehir OLDURMEZ (1 canda
           birakir), yani hapsedip eritme etkisi.               */
        if (ayar.zehir) {
          try {
            h.varlik.addEffect("poison", 120, { amplifier: 1 });
          } catch (e) {
            /* efekt verilemedi; hasar zaten gitti */
          }
        }
        vuran++;
        calinanCan += ayar.canCal ? Math.floor(ayar.hasar / 3) : 0;
      } catch (e) {
        hataYaz("goz_lazeri.applyDamage", e);
      }
    }

    /* Kan Iksiri: verdigin hasarin bir kismi sana can olarak
       doner. Referansta yok, kan kimligini tamamlamak icin.   */
    if (calinanCan > 0) {
      try {
        oyuncu.addEffect("instant_health", 1, { amplifier: calinanCan - 1 });
      } catch (e) {
        hataYaz("goz_lazeri.canCal", e);
      }
    }

    /* ---- Gorunum: goz parlar, isin cizilir ---- */
    lazerGozuAc(oyuncu, kademe);

    const bitisTick = system.currentTick + LAZER_SURE;
    let cizildi = false;

    try {
      actionbarYaz(oyuncu, "§c⚡ " + kademe.ad + " lazeri §7· " +
                   vuran + " hedef · " + ayar.hasar + " hasar");
    } catch (e) {
      hataYaz("goz_lazeri.actionbar", e);
    }

    /* ---- Duvar delme ----
       Isin boyunca onune cikan bloklari deliyor. Referansta bu
       YOK; oradaki tek "wall" gecen yer "fly_into_wall" ve o bir
       HASAR TURU adi, blok kirmayla ilgisi yok.

       Nokta listesi bir kez hesaplaniyor; her tick butcenin izin
       verdigi kadari deliniyor.                                 */
    const delinecek = [];
    if (DUVAR_DELME_ACIK) {
      const r = DUVAR_DELME_YARICAP;
      for (let d = 1; d <= LAZER_MENZIL && delinecek.length < DUVAR_DELME_TAVAN; d++) {
        const mx = bas.x + yon.x * d;
        const my = bas.y + yon.y * d;
        const mz = bas.z + yon.z * d;
        for (let ox = -r; ox <= r; ox++) {
          for (let oy = -r; oy <= r; oy++) {
            for (let oz = -r; oz <= r; oz++) {
              if (delinecek.length >= DUVAR_DELME_TAVAN) break;
              delinecek.push({
                x: Math.floor(mx) + ox,
                y: Math.floor(my) + oy,
                z: Math.floor(mz) + oz
              });
            }
          }
        }
      }
    }

    let delIndeks = 0;
    let delinen = 0;
    const _koord = { x: 0, y: 0, z: 0 };

    return {
      ad: "goz_lazeri",
      oyuncuId: oyuncu.id,

      calis() {
        /* Isin parcaciklari bir kez ciziliyor; her tick cizmek
           tablette bosuna yuk. Isin zaten anlik bir sey.        */
        if (!cizildi) {
          cizildi = true;
          for (let d = 1; d <= LAZER_MENZIL; d += LAZER_ADIM) {
            parcacikAt(boyut, PARCACIK_LAZER, {
              x: bas.x + yon.x * d,
              y: bas.y + yon.y * d,
              z: bas.z + yon.z * d
            });
          }
        }
        /* Duvar delme: butce kadar, sonrakine devrederek */
        while (delIndeks < delinecek.length) {
          if (blokIste(2) < 2) return false;    // butce dolu
          const n = delinecek[delIndeks++];
          try {
            _koord.x = n.x; _koord.y = n.y; _koord.z = n.z;
            const b = boyut.getBlock(_koord);
            if (!b) continue;                   // yuklenmemis chunk
            if (b.isAir) continue;
            /* KORUNAN bloklar delinmiyor: bedrock, sandik,
               komut blogu... Yoksa dunyani ve esyalarini
               kaybedersin.                                     */
            if (KORUNAN_KUME.has(b.typeId)) continue;
            b.setType("minecraft:air");
            delinen++;
          } catch (e) {
            hataYaz("goz_lazeri.duvarDel", e);
          }
        }

        return system.currentTick >= bitisTick;
      },

      bitir() {
        if (delinen > 0) {
          try {
            actionbarYaz(oyuncu, "§c⚡ " + kademe.ad + " lazeri §7· " +
                         vuran + " hedef · §8" + delinen + " blok delindi");
          } catch (e) {
            hataYaz("goz_lazeri.bitirActionbar", e);
          }
        }
        // Goz normale donsun -- kademe hala devam ediyor
        lazerGozuKapat(oyuncu, kademe);
        kollariIndir(oyuncu);
      }
    };
  }
});
