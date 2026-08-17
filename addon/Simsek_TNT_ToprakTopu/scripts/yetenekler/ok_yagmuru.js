import { system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import { varlikIste } from "../butce.js";
import {
  hataYaz, gecerliMi, kollariIndir, hedefBul, actionbarYaz, yukseklikAraligi
} from "../yardimcilar.js";
import {
  OK_MENZIL, OK_SAYISI, OK_YAYILMA, OK_YUKSEK, OK_GRUP, OK_ARALIK, OK_HIZ
} from "../ayarlar.js";

/* OK YAGMURU -- baktigin noktanin uzerine ok yagar.

   Fikir "En Iyi BoraLo Modu V15"teki okyamuru.mcfunction'dan:
     summon arrow ^0^7^10
     summon arrow ^1^7^10
     ... 25 satir, 5x5 izgara

   REFERANSTAKI DORT HATA

   1. "^0^7^10" BOSLUKSUZ. Bu seride gordugum en yaygin hata --
      komut hic calismiyor.

   2. Calissa bile izgara "^0"dan "^4"e gidiyor, yani hepsi TEK
      YANA. Ortalanmis degil; oklar senin saginda bir duvar
      olusturuyor, baktigin yere degil. Burasi hedefin
      ETRAFINA ortaliyor.

   3. "summon arrow" ile dogan okun HIZI YOK. Oldugu yerde belirip
      dusuyor -- ok degil, dusen bir cisim. Gercek ok yagmuru icin
      asagi dogru hiz vermek gerekiyor; burasi applyImpulse ile
      veriyor (olmazsa setLinearVelocity deniyor).

   4. 25 ok TEK TICK'te doguyor, butce yok. Burasi varlik
      butcesini kullaniyor ve partiye boluyor.

   Ayrica referansta oklar tam izgara; burada hafif rastgelelik
   var, yoksa yagmur degil cetvel gibi duruyor.                 */
yetenekKaydet({
  kimlik: "ok_yagmuru",
  ad: "Ok Yagmuru",
  esyasiz: true,
  sira: 215,

  olustur(oyuncu) {
    const boyut = oyuncu.dimension;
    const sinir = yukseklikAraligi(boyut);

    const hedef = hedefBul(oyuncu, OK_MENZIL);
    if (!hedef) {
      kollariIndir(oyuncu);
      return undefined;
    }

    /* Yerler onceden hesaplaniyor: her tick Math.random cagirip
       nesne uretmek yerine bir kez. (ors.js ve meteor.js ayni.) */
    const noktalar = [];
    for (let i = 0; i < OK_SAYISI; i++) {
      noktalar.push({
        x: hedef.x + (Math.random() * 2 - 1) * OK_YAYILMA,
        y: hedef.y + OK_YUKSEK,
        z: hedef.z + (Math.random() * 2 - 1) * OK_YAYILMA
      });
    }

    let i = 0;
    let dogan = 0;
    let sonrakiTick = system.currentTick;

    return {
      ad: "ok_yagmuru",
      oyuncuId: oyuncu.id,

      calis() {
        if (i >= noktalar.length) return true;
        if (system.currentTick < sonrakiTick) return false;

        const kalan = noktalar.length - i;
        const izin = varlikIste(OK_GRUP < kalan ? OK_GRUP : kalan);
        if (izin === 0) return false;         // butce dolu

        for (let n = 0; n < izin; n++) {
          const nokta = noktalar[i++];

          if (nokta.y < sinir.min || nokta.y > sinir.max) continue;

          try {
            const ok = boyut.spawnEntity("minecraft:arrow", nokta);

            /* Referansin en buyuk eksigi: ok dogunca DURUYORDU.
               Asagi hiz verilince gercek bir yagmur oluyor.    */
            try {
              ok.applyImpulse({ x: 0, y: -OK_HIZ, z: 0 });
            } catch (e) {
              try {
                ok.setLinearVelocity({ x: 0, y: -OK_HIZ, z: 0 });
              } catch (e2) {
                /* Ikisi de yoksa ok yine duser, sadece yavas */
              }
            }
            dogan++;
          } catch (e) {
            hataYaz("ok_yagmuru.spawnEntity", e);
          }
        }

        sonrakiTick = system.currentTick + OK_ARALIK;
        return i >= noktalar.length;
      },

      bitir() {
        try {
          if (gecerliMi(oyuncu)) {
            actionbarYaz(oyuncu, "§7🏹 " + dogan + " ok yagdi");
          }
        } catch (e) {
          hataYaz("ok_yagmuru.bitir", e);
        }
        kollariIndir(oyuncu);
      }
    };
  }
});
