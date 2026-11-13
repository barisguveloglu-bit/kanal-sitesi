/* ================================================================
   CIKMIS OYUNCUNUN HATASI SOHBETE DUSMUYOR               v7.99.25

   Gercek motorda (BDS 1.26.52.3, tarama_dene.py) olculdu:
     HATA @ kubbe.sendMessage: Failed to call function 'sendMessage'
     due to Entity being invalid (has the Entity been removed?).
   Oyuncu bir yetenegin ortasinda cikinca yetenegin gecikmeli
   mesaji (kasirga, kafes, ucurma, kubbe, toprak duvar, kalp ekle)
   bu istisnayi atiyor. hataYaz HATA_SOHBETE acikken her hatayi
   world.sendMessage ile ODADAKI HERKESE kirmizi basiyordu:
   yapilacak bir sey yok, oyuncu zaten gitti. Menunun acikken cikan
   oyuncusu da ("Player quit before responding") ayni yoldan.

   Bu dosya: o iki istisna KAYDA yaziliyor ama sohbete dusmuyor;
   gercek bir hata sohbete dusmeye devam ediyor.
   ================================================================ */
import { _durum, tickIlerlet } from "@minecraft/server";

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!hata && !gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

const Y = await import("./pack/yardimcilar.js");
const kayit = [];
const asil = console.warn;
console.warn = (...a) => { kayit.push(a.join(" ")); };
const dene = (nerede, mesaj) => {
  _durum.sohbet.length = 0;
  kayit.length = 0;
  tickIlerlet(200);                       // ayni yerden tekrar susturmasi olmasin
  Y.hataYaz(nerede, new Error(mesaj));
  return { sohbet: _durum.sohbet.slice(), kayit: kayit.slice() };
};

console.log("=== CIKMIS OYUNCU ===");
const GECERSIZ = "Failed to call function 'sendMessage' due to Entity being invalid (has the Entity been removed?).";
const a = dene("kubbe.sendMessage", GECERSIZ);
const b = dene("menu.goster", "Player quit before responding");
const c = dene("deneme.gercek", "Cannot read properties of undefined (reading 'x')");
console.warn = asil;

kontrol("cikmis oyuncuya mesaj hatasi sohbete DUSMUYOR", !a.sohbet.some((s) => s.includes("HATA")), a.sohbet.join(" | "));
kontrol("  ama kayda yaziliyor", a.kayit.some((s) => s.includes("HATA @ kubbe.sendMessage")));
kontrol("menu acikken cikan oyuncu sohbete DUSMUYOR", !b.sohbet.some((s) => s.includes("HATA")), b.sohbet.join(" | "));
kontrol("gercek bir hata sohbete dusmeye DEVAM ediyor", c.sohbet.some((s) => s.includes("HATA") && s.includes("deneme.gercek")),
        c.sohbet.join(" | "));

console.log(hata ? ">>> SORUN VAR" : ">>> cikmis oyuncunun hatasi sohbeti kirletmiyor");
process.exit(hata ? 1 : 0);
