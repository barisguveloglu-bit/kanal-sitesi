import { system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import {
  hataYaz, gecerliMi, kollariIndir, koniHedefleri, actionbarYaz, parcacikAt
} from "../yardimcilar.js";
import {
  SARS_MENZIL, SARS_ACI, SARS_SIDDET, SARS_SURE, SARS_TAVAN, SARS_PARCACIK
} from "../ayarlar.js";

/* SARSINTI -- karsindakinin EKRANINI sallar.

   Fikir "En Iyi BoraLo Modu V15"teki shadowstaffozlelik'ten:
     execute @s^^^6 /camerashake add @e[r=6,c=1] 4

   Hasar vermiyor, oldurmuyor -- sadece karsidakinin ekranini
   sallayip nisan almasini zorlastiriyor. Bizde kendi ekranimizi
   sarsan yardimci vardi (ekraniSars) ama BASKASININ ekranini
   sarsan bir sey yoktu.

   REFERANSTAKI HATALAR

   1. "@s^^^6" BOSLUKSUZ -- komut hic calismiyor.

   2. "c=1" en yakini seciyor ama @e OYUNCUYU DA sayiyor, yani
      cogu zaman KENDI ekranini sarsiyorsun. Bu seride ucuncu kez
      gordugum ayni hata. Burada kendimizi hic listeye almiyoruz.

   3. camerashake yalnizca OYUNCULARDA calisiyor; "@e" moblari da
      tarayip bosa donuyor. Burasi sadece oyunculari suzuyor.

   4. "camerashake add <hedef> 4" -- SURE verilmemis. Sure
      yazilmayinca varsayilan 1 saniye; ustelik siddet 4 tavan
      deger. Burada ikisi de ayardan geliyor.

   NOT: camerashake bir KOMUT, yani hedefin uzerinde
   runCommand ile calistiriliyor. Mobda calismadigi icin
   yalnizca oyunculara uygulaniyor -- tek kisilik dunyada bu
   yetenek ise yaramaz, arkadasinla oynarken yarar.            */
yetenekKaydet({
  kimlik: "sarsinti",
  ad: "Sarsinti",
  esyasiz: true,
  sira: 220,

  olustur(oyuncu) {
    /* oyuncuDahil: true -- yetenegin TEK hedefi zaten oyuncular.
       koniHedefleri kendimizi her durumda disliyor.            */
    const hedefler = koniHedefleri(oyuncu, {
      menzil: SARS_MENZIL,
      aci: SARS_ACI,
      tavan: SARS_TAVAN,
      oyuncuDahil: true
    });

    let sarsilan = 0;
    let mobAtlandi = 0;

    for (const hedef of hedefler) {
      try {
        if (!gecerliMi(hedef)) continue;

        /* camerashake sadece oyuncuda calisiyor. Referans "@e"
           kullanip moblara da gonderiyordu; burada suzuluyor. */
        if (hedef.typeId !== "minecraft:player") { mobAtlandi++; continue; }
        if (typeof hedef.runCommand !== "function") continue;

        hedef.runCommand(
          "camerashake add @s " + SARS_SIDDET.toFixed(2) + " " +
          SARS_SURE.toFixed(2) + " positional"
        );
        parcacikAt(hedef.dimension, SARS_PARCACIK, hedef.location);
        sarsilan++;
      } catch (e) {
        hataYaz("sarsinti.hedef", e);
      }
    }

    try {
      if (sarsilan > 0) {
        actionbarYaz(oyuncu, "§8≋ §f" + sarsilan + " oyuncunun ekrani sarsildi");
      } else if (mobAtlandi > 0) {
        actionbarYaz(oyuncu, "§7Onunde sadece mob var §8(sarsinti yalnizca oyunculara isler)");
      } else {
        actionbarYaz(oyuncu, "§7Sarsacak kimse yok");
      }
    } catch (e) {
      hataYaz("sarsinti.actionbar", e);
    }

    kollariIndir(oyuncu);
    return undefined;   // anlik yetenek, tick tutmuyor
  }
});
