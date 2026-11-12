/* GOZCU -- ALEXA SPECIAL V4'TEN GELEN UC OLCUM          v7.99.5

   Alexa Special V4 Toolbox ailesinin altinci kopyasi cikti
   (REFERANS_ALEXA_APK.md): yeni ozellik yok, ama ailenin
   "olculebilir ama yazilmadi" diye v7.38'den beri bekleyen
   bes maddesinden dordu burada kapandi:

     jesus          -> su ustunde durma
     slow_falling   -> yavas dusus
     far_bypass  \\
     pick_distance  -> blok menzili (koyma / kirma)

   ---- BU DOSYANIN TUTTUGU SEY ----
   Her olcum icin ONCE "temiz oyuncu suclanmiyor", sonra
   "hile yakalaniyor". Mesru durumlarin her biri ayri madde:
   orumcek agi, tekne, iskele kenari, nilufer, efekt, kendi
   isimiz, yaratici kip.
   Bosta duran mod blok okumuyor: yavas dusus blogu yalniz
   supheli seriden sonra, su ustu yalniz Savunma Kipi acikken
   okuyor -- ikisi de SAYILARAK tutuluyor.                    */
import { dunyaKur } from "./dunya.mjs";
import { tickIlerlet, blokKirTetikle, _durum } from "@minecraft/server";
import { readFileSync } from "node:fs";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };
sus();
await import("./pack/main.js");
ac();
const ayar = await import("./pack/ayarlar.js");
const gozcu = await import("./pack/yetenekler/gozcu.js");
const arinma = await import("./pack/yetenekler/arinma.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const yok = () => false;
const isaret = (id) => { const d = gozcu.gozcuDurum(id); return d ? d.isaret : 0; };
const sifirla = () => { gozcu.gozcuUnut(); gozcu.hareketUnut(); _durum.sohbet.length = 0; };

function oyuncu(D, id, x, y, z, ek = {}) {
  return Object.assign({
    id, typeId: "minecraft:player", name: id, isValid: true,
    dimension: D.boyut, location: { x, y, z },
    isGliding: false, isFlying: false, isInWater: false,
    isClimbing: false, isFalling: false, isOnGround: false,
    getEffect: () => undefined,
    getComponent: () => undefined,
    getGameMode: () => "survival"
  }, ek);
}
/* n ornek boyunca her ornekte `adim` fonksiyonuyla oyuncuyu tasi. */
function yuru(o, n, adim, isVarMi = yok) {
  for (let i = 0; i < n; i++) {
    gozcu.hareketTara([o], isVarMi);
    tickIlerlet(ayar.HAREKET_ORNEK);
    adim(o, i);
  }
  gozcu.hareketTara([o], isVarMi);
}

console.log("=== 1. YAVAS DUSUS (slow_falling) ===");
{
  const D = dunyaKur();   // y < 64 tas, ustu hava
  /* Supheli seri: havada, ornek basina 0,5 blok. */
  const seri = ayar.YAVAS_DUSUS_ORNEK * (ayar.GOZCU_ESIK + 1);
  /* Gercek oyunda dusen oyuncuda isFalling acik ve hareketMuaf
     onu "dusuyor" diye muaf tutuyor. Yani bu bolumdeki her
     yakalama, olcumun muafiyetten ONCE calistigini da sinar. */
  const dusen = (id, x, y, z, ek = {}) => oyuncu(D, id, x, y, z, Object.assign({ isFalling: true }, ek));

  sifirla();
  const temiz = dusen("yd_temiz", 0.5, 200, 0.5);
  let v = 0;
  yuru(temiz, 6, (o) => {            // vanilla serbest dusus
    let inis = 0;
    for (let t = 0; t < ayar.HAREKET_ORNEK; t++) { v = (v - 0.08) * 0.98; inis += v; }
    o.location.y += inis;
  });
  kontrol("vanilla serbest dusus suclanmiyor", isaret("yd_temiz") === 0);

  sifirla();
  const yerde = oyuncu(D, "yd_yerde", 0.5, 150, 0.5, { isOnGround: true });
  yuru(yerde, seri, (o) => { o.location.y -= 0.5; });   // merdiven inmek gibi
  kontrol("yerde (isOnGround) inen suclanmiyor", isaret("yd_yerde") === 0);

  sifirla();
  const once = D.sayac.getBlock;
  const hile = dusen("yd_hile", 0.5, 200, 0.5);
  yuru(hile, seri, (o) => { o.location.y -= 0.5; });
  kontrol("yavas dusus hilesi YAKALANDI", isaret("yd_hile") >= ayar.GOZCU_ESIK,
          isaret("yd_hile") + " isaret");
  kontrol("  sebep 'yavaş düşüş' diyor",
          _durum.sohbet.some((m) => String(m).indexOf("yavaş düşüş") !== -1));
  const okuma = D.sayac.getBlock - once;
  const beklenen = Math.floor(seri / ayar.YAVAS_DUSUS_ORNEK) * 7;
  kontrol("  blok okumasi yalniz seri sonunda (" + beklenen + ")", okuma === beklenen,
          okuma + " okuma");

  sifirla();
  const ag = dusen("yd_ag", 0.5, 120.5, 0.5);
  for (let y = 100; y <= 121; y++) D.boyut.getBlock({ x: 0, y, z: 0 }).setType("minecraft:web");
  yuru(ag, seri, (o) => { o.location.y -= 0.5; });
  kontrol("orumcek aginda yavas inen suclanmiyor", isaret("yd_ag") === 0);

  sifirla();
  const bal = dusen("yd_bal", 5.5, 120.5, 0.5);
  for (let y = 100; y <= 121; y++) D.boyut.getBlock({ x: 6, y, z: 0 }).setType("minecraft:honey_block");
  yuru(bal, seri, (o) => { o.location.y -= 0.5; });
  kontrol("bal bloktan kayan suclanmiyor (komsu okunuyor)", isaret("yd_bal") === 0);

  sifirla();
  const efekt = dusen("yd_efekt", 0.5, 250, 0.5,
                       { getEffect: (a) => (a === "slow_falling" ? { amplifier: 0 } : undefined) });
  yuru(efekt, seri, (o) => { o.location.y -= 0.5; });
  kontrol("yavas dusme iksiri icen suclanmiyor", isaret("yd_efekt") === 0);

  sifirla();
  const direnc = dusen("yd_direnc", 0.5, 250, 0.5,
                        { getEffect: (a) => (a === "resistance" ? { amplifier: 0 } : undefined) });
  yuru(direnc, seri, (o) => { o.location.y -= 0.5; });
  kontrol("direnc iksiri hileciyi AKLAMIYOR", isaret("yd_direnc") >= ayar.GOZCU_ESIK,
          isaret("yd_direnc") + " isaret");

  sifirla();
  const kendi = dusen("yd_kendi", 0.5, 250, 0.5);
  yuru(kendi, seri, (o) => { o.location.y -= 0.5; }, () => true);
  kontrol("kendi isimiz (ucurma vb.) suclanmiyor", isaret("yd_kendi") === 0);

  sifirla();
  const suzul = dusen("yd_suzul", 0.5, 250, 0.5, { isGliding: true });
  yuru(suzul, seri, (o) => { o.location.y -= 0.5; });
  kontrol("elytra ile suzulen suclanmiyor", isaret("yd_suzul") === 0);
}

console.log("\n=== 2. SU USTUNDE DURMA (jesus) ===");
{
  const savunan = {
    id: "savunan_a", typeId: "minecraft:player", name: "savunan_a", isValid: true,
    runCommand: () => ({ successCount: 1 }), onScreenDisplay: { setActionBar() {} }
  };
  const seri = ayar.SU_USTU_ORNEK * (ayar.GOZCU_ESIK + 1);
  /* 40x40 bir gol: y=63 su, ustu hava. */
  function gol() {
    const D = dunyaKur();
    for (let x = -20; x <= 60; x++) for (let z = -20; z <= 20; z++) {
      D.boyut.getBlock({ x, y: 63, z }).setType("minecraft:water");
    }
    return D;
  }
  const kos = (o) => { o.location.x += 1.0; };

  /* Savunma Kipi KAPALI: okuma yok, suclama yok (bedeli yazili). */
  {
    const D = gol();
    sifirla();
    const once = D.sayac.getBlock;
    const o = oyuncu(D, "su_kapali", 0.5, 64.0, 0.5, { isOnGround: true });
    yuru(o, seri, kos);
    kontrol("Savunma Kipi kapaliyken olculmuyor", isaret("su_kapali") === 0);
    kontrol("  ve hic blok okumuyor", D.sayac.getBlock - once === 0,
            (D.sayac.getBlock - once) + " okuma");
  }

  arinma.savunmaAc(savunan);
  {
    const D = gol();
    sifirla();
    const o = oyuncu(D, "su_hile", 0.5, 64.0, 0.5, { isOnGround: true });
    yuru(o, seri, kos);
    kontrol("su ustunde yuruyen YAKALANDI", isaret("su_hile") >= ayar.GOZCU_ESIK,
            isaret("su_hile") + " isaret");
    kontrol("  sebep 'su üstünde' diyor",
            _durum.sohbet.some((m) => String(m).indexOf("su üstünde") !== -1));
  }
  {
    const D = gol();
    sifirla();
    const o = oyuncu(D, "su_lav", 0.5, 64.0, 0.5, { isOnGround: true });
    for (let x = -20; x <= 60; x++) for (let z = -20; z <= 20; z++) {
      D.boyut.getBlock({ x, y: 63, z }).setType("minecraft:lava");
    }
    yuru(o, seri, kos);
    kontrol("lav ustunde yuruyen de YAKALANDI", isaret("su_lav") >= ayar.GOZCU_ESIK);
  }
  {
    const D = gol();
    sifirla();
    const o = oyuncu(D, "su_yuzen", 0.5, 63.4, 0.5, { isInWater: true });
    yuru(o, seri, kos);
    kontrol("yuzeyde yuzen suclanmiyor", isaret("su_yuzen") === 0);
    const o2 = oyuncu(D, "su_yuzen2", 0.5, 63.4, 3.5);       // isInWater okunmasa bile
    yuru(o2, seri, kos);
    kontrol("  isInWater olmasa da ayak suda: suclanmiyor", isaret("su_yuzen2") === 0);
  }
  {
    const D = gol();
    sifirla();
    const o = oyuncu(D, "su_tekne", 0.5, 64.0, 0.5, { isOnGround: true });
    const tekne = { id: "t", typeId: "minecraft:boat", isValid: true, location: o.location };
    D.boyut._varliklar = [tekne];
    yuru(o, seri, kos);
    D.boyut._varliklar = [];
    kontrol("tekne ustunde duran suclanmiyor", isaret("su_tekne") === 0);
  }
  {
    const D = gol();
    sifirla();
    /* Iskele: z=1 hattinda tas. Oyuncu merkezi z=0,75'te (su
       ustu), govdesinin kenari z=1,05'te -- tasin ustunde. */
    for (let x = -20; x <= 60; x++) D.boyut.getBlock({ x, y: 63, z: 1 }).setType("minecraft:stone");
    const o = oyuncu(D, "su_iskele", 0.5, 64.0, 0.75, { isOnGround: true });
    yuru(o, seri, kos);
    kontrol("iskele kenarinda sarkan suclanmiyor", isaret("su_iskele") === 0);
  }
  {
    const D = gol();
    sifirla();
    for (let x = -20; x <= 60; x++) D.boyut.getBlock({ x, y: 64, z: 0 }).setType("minecraft:waterlily");
    const o = oyuncu(D, "su_nilufer", 0.5, 64.09, 0.5, { isOnGround: true });
    yuru(o, seri, kos);
    kontrol("nilufer ustunde yuruyen suclanmiyor", isaret("su_nilufer") === 0);
  }
  {
    const D = gol();
    sifirla();
    const o = oyuncu(D, "su_ziplayan", 0.5, 64.0, 0.5);
    yuru(o, seri, (p, i) => { p.location.x += 1; p.location.y = 64 + (i % 2) * 1.2; });
    kontrol("suyun ustunden ziplayarak gecen suclanmiyor", isaret("su_ziplayan") === 0);
  }
  {
    const D = gol();
    sifirla();
    const o = oyuncu(D, "su_lev", 0.5, 64.0, 0.5,
                     { getEffect: (a) => (a === "levitation" ? { amplifier: 0 } : undefined) });
    yuru(o, seri, kos);
    kontrol("levitasyon efektiyle suyun ustunde duran suclanmiyor", isaret("su_lev") === 0);
  }
  {
    const D = gol();
    sifirla();
    const o = oyuncu(D, "su_kendi", 0.5, 64.0, 0.5, { isOnGround: true });
    yuru(o, seri, kos, () => true);
    kontrol("kendi isimiz suclanmiyor", isaret("su_kendi") === 0);
  }
  arinma.arinmaUnut();
}

console.log("\n=== 3. BLOK MENZILI (far_bypass / pick_distance) ===");
{
  const D = dunyaKur();
  const kisi = (id, ek = {}) => oyuncu(D, id, 0.5, 64, 0.5, Object.assign({
    getHeadLocation: () => ({ x: 0.5, y: 65.62, z: 0.5 })
  }, ek));
  const blok = (x, y, z) => ({ location: { x, y, z } });

  sifirla();
  const o = kisi("bm1");
  kontrol("5 blok uzaga koyma temiz", gozcu.blokMenzilOlc(o, blok(5, 64, 0), yok) === null);
  kontrol("kenari 7 blokta olan bloga koyma temiz (en yakin nokta)",
          gozcu.blokMenzilOlc(o, blok(7, 65, 0), yok) === null);
  const s = gozcu.blokMenzilOlc(o, blok(12, 64, 0), yok);
  kontrol("12 blok uzaga koyma ISARETLENDI", typeof s === "string" && s.indexOf("blok menzili") === 0, s);
  kontrol("  tek uzak koyma bildirim uretmiyor",
          !_durum.sohbet.some((m) => String(m).indexOf("blok menzili") !== -1));
  for (let i = 0; i < ayar.GOZCU_ESIK; i++) gozcu.blokMenzilOlc(o, blok(12 + i, 64, 0), yok);
  kontrol("  esik dolunca bildirildi",
          _durum.sohbet.some((m) => String(m).indexOf("blok menzili") !== -1));

  sifirla();
  kontrol("yaratici kip denetlenmiyor",
          gozcu.blokMenzilOlc(kisi("bm2", { getGameMode: () => "creative" }), blok(12, 64, 0), yok) === null);
  kontrol("kendi isimiz denetlenmiyor",
          gozcu.blokMenzilOlc(kisi("bm3"), blok(12, 64, 0), () => true) === null);
  kontrol("oyuncu olmayan denetlenmiyor",
          gozcu.blokMenzilOlc(kisi("bm4", { typeId: "pa:bot" }), blok(12, 64, 0), yok) === null);
  kontrol("blok konumu okunamazsa suclama yok",
          gozcu.blokMenzilOlc(kisi("bm5"), undefined, yok) === null);

  /* Olay baglantisi: gercek abonelik ayni fonksiyonu cagiriyor. */
  sifirla();
  const o6 = kisi("bm6");
  sus();
  for (let i = 0; i < ayar.GOZCU_ESIK; i++) blokKirTetikle(o6, { x: 15, y: 64, z: 0 });
  ac();
  kontrol("playerBreakBlock olayi olcumu calistiriyor", isaret("bm6") >= ayar.GOZCU_ESIK,
          isaret("bm6") + " isaret");
  const kod = readFileSync(new URL("./pack/yetenekler/gozcu.js", import.meta.url), "utf8");
  const iki = (kod.match(/blokMenzilOlc\(olay\.player, olay\.block, isVarMi\)/g) || []).length;
  kontrol("  kirma ve koyma olayinin ikisi de olcumu cagiriyor", iki === 2, iki + " cagri");
}

console.log("");
/* ================================================================
   HAVADA ASILI -- fly / hover                             v7.99.19
   Gercek motorda hile taklidiyle bulundu: sabit yukseklikte ucan
   oyuncu hicbir olcume takilmiyordu. Ustelik motor havadaki sahte
   oyuncuyu isOnGround=true gosterdi; hileli istemci de oyle der.
   Once DURUST oyuncu, sonra hile. Sahte dunyada y < 64 tas.
   ================================================================ */
console.log("");
console.log("=== 5. HAVADA ASILI (fly / hover) ===");
{
  const savunan5 = {
    id: "savunan5", typeId: "minecraft:player", name: "savunan5", isValid: true,
    runCommand: () => ({ successCount: 1 }), onScreenDisplay: { setActionBar() {} }
  };
  const seri = ayar.HAVADA_ORNEK * 2 + 1;          // iki teyit
  const ileri = (o) => { o.location = { x: o.location.x, y: o.location.y, z: o.location.z + 0.5 }; };
  const bildirim = () => _durum.sohbet.filter((m) => String(m).includes("havada asılı")).length;

  /* Savunma Kipi KAPALIYKEN hic olculmuyor ve blok okumuyor. */
  arinma.arinmaUnut();
  {
    const D = dunyaKur();
    sifirla();
    const once = D.sayac.getBlock;
    const o = oyuncu(D, "hv_kapali", 0.5, 70, 0.5, { isOnGround: true });
    yuru(o, seri, ileri);
    kontrol("Savunma Kipi kapaliyken havada asili olculmuyor", isaret("hv_kapali") === 0);
    kontrol("  ve hic blok okumuyor", D.sayac.getBlock - once === 0, (D.sayac.getBlock - once) + " okuma");
  }

  arinma.savunmaAc(savunan5);
  const durust = (ad, kur, adim = ileri, ek = {}, isVarMi = yok) => {
    const D = dunyaKur();
    sifirla();
    const o = oyuncu(D, ad, 0.5, 70, 0.5, ek);
    if (kur) kur(D, o);
    yuru(o, seri * 2, adim, isVarMi);
    kontrol(ad + " suclanmiyor", isaret(ad) === 0 && bildirim() === 0,
            isaret(ad) + " isaret · " + bildirim() + " bildirim");
  };
  /* Zeminde yuruyen: ayak alti tas. */
  durust("hv_yerde", (D, o) => { o.location.y = 64; });
  /* Art arda ziplayan: dikeyde surekli kimildiyor. */
  durust("hv_ziplayan", (D, o) => { o.location.y = 64; },
         (o, i) => { o.location = { x: o.location.x, y: (i % 2 ? 64 : 65.2), z: o.location.z + 0.5 }; });
  /* Kenarda yuruyen: merkez havada, bir kosesi tasin ustunde. */
  durust("hv_kenar", (D, o) => {
    for (let z = -2; z < 40; z++) D.bloklar.set("0,69," + z, "minecraft:stone");
    o.location.x = 1.2;
  });
  /* Citin ustunde yuruyen: cit 1,5 blok, oyuncu y 70.5'te, 70 hava. */
  durust("hv_cit", (D, o) => {
    for (let z = -2; z < 40; z++) D.bloklar.set("0,69," + z, "minecraft:oak_fence");
    o.location.y = 70.5;
  });
  /* Agin icinde yavas: govdenin icinde blok var. */
  durust("hv_ag", (D, o) => {
    for (let z = -2; z < 40; z++) D.bloklar.set("0,70," + z, "minecraft:web");
  });
  /* Baglantisi donan: havada kaliyor ama KIMILDAMIYOR (titresim var). */
  durust("hv_donuk", null,
         (o, i) => { o.location = { x: 0.5 + (i % 2 ? 0.06 : 0), y: 70, z: 0.5 }; });
  /* Levitasyon efektiyle (kendi ucuslarimiz) havada. */
  durust("hv_levitasyon", null, ileri,
         { getEffect: (e) => (e === "levitation" ? { amplifier: 0 } : undefined) });
  /* Kendi isimiz calisirken. */
  durust("hv_kendi_isi", null, ileri, {}, () => true);
  /* Ucus kipi (yaratici / yetki): muaf. */
  durust("hv_ucus_kipi", null, ileri, { isFlying: true });
  /* Tekneyle ya da bir varligin ustunde. */
  durust("hv_tekne", (D, o) => {
    const tekne = { id: "tekne", typeId: "minecraft:boat", isValid: true,
                    get location() { return { x: o.location.x, y: 69.5, z: o.location.z }; } };
    D.boyut._varliklar = [tekne];
  });

  /* HILE: havada sabit yukseklikte yuruyor, "yerdeyim" diyor. */
  {
    const D = dunyaKur();
    sifirla();
    const o = oyuncu(D, "hv_hile", 0.5, 70, 0.5, { isOnGround: true });
    yuru(o, seri, ileri);
    kontrol("havada sabit yukseklikte yuruyen YAKALANDI",
            isaret("hv_hile") >= ayar.GOZCU_ESIK && bildirim() === 1,
            isaret("hv_hile") + " isaret · " + bildirim() + " bildirim");
  }
  /* Tek teyit (3 sn) bildirmiyor. */
  {
    const D = dunyaKur();
    sifirla();
    const o = oyuncu(D, "hv_kisa", 0.5, 70, 0.5);
    yuru(o, ayar.HAVADA_ORNEK, ileri);
    kontrol("3 sn havada kalan BILDIRILMIYOR (tek teyit)", bildirim() === 0,
            isaret("hv_kisa") + " isaret");
  }
  /* Blok okuma ucuz: ornek basina ust sinir. */
  {
    const D = dunyaKur();
    sifirla();
    const once = D.sayac.getBlock;
    const o = oyuncu(D, "hv_butce", 0.5, 64, 0.5);
    yuru(o, 20, ileri);
    const okuma = D.sayac.getBlock - once;
    /* Olculen dokum (Savunma Kipi acik, yerde yuruyen): kati blok 2
       (ayak + bas) + su ustu 2 (alt + ayak) + havada 1 (ayak alti).
       Havada asili olcumunun payi ornek basina TEK blok; tam
       dogrulama (30 blok) yalniz esik dolunca.                   */
    kontrol("yerde yuruyende ornek basina en fazla 5 blok okuma (2 kati + 2 su + 1 havada)",
            okuma <= 21 * 5, okuma + " okuma / 21 ornek");
  }
  arinma.arinmaUnut();
}

console.log(hata ? ">>> SORUN VAR" : ">>> jesus · slow_falling · blok menzili · havada asili: temiz oyuncu suclanmiyor, hile yakalaniyor");
process.exit(hata ? 1 : 0);
