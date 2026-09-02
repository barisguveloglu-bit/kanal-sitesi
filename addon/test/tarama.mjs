/* GENEL TARAMA: her menu acilsin, her yetenek calissin  v4.99

   Kullanici: "genel olarak tum bu seyleri hallettikten sonra
   bir tarama yaptim, dosyalar icerisinde sorun varsa duzelt."

   ---- NEDEN BOYLE BIR TEST ----
   v4.94'te zirhMenusu() icinde bir `const` kendi tanimindan
   ONCE okunuyordu (gecici olu bolge). Menu her acilista
   ReferenceError atiyordu ve HICBIR TEST yakalamamisti --
   cunku menuyu ACAN test yoktu.

   Statik tarama bu hatayi guvenilir bulamiyor: ic kapsamlar,
   callback'ler ve catch parametreleri yuzunden yanlis alarm
   yagiyor (denendi, 44 supheli yerin neredeyse hepsi yanlisti).

   Guvenilir yol: HEPSINI CALISTIRMAK. Bu dosya
     - kayitli her yetenegin olustur()'unu cagiriyor
     - her menuyu aciyor ve her dugmesine basiyor
   ve hicbirinin ISTISNA ATMADIGINI sinliyor.

   Yetenegin BASARILI olmasi beklenmiyor (iksir yok, kol yok,
   hedef yok -- cogu "once iksir icmelisin" deyip donecek).
   Sinanan tek sey: COKMEMEK.                                */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, esyaKaydet, itemUseTetikle, _durum } from "@minecraft/server";
import { _menuKayit, _menuSifirla } from "@minecraft/server-ui";

esyaKaydet("pa:kol_toprak", "pa:kol_ucus", "pa:iksir_nitroksin",
           "pa:goz_beyaz", "pa:goz_beyaz_lazer");

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const BP  = KOK + "/Simsek_TNT_ToprakTopu";

const w = console.warn;

/* ---- HATA GUNLUGUNU DINLE ----

   ILK YAZDIGIMDA BU TEST ISE YARAMIYORDU. v4.94 hatasini
   pack/ kopyasina geri koyup denedim: tarama YESIL yandi.

   Sebep: menu.js secim callback'ini try/catch icinde
   cagiriyor (dogru bir karar -- bir dugmenin patlamasi
   menuyu oldurmemeli). Yani istisna disari cikmiyor,
   hataYaz'a dusuyor ve console.warn'a yaziliyor.

   "Istisna atmadi" demek yetmiyor. Asil sinama: TARAMA
   BOYUNCA HIC HATA GUNLUGE DUSMEDI.                       */
const gunluk = [];
let dinliyor = false;
console.warn = (...a) => {
  const metin = a.join(" ");
  if (dinliyor) gunluk.push(metin);
};
const sus = () => { console.warn = (...a) => {
  const metin = a.join(" ");
  if (dinliyor) gunluk.push(metin);
}; };
const ac  = () => { /* cikti zaten susturuldu */ };
const gunlukAc  = () => { gunluk.length = 0; dinliyor = true; };
const gunlukKapa = () => { dinliyor = false; return gunluk.slice(); };
/* Sadece GERCEK hatalar: hataYaz "HATA @" yaziyor,
   bilgiYaz uyari yaziyor. Uyari beklenen bir sey olabilir
   (eksik API), hata degil.                                */
const hatalar = (g) => g.filter((m) => /HATA @/.test(m));
const yazdir = (metin) => w(metin);

sus();
await import("./pack/main.js");
const ayar  = await import("./pack/ayarlar.js");
const kayit = await import("./pack/yetenekler/kayit.js");
const kollar = await import("./pack/yetenekler/kollar.js");
const { butceSifirla } = await import("./pack/butce.js");
ac();

/* BUTUN kollar ve donusum esyalari kayitli olsun.
   "Butun kollari al" dugmesi kayitli olmayan esyada hata
   veriyor -- oyunda hepsi kayitli, taramada da oyle olmali,
   yoksa gercek olmayan bir hata gorunur.                   */
esyaKaydet(...kollar.KOL_ESYALARI.map((k) => k[0]));
for (const [m] of ayar.ZIRH_MODLAR) esyaKaydet(ayar.ZIRH_CEKIRDEK_ONEK + m);
/* v5.2: Fisk gitti, Marvel geldi. Guc esyalari kayitli olsun
   -- isinlarin kapisi onlara bakiyor.                        */
for (const [k] of ayar.MARVEL_GUCLER) {
  esyaKaydet(ayar.MARVEL_ONEK + k + ayar.MARVEL_AYIRAC + k + "_powers");
}
for (const [b] of ayar.BEN10) esyaKaydet("pa:" + b);
/* Ilkel botun silahlari ve diger uretilen esyalar: uretecin
   ciktisindan degil, GERCEK esya klasorunden okunuyor ki
   liste ayrisamasin.                                       */
{
  const { readdirSync, existsSync } = await import("node:fs");
  const dizin = KOK + "/Simsek_TNT_ToprakTopu/items";
  if (existsSync(dizin)) {
    esyaKaydet(...readdirSync(dizin)
      .filter((f) => f.endsWith(".json"))
      .map((f) => "pa:" + f.replace(".json", "")));
  }
}
await new Promise((r) => setTimeout(r, 0));

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

/* Elinden geldigince GERCEK bir oyuncu: yeteneklerin
   dokundugu her sey burada olsun ki "yok" diye erken
   donmesinler ve gercek kod yolu calissin.                 */
function oyuncuYap(id, elde) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: -0.05, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = id; o.typeId = "minecraft:player";
  o.name = "TaramaOyuncu";
  o.isSneaking = false; o.isJumping = false;
  o._elde = elde; o._kafa = undefined;
  o._can = 20; o._maks = 20;
  o.addEffect = () => true;
  o.removeEffect = () => true;
  o.playAnimation = () => true;
  o.runCommand = () => ({ successCount: 1 });
  o.applyKnockback = () => true;
  o.applyImpulse = () => true;
  o.applyDamage = () => true;
  o.setOnFire = () => true;
  o.kill = () => true;
  o.teleport = () => true;
  o.sendMessage = () => {};
  /* Bakisla blok bulma: sahte dunyada yok, hedef arayan
     yetenekler onsuz gercek olmayan hata veriyor.         */
  if (typeof o.getBlockFromViewDirection !== "function") {
    o.getBlockFromViewDirection = () => undefined;
  }
  if (typeof o.getEntitiesFromViewDirection !== "function") {
    o.getEntitiesFromViewDirection = () => [];
  }
  const eskiGet = o.getComponent.bind(o);
  o.getComponent = (ad) => {
    if (ad === "minecraft:equippable") {
      return {
        getEquipment: (y) => {
          if (y === "Mainhand" && o._elde) return { typeId: o._elde };
          if (y === "Head" && o._kafa) return { typeId: o._kafa };
          return undefined;
        },
        setEquipment: () => true
      };
    }
    if (ad === "minecraft:health") {
      return {
        get currentValue() { return o._can; },
        get effectiveMax() { return o._maks; },
        defaultValue: 20,
        setCurrentValue(v) { o._can = v; },
        resetToMaxValue() { o._can = o._maks; }
      };
    }
    if (ad === "minecraft:inventory") {
      return { container: {
        size: 36, emptySlotsCount: 36,
        addItem: () => true, getItem: () => undefined,
        setItem: () => true
      } };
    }
    return eskiGet(ad);
  };
  _durum.oyuncular = [o];
  _durum.boyut = D.boyut;
  return { D, o };
}

console.log("=== 1. HER YETENEK COKMEDEN CALISIYOR ===");
{
  const hepsi = kayit.tumYetenekler();
  kontrol("yetenek defteri dolu", hepsi.length > 30, hepsi.length + " yetenek");

  const patlayan = [];
  gunlukAc();
  for (const tanim of hepsi) {
    const { o } = oyuncuYap("t_" + tanim.kimlik, "pa:kol_toprak");
    /* Lazerli yetenekler icin iksir + goz: yoksa hemen
       donuyorlar ve asil kod yolu hic calismiyor.          */
    o._kafa = "pa:goz_beyaz_lazer";
    try {
      sus();
      const is = tanim.olustur(o);
      /* Surekli is dondurduyse bir kac tur cevir: asil kod
         calis() icinde.                                    */
      if (is && typeof is.calis === "function") {
        for (let i = 0; i < 5; i++) {
          butceSifirla();
          if (is.calis()) break;
          tickIlerlet(1);
        }
        if (typeof is.bitir === "function") is.bitir();
      }
      ac();
    } catch (e) {
      ac();
      patlayan.push(tanim.kimlik + ": " + (e && e.message ? e.message : e));
    }
  }
  const g1 = hatalar(gunlukKapa());
  kontrol("hicbir yetenek istisna atmadi", patlayan.length === 0,
          patlayan.join(" | ") || (hepsi.length + " yetenek denendi"));
  kontrol("hicbir yetenek HATA GUNLUGE dusurmedi", g1.length === 0,
          g1.slice(0, 3).join(" | ") || "gunluk temiz");
}

console.log("");
console.log("=== 2. HER MENU ACILIYOR VE HER DUGMESI CALISIYOR ===");
{
  /* v4.94 hatasi tam burada saklanmisti: menuyu acan test
     yoktu. Artik sadece aciyor DEGIL, her dugmesine de
     basiyoruz -- alt menuler de acilsin.                   */
  const { o } = oyuncuYap("t_menu", "pa:kol_toprak");
  o._kafa = "pa:goz_beyaz_lazer";

  _menuSifirla();
  sus();
  itemUseTetikle({ source: o, itemStack: { typeId: "pa:kol_toprak" } });
  ac();
  const ana = _menuKayit.acilan[0];
  kontrol("ana menu acildi", !!ana,
          ana ? ana.dugmeler.length + " dugme" : "acilmadi");
  if (ana) {
    const patlayan = [];
    let acilanAltMenu = 0;
    gunlukAc();
    for (let i = 0; i < ana.dugmeler.length; i++) {
      /* Her dugme icin menuyu bastan ac: onceki secim
         durumu bir sonrakini etkilemesin.                  */
      _menuSifirla();
      sus();
      try {
        itemUseTetikle({ source: o, itemStack: { typeId: "pa:kol_toprak" } });
        const m = _menuKayit.acilan[0];
        if (m) m.form.sec(i);
        /* Alt menu acildiysa onun da her dugmesine bas. */
        const alt = _menuKayit.acilan[1];
        if (alt) {
          acilanAltMenu++;
          for (let j = 0; j < alt.dugmeler.length; j++) {
            _menuSifirla();
            itemUseTetikle({ source: o, itemStack: { typeId: "pa:kol_toprak" } });
            const m2 = _menuKayit.acilan[0];
            if (m2) m2.form.sec(i);
            const alt2 = _menuKayit.acilan[1];
            if (alt2) alt2.form.sec(j);
          }
        }
      } catch (e) {
        patlayan.push("dugme " + i + " (" +
          String(ana.dugmeler[i]).split("\n")[0].slice(0, 30) + "): " +
          (e && e.message ? e.message : e));
      }
      ac();
    }
    const g2 = hatalar(gunlukKapa());
    kontrol("hicbir dugme istisna atmadi", patlayan.length === 0,
            patlayan.join(" | ") || (ana.dugmeler.length + " dugme denendi"));
    /* ASIL SINAMA: menu.js istisnayi yutuyor, o yuzden
       "atmadi" yetmiyor -- gunluge de dusmemeli.          */
    kontrol("hicbir dugme HATA GUNLUGE dusurmedi", g2.length === 0,
            g2.slice(0, 3).join(" | ") || "gunluk temiz");
    kontrol("alt menuler de acildi", acilanAltMenu > 0,
            acilanAltMenu + " alt menu");
  }
}

console.log("");
console.log("=== 3. HER KOLUN MENUSU ACILIYOR ===");
{
  const { KOL_ESYALARI } = kollar;
  const patlayan = [];
  gunlukAc();
  for (const satir of KOL_ESYALARI) {
    const kol = satir[0];
    esyaKaydet(kol);
    const { o } = oyuncuYap("t_" + kol, kol);
    _menuSifirla();
    sus();
    try {
      itemUseTetikle({ source: o, itemStack: { typeId: kol } });
      const m = _menuKayit.acilan[0];
      if (m) for (let i = 0; i < m.dugmeler.length; i++) {
        _menuSifirla();
        itemUseTetikle({ source: o, itemStack: { typeId: kol } });
        const m2 = _menuKayit.acilan[0];
        if (m2) m2.form.sec(i);
      }
    } catch (e) {
      patlayan.push(kol + ": " + (e && e.message ? e.message : e));
    }
    ac();
  }
  const g3 = hatalar(gunlukKapa());
  kontrol("her kolun menusu cokmeden acildi", patlayan.length === 0,
          patlayan.join(" | ") || (KOL_ESYALARI.length + " kol denendi"));
  kontrol("kol menulerinde HATA GUNLUGE dusmedi", g3.length === 0,
          g3.slice(0, 3).join(" | ") || "gunluk temiz");
}

console.log("");
console.log("=== 4. HER SOHBET KOMUTU COKMUYOR ===");
{
  const mc = await import("@minecraft/server");
  const { o } = oyuncuYap("t_sohbet", "pa:kol_toprak");
  const KOMUTLAR = [
    "can 10", "can", "kalp", "yardim", "test", "bilgi", "durum",
    "kol", "kollar", "iksir", "bot", "sifirla", "beceri",
    "yok_boyle_komut", "", "   ", "can -5", "can abc"
  ];
  const patlayan = [];
  for (const k of KOMUTLAR) {
    sus();
    try {
      if (typeof mc.sohbetTetikle === "function") {
        mc.sohbetTetikle({ sender: o, message: k });
      }
    } catch (e) {
      patlayan.push('"' + k + '": ' + (e && e.message ? e.message : e));
    }
    ac();
  }
  kontrol("hicbir sohbet komutu cokmedi", patlayan.length === 0,
          patlayan.join(" | ") || (KOMUTLAR.length + " komut denendi"));
}

console.log("");
console.log("=== 5. TICK DONGUSU UZUN SUREDE COKMUYOR ===");
{
  /* Bes sistem ayni anda acikken 600 tick (30 saniye).
     Sizinti ya da gec patlayan bir hata varsa burada
     cikar.                                                */
  const { D, o } = oyuncuYap("t_tick", "pa:zirh_mod_titan");
  esyaKaydet("pa:zirh_mod_titan", "pa:kahraman_vision", "pa:ben_elmas");
  o._kafa = "pa:goz_beyaz_lazer";
  let patladi = "";
  gunlukAc();
  try {
    for (let i = 0; i < 600; i++) {
      butceSifirla();
      /* Ortalarda elindekini degistir: donusum yollari da
         calissin.                                          */
      if (i === 200) o._elde = "pa:kahraman_vision";
      if (i === 400) o._elde = "pa:ben_elmas";
      tickIlerlet(1);
    }
  } catch (e) {
    patladi = (e && e.message ? e.message : String(e));
  }
  ac();
  const g5 = hatalar(gunlukKapa());
  kontrol("600 tick boyunca istisna yok", patladi === "", patladi);
  kontrol("600 tick boyunca HATA GUNLUGE dusmedi", g5.length === 0,
          g5.slice(0, 3).join(" | ") || "gunluk temiz");
}

console.log("");
console.log("=== 6. AYARLAR TUTARLI ===");
{
  /* Disari verilen her ayarin bir DEGERI olmali: undefined
     bir ayar sessizce "kapali" gibi davranir.              */
  const bos = Object.entries(ayar).filter(([k, v]) => v === undefined);
  kontrol("hicbir ayar undefined degil", bos.length === 0,
          bos.map(([k]) => k).join(", ") || Object.keys(ayar).length + " ayar");

  /* Efekt seviyeleri motor sinirinda (0..255) -- her
     tablodaki her satir.                                   */
  const tablolar = [
    ["ZIRH_MODLAR", ayar.ZIRH_MODLAR],
    ["KAHRAMANLAR", ayar.KAHRAMANLAR],
    ["BEN10", ayar.BEN10]
  ];
  for (const [ad, tablo] of tablolar) {
    if (!tablo) continue;
    let kotu = [];
    for (const [k, t] of tablo) {
      for (const [e, , s] of (t.efektler || [])) {
        if (!(s >= 0 && s <= 255)) kotu.push(k + "/" + e + "=" + s);
      }
    }
    kontrol(ad + ": efekt seviyeleri motor sinirinda", kotu.length === 0,
            kotu.join(", ") || "temiz");
  }

  /* Direnc V (%100 bagisiklik) StarOxine'e ayrilmis; hicbir
     donusum tablosu oraya cikmamali.                       */
  for (const [ad, tablo] of tablolar) {
    if (!tablo) continue;
    let kotu = [];
    for (const [k, t] of tablo) {
      const d = (t.efektler || []).find((e) => e[0] === "resistance");
      if (d && d[2] > 3) kotu.push(k + "=Direnc " + (d[2] + 1));
    }
    kontrol(ad + ": Direnc V (dokunulmazlik) yok", kotu.length === 0,
            kotu.join(", ") || "temiz");
  }
}

console.log("");
console.log("=== 7. OLU KOD BUYUMUYOR ===");
{
  /* v4.99 taramasinda bulunanlar. Sayilar SABIT: yenisi
     eklenirse test kirilir. Amac oluyu bugun temizlemek
     degil (bazilarinin niyeti belli, bir gun baglanabilir);
     amac SESSIZCE BUYUMESINI engellemek.                   */
  const { readFileSync, readdirSync } = await import("node:fs");
  const KLASOR = BP + "/scripts";
  const dosyalar = [
    ...readdirSync(KLASOR).filter((f) => f.endsWith(".js")).map((f) => KLASOR + "/" + f),
    ...readdirSync(KLASOR + "/yetenekler").filter((f) => f.endsWith(".js"))
       .map((f) => KLASOR + "/yetenekler/" + f)
  ];
  const hepsi = dosyalar.map((f) => readFileSync(f, "utf8")).join("\n");

  /* --- kullanilmayan ithal --- */
  const kotuIthal = [];
  for (const f of dosyalar) {
    const metin = readFileSync(f, "utf8");
    const govde = metin.replace(/^import[\s\S]*?from\s+"[^"]+";/gm, "");
    for (const m of metin.matchAll(/import\s*\{([^}]*)\}\s*from\s*"([^"]+)"/g)) {
      for (let ad of m[1].split(",")) {
        ad = ad.trim().split(" as ").pop().trim();
        if (!ad) continue;
        if (!new RegExp("\\b" + ad + "\\b").test(govde)) {
          kotuIthal.push(f.split("/").pop() + ":" + ad);
        }
      }
    }
  }
  kontrol("kullanilmayan ithal yok", kotuIthal.length === 0,
          kotuIthal.join(", ") || dosyalar.length + " dosya tarandi");

  /* --- kullanilmayan ayar --- */
  const ayarMetin = readFileSync(KLASOR + "/ayarlar.js", "utf8");
  const adlar = [...ayarMetin.matchAll(/^export const (\w+)/gm)].map((m) => m[1]);
  const uretec = readFileSync(KOK + "/kol_uret.py", "utf8");
  const yorumsuz = (t) => t
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/^\s*#.*$/gm, "");
  const tumKod = yorumsuz(hepsi + "\n" + uretec);
  const oksuz = adlar.filter((a) => {
    const temiz = tumKod.replace(
      new RegExp("^export const " + a + "\\b.*$", "gm"), "");
    return !new RegExp("\\b" + a + "\\b").test(temiz);
  });
  /* Dokuz tanesi ONCEDEN beri oksuz ve ayarlar.js'te
     isaretli. Sayi ARTMAMALI.                             */
  kontrol("oksuz ayar sayisi artmadi", oksuz.length <= 9,
          oksuz.length + " tane: " + oksuz.join(", "));
  kontrol("oksuz ayarlar ayarlar.js'te isaretli",
          oksuz.length === 0 ||
          ayarMetin.includes("KULLANILMAYAN AYARLAR"),
          "isaret satiri var mi");
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> Tarama temiz");
process.exit(hata ? 1 : 0);
