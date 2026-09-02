const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
/* v3.4 kol sistemi testleri:
     1. scriptevent koprusu yetenegi tetikliyor mu
     2. egil + asagi bak jesti sekiz kolu envantere koyuyor mu
     3. esya kayitli DEGILKEN ne oluyor (v3.3'teki "soz dizimi hatasi"
        durumu) -- sessizce yutulmamali, adiyla raporlanmali
     4. dosyalar arasi tutarlilik: items/, attachables/, doku, dil
     5. esya JSON'unda DENEYSEL alan kalmamis olmasi (v3.5 hatasi)    */

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import {
  tickIlerlet, scriptEventTetikle, esyaKaydet, esyaSil, _durum
} from "@minecraft/server";

/* Kol listesi KAYNAKTAN okunuyor, elle yazilmiyor.

   Eskiden burada sabit bir dizi vardi ve her yeni kolda test
   kirilirdi -- uc kez oldu. Daha kotusu: testin isi "items/
   altindaki esya kollar.js'te bagli mi" diye bakmak, ama
   karsilastirdigi sey elle tutulan bir kopyaydi. Kopya
   guncellenmeyi unutulunca test gercegi degil kendini
   dogruluyordu.

   kollar.js dogrudan import EDILEMEZ: yetenekleri baglarken
   onlarin kayitli olmasini bekliyor, main.js'ten once yuklenirse
   hicbir kol baglanmaz (main.js'teki DIKKAT-SIRA-ONEMLI notu).
   O yuzden kaynak METIN olarak okunup esya kimlikleri
   cikariliyor.                                                  */
const KOLLAR_KAYNAK = readFileSync(
  new URL("./pack/yetenekler/kollar.js", import.meta.url), "utf8");
const KOL_LISTE_METNI = KOLLAR_KAYNAK.slice(
  KOLLAR_KAYNAK.indexOf("export const KOL_ESYALARI"),
  KOLLAR_KAYNAK.indexOf("];", KOLLAR_KAYNAK.indexOf("export const KOL_ESYALARI")));
const KOL_IDLER = [...new Set(
  (KOL_LISTE_METNI.match(/"pa:kol_[a-z_]+"/g) || []).map((s) => s.slice(1, -1)))];
const N = KOL_IDLER.length;

/* Kac kol oldugu SABIT DEGIL: 15 -> 11 -> 7 diye indi (kol
   israfini onleme kurali). Burada sadece "liste okunabildi mi"
   sinaniyor; sayiyi sabitlemek her temizlikte bu dosyayi
   bozardi.                                                    */
if (N < 3) {
  console.log("  ✗ kollar.js'ten kol listesi okunamadi (" + N + " bulundu)");
  process.exit(1);
}

// Paket yuklenmeden ONCE esyalari kaydet: acilistaki kolDenetimi()
// gercek oyundaki "hepsi kayitli" durumunu gormeli.
esyaKaydet(...KOL_IDLER);

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };

const gunluk = [];
console.warn = (m) => gunluk.push(String(m));
await import("./pack/main.js");
console.warn = w;

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? " §  " + detay : ""));
};

console.log("=== 1. ACILIS DENETIMI ===");
{
  const satir = gunluk.find((m) => m.includes("kol denetimi"));
  kontrol("acilista " + N + " esyanin da kayitli oldugu goruldu",
          !!satir && satir.includes(String(N)), satir || "(satir yok)");
  kontrol("KRITIK uyarisi YOK (hepsi kayitliyken olmamali)",
          !gunluk.some((m) => m.includes("KRITIK: ") && m.includes("kol esyasi")));
}

console.log("");
console.log("=== 2. scriptevent KOPRUSU ===");
{
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0.8, y: -0.3, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "se-1";
  o.typeId = "minecraft:player";
  _durum.oyuncular = [];

  sus();
  scriptEventTetikle({ id: "simsek:kol", message: "kol_toprak", sourceEntity: o });
  tickIlerlet(400);
  ac();

  kontrol("simsek:kol kol_toprak -> toprak topu uctu",
          D.sayac.setType > 500, D.sayac.setType + " blok");
}
{
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0.8, y: -0.3, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "se-2";
  o.typeId = "minecraft:player";
  _durum.oyuncular = [];

  sus();
  scriptEventTetikle({ id: "simsek:kol", message: "yok_boyle_kol", sourceEntity: o });
  scriptEventTetikle({ id: "baska:olay", message: "kol_toprak", sourceEntity: o });
  tickIlerlet(400);
  ac();

  kontrol("bilinmeyen kol adi hicbir sey yapmiyor", D.sayac.setType === 0);
  kontrol("baska scriptevent id'si yoksayiliyor", D.sayac.setType === 0);
}

console.log("");
console.log("=== 3. KOLLARI ALMA JESTI (egil + asagi bak) ===");
{
  const D = dunyaKur();
  // bakis y = -1 -> tam asagi
  const o = oyuncuKur(D.boyut, { x: 0, y: -1, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "ver-1";
  o.isSneaking = true;
  _durum.oyuncular = [o];

  sus(); tickIlerlet(24); ac();

  kontrol(N + " kol da envantere kondu", o._envanter.length === N,
          o._envanter.length + " esya");
  kontrol("hepsi farkli", new Set(o._envanter).size === N);
  kontrol("actionbar bilgi verdi",
          new RegExp(N + " kol").test(o.onScreenDisplay._son || ""),
          o.onScreenDisplay._son);

  // durus bozulmadan tekrar dolmamali
  const oncekiAdet = o._envanter.length;
  sus(); tickIlerlet(200); ac();
  kontrol("durus tutulurken envanter tekrar dolmuyor",
          o._envanter.length === oncekiAdet, o._envanter.length + " esya");
}
{
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: -1, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "ver-2";
  o.isSneaking = false;          // egilmeden asagi bakmak yetmemeli
  _durum.oyuncular = [o];
  sus(); tickIlerlet(60); ac();
  kontrol("egilmeden asagi bakmak kol vermiyor", o._envanter.length === 0);
}
{
  const D = dunyaKur();
  // DIKKAT: (0,-0.3,0) "duz bakis" DEGIL -- normallestirilince
  // (0,-1,0) yani tam asagi olur ve jesti hakli olarak tetikler.
  // Yatay bir vektor gerekiyor.
  const o = oyuncuKur(D.boyut, { x: 1, y: -0.3, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "ver-3";
  o.isSneaking = true;           // egik ama duz bakiyor
  _durum.oyuncular = [o];
  sus(); tickIlerlet(60); ac();
  kontrol("duz bakarken kol verilmiyor", o._envanter.length === 0);
}

console.log("");
console.log("=== 4. ESYA KAYITLI DEGILKEN (v3.3 hatasi) ===");
{
  esyaSil(...KOL_IDLER);

  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: -1, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "eksik-1";
  o.isSneaking = true;
  _durum.oyuncular = [o];

  const kayit = [];
  console.warn = (m) => kayit.push(String(m));
  tickIlerlet(24);
  console.warn = w;

  kontrol("hicbir esya verilmedi", o._envanter.length === 0);
  kontrol("eksik esyalar ADIYLA loglandi",
          kayit.some((m) => m.includes("pa:kol_toprak") && m.includes("kayitli olmayan")));
  kontrol("oyuncu actionbar'da uyarildi",
          /kayitli degil/.test(o.onScreenDisplay._son || ""), o.onScreenDisplay._son);
  kontrol("eksik sayisi dogru raporlandi",
          new RegExp(N + " tanesi").test(o.onScreenDisplay._son || ""),
          o.onScreenDisplay._son);

  esyaKaydet(...KOL_IDLER);
}

console.log("");
console.log("=== 5. DOSYA TUTARLILIGI ===");
{
  const BP = KOK + "/Simsek_TNT_ToprakTopu";
  const RP = KOK + "/Simsek_Kol_Kaynak";
  const oku = (p) => JSON.parse(readFileSync(p, "utf8"));

  /* items/ altinda artik kollarin yaninda iksir ve goz esyalari
     da var; bu bolum sadece KOLLARI dogruluyor.                 */
  const hepsi = readdirSync(BP + "/items").filter((f) => f.endsWith(".json"));
  const esyalar = hepsi.filter((f) => f.startsWith("kol_"));
  kontrol(N + " kol esyasi var", esyalar.length === N,
          esyalar.length + " kol / " + hepsi.length + " toplam esya");

  /* v4.2 bicimi OYUNDA CALISTI (ikonlar goruldu, kollar cizildi).
     v4.3'te referansa uydurulmaya calisilmisti; calisan seyi
     bozmamak icin geri alindi. Bu test o bicimi kilitliyor.     */
  const atlasBaslik = oku(RP + "/textures/item_texture.json");
  kontrol("atlas resource_pack_name 'simsek_kol' (v4.2'de calisan bicim)",
          atlasBaslik.resource_pack_name === "simsek_kol",
          String(atlasBaslik.resource_pack_name));
  kontrol("her iki pakette de pack_icon.png var",
          existsSync(BP + "/pack_icon.png") && existsSync(RP + "/pack_icon.png"));

  const geo = oku(RP + "/models/entity/simsek_kol.geo.json");
  const kemikler = geo["minecraft:geometry"][0].bones.map((b) => b.name);
  kontrol("kok kemik RightArm (oyuncu iskeletiyle esleser)",
          kemikler[0] === "RightArm", kemikler.join(", "));

  const dil = readFileSync(RP + "/texts/tr_TR.lang", "utf8");
  const atlas = oku(RP + "/textures/item_texture.json").texture_data;

  for (const dosya of esyalar) {
    const kisa = dosya.replace(".json", "");
    const tam = "pa:" + kisa;
    const e = oku(BP + "/items/" + dosya)["minecraft:item"];

    const sorunlar = [];
    if (e.description.identifier !== tam) sorunlar.push("kimlik");
    if (!KOL_IDLER.includes(tam)) sorunlar.push("kollar.js'te yok");
    if (!existsSync(RP + "/attachables/" + dosya)) sorunlar.push("attachable yok");
    if (!existsSync(RP + "/textures/entity/" + kisa + ".png")) sorunlar.push("varlik dokusu yok");
    if (!existsSync(RP + "/textures/item/" + kisa + ".png")) sorunlar.push("ikon yok");
    /* Atlas girdisi referanstaki calisan bicimde mi:
       resource_pack_name "vanilla" ve textures bir DIZI.        */
    const girdi = atlas[kisa];
    if (!girdi) sorunlar.push("item_texture.json'da yok");
    else if (girdi.textures !== "textures/item/" + kisa) sorunlar.push("atlas yolu yanlis");
    if (!dil.includes("item." + tam + ".name=")) sorunlar.push("dil satiri yok");

    /* v3.5'te 11/11 esya oyuna kaydolmadi. Sebep iki DENEYSEL
       bagimlilikti; ikisi de kaldirildi ve bir daha girmesin diye
       burada sinaniyor:
         - format_version 1.16.100 (eski esya formati; "Holiday
           Creator Features" deneysel ayari olmadan yok sayiliyor)
         - events + run_command (hicbir zaman kararli olmadi)      */
    const tamJson = oku(BP + "/items/" + dosya);
    if (tamJson.format_version === "1.16.100") sorunlar.push("eski format_version");
    if (e.events) sorunlar.push("events var (run_command deneysel)");
    if (e.components["minecraft:on_use"]) sorunlar.push("on_use var (deneysel)");
    if (e.components["minecraft:creative_category"]) sorunlar.push("creative_category eski");
    if (!e.description.menu_category) sorunlar.push("menu_category yok");

    const att = oku(RP + "/attachables/" + dosya)["minecraft:attachable"].description;
    if (att.identifier !== tam) sorunlar.push("attachable kimligi");
    /* Yedi kol tek geometriyi paylasiyor. IKI kanli kolun
       KENDI modeli var ve ikisi de kaynagindan geliyor:
         pa:kol_kanli       chris1545 -- bogumlu zincir kollar,
                            uclarinda disli pence (33 kup)
         pa:kol_kanli_bobby Bobby1545 -- duz kollar, uclarinda
                            turuncu-kanli yumruk (16 kup)
       Ikisinin de kok kemikleri rightArm/leftArm oldugu icin
       oyuncunun iki koluna birden baglaniyorlar.

       Istisnalar TEK TEK yazili -- "herhangi bir geometri
       olur"a gevsetilseydi bir kolun modeli yanlislikla
       degisince hicbir test fark etmezdi.                   */
    const GEO_ISTISNA = {
      "pa:kol_kanli": "geometry.simsek_kol_kanli",
      "pa:kol_kanli_bobby": "geometry.simsek_kol_kanli_bobby",
    };
    const beklenenGeo = GEO_ISTISNA[tam] || "geometry.simsek_kol";
    if (att.geometry.default !== beklenenGeo) sorunlar.push("geometri adi");
    if (att.textures.default !== "textures/entity/" + kisa) sorunlar.push("doku yolu");

    kontrol(tam, sorunlar.length === 0, sorunlar.join(", "));
  }
}

console.log("");
console.log("=== ELLE CIZILMIS KOL DOKULARI (v4.44) ===");
{
  const { readFileSync, existsSync } = await import("node:fs");
  const { execFileSync } = await import("node:child_process");
  const RP = KOK + "/Simsek_Kol_Kaynak";
  const uret = readFileSync(KOK + "/kol_uret.py", "utf8");

  /* Hangi kollarin elle cizilmis dokusu var: ureticiden okunuyor,
     elle listelenmiyor.                                        */
  const blok = uret.slice(uret.indexOf("KOL_SKIN = {"));
  const elle = [...blok.slice(0, blok.indexOf("}")).matchAll(/"(\w+)":/g)]
    .map((m) => m[1]);

  kontrol("en az bir kolun gercek dokusu var", elle.length > 0, elle.join(", "));

  const imzalar = [];

  for (const kol of elle) {
    const dosya = RP + "/textures/entity/" + kol + ".png";
    kontrol(kol + ": entity dokusu diskte", existsSync(dosya));

    /* Kol modelinin kubu uv (40,16) 4x12x4 -- yani dokunun
       40..55 x 16..31 bolgesi DOLU olmali. Bos olsaydi kol
       oyunda saydam cizilirdi ve hicbir test yakalamazdi.     */
    /* ASIL KONTROL: kol modelinin kubu uv (40,16) 4x12x4, yani
       dokunun 40..55 x 16..31 bolgesini ornekliyor. O bolge
       BOSSA kol oyunda SAYDAM cizilir -- dosya boyutuna bakan
       bir test bunu asla yakalayamaz.

       Ozellikle onemli: kullanici tek dosyaya iki kol ciziyor
       (sag yuvaya toprak, sol yuvaya buz) ve sol yuvadaki kol
       (40,16)'ya TASINIYOR. Tasima atlanirsa bolge bos kalir.

       Piksel okumak icin python3'e cikiliyor; Node'da PNG
       cozucu yok.                                             */
    const cikti = execFileSync("python3", ["-c", `
from PIL import Image
im = Image.open("${dosya}").convert("RGBA")
dolu = sum(1 for y in range(16,32) for x in range(40,56)
           if im.getpixel((x,y))[3] > 16)
print(dolu)
`]).toString().trim();
    kontrol(kol + ": kolun ornekledigi bolge (40,16) DOLU",
            Number(cikti) > 200, cikti + " / 256 piksel");

    kontrol(kol + ": envanter ikonu da ayni dokudan turetildi",
            existsSync(RP + "/textures/item/" + kol + ".png"));

    imzalar.push([kol, readFileSync(dosya).toString("base64")]);
  }

  /* Iki kol AYNI dokuyu almamis olmali. Kullanici ikisini tek
     dosyaya ciziyor; yuva secimi yanlis olsa ikisi de ayni
     kolu gosterirdi ve kimse fark etmezdi.                    */
  if (imzalar.length > 1) {
    const benzersiz = new Set(imzalar.map((i) => i[1]));
    kontrol("elle cizilmis kollarin dokulari birbirinden FARKLI",
            benzersiz.size === imzalar.length,
            imzalar.map((i) => i[0]).join(", "));
  }

  /* Dokusu OLMAYAN kollar hala uretilen yer tutucuyu
     kullaniyor olmali -- yani hicbiri eksik kalmamali.        */
  const { KOL_ESYALARI } = await import("./pack/yetenekler/kollar.js");
  let eksik = [];
  for (const [esya] of KOL_ESYALARI) {
    const kisa = esya.replace("pa:", "");
    if (!existsSync(RP + "/textures/entity/" + kisa + ".png")) eksik.push(kisa);
  }
  kontrol("hicbir kol dokusuz kalmadi", eksik.length === 0,
          eksik.join(", ") || KOL_ESYALARI.length + " kolun hepsinde doku var");
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> tum kol testleri gecti");
process.exit(hata ? 1 : 0);
