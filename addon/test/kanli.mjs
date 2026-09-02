/* KANLI KOL                                                v6.7

   Kaynak: Bobby1545 Mod (V3). Kullanici: "ozellikle kanli kolu
   istiyorum." Sonra ekran goruntusu de gonderdi -- iki dev
   turuncu-kanli yumruk.

   ---- BU DOSYANIN TUTTUGU EN ONEMLI IKI SEY ----
   1. Kaynagin "Kapat" esyasi `Envanteri_Sil` cagiriyor ve o
      fonksiyon tek satir: `clear @s`. Kolu kapatmak butun
      envanteri siliyor. O davranis ALINMADI ve bir daha
      yanlislikla girmesin diye burada olculuyor.
   2. Modelin kok kemikleri rightArm/leftArm. Baglanma bunlara
      dayaniyor; adlari degisirse model oyuncunun koluna hic
      oturmaz ve kimse fark etmez (v3.3'te tam bu oldu).     */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, _durum } from "@minecraft/server";
import { readFileSync, existsSync } from "node:fs";

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const BP = KOK + "/Simsek_TNT_ToprakTopu";
const RP = KOK + "/Simsek_Kol_Kaynak";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };
sus();
await import("./pack/main.js");
ac();
const ayar = await import("./pack/ayarlar.js");
const kayit = await import("./pack/yetenekler/kayit.js");
const kollar = await import("./pack/yetenekler/kollar.js");
const { butceSifirla } = await import("./pack/butce.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const oku = (y) => JSON.parse(readFileSync(y, "utf8"));

console.log("=== 1. ESYA, MODEL VE DOKU ===");
{
  const ey = BP + "/items/kol_kanli.json";
  kontrol("kol_kanli esyasi var", existsSync(ey));
  if (existsSync(ey)) {
    const d = oku(ey)["minecraft:item"].description;
    kontrol("  kimlik pa:kol_kanli", d.identifier === "pa:kol_kanli", d.identifier);
    kontrol("  yaratici menusunde", !!d.menu_category);
  }

  const gy = RP + "/models/entity/simsek_kol_kanli.geo.json";
  kontrol("kendi geometrisi var", existsSync(gy));
  if (existsSync(gy)) {
    const g = oku(gy)["minecraft:geometry"][0];
    kontrol("  modern bicime cevrildi (minecraft:geometry)", !!g.bones);
    kontrol("  kimlik geometry.simsek_kol_kanli",
            g.description.identifier === "geometry.simsek_kol_kanli");

    /* ---- BAGLANMANIN TA KENDISI ----
       Bedrock ayni ADLI kemikleri esliyor. Kok kemikler
       rightArm/leftArm oldugu icin model oyuncunun IKI koluna
       birden baglaniyor ve kollar normal hareket ediyor.
       Ad degisirse model kola hic oturmaz -- v3.3'te
       "kol_kok" yuzunden tam bu oldu ve sessizce gorunmedi. */
    const kok = g.bones.filter((b) => !b.parent).map((b) => b.name).sort();
    kontrol("  kok kemikler OYUNCU KOLLARI (leftArm/rightArm)",
            kok.join(",") === "leftArm,rightArm", kok.join(","));
    const p = {};
    for (const b of g.bones) p[b.name] = b.pivot;
    kontrol("  rightArm pivotu oyuncununkiyle ayni [-5,22,0]",
            JSON.stringify(p.rightArm) === "[-5,22,0]",
            JSON.stringify(p.rightArm));
    kontrol("  leftArm pivotu oyuncununkiyle ayni [5,22,0]",
            JSON.stringify(p.leftArm) === "[5,22,0]",
            JSON.stringify(p.leftArm));

    const kup = g.bones.reduce((a, b) => a + (b.cubes || []).length, 0);
    kontrol("  kaynagin butun kupleri geldi (66)", kup === 66, kup + " kup");

    /* ---- IKI KOL BIRBIRINE GECMEMELI  (v7.3) ----
       Kullanici "2 kol birbirine gecmis gibi" dedi. Sebep
       modelde degil cizicimin donus isaretinde cikti, ama
       DENETIMSIZ kaldigi icin fark edilmesi bu kadar surdu.
       Artik olculuyor: kemik donusleri uygulandiktan sonra
       sag kolun tamami x<0'da, sol kolun tamami x>0'da
       kalmali. Bir gun biri modeli ya da donusleri
       degistirirse burada patlar.                          */
    const donDer = (p, aci, piv) => {
      let [x, y, z] = [p[0] - piv[0], p[1] - piv[1], p[2] - piv[2]];
      const [rx, ry, rz] = aci.map((a) => (a * Math.PI) / 180);
      let c = Math.cos(rx), s = Math.sin(rx);
      [y, z] = [y * c - z * s, y * s + z * c];
      c = Math.cos(ry); s = Math.sin(ry);
      [x, z] = [x * c + z * s, -x * s + z * c];
      c = Math.cos(rz); s = Math.sin(rz);
      [x, y] = [x * c - y * s, x * s + y * c];
      return [x + piv[0], y + piv[1], z + piv[2]];
    };
    const adlar = {};
    for (const b of g.bones) adlar[b.name] = b;
    const xAralik = (kokAd) => {
      let enAz = Infinity, enCok = -Infinity;
      for (const b of g.bones) {
        // kemikten koke zincir
        const zincir = [];
        let k = b;
        while (k) { zincir.push(k); k = k.parent ? adlar[k.parent] : null; }
        if (zincir[zincir.length - 1].name !== kokAd) continue;
        for (const c of b.cubes || []) {
          const [ox, oy, oz] = c.origin, [sx, sy, sz] = c.size;
          for (const kx of [0, sx]) for (const ky of [0, sy]) for (const kz of [0, sz]) {
            let p = [ox + kx, oy + ky, oz + kz];
            if (c.rotation) p = donDer(p, c.rotation, c.pivot || p);
            for (const kb of zincir) if (kb.rotation) p = donDer(p, kb.rotation, kb.pivot);
            if (p[0] < enAz) enAz = p[0];
            if (p[0] > enCok) enCok = p[0];
          }
        }
      }
      return [enAz, enCok];
    };
    const sagX = xAralik("rightArm"), solX = xAralik("leftArm");
    kontrol("  sag kol govdenin SAGINDA duruyor (x<0)", sagX[1] < 0,
            sagX.map((v) => v.toFixed(1)).join(".."));
    kontrol("  sol kol govdenin SOLUNDA duruyor (x>0)", solX[0] > 0,
            solX.map((v) => v.toFixed(1)).join(".."));
    kontrol("  iki kol CAKISMIYOR", sagX[1] <= solX[0],
            "bosluk " + (solX[0] - sagX[1]).toFixed(1));
    /* Gorunur kutu dar birakilirsa yumruklar uzaktan
       KIRPILIR: model oyuncunun iki yanina birden tasiyor. */
    kontrol("  gorunur kutu yumruklari kapsiyor",
            g.description.visible_bounds_width >= 6,
            String(g.description.visible_bounds_width));
  }

  const dy = RP + "/textures/entity/kol_kanli.png";
  kontrol("doku pakette", existsSync(dy));
  const iy = RP + "/textures/item/kol_kanli.png";
  kontrol("ikon pakette", existsSync(iy));

  /* Attachable YENI geometriyi gostermeli. Ilk yazdigimda
     attachable() geometriyi sabit yaziyordu; oyle kalsaydi
     Kanli Kol digerlerinin duz kol modeliyle cizilirdi.    */
  const ay = RP + "/attachables/kol_kanli.json";
  kontrol("attachable var", existsSync(ay));
  if (existsSync(ay)) {
    const a = oku(ay)["minecraft:attachable"].description;
    kontrol("  KENDI geometrisini gosteriyor",
            a.geometry.default === "geometry.simsek_kol_kanli",
            a.geometry.default);
    kontrol("  kendi dokusunu gosteriyor",
            a.textures.default === "textures/entity/kol_kanli",
            a.textures.default);
  }
}

console.log("");
console.log("=== 2. DOKU KAYNAGIN KENDISI (uydurma degil) ===");
{
  /* ---- KAYNAK v7.3'TE DEGISTI ----
     v6.7'de model Bobby1545'in `blood_arm`iydi: duz kirmizi
     kollar, ucunda turuncu yumruk. Kullanici gercek Kanli
     Kol'un gorselini gonderdi -- bogumlu zincir kollar,
     ucunda DISLI pence. O model depoda zaten vardi:
     Code-Man paketindeki `kns_kolluk_chris_kanli`.

     Doku ELLE cizilmiyor: uv'ler kaynagin dokusunu bekliyor,
     baska bir doku pencelerin dislerini bos kosesinden
     ornekler ve kollar duz renk cikar.                     */
  const paket = RP + "/textures/entity/kol_kanli.png";
  const kaynak = KOK + "/kaynak_doku/konsey/kns_kolluk_chris_kanli.png";
  kontrol("kaynak doku depoda duruyor", existsSync(kaynak));
  if (existsSync(paket) && existsSync(kaynak)) {
    kontrol("paketteki doku KAYNAGIN AYNISI",
            readFileSync(paket).equals(readFileSync(kaynak)));
  }
  const ikonK = KOK + "/kaynak_doku/konsey_ikon/kns_kolluk_chris_kanli.png";
  kontrol("kaynak ikon depoda duruyor", existsSync(ikonK));
  if (existsSync(ikonK)) {
    kontrol("ikon da kaynagin kendi ikonu",
            readFileSync(RP + "/textures/item/kol_kanli.png")
              .equals(readFileSync(ikonK)));
  }
  const geoK = KOK + "/kaynak_geo/konsey/kns_kolluk_chris_kanli.geo.json";
  kontrol("kaynak model depoda duruyor", existsSync(geoK));
  if (existsSync(geoK)) {
    const govde = oku(geoK)["minecraft:geometry"][0];
    const yeni = oku(RP + "/models/entity/simsek_kol_kanli.geo.json")
      ["minecraft:geometry"][0];

    /* ---- TEK DEGISIKLIK: waist/body ATILDI ----
       Kaynak bunu ZIRH olarak takiyor, biz ELDE TUTULAN esya
       olarak takiyoruz. `body` bir oyuncu kemigi; kollar
       onun altinda kalirsa govde donusu iki kez uygulanir.
       Atilan kemiklerde kup de donus de YOK, o yuzden durus
       hic degismiyor -- pivotlar Bedrock'ta mutlak.        */
    const atilan = new Set(["waist", "body"]);
    for (const b of govde.bones) {
      if (!atilan.has(b.name)) continue;
      kontrol("  atilan '" + b.name + "' gercekten bostu",
              !(b.cubes || []).length && !b.rotation);
    }
    kontrol("  waist/body pakete gelmedi",
            !yeni.bones.some((b) => atilan.has(b.name)),
            yeni.bones.map((b) => b.name).join(","));

    /* ---- OMURGA UZATILDI, PENCE UZATILMADI  (v7.5) ----
       Kullanici "omurgasi bir tik kisa" dedi. Uzatma OLCUYE
       bagli: sabit `kol_uret.py:KANLI_UZATMA`dan OKUNUYOR,
       buraya elle yazilmiyor -- yoksa sabit degisince test
       eski degeri dogrular ve hicbir sey soylemez.

       Iki ayri iddia var ve ikisi de gerekli:
         omurga  -> y'si ve y-boyu k katina cikmis olmali
         pence   -> BOYU AYNI kalmali, sadece otelenmis
       Penceyi de olcekleseydik disler ve yumruk uzardi.    */
    const uretec = readFileSync(KOK + "/kol_uret.py", "utf8");
    const kNum = parseFloat(/KANLI_UZATMA\s*=\s*([0-9.]+)/.exec(uretec)[1]);
    const OMUZ = parseFloat(/KANLI_OMUZ_UC\s*=\s*([0-9.]+)/.exec(uretec)[1]);
    const SINIR = parseFloat(/KANLI_PENCE_SINIR\s*=\s*([0-9.]+)/.exec(uretec)[1]);
    kontrol("  uzatma sabiti okundu", kNum > 0 && OMUZ > 0 && SINIR > 0,
            "k=" + kNum + " omuz=" + OMUZ + " sinir=" + SINIR);
    const kayma = (SINIR - OMUZ) * (kNum - 1);

    const yakin = (a, b, t = 1e-6) => Math.abs(a - b) < t;
    let omurgaTam = true, penceTam = true, uvTam = true;
    let omurgaSay = 0, penceSay = 0;
    for (const kaynakKemik of govde.bones) {
      if (atilan.has(kaynakKemik.name)) continue;
      const cikan = yeni.bones.find((b) => b.name === kaynakKemik.name);
      if (!cikan) { omurgaTam = penceTam = false; continue; }
      const kc = kaynakKemik.cubes || [], yc = cikan.cubes || [];
      if (kc.length !== yc.length) { omurgaTam = penceTam = false; continue; }
      for (let i = 0; i < kc.length; i++) {
        const a = kc[i], b = yc[i];
        if (JSON.stringify(a.uv) !== JSON.stringify(b.uv)) uvTam = false;
        if (!yakin(a.origin[0], b.origin[0]) || !yakin(a.origin[2], b.origin[2])
            || !yakin(a.size[0], b.size[0]) || !yakin(a.size[2], b.size[2])) {
          omurgaTam = penceTam = false;        // x/z HIC degismemeli
        }
        if (a.origin[1] < SINIR) {
          omurgaSay++;
          if (!yakin(b.origin[1], OMUZ + (a.origin[1] - OMUZ) * kNum)
              || !yakin(b.size[1], a.size[1] * kNum)) omurgaTam = false;
        } else {
          penceSay++;
          if (!yakin(b.origin[1], a.origin[1] + kayma)
              || !yakin(b.size[1], a.size[1])) penceTam = false;
        }
      }
    }
    kontrol("  omurga tam k kati gerildi", omurgaTam, omurgaSay + " kup");
    kontrol("  pence UZAMADI, yalnizca otelendi", penceTam, penceSay + " kup");
    kontrol("  x/z ve uv'ye hic dokunulmadi", uvTam);
    kontrol("  kup sayisi ayni kaldi",
            govde.bones.reduce((a,b)=>a+(b.cubes||[]).length,0)
            === yeni.bones.reduce((a,b)=>a+(b.cubes||[]).length,0));
    /* Kol GERCEKTEN uzadi mi -- niyetin kendisi. */
    const boy = (bones, ad) => {
      const b = bones.find((x) => x.name === ad);
      const ys = (b.cubes || []).flatMap((c) => [c.origin[1], c.origin[1]+c.size[1]]);
      return Math.max(...ys) - Math.min(...ys);
    };
    const eskiBoy = boy(govde.bones, "bone"), yeniBoy = boy(yeni.bones, "bone");
    kontrol("  kol gercekten uzadi", yeniBoy > eskiBoy + 0.5,
            eskiBoy.toFixed(2) + " -> " + yeniBoy.toFixed(2));

    /* UV uzayi kaynaktan gelmeli: doku 256x256 ama uv 32x32
       (kaynak sekiz kat cozunurlukte cizmis). 64 yazilsaydi
       butun uv'ler yariya kayardi.                         */
    kontrol("  uv uzayi kaynagin uzayi",
            yeni.description.texture_width === govde.description.texture_width
            && yeni.description.texture_height === govde.description.texture_height,
            yeni.description.texture_width + "x" + yeni.description.texture_height);
  }
}

console.log("=== 3. KOL YETENEKLERE BAGLI ===");
{
  const satir = kollar.KOL_ESYALARI.find((s) => s[0] === "pa:kol_kanli");
  kontrol("kol listede", !!satir);
  if (satir) {
    console.log("     yetenekler: " + satir.slice(1).join(", "));
    kontrol("  yeni iki yetenek var",
            satir.includes("kanli_ors") && satir.includes("kanli_simsek"));
    /* Bagladigi HER yetenek gercekten kayitli olmali. Kayit
       defterinde olmayan bir kimlige baglamak sessizce
       hicbir sey yapmaz -- import sirasi bozulunca tam bu
       olur (main.js'teki DIKKAT notu).                     */
    for (const y of satir.slice(1)) {
      kontrol("  '" + y + "' kayit defterinde",
              !!kayit.tumYetenekler().find((t) => t.kimlik === y));
    }
  }
}

console.log("");
console.log("=== 4. ENVANTER SILINMIYOR (en onemli bolum) ===");
{
  /* Kaynagin "Kapat" esyasi:
       "run_command": {"command": ["function Envanteri_Sil", ...]}
     ve Envanteri_Sil.mcfunction tek satir:
       clear @s
     Yani kolu kapatmak OYUNCUNUN BUTUN ENVANTERINI siliyor.
     Bu depoda esya kaybettiren hicbir sey yok.             */
  const dosyalar = [
    "yetenekler/kanli.js", "yetenekler/kollar.js", "main.js", "ayarlar.js"
  ];
  /* Yorumdaki ANLATIM serbest (yukaridaki gerekce de bir
     yorum); aranan sey KODUN kendisi. Ilk yazdigimda satir
     satir "yorum mu" diye bakiyordum ve blok yorumlarin ORTA
     satirlari yorum sayilmiyordu -- kendi gerekce yazimi
     "envanter silen kod" diye raporladi. Artik blok ve satir
     yorumlari once TEMIZLENIYOR.                            */
  const yorumsuz = (k) => k
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^[ \t]*\/\/.*$/gm, " ");
  for (const d of dosyalar) {
    const k = yorumsuz(readFileSync(BP + "/scripts/" + d, "utf8"));
    const kotu = k.split("\n").filter(
      (s) => /clear\s+@|\.clearAll\(/.test(s));
    kontrol(d + ": envanter silen kod YOK", kotu.length === 0,
            kotu.map((s) => s.trim()).join(" | "));
  }
  kontrol("Kanli Kol'da 'kapat' diye bir yetenek de yok",
          !kollar.KOL_ESYALARI.find((s) => s[0] === "pa:kol_kanli")
            .some((y) => /kapat/.test(String(y))));
}

console.log("");
console.log("=== 5. IKI YENI YETENEK CALISIYOR ===");
{
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, { x: 0.5, y: 70, z: 0.5 });
  o.id = "k1"; o.typeId = "minecraft:player";
  o.location = { x: 0.5, y: 70, z: 0.5 };
  o.sendMessage = () => {};
  o.onScreenDisplay = { setActionBar: () => {} };
  o.runCommand = () => true;
  _durum.oyuncular = [o];

  /* Uc hedef: biri menzilde yakin, biri menzilde uzak, biri
     MENZIL DISI. Menzil disindaki vurulmamali -- kaynak
     butun dunyayi vuruyor, bizde menzil var.               */
  const kur = (id, x) => ({
    id, typeId: "minecraft:zombie", isValid: true,
    location: { x, y: 70, z: 0.5 }, dimension: D.boyut
  });
  D.boyut._varliklar = [
    o,
    kur("z1", 6),
    kur("z2", ayar.KANLI_MENZIL - 5),
    kur("uzak", ayar.KANLI_MENZIL + 30)
  ];

  for (const [kimlik, ad] of [["kanli_ors", "ORS"], ["kanli_simsek", "SIMSEK"]]) {
    const tanim = kayit.yetenekAl(kimlik);
    kontrol(kimlik + " kayitli", !!tanim);
    if (!tanim) continue;
    const oncekiYazilan = D.sayac.yazilan.length;
    const oncekiDogan = D.sayac.dogan.length;
    sus();
    const is = tanim.olustur(o);
    let tur = 0;
    if (is) {
      for (let t = 0; t < 600; t++) {
        butceSifirla(); tur++;
        if (is.calis()) { if (is.bitir) is.bitir(); break; }
        tickIlerlet(1);
      }
    }
    ac();
    if (kimlik === "kanli_ors") {
      const orsler = D.sayac.yazilan.slice(oncekiYazilan)
        .filter((b) => b.tip === ayar.KANLI_ORS_BLOK);
      kontrol("  " + ad + ": iki hedefe ors dustu", orsler.length === 2,
              orsler.length + " ors");
      kontrol("  ors hedefin USTUNE dustu",
              orsler.every((b) => b.y === 70 + ayar.KANLI_ORS_YUKSEK),
              orsler.map((b) => b.y).join(","));
      kontrol("  MENZIL DISINDAKI vurulmadi",
              !orsler.some((b) => b.x > ayar.KANLI_MENZIL),
              orsler.map((b) => b.x).join(","));
    } else {
      const simsekler = D.sayac.dogan.slice(oncekiDogan)
        .filter((v) => v.tip === "minecraft:lightning_bolt");
      kontrol("  " + ad + ": iki hedefe yildirim dustu",
              simsekler.length === 2, simsekler.length + " yildirim");
      kontrol("  MENZIL DISINDAKI vurulmadi",
              !simsekler.some((v) => v.x > ayar.KANLI_MENZIL),
              simsekler.map((v) => v.x).join(","));
    }
    kontrol("  tek tick'te bitmiyor (butce korunuyor)", tur > 1, tur + " tick");
  }

  /* OYUNCUYU VURMUYOR: kaynak da `type=!player` diyor.
     Kendini de vurmuyor.                                   */
  D.boyut._varliklar = [o, { id: "o2", typeId: "minecraft:player",
                             isValid: true, location: { x: 5, y: 70, z: 0.5 },
                             dimension: D.boyut }];
  const t2 = kayit.yetenekAl("kanli_simsek");
  const once = D.sayac.dogan.length;
  sus();
  const is2 = t2.olustur(o);
  if (is2) { for (let t = 0; t < 50; t++) { butceSifirla(); if (is2.calis()) break; tickIlerlet(1); } }
  ac();
  kontrol("oyuncular vurulmuyor (kaynak da vurmuyor)",
          D.sayac.dogan.length === once,
          (D.sayac.dogan.length - once) + " yildirim");
  kontrol("  ayar acikca yaziyor", ayar.KANLI_OYUNCU_VUR === false);
}

console.log("");
console.log("=== 6. ULASILABILIYOR MU ===");
{
  const kaynak = readFileSync(BP + "/scripts/main.js", "utf8");
  kontrol("main.js kanli.js'i import ediyor",
          kaynak.includes('import "./yetenekler/kanli.js";'));
  /* SIRA: kollar.js var olan yeteneklere baglaniyor. kanli.js
     ondan SONRA yuklenirse hicbir Kanli Kol yetenegi baglanmaz
     -- sessizce, sadece Content Log'a uyari duser.          */
  kontrol("kanli.js kollar.js'ten ONCE yukleniyor",
          kaynak.indexOf('import "./yetenekler/kanli.js";') <
          kaynak.indexOf('} from "./yetenekler/kollar.js";'));
  kontrol("ayar kapisi var", typeof ayar.KANLI_ACIK === "boolean",
          String(ayar.KANLI_ACIK));
  const kk = readFileSync(BP + "/scripts/yetenekler/kanli.js", "utf8");
  kontrol("kanli.js bu ayara BAKIYOR", kk.includes("KANLI_ACIK"));

  /* Butce: kaynak butun yildirimlari TEK TICK'te doguruyor
     (`execute at @e run summon`). Otuz varlik varsa o tick
     kilitleniyor. Kasten kirma denemesinde gorildu ki iki
     hedefle butceyi gozardi etmek testte dusmuyor -- hedef
     sayisi zaten az. O yuzden burasi kodun butceyi
     SORDUGUNU olcuyor.                                     */
  kontrol("ors blok butcesini soruyor", /if \(blokIste\(2\) < 2\)/.test(kk));
  kontrol("simsek varlik butcesini soruyor",
          /if \(varlikIste\(1\) === 0\)/.test(kk));
  /* Kaynak `camerashake add @a 3` diyor: dunyadaki HERKESI
     sarsiyor. Bizde yalniz vuran kisi sarsiliyor.          */
  kontrol("ekran sarsintisi var (kaynaktaki gibi)",
          kk.includes("ekraniSars"));
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> Kanli Kol calisiyor");
process.exit(hata ? 1 : 0);
