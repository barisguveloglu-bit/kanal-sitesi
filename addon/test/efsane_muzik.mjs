/* UC DURAGI DA GORENE MUZIK                                v6.6

   Kullanici: "bir tane muzik dosyasi yukledim, bunun bir
   dakikalik kismini alalim; benim efsane yapisinin ucunu de
   gordukten sonra bu bir dakikalik kisim calmaya baslasin."

   Bu dosyanin tuttugu en onemli iki sey:
     - muzik BIR KEZ calmali (her tick, her giris degil)
     - UCUNU DE gormeden calmamali (ikisi yetmez)           */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, _durum } from "@minecraft/server";
import { readFileSync, existsSync } from "node:fs";

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const BP = KOK + "/Simsek_TNT_ToprakTopu";
const RP = KOK + "/Simsek_Kol_Kaynak";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };
sus();
await import("./pack/main.js");
ac();
const ayar = await import("./pack/ayarlar.js");
const efs = await import("./pack/yetenekler/efsane.js");
const muz = await import("./pack/yetenekler/efsane_muzik.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const oku = (y) => JSON.parse(readFileSync(y, "utf8"));

const KOKNOKTA = { x: 0, z: 0 };

function kur() {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, { x: 0.5, y: 64, z: 0.5 });
  o.id = "m1"; o.typeId = "minecraft:player";
  o.location = { x: 5000, y: 64, z: 5000 };     // hicbir duragin yaninda degil
  o._baslik = [];
  o._ses = [];
  o.sendMessage = () => {};
  o.onScreenDisplay = {
    setActionBar: () => {},
    setTitle: (b, s) => { o._baslik.push(String(b)); }
  };
  o.playSound = (ad, sec) => { o._ses.push({ ad, nasil: "oyuncu" }); };
  _durum.oyuncular = [o];
  _durum.boyut = D.boyut;
  _durum.ozellikler.delete(ayar.EFSANE_KAYIT_ANAHTAR);
  _durum.ozellikler.delete(ayar.EFSANE_MUZIK_KAYIT_ANAHTAR);
  efs.efsaneUnut();
  muz.efsaneMuzikUnut();
  return { D, o };
}

/* Zinciri kur (kok yaz) -- yapinin kendisini ormeye gerek yok,
   muzik konumla calisiyor.                                  */
function zinciriKur() {
  _durum.ozellikler.set(ayar.EFSANE_KAYIT_ANAHTAR, JSON.stringify(KOKNOKTA));
}

function ilerlet(o, n = 1) {
  for (let i = 0; i < n; i++) {
    tickIlerlet(ayar.EFSANE_MUZIK_TARAMA);
    muz.efsaneMuzikTara([o]);
  }
}

function duragaGit(o, i) {
  const n = efs.zincirNoktasi(KOKNOKTA, i);
  o.location = { x: n.x, y: 64, z: n.z };
}

console.log("=== 1. SES PAKETTE VE KAYITLI ===");
{
  const y = RP + "/sounds/efsane/efsane_muzik.ogg";
  kontrol("muzik dosyasi pakette", existsSync(y));
  if (existsSync(y)) {
    const boy = readFileSync(y).length;
    kontrol("  bos degil", boy > 100000, Math.round(boy / 1024) + " KB");
  }
  const sd = RP + "/sounds/sound_definitions.json";
  kontrol("sound_definitions var", existsSync(sd));
  if (existsSync(sd)) {
    const d = oku(sd).sound_definitions[ayar.EFSANE_MUZIK_SES];
    kontrol("  ses ayardaki adla KAYITLI", !!d, ayar.EFSANE_MUZIK_SES);
    /* Kayit olmadan playSound sessizce hicbir sey yapar --
       oyunda "muzik calmiyor" der, hicbir hata gorunmez.   */
    if (d) {
      kontrol("  kategori music (oyunun muzigini susturuyor)",
              d.category === "music", String(d.category));
      kontrol("  dosya yolu doku degil SES klasoru",
              d.sounds[0].name === "sounds/efsane/efsane_muzik",
              d.sounds[0].name);
      /* stream: 1 MB'lik bir parca bellege komple yuklenmesin. */
      kontrol("  stream acik", d.sounds[0].stream === true);
    }
  }
}

console.log("");
console.log("=== 2. UCUNU DE GORMEDEN CALMIYOR ===");
{
  const { o } = kur();
  zinciriKur();

  ilerlet(o, 3);
  kontrol("uzaktayken hicbir sey olmuyor",
          muz.efsaneMuzikDurum(o.id).gorulen === 0);

  duragaGit(o, 0); ilerlet(o, 1);
  kontrol("1. durak gorildi", muz.efsaneMuzikDurum(o.id).gorulen === 1,
          String(muz.efsaneMuzikDurum(o.id).gorulen));
  kontrol("  muzik HENUZ calmadi", o._ses.length === 0);

  duragaGit(o, 1); ilerlet(o, 1);
  kontrol("2. durak gorildi", muz.efsaneMuzikDurum(o.id).gorulen === 2,
          String(muz.efsaneMuzikDurum(o.id).gorulen));
  kontrol("  muzik HALA calmadi (iki yetmiyor)", o._ses.length === 0);

  /* Ayni duraga tekrar ugramak sayiyi artirmamali. */
  duragaGit(o, 0); ilerlet(o, 2);
  kontrol("ayni durak IKI KEZ sayilmiyor",
          muz.efsaneMuzikDurum(o.id).gorulen === 2,
          String(muz.efsaneMuzikDurum(o.id).gorulen));

  duragaGit(o, 2); ilerlet(o, 1);
  kontrol("UCUNCU durakta muzik CALDI", o._ses.length === 1,
          o._ses.length + " ses: " + JSON.stringify(o._ses));
  kontrol("  calan ses ayardaki ses",
          o._ses[0] && o._ses[0].ad === ayar.EFSANE_MUZIK_SES,
          o._ses[0] && o._ses[0].ad);
  kontrol("  ekrana baslik dustu", o._baslik.length > 0,
          o._baslik.join(" / "));
  kontrol("  durum artik 'caldi'", muz.efsaneMuzikDurum(o.id).caldi === true);
}

console.log("");
console.log("=== 3. BIR KEZ CALIYOR ===");
{
  /* En kolay hata bicimi: her taramada yeniden calmak.
     Uc durak da gorulduyse oyuncu zaten oradadir; kontrol
     olmasa muzik saniyede bir bastan baslardi.             */
  const { o } = kur();
  zinciriKur();
  for (let i = 0; i < 3; i++) { duragaGit(o, i); ilerlet(o, 1); }
  kontrol("bir kez caldi", o._ses.length === 1, o._ses.length + " kez");
  ilerlet(o, 30);
  kontrol("30 tarama daha: HALA bir kez", o._ses.length === 1,
          o._ses.length + " kez");
}

console.log("");
console.log("=== 4. CIKIP GIRINCE BASTAN CALMIYOR ===");
{
  /* Kayit dunyada duruyor. Ilk yazarken maskeyi TAMAM olarak
     saklamak, dunyaya her girişte muzigin yeniden calmasi
     demekti; "caldi" ayri bir isaret (-1).                 */
  const { o } = kur();
  zinciriKur();
  for (let i = 0; i < 3; i++) { duragaGit(o, i); ilerlet(o, 1); }
  const kayit = _durum.ozellikler.get(ayar.EFSANE_MUZIK_KAYIT_ANAHTAR);
  kontrol("dunya kaydi yazildi", typeof kayit === "string", String(kayit));

  muz.efsaneMuzikUnut();                       // dunyadan cikis
  _durum.ozellikler.set(ayar.EFSANE_MUZIK_KAYIT_ANAHTAR, kayit);  // giris
  o._ses.length = 0;
  ilerlet(o, 5);
  kontrol("geri girince YENIDEN calmiyor", o._ses.length === 0,
          o._ses.length + " kez");
  kontrol("  'gordum' bilgisi de kaybolmadi",
          muz.efsaneMuzikDurum(o.id).caldi === true);

  /* Yarim kalan ilerleme de korunmali: iki durak bulan biri
     dunyadan cikip girince bastan baslamamali.             */
  const b = kur();
  zinciriKur();
  duragaGit(b.o, 0); ilerlet(b.o, 1);
  duragaGit(b.o, 1); ilerlet(b.o, 1);
  const yarim = _durum.ozellikler.get(ayar.EFSANE_MUZIK_KAYIT_ANAHTAR);
  muz.efsaneMuzikUnut();
  _durum.ozellikler.set(ayar.EFSANE_MUZIK_KAYIT_ANAHTAR, yarim);
  b.o.location = { x: 5000, y: 64, z: 5000 };
  ilerlet(b.o, 1);
  kontrol("iki durak bulmus olmak KORUNUYOR",
          muz.efsaneMuzikDurum(b.o.id).gorulen === 2,
          String(muz.efsaneMuzikDurum(b.o.id).gorulen));
}

console.log("");
console.log("=== 5. ZINCIR YOKKEN HIC DONMUYOR ===");
{
  /* Deponun kurali: defter bosken hic donme. Efsane hic
     kurulmamis bir dunyada bu tarama tick butcesinden
     yememeli.                                             */
  const { D, o } = kur();          // zincir KURULMADI
  const once = D.sayac.getBlock;
  o.location = { x: 0, y: 64, z: 0 };
  ilerlet(o, 20);
  kontrol("kok yokken hicbir sey olmuyor",
          muz.efsaneMuzikDurum(o.id).gorulen === 0);
  kontrol("hic blok okunmuyor", D.sayac.getBlock === once,
          (D.sayac.getBlock - once) + " okuma");

  /* Zincir VARKEN de blok okumamali: konum karsilastirmasi
     yeterli (Dusmus'te getBlock uc testi birden dusurmustu). */
  zinciriKur();
  const once2 = D.sayac.getBlock;
  for (let i = 0; i < 3; i++) { duragaGit(o, i); ilerlet(o, 1); }
  kontrol("zincir varken de hic blok okunmuyor",
          D.sayac.getBlock === once2, (D.sayac.getBlock - once2) + " okuma");
  kontrol("  ama muzik yine caldi", o._ses.length === 1);
}

console.log("");
console.log("=== 6. ULASILABILIYOR MU ===");
{
  /* efsane.js iki kez yazilip baglanmamisti (v6.3 ve
     konseySilahKir). Tarama merkezi tick'e BAGLI mi?      */
  const kaynak = readFileSync(BP + "/scripts/main.js", "utf8");
  kontrol("main.js efsane_muzik.js'i import ediyor",
          kaynak.includes('from "./yetenekler/efsane_muzik.js"'));
  kontrol("tarama merkezi tick'ten CAGRILIYOR",
          /efsaneMuzikTara\(oyuncular\)/.test(kaynak));
  kontrol("ayar kapisi var",
          typeof ayar.EFSANE_MUZIK_ACIK === "boolean",
          String(ayar.EFSANE_MUZIK_ACIK));
  kontrol("efsane_muzik.js ayara BAKIYOR",
          readFileSync(BP + "/scripts/yetenekler/efsane_muzik.js", "utf8")
            .includes("EFSANE_MUZIK_ACIK"));
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> efsane muzigi calisiyor");
process.exit(hata ? 1 : 0);
