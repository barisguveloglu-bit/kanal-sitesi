import * as api from "@minecraft/server";
import { system } from "@minecraft/server";
import { hataYaz, bilgiYaz, gecerliMi, actionbarYaz } from "./yardimcilar.js";
import { KADEMELER, IKSIR_TAZELEME, IKSIR_ONEK } from "./ayarlar.js";

/* ============================================================
   IKSIR / KADEME SISTEMI  (Nitroksin'in bizdeki karsiligi)

   REFERANS NASIL YAPIYORDU:
     iksir icilince bir fonksiyon kafa zirhina KILITLI bir "goz"
     esyasi takiyordu. Guc o gozden geliyordu: tick.json her tick
       effect @e[hasitem={item=pa:beyaz_goz,location=slot.armor.head}] ...
     calistiriyordu. Yani her tick DUNYADAKI TUM VARLIKLAR taraniyor
     -- koyunlar, item'lar, her sey. Bes goz x bes efekt = tick
     basina 25 tam dunya taramasi. Ustelik gozu cikarmanin yolu
     yoktu (item_lock), yani guc kaliciydi.

   BIZDE:
     durum script'te bir Map. Tarama yok, sadece iksir icmis
     oyuncular geziliyor (cogu zaman sifir kisi). Goz SADECE
     GORUNUM -- oyuncu cikarsa bile kademe devam eder, o yuzden
     kilitlemeye gerek yok. Sure dolunca goz kendiliginden cikar.
   ============================================================ */

const ItemStack = api.ItemStack;

// oyuncuId -> { kademe, bitisTick, sonrakiTazeleme }
const kademeler = new Map();

const KIMLIKTEN = new Map();
const ESYADAN = new Map();
for (const k of KADEMELER) {
  KIMLIKTEN.set(k.kimlik, k);
  ESYADAN.set(IKSIR_ONEK + k.kimlik, k);
}

export function iksirinKademesi(esyaTipi) {
  return ESYADAN.get(esyaTipi);
}

export function kademeAl(oyuncuId) {
  const d = kademeler.get(oyuncuId);
  return d ? d.kademe : undefined;
}

export function kademeUnut(oyuncuId) {
  kademeler.delete(oyuncuId);
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

/* ---------------- Icme ---------------- */

export function iksirIc(oyuncu, kademe) {
  if (!kademe) return false;

  /* Kademeler BIRIKMEZ. Yeni iksir oncekini iptal eder ve bastan
     baslar; yoksa bes iksiri ust uste icip sonsuz guc olurdu.   */
  const onceki = kademeler.get(oyuncu.id);
  if (onceki && onceki.kademe !== kademe) gozCikar(oyuncu, onceki.kademe);

  kademeler.set(oyuncu.id, {
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

/* ---------------- Her tick ----------------
   Merkezi tick yoneticisinden cagriliyor. Hicbir oyuncu iksir
   icmemisse Map bos, dongu hic donmuyor -- bedava.             */

export function iksirTara(oyuncular) {
  if (kademeler.size === 0) return;

  const simdi = system.currentTick;

  for (const oyuncu of oyuncular) {
    const d = kademeler.get(oyuncu.id);
    if (!d) continue;

    if (!gecerliMi(oyuncu)) {
      kademeler.delete(oyuncu.id);
      continue;
    }

    if (simdi >= d.bitisTick) {
      efektSil(oyuncu, d.kademe);
      gozCikar(oyuncu, d.kademe);
      kademeler.delete(oyuncu.id);
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

/* Kademe kayitli ama oyuncu listede yoksa (cikti) temizle.
   playerLeave kacirilirsa Map sismesin diye ikinci emniyet.    */
export function iksirTemizle(canliIdler) {
  if (kademeler.size === 0) return;
  for (const id of Array.from(kademeler.keys())) {
    if (!canliIdler.has(id)) kademeler.delete(id);
  }
}

export function kademeSayisi() {
  return KADEMELER.length;
}
