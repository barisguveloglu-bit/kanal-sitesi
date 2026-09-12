/* v7.76 -- ESYA IKONLARI VE ZIRH PUANI

   Kullanici: "itemler gozukmuyor ve yarisi da kullanilmiyor,
   zirhi takiyorum ya normalde onun zirhinin yaninda 12 yaziyor
   ama 5 tane zirh kapliyor, itemleri kontrol et neden
   gozukmuyorlar"

   ---- OLCUM ----
   item_texture.json'daki 547 girdinin dosyalari olculdu:

       16x16   435 |  32x32    60 |  64x64    29 | 48x48    1
      128x128   11 | 256x256    7
      383x593    1 | 384x618    1 | 534x1183  1 | 539x1379  1

   Son dort satir `kns_dusmus_1..4` -- kaynak paketten OLDUGU
   GIBI kopyalanmis Java modu render'lari. O dort esya yaratici
   menusunde gorunmuyor (v6.4), ama menude gorunmemek atlasta
   yer kaplamamak DEGIL: kayitlari item_texture.json'da duruyor.

   Bedrock butun esya dokularini TEK atlasa diziyor ve hucre
   olcusu EN BUYUK girdiye gore belirleniyor. 1379 piksellik bir
   hucreyle 547 girdi hicbir cihazin doku sinirina sigmaz --
   256'da bile sigmiyor (4096/256 = 16 hucre/satir = 256 hucre).
   Atlas kurulamayinca TEK ikon degil BUTUN esyalar eksik-doku
   karesine doner. Bildirilen belirti tam olarak buydu.

   ---- ZIRH ----
   `kns_dusmus_1..4` govde yuvasinda "protection": 750
   tasiyordu. Bedrock'ta zirh cubugu 10 ikon = 20 PUAN; tam
   elmas takim tam tamina 20. Yani 20'yi asan sayi oyunda
   gorunmuyor, yalniz esyada yazani yalanliyor.

   Bu dosya dordunu birden kilitliyor:
     1. her ikon KARE ve ikinin kuvveti
     2. hicbiri IKON_EN_BUYUK'u asmiyor
     3. atlas 2048'lik sinira sigiyor (hesapla)
     4. hicbir giyilebilir 20 puani asmiyor
   ve ureteci de kilitliyor: cagri silinirse madde dusuyor.   */

import { readFileSync, existsSync, readdirSync } from "node:fs";

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const BP = KOK + "/Simsek_TNT_ToprakTopu";
const RP = KOK + "/Simsek_Kol_Kaynak";

let gecti = 0;
const hatalar = [];
function ol(ad, kosul, ek) {
  if (kosul) { gecti++; return; }
  hatalar.push(ad + (ek ? "  -> " + ek : ""));
}

/* PNG IHDR'den en/boy. Butun dosyayi cozmeye gerek yok --
   olcu 16. bayttan itibaren iki big-endian tamsayi.          */
function pngOlcu(yol) {
  const d = readFileSync(yol);
  if (d.length < 24) return undefined;
  if (d.readUInt32BE(0) !== 0x89504e47) return undefined;
  return { en: d.readUInt32BE(16), boy: d.readUInt32BE(20) };
}
const ikininKuvveti = (n) => n > 0 && (n & (n - 1)) === 0;

/* Uretecteki tavan burada TEKRAR YAZILMIYOR, okunuyor:
   iki yerde duran bir sayi eninde sonunda ayrisiyor.          */
const uretec = readFileSync(KOK + "/kol_uret.py", "utf8");
const enBuyuk = Number((uretec.match(/^IKON_EN_BUYUK = (\d+)$/m) || [])[1]);
const zirhTavan = Number((uretec.match(/^ZIRH_TAVAN = (\d+)$/m) || [])[1]);

ol("IKON_EN_BUYUK uretecte tanimli", Number.isFinite(enBuyuk), String(enBuyuk));
ol("ZIRH_TAVAN uretecte tanimli", Number.isFinite(zirhTavan), String(zirhTavan));
ol("zirh tavani Bedrock cubugu kadar (20 puan)", zirhTavan === 20,
   String(zirhTavan));

/* ---- 1. ATLASIN KENDISI ---- */
const atlas = JSON.parse(readFileSync(RP + "/textures/item_texture.json", "utf8"));
const kayitlar = Object.entries(atlas.texture_data);
ol("atlasta kayit var", kayitlar.length > 0, String(kayitlar.length));

const eksikDosya = [];
const kareDegil = [];
const kuvvetDegil = [];
const buyuk = [];
let enBuyukOlculen = 0;

for (const [anahtar, deger] of kayitlar) {
  const yollar = typeof deger.textures === "string"
    ? [deger.textures] : deger.textures;
  for (const y of yollar) {
    const tam = RP + "/" + y + ".png";
    if (!existsSync(tam)) { eksikDosya.push(anahtar); continue; }
    const o = pngOlcu(tam);
    if (!o) { eksikDosya.push(anahtar + " (PNG degil)"); continue; }
    if (o.en !== o.boy) kareDegil.push(`${anahtar} ${o.en}x${o.boy}`);
    else if (!ikininKuvveti(o.en)) kuvvetDegil.push(`${anahtar} ${o.en}`);
    if (Math.max(o.en, o.boy) > enBuyuk) {
      buyuk.push(`${anahtar} ${o.en}x${o.boy}`);
    }
    enBuyukOlculen = Math.max(enBuyukOlculen, o.en, o.boy);
  }
}

ol("atlastaki her doku diskte", eksikDosya.length === 0,
   eksikDosya.slice(0, 5).join(", "));
ol("her ikon KARE", kareDegil.length === 0, kareDegil.slice(0, 5).join(", "));
ol("her ikon ikinin kuvveti", kuvvetDegil.length === 0,
   kuvvetDegil.slice(0, 5).join(", "));
ol("hicbir ikon IKON_EN_BUYUK'u asmiyor", buyuk.length === 0,
   buyuk.slice(0, 5).join(", "));

/* ---- 2. ATLAS SIGIYOR MU ----
   Hesap, yorumdaki hesabin kendisi. Sinir 2048 secildi cunku
   kullanici tablette oynuyor; 4096 varsayimi "muhtemelen
   calisir" olurdu, bu ise "kesin sigiyor".                   */
const SINIR = 2048;
const hucre = Math.max(1, enBuyukOlculen);
const satirBasi = Math.floor(SINIR / hucre);
const kapasite = satirBasi * satirBasi;
ol("atlas 2048x2048'e sigiyor", kapasite >= kayitlar.length,
   `hucre ${hucre}px -> kapasite ${kapasite}, gereken ${kayitlar.length}`);

/* ---- 3. ZIRH PUANLARI ---- */
const asan = [];
const dokusuz = [];
for (const dosya of readdirSync(BP + "/items")) {
  if (!dosya.endsWith(".json")) continue;
  const d = JSON.parse(readFileSync(BP + "/items/" + dosya, "utf8"));
  const c = d["minecraft:item"].components;
  const g = c["minecraft:wearable"];
  if (g && Number(g.protection) > zirhTavan) {
    asan.push(`${dosya} ${g.protection}`);
  }
  const z = c["minecraft:armor"];
  if (z && Number(z.protection) > zirhTavan) asan.push(`${dosya} armor ${z.protection}`);
  /* Ikonu atlasta olmayan esya oyunda mor-siyah kare olur.
     `will_kilic` vanilla ikonu (golden_sword) kullaniyor --
     tek mesru istisna ve adiyla muaf.                        */
  const ik = c["minecraft:icon"];
  const anahtar = typeof ik === "string" ? ik : (ik && ik.texture);
  if (anahtar && !atlas.texture_data[anahtar] && !anahtar.startsWith("golden_")) {
    dokusuz.push(`${dosya} -> ${anahtar}`);
  }
}
ol("hicbir giyilebilir zirh tavanini asmiyor", asan.length === 0,
   asan.slice(0, 5).join(", "));
ol("her esyanin ikonu atlasta", dokusuz.length === 0,
   dokusuz.slice(0, 5).join(", "));

/* ---- 4. URETEC SUPURGESI YERINDE ----
   Dosyalari elle duzeltmek yetmez: bir sonraki uretim kaynaktan
   yeniden kopyalayip eski olculeri geri getirirdi. Bu iki madde
   tam olarak o geri donusu yakaliyor.                        */
ol("uretecte olcu supurgesi tanimli",
   /def ikonlari_olcule\(/.test(uretec));
ol("supurge main()'den cagriliyor",
   /ikonlari_olcule\(os\.path\.join\(RP, "textures\/item"\)\)/.test(uretec));
ol("zirh puani giyilebilirlere uygulaniyor",
   (uretec.match(/zirh_puani\(/g) || []).length >= 6,
   String((uretec.match(/zirh_puani\(/g) || []).length));

if (hatalar.length) {
  console.error("KALDI:");
  for (const h of hatalar) console.error("  - " + h);
  process.exit(1);
}
console.log("ikon_atlas.mjs  gecti: " + gecti + "  kaldi: yok");
