/* DURUŞ SISTEMI -- Blockbuster'in poz mantiginin bizdeki hali  v7.4

   Kullanici Blockbuster'i (McHorse) gonderdi: "bu en onemlisi
   skin yapmakta... once mantigini anla sonra kodlarina bak
   ardindan bizim versiyonumuzu ekle."

   Jar acildi ve OKUNDU (tahmin edilmedi). Bu dosyanin tuttugu
   guvenceler, kaynagin kendi mantigindan cikanlar:

     1. Duruş verilen kemikler VANILLA ADLARINI TASIMAMALI.
        Tasisalardi vanilla salinim animasyonu duruşun ustune
        biner ve poz durmazdi. Kaynak bunu morph'la cozuyor;
        Bedrock'ta tek yol ad degistirmek.
     2. Duruş verilmeyen kemikler vanilla adlarini KORUMALI --
        yuruyus ve kafa cevirme bedava gelsin diye.
     3. Doku oyuncunun KENDI derisi (`Texture.default`).
        Kendi dokumuz yazilsaydi herkes ayni gorunurdu.
     4. Duruş acikken vanilla beden KAPANMALI, yoksa iki govde
        ust uste cizilir.
     5. Ucarken/binekteyken duruş GECERSIZ -- kaynagin kendi
        onceligi (EntityUtils.getPose).

   Ve en onemlisi: her duruş ELLERIN NEREYE DUSTUGUYLE
   olculuyor. "Dosya var" demek duruşun dogru oldugunu
   soylemez.                                                */

import { readFileSync, existsSync } from "node:fs";

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const BP = KOK + "/Simsek_TNT_ToprakTopu";
const RP = KOK + "/Simsek_Kol_Kaynak";
const OMP = KOK + "/Simsek_Oyuncu_Modeli";

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const oku = (y) => JSON.parse(readFileSync(y, "utf8"));

/* Uretecin tablosu tek kaynak: duruş adlarini BURAYA elle
   yazsaydim yeni duruş eklenince test onu hic gormezdi.   */
const uretec = readFileSync(KOK + "/kol_uret.py", "utf8");
const tabloBas = uretec.indexOf("DURUSLAR = [");
const tabloBit = uretec.indexOf("\nDURUS_ONEK");
const tablo = uretec.slice(tabloBas, tabloBit);
const DURUSLAR = [...tablo.matchAll(/^\s{4}\("([a-z_]+)",\s*"([^"]+)"/gm)]
  .map((m) => [m[1], m[2]]);

console.log("=== 1. TABLO OKUNDU ===");
kontrol("kol_uret.py'de DURUSLAR tablosu var", tabloBas > 0);
kontrol("en az uc duruş tanimli", DURUSLAR.length >= 3,
        DURUSLAR.map((d) => d[0]).join(", "));

console.log("");
console.log("=== 2. ESYALAR ===");
for (const [kimlik, ad] of DURUSLAR) {
  const tam = "durus_" + kimlik;
  const y = BP + "/items/" + tam + ".json";
  kontrol(tam + " esyasi var", existsSync(y));
  if (!existsSync(y)) continue;
  const j = oku(y)["minecraft:item"];
  kontrol("  kimlik pa:" + tam,
          j.description.identifier === "pa:" + tam, j.description.identifier);
  /* Yan el sart: bagli eller duruşundayken ana elde kilic
     durmasin diye tetigi yan ele koyabilmek gerek.        */
  kontrol("  yan ele girebiliyor", j.components["minecraft:allow_off_hand"] === true);
  kontrol("  ikonu var", existsSync(RP + "/textures/item/" + tam + ".png"));
}

console.log("");
console.log("=== 3. GEOMETRI: HANGI KEMIK KIMIN ===");
const geo = {};
for (const [kimlik] of DURUSLAR) {
  const tam = "durus_" + kimlik;
  const y = OMP + "/models/entity/" + tam + ".geo.json";
  kontrol(tam + " geometrisi var", existsSync(y));
  if (!existsSync(y)) continue;
  const g = oku(y)["minecraft:geometry"][0];
  geo[kimlik] = g;
  kontrol("  kimlik geometry." + tam,
          g.description.identifier === "geometry." + tam);
  const adlar = g.bones.map((b) => b.name);

  /* GUVENCE 1 -- duruş verilen kemikler vanilla adini
     TASIMAMALI. Tasisalardi vanilla salinim pozun ustune
     binerdi ve bunu ancak tablette gorurduk.              */
  kontrol("  vanilla kol adlari YOK (rightArm/leftArm)",
          !adlar.includes("rightArm") && !adlar.includes("leftArm"),
          adlar.filter((a) => /Arm/.test(a)).join(",") || "yok");
  kontrol("  kollar bizim adimizla",
          adlar.includes("durus_sag_kol") && adlar.includes("durus_sol_kol"));

  /* GUVENCE 2 -- geri kalan vanilla adini KORUMALI ki
     yuruyus ve kafa cevirme bedava gelsin.                */
  for (const v of ["head", "body", "rightLeg", "leftLeg"]) {
    kontrol("  '" + v + "' vanilla adini koruyor", adlar.includes(v));
  }
  kontrol("  uv uzayi skin duzeni (64x64)",
          g.description.texture_width === 64 && g.description.texture_height === 64,
          g.description.texture_width + "x" + g.description.texture_height);
}

console.log("");
console.log("=== 4. DURUŞLAR ELLERIN YERIYLE OLCULUYOR ===");
/* Kemik donusu: pozitif aci, XYZ sirasi -- v7.3'te OLCULDU
   (ve Blockbuster'in kendi MatrixUtils.RotationOrder.XYZ'si
   ile ayni). */
const don = (p, aci, piv) => {
  let [x, y, z] = [p[0] - piv[0], p[1] - piv[1], p[2] - piv[2]];
  const [rx, ry, rz] = aci.map((a) => (a * Math.PI) / 180);
  let c = Math.cos(rx), s = Math.sin(rx); [y, z] = [y * c - z * s, y * s + z * c];
  c = Math.cos(ry); s = Math.sin(ry);   [x, z] = [x * c + z * s, -x * s + z * c];
  c = Math.cos(rz); s = Math.sin(rz);   [x, y] = [x * c - y * s, x * s + y * c];
  return [x + piv[0], y + piv[1], z + piv[2]];
};
/* Kemik yoksa COKME degil, temiz basarisizlik. Ilk yazdigimda
   `adlar[ad].cubes` diyordum; kasitli bozma denemesinde kemigin
   adi degisince test COKTU ve 4-6. bolumler HIC CALISMADI --
   yani o guvenceler bir daha sinanmadi. Sessiz yesil kadar
   tehlikeli bir sey.                                        */
const el = (g, ad) => {
  const adlar = {}; for (const b of g.bones) adlar[b.name] = b;
  const b = adlar[ad];
  if (!b || !(b.cubes || []).length) return null;
  const c = b.cubes[0];
  let p = [c.origin[0] + c.size[0] / 2, c.origin[1], c.origin[2] + c.size[2] / 2];
  let k = b;
  while (k) { if (k.rotation) p = don(p, k.rotation, k.pivot); k = adlar[k.parent]; }
  return p;
};
const eller = {};
for (const [kimlik] of DURUSLAR) {
  if (!geo[kimlik]) continue;
  const s = el(geo[kimlik], "durus_sag_kol");
  const l = el(geo[kimlik], "durus_sol_kol");
  kontrol(kimlik + ": iki kol kemigi de bulundu", !!s && !!l);
  if (!s || !l) continue;
  eller[kimlik] = [s, l];
  console.log("     %s  sag(%s) sol(%s)", kimlik.padEnd(14),
              s.map((v) => v.toFixed(1)).join(","),
              l.map((v) => v.toFixed(1)).join(","));
}

/* HER DURUŞ KENDI IDDIASIYLA. Bunlar tabloya bakip yazilmis
   sayilar degil, duruşun NE OLDUGUNUN tarifi: "bagli eller"
   bilekleri govdenin onunde birlestirmezse o duruş degildir. */
const bekle = {
  bagli_eller: (s, l) => ({
    "bilekler bitisik (aralik < 3)": Math.abs(l[0] - s[0]) < 3,
    "eller govdenin ONUNDE (z < -2)": s[2] < -2 && l[2] < -2,
    "bel/karin hizasinda (11 < y < 18)": s[1] > 11 && s[1] < 18,
  }),
  eller_yukari: (s, l) => ({
    "iki el de kafanin USTUNDE (y > 28)": s[1] > 28 && l[1] > 28,
    "eller birbirinden ayri": l[0] - s[0] > 6,
  }),
  kavusuk: (s, l) => ({
    "kollar CAPRAZ (sag el sol yana gecmis)": s[0] > l[0],
    "gogus onunde (z < -2)": s[2] < -2 && l[2] < -2,
  }),
  t_durusu: (s, l) => ({
    "iki kol da omuz hizasinda yatay (y ~ 23)":
      Math.abs(s[1] - 23) < 1 && Math.abs(l[1] - 23) < 1,
    "tam yana acilmis (|x| > 12)": s[0] < -12 && l[0] > 12,
  }),
  selam: (s, l) => ({
    "sag el yukarida (y > 28)": s[1] > 28,
    "sol kol yanda duruyor (y ~ 12)": Math.abs(l[1] - 12) < 1,
  }),
};
for (const [kimlik, ad] of DURUSLAR) {
  if (!eller[kimlik]) continue;
  const f = bekle[kimlik];
  kontrol(ad + " icin olcut yazilmis", !!f);
  if (!f) continue;
  const sonuc = f(eller[kimlik][0], eller[kimlik][1]);
  for (const [k, v] of Object.entries(sonuc)) kontrol("  " + k, v);
}

console.log("");
console.log("=== 5. OYUNCU MODELINE BAGLI MI ===");
{
  const d = oku(OMP + "/entity/player.entity.json")["minecraft:client_entity"].description;
  const on = d.scripts.pre_animation.join("\n");
  const donusuk = d.scripts.pre_animation.find((s) => s.includes("variable.donusuk"));
  const rcAdlari = d.render_controllers
    .filter((r) => typeof r === "object")
    .map((r) => Object.keys(r)[0]);
  const denet = oku(OMP + "/render_controllers/o_sey.render_controllers.json")
    .render_controllers;

  for (const [kimlik] of DURUSLAR) {
    const tam = "durus_" + kimlik;
    kontrol(tam + ": geometri kayitli", d.geometry[tam] === "geometry." + tam);
    kontrol("  tetik degiskeni var", on.includes("variable." + tam + " ="));
    /* GUVENCE 5 -- kaynagin onceligi. Ucarken duruş acik
       kalsaydi oyuncu kanat acmis halde T duruşunda donardi.
       Kullanilan sorgular TABAN DOSYADA gecmis olmali: molang
       ifadesi derlenmezse oyuncunun cizimi komple bozulur. */
    const satir = d.scripts.pre_animation.find((s) => s.startsWith("variable." + tam + " ="));
    kontrol("  ucarken/yuzerken KAPANIYOR",
            !!satir && satir.includes("!query.is_gliding")
            && satir.includes("!query.is_swimming"));
    /* Tetikte kullanilan HER molang sorgusunun bir KANITI
       olmali. Molang derlenmezse oyuncunun cizimi komple
       bozulur, o yuzden "herhalde vardir" yeterli degil.
       Yeni bir sorgu eklendiginde bu liste onu tanimaz ve
       test duser -- kanitini yazmaya zorlar.               */
    const KANIT = {
      // v4.90'dan beri O Sey donusumunu tetikleyen sorgu;
      // kullanici tablette calistigini dogruladi.
      "query.get_equipped_item_name": "v4.90'dan beri paketde calisiyor",
      // Taban dosyada (vanilla player.entity.json) geciyor.
      "query.is_gliding": "taban dosyada var",
      "query.is_swimming": "taban dosyada var",
    };
    const tabanMetni = readFileSync(KOK + "/oyuncu_modeli_taban/player.entity.json", "utf8");
    for (const q of new Set((satir || "").match(/query\.[a-z_]+/g) || [])) {
      kontrol("  '" + q + "' sorgusunun kaniti var", !!KANIT[q], KANIT[q] || "KANIT YOK");
      if (KANIT[q] === "taban dosyada var") {
        kontrol("    kanit hala gecerli", tabanMetni.includes(q));
      }
    }
    /* GUVENCE 4 -- vanilla beden kapansin, yoksa iki govde. */
    kontrol("  variable.donusuk'e dahil",
            !!donusuk && donusuk.includes("variable." + tam));
    kontrol("  render denetleyicisi bagli",
            rcAdlari.includes("controller.render." + tam));
    const c = denet["controller.render." + tam];
    kontrol("  denetleyici govdesi var", !!c);
    /* GUVENCE 3 -- oyuncunun KENDI derisi. */
    kontrol("  dokusu Texture.default (oyuncunun kendi derisi)",
            !!c && c.textures.length === 1 && c.textures[0] === "Texture.default",
            c && c.textures.join(","));
    kontrol("  ilk sahiste cizilmiyor",
            !!rcAdlari.length &&
            d.render_controllers.some((r) => typeof r === "object"
              && r["controller.render." + tam]
              && r["controller.render." + tam].includes("!variable.is_first_person")));
  }
  /* Kendi dokumuzu KAZAYLA eklemis olmayalim: duruşun
     doku girdisi OLMAMALI. */
  kontrol("duruşlarin ayri dokusu yok (olmamali)",
          !Object.keys(d.textures).some((k) => k.startsWith("durus_")),
          Object.keys(d.textures).filter((k) => k.startsWith("durus_")).join(",") || "yok");
}

console.log("");
console.log("=== 6. DIL VE IKON KAYDI ===");
{
  const tr = readFileSync(RP + "/texts/tr_TR.lang", "utf8");
  const en = readFileSync(RP + "/texts/en_US.lang", "utf8");
  const it = oku(RP + "/textures/item_texture.json").texture_data;
  for (const [kimlik, ad] of DURUSLAR) {
    const tam = "durus_" + kimlik;
    kontrol(tam + ": Turkce adi var", tr.includes("item.pa:" + tam + ".name="));
    kontrol("  Turkce ad gercekten Turkce (tabloyla ayni)",
            tr.includes("item.pa:" + tam + ".name=Duruş · " + ad));
    kontrol("  Ingilizce adi var", en.includes("item.pa:" + tam + ".name="));
    kontrol("  ikon kayitli", !!it[tam]);
  }
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> hepsi tamam");
process.exit(hata ? 1 : 0);
