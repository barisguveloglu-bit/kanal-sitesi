import * as api from "@minecraft/server";
import { system } from "@minecraft/server";
import { iksirKaydet, iksirinKademesi, tumIksirler } from "./kayit.js";
import {
  hataYaz, bilgiYaz, gecerliMi, olayaAbone, actionbarYaz
} from "../yardimcilar.js";
import { KADEMELER, IKSIR_TAZELEME, IKSIR_ONEK } from "../ayarlar.js";

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
    goz: k.goz
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
    if (simdiki && simdiki.typeId !== kademe.goz) return;
    e.setEquipment("Head", undefined);
  } catch (err) {
    hataYaz("iksir.gozCikar", err);
  }
}

/* ---------------- Efektler ---------------- */

function efektVer(oyuncu, kademe) {
  /* Efekt suresi TAZELEME'den uzun: iki tazeleme arasinda
     sonmesin diye. Sure bitiminde zaten elle siliniyor.        */
  const sure = IKSIR_TAZELEME * 3;
  for (const [ad, seviye] of kademe.efektler) {
    try {
      oyuncu.addEffect(ad, sure, { amplifier: seviye, showParticles: false });
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

  try {
    oyuncu.sendMessage(
      "§d" + kademe.ad + " §7ictin · " + (kademe.sure / 20).toFixed(0) + " saniye"
    );
  } catch (e) {
    hataYaz("iksir.sendMessage", e);
  }
  return true;
}

/* Icme YETENEKLERDEN FARKLI bir olayla yakalaniyor: itemUse
   icmeye BASLAYINCA tetiklenir, itemCompleteUse ise BITINCE.
   Yarim birakip guc kazanmayasin diye ikincisi kullaniliyor. */
const kuruldu = olayaAbone("itemCompleteUse", (olay) => {
  try {
    const oyuncu = olay.source;
    const esya = olay.itemStack;
    if (!oyuncu || !esya) return;

    const kademe = iksirinKademesi(esya.typeId);
    if (kademe) iksirIc(oyuncu, kademe);
  } catch (e) {
    hataYaz("itemCompleteUse", e);
  }
});

if (!kuruldu) {
  bilgiYaz("UYARI: itemCompleteUse yok, iksirler calismayacak.");
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
