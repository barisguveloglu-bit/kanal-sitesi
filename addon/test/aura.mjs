/* IKSIR AURASI -- OZEL PARCACIK SISTEMI              v7.15

   Kullanici: "parcacikla baslayalim, en detaylisini yap."

   Depo bugune kadar yalniz VANILLA parcacik kimlikleri
   kullandi. Bu ilk kez Bedrock'un kendi parcacik sistemini
   yaziyor (24 dosya, 8 iksir x 3 tur) ve o sistemin sessizce
   bozulabilecegi cok yeri var:

     - flipbook doku SINIRINI asarsa zerre bos UV ornekler ve
       gorunmez olur; hicbir hata mesaji cikmaz
     - material adi yanlissa parcacik hic cizilmez
     - doku yolu yanlissa mor-siyah kare cikar
     - gradyan renkleri elle yazilirsa gozle aura ayrisir
     - parcacik adi elle bir tabloda tutulursa yeni iksirde
       biri guncellenip oteki unutulur

   Bu dosya bunlarin hepsini tutuyor.                       */

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

const ayar = await import("./pack/ayarlar.js");
const TURLER = ["kor", "hale", "patlama"];

/* Ureteci OKUYORUZ: iksir renkleri orada tanimli ve auranin
   renkleri onlarla AYNI olmali. Ikinci bir renk listesi
   tutulsaydi biri degisip oteki kalirdi.                   */
const URETEC = readFileSync(KOK + "/kol_uret.py", "utf8");

console.log("=== 1. IKI LISTE AYNI (elle eslesme tablosu YOK) ===");
{
  /* Parcacik adi kademe.kimlik'ten kuruluyor:
       pa:aura_kor_<kimlik>
     Yani KADEMELER (script) ile IKSIRLER (uretec) ayni
     kimlikleri tasimak ZORUNDA. Ayrisirlarsa bir iksirin
     aurasi sessizce hic cikmaz.                            */
  const blok = /IKSIRLER = \[([\s\S]*?)\n\]/.exec(URETEC)[1];
  const uretecKimlik = [...blok.matchAll(/^\s*\("(\w+)",/gm)].map((m) => m[1]);
  const scriptKimlik = ayar.KADEMELER.map((k) => k.kimlik);
  kontrol("uretec ve script ayni iksirleri tanıyor",
          JSON.stringify(uretecKimlik) === JSON.stringify(scriptKimlik),
          uretecKimlik.length + " / " + scriptKimlik.length);
  kontrol("sekiz iksir", scriptKimlik.length === 8, String(scriptKimlik.length));
}

console.log("");
console.log("=== 2. YIRMI DORT DOSYA VE SEMA ===");
const GECERLI_MALZEME = ["particles_add", "particles_alpha", "particles_blend"];
const dosyalar = [];
{
  const klasor = RP + "/particles";
  kontrol("particles klasoru var", existsSync(klasor));
  const hepsi = existsSync(klasor)
    ? readdirSync(klasor).filter((f) => f.endsWith(".particle.json")) : [];
  kontrol("24 parcacik dosyasi (8 iksir x 3 tur)", hepsi.length === 24,
          hepsi.length + " dosya");

  for (const k of ayar.KADEMELER) {
    for (const tur of TURLER) {
      const yol = klasor + "/aura_" + tur + "_" + k.kimlik + ".particle.json";
      if (!existsSync(yol)) { kontrol(k.kimlik + "/" + tur + " dosyasi", false, yol); continue; }
      const d = oku(yol)["particle_effect"];
      dosyalar.push([k, tur, d]);
      /* Kimlik script'in kuracagi adla BIREBIR ayni olmali. */
      const beklenen = ayar.AURA_ONEK + tur + "_" + k.kimlik;
      if (d.description.identifier !== beklenen) {
        kontrol(k.kimlik + "/" + tur + " kimligi", false,
                d.description.identifier + " != " + beklenen);
      }
    }
  }
  kontrol("hepsinin kimligi script'in kuracagi adla ayni",
          dosyalar.length === 24, dosyalar.length + " dosya okundu");

  const kotuMalzeme = dosyalar.filter(
    ([, , d]) => !GECERLI_MALZEME.includes(
      d.description.basic_render_parameters.material));
  /* Malzeme adi yanlissa parcacik HIC cizilmez, hata da yok. */
  kontrol("malzeme belgedeki uc degerden biri", kotuMalzeme.length === 0,
          kotuMalzeme.map(([k, t]) => k.kimlik + "/" + t).join(", ") || "hepsi gecerli");
  /* Kor ve kivilcim PARLAMALI: particles_add = toplamali harman,
     dunya isigindan bagimsiz. particles_blend olsaydi
     gece karanlikta aura da kararirdi.                      */
  kontrol("hepsi toplamali harman (particles_add)",
          dosyalar.every(([, , d]) =>
            d.description.basic_render_parameters.material === "particles_add"));

  const dokuYolu = dosyalar.map(([, , d]) =>
    d.description.basic_render_parameters.texture);
  kontrol("hepsi ayni dokuyu gosteriyor",
          new Set(dokuYolu).size === 1, [...new Set(dokuYolu)].join(", "));
  kontrol("doku diskte var",
          existsSync(RP + "/" + dokuYolu[0] + ".png"), dokuYolu[0]);
}

console.log("");
console.log("=== 3. FLIPBOOK DOKU SINIRINI ASMIYOR ===");
{
  /* EN SESSIZ HATA BU. flipbook max_frame * step_UV dokunun
     disina tasarsa zerre BOS bir UV ornekler ve gorunmez olur;
     oyun hicbir uyari vermez. Ayni sekilde base_UV satiri
     yanlissa baska bir sprite oynar.                        */
  const olc = JSON.parse(execFileSync("python3", ["-c", `
from PIL import Image
import json
im = Image.open(${JSON.stringify(RP + "/textures/particle/iksir_aura.png")})
print(json.dumps({"en": im.size[0], "boy": im.size[1]}))
`], { encoding: "utf8" }));
  kontrol("doku 128x128", olc.en === 128 && olc.boy === 128,
          olc.en + "x" + olc.boy);

  let tasan = [], yanlisOlcu = [];
  for (const [k, tur, d] of dosyalar) {
    const bb = d.components["minecraft:particle_appearance_billboard"];
    const fb = bb && bb.uv && bb.uv.flipbook;
    if (!fb) { kontrol(k.kimlik + "/" + tur + " flipbook", false, "yok"); continue; }
    if (bb.uv.texturewidth !== olc.en || bb.uv.textureheight !== olc.boy) {
      yanlisOlcu.push(k.kimlik + "/" + tur);
    }
    const sagUc = fb.base_UV[0] + fb.step_UV[0] * (fb.max_frame - 1) + fb.size_UV[0];
    const altUc = fb.base_UV[1] + fb.step_UV[1] * (fb.max_frame - 1) + fb.size_UV[1];
    if (sagUc > olc.en || altUc > olc.boy) {
      tasan.push(k.kimlik + "/" + tur + " -> " + sagUc + "x" + altUc);
    }
  }
  kontrol("son kare dokunun ICINDE kaliyor", tasan.length === 0,
          tasan.join(", ") || "hepsi sigiyor");
  kontrol("bildirilen doku olcusu gercek olcuyle ayni",
          yanlisOlcu.length === 0, yanlisOlcu.join(", ") || "hepsi dogru");

  /* Uc tur uc AYRI satiri oynatmali; ayni satiri gosterirlerse
     kor ile kivilcim ayni gorunur.                          */
  const satirlar = {};
  for (const [, tur, d] of dosyalar) {
    const fb = d.components["minecraft:particle_appearance_billboard"].uv.flipbook;
    (satirlar[tur] = satirlar[tur] || new Set()).add(fb.base_UV[1]);
  }
  const teklik = new Set(Object.values(satirlar).map((s) => [...s][0]));
  kontrol("her tur kendi sprite satirini oynatiyor",
          teklik.size === TURLER.length,
          Object.entries(satirlar).map(([t, s]) => t + ":" + [...s].join("/")).join("  "));
}

console.log("");
console.log("=== 4. RENK UYDURULMADI: GOZUN RENGI ===");
{
  /* Auranin rengi UYDURULMAMALI -- gozunde yanan renk ne ise
     etrafinda ucusan da o olmali. Uretecteki IKSIRLER
     tablosunun BESINCI sutunu goz rengi.                    */
  const blok = /IKSIRLER = \[([\s\S]*?)\n\]/.exec(URETEC)[1];
  const renkler = {};
  for (const m of blok.matchAll(
      /^\s*\("(\w+)",\s*"[^"]*",\s*\([^)]*\),\s*"[^"]*",\s*(\(\([^)]*\),\s*\([^)]*\)\)|\([^)]*\))/gm)) {
    const sayilar = [...m[2].matchAll(/\d+/g)].map((x) => +x[0]);
    renkler[m[1]] = sayilar;      // 3 sayi = tek renk, 6 = iki renk
  }
  kontrol("goz renkleri uretecten okundu",
          Object.keys(renkler).length === 8,
          Object.keys(renkler).length + " iksir");

  let uymayan = [], alfaBitmeyen = [];
  for (const [k, tur, d] of dosyalar) {
    const g = d.components["minecraft:particle_appearance_tinting"].color.gradient;
    const anahtarlar = Object.keys(g).map(Number).sort((a, b) => a - b);
    /* Zerre SONEREK kaybolmali: son durakta alfa 0. Aksi halde
       omru bitince aniden yok oluyor ve goze carpiyor.       */
    const son = g[String(anahtarlar[anahtarlar.length - 1].toFixed(1))] ||
                g[String(anahtarlar[anahtarlar.length - 1])];
    if (!son || son[3] !== 0) alfaBitmeyen.push(k.kimlik + "/" + tur);

    /* 0.18 duragı iksirin GOZ rengi olmali (255'e bolunmus). */
    const bek = renkler[k.kimlik].slice(0, 3).map((c) => +(c / 255).toFixed(4));
    const var_ = g["0.18"];
    if (!var_ || bek.some((c, i) => Math.abs(var_[i] - c) > 0.002)) {
      uymayan.push(k.kimlik + "/" + tur + " " + JSON.stringify(var_) +
                   " != " + JSON.stringify(bek));
    }
  }
  kontrol("gradyanin rengi gozun rengiyle ayni", uymayan.length === 0,
          uymayan.slice(0, 2).join(" | ") || "24 dosyanin hepsi");
  kontrol("zerre sonerek kayboluyor (son alfa 0)",
          alfaBitmeyen.length === 0, alfaBitmeyen.join(", ") || "hepsi soniyor");

  /* Element'in IKI goz rengi var (buz + ates, referanstan
     olculdu). Ikisi de gradyanda olmali -- yoksa onun aurasi
     digerlerinden ayrisamaz.                                */
  const el = dosyalar.find(([k, t]) => k.kimlik === "element" && t === "kor")[2];
  const eg = el.components["minecraft:particle_appearance_tinting"].color.gradient;
  const iki = renkler["element"];
  kontrol("Element'in IKI rengi de gradyanda", iki.length === 6 &&
          Math.abs(eg["0.18"][0] - iki[0] / 255) < 0.002 &&
          Math.abs(eg["0.55"][0] - iki[3] / 255) < 0.002,
          JSON.stringify(eg["0.18"]) + " -> " + JSON.stringify(eg["0.55"]));
}

console.log("");
console.log("=== 5. HAREKET GERCEKTEN TANIMLI ===");
{
  /* Parcacik dosyasi yazilip da hareket bileseni unutulursa
     zerreler dogduklari yerde ASILI kalir. Uc turun ucunun de
     kendi karakteri var; asagidaki isaretler onu tutuyor.   */
  const al = (kim, tur) => dosyalar.find(([k, t]) => k.kimlik === kim && t === tur)[2].components;

  const kor = al("nitroksin", "kor");
  const km = kor["minecraft:particle_motion_dynamic"];
  kontrol("kor YUKARI kalkiyor", km.linear_acceleration[1] > 0,
          String(km.linear_acceleration[1]));
  /* Surtunme olmazsa zerreler hizlanarak gokyuzune firlar.  */
  kontrol("kor surtunmeyle yavasliyor", km.linear_drag_coefficient > 1,
          String(km.linear_drag_coefficient));
  kontrol("kor takla atiyor",
          !!kor["minecraft:particle_initial_spin"].rotation_rate);

  const pat = al("nitroksin", "patlama");
  const pm = pat["minecraft:particle_motion_dynamic"];
  /* Patlama YERCEKIMLI: kivilcimlar yukselip dusmeli.       */
  kontrol("patlama asagi dusuyor", pm.linear_acceleration[1] < 0,
          String(pm.linear_acceleration[1]));
  /* Carpisma olmazsa kivilcimlar yerin ICINDEN gecer.       */
  const pc = pat["minecraft:particle_motion_collision"];
  kontrol("patlama yere carpinca soniyor",
          !!pc && pc.expire_on_contact === true);
  kontrol("patlama korden hizli firliyor",
          String(pat["minecraft:particle_initial_speed"]).startsWith("1.7"),
          String(pat["minecraft:particle_initial_speed"]));

  const hale = al("nitroksin", "hale");
  /* Hale kafanin etrafinda KABUK: yalniz kureden.           */
  kontrol("hale yalniz kure yuzeyinden cikiyor",
          hale["minecraft:emitter_shape_sphere"].surface_only === true);
  kontrol("hale korden YAVAS",
          parseFloat(hale["minecraft:particle_initial_speed"]) <
          parseFloat(kor["minecraft:particle_initial_speed"]),
          hale["minecraft:particle_initial_speed"] + " < " +
          kor["minecraft:particle_initial_speed"]);
  /* Hale uzun omurlu: puslu bir kabuk ancak boyle olusuyor. */
  kontrol("hale korden UZUN yasiyor",
          parseFloat(hale["minecraft:particle_lifetime_expression"].max_lifetime) >
          parseFloat(kor["minecraft:particle_lifetime_expression"].max_lifetime));

  /* Butun boy ve renk ifadeleri zerrenin YASINA bagli olmali;
     sabit sayi yazilsaydi zerre kuculmeden yok olurdu.      */
  let yassiz = [];
  for (const [k, tur, d] of dosyalar) {
    const c = d.components;
    const boy = JSON.stringify(c["minecraft:particle_appearance_billboard"].size);
    const ip = c["minecraft:particle_appearance_tinting"].color.interpolant;
    if (!boy.includes("particle_age") || !String(ip).includes("particle_age")) {
      yassiz.push(k.kimlik + "/" + tur);
    }
  }
  kontrol("boy ve renk zerrenin yasina bagli", yassiz.length === 0,
          yassiz.join(", ") || "24 dosyanin hepsi");
}

console.log("");
console.log("=== 6. SCRIPT TARAFI ===");
{
  const kaynak = readFileSync(BP + "/scripts/yetenekler/iksirler.js", "utf8");
  /* Metinde arama yapilirken once YORUMLAR ayiklaniyor: bu
     depoda dort kez yorum icindeki bir satir gercek kod
     sanildi.                                                */
  const kod = kaynak.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  kontrol("aura ayar kapisina bakiyor", /if \(!AURA_ACIK\) return/.test(kod));
  /* Ad kademe.kimlik'ten KURULUYOR; elle tablo yok.         */
  kontrol("parcacik adi kademe.kimlik'ten kuruluyor",
          /AURA_ONEK \+ tur \+ "_" \+ kademe\.kimlik/.test(kod));
  /* Kafa hizasi: oyuncu.location AYAK hizasidir, aura orada
     ciksaydi zerreler bacaklardan yukselirdi.               */
  kontrol("kafa hizasindan cikiyor (getHeadLocation)",
          /getHeadLocation\(\)/.test(kod));
  kontrol("kor ve hale ayri ritimde",
          /simdi % AURA_ARALIK/.test(kod) && /simdi % AURA_HALE_ARALIK/.test(kod));
  /* AURA_ARALIK'in tazelemeden ONCE gelmesi SART: sonra
     gelseydi aura da IKSIR_TAZELEME ritmine duser, yani
     saniyede bir cikardi ve kesik kesik gorunurdu.          */
  kontrol("aura tazeleme 'continue'sinden ONCE",
          kod.indexOf("simdi % AURA_ARALIK") <
          kod.indexOf("if (simdi < d.sonrakiTazeleme) continue"));
  /* METIN ARAMASI YETMEDI -- mutasyon denemesinde goruldu.
     `auraPatlat` cagrisini iksirIc'ten SILDIGIMDE test yine
     gecti, cunku regex fonksiyonun TANIMINI yakaliyordu
     ("export function auraPatlat(oyuncu, kademe)"). Yani satir
     "kod yazilmis mi"yi olcuyordu, "kod calisiyor mu"yu degil.
     Ayni sinif bosluk v6.9 ve v7.1'de de yasandi.

     Artik iksir GERCEKTEN iciliyor ve sahte dunyada parcacik
     dogdu mu diye bakiliyor.                                */
  const cikti = JSON.parse(execFileSync("node", ["--input-type=module", "-e", `
import { dunyaKur, oyuncuKur } from ${JSON.stringify(KOK + "/test/dunya.mjs")};
import { tickIlerlet, _durum } from "@minecraft/server";
const w = console.warn; console.warn = () => {};
const iks = await import(${JSON.stringify(KOK + "/test/pack/yetenekler/iksirler.js")});
const ayar = await import(${JSON.stringify(KOK + "/test/pack/ayarlar.js")});
const D = dunyaKur();
const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
o.id = "aura-1"; _durum.oyuncular = [o];
const kademe = ayar.KADEMELER.find((k) => k.kimlik === "element");
iks.iksirIc(o, kademe);
const patlama = (D.sayac.parcacik || []).map((p) => p.tip);
D.sayac.parcacik = [];
for (let i = 0; i < 40; i++) { tickIlerlet(1); iks.iksirTara([o]); }
const tarama = (D.sayac.parcacik || []).map((p) => p.tip);
console.warn = w;
console.log(JSON.stringify({
  patlama, tarama,
  korY: (D.sayac.parcacik || []).filter((p) => p.tip.includes("_kor_")).map((p) => p.y),
  basY: o.getHeadLocation().y
}));
`], { encoding: "utf8", cwd: KOK + "/test" }).trim().split("\n").pop());

  /* 1) Icildigi an patlama                                  */
  kontrol("iksir icilince patlama GERCEKTEN cikiyor",
          cikti.patlama.includes("pa:aura_patlama_element"),
          cikti.patlama.join(", ") || "hic parcacik yok");
  /* 2) Sonraki tick'lerde kor ve hale                       */
  kontrol("taramada kor cikiyor",
          cikti.tarama.some((t) => t === "pa:aura_kor_element"),
          [...new Set(cikti.tarama)].join(", ") || "hic");
  kontrol("taramada hale cikiyor",
          cikti.tarama.some((t) => t === "pa:aura_hale_element"));
  /* 3) Ad ICILEN iksire gore -- sabit degil                 */
  kontrol("parcacik adi ICILEN iksirin adi",
          cikti.tarama.every((t) => t.endsWith("_element")),
          [...new Set(cikti.tarama)].join(", "));
  /* 4) Ritim: 40 tick'te AURA_ARALIK'a gore ~7 kor          */
  const korSay = cikti.tarama.filter((t) => t.includes("_kor_")).length;
  kontrol("kor dogru ritimde (40 tick'te ~" +
          Math.floor(40 / ayar.AURA_ARALIK) + ")",
          korSay >= Math.floor(40 / ayar.AURA_ARALIK) - 1 &&
          korSay <= Math.floor(40 / ayar.AURA_ARALIK) + 1,
          korSay + " kor");
  /* 5) Kafanin USTUNDEN -- ayak hizasindan degil            */
  kontrol("kor kafanin ustunden cikiyor",
          cikti.korY.length === 0 ||
          cikti.korY.every((y) => y > cikti.basY),
          "kor y " + (cikti.korY[0] || "-") + " > bas y " + cikti.basY);
  kontrol("hatasi yutulmuyor, yaziliyor", /hataYaz\("aura\./.test(kod));

  /* Ayarlarin hepsi GERCEKTEN okunuyor mu -- tarama.mjs'in
     oksuz-ayar korumasinin buradaki karsiligi.              */
  for (const a of ["AURA_ACIK", "AURA_ONEK", "AURA_ARALIK",
                   "AURA_HALE_ARALIK", "AURA_KAFA_Y", "AURA_PATLAMA_Y"]) {
    kontrol("  " + a + " tanimli ve okunuyor",
            ayar[a] !== undefined && kod.includes(a), String(ayar[a]));
  }
  /* Her tick cikarsa hem pahali hem de zerreler ust uste
     binip tek bir bulut gorunuyor.                          */
  kontrol("her tick cikmiyor", ayar.AURA_ARALIK > 1, String(ayar.AURA_ARALIK));
  kontrol("hale korden seyrek", ayar.AURA_HALE_ARALIK > ayar.AURA_ARALIK,
          ayar.AURA_HALE_ARALIK + " > " + ayar.AURA_ARALIK);
}

console.log("");
console.log("=== 7. PAKETE GIRDI ===");
{
  /* v4.75 dersi: .mcpack'te eksik klasor "bazen calisiyor
     bazen calismiyor" gibi gorunuyor.                       */
  const man = oku(RP + "/manifest.json");
  const surum = "v" + man.header.version.join(".");
  const paket = KOK + "/Simsek_" + surum + "_Gorunum.mcpack";
  kontrol("gorunum paketi uretilmis", existsSync(paket), paket.split("/").pop());
  if (existsSync(paket)) {
    const liste = execFileSync("unzip", ["-Z1", paket], { encoding: "utf8" });
    const say = liste.split("\n").filter((r) => r.startsWith("particles/") &&
                                         r.endsWith(".particle.json")).length;
    kontrol("24 parcacik pakette", say === 24, say + " dosya");
    kontrol("parcacik dokusu pakette",
            liste.includes("textures/particle/iksir_aura.png"));
  }
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> iksir aurasi yerinde");
process.exit(hata ? 1 : 0);
