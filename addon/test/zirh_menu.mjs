/* ZIRH MENUSU GERCEKTEN ACILIYOR MU                     v4.95

   ---- BU DOSYA NIYE VAR ----
   v4.94'te zirhMenusu() icine `cekirdek` degiskeni eklendi ama
   TANIMI dugme listesinin ALTINA dustu. const'un gecici olu
   bolgesi (TDZ) yuzunden menu her acilista ReferenceError
   atiyordu: Zirh Yukseltmesi menusu HIC gorunmuyordu.

   Neden hicbir test yakalamadi: sahte dunyada
   @minecraft/server-ui YOKTU, menuAc modulu bulamayinca
   sessizce false donuyordu ve zirhMenusu'nun govdesine hic
   girilmiyordu. Yani menuyu ACAN tek bir test bile yoktu.

   Artik node_modules/@minecraft/server-ui altinda gercek bir
   taklit var; bu dosya menuyu ucdan uca aciyor.

   Sinanan: menu ACILIYOR mu · dokuz mod da listede mi ·
   ozetler gorunuyor mu · cekirdek eldeyken isaretleniyor mu ·
   secim uygulaniyor mu.                                     */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { esyaKaydet, itemUseTetikle, tickIlerlet, _durum } from "@minecraft/server";
import { _menuKayit, _menuSifirla } from "@minecraft/server-ui";

esyaKaydet("pa:kol_toprak", "pa:kol_ucus",
           "pa:zirh_mod_temel", "pa:zirh_mod_titan", "pa:zirh_mod_isi");

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac  = () => { console.warn = w; };

sus();
await import("./pack/main.js");
const ayar  = await import("./pack/ayarlar.js");
const zirh  = await import("./pack/yetenekler/zirh.js");
ac();

/* menu.js modulu DINAMIK import ile yukluyor (bilerek: modul
   yoksa paket olmesin). Soz bir sonraki mikro-gorevde cozulur;
   bir tick bekleyip devam ediyoruz.                          */
await new Promise((r) => setTimeout(r, 0));

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

function kur(id, elde) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = id; o.typeId = "minecraft:player";
  o.isSneaking = false;
  o.addEffect = () => {}; o.removeEffect = () => {};
  o.getComponent = (a) => (a === "minecraft:equippable") ? {
    getEquipment: (y) => (y === "Mainhand" && elde) ? { typeId: elde } : undefined,
    setEquipment: () => true
  } : undefined;
  _durum.oyuncular = [o];
  return { D, o };
}

/* Kol menusunu ac, "Zirh Yukseltmesi" dugmesini bul ve bas.
   Bu tam olarak oyuncunun tablette yaptigi sey.             */
function zirhMenusunuAc(o, kol) {
  _menuSifirla();
  sus();
  itemUseTetikle({ source: o, itemStack: { typeId: kol } });
  ac();
  const ana = _menuKayit.acilan[0];
  if (!ana) return { ana: undefined, zirhMenu: undefined };
  const i = ana.dugmeler.findIndex((d) => d.includes("Max Steel"));
  if (i < 0) return { ana, zirhMenu: undefined };
  sus();
  ana.form.sec(i);
  ac();
  return { ana, zirhMenu: _menuKayit.acilan[1] };
}

console.log("=== 1. MENU MODULU TAKLIDI CALISIYOR ===");
{
  const { o } = kur("zm0", "pa:kol_toprak");
  _menuSifirla();
  sus();
  itemUseTetikle({ source: o, itemStack: { typeId: "pa:kol_toprak" } });
  ac();
  kontrol("kol menusu gercekten acildi",
          _menuKayit.acilan.length > 0,
          _menuKayit.acilan.length + " menu");
  kontrol("menude Max Steel satiri var",
          _menuKayit.acilan[0] &&
          _menuKayit.acilan[0].dugmeler.some((d) => d.includes("Max Steel")));
}

console.log("");
console.log("=== 2. ZIRH MENUSU ACILIYOR (v4.94 cokmesi) ===");
{
  const { o } = kur("zm1", "pa:kol_toprak");
  const { ana, zirhMenu } = zirhMenusunuAc(o, "pa:kol_toprak");
  kontrol("ana menu acildi", !!ana);
  /* ISTE O SATIR: eski kodda burasi ReferenceError atiyor ve
     ikinci menu HIC acilmiyordu.                             */
  kontrol("ZIRH MENUSU ACILDI (cokmedi)", !!zirhMenu,
          zirhMenu ? zirhMenu.dugmeler.length + " dugme" : "acilmadi");
  if (zirhMenu) {
    /* v5.9: modlarin ustune bir satir daha var -- Mod Carki
       (kaynaktaki mode_select dugumu, 30 XP). Ayri sayiliyor
       cunku o bir MOD degil, agacin bir dugumu.            */
    const carkSatiri = zirhMenu.dugmeler.filter((d) => d.includes("Mod Çarkı"));
    const modSatirlari = zirhMenu.dugmeler.filter((d) => !d.includes("Mod Çarkı"));
    kontrol("dokuz modun hepsi listede",
            modSatirlari.length === ayar.ZIRH_MODLAR.size,
            modSatirlari.length + " / " + ayar.ZIRH_MODLAR.size);
    kontrol("Mod Carki satiri da var (kaynakta mode_select)",
            carkSatiri.length === 1 &&
            carkSatiri[0].includes(String(ayar.ZIRH_CARK_XP)),
            carkSatiri[0] || "yok");
    for (const [anahtar, t] of ayar.ZIRH_MODLAR) {
      kontrol("  " + anahtar + " menude ve ozeti gorunuyor",
              zirhMenu.dugmeler.some((d) => d.includes(t.ad) && d.includes(t.ozet)));
    }
    kontrol("her MOD satiri cekirdek kimligini yaziyor",
            modSatirlari.every((d) => d.includes(ayar.ZIRH_CEKIRDEK_ONEK)),
            zirhMenu.dugmeler[0]);
  }
}

console.log("");
console.log("=== 3. CEKIRDEK ELDEYKEN MENU ONU GOSTERIYOR ===");
{
  /* Cekirdek eldeyken hem BASLIK degismeli hem o modun satiri
     isaretlenmeli: "hangi moddayim" sorusunun cevabi burasi. */
  zirh.zirhUnut();
  const { o } = kur("zm2", "pa:zirh_mod_titan");
  /* Cekirdek elde oldugu icin kol menusu acilamaz; zirh
     menusune ana menuden gidiliyor. Kolu yan ele koyup ana
     menuyu aciyoruz.                                        */
  o.getComponent = (a) => (a === "minecraft:equippable") ? {
    getEquipment: (y) => y === "Mainhand" ? { typeId: "pa:zirh_mod_titan" }
                       : y === "Offhand" ? { typeId: "pa:zirh_mod_titan" }
                       : undefined,
    setEquipment: () => true
  } : undefined;

  kontrol("elindeki cekirdek okunuyor",
          zirh.elindekiCekirdek(o) === "titan",
          String(zirh.elindekiCekirdek(o)));

  _menuSifirla();
  sus();
  itemUseTetikle({ source: o, itemStack: { typeId: "pa:kol_toprak" } });
  ac();
  const ana = _menuKayit.acilan[0];
  if (ana) {
    const satir = ana.dugmeler.find((d) => d.includes("Max Steel"));
    kontrol("ana menudeki satir TITAN yaziyor",
            !!satir && satir.includes("Titan"), satir || "satir yok");
    kontrol("cekirdek isareti (⚡) var", !!satir && satir.includes("⚡"), satir);

    const i = ana.dugmeler.indexOf(satir);
    sus(); ana.form.sec(i); ac();
    const zm = _menuKayit.acilan[1];
    kontrol("cekirdek eldeyken de menu aciliyor", !!zm);
    if (zm) {
      kontrol("basligi cekirdegi soyluyor",
              zm.baslik.includes("Titan") && zm.baslik.includes("çekirdek"),
              zm.baslik);
      const titanSatiri = zm.dugmeler.find((d) => d.includes("Titan"));
      kontrol("titan satiri ⚡ ile isaretli",
              !!titanSatiri && titanSatiri.includes("⚡"), titanSatiri);
    }
  } else {
    kontrol("ana menu acildi", false, "acilmadi");
  }
}

console.log("");
console.log("=== 4. MENU SECIM YAPMIYOR, BILGI VERIYOR (v4.95) ===");
{
  /* Kullanici: "menuden o modlara gerek kalmadi, yani
     secebiliyorduk ya."  Menu artik sadece hangi cekirdegin
     ne verdigini yaziyor; dokunmak GUC DEGISTIRMIYOR.

     Bunu sinamak onemli, cunku eski davranisin kalintisi
     "sectim ama bir sey olmadi" hissini geri getirirdi.    */
  zirh.zirhUnut();
  const { o } = kur("zm3", "pa:kol_toprak");
  const mesajlar = [];
  o.sendMessage = (m) => mesajlar.push(m);
  const { zirhMenu } = zirhMenusunuAc(o, "pa:kol_toprak");
  kontrol("menu acildi", !!zirhMenu);
  if (zirhMenu) {
    const sira = [...ayar.ZIRH_MODLAR.keys()];
    const hedef = sira.indexOf("gizlilik");
    sus(); zirhMenu.form.sec(hedef); ac();

    /* ---- v5.9: DOKUNMAK ARTIK BIR SEY YAPIYOR ----
       Yukaridaki yorum v4.95'ten kalma. Kullanicinin son
       istegi bunun TERSI: "yetenek agaci var ya, tek tek
       acabiliyorsun; bizim agacimiz da modunkiyle ayni
       olsun." Kaynakta olculdu (base_mode.json): her mod
       `palladium:item_buyable` ile, kendi cekirdegi
       ODENEREK aciliyor.

       Yani KILITLI bir moda dokunmak onu ACMAYI deniyor.
       Cekirdek yoksa acilmiyor ve sebep actionbar'a
       yaziliyor -- sessizce hicbir sey olmuyor DEGIL.     */
    kontrol("kilitli moda dokununca sohbet mesaji YOK",
            mesajlar.length === 0, mesajlar.length + " mesaj");
    const son = o.onScreenDisplay && o.onScreenDisplay._son;
    kontrol("sebep actionbar'da yaziyor",
            !!son && son.indexOf("çekirdeği gerek") !== -1, son || "-");

    /* Secim hala KALICI DURUM YAZMIYOR (eski modYaz/modAl
       geri gelmemis olmali); yazan sey agac defteri.       */
    kontrol("modYaz artik yok (eski secim sistemi)",
            typeof zirh.modYaz === "undefined");
    kontrol("modAl artik yok (eski secim sistemi)",
            typeof zirh.modAl === "undefined");
  }
}

console.log("");
console.log("=== 4b. MENUDE SECILI ISARETI YOK, ELINDE ISARETI VAR ===");
{
  /* ---- v5.9: ✔ ARTIK VAR VE BIR SEY ANLATIYOR ----
     Eski kural "✔ olmamali, cunku secim yok"tu. Artik agac
     var: ✔ = bu mod ACIK, ⚿ = kilitli. Temel agacin koku,
     hep ✔.                                                 */
  zirh.zirhUnut();
  const { o } = kur("zm5", "pa:kol_toprak");
  const { zirhMenu } = zirhMenusunuAc(o, "pa:kol_toprak");
  if (zirhMenu) {
    kontrol("Temel (agacin koku) ✔ ile isaretli",
            zirhMenu.dugmeler.some((d) => d.includes("✔") &&
              d.includes(ayar.ZIRH_MODLAR.get("temel").ad)));
    kontrol("kilitli modlar ⚿ ile isaretli",
            zirhMenu.dugmeler.filter((d) => d.includes("⚿")).length >= 1,
            zirhMenu.dugmeler.filter((d) => d.includes("⚿")).length + " kilitli");
    kontrol("kilitli satir nasil acilacagini yaziyor",
            zirhMenu.dugmeler.some((d) => d.includes("çekirdek harcanır")));
    kontrol("elinde cekirdek yokken ⚡ de yok",
            zirhMenu.dugmeler.every((d) => !d.includes("⚡")));
    kontrol("baslik ne yapilmasi gerektigini yaziyor",
            zirhMenu.baslik.includes("eline al"), zirhMenu.baslik);
  } else {
    kontrol("zirh menusu acildi", false, "acilmadi");
  }
}

console.log("");
console.log("=== 5. BEN 10 MENUSU DE ACILIYOR ===");
{
  /* Ayni kalibin ayni hataya acik oldugu yer: bu menu de hic
     acilmamisti. Bir kez actik ki bir daha kor nokta olmasin. */
  const { o } = kur("zm4", "pa:kol_toprak");
  _menuSifirla();
  sus();
  itemUseTetikle({ source: o, itemStack: { typeId: "pa:kol_toprak" } });
  ac();
  const ana = _menuKayit.acilan[0];
  const i = ana ? ana.dugmeler.findIndex((d) => d.includes("Ben 10")) : -1;
  kontrol("ana menude Ben 10 satiri var", i >= 0);
  if (i >= 0) {
    sus(); ana.form.sec(i); ac();
    const bm = _menuKayit.acilan[1];
    kontrol("BEN 10 MENUSU ACILDI (cokmedi)", !!bm,
            bm ? bm.dugmeler.length + " dugme" : "acilmadi");
  }
}

console.log(hata ? "\nKALDI: hatalar var\n" : "\ngecti: hepsi\n");
process.exit(hata ? 1 : 0);
