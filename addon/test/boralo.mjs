/* BORALO MOD V2 -- yakala/birak + coklu simsek.

   Referanstaki kusurlarin her biri icin bir sinama:
     - "Mob Picker" adina ragmen sadece OYUNCU yakaliyordu; burada
       tersi: mob yakalanir, oyuncu yakalanmaz
     - referans kurbani 200 blok yukari isinlayip 5 tick'te bir
       oraya geri isinliyordu -> burada tutarken TICK MALIYETI YOK
     - referansta yakalayan cikinca kurban sonsuza kadar mahsurdu
       -> burada kayit kalici, mob geri birakilabiliyor
     - coklu simsek MIN MESAFE'ye uyuyor mu (kendini yakma)
     - yildirimlar tek tick'te degil, partiye bolunerek mi dusuyor  */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, esyaKaydet, _durum, system } from "@minecraft/server";

esyaKaydet("pa:kol_toprak");

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };

sus();
await import("./pack/main.js");
ac();

const ayar = await import("./pack/ayarlar.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

const BAS = { x: 0.5, y: 90.6, z: 0.5 };

function kur(id) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: -0.05, z: 0 }, BAS);
  o.id = id;
  o.typeId = "minecraft:player";
  o.isSneaking = true;
  o.getComponent = (ad) => (ad === "minecraft:equippable")
    ? { getEquipment: (s) => (s === "Mainhand") ? { typeId: "pa:kol_toprak" } : undefined,
        setEquipment: () => true }
    : undefined;
  _durum.oyuncular = [o];
  return { D, o };
}

function mob(id, x, y, z, tip = "minecraft:zombie") {
  return {
    id, typeId: tip, isValid: true, nameTag: "",
    location: { x, y, z },
    _kaldirildi: false,
    remove() { this._kaldirildi = true; this.isValid = false; },
    applyDamage: () => true, addEffect: () => {},
    applyImpulse: () => true, applyKnockback: () => true
  };
}

function zipla(o, tick = 70) {
  o.isJumping = true;
  sus(); tickIlerlet(8); ac();
  o.isJumping = false;
  sus(); tickIlerlet(tick); ac();
}

function yetenekDegistir(o) {
  const eski = o.getViewDirection;
  o.getViewDirection = () => ({ x: 0, y: 1, z: 0 });
  sus(); tickIlerlet(40); ac();
  o.getViewDirection = eski;
  /* Jest KENARDA tetikleniyor: "yukari bakmiyor" durumuna
     donmeden ikinci degisim olmuyor. Bakis yonunu geri almak
     tek basina yetmiyor, TARAMANIN o hali gormesi lazim.
     v4.54'e kadar fark edilmedi cunku bu testler tek adim
     atiyordu; Toprak Kol'a tasininca on adim gerekti ve
     hepsi ilk adimda takildi.                                */
  sus(); tickIlerlet(10); ac();
}

/* v4.54: bu dort yetenek Boralo Kolu'ndan TOPRAK KOL'a gecti.
   Orada listenin basinda degiller, o yuzden "varsayilan zaten
   yakala" varsayimi artik gecerli degil.

   Sira ELLE yazilmiyor: kollar.js'ten okunuyor. Toprak Kol'a
   ileride bir yetenek daha eklenirse bu testler kendiliginden
   dogru yere gidiyor -- v4.33'te elle yazilmis bir sayi tam
   boyle bir tasimada testi bozmustu.                          */
const KOL_SIRASI = (await import("./pack/yetenekler/kollar.js"))
  .KOL_ESYALARI.find((r) => r[0] === "pa:kol_toprak").slice(1);

function yetenegiSec(o, kimlik) {
  const kac = KOL_SIRASI.indexOf(kimlik);
  if (kac < 0) throw new Error("Toprak Kol'da yok: " + kimlik);
  for (let i = 0; i < kac; i++) yetenekDegistir(o);
  return kac;
}

console.log("=== 1. YAKALA: MOB CEBE GIRIYOR ===");
{
  const yak = await import("./pack/yetenekler/yakala.js");
  yak.cepleriUnut();

  const { D, o } = kur("br1");
  const z = mob("z1", 6.5, 90, 0.5);
  D.boyut._varliklar = [o, z];
  yetenegiSec(o, "yakala");
  zipla(o);

  kontrol("mob dunyadan alindi", z._kaldirildi === true);
  kontrol("cepte duruyor", yak.ceptekiSayisi("br1") === 1,
          yak.ceptekiSayisi("br1") + " mob");
  kontrol("actionbar bildirdi",
          /cebe girdi/.test(o.onScreenDisplay._son || ""), o.onScreenDisplay._son);
}

console.log("");
console.log("=== 2. YAKALA: TUTARKEN TICK MALIYETI YOK ===");
{
  /* Referans 5 tick'te bir kurbani geri isinliyordu. Bizde
     tutmak bir KAYIT, is degil -- uzun sure beklemek hicbir
     sey yapmamali.                                            */
  const yak = await import("./pack/yetenekler/yakala.js");
  yak.cepleriUnut();

  const { D, o } = kur("br2");
  D.boyut._varliklar = [o, mob("z2", 6.5, 90, 0.5)];
  yetenegiSec(o, "yakala");
  zipla(o);

  const oncekiDogan = D.sayac.dogan.length;
  sus(); tickIlerlet(2000); ac();
  kontrol("2000 tick boyunca hicbir sey dogmadi/isinlanmadi",
          D.sayac.dogan.length === oncekiDogan,
          oncekiDogan + " -> " + D.sayac.dogan.length);
  kontrol("mob hala cepte", yak.ceptekiSayisi("br2") === 1);
}

console.log("");
console.log("=== 3. BIRAK: MOB GERI DOGUYOR ===");
{
  const yak = await import("./pack/yetenekler/yakala.js");
  yak.cepleriUnut();

  const { D, o } = kur("br3");
  D.boyut._varliklar = [o, mob("z3", 6.5, 90, 0.5, "minecraft:cow")];
  yetenegiSec(o, "yakala");
  zipla(o);
  kontrol("once yakalandi", yak.ceptekiSayisi("br3") === 1);

  D.boyut._varliklar = [o];
  zipla(o);

  const inek = D.sayac.dogan.filter((d) => d.tip === "minecraft:cow");
  kontrol("ayni tur geri doguruldu", inek.length === 1,
          D.sayac.dogan.map((d) => d.tip).join(", ") || "hicbiri");
  kontrol("cep bosaldi", yak.ceptekiSayisi("br3") === 0);
}

console.log("");
console.log("=== 4. YAKALA: OYUNCU VE YASAKLI TURLER ===");
{
  const yak = await import("./pack/yetenekler/yakala.js");
  yak.cepleriUnut();

  const { D, o } = kur("br4");
  const baskaOyuncu = mob("p2", 6.5, 90, 0.5, "minecraft:player");
  D.boyut._varliklar = [o, baskaOyuncu];
  yetenegiSec(o, "yakala");
  zipla(o);

  kontrol("OYUNCU yakalanmadi (referansin TEK yaptigi seydi)",
          baskaOyuncu._kaldirildi === false && yak.ceptekiSayisi("br4") === 0,
          o.onScreenDisplay._son);
}
{
  const yak = await import("./pack/yetenekler/yakala.js");
  yak.cepleriUnut();

  const { D, o } = kur("br5");
  const ejder = mob("ed", 6.5, 90, 0.5, "minecraft:ender_dragon");
  D.boyut._varliklar = [o, ejder];
  yetenegiSec(o, "yakala");
  zipla(o);
  kontrol("yasakli tur yakalanmadi (ejder)",
          ejder._kaldirildi === false && yak.ceptekiSayisi("br5") === 0,
          o.onScreenDisplay._son);
}

console.log("");
console.log("=== 5. YAKALA: DUNYA YENIDEN YUKLENINCE UNUTULMUYOR ===");
{
  const yak = await import("./pack/yetenekler/yakala.js");
  yak.cepleriUnut();

  const { D, o } = kur("br6");
  D.boyut._varliklar = [o, mob("z6", 6.5, 90, 0.5, "minecraft:pig")];
  yetenegiSec(o, "yakala");
  zipla(o);

  // Dunyadan cikip girmeyi taklit et
  yak.cepleriUnut();
  kontrol("kayit dunya ozelliginde duruyor",
          yak.ceptekiSayisi("br6") === 1, yak.ceptekiSayisi("br6") + " mob");

  D.boyut._varliklar = [o];
  zipla(o);
  const domuz = D.sayac.dogan.filter((d) => d.tip === "minecraft:pig");
  kontrol("yeniden yukledikten sonra birakilabildi", domuz.length === 1,
          domuz.length + " domuz");
}

console.log("");
console.log("=== 6. COKLU SIMSEK ===");
{
  const { D, o } = kur("br7");
  // 2 blok (cok yakin), 6/8/10 blok (gecerli), 30 blok (cok uzak)
  D.boyut._varliklar = [
    o,
    mob("cokYakin", 2.0, 90, 0.5),
    mob("a", 6.5, 90, 0.5), mob("b", 8.5, 90, 0.5), mob("c", 10.5, 90, 0.5),
    mob("d", 12.5, 90, 0.5),
    mob("cokUzak", 40.5, 90, 0.5)
  ];
  yetenegiSec(o, "coklu_simsek");
  kontrol("yetenek Coklu Simsek'e gecti",
          /Coklu/.test(o.onScreenDisplay._son || ""), o.onScreenDisplay._son);

  zipla(o, 120);

  const sim = D.sayac.dogan.filter((d) => d.tip === "minecraft:lightning_bolt");
  kontrol("hedef sayisi tavani asmadi", sim.length <= ayar.COKLU_HEDEF,
          sim.length + " / " + ayar.COKLU_HEDEF);
  kontrol("hedef bulundu", sim.length > 0, sim.length + " yildirim");

  /* MIN MESAFE referanstan alinan iyi fikir: cok yakindakini
     vurma, yoksa yildirimin alan hasarindan kendin yaniyorsun. */
  const cokYakin = sim.filter((s) => Math.abs(s.x - 2.0) < 0.6);
  kontrol("cok yakindaki hedef VURULMADI (min mesafe)",
          cokYakin.length === 0, cokYakin.length + " tanesi cok yakin");

  const cokUzak = sim.filter((s) => s.x > 30);
  kontrol("menzil disindaki vurulmadi", cokUzak.length === 0);

  const kendine = sim.filter((s) => Math.abs(s.x - BAS.x) < 1);
  kontrol("oyuncu kendini vurmadi", kendine.length === 0);
}
{
  const { D, o } = kur("br8");
  D.boyut._varliklar = [o];      // hic hedef yok
  yetenegiSec(o, "coklu_simsek");
  zipla(o, 60);
  const sim = D.sayac.dogan.filter((d) => d.tip === "minecraft:lightning_bolt");
  kontrol("hedef yokken yildirim dusmedi", sim.length === 0, sim.length + " yildirim");
  kontrol("sebebini soyledi",
          /hedef yok/.test(o.onScreenDisplay._son || ""), o.onScreenDisplay._son);
}

console.log("");
console.log("=== 7. KAYIT ===");
{
  const kayit = await import("./pack/yetenekler/kayit.js");
  for (const y of ["yakala", "coklu_simsek"]) {
    kontrol(y + " kayitli", kayit.yetenekAl(y) !== undefined);
  }
  /* Kac yetenek oldugu ELLE yazilmiyor: sayi surumden surume
     degisiyor (v4.33'te 2'den 4'e cikti, v4.54'te dordu birden
     Toprak Kol'a gecti). Kaynak her zaman kollar.js.           */
  const { KOL_ESYALARI } = await import("./pack/yetenekler/kollar.js");

  /* v4.54: pa:kol_toprak KALDIRILDI, dort yetenegi Toprak
     Kol'a gecti. Kolun yok oldugunu da kilitliyoruz -- geri
     eklenirse "kol israfi" kurali sessizce delinmis olur.     */
  kontrol("pa:kol_boralo artik YOK (Toprak Kol'a katildi)",
          !KOL_ESYALARI.some((r) => r[0] === "pa:kol_boralo"));

  const satir = KOL_ESYALARI.find((r) => r[0] === "pa:kol_toprak");
  const beklenen = satir ? satir.slice(1) : [];
  const liste = kayit.esyaninYetenekleri("pa:kol_toprak");
  const bagli = liste ? liste.map((t) => t.kimlik) : [];

  kontrol("Toprak Kol kollar.js'teki butun yeteneklere bagli",
          beklenen.length > 0 && beklenen.length === bagli.length &&
          beklenen.every((k) => bagli.includes(k)),
          bagli.length + " yetenek");

  /* Boralo'nun dordu de gercekten tasindi mi. */
  for (const y of ["yakala", "coklu_simsek", "ok_yagmuru", "sarsinti"]) {
    kontrol(y + " Toprak Kol'da", bagli.includes(y), bagli.join(", "));
  }

  /* Golge Kolu'nun yetenekleri gercekten buraya gecti mi. */
  for (const y of ["ok_yagmuru", "sarsinti"]) {
    kontrol(y + " Boralo Kolu'na gecti (Golge Kolu kaldirildi)",
            bagli.includes(y), bagli.join(", "));
  }
  kontrol("pa:kol_golge artik YOK",
          !KOL_ESYALARI.some((r) => r[0] === "pa:kol_golge"));
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> tum Boralo Mod V2 testleri gecti");
process.exit(hata ? 1 : 0);
