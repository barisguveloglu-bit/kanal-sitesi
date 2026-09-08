/* YETENEGI ADIYLA CALISTIRMA  (v7.66)

   ---- NEDEN VAR ----
   Tarama sunu olctu: jest dongusu 216 yetenege ulasti ve yeni
   eklenen her sey listenin SONUNA giriyor (sira numaralari
   artan). JJK, Simbiyot ve Seytan Meyveleri 201-216 arasinda
   kaldi -- jestle ulasmak icin 200'den fazla kez donmek
   gerekiyordu. Yazildilar, sinandilar ve pratikte
   ERISILEMEZDILER.

   Bu dosyanin tuttugu en onemli sey: KAPININ AYNI KAPI
   OLMASI. Sohbetten calistirmak jestten daha serbest olmamali
   -- olsaydi "korumali yetenek" (v7.62) ve bekleme suresi
   sohbetten atlanabilirdi.                                   */
import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, esyaKaydet, _durum } from "@minecraft/server";

esyaKaydet("pa:kol_toprak", "pa:iksir_nitroksin");
const w = console.warn;
console.warn = () => {};
await import("./pack/main.js");
console.warn = w;

const ayar   = await import("./pack/ayarlar.js");
const kayit  = await import("./pack/yetenekler/kayit.js");
const sohbet = await import("./pack/sohbet.js");

let hata = false;
const kontrol = (ad, kosul, ek) => {
  if (!kosul) hata = true;
  console.log(`  ${kosul ? "✓" : "✗"} ${ad}${ek ? "  ::  " + ek : ""}`);
};
function kur(id) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, { x: 0.5, y: 64, z: 0.5 });
  o.id = id; o.typeId = "minecraft:player";
  o._komutlar = []; o._mesaj = [];
  o.runCommand = function (k) { this._komutlar.push(k); return { successCount: 1 }; };
  o.sendMessage = function (m) { this._mesaj.push(m); };
  D.boyut._varliklar = [o];
  _durum.oyuncular = [o];
  return o;
}

console.log("=== 1. ERISIM SORUNU GERCEKTEN VAR MI (olcum) ===");
{
  const sira = kayit.esyasizSira();
  kontrol("jest dongusu 150'den uzun", sira.length > 150, sira.length + " yetenek");
  /* Son onda yeni ailelerden biri olmali -- yoksa bu komutun
     varlik sebebi kalkar ve test bunu haber vermeli.        */
  const son = sira.slice(-16).map((y) => y.kimlik).join(" ");
  kontrol("son 16'da meyve/jjk/simbiyot var",
          /gura|yami|ope|jjk|simbiyot/.test(son), son.slice(0, 70) + "...");
}

console.log("\n=== 2. ADIYLA CALISTIRMA ===");
{
  const o = kur("ara1");
  const s = sohbet.komutCozumle(o, "yetenek");
  kontrol("'yetenek' tek basina taniniyor", !!s && typeof s.cevap === "string",
          s ? String(s.cevap).slice(0, 46) : "tanimadi");
  kontrol("kac yetenek oldugunu soyluyor",
          !!s && s.cevap.indexOf(String(kayit.esyasizSira().length)) >= 0);
  /* Bos arama LISTE dondurmemeli: "yetenek" yazan biri 8
     rastgele kimlik degil, nasil kullanilacagini gormeli.  */
  kontrol("bos arama kullanim ipucu veriyor, liste DEGIL",
          !!s && /yetenek <ad>/.test(s.cevap) && !/eslesme/.test(s.cevap),
          String(s.cevap).slice(0, 60));
}
{
  const o = kur("ara2");
  o._komutlar = [];
  const s = sohbet.komutCozumle(o, "yetenek gura_tenchi");
  /* Calistiysa cevap undefined -- "sessiz kal" kurali.      */
  kontrol("tam kimlik calisiyor (cevap sessiz)",
          !!s && s.cevap === undefined,
          s ? String(s.cevap).slice(0, 50) : "komut taninmadi");
}
{
  const o = kur("ara3");
  const s = sohbet.komutCozumle(o, "yetenek gura");
  kontrol("belirsiz arama LISTELIYOR, calistirmiyor",
          !!s && typeof s.cevap === "string" && /eşleşme|eslesme/i.test(s.cevap),
          s ? String(s.cevap).slice(0, 60) : "-");
  /* Sabitin KENDISI de sinaniyor: beklentiyi sinanan seyden
     turetirsen ayari 999 yapan mutasyon kacar (dusmus.mjs'te
     ogrenilen ders).                                       */
  kontrol("YETENEK_ARA_LISTE makul (<= 12)",
          ayar.YETENEK_ARA_LISTE > 0 && ayar.YETENEK_ARA_LISTE <= 12,
          String(ayar.YETENEK_ARA_LISTE));
  {
    const o2 = kur("ara3z");
    const g = sohbet.komutCozumle(o2, "yetenek a");   // cok genis arama
    const adet = (String(g.cevap).match(/·/g) || []).length;
    kontrol("genis aramada liste 12'yi gecmiyor", adet <= 12, adet + " ayrac");
  }
}
{
  /* TAM KIMLIK KISA YOLU NEDEN VAR (olculdu):
     216 kimlikten tam BIRI baskasinin onegi --
     ben_sald_gulle_motion_damage, ..._dash'in onegi. Kisa yol
     olmasa bu kimligi TAM yazan biri "2 eslesme" cevabi alir
     ve yetenek CALISMAZDI. Tek ornek ama gercek.           */
  const o = kur("ara3b");
  const s = sohbet.komutCozumle(o, "yetenek ben_sald_gulle_motion_damage");
  kontrol("onek olan tam kimlik yine de CALISIYOR",
          !!s && s.cevap === undefined,
          s ? String(s.cevap).slice(0, 60) : "-");
}
{
  const o = kur("ara3c");
  const s = sohbet.komutCozumle(o, "yetenek ben_sald_gulle_motion");
  kontrol("onun kismi hali ise LISTELIYOR",
          !!s && /eslesme/.test(String(s.cevap)),
          s ? String(s.cevap).slice(0, 50) : "-");
}
{
  const o = kur("ara4");
  const s = sohbet.komutCozumle(o, "yetenek boyleseyyok");
  kontrol("bulunamayinca duzgun soyluyor",
          !!s && /Bulamad/i.test(String(s.cevap)), String(s.cevap).slice(0, 40));
}

console.log("\n=== 3. KAPI AYNI KAPI (en onemli madde) ===");
{
  /* v7.62 KORUMALI YETENEK: kalp_ekle etiketsiz oyuncuda
     jestten gecmiyordu. Sohbetten de gecmemeli.

     DIKKAT -- KAPININ ACILMA KURALI: "kimse etiketli degilse
     kapi ACIKTIR" (sohbet.js yetkiliMi). Yani etiketsiz tek
     bir oyuncuyla sinamak HICBIR SEY sinamaz; ilk yazilista
     tam bu yapildi ve test yesil yanacakti. Kapinin kapali
     oldugu durumu kurmak icin ETIKETLI bir oyuncu gerekiyor. */
  const defter = await import("./pack/yetenekler/_kalp_defteri.js");
  kontrol("kalp_ekle korumali listede",
          ayar.YETENEK_KORUMALI.indexOf("kalp_ekle") >= 0,
          ayar.YETENEK_KORUMALI.join(", "));

  const D = dunyaKur();
  const yap = (id, etiketli) => {
    const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, { x: 0.5, y: 64, z: 0.5 });
    o.id = id; o.typeId = "minecraft:player";
    o._mesaj = [];
    o.hasTag = () => etiketli;
    o.runCommand = () => ({ successCount: 1 });
    o.sendMessage = (m) => o._mesaj.push(m);
    return o;
  };
  const patron  = yap("patron", true);      // etiketli -> kapi KAPANIR
  const yabanci = yap("yabanci", false);
  D.boyut._varliklar = [patron, yabanci];
  _durum.oyuncular = [patron, yabanci];

  const once = defter.kalpAl(yabanci.id);
  sohbet.komutCozumle(yabanci, "yetenek kalp_ekle");
  tickIlerlet(10);
  const sonra = defter.kalpAl(yabanci.id);
  kontrol("kapi KAPALIYKEN etiketsiz oyuncu sohbetten kalp ALAMIYOR",
          sonra === once, once + " -> " + sonra);

  /* Ve kapi acilinca gecebilmeli -- yoksa yukaridaki madde
     "hicbir sey calismiyor" diye de yesil yanardi.          */
  const onceP = defter.kalpAl(patron.id);
  sohbet.komutCozumle(patron, "yetenek kalp_ekle");
  tickIlerlet(10);
  kontrol("etiketli oyuncu GECEBILIYOR (madde tersten de tutuyor)",
          defter.kalpAl(patron.id) > onceP,
          onceP + " -> " + defter.kalpAl(patron.id));
}
{
  /* Iki kanca TEK govdeyi paylasiyor mu: korumali yetenek
     hem tam kimlikle hem adiyla aramayla AYNI sonucu vermeli.
     Kopya govde olsaydi biri sikilastirilirken oteki geride
     kalirdi -- v7.62'de yasanan tam buydu.                  */
  const defter = await import("./pack/yetenekler/_kalp_defteri.js");
  const D = dunyaKur();
  const yap = (id, etiketli) => {
    const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, { x: 0.5, y: 64, z: 0.5 });
    o.id = id; o.typeId = "minecraft:player"; o._mesaj = [];
    o.hasTag = () => etiketli;
    o.runCommand = () => ({ successCount: 1 });
    o.sendMessage = (m) => o._mesaj.push(m);
    return o;
  };
  const p = yap("p2", true), a = yap("a2", false), b = yap("b2", false);
  D.boyut._varliklar = [p, a, b];
  _durum.oyuncular = [p, a, b];

  const aOnce = defter.kalpAl(a.id);
  sohbet.komutCozumle(a, "yetenek kalp_ekle");        // tam kimlik
  tickIlerlet(10);
  const bOnce = defter.kalpAl(b.id);
  sohbet.komutCozumle(b, "yetenek kalp ekle");        // adiyla arama
  tickIlerlet(10);
  kontrol("tam kimlik yolu kapali", defter.kalpAl(a.id) === aOnce);
  kontrol("adiyla arama yolu da AYNI sekilde kapali",
          defter.kalpAl(b.id) === bOnce,
          bOnce + " -> " + defter.kalpAl(b.id));
}

console.log("\n=== 4. YARDIM METNINDE YAZIYOR ===");
{
  const o = kur("ara7");
  const y = sohbet.komutCozumle(o, "yardim");
  kontrol("yardimda ornekli satir var",
          !!y && /yetenek gura/.test(String(y.cevap)));
  kontrol("yardimda arama satiri var",
          !!y && /adiyla arama/.test(String(y.cevap)));
}

/* ---- BU TESTIN KAPSAMADIGI SEY  (durustluk notu) ----

   Dokuz mutasyon denendi, sekizi yakalandi. KACAN: "yetenek"
   kancasinin govdesini yetenegiCalistir'dan ayirip yerine
   yetenekTetikle'yi dogrudan cagiran bir kopya koymak.

   Kacmasinin sebebi su: o kopya butun GUVENLIK davranisini
   koruyor (kapi, AYNI_ANDA, anlikHazirMi hepsi
   yetenekTetikle'nin icinde) ve yalnizca REDDETME MESAJINI
   kaybediyor. Mesaji gormek icin AYNI_ANDA tavanini gercekten
   doldurmak gerekiyor; sahte dunyada yetenekler kol/ruh/oda
   sarti yuzunden erken cikiyor ve is olusturmuyor. Tavani
   doldurabilen bir kurulum yazilabilir ama bu testin konusu
   degil -- burada olculen sey KAPI, mesaj bicimi degil.

   Yazili duruyor ki bir sonraki okuyan "9/9 yakalandi"
   sanmasin.                                                */
console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> yetenek aramasi yerinde");
process.exit(hata ? 1 : 0);
