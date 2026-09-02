/* v4.65 -- GOZ LAZERI ULASILABILIR MI

   Kullanici (birebir): "goz lazerini atmaya calistigimda etrafta
   Simsek yagiyordu, ben onceki bundan sonraki en guncel 3
   surumden once de ayni sorun gene vardi."

   ---- HATANIN ANATOMISI ----
   Lazer hic bozuk degildi, ULASILAMIYORDU:

     esyasiz jest sirasi 43 yetenek, Goz Lazeri 20. sirada,
     0. sira Yildirim Halkasi.

   v4.20'de "iksir icilince esyasiz secimi lazere kaydir" diye
   yamandi. Eksikti: ELDE KOL VARSA esyasiz secime HIC
   BAKILMIYOR -- main.js/esyasizOyuncu once eldeki kola bakiyor.
   Kullanici Toprak Kol elinde oynuyor ve o kolun listesinde UC
   yildirim yetenegi var. Yani "simsek yagiyordu" sikayeti
   birebir bu: kolun secili yetenegi calisiyordu.

   Bu dosya hatanin geri gelmesini engelliyor. Asil sinama
   "elde kol varken lazer atilabiliyor mu" -- eski kod bu
   sinamada YILDIRIM atiyordu.                                 */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, esyaKaydet, _durum } from "@minecraft/server";
import { readFileSync } from "node:fs";
const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

esyaKaydet("pa:iksir_nitroksin", "pa:iksir_grinoksin",
           "pa:goz_beyaz", "pa:goz_beyaz_lazer", "pa:kol_toprak", "pa:kol_buz");

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };

sus();
const mc = await import("@minecraft/server");
await import("./pack/main.js");
const kayit = await import("./pack/yetenekler/kayit.js");
const ayar = await import("./pack/ayarlar.js");
ac();

let gecti = 0;
const hatalar = [];
function ol(ad, kosul, ek) {
  if (kosul) { gecti++; return; }
  hatalar.push(ad + (ek ? "  -> " + ek : ""));
}

/* Calisan yetenegi yakala: olustur() sarmalaniyor, is uretilmiyor */
const calisan = [];
for (const t of kayit.tumYetenekler()) {
  const eski = t.olustur;
  t.olustur = function (o) { calisan.push(t.kimlik); return undefined; };
  t._gercek = eski;
}

function kur(id, elde) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: -0.05, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = id;
  o.typeId = "minecraft:player";
  o.isSneaking = true;
  o._kafa = undefined;
  o._menu = undefined;
  o.addEffect = () => {};
  o.removeEffect = () => {};
  o.getComponent = (ad) => (ad === "minecraft:equippable") ? {
    getEquipment: (s) =>
      s === "Mainhand" ? (elde ? { typeId: elde } : undefined)
      : (s === "Head" && o._kafa) ? { typeId: o._kafa } : undefined,
    setEquipment: (s, e) => {
      if (s === "Head") o._kafa = e ? e.typeId : undefined;
      return true;
    }
  } : undefined;
  _durum.oyuncular = [o];
  return { D, o };
}

const ic = (o, esya = "pa:iksir_nitroksin") => {
  sus();
  mc.itemCompleteUseTetikle({ source: o, itemStack: { typeId: esya } });
  tickIlerlet(2);
  ac();
};

function zipla(o) {
  o.isJumping = true;  sus(); tickIlerlet(8);  ac();
  o.isJumping = false; sus(); tickIlerlet(10); ac();
}

function jest(o) { calisan.length = 0; zipla(o); return calisan.slice(); }

/* ---- 0. Hatanin zemini hala duruyor mu ----
   Bu sinamalar "sorun cozuldu, artik gereksiz" diye silinmesin
   diye var: lazer hala listenin ortasinda ve 0. sira hala bir
   yildirim yetenegi. Yani mod olmazsa hata geri gelir.        */
{
  const sira = kayit.esyasizSira();
  const i = sira.findIndex((t) => t.kimlik === "goz_lazeri");
  ol("goz_lazeri esyasiz sirada var", i >= 0);
  ol("lazer hala listenin basinda DEGIL (yani mod sart)", i > 3,
     "lazer " + i + ". sirada");
  ol("0. sira hala bir yildirim yetenegi (sikayetin kaynagi)",
     /simsek|yildirim/.test(sira[0].kimlik), sira[0].kimlik);

  const kollar = readFileSync("./pack/yetenekler/kollar.js", "utf8");
  const toprak = /\["pa:kol_toprak"([\s\S]*?)\]/.exec(kollar)[1];
  ol("Toprak Kol'da yildirim yetenegi var (sikayetin kaynagi)",
     /yildirim_halkasi|alan_simsegi|coklu_simsek/.test(toprak));
}

/* ---- 1. ASIL SINAMA: elde kol varken lazer ---- */
{
  const { o } = kur("l1", "pa:kol_toprak");
  ic(o);
  const c = jest(o);
  ol("elde KOL varken iksir icince egil+zipla LAZER atiyor",
     c.length === 1 && c[0] === "goz_lazeri", c.join(", ") || "(hicbir sey)");
  ol("kolun yildirim yetenegi calismadi",
     !c.some((k) => /simsek|yildirim/.test(k)), c.join(", "));
}

/* ---- 2. Elde kol YOKKEN de calismali ---- */
{
  const { o } = kur("l2");
  ic(o);
  const c = jest(o);
  ol("elde kol YOKKEN de lazer atiyor",
     c.length === 1 && c[0] === "goz_lazeri", c.join(", ") || "(hicbir sey)");
}

/* ---- 3. Iksir ICMEDEN mod acilmamali ----
   Yoksa lazer surekli acik kalir ve kol yetenekleri hic
   calismaz -- duzeltirken yeni bir hata yaratmayalim.        */
{
  const { o } = kur("l3", "pa:kol_toprak");
  const c = jest(o);
  ol("iksirsizken KOLUN yetenegi calisiyor",
     c.length === 1 && c[0] !== "goz_lazeri", c.join(", ") || "(hicbir sey)");
}

/* ---- 4. Kademe bitince kol yetenegi GERI GELMELI ---- */
{
  const { o } = kur("l4", "pa:kol_toprak");
  ic(o);
  ol("iksirliyken lazer", jest(o)[0] === "goz_lazeri");

  const kademe = ayar.KADEMELER.find((k) => k.kimlik === "nitroksin");
  sus(); tickIlerlet(kademe.sure + 40); ac();

  const c = jest(o);
  ol("kademe bitince KOLUN yetenegi geri geldi",
     c.length === 1 && c[0] !== "goz_lazeri", c.join(", ") || "(hicbir sey)");
  ol("kademe bitince goz de cikti", o._kafa === undefined, String(o._kafa));
}

/* ---- 5. Menude "Goz Lazeri" satiri ----
   Tablette tek-dokunusluk yol bu. Bot'ta ayni tuzaga
   dusulmustu (v4.23) ve cozum menu olmustu.                  */
{
  const menuKaynak = readFileSync("./pack/main.js", "utf8");
  ol("menuEkleri'nde Goz Lazeri satiri var",
     /Goz Lazeri/.test(menuKaynak));
  ol("satir sadece lazerli kademe varken ekleniyor",
     /lazerliKademe\(/.test(menuKaynak));
  ol("lazer modu playerLeave'de temizleniyor",
     /lazerModu\.delete\(olay\.playerId\)/.test(menuKaynak));
  ol("egil\\+zipla dalinda lazer modu KOLDAN ONCE bakiliyor",
     menuKaynak.indexOf("lazerModu.has(id)") <
     menuKaynak.indexOf("const sagKol = eldekiKol"),
     "kol dali once geliyor -- hata geri gelmis olur");
}

/* ---- 6. Iki kademe ust uste: mod acik kalmali ---- */
{
  const { o } = kur("l6", "pa:kol_buz");
  ic(o, "pa:iksir_nitroksin");
  ic(o, "pa:iksir_grinoksin");
  const c = jest(o);
  ol("iksir degistirince lazer hala calisiyor",
     c[0] === "goz_lazeri", c.join(", ") || "(hicbir sey)");
}

/* ---- 7. Goz esyasi yaratici menude GORUNMEMELI ----
   Kullanici: "gozleri ayri bir esya yapma... yani ayri bir sey
   olmasin." Esya kayitli kaliyor (script takiyor), sadece
   listede cikmiyor.                                          */
{
  const BP = KOK + "/Simsek_TNT_ToprakTopu";
  const gozler = ["goz_beyaz", "goz_yesil", "goz_kirmizi", "goz_ates",
                  "goz_kan", "goz_mavi", "goz_yildiz", "goz_element"];
  for (const g of gozler) {
    for (const t of [g, g + "_lazer"]) {
      const j = JSON.parse(readFileSync(BP + "/items/" + t + ".json", "utf8"));
      const d = j["minecraft:item"].description;
      ol(t + " yaratici menude gizli",
         d.menu_category && d.menu_category.category === "none",
         JSON.stringify(d.menu_category));
      /* Gizlemek KAYDI silmemeli: silinirse script gozu takamaz */
      ol(t + " hala kayitli bir esya", d.identifier === "pa:" + t,
         d.identifier);
      ol(t + " hala giyilebilir",
         !!j["minecraft:item"].components["minecraft:wearable"]);
    }
  }
  /* Iksirler GORUNMEYE devam etmeli -- onlari elle alacaksin */
  const iks = JSON.parse(readFileSync(BP + "/items/iksir_nitroksin.json", "utf8"));
  ol("iksir yaratici menude GORUNUYOR",
     iks["minecraft:item"].description.menu_category.category !== "none");
}

if (hatalar.length) {
  console.error("KALDI:");
  for (const h of hatalar) console.error("  - " + h);
  process.exit(1);
}
console.log("lazer_modu.mjs  gecti: " + gecti + "  kaldi: yok");
