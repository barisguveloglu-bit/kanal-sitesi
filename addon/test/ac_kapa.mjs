/* AC-KAPA YETENEKLERI                                     v7.98.2

   Dokuz yetenek acikken yeniden tetiklenince KAPANIYOR (ya da
   ikinci isini yapiyor: F-Tech Kavrama firlatiyor, Fuzyon
   ayiriyor). Kapatma her birinin kendi olustur()'unda yazili.

   ---- BULUNAN HATA ----
   O dala oyunda HIC varilmiyordu. Islerinin adi kimlikleriyle
   ayni; main.js'teki ayniIsVarMi ikinci tetiklemeyi olustur()'dan
   ONCE kesiyordu (tavan da oyle). Yorumlar tersini soyluyordu
   ("ayniIsVarMi yeni is acilmasini engelledigi icin kapatma
   buradan yapiliyor") ve testler olustur()'u DOGRUDAN cagirdigi
   icin kapi hic sinanmadi. Mod taramasi buldu.

   ---- BU DOSYANIN TUTTUGU SEY ----
   1. Ac-kapa yeteneklerinin hepsi kayitta `acKapa: true`.
      Liste KAYNAKTAN cikariliyor: olustur()'unda "kapat = true"
      yazan her yetenek.
   2. Uctan uca: sohbetten ac, sohbetten kapat -- tetikleme
      yolunun TAMAMI (tavan, ayniIsVarMi, enerji) icinden.
   3. Tavan doluyken de kapaniyor: kapatma yeni is acmiyor.
   4. Ac-kapa OLMAYAN bir is yetenegi hala ustuste binmiyor --
      eski koruma gevsemedi.                                   */
import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, sohbetTetikle, _durum } from "@minecraft/server";
import { readFileSync, readdirSync } from "node:fs";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };
sus();
await import("./pack/main.js");
ac();

const ayar  = await import("./pack/ayarlar.js");
const kayit = await import("./pack/yetenekler/kayit.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

function kur(id) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, { x: 0.5, y: 64, z: 0.5 });
  o.id = id; o.typeId = "minecraft:player"; o.name = id;
  o._mesaj = []; o._yazi = [];
  o.sendMessage = (m) => o._mesaj.push(String(m));
  o.onScreenDisplay = { setActionBar(t) { o._yazi.push(String(t)); }, setTitle() {} };
  o.hasTag = () => true;
  o.getTags = () => [];
  _durum.oyuncular = [o];
  D.boyut._varliklar = [o];
  return { D, o };
}
const tetikle = (o, kimlik) => {
  sus(); sohbetTetikle(o, "yetenek " + kimlik); tickIlerlet(ayar.KOL_GECIKME + 2); ac();
};

console.log("=== 1. KAYNAKTA KAPATMA DALI OLAN HER YETENEK acKapa ===");
{
  /* Dosya dosya yetenekKaydet bloklari; olustur()'unda (ya da
     cagirdigi Baslat/Ac fonksiyonunda) `kapat = true` gecenler.
     Eslesme elle tutulmuyor: yeni bir ac-kapa yetenegi eklenip
     isaretlenmezse bu madde dusuyor.                          */
  const kok = new URL("./pack/yetenekler/", import.meta.url).pathname;
  const beklenen = new Set();
  for (const f of readdirSync(kok).filter((x) => x.endsWith(".js"))) {
    const s = readFileSync(kok + f, "utf8");
    if (!/\.kapat = true/.test(s)) continue;
    /* Kapatma dali olan yetenekler: yetenekKaydet bloklarinin
       olustur govdesinde ya da o dosyanin "...Baslat/...Ac"
       fonksiyonunda. Ikincisi icin blok, fonksiyonu cagiriyor. */
    const bloklar = s.split("yetenekKaydet({").slice(1);
    const disFonk = [...s.matchAll(/export function (\w+)\([^)]*\) \{[\s\S]*?\n\}/g)]
      .filter((m) => /\.kapat = true/.test(m[0])).map((m) => m[1]);
    for (const b of bloklar) {
      const govde = b.slice(0, b.indexOf("\n});"));
      const k = (govde.match(/kimlik: "([^"]+)"/) || [])[1];
      if (!k) continue;
      if (/varOlan\.kapat = true|tutulan\)|ZATEN FUZYONDA/.test(govde) ||
          disFonk.some((fn) => govde.indexOf(fn + "(") >= 0)) {
        beklenen.add(k);
      }
    }
  }
  kontrol("kaynakta ac-kapa yetenegi bulundu (olcum anlamli)", beklenen.size >= 7,
          [...beklenen].join(", "));
  for (const k of beklenen) {
    const t = kayit.yetenekAl(k);
    kontrol("  " + k + " acKapa", !!(t && t.acKapa === true));
  }
}

console.log("\n=== 2. UCTAN UCA: AC, SONRA KAPAT ===");
{
  const { o } = kur("ak1");
  tetikle(o, "toprak_izi");
  kontrol("acildi", o._yazi.some((y) => y.indexOf("Toprak izi") >= 0 && y.indexOf("AÇIK") >= 0),
          o._yazi.slice(-1)[0] || "yazi yok");
  const once = o._mesaj.length;
  tetikle(o, "toprak_izi");
  tickIlerlet(2);
  kontrol("ikinci tetikleme KAPATTI", o._mesaj.slice(once).some((m) => m.indexOf("Toprak izi kapandı") >= 0),
          o._mesaj.slice(once).join(" | ") || "mesaj yok");
  /* Kapaninca yeniden acilabiliyor: kapatma bir kilit birakmadi. */
  o._yazi.length = 0;
  tetikle(o, "toprak_izi");
  kontrol("  kapandiktan sonra yeniden aciliyor",
          o._yazi.some((y) => y.indexOf("AÇIK") >= 0), o._yazi.slice(-1)[0] || "yazi yok");
  tetikle(o, "toprak_izi"); tickIlerlet(2);
}

console.log("\n=== 3. TAVAN DOLUYKEN DE KAPANIYOR ===");
{
  const { o } = kur("ak2");
  tetikle(o, "toprak_izi");
  tetikle(o, "savunma");
  kontrol("iki is acik (tavan " + ayar.AYNI_ANDA + ")",
          o._mesaj.some((m) => m.indexOf("Savunma kipi") >= 0 && m.indexOf("AÇIK") >= 0),
          o._mesaj.slice(-1)[0] || "");
  const once = o._mesaj.length;
  tetikle(o, "toprak_izi");
  tickIlerlet(2);
  kontrol("tavan doluyken Toprak Izi kapandi",
          o._mesaj.slice(once).some((m) => m.indexOf("Toprak izi kapandı") >= 0),
          o._mesaj.slice(once).join(" | ") || "mesaj yok");
  const once2 = o._mesaj.length;
  tetikle(o, "savunma");
  kontrol("Savunma jest/sohbet yolundan da kapandi",
          o._mesaj.slice(once2).some((m) => m.indexOf("kapatıldı") >= 0),
          o._mesaj.slice(once2).join(" | ") || "mesaj yok");
}

console.log("\n=== 4. AC-KAPA OLMAYAN IS HALA USTUSTE BINMIYOR ===");
{
  /* Eski koruma gevsemesin: kapatmaMi yalniz acKapa'ya bakiyor.
     Deneme: ac-kapa olmayan, is acan bir yetenegin kaydina
     sahte bir tetikleme sayaci takiliyor.                    */
  const { o } = kur("ak3");
  const hedef = kayit.tumYetenekler().find((t) => !t.acKapa && t.kimlik === "toprak_izi");
  kontrol("toprak_izi acKapa (on kosul degil, madde 1)", hedef === undefined);
  const t = kayit.yetenekAl("savunma");
  const gercek = t.olustur;
  let cagri = 0;
  t.acKapa = false;
  t.olustur = (x) => { cagri++; return gercek(x); };
  tetikle(o, "savunma");
  tetikle(o, "savunma");
  t.olustur = gercek; t.acKapa = true;
  kontrol("acKapa kalkinca ikinci tetikleme olustur'a VARMIYOR", cagri === 1, cagri + " cagri");
  tetikle(o, "savunma");
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> ac-kapa yetenekleri kapaniyor");
process.exit(hata ? 1 : 0);
