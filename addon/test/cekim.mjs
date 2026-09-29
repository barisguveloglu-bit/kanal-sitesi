/* CEKIM SETI                                             v7.99.6

   Video icin oyun ici cekim: aktor, kamera, sahne.

   ---- BU DOSYANIN TUTTUGU EN ONEMLI SEY ----
   CIKIS GARANTISI (sinematik.mjs ile ayni kural). Serbest kamera
   kendiliginden bitmez; HUD gizli kalirsa ya da kameraman
   gorunmez kalirsa oyun bozuk sanilir. "dur", sahnenin sonu,
   tavan -- ucunde de kamera birakiliyor, HUD geri geliyor,
   gorunmezlik kalkiyor.

   Ikincisi: kamera GERCEKTEN hedefe bakiyor. Her acinin komutu
   cozulup yonu olculuyor; "bir komut yazildi" yetmiyor.     */
import { tickIlerlet, _durum } from "@minecraft/server";
import { readFileSync, existsSync } from "node:fs";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };
sus();
await import("./pack/main.js");
ac();
const ayar = await import("./pack/ayarlar.js");
const C = await import("./pack/yetenekler/cekim.js");
const { AKTOR_KIMLIK, AKTOR_SKINLER } = await import("./pack/yetenekler/_aktor_skinleri.js");
const { WOM_KILIC_SETLER } = await import("./pack/yetenekler/_wom_hareket.js");
const sohbet = await import("./pack/sohbet.js");
const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

/* ---- sahte dunya: aktorleri tasiyan boyut ---- */
function dunya() {
  const varliklar = [];
  let sayi = 0;
  const efektler = [];
  const boyut = {
    id: "minecraft:overworld",
    _efekt: efektler,
    spawnParticle(ad, k) { efektler.push({ tur: "parcacik", ad, k }); },
    playSound(ad, k) { efektler.push({ tur: "ses", ad, k }); },
    getEntities(s) {
      return varliklar.filter((v) => v.isValid && (!s || !s.type || v.typeId === s.type));
    },
    spawnEntity(tip, k) {
      const v = aktor(tip, k, "a" + (++sayi));
      varliklar.push(v);
      return v;
    }
  };
  function aktor(tip, k, id) {
    const v = {
      id, typeId: tip, isValid: true, dimension: boyut,
      location: { x: k.x, y: k.y, z: k.z },
      _tag: [], _ozellik: {}, _anim: [], _komut: [], _hasar: [], _itme: [], _bakis: { x: 0, z: 1 },
      addTag(t) { this._tag.push(t); return true; },
      getTags() { return this._tag.slice(); },
      setProperty(a, d) { this._ozellik[a] = d; },
      getProperty(a) { return this._ozellik[a]; },
      teleport(n, sec) {
        this.location = { x: n.x, y: n.y, z: n.z };
        if (sec && sec.facingLocation) {
          const dx = sec.facingLocation.x - n.x, dz = sec.facingLocation.z - n.z;
          const b = Math.hypot(dx, dz);
          if (b > 1e-6) this._bakis = { x: dx / b, z: dz / b };
        }
      },
      getViewDirection() { return { x: this._bakis.x, y: 0, z: this._bakis.z }; },
      playAnimation(a, s) { this._anim.push(a); },
      runCommand(k) { this._komut.push(k); return { successCount: 1 }; },
      applyDamage(n, s) { this._hasar.push({ n, kim: s && s.damagingEntity && s.damagingEntity.id }); return true; },
      applyKnockback(a, b, c, d) { this._itme.push([a, b, c, d]); },
      getComponent() { return undefined; },
      _dp: {},
      setDynamicProperty(a, d) { this._dp[a] = d; },
      getDynamicProperty(a) { return this._dp[a]; },
      remove() { this.isValid = false; }
    };
    return v;
  }
  return { boyut, varliklar };
}
function oyuncu(D, id = "kameraman") {
  return {
    id, typeId: "minecraft:player", name: id, isValid: true, dimension: D.boyut,
    location: { x: 0.5, y: 64, z: 0.5 },
    _komut: [], _efekt: [], _kalkan: [], _mesaj: [], _alt: [],
    onScreenDisplay: { setActionBar(m) { this._o._alt.push(String(m)); }, _o: null },
    getViewDirection: () => ({ x: 0, y: 0, z: 1 }),
    runCommand(k) { this._komut.push(k); return { successCount: 1 }; },
    addEffect(a, s, o) { this._efekt.push(a); },
    removeEffect(a) { this._kalkan.push(a); return true; },
    sendMessage(m) { this._mesaj.push(String(m)); },
    hasTag: () => true, getTags: () => []
  };
}
function oyuncuK(D, id) { const o = oyuncu(D, id); o.onScreenDisplay._o = o; return o; }
const kom = (o, metin) => C.cekimKomutu(o, metin.split(" "));
const tick = (n) => { sus(); tickIlerlet(n); ac(); };
const son = (o, onek) => o._komut.filter((k) => k.startsWith(onek)).slice(-1)[0];

/* Kamera komutunu coz: konum + bakis yonu. */
function kameraCoz(k) {
  const m = /pos (\S+) (\S+) (\S+) rot (\S+) (\S+)/.exec(k || "");
  if (!m) return undefined;
  const [x, y, z, pitch, yaw] = m.slice(1).map(Number);
  const p = pitch * Math.PI / 180, ya = yaw * Math.PI / 180;
  return { poz: { x, y, z }, yon: { x: -Math.sin(ya) * Math.cos(p), y: -Math.sin(p), z: Math.cos(ya) * Math.cos(p) } };
}
function aciFark(yon, poz, hedef) {
  const d = { x: hedef.x - poz.x, y: hedef.y - poz.y, z: hedef.z - poz.z };
  const b = Math.hypot(d.x, d.y, d.z);
  const cos = (yon.x * d.x + yon.y * d.y + yon.z * d.z) / b;
  return Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI;
}

console.log("=== 1. AKTOR KURMA ===");
{
  C.cekimSifirla();
  const D = dunya();
  const o = oyuncuK(D);
  const c1 = kom(o, "aktor a");
  const a = C.aktorBul(D.boyut, "a");
  kontrol("aktor kuruldu ve adiyla bulunuyor", !!a && a.typeId === AKTOR_KIMLIK, c1);
  kontrol("  oyuncunun 2,5 blok onunde", a && Math.abs(a.location.z - 3.0) < 1e-6, a && JSON.stringify(a.location));
  kontrol("  oyuncuya donuk", a && a._bakis.z < -0.99);
  kontrol("  varsayilan skin 0 (" + AKTOR_SKINLER[0].ad + ")", a && a._ozellik["pa:skin"] === 0);
  kom(o, "aktor b raxxan");
  const b = C.aktorBul(D.boyut, "b");
  const rx = AKTOR_SKINLER.findIndex((s) => s.ad === "raxxan");
  kontrol("skin adla seciliyor (varsayilan degil)", rx > 0 && b && b._ozellik["pa:skin"] === rx);
  o.location = { x: 10.5, y: 64, z: 0.5 };
  kom(o, "aktor a");
  kontrol("ayni ad ikinci kez: yenisi dogmuyor, tasiniyor",
          D.varliklar.length === 2 && Math.abs(C.aktorBul(D.boyut, "a").location.x - 10.5) < 1e-6);
  kontrol("  skin korunuyor (skin verilmedi)", C.aktorBul(D.boyut, "a")._ozellik["pa:skin"] === 0);
  kontrol("bilinmeyen skin reddediliyor", kom(o, "aktor c yoklukskin").startsWith("§c") && D.varliklar.length === 2);
  kontrol("'ben' aktor adi olamiyor", kom(o, "aktor ben").startsWith("§c"));
  kontrol("skin sayiyla da seciliyor", (kom(o, "skin a 1"), C.aktorBul(D.boyut, "a")._ozellik["pa:skin"] === 1));
  kontrol("liste iki aktoru gosteriyor", /a, b|b, a/.test(kom(o, "liste")));
  kom(o, "sil b");
  kontrol("sil: tek aktor", !C.aktorBul(D.boyut, "b") && !!C.aktorBul(D.boyut, "a"));
  kom(o, "temizle");
  kontrol("temizle: hepsi", D.boyut.getEntities({ type: AKTOR_KIMLIK }).length === 0);
}

console.log("\n=== 2. YURUME ===");
{
  C.cekimSifirla();
  const D = dunya();
  const o = oyuncuK(D);
  kom(o, "aktor a");
  const a = C.aktorBul(D.boyut, "a");
  a._bakis = { x: 1, z: 0 };
  const bas = { ...a.location };
  kom(o, "git a ileri 6");
  tick(10);
  const on = a.location.x - bas.x;
  kontrol("10 tickte yurume hizi (" + (ayar.CEKIM_YURU * 10).toFixed(2) + " blok)",
          Math.abs(on - ayar.CEKIM_YURU * 10) < 1e-6, on.toFixed(3));
  tick(40);
  kontrol("6 blokta duruyor, gecmiyor", Math.abs(a.location.x - bas.x - 6) < 0.06, (a.location.x - bas.x).toFixed(3));
  kom(o, "aktor b");
  const b = C.aktorBul(D.boyut, "b");
  b.location = { x: a.location.x + 10, y: 64, z: a.location.z };
  kom(o, "git a b kos");
  tick(60);
  const ara = Math.hypot(b.location.x - a.location.x, b.location.z - a.location.z);
  kontrol("hedefe kosup CEKIM_VARIS kala duruyor", Math.abs(ara - ayar.CEKIM_VARIS) < 0.02, ara.toFixed(3));
}

console.log("\n=== 3. DOVUS: WoM KOMBOSU ===");
{
  C.cekimSifirla();
  const D = dunya();
  const o = oyuncuK(D);
  kom(o, "aktor a");
  kom(o, "aktor b");
  const a = C.aktorBul(D.boyut, "a"), b = C.aktorBul(D.boyut, "b");
  a.location = { x: 0.5, y: 64, z: 0.5 };
  b.location = { x: 0.5, y: 64, z: 2.5 };
  kom(o, "esya a pa:wom_ruine");
  kontrol("esya komutu elde tutturuyor",
          a._komut.some((k) => k === "replaceitem entity @s slot.weapon.mainhand 0 pa:wom_ruine"), a._komut.slice(-1)[0]);
  const oto = WOM_KILIC_SETLER.ruine.saldirilar.filter((x) => x.tur === "oto");
  const s1 = kom(o, "vur a b");
  kontrol("eldeki WoM seti kullaniliyor (ruine)", a._anim[0] === oto[0].anim, a._anim[0]);
  const temas = Math.round(oto[0].fazlar[0].contact * 20);
  tick(temas - 1);
  kontrol("temas anindan ONCE hasar yok", b._hasar.length === 0);
  tick(2);
  kontrol("temas aninda tek hasar", b._hasar.length === 1 && b._hasar[0].kim === a.id, JSON.stringify(b._hasar));
  kontrol("  geri itildi", b._itme.length >= 1);
  const ilerleme = a.location.z - 0.5;
  kontrol("hamle: aktor iz boyunca one gitti", ilerleme > 0.5, ilerleme.toFixed(2) + " blok");
  tick(Math.round(oto[0].sure * 20));
  kontrol("vurus bitti, eylem kalmadi", C.cekimDurum().eylem === 0);
  kom(o, "vur a b");
  kontrol("ikinci vurus kombonun ikinci adimi", a._anim[1] === oto[1].anim, a._anim[1]);
  tick(Math.round(oto[1].sure * 20) + ayar.CEKIM_SERI_ARA + 5);
  kom(o, "vur a b");
  kontrol("uzun araliktan sonra kombo basa donuyor", a._anim[2] === oto[0].anim, a._anim[2]);
  C.cekimSifirla();
  b.location = { x: 0.5, y: 64, z: 30 };
  b._hasar.length = 0;
  kom(o, "vur a b yumruk");
  tick(40);
  kontrol("menzil disindaki hedefe hasar yok", b._hasar.length === 0);
  kontrol("bilinmeyen set reddediliyor", kom(o, "vur a b yokset").startsWith("§c"));
  kontrol("animasyon kisa adla oynuyor",
          (kom(o, "oyna a ruine.ruine_auto_1"), a._anim.slice(-1)[0] === "animation.wom.ruine.ruine_auto_1"));
}

console.log("\n=== 4. KAMERA HEDEFE BAKIYOR ===");
{
  C.cekimSifirla();
  const D = dunya();
  const o = oyuncuK(D);
  kom(o, "aktor a"); kom(o, "aktor b");
  const a = C.aktorBul(D.boyut, "a"), b = C.aktorBul(D.boyut, "b");
  a.location = { x: 0, y: 64, z: 0 }; b.location = { x: 4, y: 64, z: 0 };
  a._bakis = { x: 1, z: 0 };
  for (const kalip of C.KAMERA_KALIPLARI) {
    o._komut.length = 0;
    const c = kom(o, "kamera " + kalip + " a b");
    const n = C.kameraNoktasi(kalip, a, b, 0);
    const k = kameraCoz(son(o, "camera @s set minecraft:free"));
    const fark = k ? aciFark(k.yon, k.poz, n.bak) : 999;
    kontrol(kalip + ": komut cozuldu, bakis hedefe " + fark.toFixed(1) + "°", !!k && fark < 1.0, c);
  }
  const yan = C.kameraNoktasi("yan", a, b, 0);
  const orta = { x: 2, z: 0 };
  const dikMi = Math.abs((yan.poz.x - orta.x) * 1 + (yan.poz.z - orta.z) * 0) < 1e-6;
  kontrol("yan aci iki aktorun eksenine dik", dikMi);
  const omuz = C.kameraNoktasi("omuz", a, b, 0);
  kontrol("omuz: a'nin arkasinda (b'den uzak tarafta)", omuz.poz.x < a.location.x);
  kontrol("bilinmeyen aci reddediliyor", kom(o, "kamera yamuk a b").startsWith("§c"));
  kontrol("kameraman gorunmez oldu", o._efekt.includes("invisibility"));

  o._komut.length = 0;
  kom(o, "kamera yorunge a b 80");
  const ilk = son(o, "camera @s set");
  tick(ayar.CEKIM_ADIM);
  const ikinci = son(o, "camera @s set");
  kontrol("yorunge kendini guncelliyor", !!ikinci && ikinci !== ilk);
  const p1 = kameraCoz(ilk).poz, p2 = kameraCoz(ikinci).poz;
  const r1 = Math.hypot(p1.x - 2, p1.z), r2 = Math.hypot(p2.x - 2, p2.z);
  /* Komut konumu 2 haneye yuvarliyor: pay 0,02. */
  kontrol("  ortanin etrafinda ayni yaricapta", Math.abs(r1 - r2) < 0.02, r1.toFixed(2) + " / " + r2.toFixed(2));
  kontrol("tek aktorle de calisiyor (yakin a)", !kom(o, "kamera yakin a").startsWith("§c"));
}

console.log("\n=== 5. CIKIS GARANTISI ===");
{
  const bitti = (o) => o._komut.includes("camera @s clear") && o._komut.includes("hud @s reset") &&
                       o._kalkan.includes("invisibility");
  C.cekimSifirla();
  const D = dunya();
  let o = oyuncuK(D);
  kom(o, "aktor a");
  kom(o, "kamera yakin a");
  kom(o, "dur");
  kontrol("'dur': kamera + HUD + gorunmezlik geri alindi", bitti(o), o._komut.join(" | "));
  kontrol("  durum temiz", C.cekimDurum().kamera === 0 && C.cekimDurum().cekimde === 0);

  o = oyuncuK(D, "k2");
  kom(o, "aktor a"); kom(o, "aktor b");
  kom(o, "sahne giris");
  kontrol("sahne basinda HUD gizlendi", o._komut.includes("hud @s hide all"));
  const uzun = Math.max(...ayar.CEKIM_SAHNELER.giris.map((s) => s[0]));
  tick(uzun + 2);
  kontrol("sahne sonu ('birak' satiri): hepsi geri alindi", bitti(o));
  kontrol("  sahne defterden dustu", C.cekimDurum().sahne === 0);

  o = oyuncuK(D, "k3");
  kom(o, "aktor a");
  kom(o, "kamera takip a");
  tick(ayar.CEKIM_TAVAN + ayar.CEKIM_ADIM + 2);
  kontrol("tavan dolunca hareketli kamera birakildi", bitti(o));

  o = oyuncuK(D, "k4");
  kom(o, "kamera yakin ben");
  C.cekimUnut("k4");
  kontrol("oyuncu cikinca durumu dusuyor", C.cekimDurum().cekimde === 0);
}

console.log("\n=== 6. HAZIR SAHNELER ===");
{
  const bilinen = new Set(["aktor", "skin", "esya", "bak", "git", "oyna", "vur", "kamera", "hud", "yazi", "birak", "dur", "sil",
                           "savun", "kacin", "dovus", "soyle", "anlat", "isim", "nokta"]);
  for (const [ad, satirlar] of Object.entries(ayar.CEKIM_SAHNELER)) {
    const kotu = satirlar.filter((s) => !bilinen.has(String(s[1]).split(" ")[0]) ||
      (String(s[1]).startsWith("kamera ") && !C.KAMERA_KALIPLARI.includes(String(s[1]).split(" ")[1])));
    kontrol(ad + ": " + satirlar.length + " satirin hepsi gecerli komut", kotu.length === 0, JSON.stringify(kotu));
    kontrol(ad + ": 'birak' ile bitiyor", String(satirlar[satirlar.length - 1][1]) === "birak");
  }
  C.cekimSifirla();
  const D = dunya();
  const o = oyuncuK(D);
  kom(o, "aktor a"); kom(o, "aktor b harkos");
  const a = C.aktorBul(D.boyut, "a"), b = C.aktorBul(D.boyut, "b");
  a.location = { x: 0.5, y: 64, z: 0.5 }; b.location = { x: 0.5, y: 64, z: 2.8 };
  kom(o, "sahne duello");
  tick(Math.max(...ayar.CEKIM_SAHNELER.duello.map((s) => s[0])) + 2);
  const hatalar = o._mesaj.filter((m) => m.indexOf("[sahne") >= 0);
  kontrol("duello uctan uca: hic hata satiri yok", hatalar.length === 0, hatalar.join(" | "));
  kontrol("  iki aktor de vurdu ve vuruldu", a._hasar.length > 0 && b._hasar.length > 0,
          a._hasar.length + " / " + b._hasar.length);
  kontrol("  ekrana baslik yazildi", o._komut.some((k) => k.startsWith("title @s title §lDÜELLO")));
  kontrol("  sonunda kamera birakildi", o._komut.includes("camera @s clear"));
}

console.log("\n=== 7. SOHBET BAGLANTISI ===");
{
  C.cekimSifirla();
  const D = dunya();
  const o = oyuncuK(D, "sohbetci");
  kontrol("'cekim' bir komut", sohbet.komutMu("cekim aktor a") && sohbet.komutMu("çekim yardim"));
  const c = sohbet.komutCozumle(o, "çekim aktor z");
  kontrol("sohbetten aktor kuruluyor", !!C.aktorBul(D.boyut, "z") && /Aktör/.test(c && c.cevap), c && c.cevap);
  sohbet.komutCozumle(o, "cekim yazi Merhaba Dünya");
  kontrol("yazi Turkce harf ve buyuk harfi koruyor", o._komut.includes("title @s title Merhaba Dünya"));
  kontrol("komut korumali listede (op'suz herkes aktor dogurmasin)", ayar.KOMUT_KORUMALI.includes("cekim"));
}

console.log("\n=== 9. VURUS TURLERI: KOSU VE HAVA ===");
{
  C.cekimSifirla();
  const D = dunya();
  const o = oyuncuK(D);
  kom(o, "aktor a"); kom(o, "aktor b");
  const a = C.aktorBul(D.boyut, "a"), b = C.aktorBul(D.boyut, "b");
  a.location = { x: 0.5, y: 64, z: 0.5 }; b.location = { x: 0.5, y: 64, z: 4.5 };
  kom(o, "esya a pa:wom_ruine");
  const R = WOM_KILIC_SETLER.ruine.saldirilar;
  kom(o, "vur a b kosu");
  kontrol("kosu vurusu setin atilmasi", a._anim.slice(-1)[0] === R.find((x) => x.tur === "kosu").anim, a._anim.slice(-1)[0]);
  tick(60);
  C.cekimSifirla();
  kom(o, "esya a pa:wom_ruine");
  a.location = { x: 0.5, y: 64, z: 0.5 };
  kom(o, "vur a b hava");
  const hava = R.find((x) => x.tur === "hava");
  kontrol("hava vurusu setin hava vurusu", a._anim.slice(-1)[0] === hava.anim);
  let enYuksek = 64;
  for (let i = 0; i < Math.round(hava.sure * 20); i++) { tick(1); enYuksek = Math.max(enYuksek, a.location.y); }
  const izYuk = Math.max(...hava.iz.map((p) => p[2]));
  kontrol("hava vurusunda aktor gercekten sicriyor", enYuksek - 64 > 0.5 && Math.abs(enYuksek - 64 - izYuk) < 0.05,
          (enYuksek - 64).toFixed(2) + " / iz " + izYuk.toFixed(2));
  C.cekimSifirla();
  kom(o, "esya a pa:wom_ruine");
  const oto = R.filter((x) => x.tur === "oto");
  kom(o, "vur a b"); tick(Math.round(oto[0].sure * 20));
  kom(o, "vur a b kosu"); tick(20);
  kom(o, "vur a b");
  kontrol("atilma kombo sirasini bozmuyor (sonraki oto 2. adim)", a._anim.slice(-1)[0] === oto[1].anim, a._anim.slice(-1)[0]);
  kontrol("sette olmayan tur reddediliyor", C.komboSec("ruine", undefined, 0, "binek") === undefined &&
          C.komboSec("ruine", undefined, 0, "hava") !== undefined);
}

console.log("\n=== 10. SAVUNMA ===");
{
  C.cekimSifirla();
  const D = dunya();
  const o = oyuncuK(D);
  kom(o, "aktor a"); kom(o, "aktor b");
  const a = C.aktorBul(D.boyut, "a"), b = C.aktorBul(D.boyut, "b");
  a.location = { x: 0.5, y: 64, z: 0.5 }; b.location = { x: 0.5, y: 64, z: 2.5 };
  b._bakis = { x: 0, z: -1 };                          // a'ya donuk
  kom(o, "esya a pa:wom_ruine");
  kom(o, "savun b 60");
  kontrol("savunma animasyonu oynadi", b._anim.includes(ayar.CEKIM_ANIM.savun));
  kom(o, "vur a b");
  tick(40);
  kontrol("onden gelen vurus savunuldu: hasar yok", b._hasar.length === 0, b._hasar.length + " hasar");
  kontrol("  kalkan sesi calindi", D.boyut._efekt.some((e) => e.ad === ayar.CEKIM_SES.savun));
  C.cekimSifirla();
  kom(o, "esya a pa:wom_ruine");
  b._bakis = { x: 0, z: 1 };                           // arkasi donuk
  a.location = { x: 0.5, y: 64, z: 0.5 }; b.location = { x: 0.5, y: 64, z: 2.5 };
  kom(o, "savun b 60");
  b._bakis = { x: 0, z: 1 };
  kom(o, "vur a b");
  tick(40);
  kontrol("arkadan gelen vurus savunulamiyor", b._hasar.length > 0);
  kontrol("  vurulan darbe tepkisi oynadi", b._anim.includes(ayar.CEKIM_ANIM.darbe));
  kontrol("  vurus sesi ve parcacik", D.boyut._efekt.some((e) => e.ad === ayar.CEKIM_SES.vurus) &&
          D.boyut._efekt.some((e) => e.ad === ayar.CEKIM_PARCACIK));
}

console.log("\n=== 11. KACINMA ===");
{
  C.cekimSifirla();
  const D = dunya();
  const o = oyuncuK(D);
  kom(o, "aktor a");
  const a = C.aktorBul(D.boyut, "a");
  const olc = (yon) => {
    a.location = { x: 0.5, y: 64, z: 0.5 }; a._bakis = { x: 0, z: 1 };
    kom(o, "kacin a " + yon);
    tick(ayar.CEKIM_KACIN_TICK + 2);
    return { x: a.location.x - 0.5, z: a.location.z - 0.5 };
  };
  const geri = olc("geri"), sol = olc("sol"), sag = olc("sag");
  kontrol("geri: bakis yonunun tersine " + ayar.CEKIM_KACIN + " blok",
          Math.abs(geri.z + ayar.CEKIM_KACIN) < 1e-6 && Math.abs(geri.x) < 1e-6, JSON.stringify(geri));
  kontrol("sol ve sag zit yonde, ayni mesafede",
          Math.abs(sol.x + sag.x) < 1e-6 && Math.abs(Math.abs(sol.x) - ayar.CEKIM_KACIN) < 1e-6, sol.x + " / " + sag.x);
  kontrol("kacinma animasyonu yone gore", a._anim.includes(ayar.CEKIM_ANIM.kacin_sol) && a._anim.includes(ayar.CEKIM_ANIM.kacin_sag));
}

console.log("\n=== 12. OTOMATIK DOVUS ===");
{
  function dovustur(tohum) {
    C.cekimSifirla();
    const D = dunya();
    const o = oyuncuK(D);
    kom(o, "aktor a"); kom(o, "aktor b");
    const a = C.aktorBul(D.boyut, "a"), b = C.aktorBul(D.boyut, "b");
    a.location = { x: 0.5, y: 64, z: 0.5 }; b.location = { x: 0.5, y: 64, z: 5.5 };
    kom(o, "esya a pa:wom_ruine"); kom(o, "esya b pa:wom_solar");
    const c = kom(o, "dovus a b 12 " + tohum);
    tick(12 * 20 + 60);
    return { a, b, D, c, iz: a._anim.join(",") + "|" + b._anim.join(",") };
  }
  const r1 = dovustur(7);
  kontrol("dovus basladi", r1.c.startsWith("§aDövüş"), r1.c);
  kontrol("ikisi de vurdu, ikisi de vuruldu", r1.a._hasar.length > 0 && r1.b._hasar.length > 0,
          r1.a._hasar.length + " / " + r1.b._hasar.length);
  const vurus = [...r1.a._anim, ...r1.b._anim].filter((x) => x.startsWith("animation.wom.")).length;
  const tepki = [...r1.a._anim, ...r1.b._anim].filter((x) => x === ayar.CEKIM_ANIM.savun || x.startsWith("animation.aktor.kacin")).length;
  kontrol("tek tip degil: vuruslar + savunma/kacinma", vurus >= 4 && tepki >= 1, vurus + " vurus, " + tepki + " savunma/kacinma");
  const turler = new Set([...r1.a._anim, ...r1.b._anim].filter((x) => x.startsWith("animation.wom.")));
  kontrol("en az 3 farkli vurus animasyonu", turler.size >= 3, [...turler].join(", "));
  kontrol("sure dolunca dovus bitti", C.cekimDurum().dovus === 0);
  const r2 = dovustur(7);
  kontrol("AYNI tohum AYNI dovus (tekrar cekim icin)", r1.iz === r2.iz);
  const r3 = dovustur(8);
  kontrol("farkli tohum farkli dovus", r1.iz !== r3.iz);
  kontrol("'dovus dur' durduruyor", (C.cekimSifirla(), kom(oyuncuK(dunya()), "dovus dur").startsWith("§a")));
}

console.log("\n=== 13. ALTYAZI ===");
{
  C.cekimSifirla();
  const D = dunya();
  const o = oyuncuK(D, "yazar");
  sohbet.komutCozumle(o, "cekim aktor a");
  const a = C.aktorBul(D.boyut, "a");
  sohbet.komutCozumle(o, "çekim isim a Barış");
  sohbet.komutCozumle(o, "çekim soyle a Buraya gelmemeliydin, Çağrı!");
  const beklenen = "§eBarış§7: §fBuraya gelmemeliydin, Çağrı!";
  kontrol("altyazi ekranda, Turkce harfler ve buyuk harf yerinde", o._alt.includes(beklenen), o._alt.slice(-1)[0]);
  kontrol("  konusan aktor konusma animasyonu oynuyor", a._anim.includes(ayar.CEKIM_ANIM.konus));
  const sure = C.altyaziSure("Buraya gelmemeliydin, Çağrı!");
  tick(sure - 5);
  kontrol("  sure boyunca yenileniyor", o._alt.filter((m) => m === beklenen).length >= 2);
  tick(10);
  kontrol("  sure bitince siliniyor", o._alt.slice(-1)[0] === " " && C.cekimDurum().altyazi === 0);
  kontrol("sure metin uzunluguna gore, en az " + ayar.CEKIM_ALTYAZI_EN_AZ + " tick",
          C.altyaziSure("a") === ayar.CEKIM_ALTYAZI_EN_AZ && C.altyaziSure("x".repeat(200)) > C.altyaziSure("x".repeat(50)));
  C.cekimKomutu(o, ["anlat", "Yıllar", "sonra..."]);
  kontrol("anlatici satiri (isimsiz, italik)", o._alt.slice(-1)[0] === "§7§oYıllar sonra...", o._alt.slice(-1)[0]);
  kontrol("isim kalici ozellikte de", a._dp["cekim:isim"] === "Barış");
}

console.log("\n=== 14. KAMERA YOLU (Catmull-Rom) ===");
{
  C.cekimSifirla();
  const D = dunya();
  const o = oyuncuK(D, "yolcu");
  o.getRotation = () => ({ x: o._rot[0], y: o._rot[1] });
  const nokta = (x, z, yaw) => { o.location = { x, y: 64, z }; o._rot = [10, yaw]; kom(o, "nokta ekle"); };
  kontrol("tek noktayla yol reddediliyor", (nokta(0, 0, 350), kom(o, "kamera yol 40").startsWith("§c")));
  nokta(10, 0, 10); nokta(10, 10, 30);
  o._komut.length = 0;
  kom(o, "kamera yol 40");
  const ilk = kameraCoz(son(o, "camera @s set"));
  kontrol("yol ilk noktadan basliyor", ilk && Math.abs(ilk.poz.x) < 1e-6 && Math.abs(ilk.poz.z) < 1e-6);
  const orta = C.yolNoktasi([{ x: 0, y: 65.6, z: 0, pitch: 10, yaw: 350 }, { x: 10, y: 65.6, z: 0, pitch: 10, yaw: 10 },
                             { x: 10, y: 65.6, z: 10, pitch: 10, yaw: 30 }], 0.5);
  kontrol("yol ara noktadan GECIYOR", Math.abs(orta.x - 10) < 1e-6 && Math.abs(orta.z) < 1e-6, JSON.stringify(orta));
  kontrol("  yaw 350 -> 10 kisa yoldan (20 derece, 340 degil)", Math.abs(((orta.yaw % 360) + 360) % 360 - 10) < 1e-6);
  tick(60);
  const sonK = kameraCoz(son(o, "camera @s set"));
  kontrol("yol son noktada bitiyor", sonK && Math.abs(sonK.poz.x - 10) < 0.02 && Math.abs(sonK.poz.z - 10) < 0.02,
          sonK && JSON.stringify(sonK.poz));
  kontrol("  kamera birakilmadi (sahne kesebilsin)", C.cekimDurum().kamera === 1);
  kom(o, "dur");
  kontrol("'dur' yolu da birakiyor", o._komut.includes("camera @s clear"));
}

console.log("\n=== 15. KARANLIK TIRPAN ===");
{
  const esya = JSON.parse(readFileSync(KOK + "/Simsek_TNT_ToprakTopu/items/karanlik_tirpan.json", "utf8"))["minecraft:item"];
  const att = JSON.parse(readFileSync(KOK + "/Simsek_Kol_Kaynak/attachables/karanlik_tirpan.json", "utf8"))["minecraft:attachable"].description;
  const geo = JSON.parse(readFileSync(KOK + "/Simsek_Kol_Kaynak/models/entity/karanlik_tirpan.geo.json", "utf8"))["minecraft:geometry"][0];
  const { WOM_KILIC_ESYA } = await import("./pack/yetenekler/_wom_hareket.js");
  kontrol("esya ve attachable ayni kimlik", esya.description.identifier === "pa:karanlik_tirpan" && att.identifier === "pa:karanlik_tirpan");
  kontrol("dovus sistemi onu Antitheus seti sayiyor", WOM_KILIC_ESYA["pa:karanlik_tirpan"] &&
          WOM_KILIC_ESYA["pa:karanlik_tirpan"].set === "antitheus");
  kontrol("Antitheus seti tam: 4 kombo + atilma + hava",
          WOM_KILIC_SETLER.antitheus && WOM_KILIC_SETLER.antitheus.saldirilar.filter((x) => x.tur === "oto").length === 4 &&
          ["kosu", "hava"].every((t) => WOM_KILIC_SETLER.antitheus.saldirilar.some((x) => x.tur === t)));
  kontrol("model elin kemigine bagli (rightItem)", geo.bones[0].name === "rightItem" && geo.bones[1].parent === "rightItem");
  const zler = geo.bones[1].cubes.map((c) => c.origin[2]);
  kontrol("sap ileri (-Z): bicak onde, topuz arkada", Math.min(...zler) < -35 && Math.max(...zler) >= 8);
  const oyuncuG = JSON.parse(readFileSync(KOK + "/Simsek_Oyuncu_Modeli/entity/player.entity.json", "utf8"));
  kontrol("oyuncu elinde tutunca Antitheus durusu", JSON.stringify(oyuncuG).includes("== 'karanlik_tirpan'"));
  const akt = JSON.parse(readFileSync(KOK + "/Simsek_Kol_Kaynak/entity/aktor.entity.json", "utf8"));
  kontrol("aktor elinde tutunca da", JSON.stringify(akt).includes("== 'karanlik_tirpan'"));
  const dil = readFileSync(KOK + "/Simsek_Kol_Kaynak/texts/tr_TR.lang", "utf8");
  kontrol("Turkce adi var", dil.includes("item.pa:karanlik_tirpan.name=§dKaranlık Tırpan"));
  C.cekimSifirla();
  const D = dunya();
  const o = oyuncuK(D);
  kom(o, "aktor a"); kom(o, "aktor b");
  kom(o, "esya a pa:karanlik_tirpan");
  kom(o, "vur a b");
  kontrol("aktor tirpanla Antitheus vurusu atiyor", C.aktorBul(D.boyut, "a")._anim[0] === "animation.wom.antitheus.antitheus_auto_1");
}

console.log("\n=== 8. URETILEN DOSYALAR ===");
{
  const bp = JSON.parse(readFileSync(KOK + "/Simsek_TNT_ToprakTopu/entities/aktor.json", "utf8"))["minecraft:entity"];
  const rp = JSON.parse(readFileSync(KOK + "/Simsek_Kol_Kaynak/entity/aktor.entity.json", "utf8"))["minecraft:client_entity"].description;
  const rc = JSON.parse(readFileSync(KOK + "/Simsek_Kol_Kaynak/render_controllers/aktor.render_controllers.json", "utf8"))
    .render_controllers["controller.render.pa_aktor"];
  kontrol("BP ve RP ayni kimlik", bp.description.identifier === AKTOR_KIMLIK && rp.identifier === AKTOR_KIMLIK);
  const aralik = bp.description.properties["pa:skin"].range;
  kontrol("skin ozelligi araligi skin sayisina esit", aralik[1] === AKTOR_SKINLER.length - 1, JSON.stringify(aralik));
  kontrol("render dizisi skin sayisi kadar", rc.arrays.textures["Array.skin"].length === AKTOR_SKINLER.length &&
          rc.arrays.geometries["Array.geo"].length === AKTOR_SKINLER.length);
  kontrol("ince kollu skin ince geometriyle", AKTOR_SKINLER.every((s, i) =>
    rc.arrays.geometries["Array.geo"][i] === (s.ince ? "Geometry.slim" : "Geometry.default")));
  const eksik = Object.values(rp.textures).filter((t) => t.startsWith("textures/entity/aktor/") &&
    !existsSync(KOK + "/Simsek_Kol_Kaynak/" + t + ".png"));
  kontrol("paketten gelen skinlerin dosyasi var", eksik.length === 0, eksik.join(","));
  kontrol("aktor AI tasimiyor (ne yapacagini betik soyluyor)",
          !Object.keys(bp.components).some((k) => k.startsWith("minecraft:behavior.")));
  kontrol("aktor olmuyor: can yuksek", bp.components["minecraft:health"].value >= 1000);
  kontrol("rehber var", existsSync(KOK + "/CEKIM_REHBERI.md"));
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> cekim seti: aktor, dovus, kamera, sahne calisiyor; cikis garantili");
process.exit(hata ? 1 : 0);
