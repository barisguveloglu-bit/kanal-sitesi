import { system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import {
  hataYaz, gecerliMi, eldekiEsya, varlikKonumu, actionbarYaz
} from "../yardimcilar.js";
import { varlikIste } from "../butce.js";
import {
  VIKTOR_ACIK, VIKTOR_ANAHTAR, VIKTOR_ISIN_UZAK,
  VIKTOR_PARCACIK_ISIN, VIKTOR_PARCACIK_BUYU,
  VIKTOR_KLON_KIMLIK, VIKTOR_KLON_SURE, VIKTOR_GORUNMEZ_SURE,
  VIKTOR_UCUS_SURE, VIKTOR_UCUS_KADEME,
  VIKTOR_SAVUR_MENZIL, VIKTOR_SAVUR_YAKIN, VIKTOR_SAVUR_UZAK,
  VIKTOR_CEMBER_NOKTA, VIKTOR_CEMBER_YARICAP,
  VIKTOR_KLON_SIRA, VIKTOR_ISIN_SIRA, VIKTOR_BUYU_SIRA,
  VIKTOR_UCUS_SIRA, VIKTOR_SAVUR_SIRA, VIKTOR_EL_SIRA,
  VIKTOR_CEMBER_SIRA
} from "../ayarlar.js";

/* ================================================================
   VİKTOR                                                    v7.75

   Gerekcenin tamami ayarlar.js'teki "VIKTOR" bolumunde. Ozeti:
   kullanicinin kendi komut blogu listesi yetenege cevrildi.
   Kaynaktan dort yerde ayrildik ve dordunun de sebebi yazili
   (elde ametist sarti, klonun suresi, `spreadplayers`
   sozdizimi, oyuncunun disarida birakilmasi).

   ---- ORTAK SART ----
   Hepsi ELDE AMETIST PARCASI istiyor; kaynakta da oyle.
   `anahtarVar` tek yerde duruyor ki yedi yetenekte yedi kez
   yazilmasin ve biri unutulmasin.
   ================================================================ */

function anahtarVar(oyuncu) {
  if (!VIKTOR_ACIK) return false;
  try {
    return eldekiEsya(oyuncu) === VIKTOR_ANAHTAR;
  } catch (e) {
    return false;
  }
}

function komut(oyuncu, metin) {
  try {
    if (typeof oyuncu.runCommand !== "function") return false;
    oyuncu.runCommand(metin);
    return true;
  } catch (e) {
    /* Tek komut patlarsa otekiler yine calissin -- arinma.js
       ile ayni gerekce.                                      */
    return false;
  }
}

/* Anahtar yoksa tek satirlik bildirim. Sessizce hicbir sey
   yapmamak "yetenek bozuk" gibi duruyordu.                   */
function anahtarUyar(oyuncu) {
  try {
    actionbarYaz(oyuncu, "§8Elinde §dametist parçası §8olmalı.");
  } catch (e) { /* mesaj onemli degil */ }
  return undefined;
}

/* ---- 1. KLON BIRAKMA ----
   Kaynak: summon npc + eyeofender parcacigi + ileri isinlanma
   + 3 saniye gorunmezlik.

   NPC YERINE KILIK: `minecraft:npc` tiklaninca bos bir sohbet
   penceresi aciyor; sahnede istenmeyen bir sey. Kilik varliginin
   HICBIR yapay zeka hedefi yok, yani klon kimseye saldirmaz.

   KLONUN SURESI VAR: kaynakta yok ve o NPC dunyada sonsuza
   kadar kaliyor. Depo kurali bunu yasakliyor.                */
yetenekKaydet({
  kimlik: "viktor_klon",
  ad: "Viktor · Klon Bırakma",
  esyasiz: true,
  sira: VIKTOR_KLON_SIRA,

  olustur(oyuncu) {
    if (!anahtarVar(oyuncu)) return anahtarUyar(oyuncu);
    let konum, boyut;
    try {
      konum = varlikKonumu(oyuncu) || oyuncu.location;
      boyut = oyuncu.dimension;
    } catch (e) { return undefined; }
    if (!konum || !boyut) return undefined;
    if (varlikIste(1) === 0) return undefined;

    let klon = null;
    try { klon = boyut.spawnEntity(VIKTOR_KLON_KIMLIK, konum); }
    catch (e) { hataYaz("viktor.klon.spawn", e); return undefined; }

    komut(oyuncu, "particle " + VIKTOR_PARCACIK_ISIN + " ~ ~1 ~");
    /* Kaynaktaki sira: once parcacik, sonra isinlanma. Boylece
       parcacik BIRAKILAN yerde patliyor, gidilen yerde degil. */
    komut(oyuncu, "tp @s ^ ^ ^" + VIKTOR_ISIN_UZAK);
    komut(oyuncu, "effect @s invisibility " + VIKTOR_GORUNMEZ_SURE + " 1 true");

    system.runTimeout(() => {
      try { if (klon && gecerliMi(klon)) klon.remove(); }
      catch (e) { /* zaten gitmis */ }
    }, VIKTOR_KLON_SURE);
    return undefined;
  }
});

/* ---- 2. IŞINLANMA + BÜYÜ BIRAKMA ----
   Kaynak: tp ^ ^ ^6 ve VARIŞ noktasinda parcacik. Klondan
   farki: burada parcacik gidilen yerde patliyor.             */
yetenekKaydet({
  kimlik: "viktor_isin",
  ad: "Viktor · Işınlanma",
  esyasiz: true,
  sira: VIKTOR_ISIN_SIRA,

  olustur(oyuncu) {
    if (!anahtarVar(oyuncu)) return anahtarUyar(oyuncu);
    komut(oyuncu, "particle " + VIKTOR_PARCACIK_ISIN +
                  " ^ ^1 ^" + VIKTOR_ISIN_UZAK);
    komut(oyuncu, "tp @s ^ ^ ^" + VIKTOR_ISIN_UZAK);
    return undefined;
  }
});

/* ---- 3. İKİ ELİNDE BÜYÜ ----
   Kaynak iki satir: sag el `^0.35 ^0.85 ^0.5`, sol el
   `^-0.35 ^0.85 ^0.5`. Kullanici "komut blogunu tekrarlayin,
   daha fazla olsun" diye not dusmus -- burada tekrar kod
   tarafinda: is birkac tick surup her tick ciziyor.          */
const BUYU_TICK = 30;   // 1.5 saniye

yetenekKaydet({
  kimlik: "viktor_buyu",
  ad: "Viktor · İki Elde Büyü",
  esyasiz: true,
  sira: VIKTOR_BUYU_SIRA,

  olustur(oyuncu) {
    if (!anahtarVar(oyuncu)) return anahtarUyar(oyuncu);
    let kalan = BUYU_TICK;
    return {
      ad: "viktor_buyu",
      oyuncuId: oyuncu.id,
      calis() {
        if (--kalan <= 0) return true;
        if (!gecerliMi(oyuncu)) return true;
        komut(oyuncu, "particle " + VIKTOR_PARCACIK_BUYU + " ^0.35 ^0.85 ^0.5");
        komut(oyuncu, "particle " + VIKTOR_PARCACIK_BUYU + " ^-0.35 ^0.85 ^0.5");
        return false;
      }
    };
  }
});

/* ---- 4. UÇUŞ ----
   Kaynak: levitation 1 1 true, "iki elinde buyu cikma
   komutuyla yap" notuyla. Yani ikisi birlikte calisiyor --
   burada da parcacik ucus boyunca ciziliyor.                 */
yetenekKaydet({
  kimlik: "viktor_ucus",
  ad: "Viktor · Uçuş",
  esyasiz: true,
  sira: VIKTOR_UCUS_SIRA,

  olustur(oyuncu) {
    if (!anahtarVar(oyuncu)) return anahtarUyar(oyuncu);
    komut(oyuncu, "effect @s levitation " + VIKTOR_UCUS_SURE + " " +
                  VIKTOR_UCUS_KADEME + " true");
    let kalan = VIKTOR_UCUS_SURE * 20;
    return {
      ad: "viktor_ucus",
      oyuncuId: oyuncu.id,
      calis() {
        if (--kalan <= 0) return true;
        if (!gecerliMi(oyuncu)) return true;
        komut(oyuncu, "particle " + VIKTOR_PARCACIK_BUYU + " ^0.35 ^0.85 ^0.5");
        komut(oyuncu, "particle " + VIKTOR_PARCACIK_BUYU + " ^-0.35 ^0.85 ^0.5");
        return false;
      }
    };
  }
});

/* ---- 5. SAVURMA (kaynakta "yok etme") ----
   Kaynak satiri:
     execute ... positioned ^ ^1 ^4 run spreadplayers ~ ~ 20 80
       @e[type!player, r=3,c=1]

   IKI DUZELTME:
   1. `type!player` GECERSIZ bir secici. Dogrusu `type=!player`.
      Oyun bu satiri sessizce reddediyor, yani kaynakta bu
      yetenek ZATEN CALISMIYORDU.
   2. `!player` KORUNDU ve bu bilincli: oyuncuyu haberi olmadan
      80 blok oteye firlatmak tam da v7.65-v7.69'da savunmasini
      yazdigimiz kalip. Yaratiklara serbest, oyunculara degil. */
yetenekKaydet({
  kimlik: "viktor_savur",
  ad: "Viktor · Savurma",
  esyasiz: true,
  sira: VIKTOR_SAVUR_SIRA,

  olustur(oyuncu) {
    if (!anahtarVar(oyuncu)) return anahtarUyar(oyuncu);
    const on = "^ ^1 ^" + (VIKTOR_SAVUR_MENZIL + 1);
    komut(oyuncu, "execute at @s positioned " + on +
          " run spreadplayers ~ ~ " + VIKTOR_SAVUR_YAKIN + " " +
          VIKTOR_SAVUR_UZAK + " @e[type=!player,r=" +
          VIKTOR_SAVUR_MENZIL + ",c=1]");
    komut(oyuncu, "particle " + VIKTOR_PARCACIK_ISIN + " " + on);
    komut(oyuncu, "particle " + VIKTOR_PARCACIK_BUYU + " ^ ^1.2 ^3");
    return undefined;
  }
});

/* ---- 6. TEK ELİ KALDIRMA ----
   Kaynak: playanimation animation.humanoid.holding_spyglass a 3.
   Gecis suresi 3 -- kalici DEGIL, yani poz kendiliginden
   birakiliyor. v7.65'te ogrenilen ders: kalici poz kilidi
   griefing kalibi; bu satir onun tersi ve oyle kaliyor.      */
yetenekKaydet({
  kimlik: "viktor_el",
  ad: "Viktor · Eli Kaldır",
  esyasiz: true,
  sira: VIKTOR_EL_SIRA,

  olustur(oyuncu) {
    if (!anahtarVar(oyuncu)) return anahtarUyar(oyuncu);
    komut(oyuncu, "playanimation @s animation.humanoid.holding_spyglass a 3");
    return undefined;
  }
});

/* ---- 7. ÇEMBER ----
   Kaynak skorborda aci yaziyor (`scoreboard players add @s aci 15`)
   ve her komut blogu bir nokta ciziyor. Script zaten aciyi
   biliyor, skorborda gerek yok: cember tek seferde ciziliyor. */
yetenekKaydet({
  kimlik: "viktor_cember",
  ad: "Viktor · Çember",
  esyasiz: true,
  sira: VIKTOR_CEMBER_SIRA,

  olustur(oyuncu) {
    if (!anahtarVar(oyuncu)) return anahtarUyar(oyuncu);
    for (let i = 0; i < VIKTOR_CEMBER_NOKTA; i++) {
      const t = (i / VIKTOR_CEMBER_NOKTA) * Math.PI * 2;
      const dx = (Math.cos(t) * VIKTOR_CEMBER_YARICAP).toFixed(2);
      const dz = (Math.sin(t) * VIKTOR_CEMBER_YARICAP).toFixed(2);
      /* `~` kullaniliyor, `^` DEGIL: cember oyuncunun baktigi
         yone gore degil, DUNYAYA gore dursun. Kaynakta `^`
         vardi ve oyuncu donunce cember de donuyordu.         */
      komut(oyuncu, "particle " + VIKTOR_PARCACIK_BUYU +
            " ~" + dx + " ~1 ~" + dz);
    }
    return undefined;
  }
});
