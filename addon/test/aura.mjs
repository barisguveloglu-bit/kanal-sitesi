/* IKSIR GORSELI -- PARCACIK YOK, YALNIZ GOZ KAPLAMASI  v7.21

   ---- BU DOSYA NEYI TUTUYOR ----
   v7.15 ile v7.20 arasinda iksirlerin bir parcacik sistemi
   vardi: once kafanin etrafinda bir aura (kor / hale /
   patlama / gozkor), sonra gozun onunde bir alev. Bu dosya o
   sistemi olcuyordu; 700 satirdi.

   Kullanicinin karari: "en iyisi biz bu sorunu duzeltmek icin
   tum seyleri silelim, yeni goz ayni sekilde kalsin,
   kipirdamasin, alev falan oyle yerinde dursun... yeni gozler
   kalsin o sekilde ama hicbir animasyon eklemeyelim."

   Dosya SILINMEDI, cunku artik baska bir isi var: KALDIRMANIN
   KALICI OLDUGUNU kanitliyor. Bir sistemi kaldirmak, kodu
   silmekle bitmiyor -- geride dort ayri artik kalabilir ve
   dordu de sessizce zarar verir:

     1. Parcacik dosyalari diskte kalirsa pakete girerler.
     2. Doku diskte kalirsa ekran kartinda yer tutar.
     3. Betikte cagri kalirsa oyun her tick tanimsiz bir
        parcacik istemeye calisir.
     4. Ayarlar kalirsa oksuz olurlar; bir gun birinin
        "bu ne ise yariyor" diye saatini alirlar.

   ---- VE ASIL SEY DURUYOR MU ----
   Kaldirmak yetmez, ISTENEN seyin yerinde oldugunu da olcmek
   gerekiyor: sekiz gozun sekizi de, lazer varyantlariyla
   birlikte, dokularıyla diskte. Yoksa "temizledik" demek
   "iksirin gorseli hic kalmadi" demek olurdu.               */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const RP = KOK + "/Simsek_Kol_Kaynak";
const BP = KOK + "/Simsek_TNT_ToprakTopu";

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const oku = (y) => JSON.parse(readFileSync(y, "utf8"));

const URETEC = readFileSync(KOK + "/kol_uret.py", "utf8");
const ayar = await import("./pack/ayarlar.js");
/* Metinde arama yapilirken once YORUMLAR ayiklaniyor: bu
   depoda dort kez yorum icindeki bir satir gercek kod
   sanildi.                                                */
const kod = readFileSync(BP + "/scripts/yetenekler/iksirler.js", "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

console.log("=== 1. HICBIR PARCACIK TURU URETILMIYOR ===");
{
  const m = /AURA_URETILEN = \(([^)]*)\)/.exec(URETEC);
  kontrol("AURA_URETILEN sabiti duruyor (geri getirme kapisi)", !!m);
  const turler = m ? [...m[1].matchAll(/"(\w+)"/g)].map((x) => x[1]) : ["?"];
  kontrol("liste BOS", turler.length === 0, turler.join(", ") || "bos");
  /* Kod silinmedi: bir gun geri istenirse mekanizma dursun.
     Bu satir "kaldirmak = silmek degil" kararinin kaydi.   */
  kontrol("parcacik kodu SILINMEDI (geri getirilebilir)",
          /def aura_gozalev\(/.test(URETEC) && /def _alev_dili\(/.test(URETEC));
}

console.log("");
console.log("=== 2. DISKTE ARTIK KALMAMIS ===");
{
  const klasor = RP + "/particles";
  const artik = existsSync(klasor)
    ? readdirSync(klasor).filter((f) => f.startsWith("aura_")) : [];
  kontrol("parcacik dosyasi kalmamis", artik.length === 0,
          artik.join(", ") || "hic yok");
  /* Doku 256x128'e kadar cikmisti; kalirsa ekran kartinda
     bosuna yer tutar.                                      */
  const doku = RP + "/textures/particle/iksir_aura.png";
  kontrol("parcacik dokusu silinmis", !existsSync(doku),
          existsSync(doku) ? "HALA DURUYOR" : "yok");
}

console.log("");
console.log("=== 3. BETIKTE CAGRI VE OKSUZ AYAR KALMAMIS ===");
{
  for (const ad of ["auraAt", "auraPatlat", "gozAleviAt", "gozKoruAt",
                    "hizHaritasi", "ilerideDogsun"]) {
    kontrol("  " + ad + " cagrisi yok", !new RegExp(ad + "\\s*\\(").test(kod));
  }
  /* parcacikAt bu dosyada artik kullanilmiyor; import'ta
     kalirsa okuyan "burada parcacik var" sanir.            */
  kontrol("parcacikAt import edilmiyor", !/parcacikAt/.test(kod));

  const oksuz = Object.keys(ayar)
    .filter((a) => /^AURA_(?!HIZ_MIRASI$)/.test(a) || a.startsWith("GOZ_ALEV"))
    .filter((a) => !a.startsWith("ILKEL_"));
  kontrol("oksuz AURA / GOZ_ALEV ayari kalmamis", oksuz.length === 0,
          oksuz.join(", ") || "hic yok");
}

console.log("");
console.log("=== 4. ASIL SEY DURUYOR: GOZ KAPLAMALARI ===");
{
  /* Kaldirmanin asiri gitmedigini olcuyor. Bu bolum olmasaydi
     "hepsini sildim" ile "iksirin gorseli hic kalmadi"
     birbirinden ayirt edilemezdi.                          */
  const blok = /IKSIRLER = \[([\s\S]*?)\n\]/.exec(URETEC)[1];
  const gozler = [...blok.matchAll(/^\s*\("(\w+)",[^\n]*?"(goz_\w+)"/gm)]
    .map((m) => m[2]);
  kontrol("sekiz iksirin sekizi de bir goze bagli", gozler.length === 8,
          gozler.length + " goz");

  let eksik = [];
  for (const g of gozler) {
    for (const ad of [g, g + "_lazer"]) {
      if (!existsSync(RP + "/attachables/" + ad + ".json")) eksik.push(ad);
      if (!existsSync(RP + "/textures/entity/" + ad.replace("_lazer", "") + ".png")) {
        eksik.push(ad + " (doku)");
      }
    }
  }
  kontrol("her gozun kaplamasi ve dokusu diskte",
          eksik.length === 0, eksik.join(", ") || gozler.length * 2 + " kaplama");

  /* Cozunurluk v7.14'te olculerek 832'ye cikarildi; sessizce
     dusmedigini burada tutuyoruz.                          */
  const O = +/^GOZ_OLCEK\s*=\s*(\d+)/m.exec(URETEC)[1];
  const bek = 64 * O;
  const olc = JSON.parse(execFileSync("python3", ["-c", `
from PIL import Image
import json
print(json.dumps(list(Image.open(${JSON.stringify(RP + "/textures/entity/goz_ates.png")}).size)))
`], { encoding: "utf8" }));
  kontrol("goz dokusu " + bek + "x" + bek,
          olc[0] === bek && olc[1] === bek, olc.join("x"));

  /* Gozler SABIT olmali -- kullanicinin istegi buydu.
     Animasyon denemesi v7.16'da olculerek elendi ve v7.17'de
     kapatildi; anahtarin kapali kaldigini goz_anim.mjs
     tutuyor, burasi da vanilla denetleyicide olduklarini. */
  let kimildayan = [];
  for (const g of gozler) {
    const rc = oku(RP + "/attachables/" + g + ".json")
      ["minecraft:attachable"].description.render_controllers[0];
    if (rc !== "controller.render.armor") kimildayan.push(g + " -> " + rc);
  }
  kontrol("gozler SABIT (vanilla denetleyici)", kimildayan.length === 0,
          kimildayan.join(", ") || "sekizi de sabit");
}

console.log("");
console.log("=== 5. PAKETE GIRDI ===");
{
  const man = oku(RP + "/manifest.json");
  const paket = KOK + "/Simsek_v" + man.header.version.join(".") + "_Gorunum.mcpack";
  kontrol("gorunum paketi uretilmis", existsSync(paket), paket.split("/").pop());
  if (existsSync(paket)) {
    const liste = execFileSync("unzip", ["-Z1", paket], { encoding: "utf8" });
    /* v4.75 dersi: pakette kalan/eksik bir dosya "bazen
       calisiyor bazen calismiyor" gibi gorunuyor.          */
    const kalan = liste.split("\n").filter((r) => r.includes("aura"));
    kontrol("pakette aura artigi yok", kalan.length === 0,
            kalan.join(", ") || "temiz");
    kontrol("goz dokusu pakette",
            liste.includes("textures/entity/goz_ates.png"));
  }
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> parcacik yok, gozler yerinde");
process.exit(hata ? 1 : 0);
