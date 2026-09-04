/* v4.67 -- SAHIPLENDIRME (botun TAKIP etmesinin sarti)

   Kullanici: "ilkel besli hareket etmiyor, yanindan mob
   gecirtirsem anca vurabiliyorlar, beni takip etmiyorlar
   sadece yanima isinlaniyorlar."

   ---- IKI HATA VARDI ----
   1. tame() BIR BOOLEAN donduruyor ve okunmuyordu:
        t.tame(oyuncu);
        return true;          // basarisiz olsa da "oldu"
      (@minecraft/server 2.0.0 index.d.ts: tame(player): boolean
       "Returns true if the entity was tamed." -- paket cekilip
       okundu, tahmin degil.)

      Sonucu okumayinca kayit.evcil hep true oluyor, kurtarma
      esigi "vanilla takip calisiyor" varsayimiyla 24 bloga
      cikiyordu. Bot yerinde duruyor, 24 blokta isinlaniyordu.

   2. minecraft:is_tamed HIC eklenmiyordu: varlik JSON'undaki
      pa:evcillestir olayini script hicbir yerde tetiklemiyordu.

   Ikisi de tek basina follow_owner'i olduruyor.              */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, varlikKaydet, _durum } from "@minecraft/server";
import { readFileSync } from "node:fs";
const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

varlikKaydet("pa:bot", "pa:okazor", "pa:miskel", "pa:harkos",
             "pa:raxxan", "pa:kajaros");

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };

sus();
await import("./pack/main.js");
ac();
const ayar = await import("./pack/ayarlar.js");
const defter = await import("./pack/yetenekler/_bot_defteri.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

const HAM = readFileSync("./pack/yetenekler/_bot_defteri.js", "utf8");

/* Yorumlar ayiklaniyor: bu dosyanin aciklama blogunda eski
   HATALI kod ornek olarak duruyor ve "eski hata geri geldi mi"
   sinamasi onu yakaliyordu. Sinanan sey CALISAN kod olmali.  */
const KAYNAK = HAM.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

console.log("=== 1. tame()'IN DONEN DEGERI OKUNUYOR ===");
kontrol("tame()'in sonucu bir degiskene aliniyor",
        /const sonuc = t\.tame\(oyuncu\)/.test(KAYNAK));
kontrol("false donerse basarisiz sayiliyor",
        /if \(sonuc === false\) return false/.test(KAYNAK));
kontrol("kosulsuz 'return true' KALMADI",
        !/t\.tame\(oyuncu\);\s*\n\s*return true;/.test(KAYNAK),
        "eski hata geri gelmis");

console.log("\n=== 2. is_tamed OLAYI TETIKLENIYOR ===");
kontrol("pa:evcillestir olayi tetikleniyor",
        /triggerEvent\(BOT_OLAY_EVCIL\)/.test(KAYNAK));
kontrol("olay adi ayarlarda tanimli",
        ayar.BOT_OLAY_EVCIL === "pa:evcillestir", ayar.BOT_OLAY_EVCIL);
{
  /* Olay varlik JSON'unda GERCEKTEN olmali, yoksa tetikleme
     bos gecer. Bes uye + normal bot.                          */
  const BP = KOK + "/Simsek_TNT_ToprakTopu";
  for (const d of ["bot", "ilkel_okazor", "ilkel_miskel", "ilkel_harkos",
                   "ilkel_raxxan", "ilkel_kajaros"]) {
    const v = JSON.parse(readFileSync(BP + "/entities/" + d + ".json", "utf8"))["minecraft:entity"];
    const olay = (v.events || {})[ayar.BOT_OLAY_EVCIL];
    kontrol(d + ": pa:evcillestir olayi var", olay !== undefined);
    const grup = olay && olay.add && olay.add.component_groups[0];
    kontrol(d + ": olay is_tamed grubunu ekliyor",
            grup && v.component_groups[grup]["minecraft:is_tamed"] !== undefined,
            String(grup));
    kontrol(d + ": follow_owner hedefi var",
            v.components["minecraft:behavior.follow_owner"] !== undefined);
  }
}

console.log("\n=== 3. BASARISIZLIK TEKRAR DENENIYOR ===");
kontrol("deneme sayaci ayarlarda",
        typeof ayar.BOT_EVCIL_DENEME === "number" && ayar.BOT_EVCIL_DENEME > 1,
        String(ayar.BOT_EVCIL_DENEME));
kontrol("false da tekrar deneniyor (sadece undefined degil)",
        /kayit\.evcil === undefined \|\| kayit\.evcil === false/.test(KAYNAK),
        "eskiden yalniz undefined denenirdi ve o dal hic calismazdi");
kontrol("tutunca durum yeniden uygulaniyor (follow_owner uyansin)",
        /kayit\.evcil === true && onceki !== true[\s\S]{0,80}durumUygula/.test(KAYNAK));

console.log("\n=== 4. SONUC DOGRULANIYOR ===");
kontrol("isTamed ile teyit ediliyor", /t\.isTamed/.test(KAYNAK));
kontrol("tamedToPlayerId ile teyit ediliyor", /tamedToPlayerId/.test(KAYNAK));

console.log("\n=== 5. KURTARMA ESIGI SONUCA BAGLI ===");
kontrol("evcilse genis, degilse dar esik",
        /kayit\.evcil \? BOT_KURTARMA_MENZIL : BOT_SCRIPT_MENZIL/.test(KAYNAK));
kontrol("script esigi vanilla esiginden DAR",
        ayar.BOT_SCRIPT_MENZIL < ayar.BOT_KURTARMA_MENZIL,
        ayar.BOT_SCRIPT_MENZIL + " < " + ayar.BOT_KURTARMA_MENZIL);

console.log("\n=== 6. NORMAL BOTUN YENI GUCU ===");
{
  const BP = KOK + "/Simsek_TNT_ToprakTopu";
  const v = JSON.parse(readFileSync(BP + "/entities/bot.json", "utf8"))["minecraft:entity"];
  const can = v.components["minecraft:health"].value;
  const hasar = v.component_groups["pa:savas"]["minecraft:attack"].damage;
  kontrol("normal bot cani 40 kalp (80 puan)", can === 80, can + " puan");
  kontrol("normal bot vurusu 25 kalp (50 puan)", hasar === 50, hasar + " puan");
  kontrol("normal bot iskeleti TEK vuruslta oldurur",
          Math.ceil(20 / hasar) === 1, Math.ceil(20 / hasar) + " vurus");
  /* Ilkel Besli hala USTUN olmali -- normal bot onlari gecmesin */
  const ok = ayar.ILKEL_BESLI.get("okazor");
  kontrol("Okazor normal bottan hala guclu", ok.hasar > hasar,
          ok.hasar + " > " + hasar);
  kontrol("Ilkel Besli normal bottan hala dayanikli", ok.can > can,
          ok.can + " > " + can);
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> sahiplendirme calisiyor");
process.exit(hata ? 1 : 0);
