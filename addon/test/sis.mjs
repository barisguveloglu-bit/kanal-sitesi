/* OZEL SIS: SKININ RENGI                                   v6.6

   Kullanici: "/fog @a push minecraft:fog_hell 12 havayi
   kirmiziya cevirmeye yariyormus; biz bunu benim skinimin
   rengine cevirelim -- mavi mi bilmiyorum ama."

   Bu dosyanin tuttugu sey: rengin TAHMIN EDILMEDIGI. Sisin
   rengi skin dosyasindan olculuyor; skin degisirse bu test
   duser ve renk yeniden olculur.                          */

import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const RP = KOK + "/Simsek_Kol_Kaynak";
const SKIN = KOK + "/Simsek_Skin/uzak_akraba.png";

const ayar = await import("./pack/ayarlar.js");
let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const oku = (y) => JSON.parse(readFileSync(y, "utf8"));

console.log("=== 1. SIS TANIMLARI PAKETTE ===");
const dosyalar = ["sis_simsek", "sis_simsek_hafif"];
const tanim = {};
for (const d of dosyalar) {
  const y = RP + "/fogs/" + d + ".json";
  kontrol(d + ".json var", existsSync(y));
  if (!existsSync(y)) continue;
  const j = oku(y);
  tanim[d] = j;
  const f = j["minecraft:fog_settings"];
  kontrol("  minecraft:fog_settings govdesi var", !!f);
  kontrol("  kimlik pa: onekli",
          f && f.description.identifier === "pa:" + d,
          f && f.description.identifier);
  /* /fog komutu bu alt anahtarlari ariyor; biri eksikse
     komut "unknown fog" der ve hicbir sey olmaz.          */
  for (const k of ["air", "water", "weather", "lava",
                   "lava_resistance", "powder_snow"]) {
    kontrol("  distance." + k + " tanimli", !!(f && f.distance[k]));
  }
  const air = f && f.distance.air;
  kontrol("  fog_start < fog_end", air && air.fog_start < air.fog_end,
          air && (air.fog_start + " -> " + air.fog_end));
  /* "fixed": blok cinsinden sabit. "render" olsaydi sisin
     kalinligi oyuncunun goruntuleme mesafesine gore
     degisirdi -- tablette bambaska gorunurdu.             */
  kontrol("  render_distance_type fixed",
          air && air.render_distance_type === "fixed",
          air && air.render_distance_type);
}

console.log("");
console.log("=== 2. RENK SKINDEN OLCULDU (tahmin degil) ===");
{
  kontrol("skin dosyasi duruyor", existsSync(SKIN));

  /* Skinin butun DOYGUN tonlarini cikar. Siyaha yakin
     tonlar (skinin %95,6'si) sis olamaz: siyah bir sisi
     kimse goremez.

     NEDEN "en cok kullanilan" DEGIL: bu testin ilk hali
     "en cok kullanilan doygun renk" diyordu ve #145E53'u
     (30 piksel) secip #20C5B5'i (26 piksel) elemisti. Ikisi
     de skinde var; ilki GOLGE tonu, ikincisi TABAN ton.
     Piksel sanatinda golge her zaman tabandan biraz daha
     cok kullanilir -- yani "en cok kullanilan" olcusu
     sistematik olarak golgeyi secer ve sis camurlu cikar.
     Olculen sey artik dogru soru: sisin rengi skinde
     GERCEKTEN VAR MI ve vurgu AILESINDEN mi.              */
  const cikti = execFileSync("python3", ["-c", `
from PIL import Image
from collections import Counter
import colorsys, json
im = Image.open("${SKIN}").convert("RGBA")
px = [p for p in im.getdata() if p[3] > 128]
c = Counter((p[0],p[1],p[2]) for p in px)
tonlar = []
for col, n in c.items():
    h,l,s = colorsys.rgb_to_hls(col[0]/255, col[1]/255, col[2]/255)
    if s < 0.4 or l < 0.15 or l > 0.85:
        continue
    tonlar.append({"renk": "#%02X%02X%02X" % col, "adet": n,
                   "ton": round(h*360), "isik": round(l, 2)})
tonlar.sort(key=lambda t: -t["adet"])
print(json.dumps(tonlar))
`], { encoding: "utf8" });
  const tonlar = JSON.parse(cikti.trim());
  console.log("     skindeki doygun tonlar:");
  for (const t of tonlar) {
    console.log("       " + t.renk + "  " + String(t.adet).padStart(3) +
                " piksel  ton " + t.ton + "°  isik " + t.isik);
  }

  const air = tanim["sis_simsek"] &&
              tanim["sis_simsek"]["minecraft:fog_settings"].distance.air;
  const sis = air && air.fog_color.toUpperCase();

  kontrol("SIS RENGI skinde GERCEKTEN VAR",
          tonlar.some((t) => t.renk === sis), sis);
  const secilen = tonlar.find((t) => t.renk === sis);

  /* Vurgu ailesi: skindeki doygun tonlarin ortalama tonu.
     Sis o aileden olmali -- bambaska bir renk secilseydi
     "skinin rengi" iddiasi bos olurdu.                    */
  const ortTon = tonlar.reduce((a, t) => a + t.ton, 0) / tonlar.length;
  kontrol("  vurgu ailesinden (ton farki < 15°)",
          secilen && Math.abs(secilen.ton - ortTon) < 15,
          secilen ? (secilen.ton + "° vs aile " + Math.round(ortTon) + "°") : "-");

  /* Golge tonu degil TABAN ton secilmeli: sis okunur olsun.
     Ailenin en koyusu sis olursa hava camur gibi gorunur. */
  const enKoyu = tonlar.reduce((a, t) => (t.isik < a.isik ? t : a), tonlar[0]);
  kontrol("  ailenin EN KOYU tonu degil (camur olmasin)",
          secilen && secilen.renk !== enKoyu.renk,
          "secilen " + sis + ", en koyu " + enKoyu.renk);

  kontrol("  sis SIYAH degil (skinin %95'i siyah ama sis olamaz)",
          sis !== "#0A0A0D", sis);
  /* Kullanici "mavi mi bilmiyorum" dedi. Olculen ton bu
     satirda kayit altina aliniyor: mavi degil TURKUAZ.    */
  kontrol("  olculen ton turkuaz araliginda (150-200°)",
          secilen && secilen.ton >= 150 && secilen.ton <= 200,
          secilen && (secilen.ton + "°"));
}

console.log("");
console.log("=== 3. AYARLAR KOMUTU DOGRU YAZDIRIYOR ===");
{
  /* ayarlar.js'teki kimlikler fogs/*.json ile AYNI olmali:
     ayrilirsa oyunda yazdigimiz komut calismaz.           */
  kontrol("SIS_KIMLIK dosyayla ayni",
          ayar.SIS_KIMLIK === "pa:sis_simsek", ayar.SIS_KIMLIK);
  kontrol("SIS_KIMLIK_HAFIF dosyayla ayni",
          ayar.SIS_KIMLIK_HAFIF === "pa:sis_simsek_hafif",
          ayar.SIS_KIMLIK_HAFIF);
  for (const k of [ayar.SIS_KIMLIK, ayar.SIS_KIMLIK_HAFIF]) {
    kontrol("  " + k + " icin dosya VAR",
            existsSync(RP + "/fogs/" + k.replace("pa:", "") + ".json"));
  }
  kontrol("etiket var (/fog ... push <kimlik> <etiket>)",
          typeof ayar.SIS_ETIKET === "string" && ayar.SIS_ETIKET.length > 0,
          ayar.SIS_ETIKET);
}

console.log("");
console.log("=== 4. HAFIF OLAN GERCEKTEN HAFIF ===");
{
  const a = tanim["sis_simsek"] &&
            tanim["sis_simsek"]["minecraft:fog_settings"].distance.air;
  const h = tanim["sis_simsek_hafif"] &&
            tanim["sis_simsek_hafif"]["minecraft:fog_settings"].distance.air;
  kontrol("hafif sis daha UZAKTA kapatiyor",
          a && h && h.fog_end > a.fog_end,
          (h && h.fog_end) + " > " + (a && a.fog_end));
  kontrol("ikisi de AYNI rengi kullaniyor",
          a && h && a.fog_color === h.fog_color,
          (a && a.fog_color) + " / " + (h && h.fog_color));
}

console.log("");
console.log("=== 5. MENUDEN ULASILABILIYOR MU ===");
{
  /* Ayarlarin "oksuz" cikmasi bu ozelligin ILK halinde
     gercek bir eksigi isaret ediyordu: fogs/*.json yaziliyor
     ama oyuna hicbir yerden dokunulmuyordu, oyuncunun komutu
     elle yazmasi gerekiyordu. Tablette bu pratikte "yok"
     demek. Yazilip baglanmamis kod bu depoda ucuncu kez
     cikacakti (efsane.js, konseySilahKir).                 */
  const kaynak = readFileSync(
    KOK + "/Simsek_TNT_ToprakTopu/scripts/main.js", "utf8");
  kontrol("main.js sis.js'i import ediyor",
          kaynak.includes('from "./yetenekler/sis.js"'));

  function govde(ad) {
    const bas = kaynak.indexOf("function " + ad + "(");
    if (bas === -1) return "";
    let derinlik = 0;
    for (let j = kaynak.indexOf("{", bas); j < kaynak.length; j++) {
      if (kaynak[j] === "{") derinlik++;
      else if (kaynak[j] === "}") {
        derinlik--;
        if (derinlik === 0) return kaynak.slice(bas, j + 1);
      }
    }
    return "";
  }
  const menu = govde("menuEkleri");
  kontrol("menuEkleri() govdesi bulundu", menu.length > 0);
  kontrol("menude 'Sis' satirlari var ve sisAc/sisKapat cagiriyor",
          /sisAc\(oyuncu, false\)/.test(menu) &&
          /sisAc\(oyuncu, true\)/.test(menu) &&
          /sisKapat\(oyuncu\)/.test(menu));

  /* sis.js ayarlari GERCEKTEN okumali: kimlikler orada
     yazili kalsaydi ayarlar yine yalan soylerdi.           */
  const sk = readFileSync(
    KOK + "/Simsek_TNT_ToprakTopu/scripts/yetenekler/sis.js", "utf8");
  for (const a of ["SIS_KIMLIK", "SIS_KIMLIK_HAFIF", "SIS_ETIKET"]) {
    kontrol("sis.js " + a + " ayarini okuyor", sk.includes(a));
  }
  kontrol("kimlik sis.js'e ELLE yazilmamis",
          !sk.includes('"pa:sis_simsek"'),
          "kimlik tek yerde durmali");
  /* Ac/kapat AYNI etiketi kullanmali: farkli olsaydi sis
     bir daha kapanmazdi.                                   */
  kontrol("ac ve kapat ayni etiketi kullaniyor",
          (sk.match(/SIS_ETIKET/g) || []).length >= 3,
          (sk.match(/SIS_ETIKET/g) || []).length + " kez geciyor");
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> sis tanimlari dogru");
process.exit(hata ? 1 : 0);
