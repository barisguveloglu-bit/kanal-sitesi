/* WEAPONS OF MIRACLES YOK                                 v7.98.2

   Ikinci kez kaldirildi: oyunda bacak ve govde ayriliyordu (Epic
   Fight'in esnek agi, Bedrock'un kati kutulari). Gerekce
   REFERANS_WOM.md. Bu dosya geri sizmasin diye var -- uretec
   tablosu bir yedekten geri gelirse esyalar sessizce doner.  */
import { readFileSync, readdirSync, existsSync } from "node:fs";
const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const esya = readdirSync(KOK + "/Simsek_TNT_ToprakTopu/items").filter((f) => f.startsWith("wom_"));
kontrol("pa:wom_ esyasi yok", esya.length === 0, esya.length + " dosya");
const ikon = readdirSync(KOK + "/Simsek_Kol_Kaynak/textures/item").filter((f) => f.startsWith("wom_"));
kontrol("wom_ ikonu yok", ikon.length === 0, ikon.length + " dosya");
kontrol("animasyon dosyasi yok", !existsSync(KOK + "/Simsek_Kol_Kaynak/animations/wom_dovus.animation.json"));
kontrol("wom_dovus.js yok", !existsSync(KOK + "/Simsek_TNT_ToprakTopu/scripts/yetenekler/wom_dovus.js"));
const ayar = readFileSync(KOK + "/Simsek_TNT_ToprakTopu/scripts/ayarlar.js", "utf8");
kontrol("WOM_ ayari disa verilmiyor", !/export const WOM_/.test(ayar));
const uretec = readFileSync(KOK + "/kol_uret.py", "utf8");
kontrol("uretecte WOM tablosu yok", !/^WOM\s*=/m.test(uretec) && !/def wom_esyasi/.test(uretec));
const main = readFileSync(KOK + "/Simsek_TNT_ToprakTopu/scripts/main.js", "utf8");
kontrol("main.js WoM'a baglanmiyor", !/wom/i.test(main.replace(/\/\*[\s\S]*?\*\//g, "")));
console.log(hata ? ">>> SORUN VAR" : ">>> WoM depoda yok");
process.exit(hata ? 1 : 0);
