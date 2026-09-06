/* IKI KOLLU KOLLARDA SAG/SOL SIMETRISI                    v7.42

   Kullanici: "bir sorun var sol hep sag kola gore daha yukarida
   lutfen duzelt." (Kanli Kol takiliyken.)

   ---- OLCUM ONCE MODELI TEMIZE CIKARDI ----
   simsek_kol_kanli'nin iki yarisi kemik ve kup donusleri de
   uygulandiktan sonra birebir ayna. Suclu vanilla'nin tutus pozu:
       leftarm : variable.is_holding_left  ? (-this * 0.5 - 18.0) : 0.0
       rightarm: variable.is_holding_right ? (-this * 0.5 - 18.0) : 0.0
   Esya ana elde oldugu icin sag kol -18 derece egiliyor, sol kol
   sifira EZILIYOR. Fark: sol 0.28 birim yukarida, sag 5.62 birim
   ileride.

   ---- BU DOSYA IKI SEYI BIRDEN TUTUYOR ----
   1. MODEL aynali kalsin. Bir gun kaynak model degisir ve iki
      yari ayrisirsa duzeltme calissa bile kollar ayrisir.
   2. DUZELTME yerinde kalsin: `animation.player.holding` ezilmis
      olsun, iki kola da AYNI ifade gitsin ve tetik degiskeni
      iki kollu kollarin TAMAMINI kapsasin.

   Ucuncu olarak bir DENETIM var: tek kollu geometriler
   (geometry.simsek_kol) listeye girmemeli, yoksa liste
   sisirilir ve neyin neden orada oldugu kaybolur.            */

import { readFileSync, existsSync, readdirSync } from "node:fs";

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const RP  = KOK + "/Simsek_Kol_Kaynak";
const OMP = KOK + "/Simsek_Oyuncu_Modeli";

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const oku = (y) => JSON.parse(readFileSync(y, "utf8"));

/* ---- kucuk 3B: Bedrock kemik/kup donusu ---- */
const rad = (d) => (d * Math.PI) / 180;
const carp = (A, B) =>
  [0, 1, 2].map((i) => [0, 1, 2].map((j) =>
    [0, 1, 2].reduce((s, k) => s + A[i][k] * B[k][j], 0)));
function donus([x, y, z]) {
  const [cx, sx, cy, sy, cz, sz] =
    [Math.cos(rad(x)), Math.sin(rad(x)), Math.cos(rad(y)),
     Math.sin(rad(y)), Math.cos(rad(z)), Math.sin(rad(z))];
  return carp([[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]],
              carp([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]],
                   [[1, 0, 0], [0, cx, -sx], [0, sx, cx]]));
}
const uygula = (M, v) => [0, 1, 2].map((i) =>
  [0, 1, 2].reduce((s, k) => s + M[i][k] * v[k], 0));

/* Kok kemikten baslayip butun alt kemikleri gezer, dunya
   uzayindaki en kucuk/en buyuk noktalari dondurur. `ek` kok
   kemige EKSTRA bir donus takar -- vanilla tutus pozunu
   taklit etmek icin.                                        */
function sinirlar(geo, kok, ek = null) {
  const kemik = Object.fromEntries(geo.bones.map((b) => [b.name, b]));
  const nokta = [];
  const gez = (ad, M, T, ekstra) => {
    const b = kemik[ad];
    const p = b.pivot || [0, 0, 0];
    for (const r of [ekstra, b.rotation].filter(Boolean)) {
      const R = donus(r);
      const M2 = carp(M, R);
      T = [0, 1, 2].map((i) => T[i] + uygula(M, p)[i] - uygula(M2, p)[i]);
      M = M2;
    }
    for (const c of b.cubes || []) {
      const f = c.inflate || 0;
      const o = c.origin.map((v) => v - f);
      const s = c.size.map((v) => v + 2 * f);
      for (const dx of [0, 1]) for (const dy of [0, 1]) for (const dz of [0, 1]) {
        let q = [o[0] + dx * s[0], o[1] + dy * s[1], o[2] + dz * s[2]];
        if (c.rotation) {
          const cp = c.pivot || [0, 0, 0];
          q = uygula(donus(c.rotation), q.map((v, i) => v - cp[i]))
                .map((v, i) => v + cp[i]);
        }
        nokta.push(uygula(M, q).map((v, i) => v + T[i]));
      }
    }
    for (const c of geo.bones) if (c.parent === ad) gez(c.name, M, T, null);
  };
  gez(kok, [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [0, 0, 0], ek);
  return [0, 1, 2].map((i) => [Math.min(...nokta.map((p) => p[i])),
                               Math.max(...nokta.map((p) => p[i]))]);
}

/* ================================================================
   1. HANGI KOLLAR IKI KOLLU
   ================================================================ */
console.log("=== 1. IKI KOLLU KOLLARIN TESPITI ===");
const ciftGeo = new Map();   // esya kimligi -> geometri adi
const tekGeo  = [];
for (const dosya of readdirSync(RP + "/attachables").sort()) {
  if (!dosya.startsWith("kol_")) continue;
  const kimlik = dosya.replace(/\.json$/, "");
  const geoAd = oku(RP + "/attachables/" + dosya)["minecraft:attachable"]
                  .description.geometry.default;
  const yol = RP + "/models/entity/" + geoAd.replace("geometry.", "") + ".geo.json";
  if (!existsSync(yol)) { kontrol(kimlik + " geometrisi var", false, yol); continue; }
  const g = oku(yol)["minecraft:geometry"][0];
  const adlar = g.bones.map((b) => b.name.toLowerCase());
  if (adlar.includes("leftarm") && adlar.includes("rightarm")) ciftGeo.set(kimlik, geoAd);
  else tekGeo.push(kimlik);
}
kontrol("iki kollu kol bulundu", ciftGeo.size > 0,
        [...ciftGeo.keys()].join(", "));
kontrol("tek kollu kollar da var (liste sisirilmemis)", tekGeo.length > 0,
        tekGeo.length + " tane");

/* ================================================================
   2. MODEL AYNALI MI
   Kup kup. Bounding box yetmez: iki kup birbirini gizleyip
   kutuyu ayni gosterebilir, model yine de yamuk olur.
   ================================================================ */
console.log("=== 2. MODEL KUP KUP AYNALI MI ===");
for (const [kimlik, geoAd] of ciftGeo) {
  const g = oku(RP + "/models/entity/" + geoAd.replace("geometry.", "")
                + ".geo.json")["minecraft:geometry"][0];
  const kemik = Object.fromEntries(g.bones.map((b) => [b.name, b]));
  const cocuk = (kok) => g.bones.filter((b) => b.parent === kok);
  const sagC = cocuk("rightArm"), solC = cocuk("leftArm");
  kontrol(kimlik + ": kol kemikleri kok", !!kemik.rightArm && !kemik.rightArm.parent
          && !!kemik.leftArm && !kemik.leftArm.parent);
  kontrol("  omuz pivotlari aynali",
          !!kemik.rightArm && !!kemik.leftArm
          && kemik.rightArm.pivot[0] === -kemik.leftArm.pivot[0]
          && kemik.rightArm.pivot[1] === kemik.leftArm.pivot[1]
          && kemik.rightArm.pivot[2] === kemik.leftArm.pivot[2]);
  kontrol("  ayni sayida alt kemik", sagC.length === solC.length,
          sagC.length + " / " + solC.length);

  /* Kutu olcumu: Y ve Z AYNI, X aynali olmali. Bu, kupleri
     tek tek gezmeden once tutan kaba ama gercek bir olcu. */
  const S = sinirlar(g, "rightArm"), L = sinirlar(g, "leftArm");
  const yak = (a, b) => Math.abs(a - b) < 1e-6;
  kontrol("  Y birebir ayni", yak(S[1][0], L[1][0]) && yak(S[1][1], L[1][1]),
          "sag[" + S[1].map((v) => v.toFixed(3)) + "] sol[" + L[1].map((v) => v.toFixed(3)) + "]");
  kontrol("  X aynali", yak(S[0][0], -L[0][1]) && yak(S[0][1], -L[0][0]),
          "sag[" + S[0].map((v) => v.toFixed(3)) + "] sol[" + L[0].map((v) => v.toFixed(3)) + "]");
}

/* ================================================================
   3. VANILLA TUTUS POZU EZILMIS MI
   ================================================================ */
console.log("=== 3. TUTUS POZU EZILMESI ===");
const animYol = OMP + "/animations/oyuncu_tutus.animation.json";
kontrol("oyuncu_tutus.animation.json var", existsSync(animYol));
let ifadeler = null;
if (existsSync(animYol)) {
  const a = oku(animYol).animations["animation.player.holding"];
  kontrol("  animation.player.holding eziliyor", !!a);
  if (a) {
    const sol = a.bones.leftarm.rotation, sag = a.bones.rightarm.rotation;
    ifadeler = [sol[0], sag[0]];
    kontrol("  iki kol da X ekseninde", sol[1] === 0 && sol[2] === 0
            && sag[1] === 0 && sag[2] === 0);
    /* ASIL GUVENCE: iki ifade yalniz left/right kelimesinde
       ayrilsin. Sayilardan biri degisirse (ornegin biri -18,
       oteki -20 olursa) kollar gene ayrisir ve bu duser.   */
    kontrol("  iki ifade left/right disinda BIREBIR ayni",
            sol[0].replace(/_left/g, "_X") === sag[0].replace(/_right/g, "_X"),
            sol[0]);
    /* Vanilla sayilari BIREBIR kopya. Tahminle yazilsaydi
       diger butun esyalarin tutusu bozulurdu.              */
    kontrol("  vanilla ifadesi korunmus (-this * 0.5 - 18.0)",
            sol[0].includes("(-this * 0.5 - 18.0)")
            && sag[0].includes("(-this * 0.5 - 18.0)"));
    kontrol("  kosula variable.simsek_cift_kol eklenmis",
            sol[0].includes("variable.simsek_cift_kol")
            && sag[0].includes("variable.simsek_cift_kol"));
    kontrol("  vanilla kosullari duruyor",
            sol[0].includes("variable.is_holding_left")
            && sag[0].includes("variable.is_holding_right"));
  }
}

/* ================================================================
   4. TETIK DEGISKENI IKI KOLLU KOLLARIN HEPSINI KAPSIYOR MU
   Kapsamazsa yeni bir iki kollu kol eklendiginde sessizce
   yamuk cikar -- tam olarak bu surumde duzeltilen sey.
   ================================================================ */
console.log("=== 4. TETIK KAPSAMI ===");
{
  const on = oku(OMP + "/entity/player.entity.json")["minecraft:client_entity"]
               .description.scripts.pre_animation
               .find((s) => s.startsWith("variable.simsek_cift_kol"));
  kontrol("variable.simsek_cift_kol tanimli", !!on);
  if (on) {
    for (const kimlik of ciftGeo.keys()) {
      kontrol("  " + kimlik + " kapsamda",
              on.includes("'" + kimlik + "'"));
    }
    kontrol("  iki yuva da sinaniyor",
            on.includes("main_hand") && on.includes("off_hand"));
    for (const kimlik of tekGeo) {
      kontrol("  " + kimlik + " (tek kollu) listede DEGIL",
              !on.includes("'" + kimlik + "'"));
    }
  }
}

/* ================================================================
   5. OLCUM: DUZELTME POZDAN GELEN FARKI SIFIRLIYOR MU
   Olculen sey DUZELTMENIN GUVENCESI: tutus pozu iki kola artik
   AYNI seyi yapmali, yani modelin kendi farkini DEGISTIRMEMELI.
   Modelin kendi farki ayri bir sey ve 6. bolumde olculuyor --
   ikisi karistirilirsa hangisinin bozuldugu anlasilmaz.

   Once kontrol: bugunku vanilla davranisiyla (yalniz ana el
   egilir) poz farki gorunur olmali. Cikmazsa asagidaki "sifir"
   satiri hicbir sey olcmuyor demektir.
   ================================================================ */
console.log("=== 5. OLCUM (kontrollu) ===");
const TUTUS = [-18, 0, 0];
/* Duzeltmenin guvencesi: iki kol AYNI kemik donusunu alir.
   Ayna bir model icin bu, gorunur farki sifirlar -- cunku X
   aynasi ile X ekseni etrafindaki donus yer degistirebilir.
   Ayna OLMAYAN bir modelde sifirlamaz; orada kalan fark
   duzeltmenin degil MODELIN kusurudur (bkz. 6. bolum), o
   yuzden ikisi ayri olculuyor.                            */
for (const [kimlik, geoAd] of ciftGeo) {
  const g = oku(RP + "/models/entity/" + geoAd.replace("geometry.", "")
                + ".geo.json")["minecraft:geometry"][0];
  const fark = (ekSag, ekSol) => {
    const S = sinirlar(g, "rightArm", ekSag), L = sinirlar(g, "leftArm", ekSol);
    return [L[1][0] - S[1][0], L[1][1] - S[1][1],
            L[2][0] - S[2][0], L[2][1] - S[2][1]];
  };
  const taban  = fark(null, null);
  const bozuk  = fark(TUTUS, null);
  const duzgun = fark(TUTUS, TUTUS);
  const sapma = (a) => Math.max(...a.map((v, i) => Math.abs(v - taban[i])));
  const aynali = Math.max(...taban.map(Math.abs)) < 1e-6;

  kontrol(kimlik + ": pozdan gelen fark VAR (kontrol)", sapma(bozuk) > 0.1,
          "Y " + (bozuk[0] - taban[0]).toFixed(3) + "/" + (bozuk[1] - taban[1]).toFixed(3)
          + "  Z " + (bozuk[2] - taban[2]).toFixed(3) + "/" + (bozuk[3] - taban[3]).toFixed(3));
  if (aynali) {
    kontrol("  model aynali -> duzeltmeyle fark SIFIR", sapma(duzgun) < 1e-6,
            "en buyuk " + sapma(duzgun).toExponential(2));
  } else {
    /* Ayna olmayan modelde kalan fark PIVOTLANDI: kaynak model
       duzelirse (ya da daha cok bozulursa) bu satir duser.  */
    kontrol("  model aynali DEGIL -> kalan fark modelin kusuru",
            Math.abs(sapma(duzgun) - 5.305) < 0.001,
            "kalan " + sapma(duzgun).toFixed(3) + " (bkz. 6. bolum)");
  }
}

/* ================================================================
   6. MODELIN KENDI Z AYNASI
   Bu bolum DUZELTMEYLE ILGILI DEGIL; olcum sirasinda ortaya
   cikti ve kaybolmasin diye buraya yazildi.

   kns_kolluk_bobby_kanli.geo.json (kaynak model, Code-Man
   paketi) iki kolunu X'te DE Z'de DE aynaliyor -- yani sol kol
   sagin aynasi degil, 180 derece dondurulmus hali. Sonuc:
   sag yumruk one, sol yumruk ARKAYA bakiyor (13.222 birim).
   Chris'in kolunda boyle bir sey yok.

   NEDEN DUZELTILMEDI: duzeltmek sol kolun kuplerini yeniden
   yazmayi gerektiriyor (yalniz kemik donusunu degistirmek
   MATEMATIKSEL OLARAK yetmiyor -- gereken donusum bir yansima,
   determinanti -1, hicbir donus onu veremez). Kupleri yeniden
   yazmak uv eslemesini de tasir, yani GORUNUR bir sanat
   degisikligi olur. Bu depoda gorsel degisiklikler gorulmeden
   yapilmiyor ve kullanici bunu bildirmedi.

   Deger PIVOTLANDI: birisi kaynagi duzeltirse ya da bozarsa bu
   satir duser ve haber verir. Sessizce yesil yanmaz.
   ================================================================ */
console.log("=== 6. MODELIN KENDI Z AYNASI (bilgi) ===");
const Z_KUSUR = { "kol_kanli": 0, "kol_kanli_bobby": 13.222 };
for (const [kimlik, geoAd] of ciftGeo) {
  const g = oku(RP + "/models/entity/" + geoAd.replace("geometry.", "")
                + ".geo.json")["minecraft:geometry"][0];
  const S = sinirlar(g, "rightArm"), L = sinirlar(g, "leftArm");
  const z = Math.max(Math.abs(L[2][0] - S[2][0]), Math.abs(L[2][1] - S[2][1]));
  const beklenen = Z_KUSUR[kimlik];
  kontrol(kimlik + ": Z sapmasi olculdu",
          beklenen !== undefined && Math.abs(z - beklenen) < 0.001,
          z.toFixed(3) + (beklenen ? "  (kaynak modelin bilinen kusuru)" : "  (aynali)"));
}

console.log(hata ? "\nKALDI" : "\nhepsi gecti");
process.exit(hata ? 1 : 0);
