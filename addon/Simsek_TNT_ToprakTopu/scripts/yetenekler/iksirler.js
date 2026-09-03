import * as api from "@minecraft/server";
import { system } from "@minecraft/server";
import { iksirKaydet, iksirinKademesi, tumIksirler } from "./kayit.js";
import {
  hataYaz, bilgiYaz, gecerliMi, olayaAbone, actionbarYaz, ekraniBoya,
  parcacikAt
} from "../yardimcilar.js";
import { KADEMELER, IKSIR_TAZELEME, IKSIR_ONEK,
  PARLAMA_ACIK, PARLAMA_GIRIS, PARLAMA_TUT, PARLAMA_CIKIS,
  IKSIR_LAZERI_SEC, NITROKSIN_DUSME_BAGISIK,
  AURA_ACIK, AURA_ONEK, AURA_ARALIK, AURA_HALE_ARALIK,
  AURA_KAFA_Y, AURA_PATLAMA_Y,
  GOZ_ALEV_ACIK, GOZ_ALEV_ARALIK, GOZ_ALEV_ON, GOZ_ALEV_YAN,
  GOZ_ALEV_Y
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
  auraPatlat(oyuncu, kademe);

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

/* ================================================================
   NITROKSIN: DUSME HASARI YOK  (v7.6)

   Kullanici "nitroksin de gucsuz" dedi. v4.78'de butun
   efektlere +1 verilmis ve BEGENILMEMISTI -- ders: hissedilen
   sey yeni bir yetenek, ayni yetenegin bir basamak yukarisi
   degil. O yuzden sayilar yalniz KENDI uzmanliginda buyudu
   (hiz/ziplama 3->4) ve yanina bu YENI yetenek geldi.

   NEDEN TAM BU: Nitroksin ziplama uzmani ve Ziplama V ile
   attigin ziplamanin bedelini KENDI yeteneginden oduyordun.
   `slow_falling` bunu hafifletiyor ama Grinoksin ve Kan
   Iksiri'nde de var; Nitroksin'e ait bir sey degildi.

   NASIL: hasar IPTAL EDILEMIYOR (Bedrock script API'sinde
   entityHurt iptal edilebilir degil). Onun yerine hasar geri
   VERILIYOR -- teknoloji zirhlarinda ve Viltrumite'ta
   kullanilan ayni kalip. Verilen SIFA yeni bir entityHurt
   uretmiyor, yani dongu yok.

   YALNIZ DUSME: `cause === "fall"`. Void, aclik, lav hala
   oldurur -- tam dokunulmazlik SADECE StarOxine'de.
   ================================================================ */
export function nitroksinDusme(olay) {
  if (!NITROKSIN_DUSME_BAGISIK) return false;
  const oyuncu = olay ? olay.hurtEntity : undefined;
  if (!oyuncu || oyuncu.typeId !== "minecraft:player") return false;
  const kaynak = olay.damageSource;
  if (!kaynak || kaynak.cause !== "fall") return false;

  const kademe = kademeAl(oyuncu.id);
  if (!kademe || kademe.kimlik !== "nitroksin") return false;

  const gelen = typeof olay.damage === "number" ? olay.damage : 0;
  if (!(gelen > 0)) return false;
  try {
    const can = oyuncu.getComponent("minecraft:health");
    if (!can) return false;
    /* Tavani asmayacak kadar geri ver: fazlasi sessizce
       kaybolurdu ama "iyilestim" hissi yanlis olurdu. */
    const hedef = Math.min(can.effectiveMax, can.currentValue + gelen);
    can.setCurrentValue(hedef);
  } catch (e) {
    hataYaz("nitroksin.dusme", e);
    return false;
  }
  return true;
}


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

/* Dusme bagisikligi kendi olayina abone. Kalip bu dosyanin
   kendi itemUse abonelikleriyle ayni: olay yoksa PAKET OLMUYOR,
   yalnizca bu ozellik kapaniyor ve sebebi yaziliyor
   (bot_ilkel dersi).                                        */
if (NITROKSIN_DUSME_BAGISIK) {
  const dusmeKuruldu = olayaAbone("entityHurt", (olay) => {
    try {
      nitroksinDusme(olay);
    } catch (e) {
      hataYaz("iksir.entityHurt", e);
    }
  });
  if (!dusmeKuruldu) {
    bilgiYaz("entityHurt yok: Nitroksin'in dusme bagisikligi kapali. " +
             "Iksirin geri kalani (hiz/ziplama V) aynen calisiyor.");
  }
}

if (!tamKuruldu && !basKuruldu) {
  bilgiYaz("KRITIK: ne itemCompleteUse ne itemUse kuruldu, iksirler calismaz.");
} else if (!tamKuruldu) {
  bilgiYaz("itemCompleteUse yok, iksirler itemUse ile calisacak.");
}

/* ---------------- Her tick ----------------
   Merkezi tick yoneticisinden cagriliyor. Hicbir oyuncu iksir
   icmemisse Map bos, dongu hic donmuyor -- bedava.             */

/* ---- AURA (v7.15) ----

   Parcacik adi kademe.kimlik'ten kuruluyor; ikinci bir tablo
   YOK (bkz. ayarlar.js AURA bolumu).

   Kafanin konumu getHeadLocation ile aliniyor, oyuncunun
   location'i degil: location AYAK hizasi, aura orada ciksaydi
   zerreler bacaklardan yukselirdi.

   Hepsi try/catch icinde ve parcacikAt zaten kendi uyarisini
   bir kez basip susuyor: parcacik cizilemese bile iksir
   calismaya devam etmeli. Gorsel eksik, oynanis normal.     */
function auraAt(oyuncu, kademe, tur, yukseklik) {
  if (!AURA_ACIK) return false;
  try {
    const bas = oyuncu.getHeadLocation();
    parcacikAt(oyuncu.dimension, AURA_ONEK + tur + "_" + kademe.kimlik, {
      x: bas.x, y: bas.y + yukseklik, z: bas.z
    });
    return true;
  } catch (e) {
    hataYaz("aura." + tur, e);
    return false;
  }
}

/* Iksir icildigi an bir kez. Disari acilan kivilcimlar. */
export function auraPatlat(oyuncu, kademe) {
  return auraAt(oyuncu, kademe, "patlama", AURA_PATLAMA_Y);
}

/* ---- GOZ ALEVI (v7.17) ----

   Iki alev, iki gozun TAM ONUNDE. Konum kafanin konumundan
   ve BAKIS YONUNDEN hesaplaniyor -- oyuncu donunce alevler de
   donuyor, yoksa adam saga bakarken alevler onunde havada
   asili kalirdi.

   Yan vektor: ileri (yatay) x yukari.  ileri = (ix, 0, iz)
   ise yan = (iz, 0, -ix).  Hangisi sag hangisi sol onemli
   degil -- iki alev SIMETRIK konuyor, +yan ve -yan.

   Tam yukari/asagi bakarken yatay bilesen sifira gidiyor ve
   "on" diye bir yon kalmiyor; o karede cizmiyoruz. Boluyu
   sifira bolmekten de bu koruyor.                          */
function gozAleviAt(oyuncu, kademe) {
  if (!AURA_ACIK || !GOZ_ALEV_ACIK) return false;
  try {
    const bas = oyuncu.getHeadLocation();
    const bak = oyuncu.getViewDirection();
    const yatay = Math.sqrt(bak.x * bak.x + bak.z * bak.z);
    if (!(yatay > 0.05)) return false;
    const ix = bak.x / yatay, iz = bak.z / yatay;
    const sx = iz, sz = -ix;
    const ad = AURA_ONEK + "gozalev_" + kademe.kimlik;
    for (const yon of [-1, 1]) {
      parcacikAt(oyuncu.dimension, ad, {
        x: bas.x + ix * GOZ_ALEV_ON + sx * GOZ_ALEV_YAN * yon,
        y: bas.y + GOZ_ALEV_Y,
        z: bas.z + iz * GOZ_ALEV_ON + sz * GOZ_ALEV_YAN * yon
      });
    }
    return true;
  } catch (e) {
    hataYaz("aura.gozalev", e);
    return false;
  }
}

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

    /* AURA -- tazelemeden AYRI ritimde.

       Tazeleme IKSIR_TAZELEME tick'te bir (efektleri yeniler);
       aura ondan cok daha sik olmali, yoksa zerreler kesik
       kesik cikar. O yuzden asagidaki iki blok `continue`nin
       USTUNDE duruyor -- tazeleme sirasi gelmese de aura
       cikiyor.                                              */
    if (simdi % AURA_ARALIK === 0) auraAt(oyuncu, d.kademe, "kor", AURA_KAFA_Y);
    if (simdi % AURA_HALE_ARALIK === 0) {
      auraAt(oyuncu, d.kademe, "hale", AURA_KAFA_Y);
    }
    /* Goz alevi en sik olani: gozun onunde KESIKSIZ yanmasi
       gerekiyor, yoksa alev degil kivilcim gorunuyor. */
    if (simdi % GOZ_ALEV_ARALIK === 0) gozAleviAt(oyuncu, d.kademe);

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
