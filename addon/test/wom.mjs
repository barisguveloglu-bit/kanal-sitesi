import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, vurusTetikle } from "@minecraft/server";
import { readFileSync, existsSync, readdirSync } from "node:fs";
const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const BP = KOK + "/Simsek_TNT_ToprakTopu";
const RP = KOK + "/Simsek_Kol_Kaynak";

const w = console.warn; console.warn = () => {};
await import("./pack/main.js");
console.warn = w;

const ayar = await import("./pack/ayarlar.js");
const dovus = await import("./pack/yetenekler/wom_dovus.js");

/* ================================================================
   WEAPONS OF MIRACLES + EPIC FIGHT DOVUS ANIMASYONLARI   v7.98.0

   v5.0-v5.5'te animasyonlar "olculebilen her sey duzgun" iken
   oyunda bozuktu ve v5.8'de silindi. O zamanki olcutler EKSENIN
   dogru olup olmadigini sormuyordu; onizleme de ceviriyle ayni
   kabulu paylasiyordu.

   Bu dosyanin 5. bolumu o boslugu kapatiyor: Epic Fight'in KENDI
   pozu (kaynak_anim/wom/olcu.json, arac/ef_anim_dogrula.py
   uretti) ile Bedrock dosyasinin OYUNDA verecegi poz
   karsilastiriliyor. Tahmin burada UCUNCU ve ayri bir uygulamayla
   yapiliyor (JS) -- ne cevirici ne dogrulayici paylasiliyor.
   Ortak olan yalniz Blockbench kurali ve vanilla hiyerarsi;
   ikisi de bu dosyada yaziyla, kaynagiyla.
   ================================================================ */
let hata = 0;
function kontrol(ad, kosul, ek) {
  if (kosul) console.log("  ✓ " + ad + (ek ? "  ::  " + ek : ""));
  else { console.log("  ✗ " + ad + (ek ? "  ::  " + ek : "")); hata++; }
}
const oku = (y) => JSON.parse(readFileSync(y, "utf8"));

console.log("=== 1. SILAH TABLOSU: AYARLAR = URETEC ===");
{
  /* Iki tablo iki dilde (JS oyun icin, Python uretim icin).
     Ayrisirlarsa menu bir sey, esya baska bir sey der.       */
  const py = readFileSync(KOK + "/kol_uret.py", "utf8");
  const blok = py.slice(py.indexOf("WOM = ["), py.indexOf("]", py.indexOf("WOM = [") + 8) + 1);
  const satir = [...blok.matchAll(/\("([a-z_]+)",\s*"([^"]+)",\s*"([^"]+)",\s*([-\d.]+),\s*([-\d.]+),\s*(\d+),\s*"([A-Z]+)"\)/g)];
  kontrol("uretecte 27 silah", satir.length === 27, String(satir.length));
  kontrol("ayarlarda 27 silah", ayar.WOM_SILAHLAR.size === 27, String(ayar.WOM_SILAHLAR.size));
  let uyusmayan = [];
  for (const m of satir) {
    const t = ayar.WOM_SILAHLAR.get(m[1]);
    if (!t) { uyusmayan.push(m[1] + " (ayarda yok)"); continue; }
    if (t.ad !== m[2] || t.en !== m[3] || t.javaHasar !== +m[4] ||
        t.javaHiz !== +m[5] || t.dayaniklilik !== +m[6] || t.nadirlik !== m[7]) {
      uyusmayan.push(m[1]);
    }
    /* bedrock = java + 1: Java'da degistirici, Bedrock'ta toplam */
    if (t.hasar !== Math.round(t.javaHasar) + 1) uyusmayan.push(m[1] + " hasar");
  }
  kontrol("iki tablo birebir ayni", uyusmayan.length === 0, uyusmayan.join(", "));
  kontrol("her silahin bir vurus serisi var",
          [...ayar.WOM_SILAHLAR.keys()].every((k) => ayar.WOM_SERI.has(k)));
}

console.log("");
console.log("=== 2. ESYALAR URETIMDE VAR (alti kalem) ===");
{
  const atlas = oku(RP + "/textures/item_texture.json").texture_data;
  const tr = readFileSync(RP + "/texts/tr_TR.lang", "utf8");
  const en = readFileSync(RP + "/texts/en_US.lang", "utf8");
  let eksik = [];
  for (const [k, t] of ayar.WOM_SILAHLAR) {
    const ad = "wom_" + k;
    const y = BP + "/items/" + ad + ".json";
    if (!existsSync(y)) { eksik.push(ad + " esya"); continue; }
    const c = oku(y)["minecraft:item"].components;
    if (c["minecraft:damage"] !== t.hasar) eksik.push(ad + " hasar");
    if (c["minecraft:durability"].max_durability !== t.dayaniklilik) eksik.push(ad + " dayaniklilik");
    if (c["minecraft:icon"].texture !== ad) eksik.push(ad + " ikon adi");
    if (!atlas[ad]) eksik.push(ad + " atlas");
    if (!existsSync(RP + "/textures/item/" + ad + ".png")) eksik.push(ad + " png");
    if (!existsSync(KOK + "/kaynak_doku/" + ad + ".png")) eksik.push(ad + " kaynak png");
    /* Nadirlik ADIN RENGIYLE; display_name dili ezdigi icin renk
       dil dosyasinda da ayni (denetim.mjs 4. bolum).          */
    const renk = { COMMON: "§f", UNCOMMON: "§a", RARE: "§b", EPIC: "§d" }[t.nadirlik];
    if (c["minecraft:display_name"].value !== renk + t.ad) eksik.push(ad + " ad rengi");
    if (!tr.includes("item.pa:" + ad + ".name=" + renk + t.ad + "\n")) eksik.push(ad + " tr");
    if (!en.includes("item.pa:" + ad + ".name=" + renk + t.en + "\n")) eksik.push(ad + " en");
  }
  kontrol("27 silahin 27'si tam (esya+ikon+atlas+dil)", eksik.length === 0, eksik.slice(0, 5).join(", "));
  /* Uretecin temizlik listesi: dorduncu kez dusulmesin. */
  const py = readFileSync(KOK + "/kol_uret.py", "utf8");
  kontrol("temizlik listesi WoM'u tutuyor",
          /for _wk3 in WOM:\s*\n\s*beklenen\.add\(WOM_ONEK \+ _wk3\[0\]\)/.test(py));
}

console.log("");
console.log("=== 3. ANIMASYON DOSYASI ===");
const A = existsSync(RP + "/animations/wom_dovus.animation.json")
  ? oku(RP + "/animations/wom_dovus.animation.json").animations : {};
{
  const kaynak = KOK + "/kaynak_anim/wom/wom_dovus.animation.json";
  kontrol("kaynak dosya depoda", existsSync(kaynak));
  kontrol("pakete birebir kopyalanmis", existsSync(kaynak) &&
          readFileSync(kaynak, "utf8") === readFileSync(RP + "/animations/wom_dovus.animation.json", "utf8"));
  const adim = new Set();
  for (const s of ayar.WOM_SERI.values()) s.forEach((x) => adim.add(ayar.WOM_ANIM_ONEK + x));
  const yok = [...adim].filter((x) => !A[x]);
  kontrol("serilerdeki her adim dosyada", yok.length === 0, adim.size + " adim" + (yok.length ? ", yok: " + yok.join(",") : ""));
  const fazla = Object.keys(A).filter((x) => !adim.has(x));
  kontrol("dosyada seride olmayan animasyon yok", fazla.length === 0, fazla.join(","));

  const VANILLA = new Set(["root", "waist", "body", "head", "rightArm", "leftArm", "rightLeg", "leftLeg"]);
  let kotu = [];
  let sicrama = 0;
  for (const [ad, a] of Object.entries(A)) {
    if (a.override_previous_animation !== true) kotu.push(ad + " override");
    if (a.loop !== false) kotu.push(ad + " loop");
    for (const [k, b] of Object.entries(a.bones)) {
      if (!VANILLA.has(k)) kotu.push(ad + " kemik " + k);
      const ks = Object.keys(b.rotation || {}).sort((x, y) => +x - +y);
      for (let i = 1; i < ks.length; i++) {
        const p = b.rotation[ks[i - 1]], q = b.rotation[ks[i]];
        if (p.some((v, n) => Math.abs(q[n] - v) > 180)) sicrama++;
      }
    }
  }
  kontrol("hepsi override, loop yok, yalniz vanilla kemikler", kotu.length === 0, kotu.slice(0, 4).join(", "));
  /* v5.4'un "dans"i: ayni donusun iki yazilisi arasinda Bedrock'un
     duz gecisi 359 derece savruluyordu.                          */
  kontrol("ardisik karelerde 180'i asan sicrama yok", sicrama === 0, String(sicrama));
}

console.log("");
console.log("=== 4. KAYBOLMA: sifir olcekli kareler ===");
{
  /* Kaynakta isinlanma hareketleri Root'u o an SIFIR matris
     yapiyor (karakter gorunmez). moonless_auto_3 ilk 0.18 sn.
     Donusu tanimsiz; kuaterniyona cevirmek butun bedeni 180
     derece ceviriyordu. Karsiligi root'a OLCEK 0.            */
  const m = A[ayar.WOM_ANIM_ONEK + "moonless_auto_3"];
  const olcek = m && m.bones.root && m.bones.root.scale;
  kontrol("moonless_auto_3 root olcegi tasiyor", !!olcek);
  if (olcek) {
    kontrol("  basta gorunmez (0)", olcek["0.0000"] === 0, JSON.stringify(olcek["0.0000"]));
    const son = Object.keys(olcek).sort((x, y) => +x - +y).pop();
    kontrol("  sonda gorunur (1)", Math.abs(olcek[son] - 1) < 0.01, JSON.stringify(olcek[son]));
  }
}

console.log("");
console.log("=== 5. POZ: EPIC FIGHT'IN KENDISINE KARSI ===");
{
  /* BLOCKBENCH KURALI (js/animations/keyframe.js
     compileBedrockKeyframe, js/io/format.ts euler_order 'ZYX'):
       ic donus = (-x, -y, +z) derece,  M = Rz . Ry . Rx
     Vanilla'yla sinandi: zombi kollari x=-90 ONE, yuzme -180
     YUKARI, nefes sallanmasi sag kol z>0 DISA.
     HIYERARSI: vanilla geometry.humanoid.custom (mobs.json).   */
  const ATA = { root: null, waist: "root", body: "waist", head: "body",
                rightArm: "body", leftArm: "body", rightLeg: "root", leftLeg: "root" };
  const r = (d) => d * Math.PI / 180;
  const mm = (a, b) => a.map((ri) => [0, 1, 2].map((j) => ri[0] * b[0][j] + ri[1] * b[1][j] + ri[2] * b[2][j]));
  const mat = ([fx, fy, fz]) => {
    const x = r(-fx), y = r(-fy), z = r(fz);
    const Rx = [[1, 0, 0], [0, Math.cos(x), -Math.sin(x)], [0, Math.sin(x), Math.cos(x)]];
    const Ry = [[Math.cos(y), 0, Math.sin(y)], [0, 1, 0], [-Math.sin(y), 0, Math.cos(y)]];
    const Rz = [[Math.cos(z), -Math.sin(z), 0], [Math.sin(z), Math.cos(z), 0], [0, 0, 1]];
    return mm(mm(Rz, Ry), Rx);
  };
  /* Bedrock: kareler arasi her eksen AYRI ve DUZ. */
  const deger = (kanal, t) => {
    const ks = Object.keys(kanal).map(Number).sort((a, b) => a - b);
    const al = (k) => kanal[Object.keys(kanal).find((x) => +x === k)];
    if (t <= ks[0]) return al(ks[0]);
    if (t >= ks[ks.length - 1]) return al(ks[ks.length - 1]);
    for (let i = 1; i < ks.length; i++) {
      if (ks[i] >= t) {
        const u = (t - ks[i - 1]) / (ks[i] - ks[i - 1]);
        const a = al(ks[i - 1]), b = al(ks[i]);
        return a.map((v, n) => v + (b[n] - v) * u);
      }
    }
  };
  const dunya = (anim, kemik, t) => {
    const yol = [];
    for (let k = kemik; k; k = ATA[k]) yol.unshift(k);
    let m = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    for (const k of yol) {
      const b = anim.bones[k];
      if (b && b.rotation) m = mm(m, mat(deger(b.rotation, t)));
    }
    return m;
  };
  const aci = (a, b) => {
    const na = Math.hypot(...a), nb = Math.hypot(...b);
    const c = (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (na * nb);
    return Math.acos(Math.max(-1, Math.min(1, c))) * 180 / Math.PI;
  };

  const izYol = KOK + "/kaynak_anim/wom/olcu.json";
  kontrol("parmak izi depoda", existsSync(izYol));
  const iz = existsSync(izYol) ? oku(izYol).animasyonlar : {};
  kontrol("her animasyonun parmak izi var",
          Object.keys(A).every((a) => iz[a]), Object.keys(iz).length + " iz");
  let ornek = 0, asan = 0, enKotu = [0, ""];
  for (const [ad, olcumler] of Object.entries(iz)) {
    const anim = A[ad];
    if (!anim) continue;
    for (const [olcum, o] of Object.entries(olcumler)) {
      for (const [t, gx, gy, gz] of o.yon) {
        const m = dunya(anim, o.kemik, t);
        const d = o.dinlenme;
        const tahmin = [0, 1, 2].map((i) => m[i][0] * d[0] + m[i][1] * d[1] + m[i][2] * d[2]);
        const h = aci(tahmin, [gx, gy, gz]);
        ornek++;
        if (h > 12) asan++;
        if (h > enKotu[0]) enKotu = [h, ad.replace(ayar.WOM_ANIM_ONEK, "") + " " + olcum + " t=" + t];
      }
    }
  }
  kontrol("ornek sayisi anlamli (>5000)", ornek > 5000, String(ornek));
  kontrol("hicbir ornek 12 dereceyi asmiyor", asan === 0,
          asan + " asan · en kotu " + enKotu[0].toFixed(1) + " (" + enKotu[1] + ")");
}

console.log("");
console.log("=== 6. SERI: VURDUKCA SIRAYLA ===");
{
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, { x: 0.5, y: 64, z: 0.5 });
  o.id = "w1"; o.typeId = "minecraft:player";
  const oynayan = [];
  o.playAnimation = (ad, sec) => oynayan.push({ ad, sec });
  o._elde = "pa:wom_solar";
  dovus.womDovusUnut();

  const hedef = { typeId: "minecraft:zombie", id: "z1" };
  for (let i = 0; i < 5; i++) {
    vurusTetikle({ damagingEntity: o, hitEntity: hedef });
    tickIlerlet(5);
  }
  const s = ayar.WOM_SERI.get("solar").map((x) => ayar.WOM_ANIM_ONEK + x);
  kontrol("vurus basina bir animasyon", oynayan.length === 5, String(oynayan.length));
  kontrol("sirayla oynuyor, sonra basa donuyor",
          JSON.stringify(oynayan.map((x) => x.ad)) === JSON.stringify([s[0], s[1], s[2], s[3], s[0]]),
          oynayan.map((x) => x.ad.replace(ayar.WOM_ANIM_ONEK, "")).join(" "));
  /* BIRINCI SAHIS: kollar kameranin etrafinda savrulmasin. */
  kontrol("durdurma ifadesi birinci sahis",
          oynayan.every((x) => x.sec && x.sec.stopExpression === ayar.WOM_DURDUR) &&
          ayar.WOM_DURDUR.includes("is_first_person"));

  oynayan.length = 0;
  tickIlerlet(ayar.WOM_SERI_UNUTMA + 1);
  vurusTetikle({ damagingEntity: o, hitEntity: hedef });
  kontrol("uzun ara sonra seri basa doner", oynayan[0] && oynayan[0].ad === s[0]);

  oynayan.length = 0;
  o._elde = "minecraft:diamond_sword";
  vurusTetikle({ damagingEntity: o, hitEntity: hedef });
  kontrol("WoM silahi degilse hicbir sey oynamiyor", oynayan.length === 0);

  /* API yoksa komut: ayni ifadeyle. */
  delete o.playAnimation;
  const komutlar = [];
  o.runCommand = (k) => komutlar.push(k);
  o._elde = "pa:wom_agony";
  vurusTetikle({ damagingEntity: o, hitEntity: hedef });
  kontrol("komut yolu da birinci sahista duruyor",
          komutlar.length === 1 && komutlar[0].includes(ayar.WOM_DURDUR), komutlar[0]);
}

console.log("");
console.log("=== 7. MENU ===");
{
  const m = readFileSync(BP + "/scripts/main.js", "utf8");
  kontrol("katalog menude", /calis\(\) \{ womMenusu\(oyuncu\); \}/.test(m));
  kontrol("oyuncu cikinca seri unutuluyor", /womDovusUnut\(olay\.playerId\)/.test(m));
  /* v7.98.0'da bulundu: Zaman Saati menusu menuAc'e DIZGI
     listesi veriyordu (liste.map((x) => x.ad)); menuAc
     liste[i].ad okudugu icin her dugme "undefined" yaziyordu
     (v7.2'den beri). Hicbir cagri dizgi vermesin.             */
  const cagrilar = [...m.matchAll(/menuAc\(([\s\S]*?)\);/g)].map((x) => x[1]);
  const dizgi = cagrilar.filter((c) => /\.map\(\(\w+\) => \w+\.ad\)/.test(c));
  kontrol("hicbir menuAc cagrisi dizgi listesi vermiyor", dizgi.length === 0,
          cagrilar.length + " cagri" + (dizgi.length ? ", dizgi: " + dizgi.length : ""));
}

console.log("");
console.log(hata ? "HATA : " + hata : "temiz");
process.exit(hata ? 1 : 0);
