import { system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import { kademeAl, lazerGozuAc, lazerGozuKapat } from "./iksirler.js";
import {
  hataYaz, gecerliMi, kollariIndir, actionbarYaz, parcacikAt
} from "../yardimcilar.js";
import {
  LAZER_KALINLIK, LAZER_SURE, LAZER_ADIM, LAZER_TAVAN, LAZER_OYUNCU,
  PARCACIK_LAZER
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
        maxDistance: ayar.menzil,
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
        if (ileri < 0 || ileri > ayar.menzil) continue;

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
        vuran++;
      } catch (e) {
        hataYaz("goz_lazeri.applyDamage", e);
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

    return {
      ad: "goz_lazeri",
      oyuncuId: oyuncu.id,

      calis() {
        /* Isin parcaciklari bir kez ciziliyor; her tick cizmek
           tablette bosuna yuk. Isin zaten anlik bir sey.        */
        if (!cizildi) {
          cizildi = true;
          for (let d = 1; d <= ayar.menzil; d += LAZER_ADIM) {
            parcacikAt(boyut, PARCACIK_LAZER, {
              x: bas.x + yon.x * d,
              y: bas.y + yon.y * d,
              z: bas.z + yon.z * d
            });
          }
        }
        return system.currentTick >= bitisTick;
      },

      bitir() {
        // Goz normale donsun -- kademe hala devam ediyor
        lazerGozuKapat(oyuncu, kademe);
        kollariIndir(oyuncu);
      }
    };
  }
});
