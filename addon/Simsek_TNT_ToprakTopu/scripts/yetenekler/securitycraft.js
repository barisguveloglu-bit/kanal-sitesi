import { system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import {
  hataYaz, gecerliMi, kollariIndir, actionbarYaz, parcacikAt, varlikKonumu
} from "../yardimcilar.js";
import { patlamaIste } from "../butce.js";
import {
  KALKAN_ACIK, KALKAN_YARICAP, KALKAN_SURE, KALKAN_ARA, KALKAN_TAVAN,
  KALKAN_PARCACIK, KALKAN_MERMILER,
  YARIK_ACIK, YARIK_YARICAP, YARIK_SURE, YARIK_ARA, YARIK_TAVAN,
  YARIK_PARCACIK, YARIK_MERMILER,
  NOBETCI_ACIK, NOBETCI_YARICAP, NOBETCI_SURE, NOBETCI_ARA,
  NOBETCI_HASAR, NOBETCI_PARCACIK, NOBETCI_SES,
  RADAR_ACIK, RADAR_YARICAP, RADAR_SURE, RADAR_ARA, RADAR_TAVAN,
  MAYIN_ACIK, MAYIN_YARICAP, MAYIN_SURE, MAYIN_KURULUM, MAYIN_ARA,
  MAYIN_GUC, MAYIN_KIRAR, MAYIN_PARCACIK,
  SIMSEK_OYUNCU_HEDEF, KILIT_ATLA_TIPLER
} from "../ayarlar.js";

/* SECURITYCRAFT'TAN ALINAN BES SAVUNMA DUZENEGI      v7.86

   Kullanici jar'i gonderdi: "alabildigimiz tum her seyi
   alalim, hicbir seyi atlamadan." Olcum
   REFERANS_SECURITYCRAFT.md'de: 710 blok ve 55 esyanin
   altindan ~35 gercek fikir cikiyor, gerisi ayni iki fikrin
   yuzlerce varyasyonu ("guclendirilmis <blok>", "<cevher>
   mayini").

   Buradaki besi, bu depoda karsiligi HIC olmayan ve script
   ile gercekten yapilabilenler.

   ---- HEPSI SURELI, HEPSI KONUMA BAGLI ----
   Kaynakta bunlar BLOK: koydugun yerde sonsuza kadar durur.
   Bizde sureli IS. Sebebi ayarlar.js'te yazili.            */


/* ============================================================
   ORTAK: YAKLASAN MERMIYI DUSUR

   Kalkan Sistemi ve Yarik Dengeleyici ayni islemi yapiyor,
   yalniz LISTESI ve amaci farkli. Ortak olan burada.

   ---- "YAKLASAN" NEDEN OLCULUYOR ----
   Kaynak merminin SAHIBINI okuyabiliyor; Bedrock script'inde
   o alan yok. Onun yerine merminin hiz vektoru ile
   "mermiden merkeze" vektorunun ic carpimina bakiliyor:
   pozitifse mermi bize dogru geliyor, negatifse uzaklasiyor.
   Kendi attigimiz ok uzaklasir, dusurulmez.

   Hiz OKUNAMAZSA mermiye dokunulmuyor. Supheliyi yok etmek
   yerine birakmak, bu depodaki her olcumun ayni tercihi.  */
export function yaklasanMi(mermi, merkez) {
  let h;
  try {
    if (typeof mermi.getVelocity !== "function") return false;
    h = mermi.getVelocity();
  } catch (e) { return false; }
  if (!h) return false;
  const k = mermi.location;
  if (!k) return false;
  const dx = merkez.x - k.x, dy = merkez.y - k.y, dz = merkez.z - k.z;
  const ic = h.x * dx + h.y * dy + h.z * dz;
  return ic > 0;
}

function mermileriDusur(boyut, merkez, liste, yaricap, tavan, parcacik) {
  let yakinlar;
  try {
    yakinlar = boyut.getEntities({ location: merkez, maxDistance: yaricap });
  } catch (e) {
    hataYaz("sc.mermiTara", e);
    return 0;
  }
  let dusen = 0;
  for (const m of yakinlar) {
    if (dusen >= tavan) break;
    try {
      if (!gecerliMi(m)) continue;
      if (liste.indexOf(m.typeId) === -1) continue;
      if (!yaklasanMi(m, merkez)) continue;
      const yer = m.location;
      m.remove();
      parcacikAt(boyut, parcacik, yer);
      dusen++;
    } catch (e) {
      hataYaz("sc.mermiDusur", e);
    }
  }
  return dusen;
}

/* Sureli, aralikli bir is uretmek icin ortak iskelet.
   Bes yetenegin besi de ayni sekli tasiyor; ayri ayri
   yazilsaydi bes ayri "sure doldu mu" hatasi olurdu.     */
function sureliIs(ad, oyuncu, sure, ara, adim, bitirme) {
  const baslangic = system.currentTick;
  let sonraki = baslangic;
  return {
    ad,
    oyuncuId: oyuncu.id,
    calis() {
      const simdi = system.currentTick;
      if (simdi - baslangic >= sure) return true;     // sure doldu
      if (simdi < sonraki) return false;
      sonraki = simdi + ara;
      try { adim(simdi - baslangic); } catch (e) { hataYaz(ad + ".adim", e); }
      return false;
    },
    bitir() {
      try { if (bitirme) bitirme(); } catch (e) { hataYaz(ad + ".bitir", e); }
    }
  };
}


/* ============================================================
   1. KALKAN SISTEMI  (kaynakta: Trophy System)
   Yakinindaki YAKLASAN mermileri havada yok ediyor.
   ============================================================ */
yetenekKaydet({
  kimlik: "kalkan_sistemi",
  ad: "Kalkan Sistemi",
  esyasiz: true,
  sira: 520,

  olustur(oyuncu) {
    if (!KALKAN_ACIK) return undefined;
    const boyut = oyuncu.dimension;
    let toplam = 0;
    kollariIndir(oyuncu);
    actionbarYaz(oyuncu, "§b◈ §fKalkan Sistemi açık §8· " +
                         (KALKAN_SURE / 20).toFixed(0) + " sn");
    return sureliIs("kalkan_sistemi", oyuncu, KALKAN_SURE, KALKAN_ARA, () => {
      if (!gecerliMi(oyuncu)) return;
      const n = mermileriDusur(boyut, oyuncu.location, KALKAN_MERMILER,
                               KALKAN_YARICAP, KALKAN_TAVAN, KALKAN_PARCACIK);
      if (n > 0) {
        toplam += n;
        actionbarYaz(oyuncu, "§b◈ §f" + toplam + " mermi düşürüldü");
      }
    }, () => {
      if (gecerliMi(oyuncu)) {
        actionbarYaz(oyuncu, "§7Kalkan Sistemi kapandı §8· " +
                             toplam + " mermi");
      }
    });
  }
});


/* ============================================================
   2. YARIK DENGELEYICI  (kaynakta: Rift Stabilizer)
   Menzilinde isinlanmayi engelliyor -- rakip kacamiyor.

   Gozcu isinlanmayi GORUYOR ama engellemiyor (o bilerek:
   Gozcu yalniz bildirir). Engelleyen taraf burasi.
   ============================================================ */
yetenekKaydet({
  kimlik: "yarik_dengeleyici",
  ad: "Yarik Dengeleyici",
  esyasiz: true,
  sira: 521,

  olustur(oyuncu) {
    if (!YARIK_ACIK) return undefined;
    const boyut = oyuncu.dimension;
    let toplam = 0;
    kollariIndir(oyuncu);
    actionbarYaz(oyuncu, "§5✧ §fYarık Dengeleyici açık §8· " +
                         YARIK_YARICAP + " blok");
    return sureliIs("yarik_dengeleyici", oyuncu, YARIK_SURE, YARIK_ARA, () => {
      if (!gecerliMi(oyuncu)) return;
      /* Inci "yaklasan" olmasa da dusuruluyor mu? EVET, ayni
         olcum kullaniliyor: baskasinin KACMAK icin attigi
         inci senden UZAGA gider, yani "yaklasan" degildir ve
         dusmezdi. Bu yuzden burada merkez inciye gore degil
         BIZE gore degil -- mesafeye gore calisiyor: menzil
         icindeki her inci dusuyor.                         */
      let yakinlar;
      try {
        yakinlar = boyut.getEntities({
          location: oyuncu.location, maxDistance: YARIK_YARICAP
        });
      } catch (e) { hataYaz("yarik.tara", e); return; }
      let n = 0;
      for (const m of yakinlar) {
        if (n >= YARIK_TAVAN) break;
        try {
          if (!gecerliMi(m)) continue;
          if (YARIK_MERMILER.indexOf(m.typeId) === -1) continue;
          const yer = m.location;
          m.remove();
          parcacikAt(boyut, YARIK_PARCACIK, yer);
          n++;
        } catch (e) { hataYaz("yarik.dusur", e); }
      }
      if (n > 0) {
        toplam += n;
        actionbarYaz(oyuncu, "§5✧ §f" + toplam + " ışınlanma engellendi");
      }
    }, () => {
      if (gecerliMi(oyuncu)) {
        actionbarYaz(oyuncu, "§7Yarık Dengeleyici kapandı §8· " +
                             toplam + " engelleme");
      }
    });
  }
});


/* ============================================================
   3. NOBETCI  (kaynakta: Sentry)
   Kuruldugu KONUMDA duran, menzile gireni vuran taret.
   Modeli yok; sebebi ayarlar.js'te olculu yazili.
   ============================================================ */
function nobetciHedefi(boyut, yer, sahipId) {
  let yakinlar;
  try {
    yakinlar = boyut.getEntities({
      location: yer, maxDistance: NOBETCI_YARICAP,
      excludeTypes: ["minecraft:item", "minecraft:xp_orb"]
    });
  } catch (e) {
    hataYaz("nobetci.tara", e);
    return undefined;
  }
  let enIyi, enYakin = Infinity;
  for (const v of yakinlar) {
    try {
      if (!gecerliMi(v)) continue;
      if (v.id === sahipId) continue;                  // sahibini asla
      if (KILIT_ATLA_TIPLER.has(v.typeId)) continue;   // kendi botlarimiz
      if (v.typeId === "minecraft:player" && !SIMSEK_OYUNCU_HEDEF) continue;
      const k = v.location;
      const d = Math.hypot(k.x - yer.x, k.y - yer.y, k.z - yer.z);
      if (d < enYakin) { enYakin = d; enIyi = v; }
    } catch (e) { /* tek varlık okunamadi, otekiler dursun */ }
  }
  return enIyi;
}

yetenekKaydet({
  kimlik: "nobetci",
  ad: "Nobetci",
  esyasiz: true,
  sira: 522,

  olustur(oyuncu) {
    if (!NOBETCI_ACIK) return undefined;
    const boyut = oyuncu.dimension;
    const sahipId = oyuncu.id;
    /* Konum SIMDI kopyalaniyor: nobetci kuruldugu yerde kalir,
       oyuncuyla gezmez. Kaynakta da oyle.                  */
    const k = oyuncu.location;
    const yer = { x: k.x, y: k.y + 1, z: k.z };
    let vurus = 0;
    kollariIndir(oyuncu);
    actionbarYaz(oyuncu, "§c⌖ §fNöbetçi kuruldu §8· " +
                         (NOBETCI_SURE / 20).toFixed(0) + " sn");
    return sureliIs("nobetci", oyuncu, NOBETCI_SURE, NOBETCI_ARA, () => {
      parcacikAt(boyut, NOBETCI_PARCACIK, yer);
      const hedef = nobetciHedefi(boyut, yer, sahipId);
      if (!hedef) return;
      try {
        hedef.applyDamage(NOBETCI_HASAR, {
          cause: "entityAttack", damagingEntity: oyuncu
        });
      } catch (e) {
        try { hedef.applyDamage(NOBETCI_HASAR); }
        catch (e2) { hataYaz("nobetci.hasar", e2); return; }
      }
      vurus++;
      parcacikAt(boyut, NOBETCI_PARCACIK,
                 varlikKonumu(hedef) || hedef.location);
      try { boyut.playSound(NOBETCI_SES, yer); } catch (e) { /* sessiz */ }
    }, () => {
      if (gecerliMi(oyuncu)) {
        actionbarYaz(oyuncu, "§7Nöbetçi söndü §8· " + vurus + " atış");
      }
    });
  }
});


/* ============================================================
   4. RADAR  (kaynakta: Portable Radar)
   Menzildeki oyuncularin adini bildiriyor.

   Gozcu'yu tamamliyor: Gozcu "bu adam hile yapiyor olabilir"
   der, radar "su an yaninda kim var" der. Ayri sorular.
   ============================================================ */
yetenekKaydet({
  kimlik: "radar",
  ad: "Radar",
  esyasiz: true,
  sira: 523,

  olustur(oyuncu) {
    if (!RADAR_ACIK) return undefined;
    const boyut = oyuncu.dimension;
    const kendiId = oyuncu.id;
    kollariIndir(oyuncu);
    return sureliIs("radar", oyuncu, RADAR_SURE, RADAR_ARA, () => {
      if (!gecerliMi(oyuncu)) return;
      let liste;
      try {
        liste = boyut.getEntities({
          location: oyuncu.location, maxDistance: RADAR_YARICAP
        });
      } catch (e) { hataYaz("radar.tara", e); return; }

      const bulunan = [];
      for (const v of liste) {
        try {
          if (!gecerliMi(v)) continue;
          if (v.typeId !== "minecraft:player") continue;
          /* KENDIMIZI LISTEYE ALMIYORUZ. Referans mod bu hatayi
             yapiyordu ve bu seride dorduncu kez gorulen ayni
             hata -- "@e" her zaman kullanicinin kendisini de
             kapsiyor.                                        */
          if (v.id === kendiId) continue;
          const k = v.location, m = oyuncu.location;
          bulunan.push({
            ad: v.name || "?",
            d: Math.hypot(k.x - m.x, k.y - m.y, k.z - m.z)
          });
        } catch (e) { /* tek oyuncu okunamadi */ }
      }
      bulunan.sort((a, b) => a.d - b.d);
      if (bulunan.length === 0) {
        actionbarYaz(oyuncu, "§8⟲ Radar §7· menzilde kimse yok");
        return;
      }
      const yazi = bulunan.slice(0, RADAR_TAVAN)
        .map((x) => "§f" + x.ad + " §8" + x.d.toFixed(0) + "b")
        .join(" §8· ");
      const fazla = bulunan.length - RADAR_TAVAN;
      actionbarYaz(oyuncu, "§a⟲ " + yazi +
                   (fazla > 0 ? " §8+" + fazla : ""));
    }, () => {
      if (gecerliMi(oyuncu)) actionbarYaz(oyuncu, "§7Radar kapandı");
    });
  }
});


/* ============================================================
   5. MAYIN  (kaynakta: Mine / Claymore / Bouncing Betty)
   Yere kuruluyor, menziline gireni patlatiyor.

   Sahibini ASLA tetiklemiyor ve kurma gecikmesi var --
   ikisinin de sebebi ayarlar.js'te yazili.
   ============================================================ */
yetenekKaydet({
  kimlik: "mayin",
  ad: "Mayin",
  esyasiz: true,
  sira: 524,

  olustur(oyuncu) {
    if (!MAYIN_ACIK) return undefined;
    const boyut = oyuncu.dimension;
    const sahipId = oyuncu.id;
    const k = oyuncu.location;
    const yer = { x: k.x, y: k.y, z: k.z };
    let patladi = false;
    kollariIndir(oyuncu);
    actionbarYaz(oyuncu, "§c✸ §fMayın kuruldu §8· " +
                         (MAYIN_KURULUM / 20).toFixed(1) + " sn sonra aktif");

    return sureliIs("mayin", oyuncu, MAYIN_SURE, MAYIN_ARA, (gecen) => {
      if (patladi) return;
      parcacikAt(boyut, MAYIN_PARCACIK, yer);
      /* KURMA GECIKMESI: bu sure dolmadan hicbir sey
         tetiklemiyor. Yoksa mayini kurarken yanindan gecen
         tavuk aninda patlatiyor ve yetenek kullanilamaz
         oluyor.                                            */
      if (gecen < MAYIN_KURULUM) return;

      let yakinlar;
      try {
        yakinlar = boyut.getEntities({
          location: yer, maxDistance: MAYIN_YARICAP,
          excludeTypes: ["minecraft:item", "minecraft:xp_orb"]
        });
      } catch (e) { hataYaz("mayin.tara", e); return; }

      let tetikleyen = false;
      for (const v of yakinlar) {
        try {
          if (!gecerliMi(v)) continue;
          if (v.id === sahipId) continue;                 // SAHIBI TETIKLEMEZ
          if (KILIT_ATLA_TIPLER.has(v.typeId)) continue;  // kendi botlarimiz
          tetikleyen = true;
          break;
        } catch (e) { /* tek varlık okunamadi */ }
      }
      if (!tetikleyen) return;
      if (patlamaIste(1) === 0) return;                   // butce
      patladi = true;
      try {
        boyut.createExplosion(yer, MAYIN_GUC, {
          breaksBlocks: MAYIN_KIRAR, causesFire: false, allowUnderwater: true
        });
      } catch (e) { hataYaz("mayin.patlat", e); }
      if (gecerliMi(oyuncu)) actionbarYaz(oyuncu, "§c✸ §fMayın patladı");
    }, () => {
      if (!patladi && gecerliMi(oyuncu)) {
        actionbarYaz(oyuncu, "§7Mayın söndü §8· patlamadan");
      }
    });
  }
});
