/* WEAPONS OF MIRACLES: SILAHLAR VAR, EPIC FIGHT ANIMASYONU YOK   v7.98.3

   Ikinci kez kaldirildi: oyunda bacak ve govde ayriliyordu (Epic
   Fight'in esnek agi, Bedrock'un kati kutulari). Gerekce
   REFERANS_WOM.md. v7.98.3'te kullanici SILAHLARI (esya + ikon +
   ad) geri istedi; cevrilmis Epic Fight animasyonlari geri
   gelmemeli -- yerine kendi vuruslarimiz yazilacak.          */
import { readFileSync, readdirSync, existsSync } from "node:fs";
const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const esya = readdirSync(KOK + "/Simsek_TNT_ToprakTopu/items").filter((f) => f.startsWith("wom_"));
kontrol("27 WoM silahi esya olarak var", esya.length === 27, esya.length + " dosya");
const ikon = readdirSync(KOK + "/Simsek_Kol_Kaynak/textures/item").filter((f) => f.startsWith("wom_"));
kontrol("  27'sinin ikonu var", ikon.length === 27, ikon.length + " dosya");
const dil = readFileSync(KOK + "/Simsek_Kol_Kaynak/texts/tr_TR.lang", "utf8");
kontrol("  27'sinin adi var", esya.every((f) => dil.includes("item.pa:" + f.replace(".json", "") + ".name=")));
kontrol("animasyon dosyasi yok", !existsSync(KOK + "/Simsek_Kol_Kaynak/animations/wom_dovus.animation.json"));
kontrol("wom_dovus.js yok", !existsSync(KOK + "/Simsek_TNT_ToprakTopu/scripts/yetenekler/wom_dovus.js"));
const uretec = readFileSync(KOK + "/kol_uret.py", "utf8");
kontrol("uretec cevrilmis animasyonu kopyalamiyor", !/WOM_ANIM_KAYNAK/.test(uretec));
kontrol("cevirici araclar yok", !existsSync(KOK + "/arac/ef_anim_cevir.py") &&
        !existsSync(KOK + "/kaynak_anim/wom"));
console.log(hata ? ">>> SORUN VAR" : ">>> WoM silahlari var, Epic Fight animasyonu yok");
process.exit(hata ? 1 : 0);
