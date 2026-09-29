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
  const boyut = {
    id: "minecraft:overworld",
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
    _komut: [], _efekt: [], _kalkan: [], _mesaj: [],
    getViewDirection: () => ({ x: 0, y: 0, z: 1 }),
    runCommand(k) { this._komut.push(k); return { successCount: 1 }; },
    addEffect(a, s, o) { this._efekt.push(a); },
    removeEffect(a) { this._kalkan.push(a); return true; },
    sendMessage(m) { this._mesaj.push(String(m)); },
    hasTag: () => true, getTags: () => []
  };
}
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
  const o = oyuncu(D);
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
  const o = oyuncu(D);
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
  const o = oyuncu(D);
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
  const o = oyuncu(D);
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
  let o = oyuncu(D);
  kom(o, "aktor a");
  kom(o, "kamera yakin a");
  kom(o, "dur");
  kontrol("'dur': kamera + HUD + gorunmezlik geri alindi", bitti(o), o._komut.join(" | "));
  kontrol("  durum temiz", C.cekimDurum().kamera === 0 && C.cekimDurum().cekimde === 0);

  o = oyuncu(D, "k2");
  kom(o, "aktor a"); kom(o, "aktor b");
  kom(o, "sahne giris");
  kontrol("sahne basinda HUD gizlendi", o._komut.includes("hud @s hide all"));
  const uzun = Math.max(...ayar.CEKIM_SAHNELER.giris.map((s) => s[0]));
  tick(uzun + 2);
  kontrol("sahne sonu ('birak' satiri): hepsi geri alindi", bitti(o));
  kontrol("  sahne defterden dustu", C.cekimDurum().sahne === 0);

  o = oyuncu(D, "k3");
  kom(o, "aktor a");
  kom(o, "kamera takip a");
  tick(ayar.CEKIM_TAVAN + ayar.CEKIM_ADIM + 2);
  kontrol("tavan dolunca hareketli kamera birakildi", bitti(o));

  o = oyuncu(D, "k4");
  kom(o, "kamera yakin ben");
  C.cekimUnut("k4");
  kontrol("oyuncu cikinca durumu dusuyor", C.cekimDurum().cekimde === 0);
}

console.log("\n=== 6. HAZIR SAHNELER ===");
{
  const bilinen = new Set(["aktor", "skin", "esya", "bak", "git", "oyna", "vur", "kamera", "hud", "yazi", "birak", "dur", "sil"]);
  for (const [ad, satirlar] of Object.entries(ayar.CEKIM_SAHNELER)) {
    const kotu = satirlar.filter((s) => !bilinen.has(String(s[1]).split(" ")[0]) ||
      (String(s[1]).startsWith("kamera ") && !C.KAMERA_KALIPLARI.includes(String(s[1]).split(" ")[1])));
    kontrol(ad + ": " + satirlar.length + " satirin hepsi gecerli komut", kotu.length === 0, JSON.stringify(kotu));
    kontrol(ad + ": 'birak' ile bitiyor", String(satirlar[satirlar.length - 1][1]) === "birak");
  }
  C.cekimSifirla();
  const D = dunya();
  const o = oyuncu(D);
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
  const o = oyuncu(D, "sohbetci");
  kontrol("'cekim' bir komut", sohbet.komutMu("cekim aktor a") && sohbet.komutMu("çekim yardim"));
  const c = sohbet.komutCozumle(o, "çekim aktor z");
  kontrol("sohbetten aktor kuruluyor", !!C.aktorBul(D.boyut, "z") && /Aktör/.test(c && c.cevap), c && c.cevap);
  sohbet.komutCozumle(o, "cekim yazi Merhaba Dünya");
  kontrol("yazi Turkce harf ve buyuk harfi koruyor", o._komut.includes("title @s title Merhaba Dünya"));
  kontrol("komut korumali listede (op'suz herkes aktor dogurmasin)", ayar.KOMUT_KORUMALI.includes("cekim"));
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
