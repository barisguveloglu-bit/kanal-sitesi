/* JAVA MODEL -> BEDROCK GEOMETRI CEVRIMI                  v7.94.3

   `jar_model_coz.py` bir Java 1.12 ModelBase sinifinin bytecode'unu
   okuyup Bedrock `.geo.json` uretiyor. Arasindaki cevrim tek bir
   formule dayaniyor ve o formul YANLIS OLSA SESSIZCE yanlis olurdu:
   uretilen dosya gecerli JSON olur, oyun onu kabul eder, model sadece
   YANLIS YERDE durur. Boyle bir hata ancak oyunda gozle gorulur.

   ---- CAPA NEREDEN ----
   Formul tahmin edilmedi. `kol_uret.py`deki zirh geometrileri vanilla
   biped olculerinden ALINMISTI ve Bedrock karsiliklari orada yazili.
   Cevrim o uc kemigi birebir yeniden uretebiliyorsa dogrudur:

     head      java pivot(0,0,0)     addBox(-4,-8,-4, 8,8,8)
               -> pivot [0,24,0]     origin [-4,24,-4]
     body      java pivot(0,0,0)     addBox(-4,0,-2, 8,12,4)
               -> pivot [0,24,0]     origin [-4,12,-2]
     rightLeg  java pivot(-1.9,12,0) addBox(-2,0,-2, 4,12,4)
               -> pivot [-1.9,12,0]  origin [-3.9,0,-2]

   ---- NEDEN JAR YOK ----
   Sinama `--kendini-sina` kipini cagiriyor; cevrim fonksiyonlarini
   dogrudan calistiriyor ve hicbir mod dosyasina ihtiyac duymuyor.
   NarutoMod JAR'i 29 MB, depoya ALINMADI (bkz. REFERANS_NARUTO.md);
   takim onsuz da kosmali.

   Mutasyonla denendi: `cevir_origin`den `h` terimi silinince ucu de
   dusuyor.                                                        */
import { execFileSync } from "node:child_process";

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

let cikti = "";
try {
  cikti = execFileSync("python3", ["../jar_model_coz.py", "--kendini-sina"], {
    encoding: "utf8", cwd: import.meta.dirname, maxBuffer: 8 * 1024 * 1024
  });
} catch (e) {
  cikti = (e.stdout || "") + (e.stderr || "");
}

const satirlar = cikti.split("\n");
const hataSayisi = (() => {
  const s = satirlar.find((x) => x.startsWith("HATA :"));
  return s ? parseInt(s.split(":")[1].trim(), 10) : -1;
})();

console.log("=== JAVA -> BEDROCK CEVRIM CAPALARI ===");
kontrol("cevrim sinamasi calisti", hataSayisi >= 0, hataSayisi >= 0 ? "" : cikti.slice(0, 300));

/* Capa SAYISI da olculuyor: liste bosaltilirsa "HATA : 0" yine
   cikardi ve sinama hicbir sey olcmeden yesil yanardi. */
const capa = satirlar.filter((x) => x.includes("pivot [")).length;
kontrol("uc capa da olculdu", capa === 3, String(capa));

for (const s of satirlar.filter((x) => x.includes("✗") || x.includes("BEKLENEN")))
  console.log("      " + s.trim());

kontrol("cevrim capalari tutuyor", hataSayisi === 0, "HATA " + hataSayisi);

console.log("");
console.log(hata ? "SORUN VAR" : "temiz");
process.exit(hata ? 1 : 0);
