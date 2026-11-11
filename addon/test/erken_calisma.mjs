/* ================================================================
   ERKEN CALISTIRMA                                        v7.99.17

   @minecraft/server 2.x'te betigin UST DUZEYI dunya yuklenmeden
   kosuyor ("early execution"). O anda dunyaya dokunan cagrilar
   istisna atiyor. Bu takimin sahte motoru bunu hic modellemiyordu
   ve her sey yesildi; gercek motor (BDS 1.26.52.3) sunlari
   gosterdi:

     * nefes / sonsuzluk / error404 kaydi acilista OKUNAMIYORDU.
       Durum bos kaliyor ve ilk yazista eski kaydin ustune
       yaziliyordu: secilen uslup, toplanan taslar ve faz her
       dunya acilisinda sifirlaniyordu.
     * kol ve bot denetimi kayit defteri dolmadan kosuyor, her
       acilista "KAYITLI DEGIL" diye yanlis alarm veriyordu.
     * acilis mesaji "@minecraft/server 2.0.0" diyordu; manifest
       2.5.0.

   Bu dosya paketi GERCEKTEKI SIRAYLA aciyor: once erken
   calistirma (yasak cagrilar atar ve KAYDEDILIR), sonra dunya
   yuklenir. Olculen sey davranis, metin eslesmesi degil.
   ================================================================ */
import { readFileSync } from "node:fs";
import { _durum, dunyaYukle, esyaKaydet, varlikKaydet } from "@minecraft/server";

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

/* ayarlar.js dunyaya dokunmuyor; anahtarlari ondan OKU, elle yazma. */
const ayar = await import("./pack/ayarlar.js");

/* Onceki oturumdan kalan kayitlar: dunya dosyasinda duruyorlar. */
const USLUP = [...ayar.NEFES_USLUPLAR.keys()][0];
const TASLAR = [...ayar.SONSUZLUK_TASLARI.keys()].slice(0, 2);
_durum.ozellikler.set(ayar.NEFES_KAYIT_ANAHTAR, JSON.stringify({ o1: USLUP }));
_durum.ozellikler.set(ayar.SNS_KAYIT_ANAHTAR,
  JSON.stringify({ o1: { e: true, t: TASLAR } }));
_durum.ozellikler.set(ayar.E404_FAZ_KAYIT_ANAHTAR,
  JSON.stringify({ f: { o1: 2 }, a: { d: true, b: false, z: true, s: 1, t: false } }));

/* Butun console.warn satirlari toplaniyor: hataYaz ve bilgiYaz
   ikisi de oraya yaziyor.                                      */
const satirlar = [];
const asil = console.warn;
console.warn = (...a) => { satirlar.push(a.join(" ")); };

console.log("=== 1. ERKEN CALISTIRMA: UST DUZEY DUNYAYA DOKUNMUYOR ===");
_durum.erkenModel = true;
_durum.erken = true;
let acilisHatasi = null;
try { await import("./pack/main.js"); }
catch (e) { acilisHatasi = e; }
const erkenSatir = satirlar.slice();

kontrol("paket erken calistirmada acildi", acilisHatasi === null,
        acilisHatasi ? String(acilisHatasi && acilisHatasi.message) : "");
/* EN GENIS IDDIA: 130 betigin HICBIRI ust duzeyde yasak bir
   cagri yapmiyor. Cagri try/catch ile yutulsa da burada
   gorunur -- sessiz yutulan bir erken cagri "kayit hic
   okunmadi" demek.                                           */
kontrol("ust duzeyde yasak cagri yok", _durum.erkenCagrilar.length === 0,
        [...new Set(_durum.erkenCagrilar)].join(", ") || "temiz");
kontrol("acilista HATA satiri yok",
        !erkenSatir.some((s) => s.includes("HATA @")),
        erkenSatir.filter((s) => s.includes("HATA @")).map((s) => s.slice(0, 90)).join(" | "));
kontrol("acilista 'KAYITLI DEGIL' alarmi yok",
        !erkenSatir.some((s) => s.includes("KAYITLI DEGIL")));
kontrol("dunya yuklenmeden once abone olundu",
        _durum.dunyaYukleCb.length >= 5, _durum.dunyaYukleCb.length + " abone");

const nefes = await import("./pack/yetenekler/nefes.js");
const sns   = await import("./pack/yetenekler/infintrix.js");
const e404  = await import("./pack/yetenekler/error404.js");
const kollar = await import("./pack/yetenekler/kollar.js");

kontrol("yuklenmeden once durum bos (nefes)", nefes.nefesSecili("o1") === undefined);

console.log("");
console.log("=== 2. DUNYA YUKLENINCE: KAYITLAR GERI GELIYOR ===");
/* Gercek motorda bu noktada esya ve varlik kayit defteri dolu. */
esyaKaydet(...kollar.KOL_ESYALARI.map((s) => s[0]));
varlikKaydet(ayar.BOT_KIMLIK);
satirlar.length = 0;
dunyaYukle();
const yukSatir = satirlar.slice();

kontrol("nefes uslubu kayittan geldi", nefes.nefesSecili("o1") === USLUP,
        String(nefes.nefesSecili("o1")));
const sd = sns.sonsuzlukDurum("o1");
kontrol("sonsuzluk eldiveni kayittan geldi", !!(sd && sd.eldiven === true));
kontrol("sonsuzluk taslari kayittan geldi",
        !!sd && TASLAR.every((t) => sd.taslar.includes(t)) && sd.taslar.length === TASLAR.length,
        sd ? sd.taslar.join(",") : "durum yok");
kontrol("error404 fazi kayittan geldi", e404.e404Faz("o1") === 2,
        String(e404.e404Faz("o1")));
kontrol("error404 ayari kayittan geldi", e404.e404Ayar().blok === false);
kontrol("yuklemede HATA satiri yok", !yukSatir.some((s) => s.includes("HATA @")),
        yukSatir.filter((s) => s.includes("HATA @")).map((s) => s.slice(0, 90)).join(" | "));

console.log("");
console.log("=== 3. KAYIT USTUNE YAZILMIYOR ===");
/* Hatanin asil bedeli buydu: bos durumla yapilan ilk yazis
   eski kaydi siliyordu. Yuklemeden sonra kayit AYNEN duruyor. */
kontrol("nefes kaydi dunyada duruyor",
        JSON.parse(_durum.ozellikler.get(ayar.NEFES_KAYIT_ANAHTAR)).o1 === USLUP);
kontrol("sonsuzluk kaydi dunyada duruyor",
        JSON.parse(_durum.ozellikler.get(ayar.SNS_KAYIT_ANAHTAR)).o1.t.length === TASLAR.length);

console.log("");
console.log("=== 4. DENETIMLER DUNYA YUKLENINCE VE DOGRU ===");
kontrol("kol denetimi yuklemeden SONRA kosuyor",
        yukSatir.some((s) => s.includes("kol denetimi:") && s.includes("hepsi kayitli")),
        yukSatir.filter((s) => s.includes("kol")).map((s) => s.slice(0, 80)).join(" | "));
kontrol("bot denetimi yuklemeden SONRA kosuyor",
        yukSatir.some((s) => s.includes("bot denetimi:") && s.includes("kayitli")));
kontrol("yanlis alarm yok", !yukSatir.some((s) => s.includes("KAYITLI DEGIL")));

console.log("");
console.log("=== 5. GERCEKTEN EKSIKSE ALARM HALA CALIYOR ===");
/* Erteleme alarmi SUSTURMAMALI: esya gercekten kayitli degilse
   denetim bunu hala soylemeli.                               */
{
  const { esyaSil } = await import("@minecraft/server");
  esyaSil(kollar.KOL_ESYALARI[0][0]);
  satirlar.length = 0;
  kollar.kolDenetimi();
  kontrol("eksik kol esyasi bildiriliyor",
          satirlar.some((s) => s.includes("KAYITLI DEGIL") &&
                               s.includes(kollar.KOL_ESYALARI[0][0])));
  esyaKaydet(kollar.KOL_ESYALARI[0][0]);
}

console.log("");
console.log("=== 6. API SURUMU MANIFESTTEN ===");
{
  const m = JSON.parse(readFileSync(KOK + "/Simsek_TNT_ToprakTopu/manifest.json", "utf8"));
  const surum = m.dependencies.find((b) => b.module_name === "@minecraft/server").version;
  kontrol("ayarlar.js API_SURUM = manifest", ayar.API_SURUM === surum,
          ayar.API_SURUM + " · manifest " + surum);
  kontrol("acilis mesaji manifestteki surumu yaziyor",
          erkenSatir.some((s) => s.includes("@minecraft/server " + surum)),
          erkenSatir.filter((s) => s.includes("API:")).map((s) => s.slice(0, 70)).join(" | "));
}

console.log("");
console.log("=== 7. YARDIMCI: ESKI SURUMDE HEMEN, 2.x'TE ERTELENMIS ===");
{
  const Y = await import("./pack/yardimcilar.js");
  /* worldLoad olayi olmayan surum: erken calistirma da yok, is hemen kosar. */
  _durum.erkenModel = false;
  let n = 0;
  Y.dunyaHazirOlunca("deneme", () => { n++; });
  kontrol("worldLoad yoksa is HEMEN kosuyor", n === 1, String(n));

  _durum.erkenModel = true;
  n = 0;
  Y.dunyaHazirOlunca("deneme", () => { n++; });
  kontrol("worldLoad varsa is BEKLIYOR", n === 0, String(n));
  dunyaYukle();
  kontrol("dunya yuklenince bir kez kosuyor", n === 1, String(n));

  /* Isin kendi hatasi acilisi dusurmemeli, ama sessiz de kalmamali. */
  satirlar.length = 0;
  let firlatti = false;
  try {
    Y.dunyaHazirOlunca("patlayan", () => { throw new Error("deneme hatasi"); });
    dunyaYukle();
  } catch (e) { firlatti = true; }
  kontrol("isin hatasi disari tasmiyor", !firlatti);
  kontrol("isin hatasi kayda yaziliyor",
          satirlar.some((s) => s.includes("HATA @ patlayan") && s.includes("deneme hatasi")));
  _durum.erkenModel = false;
}

console.warn = asil;
console.log(hata ? ">>> SORUN VAR" : ">>> erken calistirma temiz");
process.exit(hata ? 1 : 0);
