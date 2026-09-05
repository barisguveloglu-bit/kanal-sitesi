/* GOZCU -- vurus denetimi (menzil + killaura)      v7.30

   Kullanicinin gonderdigi uc APK'nin KENDI ayar listesinden
   cikan tehdit modeline gore yazildi. Denetlenen iki sey:
   reach (uzaktan vurma) ve killaura (bakmadan/cok hizli
   vurma).

   ---- BU DOSYANIN TUTTUGU EN ONEMLI SEY ----
   YANLIS ALARM URETMEMESI. Bu depoda yanlis alarmin bedeli
   kacan hilenin bedelinden buyuk: sistem kendi oyuncusunu
   suclarsa modun kendisine guven kalmaz. O yuzden testin
   yarisi "temiz vurus SUCLANMIYOR" maddeleri.

   Sinananlar:
     1. Normal vurus temiz
     2. Reach yakalaniyor
     3. Bakmadan vurus (killaura) yakalaniyor
     4. Cok hizli vurus yakalaniyor
     5. TEK isaret bildirim uretmiyor (esik var)
     6. Pencere disindaki isaretler dusuyor
     7. Bildirim susturmasi calisiyor
     8. Kendi botlarimiz denetlenmiyor
     9. Oyuncu cikinca defter temizleniyor
    10. Kapaliyken hic abone olunmuyor

   ---- v7.38: IKI YENI APK ----
   BloodyClient (Toolbox'in ucuncu kopyasi, yeni saldiri yok)
   ve WClient v36 (telefonda calisan bir VEKIL -- oyun degil,
   paket katmani). WClient'in ozellik listesinden cikan dort
   olculebilir sey eklendi:

    13. Ayni tickte AYNI KURBANA coklu vurus ("Packets" ayari)
    14. Oyun kipi denetimi (gamemode_switcher)
    15. Kati blok icinde (no_clip / phase / tpmine)
    16. Savastan kacis (auto_disconnect)

   Her birinde yine ayni oncelik: temiz oyuncu suclanmiyor. */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, vurusTetikle, _durum } from "@minecraft/server";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };

sus();
await import("./pack/main.js");
ac();

const ayar = await import("./pack/ayarlar.js");
const gozcu = await import("./pack/yetenekler/gozcu.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

/* Saldiran: konumu, bakisi ve kimligi olan bir oyuncu. */
function saldiran(id, x, y, z, yon = { x: 0, y: 0, z: 1 }) {
  return {
    id, typeId: "minecraft:player", name: id, isValid: true,
    location: { x, y, z },
    getHeadLocation: () => ({ x, y: y + 1.6, z }),
    getViewDirection: () => yon
  };
}
function kurban(id, x, y, z, tip = "minecraft:player") {
  return { id, typeId: tip, name: id, isValid: true, location: { x, y, z } };
}

const sohbetSayisi = () => _durum.sohbet.filter(
  (m) => String(m).indexOf("Gözcü") !== -1).length;
const sonSohbet = () => {
  const l = _durum.sohbet.filter((m) => String(m).indexOf("Gözcü") !== -1);
  return l[l.length - 1] || "";
};

function vur(a, k) { vurusTetikle({ damagingEntity: a, hitEntity: k }); }

console.log("=== 1. NORMAL VURUS TEMIZ (yanlis alarm yok) ===");
{
  gozcu.gozcuUnut();
  _durum.sohbet.length = 0;
  /* Tam karsisinda, 2 blok otede, dogru bakan bir oyuncu.
     Kafa 1.6 yukarida oldugu icin mesafe biraz artiyor.    */
  const a = saldiran("temiz1", 0, 64, 0, { x: 0, y: 0, z: 1 });
  const k = kurban("hedef1", 0, 64, 2);
  for (let i = 0; i < 10; i++) { tickIlerlet(6); vur(a, k); }
  kontrol("normal vurus isaret uretmiyor",
          !gozcu.gozcuDurum(a.id) || gozcu.gozcuDurum(a.id).isaret === 0,
          gozcu.gozcuDurum(a.id) ? gozcu.gozcuDurum(a.id).isaret + " isaret" : "0");
  kontrol("bildirim yok", sohbetSayisi() === 0);
}

console.log("");
console.log("=== 2. REACH YAKALANIYOR ===");
{
  gozcu.gozcuUnut();
  _durum.sohbet.length = 0;
  const a = saldiran("reach1", 0, 64, 0, { x: 0, y: 0, z: 1 });
  const k = kurban("hedef2", 0, 64, 6);       // 6 blok
  for (let i = 0; i < ayar.GOZCU_ESIK; i++) { tickIlerlet(6); vur(a, k); }
  kontrol("uzaktan vurus isaretlendi",
          gozcu.gozcuDurum(a.id) && gozcu.gozcuDurum(a.id).isaret >= ayar.GOZCU_ESIK,
          gozcu.gozcuDurum(a.id) ? gozcu.gozcuDurum(a.id).isaret + " isaret" : "yok");
  kontrol("bildirim yapildi", sohbetSayisi() === 1, sonSohbet());
  kontrol("sebep 'menzil' diyor", sonSohbet().indexOf("menzil") !== -1);
}

console.log("");
console.log("=== 3. BAKMADAN VURUS (killaura) YAKALANIYOR ===");
{
  gozcu.gozcuUnut();
  _durum.sohbet.length = 0;
  /* Hedef onunde ama saldiran TERS yone bakiyor. Mesafe
     normal -- yakalayan tek sey aci.                        */
  const a = saldiran("aura1", 0, 64, 0, { x: 0, y: 0, z: -1 });
  const k = kurban("hedef3", 0, 64, 2);
  for (let i = 0; i < ayar.GOZCU_ESIK; i++) { tickIlerlet(6); vur(a, k); }
  kontrol("bakmadan vurus isaretlendi",
          gozcu.gozcuDurum(a.id) && gozcu.gozcuDurum(a.id).isaret >= ayar.GOZCU_ESIK,
          gozcu.gozcuDurum(a.id) ? gozcu.gozcuDurum(a.id).isaret + " isaret" : "yok");
  kontrol("sebep 'bakmadan' diyor", sonSohbet().indexOf("bakmadan") !== -1,
          sonSohbet());
  /* Mesafe normalken menzil sebebi CIKMAMALI -- olcumler
     birbirine karismasin.                                   */
  kontrol("menzil sebebi karismamis", sonSohbet().indexOf("menzil") === -1);
}

console.log("");
console.log("=== 4. COK HIZLI VURUS YAKALANIYOR ===");
{
  gozcu.gozcuUnut();
  _durum.sohbet.length = 0;
  const a = saldiran("hiz1", 0, 64, 0, { x: 0, y: 0, z: 1 });
  const k = kurban("hedef4", 0, 64, 2);
  /* AYRI TICKLERDE, saniyeden hizli: saniyede GOZCU_HIZ ustu.

     ---- BU KURULUM v7.38'DE DUZELTILDI ----
     Eskiden butun vuruslar AYNI TICK'te yapiliyordu ve madde
     "saniyede N vurus" sebebini bekliyordu. O kurulum artik
     yeni "ayni tickte coklu vurus" olcumunu tetikliyor -- ve
     hakli olarak: bir insan tek tickte 13 kez vuramaz. Yani
     eski kurulum CPS'i degil, paket coklamasini taklit
     ediyordu. Ayri ticklere yayildi; ayni tick olcumunun
     kendi maddesi 11'de.                                     */
  for (let i = 0; i < ayar.GOZCU_HIZ + ayar.GOZCU_ESIK + 2; i++) {
    tickIlerlet(1);
    vur(a, k);
  }
  const d = gozcu.gozcuDurum(a.id);
  kontrol("hizli vurus isaretlendi", d && d.isaret >= ayar.GOZCU_ESIK,
          d ? d.isaret + " isaret" : "yok");
  kontrol("sebep 'saniyede' diyor", sonSohbet().indexOf("saniyede") !== -1,
          sonSohbet());
}

console.log("");
console.log("=== 5. TEK ISARET BILDIRIM URETMIYOR ===");
{
  gozcu.gozcuUnut();
  _durum.sohbet.length = 0;
  const a = saldiran("tek1", 0, 64, 0, { x: 0, y: 0, z: 1 });
  const k = kurban("hedef5", 0, 64, 6);
  tickIlerlet(6); vur(a, k);          // tek supheli vurus
  kontrol("bir isaret var", gozcu.gozcuDurum(a.id).isaret === 1);
  kontrol("ama bildirim YOK", sohbetSayisi() === 0,
          "esik " + ayar.GOZCU_ESIK);
  kontrol("esik 1'den buyuk", ayar.GOZCU_ESIK > 1, String(ayar.GOZCU_ESIK));
}

console.log("");
console.log("=== 6. PENCERE DISINDAKI ISARETLER DUSUYOR ===");
{
  gozcu.gozcuUnut();
  _durum.sohbet.length = 0;
  const a = saldiran("pencere1", 0, 64, 0, { x: 0, y: 0, z: 1 });
  const k = kurban("hedef6", 0, 64, 6);
  vur(a, k); vur(a, k);
  tickIlerlet(ayar.GOZCU_PENCERE + 10);   // pencere gecti
  vur(a, k);
  kontrol("eski isaretler dustu", gozcu.gozcuDurum(a.id).isaret === 1,
          gozcu.gozcuDurum(a.id).isaret + " isaret");
  kontrol("bildirim yok", sohbetSayisi() === 0);
}

console.log("");
console.log("=== 7. BILDIRIM SUSTURMASI ===");
{
  gozcu.gozcuUnut();
  _durum.sohbet.length = 0;
  const a = saldiran("sus1", 0, 64, 0, { x: 0, y: 0, z: 1 });
  const k = kurban("hedef7", 0, 64, 6);
  for (let i = 0; i < ayar.GOZCU_ESIK + 20; i++) { tickIlerlet(2); vur(a, k); }
  kontrol("cok vurusa RAGMEN tek bildirim", sohbetSayisi() === 1,
          sohbetSayisi() + " bildirim");

  /* ---- ILK YAZILISI YANLISTI ----
     Once "bekle, sonra TEK vurus yap, ikinci bildirim gelsin"
     deniyordu ve dusuyordu. Kod dogruydu, BEKLENTI yanlisti:
     susturma suresi kadar beklerken isaretler de pencereden
     dusuyor, geriye tek isaret kaliyor ve esik asilmiyor --
     ki bu istenen davranis. On saniye sessizlikten sonra tek
     supheli vurus kimseyi suclamamali.

     Dogru sinama: SALDIRI SURERKEN susturmanin dolmasi. */
  for (let i = 0; i < 25; i++) { tickIlerlet(12); vur(a, k); }
  kontrol("saldiri surerken susturma dolunca yeniden bildiriyor",
          sohbetSayisi() === 2, sohbetSayisi() + " bildirim");
  kontrol("yine de her vuruşta degil", sohbetSayisi() < 5,
          sohbetSayisi() + " bildirim / 29 supheli vurus");
}

console.log("");
console.log("=== 8. KENDI BOTLARIMIZ DENETLENMIYOR ===");
{
  gozcu.gozcuUnut();
  _durum.sohbet.length = 0;
  const botTipi = [...ayar.KILIT_ATLA_TIPLER][0];
  kontrol("bot tipi listesi bos degil", !!botTipi, String(botTipi));
  if (botTipi) {
    const bot = {
      id: "bot1", typeId: botTipi, name: "bot", isValid: true,
      location: { x: 0, y: 64, z: 0 },
      getHeadLocation: () => ({ x: 0, y: 65.6, z: 0 }),
      getViewDirection: () => ({ x: 0, y: 0, z: -1 })
    };
    const k = kurban("hedef8", 0, 64, 9);
    for (let i = 0; i < ayar.GOZCU_ESIK + 3; i++) { tickIlerlet(4); vur(bot, k); }
    kontrol("bot isaretlenmedi", !gozcu.gozcuDurum("bot1"));
    kontrol("bot icin bildirim yok", sohbetSayisi() === 0);
    /* Botu eleyen sey "yalniz oyuncu" satiri. Kodda ayrica
       KILIT_ATLA_TIPLER denetimi de vardi ve OLU KODDU --
       ustteki satiri gecen her sey zaten oyuncu. Mutasyon
       testi gosterdi, silindi. Bu madde eleyen satirin
       yerinde durdugunu tutuyor.                            */
    const { readFileSync } = await import("node:fs");
    const kod = readFileSync(
      new URL("./pack/yetenekler/gozcu.js", import.meta.url), "utf8");
    kontrol("eleyen satir 'yalniz oyuncu' denetimi",
            /if \(vuran\.typeId !== "minecraft:player"\) return;/.test(kod));
  }
}

console.log("");
console.log("=== 9. TEMIZLIK VE AYAR ===");
{
  gozcu.gozcuUnut();
  const a = saldiran("cik1", 0, 64, 0, { x: 0, y: 0, z: 1 });
  const k = kurban("hedef9", 0, 64, 6);
  vur(a, k);
  kontrol("defterde kayit var", !!gozcu.gozcuDurum(a.id));
  gozcu.gozcuUnut(a.id);
  kontrol("gozcuUnut kaydi siliyor", !gozcu.gozcuDurum(a.id));

  const { readFileSync } = await import("node:fs");
  const ana = readFileSync(new URL("./pack/main.js", import.meta.url), "utf8");
  kontrol("playerLeave gozcuUnut cagiriyor",
          /playerLeave[\s\S]{0,4000}?gozcuUnut\(olay\.playerId\)/.test(ana));
  const kod = readFileSync(
    new URL("./pack/yetenekler/gozcu.js", import.meta.url), "utf8");
  kontrol("GOZCU_ACIK denetleniyor", /if \(!GOZCU_ACIK\) return false/.test(kod));

  /* CEVAP SADECE BILDIRIM olmali. Vurma/atma/oldurme yok --
     yanlis alarmin bedeli geri alinamaz olmasin.            */
  kontrol("gozcu hedefe zarar VERMIYOR",
          !/applyDamage|applyKnockback|applyImpulse|\bkill\b|teleport/.test(kod),
          "cevap yalniz bildirim olmali");
  /* GORUNTU ailesi buraya eklenmemeli: sahte guven uretir. */
  kontrol("xray/ESP denetimi iddia edilmiyor",
          !/xray|esp|tracer|minimap/i.test(kod.replace(/\/\*[\s\S]*?\*\//g, "")));
}

console.log("");
console.log("=== 10. HAREKET DENETIMI ===");
{
  /* Sahte oyuncu: konumu elle tasiyoruz. */
  function kosan(id, x, y, z) {
    return {
      id, typeId: "minecraft:player", name: id, isValid: true,
      location: { x, y, z },
      isGliding: false, isFlying: false, isInWater: false,
      isClimbing: false, isFalling: false,
      getEffect: () => undefined,
      getComponent: () => undefined
    };
  }
  const yok = () => false;          // hicbir oyuncunun isi yok

  /* --- normal kosu: yakalanmamali --- */
  gozcu.gozcuUnut(); gozcu.hareketUnut(); _durum.sohbet.length = 0;
  {
    const o = kosan("kos1", 0, 64, 0);
    for (let i = 0; i < 10; i++) {
      gozcu.hareketTara([o], yok);
      tickIlerlet(ayar.HAREKET_ORNEK);
      o.location.z += 2.8;          // 10 tick'te 2.8 blok = 5.6 blok/sn
    }
    kontrol("normal kosu isaretlenmiyor",
            !gozcu.gozcuDurum(o.id) || gozcu.gozcuDurum(o.id).isaret === 0,
            gozcu.gozcuDurum(o.id) ? gozcu.gozcuDurum(o.id).isaret + " isaret" : "0");
  }

  /* --- hiz hilesi --- */
  gozcu.gozcuUnut(); gozcu.hareketUnut(); _durum.sohbet.length = 0;
  {
    const o = kosan("hizli1", 0, 64, 0);
    for (let i = 0; i < ayar.GOZCU_ESIK + 2; i++) {
      gozcu.hareketTara([o], yok);
      tickIlerlet(ayar.HAREKET_ORNEK);
      /* 10 blok / 0.5 sn = 20 blok/sn: hiz esigini (14) asiyor
         ama siçrama esigini (12 blok/ornek) ASMIYOR -- yani
         yakalanan sey gercekten HIZ, isinlanma degil.       */
      o.location.z += 10;
    }
    kontrol("hiz hilesi yakalandi",
            gozcu.gozcuDurum(o.id) && gozcu.gozcuDurum(o.id).isaret >= ayar.GOZCU_ESIK,
            gozcu.gozcuDurum(o.id) ? gozcu.gozcuDurum(o.id).isaret + " isaret" : "yok");
    kontrol("sebep 'hız' diyor", sonSohbet().indexOf("hız") !== -1, sonSohbet());
  }

  /* --- isinlanma --- */
  gozcu.gozcuUnut(); gozcu.hareketUnut(); _durum.sohbet.length = 0;
  {
    const o = kosan("isin1", 0, 64, 0);
    /* SEBEP de sinaniyor, sadece isaret sayisi degil. Ilk
       yazilista yalniz "1 isaret var mi" bakiliyordu ve
       isinlanma denetimini silmek KACIYORDU: 200 bloklik
       sicrama hiz denetimine de takiliyor, isaret yine
       olusuyordu. Sayi dogru, TESHIS yanlis olurdu.        */
    for (let i = 0; i < ayar.GOZCU_ESIK; i++) {
      gozcu.hareketTara([o], yok);
      tickIlerlet(ayar.HAREKET_ORNEK);
      o.location.z += 200;
    }
    gozcu.hareketTara([o], yok);
    kontrol("isinlanma isaretlendi",
            gozcu.gozcuDurum(o.id) && gozcu.gozcuDurum(o.id).isaret >= ayar.GOZCU_ESIK,
            gozcu.gozcuDurum(o.id) ? gozcu.gozcuDurum(o.id).isaret + " isaret" : "yok");
    kontrol("sebep 'ışınlanma' diyor", sonSohbet().indexOf("ışınlanma") !== -1,
            sonSohbet());
  }

  /* --- ucma: kesintisiz yukselme --- */
  gozcu.gozcuUnut(); gozcu.hareketUnut(); _durum.sohbet.length = 0;
  {
    const o = kosan("ucan1", 0, 64, 0);
    /* Bir isaret icin HAREKET_YUKSELME ornek, bildirim icin
       GOZCU_ESIK isaret gerekiyor -- ikisi carpiliyor. */
    for (let i = 0; i < (ayar.HAREKET_YUKSELME + 1) * ayar.GOZCU_ESIK + 4; i++) {
      gozcu.hareketTara([o], yok);
      tickIlerlet(ayar.HAREKET_ORNEK);
      o.location.y += 1.5;
    }
    kontrol("kesintisiz yukselme isaretlendi",
            gozcu.gozcuDurum(o.id) && gozcu.gozcuDurum(o.id).isaret >= 1,
            gozcu.gozcuDurum(o.id) ? gozcu.gozcuDurum(o.id).isaret + " isaret" : "yok");
    kontrol("sebep 'yükselme' diyor", sonSohbet().indexOf("yükselme") !== -1,
            sonSohbet());
  }

  /* --- tek ziplama yakalanmamali --- */
  gozcu.gozcuUnut(); gozcu.hareketUnut(); _durum.sohbet.length = 0;
  {
    const o = kosan("zipla1", 0, 64, 0);
    /* ART ARDA ZIPLAYAN oyuncu: yukari, asagi, yukari, asagi...
       Yukselme sayaci her inisde SIFIRLANMAZSA bu birikir ve
       ziplayan durust oyuncu "ucuyor" diye suclanir. Ilk
       yazilista tek ziplama deneniyordu ve sayac sifirlamasini
       silmek KACIYORDU -- iki ornek zaten esige yetmiyordu. */
    for (let i = 0; i < (ayar.HAREKET_YUKSELME + 2) * ayar.GOZCU_ESIK; i++) {
      gozcu.hareketTara([o], yok); tickIlerlet(ayar.HAREKET_ORNEK);
      o.location.y += (i % 2 === 0) ? 1.25 : -1.25;
    }
    gozcu.hareketTara([o], yok);
    kontrol("art arda ziplama isaretlenmiyor",
            !gozcu.gozcuDurum(o.id) || gozcu.gozcuDurum(o.id).isaret === 0,
            gozcu.gozcuDurum(o.id) ? gozcu.gozcuDurum(o.id).isaret + " isaret" : "0");
  }
}

console.log("");
console.log("=== 11. KENDI YETENEKLERIMIZ SUCLANMIYOR (asil mesele) ===");
{
  function kosan(id, x, y, z, ek = {}) {
    return Object.assign({
      id, typeId: "minecraft:player", name: id, isValid: true,
      location: { x, y, z },
      isGliding: false, isFlying: false, isInWater: false,
      isClimbing: false, isFalling: false,
      getEffect: () => undefined,
      getComponent: () => undefined
    }, ek);
  }

  /* Isinlanma yetenegi calisirken: oyuncunun AKTIF ISI var. */
  gozcu.gozcuUnut(); gozcu.hareketUnut(); _durum.sohbet.length = 0;
  {
    const o = kosan("kendi1", 0, 64, 0);
    const isVar = () => true;
    for (let i = 0; i < 10; i++) {
      gozcu.hareketTara([o], isVar);
      tickIlerlet(ayar.HAREKET_ORNEK);
      o.location.z += 40;           // isinlanma gibi
      o.location.y += 5;            // ucurma gibi
    }
    kontrol("aktif isi olan oyuncu HIC suclanmiyor",
            !gozcu.gozcuDurum(o.id) || gozcu.gozcuDurum(o.id).isaret === 0,
            gozcu.gozcuDurum(o.id) ? gozcu.gozcuDurum(o.id).isaret + " isaret" : "0");
  }

  /* Ucurma yetenegi levitation veriyor. */
  gozcu.gozcuUnut(); gozcu.hareketUnut(); _durum.sohbet.length = 0;
  {
    const o = kosan("kendi2", 0, 64, 0,
                    { getEffect: (ad) => ad === "levitation" ? { amplifier: 4 } : undefined });
    for (let i = 0; i < 10; i++) {
      gozcu.hareketTara([o], () => false);
      tickIlerlet(ayar.HAREKET_ORNEK);
      o.location.y += 3;
    }
    kontrol("levitation'li oyuncu suclanmiyor",
            !gozcu.gozcuDurum(o.id) || gozcu.gozcuDurum(o.id).isaret === 0);
  }

  /* Elytra ile suzulen. */
  gozcu.gozcuUnut(); gozcu.hareketUnut(); _durum.sohbet.length = 0;
  {
    const o = kosan("kendi3", 0, 64, 0, { isGliding: true });
    for (let i = 0; i < 10; i++) {
      gozcu.hareketTara([o], () => false);
      tickIlerlet(ayar.HAREKET_ORNEK);
      o.location.z += 20;
    }
    kontrol("suzulen oyuncu suclanmiyor",
            !gozcu.gozcuDurum(o.id) || gozcu.gozcuDurum(o.id).isaret === 0);
  }

  /* Muafiyet YETENEK LISTESI olmamali: yeni yetenek eklenince
     kimse listeyi guncellemeyi hatirlamaz.                   */
  const { readFileSync } = await import("node:fs");
  const kod = readFileSync(
    new URL("./pack/yetenekler/gozcu.js", import.meta.url), "utf8");
  /* Yorumlar ayiklaniyor: aciklamada yetenek adlarini SAYMAK
     iyi belgeleme, kotu olan KODDA liste tutmak. will.mjs ve
     anna.mjs'te iki kez yorumdaki satir gercek kod sanilmisti. */
  const kodSade = kod.replace(/\/\*[\s\S]*?\*\//g, "")
                     .replace(/^\s*\/\/.*$/gm, "");
  kontrol("muafiyet KODDA yetenek adi listesi DEGIL",
          !/ucurma|isinlanma|atilim|kasirga|meteor/i.test(kodSade),
          "muafiyet 'aktif isi var mi' olmali");
  kontrol("muafiyet aktif ise bakiyor", /isVarMi/.test(kod));
  const ana = readFileSync(new URL("./pack/main.js", import.meta.url), "utf8");
  kontrol("main.js is sayisini veriyor",
          /hareketTara\([\s\S]{0,120}?oyuncuIsSayisi/.test(ana));
  kontrol("gozcu kendi dongusunu acmiyor", !/runInterval/.test(kod));
  kontrol("playerLeave hareketUnut cagiriyor",
          /playerLeave[\s\S]{0,4000}?hareketUnut\(olay\.playerId\)/.test(ana));
}

console.log("");
console.log("=== 12. GERI ITME (Velocity / anti-knockback) ===");
{
  /* MuCuteClient'ta bulunan ozellik. Olcum "kimildadi mi"
     DEGIL -- kimildamamanin en sik sebebi hile degil (duvar,
     kose, donmus oyuncu). Olcum "HAREKET EDIYOR AMA
     UZAKLASMIYOR".                                          */
  function kurbanO(id, x, y, z, ek = {}) {
    return Object.assign({
      id, typeId: "minecraft:player", name: id, isValid: true,
      location: { x, y, z },
      isGliding: false, isFlying: false, isInWater: false,
      isClimbing: false, isFalling: false,
      getEffect: () => undefined, getComponent: () => undefined
    }, ek);
  }
  const yok = () => false;

  /* --- durust: geri itiliyor --- */
  gozcu.gozcuUnut(); gozcu.hareketUnut(); gozcu.geriItmeUnut();
  _durum.sohbet.length = 0;
  {
    const a = saldiran("kb_v1", 0, 64, 0, { x: 0, y: 0, z: 1 });
    const k = kurbanO("kb_k1", 0, 64, 2);
    for (let i = 0; i < ayar.GOZCU_ESIK + 2; i++) {
      vur(a, k);
      k.location.z += 0.5;            // vurandan UZAKLASIYOR
      tickIlerlet(ayar.GERI_ITME_ORNEK + 1);
      gozcu.hareketTara([k], yok);
    }
    kontrol("geri itilen oyuncu isaretlenmiyor",
            !gozcu.gozcuDurum(k.id) || gozcu.gozcuDurum(k.id).isaret === 0,
            gozcu.gozcuDurum(k.id) ? gozcu.gozcuDurum(k.id).isaret + " isaret" : "0");
  }

  /* --- Velocity: kosuyor ama itilmiyor --- */
  gozcu.gozcuUnut(); gozcu.hareketUnut(); gozcu.geriItmeUnut();
  _durum.sohbet.length = 0;
  {
    const a = saldiran("kb_v2", 0, 64, 0, { x: 0, y: 0, z: 1 });
    const k = kurbanO("kb_k2", 0, 64, 2);
    /* SAGA SOLA gidiyor, uzaklasmiyor. Ilk yazilista hep ayni
       yone (+x) gidiyordu ve yanlisti: kurban surekli +x'e
       kayinca "vurandan uzaklasma" yonu de +x'e donuyor, yani
       oyuncu gercekten uzaklasmis oluyordu. Olcum dogruydu,
       SENARYO yanlisti.                                     */
    for (let i = 0; i < ayar.GOZCU_ESIK + 2; i++) {
      vur(a, k);
      k.location.x += (i % 2 === 0) ? 0.8 : -0.8;
      tickIlerlet(ayar.GERI_ITME_ORNEK + 1);
      gozcu.hareketTara([k], yok);
    }
    kontrol("hareket edip UZAKLASMAYAN isaretlendi",
            gozcu.gozcuDurum(k.id) && gozcu.gozcuDurum(k.id).isaret >= ayar.GOZCU_ESIK,
            gozcu.gozcuDurum(k.id) ? gozcu.gozcuDurum(k.id).isaret + " isaret" : "yok");
    kontrol("sebep 'geri itilmedi' diyor",
            sonSohbet().indexOf("geri itilmedi") !== -1, sonSohbet());
  }

  /* --- DUVARA SIKISMIS: hic kimildamiyor -> MUAF ---
     Bu maddenin dusmesi, savunmanin koseye sikisarak dovusen
     durust oyuncuyu suclamasi demektir.                    */
  gozcu.gozcuUnut(); gozcu.hareketUnut(); gozcu.geriItmeUnut();
  _durum.sohbet.length = 0;
  {
    const a = saldiran("kb_v3", 0, 64, 0, { x: 0, y: 0, z: 1 });
    const k = kurbanO("kb_k3", 0, 64, 2);
    for (let i = 0; i < ayar.GOZCU_ESIK + 6; i++) {
      vur(a, k);                       // konum HIC degismiyor
      tickIlerlet(ayar.GERI_ITME_ORNEK + 1);
      gozcu.hareketTara([k], yok);
    }
    kontrol("DUVARA SIKISMIS oyuncu suclanmiyor",
            !gozcu.gozcuDurum(k.id) || gozcu.gozcuDurum(k.id).isaret === 0,
            gozcu.gozcuDurum(k.id) ? gozcu.gozcuDurum(k.id).isaret + " isaret" : "0");
  }

  /* --- DONMUS oyuncu (Yamultma/Dondur) -> MUAF --- */
  gozcu.gozcuUnut(); gozcu.hareketUnut(); gozcu.geriItmeUnut();
  _durum.sohbet.length = 0;
  {
    const a = saldiran("kb_v4", 0, 64, 0, { x: 0, y: 0, z: 1 });
    const k = kurbanO("kb_k4", 0, 64, 2,
      { getEffect: (ad) => ad === "slowness" ? { amplifier: 5 } : undefined });
    for (let i = 0; i < ayar.GOZCU_ESIK + 6; i++) {
      vur(a, k);
      k.location.x += (i % 2 === 0) ? 0.8 : -0.8;   // hareket var
      tickIlerlet(ayar.GERI_ITME_ORNEK + 1);
      gozcu.hareketTara([k], yok);
    }
    kontrol("kendi yeteneklerimizle donmus oyuncu suclanmiyor",
            !gozcu.gozcuDurum(k.id) || gozcu.gozcuDurum(k.id).isaret === 0,
            gozcu.gozcuDurum(k.id) ? gozcu.gozcuDurum(k.id).isaret + " isaret" : "0");
  }

  /* --- SUDA/SUZULEN kurban -> MUAF ---
     Suda ya da suzulurken geri itme bambaska davraniyor.
     Bu madde dusesse savunma suda dovusen oyuncuyu suclardi. */
  gozcu.gozcuUnut(); gozcu.hareketUnut(); gozcu.geriItmeUnut();
  _durum.sohbet.length = 0;
  {
    const a = saldiran("kb_v7", 0, 64, 0, { x: 0, y: 0, z: 1 });
    const k = kurbanO("kb_k8", 0, 64, 2, { isInWater: true });
    for (let i = 0; i < ayar.GOZCU_ESIK + 6; i++) {
      vur(a, k);
      k.location.x += (i % 2 === 0) ? 0.8 : -0.8;
      tickIlerlet(ayar.GERI_ITME_ORNEK + 1);
      gozcu.hareketTara([k], yok);
    }
    kontrol("SUDAKI oyuncu suclanmiyor",
            !gozcu.gozcuDurum(k.id) || gozcu.gozcuDurum(k.id).isaret === 0,
            gozcu.gozcuDurum(k.id) ? gozcu.gozcuDurum(k.id).isaret + " isaret" : "0");
  }

  /* --- olgunlasmadan degerlendirilmiyor --- */
  gozcu.gozcuUnut(); gozcu.hareketUnut(); gozcu.geriItmeUnut();
  {
    const a = saldiran("kb_v5", 0, 64, 0, { x: 0, y: 0, z: 1 });
    const k = kurbanO("kb_k5", 0, 64, 2);
    vur(a, k);
    kontrol("vurus bekleyen listeye girdi",
            gozcu.geriItmeBekleyenSayisi() === 1,
            gozcu.geriItmeBekleyenSayisi() + " kayit");
    gozcu.hareketTara([k], yok);       // daha olgunlasmadi
    kontrol("olgunlasmadan degerlendirilmiyor",
            gozcu.geriItmeBekleyenSayisi() === 1);
    tickIlerlet(ayar.GERI_ITME_ORNEK + 1);
    gozcu.hareketTara([k], yok);
    kontrol("olgunlasinca listeden dusuyor",
            gozcu.geriItmeBekleyenSayisi() === 0);
  }

  /* --- tavan ve temizlik --- */
  gozcu.gozcuUnut(); gozcu.hareketUnut(); gozcu.geriItmeUnut();
  {
    const a = saldiran("kb_v6", 0, 64, 0, { x: 0, y: 0, z: 1 });
    const k = kurbanO("kb_k6", 0, 64, 2);
    for (let i = 0; i < ayar.GERI_ITME_TAVAN + 25; i++) vur(a, k);
    kontrol("bekleyen liste tavani asmiyor",
            gozcu.geriItmeBekleyenSayisi() <= ayar.GERI_ITME_TAVAN,
            gozcu.geriItmeBekleyenSayisi() + " / " + ayar.GERI_ITME_TAVAN);
    /* Kimlikle temizlik: SADECE o oyuncunun kayitlari.     */
    const k2 = kurbanO("kb_k7", 5, 64, 2);
    vur(a, k2);
    const once = gozcu.geriItmeBekleyenSayisi();
    gozcu.geriItmeUnut("kb_k7");
    kontrol("kimlikle temizlik sadece o oyuncuyu siliyor",
            gozcu.geriItmeBekleyenSayisi() === once - 1,
            once + " -> " + gozcu.geriItmeBekleyenSayisi());
  }

  const { readFileSync } = await import("node:fs");
  const ana = readFileSync(new URL("./pack/main.js", import.meta.url), "utf8");
  kontrol("playerLeave geriItmeUnut'u KIMLIKLE cagiriyor",
          /playerLeave[\s\S]{0,4500}?geriItmeUnut\(olay\.playerId\)/.test(ana));
  const kod = readFileSync(
    new URL("./pack/yetenekler/gozcu.js", import.meta.url), "utf8");
  kontrol("geri itme kendi dongusunu acmiyor", !/runInterval|runTimeout/.test(kod));
  /* Kapi KAYIT tarafinda: kapaliyken bekleyen listeye hicbir
     sey girmiyor. Degerlendirme tarafina ikinci bir kapi
     koymak OLU KOD olurdu -- bu dosyada bir kez yasandi. */
  kontrol("GERI_ITME_ACIK kayit tarafinda denetleniyor",
          /function geriItmeKaydet[\s\S]{0,200}?if \(!GERI_ITME_ACIK\) return;/.test(kod));
}

console.log("");
console.log("=== 13. AYNI TICKTE COKLU VURUS (Packets) ===");
{
  gozcu.gozcuUnut();
  _durum.sohbet.length = 0;
  /* WClient'in butun dovus modullerinde "packetsPerAttack"
     var: tek salliste birden fazla saldiri paketi. */
  const a = saldiran("pk1", 0, 64, 0, { x: 0, y: 0, z: 1 });
  const k = kurban("hedefpk", 0, 64, 2);
  tickIlerlet(5);
  for (let i = 0; i < ayar.GOZCU_ESIK + 1; i++) vur(a, k);   // hepsi AYNI tick
  kontrol("ayni tick coklu vurus isaretlendi",
          gozcu.gozcuDurum(a.id) && gozcu.gozcuDurum(a.id).isaret >= ayar.GOZCU_ESIK,
          gozcu.gozcuDurum(a.id) ? gozcu.gozcuDurum(a.id).isaret + " isaret" : "yok");
  kontrol("sebep 'aynı tickte' diyor",
          sonSohbet().indexOf("aynı tickte") !== -1, sonSohbet());

  /* TEK vurus tetiklememeli -- yoksa her normal vurus isaret olurdu. */
  gozcu.gozcuUnut();
  _durum.sohbet.length = 0;
  const b = saldiran("pk2", 0, 64, 0, { x: 0, y: 0, z: 1 });
  for (let i = 0; i < 6; i++) { tickIlerlet(6); vur(b, k); }
  kontrol("tick basina TEK vurus temiz",
          !gozcu.gozcuDurum(b.id) || gozcu.gozcuDurum(b.id).isaret === 0,
          gozcu.gozcuDurum(b.id) ? gozcu.gozcuDurum(b.id).isaret + " isaret" : "0");

  /* KURBAN AYRIMI: ayni tickte FARKLI hedeflere vurmak bizim
     kendi alan yeteneklerimizin yaptigi sey (Kasirga, Meteor,
     alan simsegi). Suclanmamali.                            */
  gozcu.gozcuUnut();
  _durum.sohbet.length = 0;
  const c = saldiran("pk3", 0, 64, 0, { x: 0, y: 0, z: 1 });
  tickIlerlet(5);
  for (let i = 0; i < ayar.GOZCU_ESIK + 1; i++) vur(c, kurban("ayri" + i, 0, 64, 2));
  kontrol("ayni tickte FARKLI kurbanlar temiz",
          sonSohbet().indexOf("aynı tickte") === -1,
          sonSohbet() || "bildirim yok");
}

console.log("");
console.log("=== 14. OYUN KIPI DENETIMI (gamemode_switcher) ===");
{
  const arinma = await import("./pack/yetenekler/arinma.js");
  const kipli = (id, kip) => ({
    id, typeId: "minecraft:player", name: id, isValid: true,
    _kip: kip, _yazilan: [],
    getGameMode() { return this._kip; },
    setGameMode(y) { this._kip = y; this._yazilan.push(y); }
  });

  gozcu.kipUnut();
  _durum.sohbet.length = 0;
  arinma.arinmaUnut();                       // Savunma Kipi KAPALI

  const temiz = kipli("kip_temiz", "survival");
  kontrol("survival temiz", gozcu.kipDenetle(temiz) === null);
  kontrol("adventure de temiz",
          gozcu.kipDenetle(kipli("kip_adv", "adventure")) === null);

  const hileci = kipli("kip_hileci", "creative");
  const sonuc = gozcu.kipDenetle(hileci);
  kontrol("creative yakalandi", sonuc !== null && sonuc.kip === "creative",
          JSON.stringify(sonuc));
  kontrol("Savunma Kipi KAPALIYKEN geri alinmiyor",
          sonuc && sonuc.geriAlindi === false && hileci._kip === "creative",
          hileci._kip);
  kontrol("bildirim sebebi yaziyor",
          sonSohbet().indexOf("oyun kipi") !== -1, sonSohbet());

  /* Susturma: ust uste cagri ikinci bildirimi uretmemeli. */
  const ikinci = gozcu.kipDenetle(hileci);
  kontrol("susturma calisiyor (ikinci bildirim yok)", ikinci === null);

  /* Savunma Kipi ACIKKEN geri aliniyor. */
  gozcu.kipUnut();
  _durum.sohbet.length = 0;
  tickIlerlet(ayar.KIP_SUS + 5);
  arinma.savunmaAc({
    id: "savunan", typeId: "minecraft:player", name: "savunan", isValid: true,
    runCommand: () => ({ successCount: 1 }),
    onScreenDisplay: { setActionBar() {} }
  });
  const hileci2 = kipli("kip_hileci2", "creative");
  const sonuc2 = gozcu.kipDenetle(hileci2);
  kontrol("Savunma Kipi ACIKKEN geri alindi",
          sonuc2 && sonuc2.geriAlindi === true && hileci2._kip === ayar.KIP_IZIN[0],
          hileci2._kip);

  /* OKUNAMAYAN kip suclanmiyor -- eski API surumu. */
  gozcu.kipUnut();
  kontrol("kipi okunamayan oyuncu suclanmiyor",
          gozcu.kipDenetle({ id: "kip_yok", typeId: "minecraft:player",
                             name: "kip_yok", isValid: true }) === null);
  arinma.arinmaUnut();
}

console.log("");
console.log("=== 15. KATI BLOK ICINDE (no_clip / phase / tpmine) ===");
{
  const D = dunyaKur();
  const blokta = (y) => ({
    id: "kb", typeId: "minecraft:player", name: "kb", isValid: true,
    dimension: D.boyut, location: { x: 0.5, y, z: 0.5 }
  });
  /* Sahte dunyada y < 64 tas, ustu hava. */
  kontrol("tas icindeki oyuncu KATI", gozcu.katidaMi(blokta(30)) === true);
  kontrol("acik havadaki oyuncu KATI DEGIL", gozcu.katidaMi(blokta(70)) === false);
  /* Ayak tasta, bas havada (yerde duran normal oyuncu). */
  kontrol("zeminde duran oyuncu KATI DEGIL", gozcu.katidaMi(blokta(63)) === false);
  /* Dunyanin disi: olculemedi -- kati DEMIYOR. */
  kontrol("olculemeyen konum undefined donuyor",
          gozcu.katidaMi(blokta(-9999)) === undefined);
  /* Boyutu olmayan varlik da olculemez. */
  kontrol("boyutsuz varlik undefined donuyor",
          gozcu.katidaMi({ id: "x", location: { x: 0, y: 0, z: 0 } }) === undefined);

  /* ---- SAVUNMA KIPI KAPISI KODDA DURUYOR MU ----
     Bu denetim blok OKUYOR ve depo kurali "bosta duran mod
     blok okumaz". Kosulsuz yazildiginda efsane_muzik.mjs
     "hic blok okunmuyor :: 4 okuma" ile dustu.

     Madde kodun SEKLINE bakiyor cunku olculecek sey bir
     davranis degil bir KAPI: biri kosulu kaldirirsa gozcu
     testleri yine gecerdi, dusen BASKA bir dosya olurdu ve
     sebebi orada hic yazmiyor.                             */
  const { readFileSync: oku15 } = await import("node:fs");
  const kod15 = oku15(new URL("./pack/yetenekler/gozcu.js", import.meta.url), "utf8");
  kontrol("kati denetimi Savunma Kipine bagli",
          /if \(KATI_ACIK && savunmaVarMi\(\)/.test(kod15));
  kontrol("kati denetimi kimildamayan oyuncuda blok okumuyor",
          /toplam > 0\.05 \|\| \(iz\.kati \|\| 0\) > 0/.test(kod15));
}

console.log("");
console.log("=== 16. SAVASTAN KACIS (auto_disconnect) ===");
{
  gozcu.kacisUnut();
  _durum.sohbet.length = 0;
  const canli = (id, can) => ({
    id, typeId: "minecraft:player", name: id, isValid: true,
    getComponent: (ad) => ad === "minecraft:health" ? { currentValue: can } : undefined
  });

  /* 1. Vurulup HEMEN cikan. */
  const kacan = canli("kacan", 6);
  gozcu.kacisHasar(kacan, 1000);
  const sebep = gozcu.kacisAyrilma("kacan", "kacan", 1000 + 40);
  kontrol("hasardan hemen sonra cikis yakalandi", sebep !== null, String(sebep));
  kontrol("bildirimde kalan can var",
          sonSohbet().indexOf("kalan can") !== -1, sonSohbet());
  kontrol("bildirim 'hile' demiyor (olcu soyluyor)",
          sonSohbet().toLowerCase().indexOf("hile") === -1, sonSohbet());

  /* 2. Cok sonra cikan: normal ayrilma, suclanmiyor. */
  gozcu.kacisUnut();
  _durum.sohbet.length = 0;
  gozcu.kacisHasar(canli("gec", 20), 2000);
  kontrol("pencere disinda cikan suclanmiyor",
          gozcu.kacisAyrilma("gec", "gec", 2000 + ayar.KACIS_PENCERE + 1) === null);
  kontrol("bildirim yok", sohbetSayisi() === 0);

  /* 3. Hic vurulmadan cikan. */
  gozcu.kacisUnut();
  kontrol("hic vurulmayan suclanmiyor",
          gozcu.kacisAyrilma("hic", "hic", 3000) === null);

  /* 4. Kayit ciktiktan sonra DUSUYOR: ayni kimlik geri
        gelirse eski hasar hukum vermemeli. */
  gozcu.kacisUnut();
  gozcu.kacisHasar(canli("tekrar", 4), 4000);
  gozcu.kacisAyrilma("tekrar", "tekrar", 4010);
  kontrol("hukumden sonra kayit dusuyor",
          gozcu.kacisDurum("tekrar") === undefined);

  /* 5. Oyuncu olmayan varlik kaydedilmiyor -- botlarimiz
        savastan kacmaz.                                    */
  gozcu.kacisUnut();
  kontrol("bot kaydedilmiyor",
          gozcu.kacisHasar({ id: "bot1", typeId: "pa:bot", isValid: true }, 5000) === null);

  /* 6. main.js sirasi: once hukum, sonra unutma. Ters olsaydi
        olcum hic yapilamazdi.                              */
  const { readFileSync } = await import("node:fs");
  const ana = readFileSync(new URL("./pack/main.js", import.meta.url), "utf8");
  kontrol("main.js kacisAyrilma'yi kacisUnut'tan ONCE cagiriyor",
          /kacisAyrilma\([\s\S]{0,200}?kacisUnut\(/.test(ana));
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> gozcu yerinde");
process.exit(hata ? 1 : 0);
