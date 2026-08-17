import { system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import {
  hataYaz, gecerliMi, kollariIndir, parcacikAt
} from "../yardimcilar.js";
import {
  KASIRGA_YARICAP, KASIRGA_SURE, KASIRGA_TAVAN, KASIRGA_DONME,
  KASIRGA_MERKEZ, KASIRGA_KALDIR, KASIRGA_TAVAN_Y, KASIRGA_ARALIK,
  KASIRGA_OYUNCU
} from "../ayarlar.js";

/* KASIRGA -- etrafindaki her seyi kaldirip cevrende dondurur.

   Referans mod (Dave1545) tek satirdi:
     execute as @e[type=!player] at @s run tp ^5^1^1 facing @p
   Calismiyordu ("^5^1^1" bosluksuz) ama calissaydi bile isinlama
   kullandigi icin varliklari duvarin icine sokardi, ustelik
   yaricap sinirlamasi olmadigindan YUKLU HER varligi cekerdi.

   Buradaki fark:
     1. isinlama yok -- applyImpulse, yani fizik motoru isliyor;
        varlik duvara carpar, icine girmez
     2. yaricap ve tavan var, tick yuku sinirli
     3. gercek bir kasirga gibi: teget hiz (dondurme) + merkeze
        cekim + yukari kaldirma bir arada
     4. tavan yuksekligi var; sonsuza kadar yukari gitmiyorlar,
        belli yukseklikte donmeye devam ediyorlar
     5. sure bitince birakiliyorlar -- dusus hasari oyunun isi   */
yetenekKaydet({
  kimlik: "kasirga",
  ad: "Kasirga",
  esyasiz: true,
  sira: 130,

  olustur(oyuncu) {
    const boyut = oyuncu.dimension;
    const oyuncuId = oyuncu.id;

    const bitisTick = system.currentTick + KASIRGA_SURE;
    let sonrakiTick = system.currentTick;
    let savrulan = 0;

    // Her tick yeni nesne uretmeyelim
    const itme = { x: 0, y: 0, z: 0 };

    return {
      ad: "kasirga",
      oyuncuId: oyuncuId,

      calis() {
        if (system.currentTick >= bitisTick) return true;
        if (!gecerliMi(oyuncu)) return true;
        if (system.currentTick < sonrakiTick) return false;
        sonrakiTick = system.currentTick + KASIRGA_ARALIK;

        let merkez;
        try {
          merkez = oyuncu.location;
        } catch (e) {
          hataYaz("kasirga.location", e);
          return true;
        }

        let yakin;
        try {
          yakin = boyut.getEntities({
            location: merkez,
            maxDistance: KASIRGA_YARICAP,
            excludeTypes: ["minecraft:item", "minecraft:xp_orb"]
          });
        } catch (e) {
          hataYaz("kasirga.getEntities", e);
          return true;
        }

        let islenen = 0;
        for (const varlik of yakin) {
          if (islenen >= KASIRGA_TAVAN) break;
          try {
            if (varlik.id === oyuncuId) continue;      // kasirganin gozu
            if (!gecerliMi(varlik)) continue;
            if (varlik.typeId === "minecraft:player" && !KASIRGA_OYUNCU) continue;

            const k = varlik.location;
            const dx = k.x - merkez.x;
            const dz = k.z - merkez.z;
            const yatay = Math.sqrt(dx * dx + dz * dz);

            /* Tam merkezde duran varligin teget yonu tanimsiz
               (0'a bolme). Rastgele bir yone itip donguye sok. */
            let bx, bz;
            if (yatay < 0.001) {
              const aci = Math.random() * Math.PI * 2;
              bx = Math.cos(aci); bz = Math.sin(aci);
            } else {
              bx = dx / yatay; bz = dz / yatay;
            }

            /* Teget = yaricapin 90 derece dondurulmusu. Merkeze
               cekim olmadan teget tek basina varligi disari
               savurur; ikisi birlikte YORUNGE olusturuyor.     */
            itme.x = (-bz * KASIRGA_DONME) - (bx * KASIRGA_MERKEZ);
            itme.z = ( bx * KASIRGA_DONME) - (bz * KASIRGA_MERKEZ);

            // Tavana varinca kaldirmayi kes, sadece dondur
            const yukseklikFarki = k.y - merkez.y;
            itme.y = (yukseklikFarki < KASIRGA_TAVAN_Y) ? KASIRGA_KALDIR : 0;

            varlik.applyImpulse(itme);
            islenen++;
            savrulan++;
          } catch (e) {
            // Tek varligin hatasi kasirgayi bitirmesin
            hataYaz("kasirga.varlik", e);
          }
        }

        parcacikAt(boyut, "minecraft:large_explosion", merkez);
        return false;
      },

      bitir() {
        try {
          oyuncu.sendMessage(
            savrulan > 0
              ? "§7Kasirga dindi §8· " + savrulan + " savurma"
              : "§7Kasirga dindi §8· menzilde kimse yoktu"
          );
        } catch (e) {
          hataYaz("kasirga.sendMessage", e);
        }
        kollariIndir(oyuncu);
      }
    };
  }
});
