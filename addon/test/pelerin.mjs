/* ================================================================
   PELERIN DURUMLARI                                       v7.99.24

   Kullanici: "super kahramanlarin pelerini duz durmasin, bircok
   farkli durum ekle; creative moddayken uctugumuzda dalgalansin.
   Hepsini dusunerek ekle."

   Pelerinin hesabi kostum attachable'inin pre_animation betiginde
   (kol_uret.py PELERIN_BETIK), animasyon yalniz v.pl_r1..r4'u
   kemiklere yaziyor. Bu dosya:
     1. 20 pelerinli kostumun hepsine baglandigini, kemiklerin
        modelde oldugunu, yakanin (kok) DONMEDIGINI
     2. betigin yalniz belgede olan sorgulari kullandigini
     3. donus isaretini: pozitif aci pelerini GERIYE goturuyor
        (projenin oyunla dogrulanmis donusumuyle, Thor uzerinde)
     4. betigi bir MoLang yorumlayicisiyla 30 FPS'te her durumda
        kosturup acilari: uyku, bekleme, yurume, kosma, ucus
        (asili ve hizli), dusus, ziplama, egilme, yuzme, binek,
        yagmur, darbe; gecislerde ziplama yok; degiskenler kalici
        DEGILSE de pelerin kalkiyor ve dalgalaniyor
   olcuyor. Oyunda gozle bakilmasi gereken tek sey hareketin
   gorunusu; sayilar ve sinirlar burada.
   ================================================================ */
import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const RP = KOK + "/Simsek_Kol_Kaynak";
let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const oku = (y) => JSON.parse(readFileSync(y, "utf8"));

/* ---- modeller ve attachable'lar ---- */
const geolar = {};
for (const f of readdirSync(RP + "/models/entity")) {
  if (!f.endsWith(".json")) continue;
  try {
    for (const g of oku(RP + "/models/entity/" + f)["minecraft:geometry"] || []) {
      geolar[g.description.identifier] = g;
    }
  } catch (e) { /* bozuk model bicim testinin isi */ }
}
const anim = oku(RP + "/animations/pelerin.animation.json").animations;
const kostumler = [];
for (const f of readdirSync(RP + "/attachables")) {
  const a = oku(RP + "/attachables/" + f)["minecraft:attachable"].description;
  const g = geolar[(a.geometry || {}).default];
  if (!g) continue;
  const kemik = Object.fromEntries((g.bones || []).map((b) => [b.name, b]));
  /* Pelerin: govdeye bagli capa* kokunden inen kuplu parcalar. */
  const pelerinli = (g.bones || []).some((b) => b.parent === "body" && b.name.startsWith("capa") &&
    (g.bones || []).some((c) => c.parent === b.name && c.name.startsWith("capa") && (c.cubes || []).length));
  const baslik = (g.bones || []).some((b) => b.parent === "head" && b.name.startsWith("capa") && (b.cubes || []).length);
  kostumler.push({ f, a, g, kemik, pelerinli, baslik });
}

console.log("=== 1. HER PELERINLI KOSTUME BAGLI, YAKA SABIT ===");
{
  const pel = kostumler.filter((k) => k.pelerinli);
  const bagli = pel.filter((k) => k.a.animations && k.a.animations.pelerin &&
    ((k.a.scripts || {}).animate || []).includes("pelerin") && ((k.a.scripts || {}).pre_animation || []).length > 10);
  kontrol("pelerinli kostumler bulundu", pel.length >= 20, pel.length + " kostum");
  kontrol("hepsine pelerin animasyonu ve durum betigi bagli", bagli.length === pel.length,
          pel.filter((k) => !bagli.includes(k)).map((k) => k.a.identifier).join(", "));
  const betikler = new Set(bagli.map((k) => JSON.stringify(k.a.scripts.pre_animation)));
  kontrol("hepsi AYNI betigi tasiyor (hesap tek yerde)", betikler.size === 1, betikler.size + " farkli betik");
  const eksikKemik = [], yakaDonuyor = [], tanimsiz = [];
  for (const k of bagli) {
    const an = anim[k.a.animations.pelerin];
    if (!an) { tanimsiz.push(k.a.identifier); continue; }
    for (const ad of Object.keys(an.bones)) {
      if (!k.kemik[ad]) eksikKemik.push(k.a.identifier + ":" + ad);
      else if (k.kemik[ad].parent === "body") yakaDonuyor.push(k.a.identifier + ":" + ad);
    }
  }
  kontrol("animasyonun hepsi tanimli", tanimsiz.length === 0, tanimsiz.join(", "));
  kontrol("animasyon yalniz modeldeki kemiklere yaziyor", eksikKemik.length === 0, eksikKemik.slice(0, 4).join(", "));
  kontrol("yaka (govdeye bagli kok) donmuyor: on tokalar govdeye girmesin", yakaDonuyor.length === 0,
          yakaDonuyor.slice(0, 4).join(", "));
  const baslikAnim = kostumler.filter((k) => k.baslik && !k.pelerinli && k.a.animations && k.a.animations.pelerin);
  kontrol("kafadaki basliklar (Moon Knight, Doom maskeleri) dalgalanmiyor", baslikAnim.length === 0,
          baslikAnim.map((k) => k.a.identifier).join(", "));
}

const ornek = kostumler.find((k) => k.a.animations && k.a.animations.pelerin);
const BETIK = ornek.a.scripts.pre_animation;

console.log("");
console.log("=== 2. YALNIZ BELGEDE OLAN SORGULAR ===");
{
  /* Microsoft'un sorgu listesinde olanlar. "is_flying" diye bir
     sorgu YOK; ucus durumdan cikariliyor.                       */
  const BELGELI = new Set(["delta_time", "life_time", "ground_speed", "vertical_speed", "is_on_ground",
    "is_in_water", "is_in_water_or_rain", "is_riding", "is_gliding", "is_swimming", "is_sneaking",
    "is_sleeping", "hurt_time"]);
  const kullanilan = new Set(BETIK.join(" ").match(/\bq(?:uery)?\.([a-z_]+)/g).map((s) => s.split(".")[1]));
  const yabanci = [...kullanilan].filter((s) => !BELGELI.has(s));
  kontrol("her sorgu belgede var", yabanci.length === 0, yabanci.join(", ") || [...kullanilan].length + " sorgu");
  kontrol("is_flying gibi olmayan bir sorgu yok", !kullanilan.has("is_flying"));
  const fonk = new Set(BETIK.join(" ").match(/\bmath\.([a-z_]+)/g).map((s) => s.split(".")[1]));
  kontrol("matematik fonksiyonlari bilinen", [...fonk].every((f) => ["min", "max", "clamp", "lerp", "mod", "sin"].includes(f)),
          [...fonk].join(","));
}

console.log("");
console.log("=== 3. ISARET: POZITIF ACI PELERINI GERIYE GOTURUYOR ===");
{
  /* arac/bedrock_onizleme.py'nin donusumu oyunla dogrulanmis. */
  let c = "";
  try {
    c = execFileSync("python3", ["-B", "-c", `
import json, sys
sys.path.insert(0, sys.argv[1] + "/arac")
import bedrock_onizleme as b
geo = json.load(open(sys.argv[1] + "/Simsek_Kol_Kaynak/models/entity/mrv_thor_suit.geo.json"))
p = b.ic([0, 0.15, 1.75])
for aci in (0, 30):
    m = b.Model(geo, {"bones": {"capa2": {"rotation": [aci, 0, 0]}}})
    print("%d %.3f" % (aci, m.nokta("capa5", p)[2]))
`, KOK], { encoding: "utf8" });
  } catch (e) { c = String(e.stdout || e); }
  const z = Object.fromEntries(c.trim().split("\n").map((s) => s.split(" ").map(Number)));
  kontrol("Thor: capa2 +30 -> pelerinin ucu geriye (+z)", z[30] > z[0] + 5, "z " + z[0] + " -> " + z[30]);
  /* Pelerin govdenin arkasinda duruyor (+z): geriye = govdeden uzak. */
  const arkada = kostumler.filter((k) => k.pelerinli).every((k) => {
    const an = anim[k.a.animations.pelerin];
    return Object.keys(an.bones).every((ad) => (k.kemik[ad].cubes || []).every((q) => q.origin[2] + q.size[2] / 2 > 0));
  });
  kontrol("donen her parca govdenin arkasinda (+z)", arkada);
  /* Betigin acilari pozitif = geriye; animasyon onlari AYNEN yazmali. */
  const ters = Object.entries(anim).flatMap(([ad, a]) => Object.entries(a.bones)
    .filter(([, k]) => !/^v\.pl_r[1-4]$/.test(String(k.rotation[0])) || k.rotation[1] !== 0 || k.rotation[2] !== 0)
    .map(([kemik]) => ad + ":" + kemik));
  kontrol("animasyon acilari isaret degistirmeden yaziyor (yalniz X)", ters.length === 0, ters.slice(0, 3).join(", "));
}

/* ---- MoLang yorumlayicisi: yalniz bu betigin kullandigi kadar ---- */
const M = {
  min: Math.min, max: Math.max, clamp: (x, a, b) => Math.min(Math.max(x, a), b),
  lerp: (a, b, t) => a + (b - a) * t, mod: (a, b) => a % b, sin: (d) => Math.sin(d * Math.PI / 180),
};
const KOD = BETIK.map((s) => s.replace(/\bv\./g, "V.").replace(/\bq\./g, "Q.").replace(/\bmath\./g, "M.")).join("\n");
const kosBetik = new Function("V", "Q", "M", KOD);
const yeniV = () => new Proxy({}, { get: (o, k) => (k in o ? o[k] : 0) });

function kostur(adimlar, { kalici = true } = {}) {
  /* adimlar: [[saniye, sorgular], ...]  ->  her karede a1..a4 */
  let V = yeniV(), t = 0;
  const kayit = [];
  for (const [sn, s] of adimlar) {
    for (let i = 0; i < Math.round(sn * 30); i++) {
      t += 1 / 30;
      if (!kalici) V = yeniV();
      const Q = Object.assign({ delta_time: 1 / 30, life_time: t, ground_speed: 0, vertical_speed: 0,
        is_on_ground: 1, is_in_water: 0, is_in_water_or_rain: 0, is_riding: 0, is_gliding: 0,
        is_swimming: 0, is_sneaking: 0, is_sleeping: 0, hurt_time: 0 }, typeof s === "function" ? s(t) : s);
      kosBetik(V, Q, M);
      kayit.push({ a: [V.pl_a1, V.pl_a2, V.pl_a3, V.pl_a4], r: [V.pl_r1, V.pl_r2, V.pl_r3, V.pl_r4], uc: V.pl_uc });
    }
  }
  return kayit;
}
const son = (k, sn = 2) => k.slice(-Math.round(sn * 30));
const ort = (k, i) => k.reduce((s, x) => s + x.a[i], 0) / k.length;
const genlik = (k, i) => Math.max(...k.map((x) => x.a[i])) - Math.min(...k.map((x) => x.a[i]));
const f1 = (x) => x.toFixed(1);

const DURUM = {
  bekleme: {},
  yurume: { ground_speed: 4.3 },
  kosma: { ground_speed: 5.6 },
  ucus_asili: { is_on_ground: 0 },
  ucus_hizli: { is_on_ground: 0, ground_speed: 11 },
  dusus: { is_on_ground: 0, vertical_speed: -25 },
  egilme: { is_sneaking: 1, ground_speed: 1.3 },
  yuzme: { is_swimming: 1, is_in_water: 1, is_on_ground: 0, ground_speed: 2 },
  binek: { is_riding: 1, ground_speed: 6 },
  uyku: { is_sleeping: 1 },
  yagmur: { is_in_water_or_rain: 1 },
};
const olcum = {};
for (const [ad, s] of Object.entries(DURUM)) olcum[ad] = son(kostur([[4, s]]));

console.log("");
console.log("=== 4. DURUMLAR (30 FPS, durum 4 sn, son 2 sn olculur) ===");
{
  const satir = (ad) => "kok " + f1(ort(olcum[ad], 0)) + "° · uc " + f1(ort(olcum[ad], 3)) + "° · dalga " + f1(genlik(olcum[ad], 3)) + "°";
  for (const ad of Object.keys(DURUM)) console.log("    " + ad.padEnd(11) + satir(ad));
  const hepsi = Object.values(olcum).flat();
  kontrol("hicbir aci govdeye girmiyor ya da tersine donmuyor (0..170)",
          hepsi.every((x) => x.a.every((a) => a >= 0 && a <= 170)));
  kontrol("kemiklere yazilan zincir mutlak aciyi veriyor (r toplami = a)",
          hepsi.every((x) => x.a.every((a, i) => Math.abs(x.r.slice(0, i + 1).reduce((s, r) => s + r, 0) - a) < 1e-6)));
  kontrol("uyurken pelerin dumduz", olcum.uyku.every((x) => x.a.every((a) => a < 0.5)));
  kontrol("beklerken hafif ve canli (kok <= 8°, dalga 0,5-8°)",
          ort(olcum.bekleme, 0) <= 8 && genlik(olcum.bekleme, 3) > 0.5 && genlik(olcum.bekleme, 3) <= 8, satir("bekleme"));
  kontrol("yurumede kalkiyor, kosmada daha cok",
          ort(olcum.yurume, 0) > ort(olcum.bekleme, 0) + 10 && ort(olcum.kosma, 0) > ort(olcum.yurume, 0) + 3,
          f1(ort(olcum.bekleme, 0)) + " < " + f1(ort(olcum.yurume, 0)) + " < " + f1(ort(olcum.kosma, 0)));
  kontrol("creative'de havada dururken DALGALANIYOR",
          genlik(olcum.ucus_asili, 3) >= 10 && ort(olcum.ucus_asili, 0) >= 8 && ort(olcum.ucus_asili, 0) <= 35, satir("ucus_asili"));
  kontrol("hizli ucusta bayrak gibi geriye akiyor, uc kivriliyor",
          ort(olcum.ucus_hizli, 0) >= 55 && ort(olcum.ucus_hizli, 3) > ort(olcum.ucus_hizli, 0) + 15, satir("ucus_hizli"));
  kontrol("duserken ruzgar alttan: pelerin kalkiyor", ort(olcum.dusus, 0) >= 60, satir("dusus"));
  kontrol("egilince govdeden aciliyor", ort(olcum.egilme, 0) > ort(olcum.bekleme, 0) + 5, satir("egilme"));
  kontrol("suda yavas ve suzulen dalga", genlik(olcum.yuzme, 3) > genlik(olcum.bekleme, 3), satir("yuzme"));
  kontrol("yagmurda/firtinada ruzgar daha cok sallar", genlik(olcum.yagmur, 3) > genlik(olcum.bekleme, 3), satir("yagmur"));
  const darbe = kostur([[2, {}], [0.1, { hurt_time: 10 }]]);
  kontrol("darbe alinca pelerin sarsiliyor", darbe[darbe.length - 1].a[0] > ort(olcum.bekleme, 0) + 2,
          f1(darbe[darbe.length - 1].a[0]) + "°");
}

console.log("");
console.log("=== 5. ZIPLAMA UCUS SAYILMIYOR, GECISLER YUMUSAK ===");
{
  /* Kosarak ziplama: 0,6 sn havada (dikey +8,4 -> -8,4), 0,3 sn yerde. */
  const zipla = (t) => {
    const p = t % 0.9;
    return p < 0.6 ? { is_on_ground: 0, ground_speed: 5.6, vertical_speed: 8.4 - 28 * p } : { ground_speed: 5.6 };
  };
  const z = kostur([[6, zipla]]).slice(30);          // ilk saniye kostum yeni giyildi
  const enCokUcus = Math.max(...z.map((x) => x.uc));
  kontrol("kosarak ziplamak ucus sayilmiyor", enCokUcus < 0.35, "ucus payi en cok " + f1(enCokUcus));
  /* Kostum ziplarken giyildi: ilk karede betik kalicilik bilmiyor ve
     yedek yola gidiyor; yalniz O kare. Iki kare olunca 0,75'e cikiyordu. */
  const giyildi = kostur([[0.34, { is_on_ground: 0, vertical_speed: 8.4 }]]);
  kontrol("havada giyilince ilk karelerde ucus sanmiyor (pay <= 0,5)",
          Math.max(...giyildi.map((x) => x.uc)) <= 0.5, f1(Math.max(...giyildi.map((x) => x.uc))));
  const sira = kostur([[2, {}], [2, { ground_speed: 5.6 }], [1, { is_on_ground: 0, vertical_speed: -25 }],
                       [2, {}], [2, { is_on_ground: 0, ground_speed: 11 }], [2, { is_sleeping: 1 }]]);
  let enCok = 0;
  for (let i = 1; i < sira.length; i++) {
    for (let j = 0; j < 4; j++) enCok = Math.max(enCok, Math.abs(sira[i].a[j] - sira[i - 1].a[j]));
  }
  kontrol("durum degisince aci bir karede 15°'den fazla ziplamiyor (420°/sn siniri)", enCok <= 15, "en cok " + f1(enCok) + "°/kare");
}

console.log("");
console.log("=== 6. DEGISKENLER KALICI DEGILSE DE CALISIYOR ===");
{
  /* Attachable degiskenlerinin kalici oldugu belgede yazmiyor. */
  const kos = son(kostur([[3, DURUM.kosma]], { kalici: false }));
  const ucus = son(kostur([[3, DURUM.ucus_asili]], { kalici: false }));
  const uyku = son(kostur([[3, DURUM.uyku]], { kalici: false }));
  kontrol("kosarken yine kalkiyor", ort(kos, 0) >= 25, f1(ort(kos, 0)) + "°");
  kontrol("havada yine dalgalaniyor", genlik(ucus, 3) >= 5, f1(genlik(ucus, 3)) + "°");
  kontrol("uyurken yine duz", uyku.every((x) => x.a.every((a) => a < 0.5)));
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> pelerin her durumda olculdu");
process.exit(hata ? 1 : 0);
