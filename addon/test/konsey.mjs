/* KONSEY  (CodeMan / Astra Studios + BoraLo / Dragon Studios)  v6.2

   Kullanici: "yeni boralo notlari buldum, bunlardan alabildigimizi
   alalim, esya dahil her sey."

   ---- BU DOSYANIN TUTTUGU SEY ----
   Kostum UC parcadan olusuyor ve ucu de olmadan calismiyor:
   esya + attachable/model/doku + oyuncuya gorunmezlik. Uc
   parcanin da yerinde oldugu ve BIRBIRINI GOSTERDIGI sinaniyor
   -- v4.83 dersi: "calisiyor mu" ile "ulasilabiliyor mu" ayri
   sorular, ve v4.48 dersi: listede olmayan dosyayi temizlik
   adimi siliyor.

   Sayilar KAYNAK EKLENTININ kendi esya JSON'undan dogrulaniyor,
   referans dosyasindan degil.                                  */

import { readFileSync, existsSync } from "node:fs";

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const BP = KOK + "/Simsek_TNT_ToprakTopu";
const RP = KOK + "/Simsek_Kol_Kaynak";
const CM = "/tmp/cm";
const BL = "/tmp/bl";
const FL = "/tmp/fl";   // Falen Mod V2 (Trb1545), v7.0

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };
sus();
await import("./pack/main.js");
ac();
const ayar = await import("./pack/ayarlar.js");
const kollar = await import("./pack/yetenekler/kollar.js");
const kayit = await import("./pack/yetenekler/kayit.js");
const yetenek = (k) => kayit.tumYetenekler().find((y) => y.kimlik === k);

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const oku = (y) => JSON.parse(readFileSync(y, "utf8"));

/* Tablo kol_uret.py'den okunuyor: iki yerde yazsaydik biri
   guncellenip oteki unutulurdu.                              */
const uretec = readFileSync(KOK + "/kol_uret.py", "utf8");
const blok = uretec.slice(uretec.indexOf("KONSEY = ["),
                          uretec.indexOf("def konsey_esyasi"));
const KONSEY = [];
for (const m of blok.matchAll(
    /\("(\w+)",\s*"([^"]*)",\s*"(\w+)",\s*"(\w*)",\s*(\d+),\s*(\d+),\s*(\d+)\)/g)) {
  KONSEY.push({ anahtar: m[1], ad: m[2], tur: m[3], yuva: m[4],
                koruma: +m[5], dayaniklilik: +m[6], hasar: +m[7] });
}

/* Duz parcalar (3B modeli olmayan, yalniz ikonu olan) kumesi
   kol_uret.py'den OKUNUYOR. Elle ikinci bir liste tutmak,
   ayrisan iki liste demekti.                                */
const duz = new Set();
{
  const u = readFileSync(KOK + "/kol_uret.py", "utf8");
  const m = u.match(/KONSEY_DUZ = \{([\s\S]*?)\}/);
  if (m) for (const x of m[1].matchAll(/"(\w+)"/g)) duz.add(x[1]);
}

console.log("=== 1. TABLO OKUNDU ===");
{
  /* 54 -> 58 (v7.0, Kurban zirhi) -> 68 (v7.1, Void takimi).
     Sayi ELLE tutuluyor ki yeni parca sessizce eklenemesin. */
  kontrol("68 parca", KONSEY.length === 68, KONSEY.length + " parca");
  const turler = {};
  for (const t of KONSEY) turler[t.tur] = (turler[t.tur] || 0) + 1;
  kontrol("tur dagilimi", turler.kostum === 6 && turler.deri === 4 &&
          turler.maske === 4 && turler.kolluk === 14 && turler.asa === 7 &&
          turler.alet === 9 && turler.zirh === 14 && turler.silah === 6 &&
          turler.dusmus === 4, JSON.stringify(turler));
  const adlar = new Set(KONSEY.map((t) => t.anahtar));
  kontrol("anahtarlar benzersiz", adlar.size === KONSEY.length);
}

console.log("");
console.log("=== 2. UC PARCA DA YERINDE ===");
{
  let eksik = 0;
  for (const t of KONSEY) {
    const ad = "kns_" + t.anahtar;
    for (const [ne, yol] of [
      ["esya", BP + "/items/" + ad + ".json"],
      ["model", RP + "/models/entity/" + ad + ".geo.json"],
      ["doku", RP + "/textures/entity/" + ad + ".png"],
      ["attachable", RP + "/attachables/" + ad + ".json"],
      ["ikon", RP + "/textures/item/" + ad + ".png"]
    ].filter(([ne]) => !(duz.has(t.anahtar) && ne !== "ikon"))) {
      if (!existsSync(yol)) { eksik++; kontrol(ad + ": " + ne, false, yol); }
    }
  }
  kontrol("her parcanin gereken dosyalari var (duz olanlarda yalniz ikon)",
          eksik === 0, eksik + " eksik");

  /* Attachable model ve dokuyu DOGRU gosteriyor mu? Yanlis
     gosterse oyunda mor-siyah kup cikar ve sebebi gorunmez. */
  let yanlis = 0;
  for (const t of KONSEY) {
    const ad = "kns_" + t.anahtar;
    const y = RP + "/attachables/" + ad + ".json";
    if (!existsSync(y)) continue;
    const a = oku(y)["minecraft:attachable"].description;
    if (a.identifier !== "pa:" + ad) yanlis++;
    if (a.geometry.default !== "geometry." + ad) yanlis++;
    if (a.textures.default !== "textures/entity/" + ad) yanlis++;
    const g = oku(RP + "/models/entity/" + ad + ".geo.json");
    if (g["minecraft:geometry"][0].description.identifier !== "geometry." + ad) yanlis++;
  }
  kontrol("attachable -> model -> doku zinciri tutuyor", yanlis === 0,
          yanlis + " kopuk");

  /* ---- ARTIK DOSYA: BEKLENMEYEN `kns_` VAR MI ----
     Var olmasi gerekenleri saymak YETMIYOR. Parcalar
     `kol_*`ten `kolluk_*`e yeniden adlandirilinca 14 eski
     `.geo.json` pakette KALDI: atlasta ve dil dosyasinda
     yoklardi, yani oyunda gorunmuyorlardi ama pakete
     giriyorlardi. Temizlik adiminin geometri onek listesinde
     `kns_` yoktu. Bu bolum o hatanin sessizce donmesini
     engelliyor.                                             */
  const { readdirSync } = await import("node:fs");
  const beklenen = new Set(KONSEY.map((t) => "kns_" + t.anahtar));
  let artik = [];
  for (const [klasor, uzanti] of [
    [BP + "/items", ".json"],
    [RP + "/attachables", ".json"],
    [RP + "/models/entity", ".geo.json"],
    [RP + "/textures/entity", ".png"],
    [RP + "/textures/item", ".png"]
  ]) {
    if (!existsSync(klasor)) continue;
    for (const f of readdirSync(klasor)) {
      if (!f.startsWith("kns_") || !f.endsWith(uzanti)) continue;
      const ad = f.slice(0, -uzanti.length);
      if (!beklenen.has(ad)) artik.push(klasor.split("/").pop() + "/" + f);
    }
  }
  kontrol("pakette artik `kns_` dosyasi yok", artik.length === 0,
          artik.slice(0, 6).join(", ") || "temiz");

  /* Atlas kaydi: ikon dosyasi olsa da atlasta yoksa esya
     mor-siyah gorunur.                                      */
  const atlas = oku(RP + "/textures/item_texture.json").texture_data;
  const atlasEksik = KONSEY.filter((t) => !atlas["kns_" + t.anahtar]);
  kontrol("hepsi item_texture atlasinda", atlasEksik.length === 0,
          atlasEksik.map((t) => t.anahtar).join(", ") || "68/68");
}

console.log("");
console.log("=== 3. SAYILAR KAYNAK EKLENTIDEN ===");
{
  /* Bizim kisa adimiz -> kaynak dosya adi. konsey_al.py'den
     okunuyor.                                               */
  const al = readFileSync(KOK + "/konsey_al.py", "utf8");
  const pblok = al.slice(al.indexOf("PARCALAR = ["), al.indexOf("SESLER = ["));
  const esleme = {};
  for (const m of pblok.matchAll(/\("(\w+)",\s*(CM|BL|FL),\s*"(\w+)"\)/g)) {
    esleme[m[1]] = [m[2], m[3]];
  }
  kontrol("68 esleme okundu", Object.keys(esleme).length === 68,
          Object.keys(esleme).length + " esleme");

  /* Kaynak paketin behavior klasoru (adinda bosluk ve § var). */
  const { readdirSync } = await import("node:fs");
  function bpKlasor(paket) {
    const ust = paket === "CM" ? CM
              : paket === "FL" ? FL
              : BL + "/ac_BoraLoModV1Beta";
    if (!existsSync(ust)) return null;
    const d = readdirSync(ust).find((x) => x.endsWith("_behavior_pack"));
    return d ? ust + "/" + d : null;
  }
  const kokBP = { CM: bpKlasor("CM"), BL: bpKlasor("BL"), FL: bpKlasor("FL") };
  if (!kokBP.CM) {
    console.log("  · kaynak eklentiler diskte degil, karsilastirma atlandi");
  } else {
    let sapan = 0, bakilan = 0;
    for (const t of KONSEY) {
      const [paket, kaynak] = esleme[t.anahtar] || [];
      if (!paket) { kontrol(t.anahtar + ": eslemesi var", false); continue; }
      /* Her paketin kendi dosya oneki. konsey_al.py:PAKETLER
         ile AYNI kalmali -- ayrisirlarsa test kaynak esyayi
         bulamaz ve "eksik" der, oysa parca yerinde olur.   */
      const onek = paket === "CM" ? "klezy_"
                 : paket === "FL" ? "sp_" : "dragon_";
      const y = kokBP[paket] + "/items/" + onek + kaynak + ".json";
      if (!existsSync(y)) { kontrol(t.anahtar + ": kaynak esyasi var", false, y); continue; }
      bakilan++;
      const c = oku(y)["minecraft:item"].components;
      const kd = c["minecraft:damage"];
      const khasar = typeof kd === "number" ? kd : (kd ? kd.value || 0 : 0);
      if (khasar !== t.hasar) {
        sapan++;
        kontrol(t.anahtar + ": hasar birebir", false,
                "kaynak " + khasar + " · tablo " + t.hasar);
      }
      /* ---- TEK BILEREK DEGISTIRILEN SAYI ----
         Dusmus parcalarinin korumasi kaynakta 1000. Orada bu
         bir CEZA durumu (kurban zaten kimildayamiyor); bizde
         esya menuden alinabildigi icin onu giyen pratikte
         DOKUNULMAZ oluyordu. Kullanici karariyla 750.
         Muafiyet BURADA yaziyor ki "sapma yok" iddiasi
         yalan olmasin.                                     */
      const dusmusMuaf = t.tur === "dusmus";
      const kw = c["minecraft:wearable"];
      const kyuva = kw ? String(kw.slot).replace("slot.armor.", "") : "";
      if (kyuva !== t.yuva) {
        sapan++;
        kontrol(t.anahtar + ": yuva birebir", false,
                "kaynak '" + kyuva + "' · tablo '" + t.yuva + "'");
      }
      /* Koruma kaynakta IKI ayri yerde olabiliyor:
           minecraft:wearable.protection   (CodeMan/BoraLo)
           minecraft:armor.protection      (Falen)
         Ikisine de bakiliyor.                              */
      const karmor = c["minecraft:armor"];
      const kkor = (kw && kw.protection) ||
                   (karmor && karmor.protection) || 0;
      if (dusmusMuaf) {
        if (!(kkor === 1000 && t.koruma === 750)) {
          sapan++;
          kontrol(t.anahtar + ": Dusmus muafiyeti dogru", false,
                  "kaynak " + kkor + " · tablo " + t.koruma);
        }
      } else if (t.yuva && kkor !== t.koruma) {
        /* ---- BU SATIR v7.0'DA EKLENDI ----
           Korumayi 7'den 9'a cikararak kasten kirdigimda
           HICBIR test dusmedi: koruma yalnizca Dusmus
           muafiyeti icin okunuyordu, normal parcalarda hic
           karsilastirilmiyordu. 54 parca boyunca acik duran
           bir bosluktu.                                    */
        sapan++;
        kontrol(t.anahtar + ": koruma birebir", false,
                "kaynak " + kkor + " · tablo " + t.koruma);
      }
      const kdur = c["minecraft:durability"];
      const kday = kdur ? (kdur.max_durability || 0) : 0;
      if (kday !== t.dayaniklilik) {
        sapan++;
        kontrol(t.anahtar + ": dayaniklilik birebir", false,
                kday + " vs " + t.dayaniklilik);
      }
    }
    kontrol("68 parca kaynakta bulundu", bakilan === 68, bakilan + "/68");
    kontrol("hicbir sayi kaynaktan sapmiyor", sapan === 0, sapan + " sapma");
  }
}

console.log("");
console.log("=== 4. GORUNMEZLIK LISTESI UYDURULMADI ===");
{
  /* Kaynakta her gizleyen parca icin bir `<ad>_effect.mcfunction`
     var. Listemiz TAM O DOSYALARIN kumesi olmali -- fazlasi
     "uydurduk", eksigi "atladik" demek.                      */
  const { readdirSync } = await import("node:fs");
  const fn = CM + "/astra studios mod_behavior_pack/functions";
  if (!existsSync(fn)) {
    console.log("  · kaynak eklenti diskte degil, karsilastirma atlandi");
  } else {
    const kaynakEffect = new Set(
      readdirSync(fn).filter((f) => f.endsWith("_effect.mcfunction"))
        .map((f) => f.replace(/^klezy_/, "").replace(/_effect\.mcfunction$/, "")));
    kontrol("kaynakta 14 `_effect` dosyasi var", kaynakEffect.size === 14,
            kaynakEffect.size + " dosya");

    const al = readFileSync(KOK + "/konsey_al.py", "utf8");
    const pblok = al.slice(al.indexOf("PARCALAR = ["), al.indexOf("SESLER = ["));
    const bizden = {};
    for (const m of pblok.matchAll(/\("(\w+)",\s*(CM|BL),\s*"(\w+)"\)/g)) {
      bizden["kns_" + m[1]] = m[3];
    }
    const bizimKaynaklar = new Set(
      [...ayar.KONSEY_GORUNMEZ.keys()].map((k) => bizden[k]));
    const fazla = [...bizimKaynaklar].filter((k) => !kaynakEffect.has(k));
    const eksik = [...kaynakEffect].filter((k) => !bizimKaynaklar.has(k));
    kontrol("gorunmezlik listesi kaynakla AYNI",
            fazla.length === 0 && eksik.length === 0,
            "fazla: [" + fazla.join(",") + "] eksik: [" + eksik.join(",") + "]");

    /* Kollar ve Kemik Maskesi LISTEDE OLMAMALI: onlar oyuncunun
       ustune biniyor, yerine gecmiyor. Gorunmezlik verseydik
       kolsuz bir hayalet olurdun.                            */
    kontrol("Kemik Maskesi gizlemiyor",
            !ayar.KONSEY_GORUNMEZ.has("kns_maske_kemik"));
    const kolluklar = KONSEY.filter((t) => t.tur === "kolluk")
      .filter((t) => ayar.KONSEY_GORUNMEZ.has("kns_" + t.anahtar));
    kontrol("hicbir kolluk gizlemiyor", kolluklar.length === 0,
            kolluklar.map((t) => t.anahtar).join(", ") || "14/14 temiz");
  }

  /* Yuva da dogru olmali: elde tutmak kostumu giymek degil. */
  let yanlisYuva = 0;
  for (const [kimlik, yuva] of ayar.KONSEY_GORUNMEZ) {
    const t = KONSEY.find((x) => "kns_" + x.anahtar === kimlik);
    if (!t) { yanlisYuva++; continue; }
    const beklenen = t.yuva === "head" ? "Head" : "Chest";
    if (yuva !== beklenen) yanlisYuva++;
  }
  kontrol("gorunmezlik yuvalari esya yuvasiyla ayni", yanlisYuva === 0,
          yanlisYuva + " yanlis");

  kontrol("efekt suresi taramadan UZUN (kare kacmasin)",
          ayar.KONSEY_SURE > ayar.KONSEY_TARAMA,
          ayar.KONSEY_SURE + " > " + ayar.KONSEY_TARAMA);
}

console.log("");
console.log("=== 5. AD ALANI TEMIZ ===");
{
  /* Kaynak paketlerin dil dosyalarinda BASKA bir eklentiden
     kalma yuzlerce `pa:` satiri var (PA-Fridge, PA-Shark...).
     `pa:` BIZIM ad alanimiz; o satirlarin hicbiri bize
     gecmemis olmali.                                        */
  const tr = readFileSync(RP + "/texts/tr_TR.lang", "utf8");
  const kirli = ["PA-Fridge", "PA-Shark", "PA-Pizza", "PA-Pacman",
                 "PA-Laptop", "PA-Toilet"];
  const bulasan = kirli.filter((k) => tr.includes(k));
  kontrol("baska eklentinin `pa:` artiklari gecmemis",
          bulasan.length === 0, bulasan.join(", ") || "temiz");

  /* Geometri kimlikleri yeniden adlandirilmis olmali:
     `klezy_*` bizim ad alanimiz degil ve iki paket ayni anda
     kuruluysa carpisir.                                     */
  let klezyKalan = 0;
  for (const t of KONSEY) {
    const y = RP + "/models/entity/kns_" + t.anahtar + ".geo.json";
    if (!existsSync(y)) continue;
    const ham = readFileSync(y, "utf8");
    if (ham.includes("geometry.klezy_") || ham.includes("geometry.dragon_") ||
        ham.includes("geometry.sp_")) klezyKalan++;
  }
  kontrol("hicbir modelde kaynak ad alani kalmamis", klezyKalan === 0,
          klezyKalan + " model");
}

console.log("");
console.log("=== 6. SILAHLAR VE ASA SESI (v6.3) ===");
{
  /* Kaynakta iki silahin da MERMISI carpinca kurbani
     donduruyor (biogunyap1 / bobbygundirt1). Ay Isigi'nin ses
     DOSYASI pakette duruyor ama modun kendisi hic calmiyor
     (`moonlightstaffsong1` BOS bir dosya) -- onu biz
     bagliyoruz.                                             */
  kontrol("2 silah tanimli", ayar.KONSEY_SILAH.size === 2);
  kontrol("1 asa sesi tanimli", ayar.KONSEY_ASA_SESI.size === 1);

  /* Kaynaktaki fonksiyonlar GERCEKTEN oyle mi? */
  const fn = CM + "/astra studios mod_behavior_pack/functions";
  if (existsSync(fn)) {
    const biyo = readFileSync(fn + "/biogunyap1.mcfunction", "utf8");
    kontrol("biogunyap1 kurbani donduruyor",
            biyo.includes("movement disabled") &&
            biyo.includes("toxic_skin"));
    /* Ay Isigi Asasi kaynakta `function moonlightstaffsong1`
       cagiriyor ama O DOSYA HIC YOK -- yani modun kendisinde
       sarki calmiyor, cagri bosluga gidiyor. Ses dosyasi ise
       pakette duruyor. Sesi biz bagliyoruz; uydurma degil,
       kaynagin BAGLAYAMADIGI kendi dosyasi.

       Ayni sey Bobby Silahi'nin `bobbygunshot1`i icin de
       gecerli; ama onun MERMISI `bobbygundirt1`i cagiriyor ve
       O VAR -- silahin isini yapan o.                       */
    kontrol("moonlightstaffsong1 kaynakta YOK (cagri bosluga gidiyor)",
            !existsSync(fn + "/moonlightstaffsong1.mcfunction"));
    kontrol("bobbygunshot1 de YOK", !existsSync(fn + "/bobbygunshot1.mcfunction"));
    kontrol("ama bobbygundirt1 VAR (silahin isini yapan o)",
            existsSync(fn + "/bobbygundirt1.mcfunction"));
  }

  /* Yetenekler kayitli ve ESYAYA BAGLI mi? */
  const bagli = new Set(kollar.KONSEY_SILAH_YETENEKLERI.map(([, y]) => y));
  for (const [esya, t] of ayar.KONSEY_SILAH) {
    const y = "kns_atis_" + esya.replace("kns_silah_", "");
    kontrol(esya + ": yetenek kayitli", !!yetenek(y));
    kontrol(esya + ": esyaya bagli", bagli.has(y));
  }
  for (const [esya, t] of ayar.KONSEY_ASA_SESI) {
    const y = "kns_sarki_" + esya.replace("kns_asa_", "");
    kontrol(esya + ": yetenek kayitli", !!yetenek(y));
    kontrol(esya + ": esyaya bagli", bagli.has(y));
  }

  /* Ses tanimi ve dosyasi pakette mi? Tanim olmadan playSound
     sessizce hicbir sey yapmaz.                              */
  const sd = RP + "/sounds/sound_definitions.json";
  kontrol("sound_definitions.json var", existsSync(sd));
  if (existsSync(sd)) {
    const tanim = oku(sd).sound_definitions;
    for (const [, t] of [...ayar.KONSEY_SILAH, ...ayar.KONSEY_ASA_SESI]) {
      kontrol(t.ses + ": tanimli", !!tanim[t.ses]);
      const yol = tanim[t.ses] &&
        RP + "/" + tanim[t.ses].sounds[0].name + ".ogg";
      kontrol(t.ses + ": ogg dosyasi var", !!yol && existsSync(yol), yol || "");
    }
  }

  /* Kacis yolu BAGLI mi? konsey_silah.js'te bir kirma
     fonksiyonu yazip main.js'te cagirmamak eski bir tuzak
     (efsane.js hic import edilmemisti).                      */
  const anaKaynak = readFileSync(BP + "/scripts/main.js", "utf8");
  kontrol("main.js konsey_silah.js'i import ediyor",
          anaKaynak.includes('import "./yetenekler/konsey_silah.js";'));
  kontrol("Freedom Stone kacisi BAGLI (konseySilahKir cagriliyor)",
          /konseySilahKir\(oyuncu\)/.test(anaKaynak));
  kontrol("kurban taramasi merkezi tick'ten cagriliyor",
          /konseySilahTara\(\)/.test(anaKaynak));
  kontrol("oyuncu cikinca defter temizleniyor",
          /konseySilahUnut\(olay\.playerId\)/.test(anaKaynak));

  /* ESYA KAYBI YOK: deri yalniz yuva BOSSA takiliyor. */
  const sk = readFileSync(BP + "/scripts/yetenekler/konsey_silah.js", "utf8");
  kontrol("deri yalniz BOS kafa yuvasina takiliyor",
          /if \(simdiki\) return false;/.test(sk));
  kontrol("yalniz BIZIM taktigimiz parca cikariliyor",
          /if \(kayit\.deriTakildi\) deriCikar/.test(sk));
}

console.log("");
console.log("=== 8. KURBAN ZIRHI  (v7.0, Falen Mod V2) ===");
{
  /* Kullanici: "hepsinden, ilk once kurban zirhindan basla."

     Dort parca ve hepsinin sayilari kaynaktan OLCULDU. 3.
     bolum korumayi ve dayanikligi zaten kaynakla birebir
     karsilastiriyor; burasi tablonun TASIMADIGI seyi tutuyor:
     itme direnci.                                          */
  const parcalar = ["kurban_kask", "kurban_zirh",
                    "kurban_pantolon", "kurban_bot"];
  const yuvalar = { kurban_kask: "head", kurban_zirh: "chest",
                    kurban_pantolon: "legs", kurban_bot: "feet" };
  for (const a of parcalar) {
    const t = KONSEY.find((x) => x.anahtar === a);
    kontrol(a + " tabloda", !!t);
    if (!t) continue;
    kontrol("  " + a + ": yuvasi dogru", t.yuva === yuvalar[a], t.yuva);
    kontrol("  " + a + ": zirh turunde", t.tur === "zirh", t.tur);
  }
  /* Dort yuva da DOLU olmali: ayni yuvaya iki parca konsaydi
     takim tamamlanamazdi.                                  */
  const dolu = new Set(parcalar.map(
    (a) => (KONSEY.find((x) => x.anahtar === a) || {}).yuva));
  kontrol("dort AYRI yuva (tam takim)", dolu.size === 4,
          [...dolu].join(", "));

  /* ---- ITME DIRENCI ----
     Kaynakta `minecraft:knockback_resistance` 0.75. KONSEY
     tablosunda boyle bir alan YOK (58 satirin hepsini
     degistirmek gerekirdi), ayri bir sozlukte duruyor. O
     sozluk unutulursa parca kaynaktan sessizce fakirlesir. */
  const uretec = readFileSync(KOK + "/kol_uret.py", "utf8");
  kontrol("KONSEY_ITME sozlugu var", uretec.includes("KONSEY_ITME = {"));
  for (const a of parcalar) {
    const e = oku(BP + "/items/kns_" + a + ".json")["minecraft:item"].components;
    const k = e["minecraft:knockback_resistance"];
    kontrol("  " + a + ": itme direnci 0.75 (kaynaktaki gibi)",
            !!k && k.value === 0.75, JSON.stringify(k));
  }
  /* Itme direnci OLMASI GEREKEN parcalar: Kurban zirhinin
     dordu + Void Migferi ve Enigma. Kaynakta bu altisinda
     var, diger 62'sinde YOK. Liste elle tutuluyor ki bir
     parca sessizce guclenmesin.                            */
  const itmeliler = [...parcalar, "void_migfer", "enigma"];
  for (const a of ["void_migfer", "enigma"]) {
    const e = oku(BP + "/items/kns_" + a + ".json")["minecraft:item"].components;
    const k = e["minecraft:knockback_resistance"];
    kontrol("  " + a + ": itme direnci 0.75 (kaynaktaki gibi)",
            !!k && k.value === 0.75, JSON.stringify(k));
  }
  const yanlis = KONSEY.filter((t) => !itmeliler.includes(t.anahtar))
    .filter((t) => {
      const y = BP + "/items/kns_" + t.anahtar + ".json";
      if (!existsSync(y)) return false;
      return !!oku(y)["minecraft:item"].components[
        "minecraft:knockback_resistance"];
    });
  kontrol("itme direnci SADECE o alti parcada", yanlis.length === 0,
          yanlis.map((t) => t.anahtar).join(", ") || "temiz");

  /* ---- UC PARCA AYNI DOKUYU PAYLASIYOR ----
     Kaynakta olculdu: zirh/pantolon/bot dokularinin md5'i
     ayni, yalniz kaskin kendi dokusu var. Bunu kayit altina
     almak, ilerde "doku yanlis kopyalanmis" diye yanlis
     teshis konmasini onluyor.                              */
  const oku2 = (a) => readFileSync(RP + "/textures/entity/kns_" + a + ".png");
  kontrol("zirh ve pantolon AYNI dokuyu paylasiyor (kaynakta da oyle)",
          oku2("kurban_zirh").equals(oku2("kurban_pantolon")));
  kontrol("bot da ayni dokuyu paylasiyor",
          oku2("kurban_zirh").equals(oku2("kurban_bot")));
  kontrol("kaskin KENDI dokusu var",
          !oku2("kurban_kask").equals(oku2("kurban_zirh")));

  /* ---- ZIRH KEMIKLERI ----
     Bedrock zirh parcasini oyuncu iskeletine KEMIK ADIYLA
     bagliyor. Ad degisirse parca vucuda hic oturmaz ve
     hicbir hata gorunmez -- v3.3'te kollarda tam bu olmustu. */
  const beklenenKemik = {
    kurban_kask: ["head"],
    kurban_zirh: ["body", "leftArm", "rightArm"],
    kurban_pantolon: ["leftLeg", "rightLeg"],
    kurban_bot: ["leftLeg", "rightLeg"]
  };
  for (const a of parcalar) {
    const g = oku(RP + "/models/entity/kns_" + a + ".geo.json")
      ["minecraft:geometry"][0];
    const kemik = g.bones.map((b) => b.name).sort();
    kontrol("  " + a + ": kemikler oyuncu iskeletiyle esliyor",
            kemik.join(",") === beklenenKemik[a].join(","), kemik.join(","));
    /* Eski (1.10.0) bicimden cevrildi: modern bicimde
       `texture_width` yaziyor, `texturewidth` degil.       */
    kontrol("  " + a + ": modern bicime cevrildi",
            typeof g.description.texture_width === "number",
            JSON.stringify(g.description.texture_width));
  }
}

console.log("");
console.log(hata ? ">>> SORUN VAR"
                 : ">>> Konsey: " + KONSEY.length + " parca yerinde");
process.exit(hata ? 1 : 0);
