/* BORALO V6 -- Kan Yagmuru + Goz Sensoru            v7.84

   Kullanici "Boralo V6" paketini gonderdi (201 esya, 636
   function, 49 animasyon denetleyicisi, SIFIR script) ve
   "her seyi ekle, kotu altyapisi varsa iyisiyle degistir"
   dedi. Olcum REFERANS_BORALO_V6.md'de: mekaniklerin
   neredeyse hepsi bizde zaten vardi, gercekten eksik olan
   iki tanesi bu dosyada sinaniyor.

   ---- BU DOSYANIN TUTTUGU SEY ----
   Kaynaktaki alti kusurun her biri icin bir madde. Hepsi
   AYNI aileden: sinirsiz etki, ayrim yapmayan hedef secimi,
   oyuncunun kendi esyasina/etkisine dokunma.

   Kan Yagmuru:
     1. Hava SURELI veriliyor mu (kaynakta suresiz)
     2. Kendimiz vurulmuyor mu (kaynakta `damage @e`)
     3. Menzil disindaki vurulmuyor mu (kaynakta butun dunya)
     4. Botlarimiz vurulmuyor mu

   Goz Sensoru:
     5. Korluk SURELI mi (kaynakta 9999 tick)
     6. Oyuncunun KENDI etkileri silinmiyor mu
        (kaynakta `effect @s clear`)
     7. Kendimiz kor edilmiyor mu
     8. Ses dunyaya degil OLAY YERINE calıyor mu             */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { _durum } from "@minecraft/server";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };

sus();
await import("./pack/main.js");
ac();

const ayar  = await import("./pack/ayarlar.js");
const kayit = await import("./pack/yetenekler/kayit.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

const BAS = { x: 0.5, y: 90.6, z: 0.5 };

function kur(id) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, BAS);
  o.id = id; o.typeId = "minecraft:player";
  o._hasar = []; o._etki = [];
  o._silinenEtki = 0;
  o.applyDamage = (m) => { o._hasar.push(m); return true; };
  o.addEffect = (a, s, sec) => { o._etki.push({ a, s, sec }); };
  o.removeEffect = () => { o._silinenEtki++; return true; };
  _durum.oyuncular = [o];
  return { D, o };
}

function hedef(id, x, y, z, tip = "minecraft:zombie") {
  return {
    id, typeId: tip, isValid: true,
    location: { x, y, z },
    _hasar: [], _etki: [], _komutlar: [],
    addEffect(a, s, sec) { this._etki.push({ a, s, sec }); },
    removeEffect() { return true; },
    runCommand(k) { this._komutlar.push(k); return { successCount: 1 }; },
    applyDamage(m) { this._hasar.push(m); return true; },
    applyImpulse: () => true, applyKnockback: () => true
  };
}

function calistir(kimlik, o) {
  const tanim = kayit.yetenekAl(kimlik);
  if (!tanim) return undefined;
  sus();
  const is = tanim.olustur(o);
  ac();
  return is;
}

const havaKomutlari = (D) =>
  (D.sayac.boyutKomut || []).filter((k) => k.indexOf("weather") === 0);


console.log("=== 0. IKISI DE KAYITLI MI ===");
{
  const kan = kayit.yetenekAl("kan_yagmuru");
  const goz = kayit.yetenekAl("goz_sensoru");
  kontrol("kan_yagmuru kayitli", !!kan);
  kontrol("goz_sensoru kayitli", !!goz);
  kontrol("ikisi de esyasiz jest sirasinda",
          !!kan && kan.esyasiz === true && !!goz && goz.esyasiz === true);
  kontrol("siralari birbirinden farkli",
          !!kan && !!goz && kan.sira !== goz.sira,
          "kan=" + (kan && kan.sira) + " goz=" + (goz && goz.sira));
  /* Anlik yetenekler: tick tutan bir is DONDURMEMELI. */
  const { o } = kur("s0");
  kontrol("kan_yagmuru tick tutmuyor", calistir("kan_yagmuru", o) === undefined);
  kontrol("goz_sensoru tick tutmuyor", calistir("goz_sensoru", o) === undefined);
}

console.log("");
console.log("=== 1. KAN YAGMURU: HAVA SURELI (kaynakta suresiz) ===");
{
  const { D, o } = kur("k1");
  D.boyut._varliklar = [o];
  calistir("kan_yagmuru", o);
  const k = havaKomutlari(D);
  kontrol("hava komutu verildi", k.length === 1, k.join(" / ") || "hic");
  /* ASIL MADDE: sure YAZILI olmali. `weather rain` tek basina
     dunyayi kalici yagmurda birakir; kaynakta aynen oyleydi. */
  kontrol("komutta SURE var (kalici yagmur degil)",
          k.length === 1 && /^weather rain \d+$/.test(k[0]), k[0] || "-");
  kontrol("sure ayardan geliyor",
          k.length === 1 && k[0] === "weather rain " + ayar.KAN_YAGMURU_YAGMUR,
          k[0] || "-");
}

console.log("");
console.log("=== 2. KAN YAGMURU: KENDIMIZ VURULMUYOR ===");
{
  /* Kaynakta `damage @e 1` vardi: oyuncunun KENDISI de
     listeye giriyordu. Bu maddenin dusmesi, yetenegin
     kullanicisini vurmasi demek.                          */
  const { D, o } = kur("k2");
  const z = hedef("z2", 0.5, 90, 3.5);
  D.boyut._varliklar = [o, z];
  calistir("kan_yagmuru", o);
  kontrol("yakindaki hedef vuruldu", z._hasar.length === 1,
          z._hasar.join(",") || "hic");
  kontrol("hasar ayardan geliyor",
          z._hasar[0] === ayar.KAN_YAGMURU_HASAR, String(z._hasar[0]));
  kontrol("KENDIMIZ vurulmadi", o._hasar.length === 0,
          o._hasar.join(",") || "0");
}

console.log("");
console.log("=== 3. KAN YAGMURU: MENZIL DISI VURULMUYOR ===");
{
  const { D, o } = kur("k3");
  const yakin = hedef("zy", 0.5, 90, 3.5);
  const uzak  = hedef("zu", 0.5, 90, 0.5 + ayar.KAN_YAGMURU_MENZIL + 6);
  D.boyut._varliklar = [o, yakin, uzak];
  calistir("kan_yagmuru", o);
  kontrol("menzildeki vuruldu", yakin._hasar.length === 1);
  kontrol("menzil DISINDAKI vurulmadi", uzak._hasar.length === 0,
          uzak._hasar.join(",") || "0");
}

console.log("");
console.log("=== 4. KAN YAGMURU: KENDI BOTLARIMIZ VURULMUYOR ===");
{
  /* koniHedefleri KILIT_ATLA_TIPLER'i eliyor. Madde burada
     duruyor cunku kaynagin `@e`si botu da vuruyordu ve bu
     modda bot cagirmak siradan bir hareket.                */
  const bottipi = [...ayar.KILIT_ATLA_TIPLER][0];
  const { D, o } = kur("k4");
  const bot = hedef("bot", 0.5, 90, 3.5, bottipi);
  const z   = hedef("z4", 0.5, 90, 4.5);
  D.boyut._varliklar = [o, bot, z];
  calistir("kan_yagmuru", o);
  kontrol("mob vuruldu", z._hasar.length === 1);
  kontrol("BOT vurulmadi", bot._hasar.length === 0,
          bottipi + " :: " + (bot._hasar.join(",") || "0"));
}

console.log("");
console.log("=== 5. GOZ SENSORU: KORLUK SURELI (kaynakta 9999) ===");
{
  const { D, o } = kur("g1");
  const z = hedef("zg", 0.5, 90, 3.5);
  D.boyut._varliklar = [o, z];
  calistir("goz_sensoru", o);
  const kor = z._etki.filter((e) => e.a === "blindness");
  kontrol("hedef kor edildi", kor.length === 1, JSON.stringify(z._etki));
  kontrol("sure ayardan geliyor",
          kor.length === 1 && kor[0].s === ayar.GOZ_SENSORU_SURE,
          String(kor[0] && kor[0].s));
  /* ASIL MADDE: sure SONLU olmali. Kaynak 9999 tick veriyordu
     -- kor edilen oyuncu icin oyun orada bitiyordu.        */
  kontrol("sure sonlu ve makul (<= 10 sn)",
          ayar.GOZ_SENSORU_SURE > 0 && ayar.GOZ_SENSORU_SURE <= 200,
          ayar.GOZ_SENSORU_SURE + " tick");
}

console.log("");
console.log("=== 6. GOZ SENSORU: KENDI ETKILERIMIZ SILINMIYOR ===");
{
  /* Kaynak `effect @s clear` cagiriyordu: kullanicinin
     uzerindeki iyi etkiler (hiz, can yenileme, yangin
     direnci) de gidiyordu. Bu depoda hicbir yetenek
     kullanicinin kazandigini goturmez.                    */
  const { D, o } = kur("g2");
  const z = hedef("zg2", 0.5, 90, 3.5);
  D.boyut._varliklar = [o, z];
  calistir("goz_sensoru", o);
  kontrol("oyuncunun etkilerine DOKUNULMADI", o._silinenEtki === 0,
          o._silinenEtki + " silme");
  kontrol("KENDIMIZ kor edilmedi",
          o._etki.filter((e) => e.a === "blindness").length === 0,
          JSON.stringify(o._etki));
}

console.log("");
console.log("=== 7. GOZ SENSORU: SES OLAY YERINDE ===");
{
  /* Kaynak `playsound ... @a` ile dunyadaki HERKESE caliyordu.
     Burada boyutun kendi playSound'u konumla cagriliyor.   */
  const { D, o } = kur("g3");
  const z = hedef("zg3", 0.5, 90, 3.5);
  D.boyut._varliklar = [o, z];
  calistir("goz_sensoru", o);
  const sesler = (D.sayac.ses || []).filter((s) => s.ad === ayar.GOZ_SENSORU_SES);
  kontrol("flas sesi caldi", sesler.length === 1,
          JSON.stringify(D.sayac.ses || []));
  kontrol("sese KONUM verildi (dunyaya degil)",
          sesler.length === 1 && !!sesler[0].poz &&
          typeof sesler[0].poz.x === "number",
          JSON.stringify(sesler[0] && sesler[0].poz));
}

console.log("");
console.log("=== 8. GOZ SENSORU: ARKADAKI KOR EDILMIYOR ===");
{
  /* Kaynak yaricap kullaniyordu (r=10), yon bakmiyordu.
     Burasi koni: arkanda duran kor olmuyor.               */
  const { D, o } = kur("g4");
  const on  = hedef("on", 0.5, 90, 4.5);
  const ark = hedef("ark", 0.5, 90, -4.5);
  D.boyut._varliklar = [o, on, ark];
  calistir("goz_sensoru", o);
  kontrol("ONDEKI kor edildi",
          on._etki.filter((e) => e.a === "blindness").length === 1);
  kontrol("ARKADAKI kor edilmedi",
          ark._etki.filter((e) => e.a === "blindness").length === 0,
          JSON.stringify(ark._etki));
}

console.log(hata ? ">>> SORUN VAR" : ">>> boralo v6 yerinde");
process.exit(hata ? 1 : 0);
