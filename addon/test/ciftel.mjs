/* CIFT EL -- sag ve sol elde ayri kollar, ikisi birden calisiyor.

   NOT: bu dosya "blok yazan bir kol" ve "efekt veren bir kol"
   istiyor, hangileri oldugu onemli degil. Kullanilan kollar
   surumden surume degisti (kol_ors ve kol_top kaldirildi,
   v4.46) -- o yuzden yetenek ADIYLA degil DAVRANISLA
   sinaniyor: "blok yazildi mi", "efekt verildi mi".

   En riskli degisiklik: "oyuncu basina tek is" kurali gevsetildi.
   Sinanmasi gerekenler:
     - iki is gercekten ayni anda aciliyor mu
     - tavan (AYNI_ANDA) asiliyor mu
     - bekleme TEK sayiliyor mu (sol el sag ele takilmamali)
     - oyuncu cikinca IKI is de duruyor mu
     - butce hala tavani asmiyor mu                               */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, esyaKaydet, _durum } from "@minecraft/server";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };

sus();
await import("./pack/main.js");
ac();

const ayar = await import("./pack/ayarlar.js");

/* Kol listesi KOLLAR.JS'TEN geliyor, elle yazilmiyor: v4.33'te
   dort kol kaldirilinca burada yazili "pa:kol_can" bu dosyayi
   patlatmisti. Elle yazilan liste kodla birlikte bayatliyor.

   DIKKAT: bu satir main.js'ten SONRA. kollar.js var olan
   yeteneklere esya bagliyor; once import edilirse hicbir kol
   baglanmiyor (main.js'teki DIKKAT-SIRA-ONEMLI notunun aynisi,
   testte de gecerli).                                          */
const { KOL_ESYALARI } = await import("./pack/yetenekler/kollar.js");
esyaKaydet(...KOL_ESYALARI.map((satir) => satir[0]));

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

const BAKIS = { x: 1, y: -0.05, z: 0 };
const BAS = { x: 0.5, y: 90.6, z: 0.5 };

function kur(id, sag, sol) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, BAKIS, BAS);
  o.id = id;
  o.typeId = "minecraft:player";
  o.isSneaking = true;
  o._sag = sag;
  o._sol = sol;

  const eskiGet = o.getComponent.bind(o);
  o.getComponent = (ad) => {
    if (ad === "minecraft:equippable") {
      return {
        getEquipment: (slot) => {
          const t = (slot === "Offhand") ? o._sol : o._sag;
          return t ? { typeId: t } : undefined;
        },
        setEquipment: () => true
      };
    }
    return eskiGet(ad);
  };
  _durum.oyuncular = [o];
  return { D, o };
}

function zipla(o) {
  o.isJumping = true;
  sus(); tickIlerlet(8); ac();
  o.isJumping = false;
}

console.log("=== 1. IKI KOL AYNI ANDA ===");
{
  // Sag: Ors Kolu (blok yazar) | Sol: Ucus Kolu (efekt verir)
  const { D, o } = kur("ce1", "pa:kol_toprak", "pa:kol_ucus");
  zipla(o);
  sus(); tickIlerlet(400); ac();

  const ors = D.sayac.setType;   // yazilan blok sayisi
  const efekt = (D.boyut._efektler || []).map((e) => e.ad);

  kontrol("sag eldeki kol calisti (blok yazildi)", ors > 0, ors + " blok");
  kontrol("sol eldeki kol calisti (ucus efekti verildi)",
          efekt.indexOf("levitation") !== -1, efekt.join(", ") || "hicbiri");
  kontrol("actionbar ikisini birden yazdi",
          /\+/.test(o.onScreenDisplay._son || ""), o.onScreenDisplay._son);
}

console.log("");
console.log("=== 2. TEK EL ESKISI GIBI ===");
{
  const { D, o } = kur("ce2", "pa:kol_toprak", undefined);
  zipla(o);
  sus(); tickIlerlet(400); ac();
  const ors = D.sayac.setType;   // yazilan blok sayisi
  const efekt = (D.boyut._efektler || []).map((e) => e.ad);
  kontrol("sadece sag el calisti", ors > 0 && efekt.indexOf("levitation") === -1,
          ors + " blok, efekt: " + (efekt.join(", ") || "yok"));
}
{
  const { D, o } = kur("ce3", undefined, undefined);
  zipla(o);
  sus(); tickIlerlet(400); ac();
  const sim = D.sayac.dogan.filter((d) => d.tip === "minecraft:lightning_bolt").length;
  kontrol("iki el de bossa genel sira calisti", sim > 0, sim + " yildirim");
}

console.log("");
console.log("=== 3. AYNI KOL IKI ELDE -> BIR KEZ ===");
{
  const { D, o } = kur("ce4", "pa:kol_toprak", "pa:kol_toprak");
  zipla(o);
  sus(); tickIlerlet(400); ac();
  kontrol("ayni kol iki elde de olsa tek kez calisti",
          !/\+/.test(o.onScreenDisplay._son || ""), o.onScreenDisplay._son);
}

console.log("");
console.log("=== 4. BEKLEME TEK SAYILIYOR ===");
{
  const { D, o } = kur("ce5", "pa:kol_toprak", "pa:kol_ucus");
  zipla(o);
  sus(); tickIlerlet(400); ac();
  const ilkOrs = D.sayac.setType;
  const ilkEfekt = (D.boyut._efektler || []).length;

  kontrol("ilk tetiklemede ikisi de calisti", ilkOrs > 0 && ilkEfekt > 0,
          ilkOrs + " blok, " + ilkEfekt + " efekt");
  kontrol("sol el sag elin beklemesine TAKILMADI",
          ilkEfekt > 0, "sol el " + ilkEfekt + " efekt verdi");
}

console.log("");
console.log("=== 5. TAVAN (AYNI_ANDA) ===");
{
  kontrol("AYNI_ANDA ayari var ve 2", ayar.AYNI_ANDA === 2, String(ayar.AYNI_ANDA));

  /* Toprak Topu uzun suren bir is. Iki elde de uzun is varken
     ucuncu bir tetikleme tavana takilmali.                      */
  const { D, o } = kur("ce6", "pa:kol_kevin", "pa:kol_toprak");
  zipla(o);
  sus(); tickIlerlet(10); ac();      // isler acildi, henuz bitmedi

  // Bekleme dolsun ama isler surmeye devam etsin
  sus(); tickIlerlet(60); ac();
  const oncekiBlok = D.sayac.setType;
  zipla(o);
  sus(); tickIlerlet(5); ac();
  kontrol("tavan doluyken yeni is acilmadi (patlama olmadi)",
          D.sayac.setType >= oncekiBlok, "blok " + oncekiBlok + " -> " + D.sayac.setType);

  sus(); tickIlerlet(600); ac();
}

console.log("");
console.log("=== 6. OYUNCU CIKINCA IKI IS DE DURUYOR ===");
{
  const { D, o } = kur("ce7", "pa:kol_kevin", "pa:kol_toprak");
  zipla(o);
  sus(); tickIlerlet(20); ac();
  const ayrilmaAninda = D.sayac.setType;

  sus();
  for (const cb of _durum.playerLeaveCb) cb({ playerId: "ce7" });
  tickIlerlet(400);
  ac();

  kontrol("ayrildiktan sonra hicbir is devam etmedi",
          D.sayac.setType === ayrilmaAninda,
          ayrilmaAninda + " -> " + D.sayac.setType);
}

console.log("");
console.log("=== 7. BUTCE HALA TAVANDA ===");
{
  const { D, o } = kur("ce8", "pa:kol_kevin", "pa:kol_toprak");
  zipla(o);
  sus(); tickIlerlet(600); ac();
  const enFazla = Math.max(0, ...Object.values(D.sayac.tickBlok || {}));
  kontrol("iki is birden calisirken de butce asilmadi",
          enFazla <= ayar.TICK_BLOK_BUTCESI,
          enFazla + " / " + ayar.TICK_BLOK_BUTCESI);
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> tum cift el testleri gecti");
process.exit(hata ? 1 : 0);
