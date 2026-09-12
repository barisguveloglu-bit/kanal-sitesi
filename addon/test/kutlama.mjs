/* KUTLAMA SAHNESİ ve VİKTOR  (v7.75)

   Kullanicinin istegi alti sart tasiyordu; her biri burada
   ayri bir madde. "Isim etiketi gozukmesin" gibi bir sart
   ancak dosyadan okunarak dogrulanabilir -- oyun
   calistirilmiyor.                                          */
import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, _durum, world } from "@minecraft/server";
import { readFileSync } from "node:fs";

const kutlama = await import("./pack/yetenekler/kutlama.js");
const kayit   = await import("./pack/yetenekler/kayit.js");
const ayar    = await import("./pack/ayarlar.js");
const butce   = await import("./pack/butce.js");
await import("./pack/yetenekler/viktor.js");

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
let hata = false;
function kontrol(ad, kosul, not) {
  if (!kosul) hata = true;
  console.log("  " + (kosul ? "✓" : "✗") + " " + ad +
              (not ? "  ::  " + not : ""));
}

function kur(id, elde) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, { x: 0.5, y: 64, z: 0.5 });
  o.id = id; o.typeId = "minecraft:player";
  o._komutlar = []; o._mesaj = []; o._hasar = [];
  o.hasTag = () => false;
  o.runCommand = (k) => { o._komutlar.push(k); return { successCount: 1 }; };
  o.sendMessage = (m) => o._mesaj.push(m);
  o.applyDamage = (n) => { o._hasar.push(n); return true; };
  o.getComponent = (ad) => {
    if (ad !== "minecraft:equippable") return undefined;
    return { getEquipment: () => (elde ? { typeId: elde } : undefined) };
  };
  D.boyut._varliklar = [o];
  _durum.oyuncular = [o];
  if (butce.butceSifirla) butce.butceSifirla();
  kutlama.kutlamaUnut();
  return { D, o };
}

console.log("=== 1. İSTEĞİN ALTI ŞARTI ===");
{
  /* 1) iki bembeyaz goz -- doku URETECTEN okunuyor */
  const uretec = readFileSync(KOK + "/kol_uret.py", "utf8");
  kontrol("izleyici dokusu BEMBEYAZ goz ciziyor",
          /def izleyici_dokusu/.test(uretec) &&
          /\(255, 255, 255, 255\)/.test(
            uretec.slice(uretec.indexOf("def izleyici_dokusu"),
                         uretec.indexOf("def izleyici_geo"))));

  /* 2) "bayagi olsun" */
  kontrol("bir sahnede epey izleyici var (>=12)",
          ayar.KUTLAMA_ADET >= 12, ayar.KUTLAMA_ADET + " izleyici");

  /* 3) etrafinda: iki halka, ikisi de oyuncunun cevresinde */
  kontrol("halka yaricapi oyuncunun cevresinde (2-10 blok)",
          ayar.KUTLAMA_IC_YARICAP >= 2 && ayar.KUTLAMA_YARICAP <= 10 &&
          ayar.KUTLAMA_IC_YARICAP < ayar.KUTLAMA_YARICAP,
          ayar.KUTLAMA_IC_YARICAP + " / " + ayar.KUTLAMA_YARICAP);

  /* 5) BUYUK HARF ve INGILIZCE */
  kontrol("replik tamamen BUYUK HARF",
          ayar.KUTLAMA_METIN === ayar.KUTLAMA_METIN.toUpperCase(),
          ayar.KUTLAMA_METIN);
  kontrol("replikte Turkce harf YOK (ingilizce)",
          !/[çğıöşüÇĞİÖŞÜ]/.test(ayar.KUTLAMA_METIN));
  kontrol("replik 'EARSH' geciyor",
          ayar.KUTLAMA_METIN.indexOf("EARSH") >= 0);

  /* 7) 25 saniye */
  kontrol("sahne 25 saniye (500 tik)",
          ayar.KUTLAMA_SURE === 500 && ayar.KUTLAMA_SANIYE === 25,
          ayar.KUTLAMA_SURE + " tik / " + ayar.KUTLAMA_SANIYE + " sn");
}

console.log("\n=== 2. İSİM ETİKETİ GÖZÜKMÜYOR ===");
{
  /* Sart ancak dosyadan okunarak dogrulanabilir: oyun
     calistirilmiyor. Iki yer birden denetleniyor.           */
  const kod = readFileSync(
    KOK + "/Simsek_TNT_ToprakTopu/scripts/yetenekler/kutlama.js", "utf8");
  kontrol("script izleyiciye nameTag ATAMIYOR",
          !/\.nameTag\s*=/.test(kod));
  const varlik = JSON.parse(readFileSync(
    KOK + "/Simsek_TNT_ToprakTopu/entities/izleyici.json", "utf8"));
  const bilesen = varlik["minecraft:entity"].components || {};
  kontrol("varlik tanimi ad gostermiyor",
          !bilesen["minecraft:custom_name_visible"] &&
          !(bilesen["minecraft:nameable"] || {}).always_show,
          Object.keys(bilesen).filter((b) => /name/i.test(b)).join(", "));
}

console.log("\n=== 3. İZLEYİCİLER SALDIRAMAZ ===");
{
  /* Kullanicinin bu konudaki sarti iki surumdur ayni ve
     garanti KODA degil VARLIK TANIMINA yazili.              */
  const v = JSON.parse(readFileSync(
    KOK + "/Simsek_TNT_ToprakTopu/entities/izleyici.json", "utf8"));
  const b = Object.keys(v["minecraft:entity"].components || {});
  const ai = b.filter((x) => /behavior|target|attack|movement|navigation/i.test(x));
  kontrol("izleyicide AI/hedef/saldiri bileseni YOK",
          ai.length === 0, ai.join(", "));
  kontrol("hasar vermiyor (damage_sensor kapali)",
          (v["minecraft:entity"].components["minecraft:damage_sensor"] || {})
            .triggers[0].deals_damage === false);
}

console.log("\n=== 4. SAHNE ÇALIŞIYOR VE TEMİZLENİYOR ===");
{
  const { D, o } = kur("kut1");
  const tanim = kayit.yetenekAl ? kayit.yetenekAl("kutlama") : undefined;
  const is = tanim ? tanim.olustur(o) : undefined;
  kontrol("sahne basladi (is uretildi)", !!is);

  /* Tick basina varlik butcesi DORT; onsekizi bir tickte
     istemek butceyi tuketirdi. Sahne bilerek asamali
     doguruyor, test de oyle sayiyor.                        */
  for (let i = 0; i < 12; i++) {
    tickIlerlet(ayar.KUTLAMA_HIZALA);
    if (butce.butceSifirla) butce.butceSifirla();
    is.calis();
  }
  const dogan = D.sayac.dogan.filter((d) => d.tip === ayar.KUTLAMA_KIMLIK);
  kontrol("izleyicilerin HEPSI dogdu (asamali)",
          dogan.length === ayar.KUTLAMA_ADET,
          dogan.length + " / " + ayar.KUTLAMA_ADET);
  kontrol("defterde kayitli", kutlama.izleyiciSayisi() === dogan.length,
          kutlama.izleyiciSayisi() + " kayit");

  kontrol("korluk verildi",
          o._komutlar.some((k) => /^effect @s blindness/.test(k)),
          o._komutlar.filter((k) => /effect/.test(k)).join(" | "));
  kontrol("korlugun SURESI var (kalici degil)",
          o._komutlar.some((k) =>
            new RegExp("^effect @s blindness " + (ayar.KUTLAMA_SANIYE + 1) + "\\b").test(k)));

  /* Replik sohbete dustu mu -- sahte dunya world.sendMessage
     cagrisini kaydediyor mu diye bakiyoruz; yoksa oyuncuya. */
  const sohbet = (_durum.sohbet || []).concat(o._mesaj);
  kontrol("replik sohbete dustu",
          sohbet.some((m) => String(m).indexOf(ayar.KUTLAMA_METIN) >= 0),
          JSON.stringify(sohbet.slice(0, 2)));

  /* Sure bitince temizleniyor mu. */
  /* Sure SAYACA gore olculuyor: `calis()` her cagrilisinda
     bir tik dusuyor. Yukarida hizalama icin 12 kez cagrildi,
     yani kalan 500-12. Toplam cagri sayisi 500 olmali.     */
  let tur = 12;
  while (tur < ayar.KUTLAMA_SURE + 50) {
    tickIlerlet(1); tur++;
    if (is.calis()) break;
  }
  is.bitir();
  kontrol("sahne tam 25 saniyelik (500 cagri) surdu",
          tur >= ayar.KUTLAMA_SURE - 2 && tur <= ayar.KUTLAMA_SURE + 2,
          tur + " cagri / " + ayar.KUTLAMA_SURE);
  /* DEFTER DEGIL DUNYA. Ilk yazilista yalniz `izleyiciSayisi()`
     sifira dusuyor mu diye bakiliyordu ve mutasyon bataryasi
     bunu KACIRDI: `remove()` cagrisini silmek defteri yine
     bosaltiyor, ama onsekiz izleyici oyuncunun dunyasinda
     dikilmeye devam ediyor. Asil sart bu, o yuzden olcu
     dunyanin kaldirma sayacina tasindi.                     */
  kontrol("izleyicilerin HEPSI dunyadan kaldirildi",
          D.sayac.kaldirilan >= ayar.KUTLAMA_ADET,
          D.sayac.kaldirilan + " kaldirilan / " + ayar.KUTLAMA_ADET);
  kontrol("defter de bosaldi",
          kutlama.izleyiciSayisi() === 0,
          kutlama.izleyiciSayisi() + " kaldi");
  kontrol("korluk de temizlendi (sahneyle birlikte)",
          o._komutlar.some((k) => /effect @s clear blindness/.test(k)));

  const kod = readFileSync(
    KOK + "/Simsek_TNT_ToprakTopu/scripts/yetenekler/kutlama.js", "utf8");
  kontrol("acilis supurmesi var (dunya kapanirsa ortada kalmasin)",
          /izleyicileriSupur/.test(kod));
  const m = readFileSync(KOK + "/Simsek_TNT_ToprakTopu/scripts/main.js", "utf8");
  kontrol("supurme ana donguye baglanmis",
          /izleyicileriSupur\(\)/.test(m));
  kontrol("defter Kacan Golge'ninkinden AYRI",
          ayar.KUTLAMA_KAYIT_ANAHTAR !== ayar.EFSANE_GOLGE_KAYIT_ANAHTAR);
}

console.log("\n=== 5. VİKTOR: AMETİST ŞARTI ===");
{
  /* Kaynakta her komut `hasitem={item=amethyst_shard,...}`
     ile korunuyor. Sartin KALDIRILMADIGI olculuyor.         */
  const YETENEKLER = ["viktor_klon", "viktor_isin", "viktor_buyu",
                      "viktor_ucus", "viktor_savur", "viktor_el",
                      "viktor_cember"];
  const eksik = YETENEKLER.filter((k) => !kayit.yetenekAl(k));
  kontrol("yedi Viktor yetenegi de kayitli", eksik.length === 0,
          eksik.join(", "));

  /* Ametist YOKKEN hicbiri is yapmamali. */
  const acikKalan = [];
  for (const k of YETENEKLER) {
    const { o } = kur("v-" + k, undefined);        // eli bos
    const is = kayit.yetenekAl(k).olustur(o);
    const isledi = o._komutlar.some((c) => !/^title|^titleraw/.test(c));
    if (is || isledi) acikKalan.push(k);
  }
  kontrol("ametist YOKKEN hicbiri calismiyor",
          acikKalan.length === 0, acikKalan.join(", "));

  /* Ametist VARKEN calismali. */
  const calismayan = [];
  for (const k of YETENEKLER) {
    const { o } = kur("va-" + k, ayar.VIKTOR_ANAHTAR);
    const is = kayit.yetenekAl(k).olustur(o);
    if (!is && o._komutlar.length === 0) calismayan.push(k);
  }
  kontrol("ametist VARKEN hepsi calisiyor",
          calismayan.length === 0, calismayan.join(", "));
}

console.log("\n=== 6. VİKTOR: KAYNAKTAKİ İKİ KUSUR DÜZELTİLDİ ===");
{
  const kod = readFileSync(
    KOK + "/Simsek_TNT_ToprakTopu/scripts/yetenekler/viktor.js", "utf8");

  /* 1) Kaynakta `type!player` yaziyor -- gecersiz secici, oyun
        satiri sessizce reddediyor.                          */
  /* YORUMLAR SOKULUYOR. Ilk yazilista ham dosyada aranmisti
     ve test DUSMUSTU -- cunku viktor.js'in yorumu kaynaktaki
     hatayi ANLATIRKEN o dizgeyi yaziyor. Ayni tuzak
     efsane_korku.mjs'te de yasandi: tarama kendi yorumumuzu
     yakaliyor.                                              */
  const kodsuz = kod.replace(/\/\*[\s\S]*?\*\//g, "")
                    .replace(/^\s*\/\/.*$/gm, "");
  kontrol("gecersiz 'type!player' KULLANILMIYOR",
          kodsuz.indexOf("type!player") < 0);

  const { o } = kur("vs", ayar.VIKTOR_ANAHTAR);
  kayit.yetenekAl("viktor_savur").olustur(o);
  const savur = o._komutlar.find((k) => /spreadplayers/.test(k)) || "";
  kontrol("savurma OYUNCUYU disliyor (type=!player)",
          /type=!player/.test(savur), savur);
  kontrol("savurma menzili sinirli (c=1)",
          /c=1/.test(savur));

  /* 2) Klon KALICI DEGIL: kaynakta `summon npc` sonsuza kadar
        kaliyordu.                                           */
  const { D: D2, o: o2 } = kur("vk", ayar.VIKTOR_ANAHTAR);
  kayit.yetenekAl("viktor_klon").olustur(o2);
  const klon = D2.sayac.dogan.filter((d) => d.tip === ayar.VIKTOR_KLON_KIMLIK);
  kontrol("klon dogdu", klon.length === 1, klon.length + " klon");
  const oncekiKaldirilan = D2.sayac.kaldirilan;
  tickIlerlet(ayar.VIKTOR_KLON_SURE + 5);
  kontrol("klon suresi dolunca KENDILIGINDEN gidiyor",
          D2.sayac.kaldirilan > oncekiKaldirilan,
          D2.sayac.kaldirilan + " kaldirilan");

  /* 3) Klon kiligi de saldiramaz. */
  const kil = JSON.parse(readFileSync(
    KOK + "/Simsek_TNT_ToprakTopu/entities/carpik_kilik.json", "utf8"));
  const kb = Object.keys(kil["minecraft:entity"].components || {});
  kontrol("klon kiliginda AI/hedef bileseni YOK",
          kb.filter((x) => /behavior|target|attack/i.test(x)).length === 0);

  /* 4) Poz KALICI DEGIL -- v7.65'in dersi. */
  const { o: o3 } = kur("ve", ayar.VIKTOR_ANAHTAR);
  kayit.yetenekAl("viktor_el").olustur(o3);
  const poz = o3._komutlar.find((k) => /playanimation/.test(k)) || "";
  kontrol("el pozu KALICI degil (gecis suresi var)",
          /holding_spyglass a 3\b/.test(poz), poz);

  /* 5) Hicbir Viktor yetenegi oyuncuya hasar vermiyor. */
  const hasarli = [];
  for (const k of ["viktor_klon", "viktor_isin", "viktor_buyu",
                   "viktor_ucus", "viktor_savur", "viktor_el",
                   "viktor_cember"]) {
    const { o: p } = kur("vh-" + k, ayar.VIKTOR_ANAHTAR);
    const is = kayit.yetenekAl(k).olustur(p);
    for (let i = 0; i < 80 && is; i++) { tickIlerlet(1); if (is.calis()) break; }
    if (p._hasar.length > 0) hasarli.push(k);
    if (p._komutlar.some((c) => /^(kill|damage|clear @|kick)/.test(c))) {
      hasarli.push(k + "(komut)");
    }
  }
  kontrol("hicbir Viktor yetenegi hasar vermiyor",
          hasarli.length === 0, hasarli.join(", "));
}

console.log("\n=== 7. SIRA ÇATIŞMASI YOK ===");
{
  kontrol("jest sirasinda catisma yok",
          kayit.siraDenetimi().length === 0,
          JSON.stringify(kayit.siraDenetimi()));
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> kutlama ve viktor yerinde");
process.exit(hata ? 1 : 0);
