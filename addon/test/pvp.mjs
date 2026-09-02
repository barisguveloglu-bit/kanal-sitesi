/* OYUNCUYA VURMA (PvP) BAYRAKLARI                        v7.9.3

   ---- NEDEN BU DOSYA VAR ----
   Genel taramada 105 boolean ayar tek tek ters cevrildi. Dokuzu
   hicbir testi dusurmedi ve BESI ayni aileden cikti:

       MIZRAK_OYUNCU · SAVUR_OYUNCU · CEKME_OYUNCU
       UCURMA_OYUNCU · COKLU_OYUNCU

   Hepsi tek bir soruyu cevapliyor: "bu yetenek DIGER OYUNCULARA
   da isliyor mu?" Besi de kapatilabiliyordu ve 83 test dosyasi
   yesil yanmaya devam ediyordu. Yani cok oyunculu davranis --
   arkadasinla oynarken yeteneklerin ona islemesi -- HIC
   SINANMAMISTI.

   Bu sessiz bir bozulma bicimi: tek basina oynarken her sey
   normal gorunur, sorun ancak yaninda biri varken ortaya cikar
   ve o zaman da "bende calismiyor" diye bildirilir.

   ---- IKI YON DE KILITLENIYOR ----
   Dordu oyuncuya ISLEMELI (varsayilan acik), Coklu Simsek ise
   ISLEMEMELI (varsayilan kapali -- yildirim yagmuru arkadasini
   oldururdu). Test ikisini de sabitliyor: sadece "isliyor mu"
   diye baksaydik, Coklu Simsek'in acilmasi fark edilmezdi.   */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, _durum } from "@minecraft/server";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac  = () => { console.warn = w; };
sus(); await import("./pack/main.js"); ac();
const ayar  = await import("./pack/ayarlar.js");
const kayit = await import("./pack/yetenekler/kayit.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

/* Kurban BASKA BIR OYUNCU. typeId'si onemli: bayraklarin
   hepsi "minecraft:player" kontrolu yapiyor.               */
function kurbanOyuncu(x, y, z) {
  return {
    id: "kurban_oyuncu", typeId: "minecraft:player", isValid: true,
    location: { x, y, z },
    _efektler: [], _itildi: null, _hasar: 0,
    addEffect(ad, sure, o) { this._efektler.push({ ad, sure, o }); return true; },
    removeEffect() { return true; },
    applyImpulse(i) { this._itildi = i; },
    applyKnockback() { this._itildi = { k: true }; },
    applyDamage(n) { this._hasar += n; return true; },
    getComponent(a) {
      if (a !== "minecraft:health") return undefined;
      return { currentValue: 20, effectiveMax: 20, setCurrentValue: () => true };
    },
    teleport() { return true; },
    getVelocity: () => ({ x: 0, y: 0, z: 0 })
  };
}

/* Yetenegi GERCEKTEN calistirir ve kurbana ne oldugunu doner.
   Isi tick tick surmek sart: bu yeteneklerin cogu ilk tick'te
   degil, tarama araliginda is goruyor.                      */
function calistir(kimlik, kurbanlar, tick = 200) {
  const D = dunyaKur();
  /* Oyuncu +x'e bakiyor; kurbanlar da o dogrultuda.
     anna.mjs dersi: koni disina konan hedef "yetenek
     calismiyor" gibi gorunur, oysa kurulum yanlistir.      */
  const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "saldiran"; o.typeId = "minecraft:player";
  o.sendMessage = () => {}; o.runCommand = () => true;
  o.getVelocity = () => ({ x: 0, y: 0, z: 0 });
  D.boyut._varliklar = kurbanlar;
  _durum.oyuncular = [o];
  const tanim = kayit.yetenekAl(kimlik);
  if (!tanim) return { yok: true };
  sus();
  const is = tanim.olustur(o);
  const isler = Array.isArray(is) ? is : (is ? [is] : []);
  for (let i = 0; i < tick; i++) {
    let hepsiBitti = true;
    for (const x of isler) { try { if (!x.calis()) hepsiBitti = false; } catch (e) { /* */ } }
    tickIlerlet(1);
    if (hepsiBitti && isler.length) break;
  }
  for (const x of isler) { try { if (x.bitir) x.bitir(); } catch (e) { /* */ } }
  ac();
  return { D, o, is: isler.length };
}

const dokunuldu = (k) =>
  k._efektler.length > 0 || k._itildi !== null || k._hasar > 0;

console.log("=== 1. OYUNCUYA ISLEMESI GEREKENLER ===");
/* KURBANIN YUKSEKLIGI YETENEGE GORE DEGISIYOR.

   Buz Mizragi bir MERMI: oyuncunun KAFASINDAN (y ~90,6)
   cikiyor ve carpma yaricapi 1,6 blok. Kurbani ayak hizasina
   (88,98) koydugumda mizrak tam 1,62 blok yukaridan geciyor --
   kil payi isikaliyor ve "Buz Mizragi oyuncuya islemiyor"
   goruntusu cikiyor. Kod dogru, KURULUM yanlisti.
   (anna.mjs'te bu hata bir kez yapildi; ucuncu kez olmasin.) */
for (const [kimlik, ad, bayrak, yukseklik] of [
  ["buz_mizragi", "Buz Mizragi", "MIZRAK_OYUNCU", 90.6],
  ["savur",       "Savur",       "SAVUR_OYUNCU",  88.98],
  ["cekme",       "Cekme",       "CEKME_OYUNCU",  88.98],
  ["ucurma",      "Ucurma",      "UCURMA_OYUNCU", 88.98],
  /* BUZ_OYUNCU taramanin ikinci turunda cikti: ilk turda
     mutasyon uygulanamamisti ("0 kez gecti") ve olculmeden
     kalmisti. Olculmemis bir ayari "gecti" saymak, taramanin
     kendi korlugunu gizlemek olurdu -- dordu de yeniden
     kosuldu ve bu sagkaldi.                                  */
  ["buz_adam",    "Buz Adam",    "BUZ_OYUNCU",    88.98]
]) {
  kontrol(bayrak + " ACIK (varsayilan)", ayar[bayrak] === true, String(ayar[bayrak]));
  const k = kurbanOyuncu(4.5, yukseklik, 0.5);
  const s = calistir(kimlik, [k]);
  kontrol("  " + ad + " baska bir OYUNCUYA isliyor", !s.yok && dokunuldu(k),
          s.yok ? "yetenek kayitli degil" :
          ("efekt=" + k._efektler.length + " itme=" + (k._itildi ? "var" : "yok") +
           " hasar=" + k._hasar));
}

console.log("");
console.log("=== 2. OYUNCUYA ISLEMEMESI GEREKEN ===");
{
  /* Coklu Simsek KAPALI olmali: yirmi yildirimlik bir yagmur
     yanindaki arkadasini oldururdu. Bu satir "acilmasin" diye
     var -- sadece "isliyor mu" diye baksaydik acilmasi fark
     edilmezdi.                                               */
  kontrol("COKLU_OYUNCU KAPALI (varsayilan)", ayar.COKLU_OYUNCU === false,
          String(ayar.COKLU_OYUNCU));
  /* Coklu Simsek kurbana DOGRUDAN dokunmuyor: hedefin
     KONUMUNA yildirim dusuruyor. Bu yuzden "efekt/itme/hasar
     var mi" diye bakmak yetmiyordu -- bayragi acsam bile o
     olcum sessiz kaliyordu, yani iddia bayragin kendisini
     tekrar etmekten ibaretti. Dogru olcum: oyuncunun DIBINE
     yildirim dustu mu?                                       */
  const k = kurbanOyuncu(12.5, 88.98, 0.5);   // COKLU_EN_YAKIN'in otesi
  const s = calistir("coklu_simsek", [k]);
  const yakinYildirim = (s.D ? s.D.sayac.dogan : []).filter(
    (d) => d.tip === "minecraft:lightning_bolt" &&
           Math.hypot(d.x - k.location.x, d.z - k.location.z) < 1.0).length;
  kontrol("  Coklu Simsek oyuncunun DIBINE yildirim dusurmuyor",
          !s.yok && yakinYildirim === 0 && !dokunuldu(k),
          "oyuncunun dibine dusen yildirim=" + yakinYildirim);
  /* Ama MOBA isliyor olmali -- yoksa yukaridaki "dokunmuyor"
     sonucu yetenegin hic calismamasindan da gelebilirdi.    */
  const mob = kurbanOyuncu(12.5, 88.98, 0.5);
  mob.typeId = "minecraft:zombie"; mob.id = "kurban_mob";
  const s2 = calistir("coklu_simsek", [mob]);
  const mobYildirim = (s2.D ? s2.D.sayac.dogan : []).filter(
    (d) => d.tip === "minecraft:lightning_bolt" &&
           Math.hypot(d.x - mob.location.x, d.z - mob.location.z) < 1.0).length;
  kontrol("  ama MOBUN dibine dusuyor (yetenek gercekten calisti)",
          mobYildirim > 0, "mobun dibine dusen yildirim=" + mobYildirim);
}

console.log("");
console.log("=== 3. KONSEY: SISTEM GERCEKTEN CALISIYOR MU ===");
{
  /* Genel taramada KONSEY_ACIK'i false yaptim ve HICBIR test
     dusmedi. Sebebi konsey.mjs'in yalnizca DOSYALARA bakmasi:
     tablo, ikon, doku, ad alani... Ama konseyTara() -- yani
     "Konsey parcasi takinca gorunmez olma" davranisi -- hic
     calistirilmiyordu. Yani butun alt sistem tek satirla
     kapatilabiliyor ve takim yesil yanmaya devam ediyordu.  */
  const konsey = await import("./pack/yetenekler/konsey.js");
  kontrol("KONSEY_ACIK (varsayilan)", ayar.KONSEY_ACIK === true,
          String(ayar.KONSEY_ACIK));

  const [parca, yuva] = [...ayar.KONSEY_GORUNMEZ.entries()][0];
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "konseyci"; o.typeId = "minecraft:player";
  o._efektler = [];
  o.addEffect = (ad, sure, se) => { o._efektler.push({ ad, sure, se }); return true; };
  o.getComponent = (a) => a === "minecraft:equippable"
    ? { getEquipment: (s) => (s === yuva ? { typeId: "pa:" + parca } : undefined) }
    : undefined;
  konsey.konseyUnut();
  sus(); konsey.konseyTara([o]); ac();
  const gorunmez = o._efektler.filter((e) => e.ad === "invisibility");
  kontrol("Konsey parcasi takili -> GORUNMEZ oluyor", gorunmez.length === 1,
          parca + " (" + yuva + ") -> " + o._efektler.map((e) => e.ad).join(", "));
  /* Parcacik KAPALI olmali: acikken oyuncu parcacik bulutuna
     donuyor ve kostumun kendisi gorunmez oluyor (zirh ve
     Ben 10 tablolarinda ogrenilen ders).                    */
  kontrol("  parcacik KAPALI (kostum kaybolmasin)",
          gorunmez.length === 1 && gorunmez[0].se &&
          gorunmez[0].se.showParticles === false);

  /* Parca TAKILI DEGILKEN gorunmez OLMAMALI -- yoksa
     yukaridaki sonuc "her zaman gorunmez yapiyor"dan da
     gelebilirdi.                                            */
  const o2 = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o2.id = "sivil"; o2.typeId = "minecraft:player"; o2._efektler = [];
  o2.addEffect = (ad, sure, se) => { o2._efektler.push({ ad, sure, se }); return true; };
  o2.getComponent = (a) => a === "minecraft:equippable"
    ? { getEquipment: () => undefined } : undefined;
  konsey.konseyUnut();
  sus(); konsey.konseyTara([o2]); ac();
  kontrol("  parca YOKKEN gorunmez OLMUYOR",
          o2._efektler.filter((e) => e.ad === "invisibility").length === 0,
          o2._efektler.length + " efekt");
}

console.log("");
console.log(hata ? "BAZI SINAMALAR KALDI" : "hepsi gecti");
process.exit(hata ? 1 : 0);
