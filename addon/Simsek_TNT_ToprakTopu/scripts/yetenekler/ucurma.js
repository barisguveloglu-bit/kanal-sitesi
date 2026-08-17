import { yetenekKaydet } from "./kayit.js";
import { hataYaz, gecerliMi, kollariIndir, koniHedefleri } from "../yardimcilar.js";
import {
  UCURMA_MENZIL, UCURMA_ACI, UCURMA_SURE, UCURMA_SIDDET,
  UCURMA_TAVAN, UCURMA_OYUNCU
} from "../ayarlar.js";

/* UCURMA -- baktigin yondekileri havaya kaldirir.

   SAVUR ile karistirilmasin, ikisi farkli:
     savur  -> applyImpulse ile YATAY firlatir, hedef kontrolu
               kaybetmez, yere duser ve devam eder
     ucurma -> levitation ile YUKARI kaldirir, hedef caresizce
               havada asili kalir, sure bitince duser

   Referans bunu uc ayri mesafede (^^^2, ^^^5, ^^^7) tek tek
   hedefleyip yapiyordu -- yani tam o noktalarda duran birine
   isabet ediyordu, arasindakiler kurtuluyordu. Bizimki koninin
   TAMAMINI tariyor.

   Referans son satirda "effect @s clear" calistiriyordu: kendi
   levitation'indan kurtulmak icin butun efektlerini siliyordu.
   Bizde buna gerek yok -- kendimizi zaten hedef listesine
   almiyoruz.                                                     */
yetenekKaydet({
  kimlik: "ucurma",
  ad: "Ucurma",
  esyasiz: true,
  sira: 140,

  olustur(oyuncu) {
    const hedefler = koniHedefleri(oyuncu, {
      menzil: UCURMA_MENZIL,
      aci: UCURMA_ACI,
      tavan: UCURMA_TAVAN,
      oyuncuDahil: UCURMA_OYUNCU
    });

    let sayi = 0;
    for (const hedef of hedefler) {
      try {
        if (!gecerliMi(hedef)) continue;
        hedef.addEffect("levitation", UCURMA_SURE, {
          amplifier: UCURMA_SIDDET, showParticles: true
        });
        /* Yavas dusme: yukselttigimiz seyi olduren biz olmayalim.
           Levitation bitince serbest dususe gecerdi.             */
        hedef.addEffect("slow_falling", UCURMA_SURE + 100, {
          amplifier: 0, showParticles: false
        });
        sayi++;
      } catch (e) {
        hataYaz("ucurma.addEffect", e);
      }
    }

    try {
      oyuncu.sendMessage(sayi > 0
        ? "§b" + sayi + " hedef havaya kalkti."
        : "§eOnunde ucuracak bir sey yok.");
    } catch (e) {
      hataYaz("ucurma.sendMessage", e);
    }

    kollariIndir(oyuncu);
    return undefined;   // anlik yetenek
  }
});
