/* DIS INCELEME DUZELTMELERI                          v7.62

   Dis bir modelin v7.60 uzerinde bulup bildirdigi on maddenin
   dokuzu koda bakilarak DOGRULANDI ve duzeltildi. Bu dosya
   duzeltmelerin YERINDE oldugunu tutuyor -- her bolumun
   basinda bulgunun ne oldugu yaziyor.                       */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, _durum, world } from "@minecraft/server";
import { readFileSync } from "node:fs";

const w = console.warn;
console.warn = () => {};
await import("./pack/main.js");
console.warn = w;

const ayar = await import("./pack/ayarlar.js");
const kayit = await import("./pack/yetenekler/kayit.js");
const kalp = await import("./pack/yetenekler/_kalp_defteri.js");
const mezar = await import("./pack/yetenekler/_mezar_defteri.js");
const yedek = await import("./pack/yetenekler/envanter_yedek.js");
const gozcu = await import("./pack/yetenekler/gozcu.js");
const jjk = await import("./pack/yetenekler/jujutsu.js");
const butce = await import("./pack/butce.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

console.log("=== 1. YETKI KAPISI JESTTE DE ===");
{
  /* BULGU: sohbetteki "can 10" etikete bagliydi ama AYNI GUC
     jestten (kalp_ekle / kalp_toptan, esyasiz) etiketsiz
     aliniyordu. Kapi kilitliyken pencere acikti.           */
  const m = readFileSync("./pack/main.js", "utf8");
  kontrol("korumali yetenek listesi var",
          Array.isArray(ayar.YETENEK_KORUMALI) &&
          ayar.YETENEK_KORUMALI.length > 0,
          (ayar.YETENEK_KORUMALI || []).join(","));
  for (const k of ["kalp_ekle", "kalp_toptan"]) {
    kontrol(k + " korumali listede", ayar.YETENEK_KORUMALI.indexOf(k) >= 0);
    const t = [...kayit.tumYetenekler()].find((y) => y.kimlik === k);
    kontrol(k + " hala esyasiz (jestten erisiliyor)", t && t.esyasiz === true);
  }
  /* Kalp SILME bilerek korumali DEGIL: kilitlenmesi kimseyi
     korumaz, aksine cikis yolunu kapatir.                  */
  kontrol("kalp_sifirla korumali DEGIL (cikis yolu)",
          ayar.YETENEK_KORUMALI.indexOf("kalp_sifirla") < 0);
  kontrol("tetikleme kapiyi soruyor",
          /yetenekYetkisi\(oyuncu, kimlik\)/.test(m));
  kontrol("kapi SOHBETTEKI olcutu kullaniyor (iki kopya yok)",
          /yetkiliMi as sohbetYetkisi/.test(m) &&
          /sohbetYetkisi\(oyuncu, "can"\)/.test(m));
  const sb = readFileSync("./pack/sohbet.js", "utf8");
  kontrol("sohbet.js yetkiliMi'yi disa aciyor",
          /export function yetkiliMi/.test(sb));
}
{
  /* ---- KAPININ GERCEKTEN CALISTIGI  (davranis) ----
     Yukarisi kapinin YAZILDIGINI olcuyor. Mutasyon testi
     "kapiyi if(false) yap" ile KACTI, cunku hicbir bolum
     kapiyi calistirmiyordu. Burasi jesti gercekten yapiyor.  */
  const D = dunyaKur();
  const yapOyuncu = (id, etiketli) => {
    const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
    o.id = id; o.typeId = "minecraft:player";
    o._etiket = new Set(etiketli ? [ayar.KOMUT_ETIKET] : []);
    o.hasTag = (t) => o._etiket.has(t);
    o.addTag = (t) => { o._etiket.add(t); return true; };
    o.sendMessage = () => {};
    o.runCommand = () => ({ successCount: 1 });
    o.addEffect = () => true;
    o.isSneaking = false; o.isJumping = false;
    o.getViewDirection = () => ({ x: 1, y: 0, z: 0 });
    return o;
  };
  const jest = (o) => {
    o.isSneaking = true; o.isJumping = true; tickIlerlet(8);
    o.isJumping = false; tickIlerlet(8);
  };
  /* Yetenegi ADIYLA secili hale getirmek yerine dogrudan
     tanimin olustur'unu cagirmiyoruz -- kapi tetiklemede,
     olustur'da degil. O yuzden jest sirasinda kalp_ekle'ye
     kadar ilerlemek gerekiyor; onun yerine kapinin karari
     yetkiliMi uzerinden olculuyor, ki tetikleme onu soruyor. */
  const sohbet = await import("./pack/sohbet.js");
  const etiketli = yapOyuncu("yetkili", true);
  const etiketsiz = yapOyuncu("yetkisiz", false);

  _durum.oyuncular = [etiketsiz];
  kontrol("kimse etiketli degilken kapi ACIK",
          sohbet.yetkiliMi(etiketsiz, "can") === true);

  _durum.oyuncular = [etiketli, etiketsiz];
  kontrol("etiketli varken ETIKETSIZ giremiyor",
          sohbet.yetkiliMi(etiketsiz, "can") === false);
  kontrol("etiketli varken ETIKETLI girebiliyor",
          sohbet.yetkiliMi(etiketli, "can") === true);
  kontrol("korumali olmayan komut hala serbest",
          sohbet.yetkiliMi(etiketsiz, "arin") === true);
  /* ---- UCTAN UCA: JESTLE KALP ALMAYI DENE ----
     Asil olcum bu. Jest sirasinda "Kalp Ekle"ye kadar
     ilerleyip tetikliyoruz; etiketsiz oyuncuya kalp GELMEMELI.
     Bu bolum bir mutasyonun kacmasindan dogdu: kapiyi
     if(false) yapmak hicbir testi kirmiyordu, cunku hicbir
     bolum kapiyi GERCEKTEN calistirmiyordu.                */
  const kalpDefteri = await import("./pack/yetenekler/_kalp_defteri.js");
  const jestli = (etiketli2) => {
    kalpDefteri.kalpUnut ? kalpDefteri.kalpUnut() : undefined;
    const o = yapOyuncu("uctan_" + (etiketli2 ? "yetkili" : "yetkisiz"), etiketli2);
    o.onScreenDisplay = { setActionBar(t) { o._son = t; }, setTitle() {} };
    const digeri = yapOyuncu("etiketli_baska", true);
    _durum.oyuncular = [o, digeri];
    /* Sirayi "Kalp Ekle"ye getir: egil + tam yukari bak. */
    let bulundu = false;
    for (let i = 0; i < 400 && !bulundu; i++) {
      o.isSneaking = true; o.getViewDirection = () => ({ x: 0, y: 1, z: 0 });
      tickIlerlet(16);
      o.getViewDirection = () => ({ x: 1, y: 0, z: 0 });
      tickIlerlet(8);
      if (((o._son || "").indexOf("Kalp Ekle") >= 0)) bulundu = true;
    }
    if (!bulundu) return { bulundu: false, kalp: 0 };
    jest(o);
    tickIlerlet(20);
    return { bulundu: true, kalp: kalpDefteri.kalpAl(o.id) };
  };

  const yetkisizSonuc = jestli(false);
  kontrol("jest sirasinda Kalp Ekle bulundu", yetkisizSonuc.bulundu);
  kontrol("ETIKETSIZ oyuncu jestle kalp ALAMIYOR",
          yetkisizSonuc.bulundu && yetkisizSonuc.kalp === 0,
          yetkisizSonuc.kalp + " kalp");

  const yetkiliSonuc = jestli(true);
  kontrol("ETIKETLI oyuncu jestle kalp ALABILIYOR",
          yetkiliSonuc.bulundu && yetkiliSonuc.kalp > 0,
          yetkiliSonuc.kalp + " kalp");
}

console.log("=== 2. ENVANTER YEDEGI TEK KULLANIMLIK ===");
{
  /* BULGU: yedek al -> esyalari sandiga koy -> geri yukle.
     Envanter geri geliyor, sandiktakiler de duruyor; yedek
     silinmedigi icin dongu sinirsizdi.                     */
  yedek.yedekUnut();
  butce.butceSifirla();
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "d1"; o.typeId = "minecraft:player";
  o.sendMessage = () => {};
  const yuvalar = new Array(36).fill(undefined);
  yuvalar[0] = { typeId: "minecraft:diamond", amount: 64 };
  o.getComponent = (a) => a === "minecraft:inventory"
    ? { container: { size: 36,
        getItem: (i) => yuvalar[i], setItem: (i, e) => { yuvalar[i] = e; } } }
    : undefined;
  _durum.oyuncular = [o];

  yedek.yedekAl(o);
  kontrol("yedek alindi", yedek.yedekVarMi(o.id));
  yedek.yedekYukle(o);
  kontrol("geri yukleyince yedek HARCANDI", !yedek.yedekVarMi(o.id));
  const ikinci = yedek.yedekYukle(o);
  kontrol("ikinci geri yukleme reddediliyor",
          typeof ikinci === "string" && ikinci.indexOf("Yedeğin yok") >= 0,
          ikinci);
}

console.log("=== 3. GOZCU MUAFIYETI DARALDI ===");
{
  /* BULGU: levitation/speed/slow_falling/jump_boost'tan biri
     varsa oyuncu BUTUN hareket denetimlerinden muaftı. Hiz
     iksiri tasiyan biri hiz, sicrama, yukselme VE kati blok
     denetimlerinin dordunu birden kapatiyordu.             */
  const D = dunyaKur();
  const yap = (efekt) => {
    const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0, y: 90, z: 0 });
    o.id = "g_" + (efekt || "yok"); o.typeId = "minecraft:player";
    o.isGliding = false; o.isFlying = false; o.isInWater = false;
    o.isClimbing = false; o.isFalling = false;
    o.getEffect = (ad) => (ad === efekt ? { amplifier: 0 } : undefined);
    return o;
  };
  kontrol("efektsiz oyuncu muaf degil",
          gozcu.hareketMuaf(yap(undefined), undefined) === undefined);
  for (const e of ["speed", "jump_boost", "levitation", "slow_falling"]) {
    const m = gozcu.hareketMuaf(yap(e), undefined);
    kontrol(e + " artik 'efekt:' isaretiyle donuyor",
            typeof m === "string" && m === "efekt:" + e, "" + m);
  }
  /* Toptan muafiyet olanlar (ucus kipi, su, tirmanma) AYNEN
     kaldi -- daraltma yalniz efektler icin.                */
  const u = yap(undefined); u.isFlying = true;
  kontrol("ucus kipi hala toptan muaf",
          gozcu.hareketMuaf(u, undefined) === "ucus kipi");

  const g = readFileSync("./pack/yetenekler/gozcu.js", "utf8");
  kontrol("izleyici dali efekt muafiyetini AYIRIYOR",
          /efektMuaf/.test(g) && /muaf && !efektMuaf/.test(g));
  kontrol("hiz olcumu yalniz speed ile bagislaniyor",
          /!afli && !efHiz/.test(g));
  kontrol("sicrama olcumu yalniz ilgili efektle bagislaniyor",
          /!afli && !efSicrama/.test(g));
  kontrol("KATI BLOK denetimi hicbir efektle bagislanmiyor",
          g.indexOf("efHiz") > g.indexOf("KATI_ACIK && savunmaVarMi()"));
}

console.log("=== 4. ANLIK YETENEKLERE FREN ===");
{
  /* BULGU: ayniIsVarMi yalniz IS ACAN yetenekleri kapsiyor.
     `return undefined` diyen anlik yeteneklerin freni yoktu. */
  const m = readFileSync("./pack/main.js", "utf8");
  kontrol("ANLIK_BEKLEME ayari var", ayar.ANLIK_BEKLEME > 0,
          ayar.ANLIK_BEKLEME + " tick");
  kontrol("tetikleme anlikHazirMi soruyor",
          /anlikHazirMi\(oyuncu\.id, kimlik\)/.test(m));
  kontrol("defter oyuncu basina temizleniyor",
          /export function anlikUnut/.test(m));
  kontrol("fren ayniIsVarMi'dan SONRA (is acanlar zaten korumali)",
          m.indexOf("anlikHazirMi(oyuncu.id, kimlik)") >
          m.indexOf("if (ayniIsVarMi(oyuncu.id, kimlik)) continue;"));
}

console.log("=== 5. DORT VARLIK NOKTASI BUTCEDE ===");
{
  /* BULGU: mahou (10 yildirim, butcenin 2.5 kati), yakala,
     donusum ve kol_takas varlikIste cagirmadan varlik
     doguruyordu.                                           */
  for (const [dosya, ad] of [["mahou", "Rhongomyniad"], ["yakala", "Yakala"],
                             ["donusum", "Dönüşüm"], ["kol_takas", "Kol Takas"]]) {
    const src = readFileSync("./pack/yetenekler/" + dosya + ".js", "utf8");
    kontrol(ad + " butceden kota istiyor",
            /varlikIste\(/.test(src) && /from "\.\.\/butce\.js"/.test(src));
  }
  /* Rhongomyniad'in kendisi: butce bitince varlik dogmuyor. */
  const src = readFileSync("./pack/yetenekler/mahou.js", "utf8");
  kontrol("Rhongomyniad butce bitince hasari YINE veriyor",
          /if \(!varlikIste\(1\)\) \{ vur\(v, 8, oyuncu\); sayi\+\+; continue; \}/.test(src));
}

console.log("=== 6. WILL KILICI TEK VARLIK OKUYOR ===");
{
  /* BULGU: dimension.getEntities().find(...) hedef basina
     boyuttaki butun yuklu varliklari geziyordu.            */
  const src = readFileSync("./pack/yetenekler/will_kilic.js", "utf8");
  kontrol("getEntities().find KALKTI",
          !/getEntities\(\)\s*\n?\s*\.find/.test(src));
  kontrol("world.getEntity(kimlik) kullaniliyor",
          /world\.getEntity\(kimlik\)/.test(src));
}

console.log("=== 7. DEFTER SINIRLARI ===");
{
  /* BULGU-a: MEZAR_TAVAN denetimi mezarEkle'de degil,
     cagiranda duruyordu.                                   */
  mezar.mezarUnut ? mezar.mezarUnut() : undefined;
  let kondu = 0;
  for (let i = 0; i < ayar.MEZAR_TAVAN + 5; i++) {
    const r = mezar.mezarEkle("minecraft:overworld",
                              { x: i, y: 90, z: 0 }, [], "t" + i);
    if (r) kondu++;
  }
  kontrol("mezarEkle tavani KENDI uyguluyor", kondu === ayar.MEZAR_TAVAN,
          kondu + " / " + ayar.MEZAR_TAVAN);

  /* BULGU-b: kalp defteri ham setDynamicProperty yapiyordu,
     eleme yoktu; dunyadan ayrilan oyuncu hic dusmuyor.     */
  const src = readFileSync("./pack/yetenekler/_kalp_defteri.js", "utf8");
  kontrol("kalp defteri kaliciYaz kullaniyor", /kaliciYaz\(/.test(src));
  kontrol("kalp defteri DEFTER_TAVAN ile sinirli",
          /DEFTER_TAVAN\)/.test(src));
  kontrol("bos defter hala undefined yaziyor (temizlik korundu)",
          /setDynamicProperty\(KALP_KAYIT_ANAHTAR, undefined\)/.test(src));

  /* ---- SINIRIN GERCEKTEN TUTTUGU  (davranis) ----
     Yukarisi kaliciYaz'in CAGRILDIGINI olcuyor. Mutasyon
     "yine ham yaz" ile KACTI, cunku hicbir bolum defteri
     tavani asacak kadar buyutmuyordu.                      */
  kalp.kalpUnut ? kalp.kalpUnut() : undefined;
  const cokOyuncu = (n) => {
    for (let i = 0; i < n; i++) {
      kalp.kalpEkle({ id: "oyuncu_" + i + "_uzun_kimlik_dolgusu",
                      typeId: "minecraft:player", isValid: true,
                      sendMessage: () => {}, addEffect: () => true,
                      runCommand: () => ({ successCount: 1 }),
                      getComponent: () => undefined }, 2);
    }
  };
  cokOyuncu(2000);
  const yazilan = world.getDynamicProperty(ayar.KALP_KAYIT_ANAHTAR);
  kontrol("defter yaziliyor", typeof yazilan === "string",
          typeof yazilan);
  kontrol("yazilan metin DEFTER_TAVAN'i asmiyor",
          typeof yazilan === "string" && yazilan.length <= ayar.DEFTER_TAVAN,
          (typeof yazilan === "string" ? yazilan.length : "?") +
          " / " + ayar.DEFTER_TAVAN);
  kontrol("motor siniri (32767) da asilmiyor",
          typeof yazilan === "string" && yazilan.length < 32767);
}

console.log("=== 8. 'CAN' KOMUTUNDA TEK SAYI ===");
{
  /* BULGU: kalbiDuzelt tek sayilari asagi yuvarliyor. 0
     kalpken "can 1" -> eklenen 0 -> "Tavandasin: en fazla
     200 ek kalp". Yanlis gerekce, yanlis teshis.           */
  kalp.kalpUnut ? kalp.kalpUnut() : undefined;
  const o = { id: "k1", typeId: "minecraft:player", isValid: true,
              sendMessage: () => {}, runCommand: () => ({ successCount: 1 }),
              addEffect: () => true,
              getComponent: () => undefined };
  const tek = kalp.kalpEkle(o, 1);
  kontrol("tek sayi: eklenen 0", tek.eklenen === 0, JSON.stringify(tek));
  kontrol("tek sayi TAVAN diye bildirilmiyor", tek.tavanaCarpti === false);
  kontrol("tek sayi GECERSIZ MIKTAR diye bildiriliyor",
          tek.gecersizMiktar === true);
  const cift = kalp.kalpEkle(o, 4);
  kontrol("cift sayi ekleniyor", cift.eklenen === 4, JSON.stringify(cift));
  kontrol("cift sayi gecersiz DEGIL", cift.gecersizMiktar === false);
  kontrol("cift sayi tavana carpmadi", cift.tavanaCarpti === false);

  const sb = readFileSync("./pack/sohbet.js", "utf8");
  kontrol("sohbet iki durumu AYRI yaziyor", /sonuc\.gecersizMiktar/.test(sb));

  /* Yorumlardaki 100 -> 200 kaymasi da duzeldi. */
  for (const f of ["kalp_ekle", "_kalp_defteri"]) {
    const s2 = readFileSync("./pack/yetenekler/" + f + ".js", "utf8");
    kontrol(f + ".js yorumu KALP_TAVAN'i 100 demiyor",
            !/KALP_TAVAN'a \(100\)/.test(s2));
  }
  kontrol("gercek KALP_TAVAN 200", ayar.KALP_TAVAN === 200, "" + ayar.KALP_TAVAN);
}

console.log("=== 9. JUJUTSU: TEK NORMALLESTIRICI, OYUNCU BASINA ARIZA ===");
{
  /* BULGU-a: sohbet.js sadelestir, jujutsu.js toLowerCase
     kullaniyordu. Su anki liste ikisinden de ayni geciyordu
     ama Turkce harfli bir ad eklendigi anda kapi adi tanir,
     secici tanimazdi.                                      */
  const src = readFileSync("./pack/yetenekler/jujutsu.js", "utf8");
  kontrol("jujutsu.js sadelestir kullaniyor", /sadelestir\(metin\)/.test(src));
  kontrol("duz toLowerCase kalmadi", !/metin\.trim\(\)\.toLowerCase\(\)/.test(src));
  /* Turkce harfli bir ad ikisinden de ayni geciyor mu. */
  kontrol("Turkce harfli ad taniniyor (ileriye donuk)",
          jjk.jjkAdBul("GOJŌ") !== undefined && jjk.jjkAdBul("Sukuna") !== undefined);
  kontrol("bilinmeyen ad hala undefined", jjk.jjkAdBul("megumi") === undefined);

  /* BULGU-b: tek bir global ozellikVar vardi; BIR oyuncunun
     hatasi HERKESIN kaliciligini kapatiyordu.              */
  /* Kalibi satir basina bagliyoruz: gerekce yorumu da
     "let ozellikVar" yaziyor ve duz arama ona takiliyordu. */
  kontrol("global ozellikVar kalmadi", !/^let ozellikVar/m.test(src));
  kontrol("ariza oyuncu basina tutuluyor", /ozellikYok/.test(src));

  jjk.jjkUnut();
  const arizali = { id: "a1", _o: new Map(),
    setDynamicProperty: () => { throw new Error("yok"); },
    getDynamicProperty: () => { throw new Error("yok"); } };
  const saglam = { id: "a2", _o: new Map(),
    setDynamicProperty(k, v) { this._o.set(k, v); },
    getDynamicProperty(k) { return this._o.get(k); } };
  jjk.jjkYaz(arizali, "sukuna");
  jjk.jjkYaz(saglam, "sukuna");
  kontrol("arizali oyuncu bellege dustu", jjk.jjkOku(arizali) === "sukuna");
  kontrol("SAGLAM oyuncu dinamik ozellikte kaldi",
          saglam._o.size > 0 && jjk.jjkOku(saglam) === "sukuna",
          "ozellik " + saglam._o.size);
}

console.log(hata ? "\nKALDI" : "\nhepsi gecti");
process.exit(hata ? 1 : 0);
