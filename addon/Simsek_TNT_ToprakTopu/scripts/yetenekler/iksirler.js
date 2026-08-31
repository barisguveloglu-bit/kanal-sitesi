import * as api from "@minecraft/server";
import { system } from "@minecraft/server";
import { iksirKaydet, iksirinKademesi, tumIksirler } from "./kayit.js";
import {
  hataYaz, bilgiYaz, gecerliMi, olayaAbone, actionbarYaz, ekraniBoya
} from "../yardimcilar.js";
import { KADEMELER, IKSIR_TAZELEME, IKSIR_ONEK,
  PARLAMA_ACIK, PARLAMA_GIRIS, PARLAMA_TUT, PARLAMA_CIKIS,
  IKSIR_LAZERI_SEC
} from "../ayarlar.js";

/* ============================================================
   GUC IKSIRLERI  (Nitroksin'in bizdeki karsiligi)

   Yapi olarak yeteneklerle AYNI: dosya kendini kayit defterine
   yaziyor, main.js'te tek import satiri var, ayarlar tek yerde.
   Yeni iksir eklemek = ayarlar.js'teki KADEMELER'e bir satir.

   ---- REFERANS NASIL YAPIYORDU ----
   Iksir icilince bir fonksiyon kafa zirhina KILITLI bir "goz"
   esyasi takiyordu. Guc o gozden geliyordu: tick.json her tick
     effect @e[hasitem={item=pa:beyaz_goz,location=slot.armor.head}] ...
   calistiriyordu -- yani her tick DUNYADAKI TUM VARLIKLAR
   taraniyor. Bes goz x bes efekt = tick basina 25 tam tarama.
   Ustelik gozu cikarmanin yolu yoktu, guc kaliciydi.

   ---- BIZDE ----
   Durum bir Map. Tarama yok; sadece iksir icmis oyuncular
   geziliyor, kimse icmemisse dongu hic donmuyor. Goz SADECE
   GORUNUM -- cikarsa da kademe devam eder, o yuzden kilide
   gerek yok. Sure dolunca goz kendiliginden cikar.
   ============================================================ */

for (const k of KADEMELER) {
  iksirKaydet({
    kimlik: k.kimlik,
    ad: k.ad,
    esya: IKSIR_ONEK + k.kimlik,
    sure: k.sure,
    efektler: k.efektler,
    goz: k.goz,
    lazerGoz: k.lazerGoz,
    lazer: k.lazer
  });
}

const ItemStack = api.ItemStack;

// oyuncuId -> { kademe, bitisTick, sonrakiTazeleme }
const durumlar = new Map();

export function kademeAl(oyuncuId) {
  const d = durumlar.get(oyuncuId);
  return d ? d.kademe : undefined;
}

export function kademeUnut(oyuncuId) {
  durumlar.delete(oyuncuId);
  sonIcme.delete(oyuncuId);
}

export function iksirSayisi() {
  return tumIksirler().length;
}

/* ---------------- Goz (sadece gorunum) ---------------- */

let gozUyarisi = false;

function ekipman(oyuncu) {
  try {
    const e = oyuncu.getComponent("minecraft:equippable");
    if (e && typeof e.setEquipment === "function") return e;
  } catch (e) {
    hataYaz("iksir.ekipman", e);
  }
  if (!gozUyarisi) {
    gozUyarisi = true;
    bilgiYaz("UYARI: equippable.setEquipment yok. Goz gorunumu " +
             "kullanilamiyor, kademe gucleri normal calisiyor.");
  }
  return undefined;
}

function gozTak(oyuncu, kademe) {
  if (!ItemStack || !kademe.goz) return;
  const e = ekipman(oyuncu);
  if (!e) return;
  try {
    e.setEquipment("Head", new ItemStack(kademe.goz, 1));
  } catch (err) {
    // Goz esyasi kayitli olmayabilir; kademe yine de calisir
    hataYaz("iksir.gozTak(" + kademe.goz + ")", err);
  }
}

function gozCikar(oyuncu, kademe) {
  if (!kademe || !kademe.goz) return;
  const e = ekipman(oyuncu);
  if (!e) return;
  try {
    // Sadece BIZIM taktigimiz gozu kaldir: oyuncu araya bir kask
    // taktiysa onu silmeyelim.
    const simdiki = e.getEquipment("Head");
    if (!simdiki) return;
    // Normal goz ya da lazer varyanti -- ikisi de bizim
    if (simdiki.typeId !== kademe.goz && simdiki.typeId !== kademe.lazerGoz) return;
    e.setEquipment("Head", undefined);
  } catch (err) {
    hataYaz("iksir.gozCikar", err);
  }
}

/* Lazer atarken goz parlak varyantina geciyor, bitince normale
   donuyor. Referansta da boyleydi (replaceitem ile goz_lazer),
   tek farki bizde KILIT yok -- gozu istedigin an cikarabilirsin.

   Lazer gozu kayitli degilse sessizce normal gozde kaliyor:
   gorsel eksik olur, lazer yine calisir.                        */
export function lazerGozuAc(oyuncu, kademe) {
  if (!kademe.lazerGoz) return;
  const d = durumlar.get(oyuncu.id);
  if (!d) return;                       // kademe bitmis
  gozDegistir(oyuncu, kademe.goz, kademe.lazerGoz);
}

export function lazerGozuKapat(oyuncu, kademe) {
  if (!kademe.lazerGoz) return;
  const d = durumlar.get(oyuncu.id);
  if (!d) return;                       // kademe bitmis, goz zaten cikti
  gozDegistir(oyuncu, kademe.lazerGoz, kademe.goz);
}

/* Kafadaki goz BIZIMKIYSE degistir. Oyuncu araya baska bir kask
   taktiysa dokunmuyoruz.                                        */
function gozDegistir(oyuncu, eskiTip, yeniTip) {
  if (!ItemStack) return;
  const e = ekipman(oyuncu);
  if (!e) return;
  try {
    const simdiki = e.getEquipment("Head");
    if (!simdiki || simdiki.typeId !== eskiTip) return;
    e.setEquipment("Head", new ItemStack(yeniTip, 1));
  } catch (err) {
    hataYaz("iksir.gozDegistir(" + yeniTip + ")", err);
  }
}

/* Kademeyi suresi dolmadan bitirir. Referanstaki "kapama"
   fonksiyonunun karsiligi -- ama orada sadece esyalar
   temizleniyordu, efektler uzerinde kaliyordu.                  */
export function kademeBitir(oyuncu) {
  const d = durumlar.get(oyuncu.id);
  if (!d) return undefined;

  efektSil(oyuncu, d.kademe);
  gozCikar(oyuncu, d.kademe);
  // Lazer gozu takiliyken kapatilmis olabilir
  if (d.kademe.lazerGoz) {
    const e = ekipman(oyuncu);
    try {
      const simdiki = e && e.getEquipment("Head");
      if (simdiki && simdiki.typeId === d.kademe.lazerGoz) e.setEquipment("Head", undefined);
    } catch (err) {
      hataYaz("iksir.kademeBitir", err);
    }
  }
  durumlar.delete(oyuncu.id);
  // Elle kapatinca da lazer secimi geri birakilsin
  if (IKSIR_LAZERI_SEC) kancaCagir("lazerBirak", oyuncu);
  return d.kademe;
}

/* ---------------- Efektler ---------------- */

function efektVer(oyuncu, kademe) {
  /* Efekt suresi TAZELEME'den uzun: iki tazeleme arasinda
     sonmesin diye. Sure bitiminde zaten elle siliniyor.        */
  const sure = IKSIR_TAZELEME * 3;
  for (const [ad, seviye] of kademe.efektler) {
    try {
      oyuncu.addEffect(ad, sure, { amplifier: seviye, showParticles: true });
    } catch (e) {
      // Bilinmeyen efekt adi tum kademeyi dusurmesin
      hataYaz("iksir.addEffect(" + ad + ")", e);
    }
  }
}

function efektSil(oyuncu, kademe) {
  for (const [ad] of kademe.efektler) {
    try {
      oyuncu.removeEffect(ad);
    } catch (e) {
      /* removeEffect bazi surumlerde yok; efektler zaten kisa
         sureli verildigi icin en fazla birkac saniye sonra
         kendiliginden soner.                                   */
    }
  }
}

/* ---------------- Icme ---------------- */

/* Icme parlamasi: ekran kademenin renginde parliyor.

   Fikir referanstan; oradaki hata renk araligiydi. camera fade
   0.0-1.0 bekliyor, referans bazi iksirlerde 0-255 yaziyordu ve
   o iksirler kendi renkleri yerine beyaz parliyordu. Buradaki
   renkler KADEMELER tablosunda, hepsi 0.0-1.0.

   camera komutu eski surumlerde yok; bir kez uyarilip sessizce
   geciliyor. Parlama tamamen gorsel, olmamasi oynanisi bozmuyor. */
/* v6.9: govde yardimcilar.js'e tasindi (ekraniBoya). Code-Man'in
   siyah guc saldirisi da ayni komutu istiyor; iki kopya iki ayri
   yerde bozulacak tek bir mantik demekti.                     */
function parlat(oyuncu, kademe) {
  if (!PARLAMA_ACIK) return;
  ekraniBoya(oyuncu, kademe.renk, PARLAMA_GIRIS, PARLAMA_TUT, PARLAMA_CIKIS);
}

export function iksirIc(oyuncu, kademe) {
  if (!kademe) return false;

  /* Kademeler BIRIKMEZ. Yeni iksir oncekini iptal eder ve bastan
     baslar; yoksa bes iksiri ust uste icip sonsuz guc olurdu.   */
  const onceki = durumlar.get(oyuncu.id);
  if (onceki && onceki.kademe !== kademe) gozCikar(oyuncu, onceki.kademe);

  durumlar.set(oyuncu.id, {
    kademe,
    bitisTick: system.currentTick + kademe.sure,
    sonrakiTazeleme: 0            // ilk tarama hemen versin
  });

  gozTak(oyuncu, kademe);
  efektVer(oyuncu, kademe);
  parlat(oyuncu, kademe);

  try {
    oyuncu.sendMessage(
      "§d" + kademe.ad + " §7ictin · " + (kademe.sure / 20).toFixed(0) + " saniye"
    );
  } catch (e) {
    hataYaz("iksir.sendMessage", e);
  }
  return true;
}

/* ---------------- Icme olayi ----------------
   ASIL YOL: itemCompleteUse -- icme animasyonu BITINCE gelir,
   yani yarim birakip guc kazanamazsin.

   YEDEK YOL: itemUse -- icmeye BASLAYINCA gelir. Neden lazim:
   esyanin icilebilir sayilmasi minecraft:use_animation'a bagli
   ve bu bilesenin adi/davranisi surumler arasi degisebiliyor.
   Icme hic "tamamlanmazsa" itemCompleteUse hic gelmez ve iksir
   tamamen olu kalir (v4.1'de bu oldu). Yedek yol o durumda
   devreye giriyor.

   Cift tetiklenme sorun degil: ayni iksir CIFT_ESIK tick icinde
   ikinci kez gelirse yok sayiliyor, yani sure bastan baslamiyor. */
const CIFT_ESIK = 30;
const sonIcme = new Map();   // oyuncuId -> { kimlik, tick }

function icmeyiIsle(oyuncu, esya, nereden) {
  if (!oyuncu || !esya) return;

  const kademe = iksirinKademesi(esya.typeId);
  if (!kademe) return;

  const onceki = sonIcme.get(oyuncu.id);
  const simdi = system.currentTick;
  if (onceki && onceki.kimlik === kademe.kimlik && simdi - onceki.tick < CIFT_ESIK) {
    return;   // ayni icme iki yoldan da geldi
  }
  sonIcme.set(oyuncu.id, { kimlik: kademe.kimlik, tick: simdi });

  iksirIc(oyuncu, kademe);
  bilgiYaz("iksir icildi: " + kademe.kimlik + " (" + nereden + ")");

  /* Icince lazer jest secimine gelsin. Sebebi ayarlar.js'teki
     IKSIR_LAZERI_SEC aciklamasinda: lazer esyasiz sirada 21.
     sirada ve sifirinci sira Yildirim Halkasi. Secim
     degistirmeden zipladiginda etrafa yildirim yagiyordu.      */
  if (IKSIR_LAZERI_SEC) kancaCagir("lazerSec", oyuncu);
}

/* ---------------- Disari acilan kancalar ----------------
   main.js jest secimini tutuyor ama bu dosya main.js'i import
   EDEMEZ (main.js zaten burayi import ediyor, dairesel olur).
   O yuzden main.js kancayi buraya birakiyor.                   */
let kancalar = {};

export function iksirKancalari(k) {
  kancalar = k || {};
}

function kancaCagir(ad, ...arg) {
  const f = kancalar[ad];
  if (typeof f !== "function") return undefined;
  try {
    return f(...arg);
  } catch (e) {
    hataYaz("iksir.kanca." + ad, e);
    return undefined;
  }
}

const tamKuruldu = olayaAbone("itemCompleteUse", (olay) => {
  try {
    icmeyiIsle(olay.source, olay.itemStack, "itemCompleteUse");
  } catch (e) {
    hataYaz("itemCompleteUse", e);
  }
});

const basKuruldu = olayaAbone("itemUse", (olay) => {
  try {
    icmeyiIsle(olay.source, olay.itemStack, "itemUse");
  } catch (e) {
    hataYaz("itemUse.iksir", e);
  }
});

if (!tamKuruldu && !basKuruldu) {
  bilgiYaz("KRITIK: ne itemCompleteUse ne itemUse kuruldu, iksirler calismaz.");
} else if (!tamKuruldu) {
  bilgiYaz("itemCompleteUse yok, iksirler itemUse ile calisacak.");
}

/* ---------------- Her tick ----------------
   Merkezi tick yoneticisinden cagriliyor. Hicbir oyuncu iksir
   icmemisse Map bos, dongu hic donmuyor -- bedava.             */

export function iksirTara(oyuncular) {
  if (durumlar.size === 0) return;

  const simdi = system.currentTick;

  for (const oyuncu of oyuncular) {
    const d = durumlar.get(oyuncu.id);
    if (!d) continue;

    if (!gecerliMi(oyuncu)) {
      durumlar.delete(oyuncu.id);
      continue;
    }

    if (simdi >= d.bitisTick) {
      efektSil(oyuncu, d.kademe);
      gozCikar(oyuncu, d.kademe);
      durumlar.delete(oyuncu.id);
      // Lazer secimi iksirle gelmisti, iksirle gitsin
      if (IKSIR_LAZERI_SEC) kancaCagir("lazerBirak", oyuncu);
      actionbarYaz(oyuncu, "§8" + d.kademe.ad + " bitti");
      continue;
    }

    if (simdi < d.sonrakiTazeleme) continue;
    d.sonrakiTazeleme = simdi + IKSIR_TAZELEME;
    efektVer(oyuncu, d.kademe);

    const kalan = (d.bitisTick - simdi) / 20;
    if (kalan <= 5) {
      actionbarYaz(oyuncu, "§e" + d.kademe.ad + " §8· " + kalan.toFixed(0) + " sn");
    }
  }
}

/* Hic iksir icilmediyse main.js taramayi hic cagirmasin diye. */
export function iksirAktifMi() {
  return durumlar.size > 0;
}
