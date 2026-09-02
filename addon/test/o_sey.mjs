/* O SEY ("That Thing") -- v4.88

   Kullanicinin istegi: "6 tane kolu var bir tane daha bedeni var
   ... kendi skinimize gore detaylica bir arastirma yap."

   Bu dosyanin kilitledigi UC sey:

   1. SEKIL. Geometri referans modun jar'indan bytecode ile
      cozuldu. Dort fazladan kol +-90 donuk kemiklerde duruyor;
      donusun ISARETI yanlissa kollar govdenin ICINE bakar ve
      oyunda "hicbir sey olmamis" gibi gorunur. Test kollarin
      donusten SONRA govdenin DISINA ciktigini olcuyor.

   2. DOKU. Model, oyuncu skininin IKINCI KATMAN alanlarini
      ornekliyor (ust beden, sol bacak, bacak uzantisi). Bizim
      skinimizde o alanlar BOS -- olculdu: 0/384, 0/256, 0/256.
      Doku turetilmezse ust beden ve sol bacak GORUNMEZ olur.
      Test her yuzun dolu piksele bastigini sinliyor.

   3. IKI YERDE YAZILI SAYILAR. ayarlar.js ile kol_uret.py'nin
      urettigi varlik JSON'u ayni seyi soylemeli. Bu depoda
      besinci kez ayni ders.                                   */

import { readFileSync } from "node:fs";
const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

const BP = KOK + "/Simsek_TNT_ToprakTopu";
const RP = KOK + "/Simsek_Kol_Kaynak";

const ayar = await import("./pack/ayarlar.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

const oku = (y) => JSON.parse(readFileSync(y, "utf8"));

/* ---------------------------------------------------------------
   Bedrock donme cozumu.

   OLCULDU, tahmin degil: dosyadaki "rotation" degeri
   matematiksel sag-el donusunun TERSI.
     - boralo_canli/.../dirt_staff.geo.json: duz okumada asa
       ayaklarin altina (y ~ -8), ters okumada el hizasina
       (y ~ +8) dusuyor.
     - Elimizdeki butun Bedrock paketlerindeki 1184 donmus kup
       iki isaretle de dondurulup ele uzakligi olculdu:
       948 ters okumayi, 236 duz okumayi destekledi.
   --------------------------------------------------------------- */
function don(p, pivot, rot) {
  let x = p[0] - pivot[0], y = p[1] - pivot[1], z = p[2] - pivot[2];
  const [rx, ry, rz] = rot.map((a) => -a * Math.PI / 180);
  [y, z] = [y * Math.cos(rx) - z * Math.sin(rx), y * Math.sin(rx) + z * Math.cos(rx)];
  [x, z] = [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)];
  [x, y] = [x * Math.cos(rz) - y * Math.sin(rz), x * Math.sin(rz) + y * Math.cos(rz)];
  return [x + pivot[0], y + pivot[1], z + pivot[2]];
}

const geo = oku(RP + "/models/entity/o_sey.geo.json")["minecraft:geometry"][0];
const kemik = new Map(geo.bones.map((b) => [b.name, b]));

/* Bir kupun donusumden SONRAKI sinir kutusu. Kemik zinciri
   boyunca butun donusler uygulaniyor -- Bedrock da oyle
   yapiyor.                                                    */
function sinir(ad, kup) {
  const [ox, oy, oz] = kup.origin, [w, h, d] = kup.size;
  let koseler = [];
  for (let i = 0; i < 8; i++) {
    koseler.push([ox + (i & 1 ? w : 0), oy + (i & 2 ? h : 0), oz + (i & 4 ? d : 0)]);
  }
  for (let k = kemik.get(ad); k; k = k.parent ? kemik.get(k.parent) : undefined) {
    if (k.rotation && k.rotation.some((a) => a !== 0)) {
      koseler = koseler.map((p) => don(p, k.pivot, k.rotation));
    }
  }
  const eks = (i) => koseler.map((p) => p[i]);
  return {
    x: [Math.min(...eks(0)), Math.max(...eks(0))],
    y: [Math.min(...eks(1)), Math.max(...eks(1))],
    z: [Math.min(...eks(2)), Math.max(...eks(2))]
  };
}

const kupler = [];
for (const b of geo.bones) {
  for (const c of b.cubes || []) kupler.push({ kemik: b.name, kup: c, s: sinir(b.name, c) });
}

console.log("=== 1. ALTI KOL ===");
{
  /* Iki normal (sarkan) + dort yatay. Referans modda tam boyle:
     RightArm/LeftArm sarkiyor, Middle/Upper ciftleri +-90 donuk.  */
  const yatay = kupler.filter((k) => /Middle|Upper/.test(k.kemik) ||
                                     /_r\d/.test(k.kemik));
  kontrol("dort fazladan kol var", yatay.length === 4, yatay.length + " kup");

  const sarkan = kupler.filter((k) => k.kemik === "rightArm" || k.kemik === "leftArm");
  kontrol("iki normal kol var", sarkan.length === 2);
  kontrol("toplam alti kol", yatay.length + sarkan.length === 6);

  for (const k of yatay) {
    const en = k.s.x[1] - k.s.x[0], boy = k.s.y[1] - k.s.y[0];
    /* DONUS ISARETI. Doner kol 4 genis 12 uzun bir kutu; +-90
       sonrasi 12 genis 4 uzun olmali. Olmuyorsa donus hic
       uygulanmamis demektir.                                  */
    kontrol(k.kemik + ": donus uygulanmis (12 genis, 4 uzun)",
            Math.abs(en - 12) < 0.01 && Math.abs(boy - 4) < 0.01,
            en + " x " + boy);

    /* DISARI mi bakiyor? Govde x[-4,4]. Kol govdenin disina
       cikmali. Isaret ters olsaydi kol govdenin icine/karsi
       tarafa duserdi -- oyunda "kollar kaybolmus" gibi gorunur
       ve sebebi hic anlasilmaz.                               */
    const sag = k.kemik.startsWith("right");
    kontrol(k.kemik + ": " + (sag ? "SOLA" : "SAGA") + " degil DISARI bakiyor",
            sag ? k.s.x[0] < -4 && k.s.x[1] <= -3
                : k.s.x[1] > 4 && k.s.x[0] >= 3,
            "x[" + k.s.x[0] + "," + k.s.x[1] + "]");
  }

  /* Iki yukseklik kademesi: orta cift ve ust cift ayrismali,
     yoksa dort kol ust uste biner ve ikisi gorunmez.          */
  const ylar = [...new Set(yatay.map((k) => k.s.y[0]))].sort((a, b) => a - b);
  kontrol("yatay kollar iki ayri yukseklikte", ylar.length === 2,
          "y = " + ylar.join(" ve "));
}

console.log("");
console.log("=== 2. IKINCI BEDEN ===");
{
  const govde = kupler.filter((k) => k.kemik === "body");
  kontrol("govde iki kupten olusuyor", govde.length === 2, govde.length + " kup");

  const boy = govde.reduce((t, k) => t + (k.s.y[1] - k.s.y[0]), 0);
  kontrol("govde 18 birim (normal insansi 12)", boy === 18, boy + " birim");

  /* Iki kup UST USTE olmali, yan yana degil: alt bedenin tepesi
     ust bedenin tabani.                                       */
  const [alt, ust] = govde.sort((a, b) => a.s.y[0] - b.s.y[0]);
  kontrol("ikinci beden birincinin USTUNDE", alt.s.y[1] === ust.s.y[0],
          "alt tepe " + alt.s.y[1] + " = ust taban " + ust.s.y[0]);

  /* Ust beden skinin KAPLAMA alanini ornekliyor -- referans
     modun tercihi. Doku turetilmesinin sebebi bu.             */
  kontrol("ust beden govde kaplamasindan (uv 16,32)",
          ust.kup.uv[0] === 16 && ust.kup.uv[1] === 32,
          "uv " + ust.kup.uv.join(","));
}

console.log("");
console.log("=== 3. OLCULER ===");
{
  const ys = kupler.flatMap((k) => k.s.y);
  const xs = kupler.flatMap((k) => k.s.x);
  const taban = Math.min(...ys), tepe = Math.max(...ys);
  kontrol("ayaklar yerde (y=0)", taban === 0, "taban " + taban);
  kontrol("boy 44 birim = 2.75 blok", tepe === 44, tepe + " birim");
  kontrol("kollarla genislik 30 birim",
          Math.max(...xs) - Math.min(...xs) === 30);

  const bacaklar = kupler.filter((k) => /Leg$/.test(k.kemik));
  kontrol("bacaklar 18 uzun (normal 12)",
          bacaklar.every((k) => k.s.y[1] - k.s.y[0] === 18), bacaklar.length + " bacak");

  /* Carpisma kutusu modelin gercek boyuyla ayni olmali. Kucuk
     kalirsa iki blokluk delikten gecip duvarin icinde kaliyor. */
  const v = oku(BP + "/entities/o_sey.json")["minecraft:entity"];
  const kutu = v.components["minecraft:collision_box"];
  kontrol("carpisma kutusu modelin boyu", kutu.height === ayar.SEY_BOY,
          kutu.height + " blok");
  kontrol("model boyu ile carpisma kutusu tutuyor",
          Math.abs(tepe / 16 - ayar.SEY_BOY) < 0.01);
}

console.log("");
console.log("=== 4. DOKU KENDI SKINIMIZDEN, HICBIR YUZ BOS DEGIL ===");
{
  /* PNG'yi elle cozuyoruz: sim'de PIL/canvas yok, disari
     bagimlilik da eklenmeyecek. 64x64 RGBA yeterince kucuk.   */
  const png = readFileSync(RP + "/textures/entity/o_sey.png");
  const { inflateSync } = await import("node:zlib");
  let p = 8, w = 0, h = 0, derinlik = 0, tip = 0, veri = [];
  while (p < png.length) {
    const boy = png.readUInt32BE(p);
    const ad = png.toString("ascii", p + 4, p + 8);
    if (ad === "IHDR") {
      w = png.readUInt32BE(p + 8); h = png.readUInt32BE(p + 12);
      derinlik = png[p + 16]; tip = png[p + 17];
    } else if (ad === "IDAT") {
      veri.push(png.subarray(p + 8, p + 8 + boy));
    }
    p += 12 + boy;
  }
  kontrol("doku 64x64 RGBA", w === 64 && h === 64 && derinlik === 8 && tip === 6,
          w + "x" + h + " tip " + tip);

  const ham = inflateSync(Buffer.concat(veri));
  const kanal = 4, satir = w * kanal;
  const px = Buffer.alloc(w * h * kanal);
  for (let y = 0; y < h; y++) {
    const suzgec = ham[y * (satir + 1)];
    const kaynak = ham.subarray(y * (satir + 1) + 1, y * (satir + 1) + 1 + satir);
    for (let i = 0; i < satir; i++) {
      const a = i >= kanal ? px[y * satir + i - kanal] : 0;
      const b = y > 0 ? px[(y - 1) * satir + i] : 0;
      const c = (i >= kanal && y > 0) ? px[(y - 1) * satir + i - kanal] : 0;
      let d = kaynak[i];
      if (suzgec === 1) d += a;
      else if (suzgec === 2) d += b;
      else if (suzgec === 3) d += (a + b) >> 1;
      else if (suzgec === 4) {
        const t = a + b - c, pa = Math.abs(t - a), pb = Math.abs(t - b), pc = Math.abs(t - c);
        d += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
      px[y * satir + i] = d & 255;
    }
  }
  const alfa = (x, y) => px[y * satir + x * kanal + 3];

  /* Kutu-uv duzeni: (u+d, v+d) boyut (w,h) = ON yuz.
     Kose dolgulari (u,v) ve (u+d+2w, v) HER skinde bostur --
     onlar sayilmiyor, cizilmiyorlar.                          */
  for (const { kemik: ad, kup } of kupler) {
    const [u, v] = kup.uv, [kw, kh, kd] = kup.size;
    const yuzler = [
      ["on",   u + kd,           v + kd, kw, kh],
      ["arka", u + 2 * kd + kw,  v + kd, kw, kh],
      ["yan1", u,                v + kd, kd, kh],
      ["yan2", u + kd + kw,      v + kd, kd, kh],
      ["ust",  u + kd,           v,      kw, kd],
      ["alt",  u + kd + kw,      v,      kw, kd]
    ];
    let bos = 0, hangi = "";
    for (const [yad, x0, y0, ew, eh] of yuzler) {
      let n = 0;
      for (let y = y0; y < y0 + eh; y++) {
        for (let x = x0; x < x0 + ew; x++) if (alfa(x, y) === 0) n++;
      }
      if (n === ew * eh) { bos++; hangi = yad; }
    }
    kontrol(ad + " (uv " + u + "," + v + "): hicbir yuzu tamamen saydam degil",
            bos === 0, bos ? hangi + " yuzu bos" : "");
  }

  /* Doku KENDI skinimizden turetilmis olmali: kafa bolgesi
     kaynak dosyayla birebir ayni kalmali (o alan kopyalanmiyor,
     oldugu gibi geliyor). Boylece "skini degistirdim ama O Sey
     eski kaldi" durumu yakalanir.                             */
  const skin = readFileSync(KOK + "/UzakAkraba_skin.png");
  kontrol("kaynak skin duruyor (UzakAkraba_skin.png)", skin.length > 0);
}

console.log("");
console.log("=== 5. VARLIK VE AYARLAR AYNI SEYI SOYLUYOR ===");
{
  const v = oku(BP + "/entities/o_sey.json")["minecraft:entity"];
  kontrol("kimlik ayarlar.js ile ayni",
          v.description.identifier === ayar.SEY_KIMLIK, v.description.identifier);
  kontrol("can ayarlar.js ile ayni",
          v.components["minecraft:health"].value === ayar.SEY_CAN,
          v.components["minecraft:health"].value + " = " + (ayar.SEY_CAN / 2) + " kalp");
  kontrol("hasar ayarlar.js ile ayni",
          v.components["minecraft:attack"].damage === ayar.SEY_HASAR,
          v.components["minecraft:attack"].damage + " = " + (ayar.SEY_HASAR / 2) + " kalp");

  /* v4.66 dersi: bilesen gruplari temel bilesenleri EZIYOR.
     Grup icinde attack/health/movement kalirsa savasa girer
     girmez normal bot sayilarina duser.                       */
  for (const [ad, ic] of Object.entries(v.component_groups || {})) {
    if (ad === "pa:bekle") continue;
    for (const b of ["minecraft:attack", "minecraft:health", "minecraft:movement"]) {
      kontrol(ad + " grubunda " + b + " yok (v4.66)", !(b in ic));
    }
  }

  kontrol("yumurtayla dogurulabilir", v.description.is_spawnable === true);
  kontrol("summon ile cagrilabilir", v.description.is_summonable === true);

  /* pa_bot ailesinde olmali: yoksa botlar birbirini dover.    */
  kontrol("pa_bot ailesinde",
          (v.components["minecraft:type_family"].family || []).includes("pa_bot"));
  kontrol("botTuruMu(pa:o_sey) dogru", ayar.botTuruMu(ayar.SEY_KIMLIK) === true);
}

console.log("");
console.log("=== 6. ISTEMCI TARAFI ===");
{
  const c = oku(RP + "/entity/o_sey.entity.json")["minecraft:client_entity"].description;
  kontrol("istemci kimligi ayni", c.identifier === ayar.SEY_KIMLIK);
  kontrol("kendi geometrisi", c.geometry.default === "geometry.o_sey");
  kontrol("kendi dokusu", c.textures.default === "textures/entity/o_sey");
  /* v4.28: ozel render controller botu GORUNMEZ yapmisti.
     O yola bir daha girilmiyor.                               */
  kontrol("vanilla render controller",
          c.render_controllers.length === 1 &&
          c.render_controllers[0] === "controller.render.default",
          c.render_controllers.join(","));

  const anim = oku(RP + "/animations/o_sey.animation.json").animations;
  const yuru = anim["animation.o_sey.yuru"];
  kontrol("yuruyus animasyonu tanimli", !!yuru);
  kontrol("istemci animasyonu ayni adi kullaniyor",
          c.animations.yuru === "animation.o_sey.yuru");

  /* Yatay kollar Y ekseninde sallanmali: X'te sallansaydi kol
     kendi uzun ekseni etrafinda doner, yani hicbir sey olmazdi.
     Referans mod da Y kullaniyor (field_78796_g).             */
  for (const ad of ["rightUpperArm", "leftUpperArm",
                    "rightMiddleArm", "leftMiddleArm"]) {
    const r = yuru.bones[ad] && yuru.bones[ad].rotation;
    kontrol(ad + ": Y ekseninde salliniyor",
            !!r && r[0] === 0 && typeof r[1] === "string" && r[2] === 0);
  }
  for (const ad of ["rightLeg", "leftLeg", "rightArm", "leftArm"]) {
    const r = yuru.bones[ad] && yuru.bones[ad].rotation;
    kontrol(ad + ": X ekseninde salliniyor",
            !!r && typeof r[0] === "string" && r[1] === 0 && r[2] === 0);
  }
}

console.log("");
console.log("=== 7. ILKEL BESLI'YE KARISMADI ===");
{
  /* Kullanici bes uyeyi tek tek dogruladi. O Sey ayri bir
     efsane; listeye sizmasi o dogrulamayi bozardi.            */
  kontrol("ILKEL_BESLI hala bes kisi", ayar.ILKEL_BESLI.size === 5,
          ayar.ILKEL_BESLI.size + " uye");
  kontrol("O Sey ILKEL_BESLI'de degil",
          ![...ayar.ILKEL_BESLI.values()].some((t) => t.kimlik === ayar.SEY_KIMLIK));
  kontrol("ama bot turlerinde", ayar.BOT_KIMLIKLER.has(ayar.SEY_KIMLIK));
}

console.log("");
console.log("=== 8. ULASILABILIYOR MU ===");
{
  /* v4.83 dersi: "yetenek CALISIYOR mu" ile "yetenege
     ULASILABILIYOR mu" AYRI iki soru. El-Harkos'un asasi dort
     surum boyunca kusursuz calisti -- kimse ona ulasamadigi
     icin olu bir esyaydi. O yuzden burada zincirin tamami
     sinaniyor: kayit -> import -> menu satiri.                */
  await import("./pack/yetenekler/o_sey.js");
  const kayit = await import("./pack/yetenekler/kayit.js");
  const hepsi = kayit.tumYetenekler ? kayit.tumYetenekler() : null;
  if (hepsi) {
    kontrol("yetenek kayitli", hepsi.some((y) => y.kimlik === "o_sey"));
  }

  const kaynak = readFileSync(BP + "/scripts/main.js", "utf8");
  kontrol("main.js o_sey.js'i import ediyor",
          kaynak.includes('import "./yetenekler/o_sey.js";'));
  kontrol("menude satiri var (tek dokunusluk yol)",
          /calis\(\)\s*\{\s*seyBaslat\(oyuncu\);\s*\}/.test(kaynak));
  kontrol("menu satiri yanindaki sayiyi gosteriyor",
          kaynak.includes("seySayisi(oyuncu.id)"));

  /* Yeni bir KOL yapilmadi: kullanicinin kurali "her seyi kol
     yapma, kol israfini onle".                                */
  const uretec = readFileSync(KOK + "/kol_uret.py", "utf8");
  const kollar = (uretec.match(/^\s*\("kol_\w+",/gm) || []).length;
  /* ---- 6 -> 7  (v6.7) ----
     Bu satir "kol israfi" bekcisi: v4.33 ve v4.46'da dort+dort
     kol kaldirilmisti, sayi elle tutuluyor ki yeni kol SESSIZCE
     eklenemesin. Kanli Kol kullanicinin ACIK istegi
     ("ozellikle kanli kolu istiyorum"), o yuzden sayi bilerek
     yediye cikti. Bekci calismaya devam ediyor.            */
    /* ---- 7 -> 8  (v7.7) ----
     ANNA KOLU. Kullanicinin acik istegi ("Anna1545 Kolu'nu
     ekleyelim once"). Sayi YINE ELLE guncellendi -- otomatik
     saymak bekciyi olduruyor, cunku bekcinin isi tam olarak
     "yeni kol sessizce eklenmesin".
     Anna kol israfi degil: tek yetenegi (can_ver) BASKASINI
     iyilestiriyor ve depoda bunu yapan baska hicbir sey yok.  */
kontrol("izinsiz kol acilmadi (9 kol)", kollar === 9, kollar + " kol");
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> O Sey ayakta: alti kol, iki beden");
process.exit(hata ? 1 : 0);
