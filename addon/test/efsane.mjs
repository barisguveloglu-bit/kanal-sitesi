/* v4.71 -- EFSANE YAPISI VE IKI KATMANLI SIFRE

   Kullanici: "arkadaslarimla oynayabilecegim bir dunya acarsam
   beni bir efsane gibi zannetsinler diye lapisten bir piramit,
   etrafina kiziltas mesalesi, yaninda da secegimiz dillerden
   biri olsun ama gercekten cozmek icin ugrastirici olsun."
   Sectikleri: iki katman (SGA -> Baconian) + koordinat zinciri.

   ASIL SINAMA: yazit COZULEBILIYOR MU. Sifre tek yonlu
   calisirsa arkadaslari gunlerce ugrasip hicbir sey bulamaz --
   bu ozelligin en pahali hata bicimi bu.                    */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, _durum } from "@minecraft/server";
import { readFileSync } from "node:fs";
const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };

sus();
await import("./pack/main.js");
const ayar = await import("./pack/ayarlar.js");
const sifre = await import("./pack/yetenekler/_sifre.js");
const efs = await import("./pack/yetenekler/efsane.js");
const kayit = await import("./pack/yetenekler/kayit.js");
const { butceSifirla } = await import("./pack/butce.js");
ac();

const BP = KOK + "/Simsek_TNT_ToprakTopu";
const yetenek = (k) => kayit.tumYetenekler().find((y) => y.kimlik === k);
let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

console.log("=== 1. SIFRE GIDIS-DONUS (asil sinama) ===");
{
  /* Bir koordinat sifrelenip GERI cozulebilmeli. Olmazsa
     arkadaslarin cozemez ve ozellik anlamsizlasir.        */
  for (const [x, z] of [[512, -288], [0, 0], [-1024, 64], [37, -5],
                        [420, 260], [840, 520], [-99999, 99999]]) {
    const harf = sifre.koordinatiHarfle(x, z);
    const bacon = sifre.baconKodla(harf);
    const geri = sifre.harfiKoordinat(sifre.baconCoz(bacon));
    kontrol("X=" + x + " Z=" + z + " gidip geliyor",
            geri && geri.x === x && geri.z === z,
            harf + " -> " + bacon.length + " A/B -> " + JSON.stringify(geri));
  }
  kontrol("Bacon harf basina TAM 5 blok",
          sifre.baconKodla("ABC").length === 15,
          String(sifre.baconKodla("ABC").length));
  kontrol("Bacon cozucusu klasik 26 harflik tabloyla uyumlu",
          sifre.baconCoz(sifre.baconKodla("MERHABA")) === "MERHABA",
          sifre.baconCoz(sifre.baconKodla("MERHABA")));

  /* ---- UZUN TOHUM (v4.72'de yakalanan hata) ----
     sayiyiHarfle() sayiyi Number'a ceviriyordu. 22 haneli bir
     tohum JavaScript'in guvenli tam sayi sinirini (2^53, 16
     hane) asiyor ve son haneler UCUYORDU:
       girdi 7778749381209293789578
       cikan 777874938120929300
     Tohum artik basamak basamak ceviriliyor, Number'a hic
     ugramiyor.                                               */
  for (const t of ["7778749381209293789578", "0", "9007199254740993",
                   "1234567890123456789012345"]) {
    const geri = sifre.harfRakam(sifre.baconCoz(sifre.baconKodla(
      sifre.rakamHarfle(t))));
    kontrol("uzun tohum bozulmadan geliyor (" + t.length + " hane)",
            geri === t, t + " -> " + geri);
  }
  kontrol("tohum cevirisi Number'a UGRAMIYOR",
          !/sayiyiHarfle\(EFSANE_TOHUM/.test(
            readFileSync("./pack/yetenekler/efsane.js", "utf8")),
          "eski hata geri gelmis");
}

console.log("\n=== 2. SGA HARFLERI OYUNUN KENDI FONTUNDAN ===");
{
  const sga = await import("./pack/yetenekler/_sga.js");
  kontrol("26 harfin hepsi var", Object.keys(sga.SGA).length === 26,
          Object.keys(sga.SGA).length + " harf");
  kontrol("harf boyu 8x8", sga.SGA_BOY === 8, String(sga.SGA_BOY));
  let bos = 0;
  for (const [c, bit] of Object.entries(sga.SGA)) {
    if (bit.length !== 8) { kontrol(c + " sekiz satir", false, bit.length); }
    if (!bit.some((r) => r.includes("#"))) bos++;
  }
  kontrol("hicbir harf BOS degil", bos === 0, bos + " bos harf");
  /* Harfler BIRBIRINDEN farkli olmali: ayni sekil iki harfe
     denk gelirse sifre cozulemez.                          */
  const benzersiz = new Set(Object.values(sga.SGA).map((b) => b.join("|")));
  kontrol("26 harf de birbirinden FARKLI", benzersiz.size === 26,
          benzersiz.size + " benzersiz sekil");
  /* Uretilen dosya ELLE yazilmadi -- kaynagi belli */
  const ham = readFileSync("./pack/yetenekler/_sga.js", "utf8");
  kontrol("dosya uretildigini soyluyor", /URETILEN DOSYA/.test(ham));
  kontrol("kaynagini soyluyor", /ascii_sga\.png/.test(ham));
}

console.log("\n=== 3. ZINCIR ===");
{
  const kok = { x: 100, z: -50 };
  const d = efs.efsaneOzeti(kok);
  kontrol("durak sayisi ayardaki kadar",
          d.length === ayar.EFSANE_DURAK_SAYISI, d.length + " durak");
  kontrol("ilk durak kokun kendisi",
          d[0].x === kok.x && d[0].z === kok.z, JSON.stringify(d[0]));
  for (let i = 1; i < d.length; i++) {
    const uz = Math.hypot(d[i].x - d[i - 1].x, d[i].z - d[i - 1].z);
    kontrol("durak " + i + " -> " + (i + 1) + " arasi uzak", uz > 200,
            Math.round(uz) + " blok");
  }
  /* Ayni kok ayni zinciri vermeli: yazit koordinati
     hesaplayabiliyor, kayit bozulsa bile dogru kaliyor.  */
  const tekrar = efs.efsaneOzeti(kok);
  kontrol("zincir DETERMINIST", JSON.stringify(d) === JSON.stringify(tekrar));
  kontrol("en yakin durak dogru bulunuyor",
          efs.siraBul(kok, { x: d[1].x + 5, z: d[1].z - 5 }) === 1);
}

console.log("\n=== 4. YAPI GERCEKTEN KURULUYOR ===");
{
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, { x: 0.5, y: 90, z: 0.5 });
  o.id = "e1"; o.typeId = "minecraft:player";
  o.sendMessage = () => {};
  _durum.oyuncular = [o];
  _durum.ozellikler.delete(ayar.EFSANE_KAYIT_ANAHTAR);
  efs.efsaneUnut();

  const tanim = kayit.yetenekAl("efsane_yapisi");
  kontrol("yetenek kayitli", tanim !== undefined);

  sus();
  const is = tanim.olustur(o);
  let tur = 0;
  if (is) {
    for (let t = 0; t < 4000; t++) {
      butceSifirla(); tur++;
      if (is.calis()) { if (is.bitir) is.bitir(); break; }
      tickIlerlet(1);
    }
  }
  ac();

  const konan = D.sayac.yazilan;
  const say = (tip) => konan.filter((b) => b.tip === tip).length;

  kontrol("lapis piramit oruldu", say(ayar.EFSANE_BLOK) > 100,
          say(ayar.EFSANE_BLOK) + " lapis blok");
  kontrol("kiziltas mesaleleri konuldu", say(ayar.EFSANE_MESALE) === 8,
          say(ayar.EFSANE_MESALE) + " mesale");
  kontrol("SGA harfleri yazildi", say(ayar.EFSANE_SGA_BLOK) > 20,
          say(ayar.EFSANE_SGA_BLOK) + " altin blok");
  kontrol("Bacon bandi iki cesit blok tasiyor",
          say(ayar.EFSANE_BACON_A) > 0 && say(ayar.EFSANE_BACON_B) > 0,
          say(ayar.EFSANE_BACON_A) + " A / " + say(ayar.EFSANE_BACON_B) + " B");
  kontrol("Giant Alex ayak izleri kazildi",
          say("minecraft:air") === ayar.EFSANE_IZ_ADET * ayar.EFSANE_IZ_EN *
                                  ayar.EFSANE_IZ_BOY * ayar.EFSANE_IZ_DERIN,
          say("minecraft:air") + " hava blogu");
  kontrol("tek tick'te bitmiyor (butce korunuyor)", tur > 3, tur + " tick");
  console.log("     toplam " + konan.length + " blok, " + tur + " tick");
}

console.log("\n=== 5. YAZITTAKI BAND GERCEKTEN SONRAKI DURAGI VERIYOR ===");
{
  /* Bu bolumun sinadigi sey: arkadaslarin bandi okuyup
     Baconian tablosuyla cozdugunde ELDE ETTIGI koordinat,
     ikinci duragin GERCEK yeri mi.                        */
  const kok = { x: 640, z: -128 };
  const sonraki = efs.zincirNoktasi(kok, 1);
  const plan = efs.duragiPlanla(
    { x: kok.x, y: 80, z: kok.z }, ayar.EFSANE_TABAN, sonraki, false);

  const bandBloklari = plan.noktalar.filter(
    (n) => n.blok === ayar.EFSANE_BACON_A || n.blok === ayar.EFSANE_BACON_B);
  kontrol("bantta blok var", bandBloklari.length > 0,
          bandBloklari.length + " blok");

  /* Bandi soldan saga okuyup A/B'ye cevir -- arkadaslarin
     ne yapacaksa aynisi.                                  */
  bandBloklari.sort((a, b) => a.x - b.x);
  const okunan = bandBloklari
    .map((n) => n.blok === ayar.EFSANE_BACON_A ? "A" : "B").join("");
  const cozulen = sifre.harfiKoordinat(sifre.baconCoz(okunan));

  kontrol("bant COZULUNCE sonraki durak cikiyor",
          cozulen && cozulen.x === sonraki.x && cozulen.z === sonraki.z,
          JSON.stringify(cozulen) + " beklenen " + JSON.stringify(sonraki));

  /* SGA katmani ikinci sifrenin adini soylemeli */
  /* v4.72: yazit artik tek kelime degil, korkutucu bir cumle.
     Anahtar cumlenin ICINDE geciyor -- ipucu hala var.      */
  kontrol("SGA katmani ikinci sifrenin adini veriyor",
          ayar.EFSANE_YAZI.toUpperCase().includes("BACON"),
          ayar.EFSANE_YAZI);

  /* SON durakta koordinat degil bitis sozu olmali */
  const sonPlan = efs.duragiPlanla(
    { x: kok.x, y: 80, z: kok.z }, ayar.EFSANE_TABAN, sonraki, true);
  /* v4.72: SON durakta artik "SON" degil TOHUM var.
     Kullanici: "son durakta sahte seed". Cozen kisi elinde
     bir seed'le kaliyor, aratiyor, Giant Alex cikiyor.     */
  const sonBant = sonPlan.noktalar.filter(
    (n) => n.blok === ayar.EFSANE_BACON_A || n.blok === ayar.EFSANE_BACON_B);
  sonBant.sort((a, b) => a.x - b.x);
  const sonOkunan = sonBant
    .map((n) => n.blok === ayar.EFSANE_BACON_A ? "A" : "B").join("");
  const sonCozulen = sifre.harfRakam(sifre.baconCoz(sonOkunan));
  kontrol("SON durak bandi COZULUNCE tohum cikiyor",
          sonCozulen === ayar.EFSANE_TOHUM,
          sonCozulen + " beklenen " + ayar.EFSANE_TOHUM);
  kontrol("tohum sadece rakam", /^[0-9]+$/.test(ayar.EFSANE_TOHUM),
          ayar.EFSANE_TOHUM);
}

console.log("\n=== 6. YAZIT METNI (v4.72) ===");
{
  /* Kullanici: "yazacagin kelimeyi daha korkutucu bir seye
     donusturelim; Mojang'in bile ugrasamadigi bir dunya."   */
  const metin = ayar.EFSANE_YAZI.toUpperCase();
  kontrol("yazit Mojang'i aniyor", metin.includes("MOJANG"), metin);
  kontrol("yazit ANAHTARI veriyor (ipucu var secildi)",
          metin.includes("BACON"), metin);

  /* SGA'da yalniz A-Z var: Turkce harf kalirsa cumlede
     SESSIZCE delik acilir ve yazit cozulemez.               */
  const katlanmis = sifre.sgaKatla(ayar.EFSANE_YAZI);
  kontrol("Turkce harf KALMIYOR", /^[A-Z ]+$/.test(katlanmis), katlanmis);
  kontrol("katlama gercekten calisiyor",
          sifre.sgaKatla("ÇÖZEMEDİ") === "COZEMEDI",
          sifre.sgaKatla("ÇÖZEMEDİ"));

  /* Uzun metin SATIRLARA bolunmeli: tek satir 400 blok
     genisliginde okunmaz bir serit olurdu.                  */
  const blok = sifre.sgaBlok(ayar.EFSANE_YAZI, ayar.EFSANE_SATIR_HARF);
  kontrol("metin satirlara bolunuyor", blok.satirlar.length > 1,
          blok.satirlar.length + " satir: " + JSON.stringify(blok.satirlar));
  kontrol("hicbir satir sinirdan uzun degil",
          blok.satirlar.every((r) => r.length <= ayar.EFSANE_SATIR_HARF),
          blok.satirlar.map((r) => r.length).join(", "));
  kontrol("yazit alani makul", blok.en <= 200 && blok.boy <= 100,
          blok.en + "x" + blok.boy);
  console.log("     yazit: " + blok.satirlar.join(" / "));
}

console.log("");
console.log("=== 7. ULASILABILIYOR MU (v6.2) ===");
{
  /* v4.83 dersi: "calisiyor mu" ile "ulasilabiliyor mu" AYRI
     sorular. Yapinin kendisi 1-6. bolumlerde sinaniyor; burasi
     oyuncunun ona nasil basacagini tutuyor.

     Efsane yetenegi jest sirasinda 270. sirada -- oraya
     ulasmak icin onlarca kez "egil + yukari bak" gerekirdi.
     Tablette tek dokunusluk yol MENU satiri; o satir
     silinirse yapi calismaya devam eder ama KIMSE KURAMAZ ve
     hicbir test bunu fark etmezdi.                          */
  const kaynak = readFileSync(BP + "/scripts/main.js", "utf8");

  kontrol("yetenek kayit defterinde", !!yetenek("efsane_yapisi"));
  kontrol("main.js efsane.js'i import ediyor",
          kaynak.includes('import "./yetenekler/efsane.js";'));

  /* Menu satiri VAR mi ve DOGRU yetenegi mi tetikliyor? */
  const satir = /\{\s*ad:\s*"[^"]*Efsane yapisi kur"[\s\S]{0,160}?yetenekTetikle\(oyuncu,\s*"efsane_yapisi"\)/
    .test(kaynak);
  kontrol("menude 'Efsane yapisi kur' satiri var ve dogru yetenegi cagiriyor",
          satir);

  /* O satir gercekten menuye giden listede mi? Fonksiyonun
     icinde olup menuye HIC verilmemesi eski bir tuzak.

     Basit bir indexOf YETMIYOR: ayni metin bir YORUM icinde de
     gecebiliyor (nitekim gecti -- import satirinin yorumunda).
     O yuzden menuEkleri()'nin GOVDESI ayrilip icinde araniyor. */
  function govde(ad) {
    const bas = kaynak.indexOf("function " + ad + "(");
    if (bas === -1) return "";
    let i = kaynak.indexOf("{", bas), derinlik = 0;
    for (let j = i; j < kaynak.length; j++) {
      if (kaynak[j] === "{") derinlik++;
      else if (kaynak[j] === "}") {
        derinlik--;
        if (derinlik === 0) return kaynak.slice(bas, j + 1);
      }
    }
    return "";
  }
  const menuGovde = govde("menuEkleri");
  kontrol("menuEkleri() govdesi bulundu", menuGovde.length > 0,
          menuGovde.length + " karakter");
  kontrol("satir menuEkleri() GOVDESINDE",
          menuGovde.includes("Efsane yapisi kur"));
  kontrol("menuEkleri() gercekten menuye veriliyor",
          /menuAc\([\s\S]{0,900}?menuEkleri\(oyuncu\)/.test(kaynak));

  /* Ayar kapisi: EFSANE_ACIK false ise yetenek calismamali
     ama menude de vaat edilmemeli -- "var gorunen, olmayan
     sey" en kotu hal.                                       */
  kontrol("EFSANE_ACIK ayari var", typeof ayar.EFSANE_ACIK === "boolean",
          String(ayar.EFSANE_ACIK));
  kontrol("efsane.js bu ayara BAKIYOR",
          readFileSync(BP + "/scripts/yetenekler/efsane.js", "utf8")
            .includes("EFSANE_ACIK"));
}

console.log("");
console.log("=== 8. YAZIT YERDE DEGIL, DIKILI TABELA (v6.6) ===");
{
  /* Kullanici: "o kadar yaziyi neden yere yazdin, yani
     bloklarla tabela yapsaydin ya."

     Yazit alani OLCULDU: 116x41 blok. Yere serilince yerden
     bakan hicbir sey goremiyordu.

     ASIL SINAMA: tabela GERI OKUNABILIYOR MU. Dikey bir
     duzleme tasirken iki sessiz hata var ve ikisi de yaziyi
     cozulemez yapar:
       1) y'yi terslemeyi unutmak  -> yazi bas asagi
       2) yanlis tarafa koymak     -> yazi AYNALANMIS
     Ikisi de "blok sayisi dogru" testinden gecerdi. O yuzden
     harfler tabeladan SGA tablosuyla geri cozuluyor.       */
  const sga = await import("./pack/yetenekler/_sga.js");
  const kok = { x: 0, z: 0 };
  const plan = efs.duragiPlanla({ x: 0, y: 64, z: 0 }, ayar.EFSANE_TABAN,
                                efs.zincirNoktasi(kok, 1), false);
  const harf = plan.noktalar.filter((p) => p.blok === ayar.EFSANE_SGA_BLOK);

  kontrol("harfler TEK BIR DIKEY duzlemde (z sabit)",
          new Set(harf.map((p) => p.z)).size === 1,
          new Set(harf.map((p) => p.z)).size + " ayri z");
  kontrol("harfler yere serilmiyor (y degisiyor)",
          new Set(harf.map((p) => p.y)).size > 10,
          new Set(harf.map((p) => p.y)).size + " ayri y");

  /* --- Tabelayi GERI OKU --- */
  const dolu = new Set(harf.map((p) => p.x + "," + p.y));
  const yUst = Math.max(...harf.map((p) => p.y));
  const xSol = Math.min(...harf.map((p) => p.x));
  const tablo = new Map();
  for (const [c, bit] of Object.entries(sga.SGA)) tablo.set(bit.join("|"), c);
  const BOY = sga.SGA_BOY, ARA = 1, SATIR_ARA = 3;
  const beklenen = sga.SGA ? null : null;
  const satirlar = sifre.sgaBlok(ayar.EFSANE_YAZI, ayar.EFSANE_SATIR_HARF).satirlar;
  const okunan = [];
  for (let r = 0; r < satirlar.length; r++) {
    const ust = yUst - r * (BOY + SATIR_ARA);
    let metin = "";
    for (let k = 0; k < ayar.EFSANE_SATIR_HARF; k++) {
      const x0 = xSol + k * (BOY + ARA);
      const bit = [];
      for (let dy = 0; dy < BOY; dy++) {
        let sat = "";
        for (let dx = 0; dx < BOY; dx++) {
          sat += dolu.has((x0 + dx) + "," + (ust - dy)) ? "#" : ".";
        }
        bit.push(sat);
      }
      if (!bit.some((t) => t.includes("#"))) { metin += " "; continue; }
      const c = tablo.get(bit.join("|"));
      metin += (c === undefined ? "?" : c);
    }
    okunan.push(metin.trimEnd());
  }
  kontrol("TABELA GERI OKUNUYOR (bas asagi degil, aynali degil)",
          okunan.join("|") === satirlar.join("|"),
          JSON.stringify(okunan) + " beklenen " + JSON.stringify(satirlar));

  /* --- Yon: Bedrock'ta kuzey -z ve KUZEYE bakanin sagi +x.
         Yani harfler ancak kuzeye bakan bir okuyucuda soldan
         saga dizilir. Tabela guneye konsaydi yazi
         aynalanirdi.                                        */
  kontrol("tabela piramidin KUZEYINDE (-z)", harf[0].z < 0,
          "z = " + harf[0].z);

  /* --- Bacon bandi piramidin ARKASINDA kalmamali ---
     Ilk cizimde tam bu oldu: panel alcakti, piramit bandin
     orta 11 blogunu kapatiyordu ve sifre cozulemiyordu.
     Cizdirmeden fark edilmezdi.                            */
  const bant = plan.noktalar.filter(
    (p) => p.blok === ayar.EFSANE_BACON_A || p.blok === ayar.EFSANE_BACON_B);
  const piramitXY = new Set(plan.noktalar
    .filter((p) => p.blok === ayar.EFSANE_BLOK)
    .map((p) => p.x + "," + p.y));
  const kapali = bant.filter((p) => piramitXY.has(p.x + "," + p.y));
  kontrol("Bacon bandini piramit KAPATMIYOR", kapali.length === 0,
          kapali.length + " blok piramidin arkasinda");
  const piramitTepe = Math.max(...plan.noktalar
    .filter((p) => p.blok === ayar.EFSANE_BLOK).map((p) => p.y));
  kontrol("panel piramidin tepesini asiyor",
          Math.min(...bant.map((p) => p.y)) > piramitTepe,
          "bant y=" + Math.min(...bant.map((p) => p.y)) +
          " piramit tepe y=" + piramitTepe);

  /* Tabela AYAKLI olmali: cimenin ustunde asili durmasin. */
  const direk = plan.noktalar.filter(
    (p) => p.blok === ayar.EFSANE_TABELA_DIREK && p.y < 64 + 4);
  kontrol("tabelanin ayaklari var", direk.length > 0,
          direk.length + " direk blogu");

  /* Yere serilen sey artik YAZI degil sadece zemin. */
  const yerdekiHarf = harf.filter((p) => p.y <= 64);
  kontrol("yerde HIC harf kalmadi", yerdekiHarf.length === 0,
          yerdekiHarf.length + " harf hala yerde");
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> efsane yapisi calisiyor");
process.exit(hata ? 1 : 0);
