/* BEN 10 -- EVRIM KADEMESI                              v7.92

   Kullanici: "AlienEvo ... ben 10 modu vardi ya, iste onlarin
   eklentilerini buldum, yani ekstra ozellikler ekleyen seyleri."

   Uc jar geldi; ikisi SES eklentisi (`shout`, `yelling_alien`),
   biri gercek kademe (`pinnacle_of_evolution`). Hangisinden ne
   alindigi REFERANS_BEN10_EK.md'de olculeriyle yazili.

   ---- BU DOSYANIN TUTTUGU SEY ----
   1. KAPI ALTI TURDE. Yedinci bir tur uydurulmadi; evrimlesemeyen
      bir yaratik tutunca yetenek is BASLATMIYOR ve sebebini yaziyor.
   2. EVRIM BICIME DEGIL TURE BAGLI. Bizdeki _proto / _10k ayni
      turun gorunumu; ucu de AYNI evrime giriyor.
   3. ELINDEN BIRAKIRSA EVRIM BITIYOR -- sureden once.
   4. SURE TAVANI VAR ve is kendini bitiriyor (sonsuz etki yok).
   5. XLR8 kademesi ARTIYOR ve TAVANDA duruyor.
   6. Vahsi'nin "sersem"i HASAR VERMIYOR -- kaynakta da adi "stun".
   7. Elmas BLOK KOYMUYOR. Kaynakta kristal diken BLOGU var;
      bu depoda bir oyuncuyu blogun icine hapsetmek yasak
      (ayni karar kafes.js'te yazili), o yuzden karsiligi hasar.
   8. Hicbir mekanik KENDIMIZE ve KENDI BOTUMUZA vurmuyor.
   9. Giris efektlerinin hepsi SURELI ve Direnc V (amp 4) yok.
  10. KAPI KAPANIRKEN DE KOLLAR INIYOR. Yetenek jestle
      seciliyor; is baslamadan cikarsa oyuncu kollari havada
      kalirdi.
  11. Adimlar EVRIM_ARA ile ARALIKLI -- her tick degil.        */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, _durum } from "@minecraft/server";
import { readFileSync } from "node:fs";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };
sus();
await import("./pack/main.js");
ac();

const ayar  = await import("./pack/ayarlar.js");
const kayit = await import("./pack/yetenekler/kayit.js");
const E     = await import("./pack/yetenekler/ben10_evrim.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

const BAS = { x: 0.5, y: 90.6, z: 0.5 };

function kur(elde) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, BAS);
  o.id = "ben-1"; o.typeId = "minecraft:player"; o.name = "ben-1";
  o._elde = elde;
  o._yazi = []; o._baslik = [];
  o.onScreenDisplay = {
    setActionBar(t) { o._yazi.push(String(t)); },
    setTitle(t) { o._baslik.push(String(t)); }
  };
  D.boyut._efektler = [];
  D.boyut._varliklar = [o];
  /* main.js'in tick dongusu de tarama yapiyor; bu test iste
     kendisini olcuyor, dongunun karismasi olcumu bulandirir.  */
  _durum.oyuncular = [];
  return { D, o };
}

function kurban(id, x, z, tip = "minecraft:zombie") {
  return {
    id, typeId: tip, isValid: true, name: id,
    location: { x, y: BAS.y - 1.62, z },
    _hasar: [], _efekt: [], _itme: [],
    applyDamage(m) { this._hasar.push(m); return true; },
    addEffect(ad, sure, se) { this._efekt.push({ ad, sure, se }); },
    applyKnockback(a, b) { this._itme.push([a, b]); return true; },
    setOnFire(sn) { this._ates = sn; return true; }
  };
}

function baslat(o) {
  const t = kayit.yetenekAl("evrim");
  sus();
  const is = t ? t.olustur(o) : undefined;
  ac();
  return is;
}
/* `kac` ADIM calistirir -- tick degil, ADIM.

   Ilk yazimda tick sayiliyordu ve OLCUM YANLISTI: `calis()`
   sirasi gelmemis tick'te de `false` donuyor, yani "bir tur
   dondu" ile "bir adim atti" ayni goruluyordu. XLR8 kademe
   tavani testi bu yuzden 2'de takildi, kod dogruydu.
   Adim sayaci artik her adimin sonundaki evrim parcacigi.    */
function adimlar(D, is, kac) {
  const say = () => (D.sayac.parcacik || [])
    .filter((p) => p.tip === ayar.EVRIM_PARCACIK).length;
  const bas = say();
  let bitti = false;
  sus();
  // Adim basina EVRIM_ARA tick + pay; sonsuz donguye karsi tavan.
  const tavan = kac * (ayar.EVRIM_ARA + 2) + 8;
  for (let i = 0; i < tavan; i++) {
    if (say() - bas >= kac) break;
    tickIlerlet(1);
    if (is.calis()) { bitti = true; break; }
  }
  ac();
  return { adim: say() - bas, bitti };
}
const yaz = (o) => o._yazi.join(" | ");

console.log("=== 0. KAYIT VE SIRA ===");
{
  const t = kayit.yetenekAl("evrim");
  kontrol("evrim kayitli", !!t);
  kontrol("sira " + ayar.EVRIM_SIRA, t && t.sira === ayar.EVRIM_SIRA,
          t ? String(t.sira) : "yok");
  kontrol("esyasiz", !!(t && t.esyasiz));
  kontrol("sira carpismasi yok", kayit.siraDenetimi().length === 0,
          kayit.siraDenetimi().join(" | ") || "temiz");
  /* Bicim listesine EKLENMEDI: evrim ayri kademe, gorunum degil. */
  kontrol("evrim bir BICIM degil",
          !ayar.BEN10_BICIM.some(([ek]) => ek === "_evrim"),
          ayar.BEN10_BICIM.map((b) => b[0] || "(bos)").join(","));

  /* ---- KAPALI AYAR DALI: KAYNAKTAN OKUNUYOR ----
     EVRIM_ACIK su an true ve bir `const import`; calisirken
     degistirilemiyor, yani o dal KOSULARAK olculemez. Ayni
     yontem efsane.mjs ve can_sayaci.mjs'te de var. Olculen
     iki sey: kapinin VARLIGI ve kapanirken KOLLARI INDIRMESI
     (jestle secildigi icin kollar havada kalirdi).           */
  const K = new URL("./pack/yetenekler/ben10_evrim.js", import.meta.url);
  const kod = readFileSync(K, "utf8");
  kontrol("ayar bool", typeof ayar.EVRIM_ACIK === "boolean",
          String(ayar.EVRIM_ACIK));
  const kapi = (kod.match(/if \(!EVRIM_ACIK\)[^\n]*/) || [""])[0];
  kontrol("EVRIM_ACIK kapisi var", !!kapi, kapi || "yok");
  kontrol("kapali ayarda kollar iniyor", /kollariIndir/.test(kapi), kapi);
}

console.log("");
console.log("=== 1. KAPI: ALTI TUR ===");
{
  kontrol("tablo alti tur", ayar.BEN10_EVRIM.size === 6,
          ayar.BEN10_EVRIM.size + " tur");
  /* Uydurma tur yok: her anahtar BEN10'da GERCEKTEN var.     */
  for (const k of ayar.BEN10_EVRIM.keys()) {
    kontrol(k + ": BEN10'da karsiligi var", ayar.BEN10.has(k));
  }

  const { o } = kur(undefined);
  kontrol("eli bosken is baslamiyor", baslat(o) === undefined);
  kontrol("eli bosken sebebi yaziliyor", /Evrimleşebilen/.test(yaz(o)), yaz(o));

  const { o: o2 } = kur("pa:ben_gorunmez");
  const bilinmeyen = !ayar.BEN10_EVRIM.has("ben_gorunmez");
  kontrol("evrimlesemeyen tur secildi (on kosul)", bilinmeyen);
  kontrol("evrimlesemeyen yaratikta is baslamiyor", baslat(o2) === undefined);
  kontrol("evrimlesemeyen yaratikta durum yazilmiyor",
          E.evrimDurum(o2.id) === undefined);
  /* Jestle seciliyor: is baslamadan cikarsak kollar havada
     kalir. Kapinin iki dalinda da inmeli.                     */
  const indi = (p) => (p._komutlar || []).some((k) => /playanimation/.test(k));
  kontrol("eli bosken kollar iniyor", indi(o), (o._komutlar || []).join("|"));
  kontrol("evrimlesemeyen yaratikta kollar iniyor", indi(o2),
          (o2._komutlar || []).join("|"));
}

console.log("");
console.log("=== 2. BICIM DEGIL TUR ===");
{
  kontrol("turAdi: sade ad aynen doner",
          E.turAdi("ben_ates") === "ben_ates");
  for (const [ek] of ayar.BEN10_BICIM) {
    if (!ek) continue;
    kontrol("turAdi: " + ek + " atiliyor",
            E.turAdi("ben_ates" + ek) === "ben_ates",
            String(E.turAdi("ben_ates" + ek)));
  }
  kontrol("turAdi: string olmayana undefined",
          E.turAdi(undefined) === undefined && E.turAdi(7) === undefined);

  /* Ucu de AYNI evrime girmeli -- asil olculen sey bu.        */
  for (const [ek] of ayar.BEN10_BICIM) {
    const { o } = kur("pa:ben_ates" + ek);
    const is = baslat(o);
    kontrol("ben_ates" + (ek || "(sade)") + " evrimlesiyor", !!is);
    const d = E.evrimDurum(o.id);
    kontrol("ben_ates" + (ek || "(sade)") + ": tur ben_ates",
            !!d && d.tur === "ben_ates", d ? d.tur : "yok");
    if (is) { sus(); is.bitir(); ac(); }
    E.evrimUnut();
  }
}

console.log("");
console.log("=== 3. GIRIS EFEKTLERI ===");
{
  for (const [anahtar, t] of ayar.BEN10_EVRIM) {
    const { D, o } = kur("pa:" + anahtar);
    const is = baslat(o);
    const gelen = (D.boyut._efektler || []).map((e) => e.ad);
    let eksik = "";
    for (const [ad] of t.efektler || []) if (!gelen.includes(ad)) eksik += ad + " ";
    kontrol(anahtar + ": butun efektler verildi", !eksik, eksik || "tam");
    kontrol(anahtar + ": basligi yazildi",
            o._baslik.some((b) => b.includes(t.ad)), o._baslik.join("|"));
    kontrol(anahtar + ": evrim sesi caldi",
            (D.sayac.ses || []).some((e) => e.ad === ayar.EVRIM_SES),
            (D.sayac.ses || []).map((e) => e.ad).join(",") || "ses yok");
    if (is) { sus(); is.bitir(); ac(); }
    E.evrimUnut();
  }

  /* SURESIZ ETKI YOK -- bu deponun kurali.                    */
  for (const [anahtar, t] of ayar.BEN10_EVRIM) {
    for (const e of t.efektler || []) {
      kontrol(anahtar + "/" + e[0] + ": sureli", e[1] > 0, String(e[1]));
      kontrol(anahtar + "/" + e[0] + ": seviye motor sinirinda",
              e[2] >= 0 && e[2] <= 255, String(e[2]));
      if (e[0] === "resistance") {
        kontrol(anahtar + ": Direnc V degil (amp<4)", e[2] < 4, "amp " + e[2]);
      }
    }
  }
}

console.log("");
console.log("=== 4. ELINDEN BIRAKINCA BITIYOR ===");
{
  const { D, o } = kur("pa:ben_ates");
  const is = baslat(o);
  kontrol("is basladi", !!is);
  const a = adimlar(D, is, 1);
  kontrol("elinde dururken devam ediyor", !a.bitti);

  o._elde = undefined;
  const b = adimlar(D, is, 1);
  kontrol("birakinca is bitiyor", b.bitti);

  /* Baska bir yaratiga gecmek de bitirmeli: evrim O TURE bagli. */
  const { D: D2, o: o2 } = kur("pa:ben_ates");
  const is2 = baslat(o2);
  o2._elde = "pa:ben_elmas";
  kontrol("baska ture gecince bitiyor", adimlar(D2, is2, 1).bitti);
  E.evrimUnut();
}

console.log("");
console.log("=== 5. SURE TAVANI ===");
{
  const { o } = kur("pa:ben_ates");
  const is = baslat(o);
  let bitti = false;
  sus();
  for (let i = 0; i < ayar.EVRIM_SURE + 40; i++) {
    tickIlerlet(1);
    if (is.calis()) { bitti = true; break; }
  }
  ac();
  kontrol("is kendi kendine bitiyor", bitti);
  sus(); is.bitir(); ac();
  kontrol("bitince durum siliniyor", E.evrimDurum(o.id) === undefined);
  kontrol("bitis yazisi var", /sona erdi/.test(yaz(o)), yaz(o));

  /* Oyuncu cikarsa is ORADA biter -- yoksa her adimda olu bir
     nesneye dokunur ve her tick istisna yazar.               */
  const { o: o2 } = kur("pa:ben_ates");
  const is2 = baslat(o2);
  o2.isValid = false;
  let bitti2 = false;
  sus();
  for (let i = 0; i < ayar.EVRIM_ARA + 4; i++) {
    tickIlerlet(1);
    if (is2.calis()) { bitti2 = true; break; }
  }
  ac();
  kontrol("oyuncu gecersizse is biter", bitti2);
  sus(); is2.bitir(); ac();
  E.evrimUnut();
}

console.log("");
console.log("=== 5b. ADIMLAR ARALIKLI ===");
{
  /* Her tick calissaydi mekanik 20 kat siklikta vurur, butceyi
     de ezerdi. Olculen: EVRIM_ARA kadar tick'te BIR adim.    */
  const { D, o } = kur("pa:ben_ates");
  const k = kurban("k1", 3, 0.5);
  D.boyut._varliklar = [o, k];
  const is = baslat(o);
  const TICK = ayar.EVRIM_ARA * 4;
  sus();
  for (let i = 0; i < TICK; i++) { tickIlerlet(1); if (is.calis()) break; }
  ac();
  const adim = (D.sayac.parcacik || [])
    .filter((p) => p.tip === ayar.EVRIM_PARCACIK).length - 1;  // giristeki haric
  kontrol(TICK + " tick'te adim sayisi araligi tutuyor",
          adim <= 5 && adim >= 3, adim + " adim");
  kontrol("her tick calismiyor", adim < TICK / 2, adim + " / " + TICK);
  sus(); is.bitir(); ac();
  E.evrimUnut();
}

console.log("");
console.log("=== 6. XLR8: KADEME ARTIYOR, TAVANDA DURUYOR ===");
{
  const t = ayar.BEN10_EVRIM.get("ben_xlr");
  const { D, o } = kur("pa:ben_xlr");
  const is = baslat(o);
  D.boyut._efektler = [];

  adimlar(D, is, 1);
  const d = E.evrimDurum(o.id);
  kontrol("ilk adim kademe 1", d.kademe === 1, String(d.kademe));
  adimlar(D, is, 1);
  kontrol("ikinci adim kademe 2", d.kademe === 2, String(d.kademe));

  adimlar(D, is, t.kademe + 5);
  kontrol("kademe tavani asilmiyor", d.kademe === t.kademe,
          d.kademe + " / " + t.kademe);

  const hiz = (D.boyut._efektler || []).filter((e) => e.ad === "speed");
  kontrol("speed efekti veriliyor", hiz.length > 0, hiz.length + " kez");
  kontrol("speed seviyesi kademeyi izliyor",
          hiz[hiz.length - 1].o.amplifier === t.kademe,
          String(hiz[hiz.length - 1].o.amplifier));
  /* Efekt SURESI adim araligindan UZUN olmali, yoksa iki adim
     arasinda hiz sonup yeniden basliyor.                      */
  kontrol("speed suresi adim araligindan uzun",
          hiz[hiz.length - 1].sure > ayar.EVRIM_ARA,
          hiz[hiz.length - 1].sure + " > " + ayar.EVRIM_ARA);
  kontrol("kademe actionbar'da yaziyor", /kademe/.test(yaz(o)), yaz(o));
  sus(); is.bitir(); ac();
  E.evrimUnut();
}

console.log("");
console.log("=== 7. VAHSI SERSEMLETIYOR, VURMUYOR ===");
{
  const { D, o } = kur("pa:ben_vahsi");
  const k = kurban("k1", 3, 0.5);
  D.boyut._varliklar = [o, k];
  const is = baslat(o);
  adimlar(D, is, 1);

  kontrol("hedefe HIC hasar yok", k._hasar.length === 0,
          k._hasar.join(","));
  const adlar = k._efekt.map((e) => e.ad);
  kontrol("slowness verildi", adlar.includes("slowness"), adlar.join(","));
  kontrol("nausea verildi", adlar.includes("nausea"), adlar.join(","));
  for (const e of k._efekt) {
    kontrol("sersem/" + e.ad + ": sureli", e.sure > 0, String(e.sure));
  }
  sus(); is.bitir(); ac();
  E.evrimUnut();
}

console.log("");
console.log("=== 8. ELMAS BLOK KOYMUYOR ===");
{
  const { D, o } = kur("pa:ben_elmas");
  const k = kurban("k1", 3, 0.5);
  D.boyut._varliklar = [o, k];
  /* Sahte dunya her setType'i sayac.yazilan'a yaziyor.       */
  const once = D.sayac.yazilan.length;
  const is = baslat(o);
  adimlar(D, is, 3);

  kontrol("hedefe hasar verdi", k._hasar.length > 0, k._hasar.join(","));
  kontrol("HIC blok koymadi", D.sayac.yazilan.length === once,
          (D.sayac.yazilan.length - once) + " blok");
  sus(); is.bitir(); ac();
  E.evrimUnut();
}

console.log("");
console.log("=== 9. KENDIMIZE VE BOTUMUZA ASLA ===");
{
  for (const [anahtar, t] of ayar.BEN10_EVRIM) {
    if (t.mekanik === "hiz") continue;            // alan yetenegi degil
    const { D, o } = kur("pa:" + anahtar);
    const bot = kurban("bot-1", 2, 0.5, ayar.BOT_KIMLIK);
    const k = kurban("k1", 3, 0.5);
    D.boyut._varliklar = [o, bot, k];
    o._hasar = [];
    o.applyDamage = (m) => { o._hasar.push(m); return true; };

    const is = baslat(o);
    adimlar(D, is, 2);
    kontrol(anahtar + ": kendine vurmadi", o._hasar.length === 0,
            o._hasar.join(","));
    kontrol(anahtar + ": botuna vurmadi", bot._hasar.length === 0,
            bot._hasar.join(","));
    kontrol(anahtar + ": botuna efekt vermedi", bot._efekt.length === 0,
            bot._efekt.map((e) => e.ad).join(","));
    kontrol(anahtar + ": yabanciya degdi",
            k._hasar.length > 0 || k._efekt.length > 0 || k._itme.length > 0);
    sus(); is.bitir(); ac();
    E.evrimUnut();
  }
}

console.log("");
console.log("=== 10. MENZIL DISI HEDEFE DOKUNULMUYOR ===");
{
  const t = ayar.BEN10_EVRIM.get("ben_dortkol");
  const { D, o } = kur("pa:ben_dortkol");
  const yakin = kurban("yakin", t.yaricap - 1, 0.5);
  const uzak  = kurban("uzak",  t.yaricap + 3, 0.5);
  D.boyut._varliklar = [o, yakin, uzak];
  const is = baslat(o);
  adimlar(D, is, 1);

  kontrol("yaricap icindekine vuruldu", yakin._hasar.length > 0);
  kontrol("yaricap disindakine vurulmadi", uzak._hasar.length === 0,
          uzak._hasar.join(","));
  kontrol("carpma savuruyor da", yakin._itme.length > 0);
  sus(); is.bitir(); ac();
  E.evrimUnut();
}

console.log("");
console.log("=== 11. GRI MADDE KENDINE CEKIYOR ===");
{
  const t = ayar.BEN10_EVRIM.get("ben_gri");
  const { D, o } = kur("pa:ben_gri");
  /* Oyuncu 0.5,0.5'te; kurban +x'te. Cekim yonu -x olmali.   */
  const k = kurban("k1", 6.5, 0.5);
  D.boyut._varliklar = [o, k];
  const is = baslat(o);
  adimlar(D, is, 1);

  kontrol("cekim itme uyguladi", k._itme.length > 0);
  const [yon] = k._itme[0] || [{}];
  const x = typeof yon === "object" ? yon.x : yon;
  kontrol("itme oyuncuya DOGRU (-x)", x < 0, String(x));
  kontrol("cekim hasar da veriyor", k._hasar.includes(t.hasar),
          k._hasar.join(",") || "hasar yok");
  sus(); is.bitir(); ac();
  E.evrimUnut();
}

console.log("");
console.log("=== 12. ATES YAKIYOR ===");
{
  const t = ayar.BEN10_EVRIM.get("ben_ates");
  const { D, o } = kur("pa:ben_ates");
  const k = kurban("k1", 3, 0.5);
  D.boyut._varliklar = [o, k];
  const is = baslat(o);
  adimlar(D, is, 1);

  kontrol("hasar verdi", k._hasar.includes(t.hasar), k._hasar.join(","));
  kontrol("atesledi", k._ates > 0, String(k._ates));
  /* setOnFire SANIYE aliyor, ayar TICK; cevrim yapilmali.    */
  kontrol("ates suresi saniyeye cevrildi", k._ates === t.atesle / 20,
          k._ates + " sn / " + t.atesle + " tick");
  sus(); is.bitir(); ac();
  E.evrimUnut();
}

console.log("");
console.log("=== 13. UNUTMA ===");
{
  const { o } = kur("pa:ben_ates");
  const is = baslat(o);
  kontrol("durum yazildi", !!E.evrimDurum(o.id));
  E.evrimUnut(o.id);
  kontrol("tek oyuncu unutuldu", E.evrimDurum(o.id) === undefined);
  sus(); is.bitir(); ac();

  const { o: o2 } = kur("pa:ben_ates");
  const is2 = baslat(o2);
  kontrol("ikinci durum yazildi", !!E.evrimDurum(o2.id));
  E.evrimUnut();
  kontrol("argumansiz unutma hepsini siliyor",
          E.evrimDurum(o2.id) === undefined);
  sus(); is2.bitir(); ac();
}

console.log("");
console.log(hata ? "SONUC: HATA VAR" : "SONUC: TEMIZ");
process.exit(hata ? 1 : 0);
