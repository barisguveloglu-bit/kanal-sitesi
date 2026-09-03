/* GOZ ANIMASYONU -- MEKANIZMA DENEMESI               v7.16
   SONUC (v7.17): DENEME BASARISIZ, ANAHTAR KAPATILDI.

   Kullanici v7.16.0'i oyunda denedi: "goz titremiyor". Yani
   render denetleyici + doku dizisi + query.life_time yolu da
   attachable uzerinde CALISMIYOR -- v5.3'teki "attachable
   animasyonlari calismiyor" olcumunun yanina yazilan IKINCI
   olculmus gercek.

   Bu dosya SILINMEDI, cunku iki isi var:
     1. Deneme kapaliyken ARTIGI kalmadigini kanitliyor
        (asagidaki "DENEME KAPALI" bolumu).
     2. Birisi ayni fikri tekrar denerse -- GOZ_ANIM_DENEME'ye
        bir goz adi yazmak yeter -- eski kanitlarin hepsi
        oldugu yerde duruyor ve yeniden calisiyor.

   Hareket artik dokudan degil PARCACIKTAN geliyor: v7.17 goz
   alevi (bkz. aura.mjs "GOZ ALEVI"). Parcaciklarin calistigini
   kullanici oyunda gordu.


   ---- NEDEN DENEME, NEDEN TAM SURUM DEGIL ----
   Bu depoda v5.3'te OLCULMUS bir gercek var: ATTACHABLE
   ANIMASYONLARI CALISMIYOR. Dort surum boyunca calismayan bir
   animasyon tasinmis, kimse fark etmemis. O yuzden 128 doku
   uretip sonra "calismiyormus" demek yerine once mekanizma
   kanitlaniyor.

   Denenen sey FARKLI bir mekanizma: animasyon degil, RENDER
   DENETLEYICI + doku dizisi + molang indisi.

   ---- BU DOSYA UC GUVENCEYI TUTUYOR ----
   1. KARE 0 BUGUNKU GORUNUS. Mekanizma calismazsa denetleyici
      hep kare 0'i cizer; yani basarisizlik hali gerileme degil.
   2. YALNIZ TEK GOZ. Kalan yedi iksir eski yolunda
      (controller.render.armor). Denetleyici tamamen bozuk olsa
      bile yedi iksir calisir -- kontrol grubu onlar.
   3. Kareler AYNI GOZ. Renk ve cekirdek sabit, yalniz alevler
      oynuyor; yoksa goz her karede baska bir goze donusmus
      gibi ziplar (ayni ders lazer varyantinda v4.73'te
      yazili).                                                */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const RP = KOK + "/Simsek_Kol_Kaynak";

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const oku = (y) => JSON.parse(readFileSync(y, "utf8"));

/* Ayarlar ureteceten OKUNUYOR, elle yazilmiyor. */
const URETEC = readFileSync(KOK + "/kol_uret.py", "utf8");
const say = (ad) => {
  const m = new RegExp("^" + ad + "\\s*=\\s*(\\d+)", "m").exec(URETEC);
  return m ? +m[1] : undefined;
};
const DENEME = (/^GOZ_ANIM_DENEME\s*=\s*"(\w+)"/m.exec(URETEC) || [])[1];
const KARE = say("GOZ_ANIM_KARE");
const HIZ = say("GOZ_ANIM_HIZ");
const DENETIM = (/^GOZ_ANIM_DENETIM\s*=\s*"([^"]+)"/m.exec(URETEC) || [])[1];

const TUM = ["goz_beyaz", "goz_yesil", "goz_kirmizi", "goz_ates",
             "goz_kan", "goz_mavi", "goz_yildiz", "goz_element"];

if (!DENEME) {
  /* ---- DENEME KAPALI: ARTIK KALMAMIS OLMALI ----
     Bir anahtari kapatmak yetmez; kapanmanin GERCEKTEN her
     seyi geri aldigini olcmek gerekiyor. Uc ayri artik
     birakabilirdi ve ucu de sessizce zarar verirdi:
       - gozlerde olmayan bir denetleyiciye referans kalirsa
         goz HIC CIZILMEZ (mor-siyah bile degil, yok)
       - kare dokulari diskte kalirsa ekran kartinda bosuna
         3 x 832x832 (~8 MB) yer tutar
       - denetleyici dosyasi kalirsa bot.mjs'in izin listesi
         onu gecirir ve kimse fark etmez                    */
  console.log("=== DENEME KAPALI (v7.17): MEKANIZMA CALISMIYOR ===");
  kontrol("anahtar kapali (GOZ_ANIM_DENEME = None)",
          /^GOZ_ANIM_DENEME = None\s*$/m.test(URETEC));
  /* Mekanizmanin KAYDI duruyor: bir daha denenmesin diye. */
  kontrol("mekanizma kodu SILINMEMIS (basarisizligin kaydi)",
          /def goz_anim_denetleyicisi\(\):/.test(URETEC) &&
          /Array\.kareler/.test(URETEC));

  let kotu = [], fazla = [], artikDoku = [];
  for (const g of TUM) {
    const d = oku(RP + "/attachables/" + g + ".json")["minecraft:attachable"].description;
    if (d.render_controllers[0] !== "controller.render.armor") kotu.push(g);
    if (Object.keys(d.textures).length !== 2) fazla.push(g);
    for (let n = 1; n < 8; n++) {
      if (existsSync(RP + "/textures/entity/" + g + "_k" + n + ".png")) {
        artikDoku.push(g + "_k" + n);
      }
    }
  }
  kontrol("sekiz gozun sekizi de vanilla denetleyicide",
          kotu.length === 0, kotu.join(", ") || TUM.length + " goz");
  kontrol("hicbir gozde fazladan doku bildirimi yok",
          fazla.length === 0, fazla.join(", ") || "default + enchanted");
  kontrol("kare dokulari diskten SILINMIS",
          artikDoku.length === 0, artikDoku.join(", ") || "artik yok");
  kontrol("denetleyici dosyasi da silinmis",
          !existsSync(RP + "/render_controllers/goz_anim.render_controllers.json"));

  /* Yerini alan sey GERCEKTEN duruyor mu: hareket artik goz
     alevi parcaciklarindan geliyor. Bu satir olmasaydi
     "temizledik" demek "vazgectik" demek olurdu.           */
  const alev = readdirSync(RP + "/particles")
    .filter((f) => f.startsWith("aura_gozalev_"));
  kontrol("yerini goz alevi parcaciklari aldi", alev.length === 8,
          alev.length + " dosya");

  console.log("");
  console.log(hata ? ">>> SORUN VAR" : ">>> deneme kapali, artigi kalmamis");
  process.exit(hata ? 1 : 0);
}

console.log("=== 1. DENEME TEK GOZDE, KALANLAR KONTROL GRUBU ===");
{
  kontrol("denenen goz gercek bir goz", TUM.includes(DENEME), DENEME);
  /* Tek satirla kapanabilmeli. */
  kontrol("tek anahtarla kapanabiliyor (GOZ_ANIM_DENEME = None)",
          /GOZ_ANIM_DENEME\s*=/.test(URETEC));

  let denenen = 0, kontrolGrubu = [];
  for (const g of TUM) {
    const d = oku(RP + "/attachables/" + g + ".json")["minecraft:attachable"].description;
    const rc = d.render_controllers[0];
    if (g === DENEME) {
      denenen++;
      kontrol(g + ": animasyon denetleyicisi", rc === DENETIM, rc);
    } else {
      if (rc === "controller.render.armor") kontrolGrubu.push(g);
      else kontrol(g + ": DOKUNULMAMIS olmali", false, rc);
    }
  }
  kontrol("yalniz BIR goz deneniyor", denenen === 1, denenen + " goz");
  /* Asil guvence bu: denetleyici bozuk olsa bile yedi iksir
     eski yolunda calismaya devam eder.                      */
  kontrol("kalan yedi goz eski yolunda", kontrolGrubu.length === TUM.length - 1,
          kontrolGrubu.length + " goz: " + kontrolGrubu.join(", "));

  /* Lazer varyanti denemeye KATILMIYOR: onun kendi parlak
     malzemesi ve kendi denetleyicisi var.                   */
  const lz = oku(RP + "/attachables/" + DENEME + "_lazer.json")
    ["minecraft:attachable"].description;
  kontrol("lazer varyanti denemeye katilmiyor",
          lz.render_controllers[0] !== DENETIM, lz.render_controllers[0]);
}

console.log("");
console.log("=== 2. KARELER DISKTE (temizlik adimi silmemis) ===");
{
  /* Bu satir bosuna degil: ilk uretimde temizlik adimi UCUNU
     DE sildi ("temizlendi: 3 artik dosya"). Kareler hicbir
     listede degil; `beklenen` kumesine elle eklenmeleri
     gerekiyor. Ayni tuzaga bu depoda ALTINCI kez dusuldu
     (SEY_DOKU, MUTANT_DOKU, SAAT_ESYA, ZIRH_DOKU, konsey
     parcalari ve simdi bu).                                 */
  kontrol("kare sayisi tanimli", KARE >= 2, String(KARE));
  for (let k = 0; k < KARE; k++) {
    const yol = RP + "/textures/entity/" + DENEME +
                (k === 0 ? "" : "_k" + k) + ".png";
    kontrol("  kare " + k + " diskte", existsSync(yol),
            yol.split("/").pop());
  }
}

console.log("");
console.log("=== 3. KARELER FARKLI AMA AYNI GOZ ===");
{
  const yollar = [];
  for (let k = 0; k < KARE; k++) {
    yollar.push(RP + "/textures/entity/" + DENEME + (k === 0 ? "" : "_k" + k) + ".png");
  }
  const olc = JSON.parse(execFileSync("python3", ["-c", `
from PIL import Image
import json, sys
O = ${/^GOZ_OLCEK\s*=\s*(\d+)/m.exec(URETEC)[1]}
SATIR = ${/^GOZ_SATIR\s*=\s*(\d+)/m.exec(URETEC)[1]}
yollar = json.loads(sys.argv[1])
d = []
for y in yollar:
    im = Image.open(y).convert("RGBA")
    d.append({
      "boy": list(im.size),
      # cekirdek: goz satirinin ortasindaki piksel
      "cekirdek": list(im.getpixel((9 * O + O // 2, SATIR * O + O // 2))),
      "dolu": sum(1 for x in range(im.width) for j in range(im.height)
                  if im.getpixel((x, j))[3]),
      "ozet": hash(im.tobytes()),
    })
print(json.dumps(d))
`, JSON.stringify(yollar)], { encoding: "utf8" }));

  kontrol("hepsi ayni cozunurlukte",
          new Set(olc.map((o) => o.boy.join("x"))).size === 1,
          olc[0].boy.join("x"));
  /* Kareler birbirinden FARKLI olmali; ayni olsalardi
     animasyon diye bir sey olmazdi.                         */
  kontrol("kareler birbirinden FARKLI",
          new Set(olc.map((o) => o.ozet)).size === KARE,
          new Set(olc.map((o) => o.ozet)).size + " ayri kare");
  /* ...ama AYNI GOZ: cekirdek rengi her karede ayni ve
     yerinde. Degisseydi goz her karede baska bir goze
     donusmus gibi ziplardi.                                 */
  kontrol("cekirdek rengi her karede AYNI",
          new Set(olc.map((o) => o.cekirdek.join(","))).size === 1,
          olc[0].cekirdek.join(","));
  /* Boyali piksel sayisi yakin olmali: bir kare bosalmissa
     goz o an sonuyor demektir.                              */
  const en = Math.max(...olc.map((o) => o.dolu));
  const az = Math.min(...olc.map((o) => o.dolu));
  kontrol("hicbir kare bosalmiyor", az > en * 0.6,
          az + " .. " + en + " boyali piksel");
}

console.log("");
console.log("=== 4. DENETLEYICI ===");
{
  const yol = RP + "/render_controllers/goz_anim.render_controllers.json";
  kontrol("denetleyici dosyasi var", existsSync(yol));
  const rc = oku(yol).render_controllers[DENETIM];
  kontrol("denetleyicinin adi attachable ile ayni", !!rc, DENETIM);

  const dizi = rc.arrays.textures["Array.kareler"];
  /* Dizi uzunlugu kare sayisiyla AYNI olmali. Kisa olsaydi
     son kareler hic gorunmezdi; uzun olsaydi olmayan bir
     dokuyu isterdi.                                         */
  kontrol("dizi uzunlugu kare sayisiyla ayni", dizi.length === KARE,
          dizi.length + " / " + KARE);
  kontrol("ilk eleman Texture.default (kare 0)",
          dizi[0] === "Texture.default", dizi[0]);

  const ifade = rc.textures[0];
  kontrol("indis diziden okuyor", ifade.startsWith("Array.kareler["), ifade);
  /* math.floor SART: ondalik indis kirpilirken kare
     atlanabiliyor.                                          */
  kontrol("math.floor kullaniyor", ifade.includes("math.floor"), ifade);
  /* Zamana bagli olmali; sabit bir indis animasyon degildir. */
  kontrol("zamana bagli (query.life_time)",
          ifade.includes("query.life_time"), ifade);
  kontrol("hiz makul (2-30 kare/sn)", HIZ >= 2 && HIZ <= 30, String(HIZ));
  /* Mod ALINMIYOR: belge "pozitif indisler dizi boyunca
     sariyor" diyor. Mod alinsaydi da calisirdi ama gereksiz;
     burasi o kararin kaydi.                                 */
  kontrol("mod alinmiyor (dizi kendisi sariyor)",
          !ifade.includes("math.mod"), ifade);
}

console.log("");
console.log("=== 5. ATTACHABLE DIZIYI BESLIYOR ===");
{
  const d = oku(RP + "/attachables/" + DENEME + ".json")
    ["minecraft:attachable"].description;
  const rc = oku(RP + "/render_controllers/goz_anim.render_controllers.json")
    .render_controllers[DENETIM];
  const dizi = rc.arrays.textures["Array.kareler"];

  /* Denetleyicideki her "Texture.X" attachable'da TANIMLI
     olmali; olmazsa o kare cizilmez ve goz o an KAYBOLUR. */
  let eksik = [];
  for (const t of dizi) {
    const anahtar = t.replace("Texture.", "");
    if (!d.textures[anahtar]) eksik.push(t);
    else if (!existsSync(RP + "/" + d.textures[anahtar] + ".png")) {
      eksik.push(t + " (dosya yok)");
    }
  }
  kontrol("dizideki her doku attachable'da tanimli VE diskte",
          eksik.length === 0, eksik.join(", ") || dizi.length + " doku");

  /* Kontrol grubunda fazladan doku OLMAMALI -- yoksa deneme
     sessizce hepsine yayilmis demektir.                     */
  const temiz = TUM.filter((g) => g !== DENEME).every((g) => {
    const t = oku(RP + "/attachables/" + g + ".json")
      ["minecraft:attachable"].description.textures;
    return Object.keys(t).length === 2;         // default + enchanted
  });
  kontrol("kontrol grubunda fazladan doku yok", temiz);
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> goz animasyonu denemesi kurulu");
process.exit(hata ? 1 : 0);
