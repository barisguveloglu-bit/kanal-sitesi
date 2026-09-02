/* BEN 10 AKTIF SALDIRILARI                                  v6.1

   Kullanici: "aktif saldirilari da bitirelim... referans da bazen
   yanlis bilgi verebiliyor, o yuzden dosyayi tekrardan atacagim."

   Tam da bu yuzden bu dosyanin ILK bolumu tabloyu REFERANSLA
   degil JAR'LA karsilastiriyor: 54 satirin her biri modun kendi
   `powers/<tur>.json` dosyasindaki yetenegi adiyla gosteriyor
   (`kaynak` alani) ve sayilar oradan dogrulaniyor.

   Digerlerinin tuttugu sey:
     2. Ulasilabilirlik -- kayitli olmak yetmez, ESYAYA BAGLI
        olmali (v4.83 dersi).
     3. Kapi -- yanlis yaratik elindeyken saldiri OLMAMALI.
        Yoksa Atomik'in nukleer topunu Gri Madde'yle atardin.
     4. Alan hasari yariçapa uyuyor mu, uzaktaki vurulmuyor mu.
     5. Mermi gercekten vuruyor mu, menzil tavani tutuyor mu.
     6. Bekleme ikinci atisi kesiyor mu.
     7. Isin cevrimi (x20) dogru mu.                            */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, _durum } from "@minecraft/server";
import { readFileSync, existsSync } from "node:fs";

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const JAR = "/tmp/ae";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };
sus();
await import("./pack/main.js");
ac();

const ayar = await import("./pack/ayarlar.js");
const kayit = await import("./pack/yetenekler/kayit.js");
const kollar = await import("./pack/yetenekler/kollar.js");
const sald = await import("./pack/yetenekler/ben10_saldiri.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const oku = (y) => JSON.parse(readFileSync(y, "utf8"));
const yetenek = (k) => kayit.tumYetenekler().find((y) => y.kimlik === k);

/* Sahte dunya: elinde `elde` esyasi olan bir oyuncu ve
   istenen konumlarda hedefler.                              */
function kur(elde, hedefler = []) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 },
                      { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "b1"; o.typeId = "minecraft:player";
  o.location = { x: 0.5, y: 90, z: 0.5 };
  o._elde = elde;
  const eskiGet = o.getComponent.bind(o);
  o.getComponent = (ad) => {
    if (ad === "minecraft:equippable") {
      return {
        getEquipment: (y) => (y === "Mainhand" && o._elde
          ? { typeId: o._elde } : undefined),
        setEquipment: () => true
      };
    }
    return eskiGet(ad);
  };
  o.addEffect = () => true;
  o.getEffect = () => undefined;
  o.sendMessage = () => {};
  o.onScreenDisplay = { setActionBar: () => {} };
  o.getViewDirection = () => ({ x: 0, y: 0, z: 1 });
  o.getHeadLocation = () => ({ x: 0.5, y: 91.6, z: 0.5 });
  o.getEntitiesFromViewDirection = () => [];
  o.applyKnockback = () => { o._itildi = (o._itildi || 0) + 1; return true; };

  const varliklar = [o];
  for (const h of hedefler) {
    const v = {
      id: h.id, typeId: "minecraft:zombie", isValid: true,
      location: { x: h.x, y: h.y, z: h.z },
      _hasar: 0, _yakildi: 0, _itildi: 0,
      applyDamage(n) { v._hasar += n; return true; },
      setOnFire(n) { v._yakildi = n; return true; },
      applyKnockback() { v._itildi++; return true; },
      getComponent: () => undefined
    };
    varliklar.push(v);
  }
  D.boyut._varliklar = varliklar;
  _durum.oyuncular = [o];
  _durum.boyut = D.boyut;
  sald.ben10SaldiriUnut();
  return { D, o, hedef: (id) => varliklar.find((v) => v.id === id) };
}

console.log("=== 1. TABLO JAR'LA BIREBIR MI ===");
{
  const P = JAR + "/data/alienevo_aliens/palladium/powers/";
  if (!existsSync(P + "tetramand.json")) {
    console.log("  · jar diskte degil, karsilastirma atlandi");
  } else {
    /* Bizim taban adimiz -> modun guc dosyasi. kol_uret.py'den
       okunuyor ki iki yerde yazilmasin.                       */
    const uretec = readFileSync(KOK + "/kol_uret.py", "utf8");
    const tabanBlok = uretec.slice(uretec.indexOf("BEN10_TABAN = ["),
                                   uretec.indexOf("# ---- OLCEK HANGI YETENEKTEN"));
    const dosyaBlok = uretec.slice(uretec.indexOf("BEN10_GUC_DOSYA = {"),
                                   uretec.indexOf("# (anahtar, TR ad, EN ad, geo dosyalari, tur adi)"));
    const turDosya = {};
    for (const m of dosyaBlok.matchAll(/"([^"]+)":\s*"([a-z_]+)",/g)) turDosya[m[1]] = m[2];
    const tabanTur = {};
    for (const m of tabanBlok.matchAll(
        /\("(\w+)",\s*"[^"]*",\s*"[^"]*",\s*"([^"]*)",/g)) tabanTur[m[1]] = m[2];

    let sapan = 0, bakilan = 0;
    for (const [kimlik, t] of ayar.BEN10_SALDIRI) {
      const dosya = turDosya[tabanTur[t.yaratik]];
      if (!dosya || !existsSync(P + dosya + ".json")) {
        kontrol(kimlik + ": kaynak dosyasi bulundu", false, String(dosya));
        continue;
      }
      const v = (oku(P + dosya + ".json").abilities || {})[t.kaynak];
      if (!v) { kontrol(kimlik + ": '" + t.kaynak + "' modda var", false); continue; }
      bakilan++;
      if (t.tur === "alan") {
        const h = Number(v.damage ?? v.base_damage ?? 0);
        const r = Number(v.radius ?? 0);
        if (h !== t.hasar || r !== t.yaricap) {
          sapan++;
          kontrol(kimlik + ": alan sayilari birebir", false,
                  `kaynak ${h}/${r} · tablo ${t.hasar}/${t.yaricap}`);
        }
      } else if (t.tur === "atilma") {
        const g = Number(v.motion ?? v.boost_strength ?? v.y_motion_boost ?? 0);
        if (g !== t.guc) {
          sapan++;
          kontrol(kimlik + ": itme gucu birebir", false, `${g} vs ${t.guc}`);
        }
      } else {
        const ed = v.entity_data || {};
        let h = ed.Damage;
        if ((h === undefined || h === 0) && v.damage_from_player) {
          /* Bu iki mermide hasar oyuncunun saldirisindan
             geliyor; tablo o yuzden `hasarKaynak: "oyuncu"`
             isaretli. Sayi turun attack_damage'i.            */
          if (t.hasarKaynak !== "oyuncu") {
            sapan++;
            kontrol(kimlik + ": damage_from_player isaretli", false);
          }
          h = t.hasar;
        }
        if (Number(h) !== t.hasar) {
          sapan++;
          kontrol(kimlik + ": mermi hasari birebir", false,
                  `kaynak ${h} · tablo ${t.hasar}`);
        }
        const hiz = Number(v.velocity ?? v.speed ?? 1);
        if (hiz !== t.hiz) {
          sapan++;
          kontrol(kimlik + ": mermi hizi birebir", false, `${hiz} vs ${t.hiz}`);
        }
      }
    }
    kontrol("54 saldirinin hepsi jar'da bulundu", bakilan === 54,
            bakilan + "/54");
    kontrol("hicbir sayi kaynaktan sapmiyor", sapan === 0, sapan + " sapma");

    /* Menzil tavani UYDURMA degil, KESME olmali: kesilen her
       satirda kaynagin kendi sayisi duruyor ve tavandan
       BUYUK olmali.                                          */
    let kesik = 0, yanlisKesik = 0;
    for (const [, t] of ayar.BEN10_SALDIRI) {
      if (t.kaynakMenzil === undefined) continue;
      kesik++;
      if (!(t.kaynakMenzil > ayar.BEN10_MERMI_TAVAN &&
            t.menzil === ayar.BEN10_MERMI_TAVAN)) yanlisKesik++;
    }
    kontrol("kesilen menziller dogru isaretli", yanlisKesik === 0,
            kesik + " kesik, " + yanlisKesik + " hatali");
  }
}

console.log("");
console.log("=== 2. HEPSI KAYITLI VE ESYAYA BAGLI ===");
{
  const eksik = [];
  for (const k of ayar.BEN10_SALDIRI.keys()) if (!yetenek(k)) eksik.push(k);
  kontrol("54 saldiri kayit defterinde", eksik.length === 0,
          eksik.join(", ") || "54/54");

  /* Kayitli olmak yetmez: yaratik esyasina BAGLI olmali,
     yoksa esyayla tetiklenemez.                             */
  const bagli = new Set(kollar.BEN10_YETENEKLERI.map(([, y]) => y));
  const baglanmayan = [...ayar.BEN10_SALDIRI.keys()].filter((k) => !bagli.has(k));
  kontrol("hepsi bir yaratik esyasina bagli", baglanmayan.length === 0,
          baglanmayan.join(", ") || "tamam");

  /* Baglandigi esya DOGRU yaratigin olmali. */
  let yanlis = 0;
  for (const [esya, y] of kollar.BEN10_YETENEKLERI) {
    const t = ayar.BEN10_SALDIRI.get(y);
    if (!t) continue;                       // mekanik ya da isin
    const k = ayar.BEN10.get(esya.slice(3));
    if (!k || k.taban !== t.yaratik) yanlis++;
  }
  kontrol("her saldiri KENDI yaratigina bagli", yanlis === 0, yanlis + " yanlis");

  /* Jest sirasi benzersiz olmali: esit olsaydi menudeki sira
     import sirasina kalirdi.                                */
  const siralar = kayit.tumYetenekler().map((y) => y.sira);
  kontrol("jest siralari benzersiz",
          new Set(siralar).size === siralar.length,
          siralar.length + " yetenek");
}

console.log("");
console.log("=== 3. KAPI: YANLIS YARATIK -> SALDIRI YOK ===");
{
  const t = ayar.BEN10_SALDIRI.get("ben_sald_atomik_nuke_winner");
  const y = yetenek("ben_sald_atomik_nuke_winner");
  /* Elinde GRI MADDE varken Atomik'in nukleer topu atilmamali. */
  const a = kur("pa:ben_gri", [{ id: "h1", x: 0.5, y: 90, z: 3 }]);
  const is1 = y.olustur(a.o);
  kontrol("yanlis yaratikla mermi isi ACILMIYOR", is1 === undefined);
  kontrol("hedef hic hasar almadi", a.hedef("h1")._hasar === 0);

  /* Dogru yaratikla acilmali. */
  const b = kur("pa:ben_atomik", [{ id: "h1", x: 0.5, y: 90, z: 3 }]);
  const is2 = y.olustur(b.o);
  kontrol("dogru yaratikla is aciliyor", is2 !== undefined && !!is2.calis);
  kontrol("  isin sahibi dogru oyuncu", is2 && is2.oyuncuId === "b1");

  /* BICIM fark etmemeli: uc bicim ayni turun gorunumleri. */
  const c = kur("pa:ben_atomik", []);
  kontrol("taban adiyla kapi aciliyor", y.olustur(c.o) !== undefined);
  const d = kur("pa:ben_elmas_10k", [{ id: "h1", x: 0.5, y: 90, z: 3 }]);
  const ye = yetenek("ben_sald_elmas_diamond_shards_base");
  kontrol("10K bicimi de Elmas Kafa sayiliyor", ye.olustur(d.o) !== undefined);
}

console.log("");
console.log("=== 4. ALAN HASARI: YARICAP TUTUYOR MU ===");
{
  /* Supernova: 15 blok yariçap, 100 hasar. Icerideki vurulmali,
     disaridaki VURULMAMALI -- yariçap uydurulmus olsaydi ya da
     tarama menzili yanlis olsaydi bu tutmazdi.               */
  const t = ayar.BEN10_SALDIRI.get("ben_sald_ates_supernova_damage");
  kontrol("Supernova tabloda", !!t && t.hasar === 100 && t.yaricap === 15);
  const a = kur("pa:ben_ates", [
    { id: "yakin", x: 0.5, y: 90, z: 5 },      // 4.5 blok
    { id: "sinir", x: 0.5, y: 90, z: 14 },     // 13.5 blok
    { id: "uzak",  x: 0.5, y: 90, z: 30 }      // 29.5 blok
  ]);
  yetenek("ben_sald_ates_supernova_damage").olustur(a.o);
  kontrol("yakindaki vuruldu", a.hedef("yakin")._hasar === 100,
          String(a.hedef("yakin")._hasar));
  kontrol("yariçap icindeki vuruldu", a.hedef("sinir")._hasar === 100);
  kontrol("disaridaki VURULMADI", a.hedef("uzak")._hasar === 0,
          String(a.hedef("uzak")._hasar));
  kontrol("yakma da uygulandi (5 sn)", a.hedef("yakin")._yakildi === 5);
  kontrol("oyuncu KENDINI vurmadi", a.o._hasar === undefined);

  /* Sonik Alkis: hasari YOK, sadece itme. Hasar uydurulmamis
     olmali.                                                  */
  const b = kur("pa:ben_dortkol", [{ id: "h", x: 0.5, y: 90, z: 3 }]);
  yetenek("ben_sald_dortkol_sonic_boom_knockback").olustur(b.o);
  kontrol("Sonik Alkis hasar VERMIYOR", b.hedef("h")._hasar === 0);
  kontrol("Sonik Alkis itiyor", b.hedef("h")._itildi > 0);

  /* Astro Lazer: yatayda 0.5, dikeyde 10 -- SILINDIR. */
  const c = kur("pa:ben_astro", [
    { id: "tepe", x: 0.5, y: 98, z: 0.5 },     // 8 blok yukarida
    { id: "yan",  x: 6.5, y: 90, z: 0.5 }      // 6 blok yanda
  ]);
  yetenek("ben_sald_astro_astro_laser_damage").olustur(c.o);
  kontrol("dikey lazer YUKARIDAKINI vurdu", c.hedef("tepe")._hasar === 10);
  kontrol("dikey lazer YANDAKINI vurmadi", c.hedef("yan")._hasar === 0);
}

console.log("");
console.log("=== 5. MERMI: UCUYOR, VURUYOR, DURUYOR ===");
{
  const t = ayar.BEN10_SALDIRI.get("ben_sald_dortkol_boulder_projectile");
  kontrol("Kaya Firlatma 25 hasar", t.hasar === 25);
  kontrol("  menzil tavana kesilmis", t.menzil === ayar.BEN10_MERMI_TAVAN &&
          t.kaynakMenzil === 630, t.menzil + " (kaynak " + t.kaynakMenzil + ")");

  const a = kur("pa:ben_dortkol", [{ id: "h", x: 0.5, y: 91.6, z: 8 }]);
  const is = yetenek("ben_sald_dortkol_boulder_projectile").olustur(a.o);
  let tur = 0;
  /* Her dongude tick ILERLETILIYOR: mermi tick basina bir adim
     atiyor ve patlama butcesi de tick basina yenileniyor.
     Ilerletmeseydik butce hic acilmaz, is bitmezdi -- ilk
     denemede tam bu oldu ve testin kendisi yanlisti.        */
  while (is.calis() === false && tur < 200) { tickIlerlet(1); tur++; }
  kontrol("mermi hedefe ulasti", a.hedef("h")._hasar === 25,
          a.hedef("h")._hasar + " hasar, " + tur + " tick");
  kontrol("  makul surede bitti (<200 tick)", tur < 200, String(tur));

  /* AYNI hedefe iki kez vurmamali. */
  kontrol("tek hedefe tek hasar", a.hedef("h")._hasar === 25);

  /* Hedef YOKSA menzil tavaninda durmali, sonsuza gitmemeli. */
  const b = kur("pa:ben_dortkol", []);
  const is2 = yetenek("ben_sald_dortkol_boulder_projectile").olustur(b.o);
  let tur2 = 0;
  while (is2.calis() === false && tur2 < 500) { tickIlerlet(1); tur2++; }
  kontrol("hedefsiz mermi menzilde durdu", tur2 < 200, tur2 + " tick");
}

console.log("");
console.log("=== 6. BEKLEME IKINCI ATISI KESIYOR ===");
{
  const a = kur("pa:ben_ates", [{ id: "h", x: 0.5, y: 90, z: 3 }]);
  const y = yetenek("ben_sald_ates_supernova_damage");
  y.olustur(a.o);
  const ilk = a.hedef("h")._hasar;
  y.olustur(a.o);                       // hemen tekrar
  kontrol("bekleme dolmadan ikinci vurus YOK",
          a.hedef("h")._hasar === ilk, a.hedef("h")._hasar + " vs " + ilk);
  tickIlerlet(ayar.BEN10_SALDIRI_BEKLEME + 2);
  y.olustur(a.o);
  kontrol("bekleme dolunca yeniden vuruyor",
          a.hedef("h")._hasar > ilk, String(a.hedef("h")._hasar));
}

console.log("");
console.log("=== 7. ISINLAR: x20 CEVRIMI ===");
{
  /* Isinlar SUREKLI (her tick hasar), bizimki tek atis +
     bekleme. Saniyelik hasarin ayni kalmasi icin:
       tek atis = tick basina hasar x ZIRH_ISIN_BEKLEME
     Ayni kural zirh ve Marvel isinlarinda da gecerli.       */
  kontrol("2 Ben 10 isini var", ayar.BEN10_ISIN.size === 2);
  for (const [kimlik, t] of ayar.BEN10_ISIN) {
    kontrol(kimlik + ": x20 cevrimi dogru",
            t.hasar === t.kaynakHasar * ayar.ZIRH_ISIN_BEKLEME,
            t.kaynakHasar + " x " + ayar.ZIRH_ISIN_BEKLEME + " = " + t.hasar);
    kontrol(kimlik + ": kayitli", !!yetenek(kimlik));
  }
  const P = JAR + "/data/alienevo_aliens/palladium/powers/";
  if (existsSync(P + "pyronite.json")) {
    const p = oku(P + "pyronite.json").abilities.dual_beam_pro;
    const t = ayar.BEN10_ISIN.get("ben_isin_ates");
    kontrol("Ates Isini kaynakta 9 hasar / 15 blok",
            p.damage === t.kaynakHasar && p.max_distance === t.menzil,
            p.damage + " / " + p.max_distance);
    const n = oku(P + "necrofriggian.json").abilities.ice_breath;
    const b = ayar.BEN10_ISIN.get("ben_isin_buz");
    kontrol("Buz Nefesi kaynakta 3 hasar / 10 blok",
            n.damage === b.kaynakHasar && n.max_distance === b.menzil,
            n.damage + " / " + n.max_distance);
  }

  /* Kapi isinlarda da gecerli olmali. */
  const a = kur("pa:ben_gri", [{ id: "h", x: 0.5, y: 91.6, z: 5 }]);
  yetenek("ben_isin_ates").olustur(a.o);
  kontrol("yanlis yaratikla isin ATMIYOR", a.hedef("h")._hasar === 0);
  const b = kur("pa:ben_ates_proto", [{ id: "h", x: 0.5, y: 91.6, z: 5 }]);
  yetenek("ben_isin_ates").olustur(b.o);
  kontrol("dogru yaratikla isin vuruyor", b.hedef("h")._hasar === 180,
          String(b.hedef("h")._hasar));
}

console.log("");
console.log(hata ? ">>> SORUN VAR"
                 : ">>> Ben 10 saldirilari: " + ayar.BEN10_SALDIRI.size +
                   " saldiri + " + ayar.BEN10_ISIN.size + " isin yerinde");
process.exit(hata ? 1 : 0);
