/* WoM KILIC VURUSLARI                                          v7.99

   Ucuncu gelis. v7.98.2'de kaldirilmisti: bacak ve govde ayriliyordu.
   Sebep olculdu (REFERANS_WOM.md): Epic Fight govdeyi KALCADAN
   bukuyor, eski ceviri Bedrock'un `body`'sini -- boyundan donen tek
   kutu -- kullaniyordu. Yeni cevirici (arac/wom_cevir.py) egilmeyi
   `waist`e veriyor.

   ---- BU DOSYANIN TUTTUGU SEY ----
   1. 27 silah (esya + ikon + ad) duruyor; cevirici, dogrulayici ve
      urettikleri depoda.
   2. Uretilen her animasyon kaynak pakette; hareket verisindeki her
      vurus bir animasyona denk geliyor; betik modulu ayni veriyi
      tasiyor.
   3. KALCA: govdenin alt ortasi bacaklarin ust ortasindan AYRILMIYOR
      (her animasyon, her 1/20 sn). Bu olcu v7.98.2'de yoktu.
   4. YON: kollar, bacaklar, kafa, gogus ve bicak Epic Fight'in kendi
      pozuna uyuyor (kaynak_anim/wom/wom_kilic.iz.json). Bedrock
      kinematigi BURADA, cevirici ve dogrulayicidan ayri yaziliyor.
   5. Oyuncu modeli: her set icin tetik + durus iki pakette de.
   6. Betik: seri sirasi, kuyruk, hava/kosu vurusu, hasar penceresi
      ve carpani, koni, hamle yonu, seri unutma, eski API.
   7. main.js baglari: kurulum, tick, gozcu muafiyeti, playerLeave.  */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { _durum } from "@minecraft/server";

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const oku = (p) => JSON.parse(readFileSync(KOK + "/" + p, "utf8"));

console.log("=== 1. SILAHLAR VE ARACLAR ===");
{
  const esya = readdirSync(KOK + "/Simsek_TNT_ToprakTopu/items").filter((f) => f.startsWith("wom_"));
  kontrol("27 WoM silahi esya olarak var", esya.length === 27, esya.length + " dosya");
  const ikon = readdirSync(KOK + "/Simsek_Kol_Kaynak/textures/item").filter((f) => f.startsWith("wom_"));
  kontrol("  27'sinin ikonu var", ikon.length === 27, ikon.length + " dosya");
  const dil = readFileSync(KOK + "/Simsek_Kol_Kaynak/texts/tr_TR.lang", "utf8");
  kontrol("  27'sinin adi var", esya.every((f) => dil.includes("item.pa:" + f.replace(".json", "") + ".name=")));
  for (const f of ["arac/wom_cevir.py", "arac/wom_dogrula.py",
                   "kaynak_anim/wom/wom_kilic.animation.json",
                   "kaynak_anim/wom/wom_kilic.hareket.json",
                   "kaynak_anim/wom/wom_kilic.iz.json"]) {
    kontrol(f + " var", existsSync(KOK + "/" + f));
  }
  kontrol("eski v7.98.0 dosyalari geri gelmedi",
          !existsSync(KOK + "/Simsek_Kol_Kaynak/animations/wom_dovus.animation.json") &&
          !existsSync(KOK + "/Simsek_TNT_ToprakTopu/scripts/yetenekler/wom_dovus.js") &&
          !existsSync(KOK + "/arac/ef_anim_cevir.py"));
}

const ANIM = oku("Simsek_Kol_Kaynak/animations/wom_kilic.animation.json").animations;
const HAREKET = oku("kaynak_anim/wom/wom_kilic.hareket.json").setler;
const IZ = oku("kaynak_anim/wom/wom_kilic.iz.json").animasyonlar;

console.log("\n=== 2. VERI BUTUNLUGU ===");
{
  const setler = Object.keys(HAREKET);
  /* 7 kilic + 6 asa (her asa kendi saldiri hiziyla, v7.99.1) +
     bos el yumruk seti (v7.99.2). */
  kontrol("14 set: 7 kilic + 6 asa + yumruk", setler.length === 14, setler.join(", "));
  const y = HAREKET.yumruk;
  kontrol("  yumruk: bos el, esyasiz, durussuz, 3 oto + kosu + hava",
          !!y && y.bos_el === true && y.esyalar.length === 0 && !y.durus &&
          y.saldirilar.map((x) => x.ad).join() === "fist_auto1,fist_auto2,fist_auto3,fist_dash,fist_airslash",
          y && y.saldirilar.map((x) => x.ad).join());
  const asalar = ["wooden_staff", "stone_staff", "iron_staff", "golden_staff",
                  "diamond_staff", "netherite_staff"];
  kontrol("  alti asanin hepsi", asalar.every((a) => HAREKET[a] && HAREKET[a].esyalar[0] === a));
  /* Hiz kademesi sureye yansimis olmali: demir asa altindan yavas. */
  const s1 = (a) => HAREKET[a].saldirilar[0].sure;
  kontrol("  asa hizi kademeye bagli (demir > tas > altin sure)",
          s1("iron_staff") > s1("stone_staff") && s1("stone_staff") > s1("golden_staff"),
          asalar.map((a) => a.split("_")[0] + " " + s1(a)).join(", "));
  const eksik = [];
  for (const [ad, s] of Object.entries(HAREKET)) {
    const duruslar = s.durus ? [s.durus, s.durus_ust] : [];
    for (const a of [...duruslar, ...s.saldirilar.map((x) => x.anim)])
      if (!ANIM[a]) eksik.push(a);
    const turler = new Set(s.saldirilar.map((x) => x.tur));
    if (!turler.has("oto") || !turler.has("kosu") || !turler.has("hava")) eksik.push(ad + ": tur");
    for (const x of s.saldirilar) {
      if (!(x.birakma > 0 && x.birakma <= x.sure + 1e-6)) eksik.push(x.anim + ": birakma");
      if (!x.fazlar.length) eksik.push(x.anim + ": faz yok");
      for (const f of x.fazlar) if (!(f.antic <= f.contact && f.hasar > 0)) eksik.push(x.anim + ": faz");
      if (x.iz.length < 2) eksik.push(x.anim + ": iz");
    }
  }
  kontrol("her vurusun animasyonu, turu, fazi ve izi var", eksik.length === 0, eksik.slice(0, 4).join(" | "));
  kontrol("kuyruk kesme animasyonu var", !!ANIM["animation.wom.bos"]);
  const js = readFileSync(KOK + "/Simsek_TNT_ToprakTopu/scripts/yetenekler/_wom_hareket.js", "utf8");
  const m = js.match(/export const WOM_KILIC_SETLER = (.*);\n/);
  kontrol("betik modulu ayni veriyi tasiyor", !!m && JSON.stringify(JSON.parse(m[1])) === JSON.stringify(HAREKET));
  /* Esya hasari betikte de ESYA dosyasindakiyle ayni olmali:
     kombo hasari onun carpani.                                   */
  const e = js.match(/export const WOM_KILIC_ESYA = (.*);\n/);
  const esya = e ? JSON.parse(e[1]) : {};
  const kotu = Object.entries(esya).filter(([id]) => id.startsWith("pa:")).filter(([id, k]) => {
    const d = oku("Simsek_TNT_ToprakTopu/items/" + id.slice(3) + ".json");
    return d["minecraft:item"].components["minecraft:damage"] !== k.hasar;
  });
  const esyali = Object.entries(esya).filter(([id]) => id.startsWith("pa:"));
  kontrol("bos el kaydi: yumruk seti, hasar 1",
          !!esya.bos_el && esya.bos_el.set === "yumruk" && esya.bos_el.hasar === 1, JSON.stringify(esya.bos_el));
  kontrol("betikteki hasar esya dosyasindakiyle ayni", esyali.length >= 13 && kotu.length === 0,
          Object.keys(esya).length + " esya, uyusmayan " + kotu.map((x) => x[0]).join(","));
}

/* ---- Bedrock ileri kinematigi (bu dosyanin kendi yazimi) ----
   Blockbench kurali: ic = (-x, -y, +z) derece, M = Rz.Ry.Rx; konum
   (-x, y, z). Kareler arasi her eksen ayri ve duz (Bedrock).    */
const ATA = { root: null, waist: "root", body: "waist", head: "body", rightArm: "body",
              leftArm: "body", rightItem: "rightArm", leftItem: "leftArm",
              rightLeg: "root", leftLeg: "root" };
const PIVOT = { root: [0, 0, 0], waist: [0, 12, 0], body: [0, 24, 0], head: [0, 24, 0],
                rightArm: [5, 22, 0], leftArm: [-5, 22, 0], rightItem: [6, 15, 1],
                leftItem: [-6, 15, 1], rightLeg: [1.9, 12, 0], leftLeg: [-1.9, 12, 0] };
const sayi = (v) => (typeof v === "string" ? parseFloat(v) : v);
function deger(kanal, t) {
  if (Array.isArray(kanal)) return kanal.map(sayi);
  const ks = Object.entries(kanal).map(([k, v]) => [parseFloat(k), (Array.isArray(v) ? v : [v, v, v]).map(sayi)])
    .sort((a, b) => a[0] - b[0]);
  if (t <= ks[0][0]) return ks[0][1];
  if (t >= ks[ks.length - 1][0]) return ks[ks.length - 1][1];
  for (let i = 1; i < ks.length; i++) {
    if (ks[i][0] >= t) {
      const [t0, a] = ks[i - 1], [t1, b] = ks[i];
      const u = t1 > t0 ? (t - t0) / (t1 - t0) : 0;
      return a.map((x, n) => x + (b[n] - x) * u);
    }
  }
}
const carp = (a, b) => a.map((r, i) => [0, 1, 2].map((j) => r[0] * b[0][j] + r[1] * b[1][j] + r[2] * b[2][j]));
const uygula = (m, v) => m.map((r) => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]);
function donus(f) {
  const [x, y, z] = [-f[0], -f[1], f[2]].map((d) => (d * Math.PI) / 180);
  const Rx = [[1, 0, 0], [0, Math.cos(x), -Math.sin(x)], [0, Math.sin(x), Math.cos(x)]];
  const Ry = [[Math.cos(y), 0, Math.sin(y)], [0, 1, 0], [-Math.sin(y), 0, Math.cos(y)]];
  const Rz = [[Math.cos(z), -Math.sin(z), 0], [Math.sin(z), Math.cos(z), 0], [0, 0, 1]];
  return carp(carp(Rz, Ry), Rx);
}
const BIRIM = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const kemikDonus = (a, k, t) => (a.bones[k] && a.bones[k].rotation ? donus(deger(a.bones[k].rotation, t)) : BIRIM);
function dunyaDonus(a, k, t) {
  const yol = [];
  for (let x = k; x; x = ATA[x]) yol.unshift(x);
  return yol.reduce((m, x) => carp(m, kemikDonus(a, x, t)), BIRIM);
}
function nokta(a, k, p, t) {
  for (let x = k; x; x = ATA[x]) {
    const R = kemikDonus(a, x, t), pv = PIVOT[x];
    p = uygula(R, [p[0] - pv[0], p[1] - pv[1], p[2] - pv[2]]).map((v, i) => v + pv[i]);
    const b = a.bones[x];
    if (b && b.position) {
      const f = deger(b.position, t);
      p = [p[0] - f[0], p[1] + f[1], p[2] + f[2]];
    }
  }
  return p;
}
const aci = (a, b) => {
  const na = Math.hypot(...a), nb = Math.hypot(...b);
  const c = (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (na * nb);
  return (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
};

/* Olcum bolumlerinin paylastigi tek gecis. `animler` disaridan
   verilebiliyor: mutasyon denetimi bozuk bir kopya veriyor. */
function olc(animler) {
  let enKotuKalca = [0, ""], yonler = [], enKotuYon = [0, ""];
  for (const [ad, iz] of Object.entries(IZ)) {
    const a = animler[ad];
    if (!a) { enKotuKalca = [Infinity, ad + " YOK"]; continue; }
    const n = Math.round(a.animation_length / 0.05);
    for (let i = 0; i <= n; i++) {
      const t = i * 0.05;
      const alt = nokta(a, "body", [0, 12, 0], t);
      const sag = nokta(a, "rightLeg", [1.9, 12, 0], t), sol = nokta(a, "leftLeg", [-1.9, 12, 0], t);
      const g = Math.hypot(alt[0] - (sag[0] + sol[0]) / 2, alt[1] - (sag[1] + sol[1]) / 2,
                           alt[2] - (sag[2] + sol[2]) / 2);
      if (g > enKotuKalca[0]) enKotuKalca = [g, ad + " t=" + t.toFixed(2)];
    }
    for (const [olcu, s] of Object.entries(iz)) {
      if (!a.bones[s.kemik] && s.kemik !== "body") continue;
      for (const [t, ...g] of s.yon) {
        const h = aci(g, uygula(dunyaDonus(a, s.kemik, t), s.dinlenme));
        yonler.push(h);
        if (h > enKotuYon[0]) enKotuYon = [h, ad + " " + olcu + " t=" + t];
      }
    }
  }
  yonler.sort((x, y) => x - y);
  const p = (q) => yonler[Math.min(yonler.length - 1, Math.floor(q * yonler.length))];
  return { enKotuKalca, enKotuYon, ornek: yonler.length, medyan: p(0.5), p99: p(0.99) };
}

const O = olc(ANIM);
console.log("\n=== 3. KALCA KOPMUYOR ===");
{
  const beklenen = Object.values(HAREKET).reduce((n, s) => n + (s.durus ? 1 : 0) + s.saldirilar.length, 0);
  kontrol("her durus ve vurus olculmus (" + beklenen + ")", Object.keys(IZ).length === beklenen,
          String(Object.keys(IZ).length));
}
kontrol("kalca boslugu her karede < 0.5 px", O.enKotuKalca[0] < 0.5,
        O.enKotuKalca[0].toFixed(3) + " px (" + O.enKotuKalca[1] + ")");
{
  /* Mutasyon: eski cevirinin hatasi -- egilmeyi body'ye vermek.
     Kalca olcusu bunu yakalamali; yakalamazsa olcu kordur.     */
  const bozuk = JSON.parse(JSON.stringify(ANIM));
  for (const a of Object.values(bozuk)) {
    if (a.bones && a.bones.waist && a.bones.body) { a.bones.body = a.bones.waist; delete a.bones.waist; }
  }
  const B = olc(bozuk);
  kontrol("  mutasyon (egilme body'de) yakalaniyor", B.enKotuKalca[0] > 2,
          B.enKotuKalca[0].toFixed(1) + " px");
}

console.log("\n=== 4. YON EPIC FIGHT'IN POZUNA UYUYOR ===");
kontrol("yon ornegi yeterli", O.ornek > 5000, String(O.ornek));
kontrol("ortanca sapma < 1 derece", O.medyan < 1, O.medyan.toFixed(2));
kontrol("%99'luk sapma < 8 derece", O.p99 < 8, O.p99.toFixed(2));
kontrol("en kotu < 15 derece", O.enKotuYon[0] < 15, O.enKotuYon[0].toFixed(1) + " (" + O.enKotuYon[1] + ")");
{
  const bozuk = JSON.parse(JSON.stringify(ANIM));
  for (const a of Object.values(bozuk)) {
    const r = a.bones && a.bones.rightArm && a.bones.rightArm.rotation;
    if (r && !Array.isArray(r)) for (const k in r) r[k] = [r[k][0], -r[k][1], -r[k][2]];
  }
  const B = olc(bozuk);
  kontrol("  mutasyon (kol isaret hatasi) yakalaniyor", B.p99 > 8, B.p99.toFixed(1));
}

console.log("\n=== 5. OYUNCU MODELI ===");
for (const paket of ["Simsek_Oyuncu_Modeli", "Simsek_Oyuncu_Modeli_IronMan"]) {
  const d = oku(paket + "/entity/player.entity.json")["minecraft:client_entity"].description;
  const on = d.scripts.pre_animation.join("\n");
  const anim = JSON.stringify(d.scripts.animate);
  const eksik = [];
  if (on.includes("wom_kilic_yumruk")) eksik.push("yumruk icin durus tetigi olmamali");
  for (const [set, s] of Object.entries(HAREKET)) {
    if (!s.durus) continue;
    for (const e of s.esyalar) if (!on.includes("== 'wom_" + e + "'")) eksik.push(set + " tetik " + e);
    if (d.animations["wom_" + set + "_durus"] !== s.durus) eksik.push(set + " durus");
    if (d.animations["wom_" + set + "_durus_ust"] !== s.durus_ust) eksik.push(set + " durus_ust");
    if (!anim.includes("wom_" + set + "_durus\":\"variable.wom_kilic_" + set + " && !variable.is_first_person"))
      eksik.push(set + " kosul");
  }
  kontrol(paket + ": her set tetik + iki durus + birinci sahis disi", eksik.length === 0, eksik.slice(0, 3).join(" | "));
}

console.log("\n=== 6. BETIK ===");
const W = await import("./pack/yetenekler/wom_kilic.js");
const V = await import("./pack/yetenekler/_wom_hareket.js");
function oyuncuKur(id, konum = { x: 0, y: 64, z: 0 }) {
  const o = {
    id, typeId: "minecraft:player", location: konum, isOnGround: true, isSprinting: false,
    isValid: true, dimension: null, _anim: [], _itme: [],
    getViewDirection: () => ({ x: 0, y: 0, z: 1 }),
    getVelocity: () => ({ x: 0, y: 0, z: 0 }),
    applyKnockback(a, b) { if (typeof a !== "object") throw new TypeError("2.5.0"); o._itme.push({ a, b }); },
    playAnimation(ad, s) { o._anim.push({ ad, s }); },
    getComponent: () => undefined
  };
  return o;
}
function hedefKur(id, konum) {
  const h = { id, typeId: "minecraft:zombie", location: konum, isValid: true, _hasar: [],
              getComponent: (n) => (n === "minecraft:health" ? {} : undefined),
              applyDamage(m, s) { h._hasar.push({ m, s }); return true; } };
  return h;
}
const RUINE = HAREKET.ruine.saldirilar;
const oto = RUINE.filter((x) => x.tur === "oto");
{
  const o = oyuncuKur("wk1");
  const onde = hedefKur("z1", { x: 0, y: 64, z: 2 });
  const arkada = hedefKur("z2", { x: 0, y: 64, z: -2 });
  o.dimension = { getEntities: () => [o, onde, arkada] };
  _durum.varliklar = [o, onde, arkada];
  let t = 1000;
  kontrol("ilk tik: oto 1", W.womKilicSalla(o, "pa:wom_ruine", t) === oto[0].ad, o._anim.map((x) => x.ad).join());
  const s0 = o._anim[0] && o._anim[0].s;
  kontrol("  denetleyici + birinci sahista durma + cikis gecisi",
          !!s0 && s0.controller === "simsek_wom_kilic" && s0.stopExpression === "variable.is_first_person" &&
          s0.blendOutTime > 0, JSON.stringify(s0));
  kontrol("birakmadan once ikinci tik kuyruga", W.womKilicSalla(o, "pa:wom_ruine", t + 1) === "kuyruk" &&
          o._anim.length === 1);
  /* Tick'le birakmaya kadar: kuyruk oto 2'yi kendisi baslatir. */
  o.getComponent = (n) => (n === "minecraft:equippable" ? { getEquipment: () => ({ typeId: "pa:wom_ruine" }) } : undefined);
  const bir = Math.ceil(oto[0].birakma / 0.05);
  for (let i = 1; i <= bir + 1; i++) W.womKilicTick(t + i);
  kontrol("  kuyruk birakmada oto 2'yi baslatti", o._anim.length === 2 && o._anim[1].ad === oto[1].anim,
          o._anim.map((x) => x.ad.split(".").pop()).join(","));
  kontrol("hasar penceresinde ondeki vuruldu, bir kez, esya x carpan",
          onde._hasar.length === 1 && Math.abs(onde._hasar[0].m - V.WOM_KILIC_ESYA["pa:wom_ruine"].hasar *
            oto[0].fazlar[0].hasar) < 1e-9 && onde._hasar[0].s.damagingEntity === o,
          JSON.stringify(onde._hasar.map((x) => x.m)));
  kontrol("arkadaki vurulmadi", arkada._hasar.length === 0);
  /* Hamle: oto 1 ileri gidiyor (iz on bileseni artiyor); baktigi yon +z. */
  const z = o._itme.reduce((s, x) => s + x.a.z, 0), x = o._itme.reduce((s, y) => s + Math.abs(y.a.x), 0);
  kontrol("hamle baktigi yone (+z) itiyor", o._itme.length > 3 && z > 0,
          o._itme.length + " itme, z " + z.toFixed(2) + ", |x| " + x.toFixed(2));
  kontrol("  hamle suresince gozcu muafiyeti", W.womHareketteMi("wk1"));
  /* oto 2: iki faz -> ayni hedef iki kez. */
  const bas2 = t + bir + 1;
  const son2 = Math.ceil(oto[1].sure / 0.05);
  for (let i = 1; i <= son2 + 1; i++) W.womKilicTick(bas2 + i);
  kontrol("iki fazli vurus hedefi iki kez vurdu", onde._hasar.length === 3,
          onde._hasar.length + " vurus");
  kontrol("animasyon bitince aktif vurus kalmadi", !W.womKilicDurum("wk1").aktif);
  const sonrasi = bas2 + son2 + 2;
  W.womKilicSalla(o, "pa:wom_ruine", sonrasi + 3);
  kontrol("pencere icinde seri devam: oto 3", o._anim[o._anim.length - 1].ad === oto[2].anim);
  W.womKilicUnut("wk1");
  W.womKilicSalla(o, "pa:wom_ruine", sonrasi + 100);
  kontrol("unutulunca bastan: oto 1", o._anim[o._anim.length - 1].ad === oto[0].anim);
  kontrol("playerLeave temizligi durumu siliyor", (W.womKilicUnut("wk1"), W.womKilicDurum("wk1") === undefined));
}
{
  const o = oyuncuKur("wk2");
  o.dimension = { getEntities: () => [o] };
  o.isOnGround = false;
  W.womKilicSalla(o, "pa:wom_ruine", 5000);
  const hava = RUINE.find((x) => x.tur === "hava");
  kontrol("havada: hava vurusu", o._anim[0].ad === hava.anim, o._anim[0].ad);
  W.womKilicUnut("wk2");
  o.isOnGround = true; o.isSprinting = true;
  W.womKilicSalla(o, "pa:wom_ruine", 9000);
  const kosu = RUINE.find((x) => x.tur === "kosu");
  kontrol("kosarken ilk vurus: kosu vurusu", o._anim[1].ad === kosu.anim, o._anim[1].ad);
  kontrol("WoM olmayan esya bir sey yapmiyor", W.womKilicSalla(o, "minecraft:diamond_sword", 9100) === undefined);
  W.womKilicUnut("wk2");
}
{
  /* BOS EL: vurunca yumruk serisi; elde esya varsa hicbir sey. */
  const o = oyuncuKur("wk3");
  o.dimension = { getEntities: () => [o] };
  const bos = { getEquipment: () => undefined };
  o.getComponent = (n) => (n === "minecraft:equippable" ? bos : undefined);
  const zom = hedefKur("z3", { x: 0, y: 64, z: 1.5 });
  const Y = HAREKET.yumruk.saldirilar;
  _durum.varliklar = [o, zom];
  const t0 = 20000;
  _durum.tick = t0;
  kontrol("bos elle vurus: yumruk 1", W.womYumrukVurus({ damagingEntity: o, hitEntity: zom }) === Y[0].ad &&
          o._anim[0].ad === Y[0].anim, o._anim.map((x) => x.ad).join());
  /* Birakmadan sonra (Epic Fight recovery) ikinci vurus: seri ilerler. */
  const bir = Math.ceil(Y[0].birakma / 0.05) + 1;
  for (let i = 1; i <= bir; i++) W.womKilicTick(t0 + i);
  _durum.tick = t0 + bir;
  W.womYumrukVurus({ damagingEntity: o, hitEntity: zom });
  kontrol("  ikinci vurus: yumruk 2", o._anim[o._anim.length - 1].ad === Y[1].anim,
          o._anim.map((x) => x.ad.split(".").pop()).join());
  o.getComponent = (n) => (n === "minecraft:equippable" ? { getEquipment: () => ({ typeId: "minecraft:stick" }) } : undefined);
  kontrol("elde esya varken yumruk yok", W.womYumrukVurus({ damagingEntity: o, hitEntity: zom }) === undefined);
  kontrol("oyuncu olmayan vuran yok sayiliyor",
          W.womYumrukVurus({ damagingEntity: { typeId: "minecraft:zombie" }, hitEntity: o }) === undefined);
  /* Kazarken: bos elle salinim yumruk BASLATMIYOR (yalniz vurus). */
  W.womKilicUnut("wk3");
  kontrol("bos el salinimi (kazma) yumruk baslatmiyor", W.womKilicSalla(o, undefined) === undefined);
  W.womKilicUnut("wk3");
}
{
  /* ARAMA TAVANI (v7.99.3): tick basina WOM_KILIC_TICK_ARAMA. */
  const T = 777777, tavan = 4;
  const haklar = Array.from({ length: tavan + 3 }, () => W.aramaHakki(T));
  kontrol("tick basina arama tavani (" + tavan + ")",
          haklar.filter(Boolean).length === tavan && haklar.slice(tavan).every((x) => !x), haklar.join(","));
  kontrol("  sonraki tick'te hak yenileniyor", W.aramaHakki(T + 1) === true);
  const kod = readFileSync(KOK + "/Simsek_TNT_ToprakTopu/scripts/yetenekler/wom_kilic.js", "utf8");
  kontrol("  pencerenin son tick'i tavandan muaf", /son \|\| aramaHakki\(simdi\)/.test(kod));
  /* Paketteki animasyon girintisiz: 0.7 MB'lik icerik 2.3 MB olmasin. */
  const ham = readFileSync(KOK + "/Simsek_Kol_Kaynak/animations/wom_kilic.animation.json", "utf8");
  kontrol("paketteki animasyon sikistirilmis (girintisiz)", !/\n  /.test(ham) && ham.length < 1.2e6,
          (ham.length / 1e6).toFixed(2) + " MB");
}
{
  kontrol("koni: onde 2 blok ici", W.koniIcinde({ x: 0, y: 0, z: 0 }, { x: 0, z: 1 }, { x: 0, y: 0, z: 2 }));
  kontrol("koni: arkada disari", !W.koniIcinde({ x: 0, y: 0, z: 0 }, { x: 0, z: 1 }, { x: 0, y: 0, z: -2 }));
  kontrol("koni: menzil disi", !W.koniIcinde({ x: 0, y: 0, z: 0 }, { x: 0, z: 1 }, { x: 0, y: 0, z: 9 }));
  _durum.salinimYok = true;
  kontrol("eski API (salinim olayi yok): kurulum false, patlamiyor", W.womKilicKur() === false);
  _durum.salinimYok = false;
}

console.log("\n=== 7. MAIN.JS BAGLARI ===");
{
  const m = readFileSync(KOK + "/Simsek_TNT_ToprakTopu/scripts/main.js", "utf8");
  kontrol("kurulum cagriliyor", /\nwomKilicKur\(\);/.test(m));
  kontrol("ana dongu tick'i cagiriyor", /womKilicTick\(\)/.test(m));
  kontrol("hareket denetimi hamleyi muaf tutuyor", /womHareketteMi\(kimlik\)/.test(m));
  kontrol("playerLeave temizliyor", /womKilicUnut\(olay\.playerId\)/.test(m));
  const man = oku("Simsek_TNT_ToprakTopu/manifest.json");
  const srv = man.dependencies.find((d) => d.module_name === "@minecraft/server");
  kontrol("@minecraft/server >= 2.5.0 (playerSwingStart)",
          !!srv && srv.version.split(".").map(Number).reduce((a, v, i) => a + v * [1e6, 1e3, 1][i], 0) >= 2005000,
          srv && srv.version);
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> WoM kilic vuruslari: kalca yerinde, yon dogru, kombo calisiyor");
process.exit(hata ? 1 : 0);
