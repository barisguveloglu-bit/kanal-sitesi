/* IKSIR AURASI -- OZEL PARCACIK SISTEMI              v7.15

   Kullanici: "parcacikla baslayalim, en detaylisini yap."

   Depo bugune kadar yalniz VANILLA parcacik kimlikleri
   kullandi. Bu ilk kez Bedrock'un kendi parcacik sistemini
   yaziyor (24 dosya, 8 iksir x 3 tur) ve o sistemin sessizce
   bozulabilecegi cok yeri var:

     - flipbook doku SINIRINI asarsa zerre bos UV ornekler ve
       gorunmez olur; hicbir hata mesaji cikmaz
     - material adi yanlissa parcacik hic cizilmez
     - doku yolu yanlissa mor-siyah kare cikar
     - gradyan renkleri elle yazilirsa gozle aura ayrisir
     - parcacik adi elle bir tabloda tutulursa yeni iksirde
       biri guncellenip oteki unutulur

   Bu dosya bunlarin hepsini tutuyor.                       */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { inflateSync as zlibSync } from "node:zlib";
import { execFileSync } from "node:child_process";

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const RP = KOK + "/Simsek_Kol_Kaynak";
const BP = KOK + "/Simsek_TNT_ToprakTopu";

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const oku = (y) => JSON.parse(readFileSync(y, "utf8"));

const ayar = await import("./pack/ayarlar.js");


/* Ureteci OKUYORUZ: iksir renkleri orada tanimli ve auranin
   renkleri onlarla AYNI olmali. Ikinci bir renk listesi
   tutulsaydi biri degisip oteki kalirdi.                   */
const URETEC = readFileSync(KOK + "/kol_uret.py", "utf8");

/* URETILEN turler ureteceten OKUNUYOR, elle yazilmiyor.
   v7.19'da kullanici auranin kaldirilmasini isteyince elle
   yazilmis liste bayatladi ve otuz iki satir birden kirmizi
   yandi -- oysa kod dogruydu, LISTE eskiydi.               */
const TURLER = [...(/AURA_URETILEN = \(([^)]*)\)/.exec(URETEC)[1])
  .matchAll(/"(\w+)"/g)].map((m) => m[1]);

/* Tur -> sprite satiri eslemesi de ureteceten. Iki tur ayni
   satiri paylasabiliyor, o yuzden satir sayisi tur sayisiyla
   ayni olmak zorunda degil.                                 */
const TUR_SATIR = {};
for (const m of (/AURA_TUR_SATIR = \{([\s\S]*?)\}/.exec(URETEC)[1])
       .matchAll(/"(\w+)": "(\w+)"/g)) {
  TUR_SATIR[m[1]] = m[2];
}
/* Satir sirasi uretecteki ile AYNI kurala gore kuruluyor:
   URETILEN turlerin kullandigi satirlar, ilk gorulme sirasina
   gore. Ureteci taklit etmiyoruz, ayni kurali uyguluyoruz --
   AURA_SATIR artik uretecte hesaplanan bir sozluk, metinde
   arayacak sabit bir satir yok.                             */
const SATIR_ADLARI = [];
for (const t of TURLER) {
  if (!SATIR_ADLARI.includes(TUR_SATIR[t])) SATIR_ADLARI.push(TUR_SATIR[t]);
}
const SATIR_SAYISI = SATIR_ADLARI.length;
const SATIR_INDEKS = {};
SATIR_ADLARI.forEach((ad, i) => { SATIR_INDEKS[ad] = i; });

console.log("=== 1. IKI LISTE AYNI (elle eslesme tablosu YOK) ===");
{
  /* Parcacik adi kademe.kimlik'ten kuruluyor:
       pa:aura_kor_<kimlik>
     Yani KADEMELER (script) ile IKSIRLER (uretec) ayni
     kimlikleri tasimak ZORUNDA. Ayrisirlarsa bir iksirin
     aurasi sessizce hic cikmaz.                            */
  const blok = /IKSIRLER = \[([\s\S]*?)\n\]/.exec(URETEC)[1];
  const uretecKimlik = [...blok.matchAll(/^\s*\("(\w+)",/gm)].map((m) => m[1]);
  const scriptKimlik = ayar.KADEMELER.map((k) => k.kimlik);
  kontrol("uretec ve script ayni iksirleri tanıyor",
          JSON.stringify(uretecKimlik) === JSON.stringify(scriptKimlik),
          uretecKimlik.length + " / " + scriptKimlik.length);
  kontrol("sekiz iksir", scriptKimlik.length === 8, String(scriptKimlik.length));
}

console.log("");
console.log("=== 2. DOSYALAR VE SEMA ===");
const GECERLI_MALZEME = ["particles_add", "particles_alpha", "particles_blend"];
const dosyalar = [];
{
  const klasor = RP + "/particles";
  kontrol("particles klasoru var", existsSync(klasor));
  const hepsi = existsSync(klasor)
    ? readdirSync(klasor).filter((f) => f.endsWith(".particle.json")) : [];
  /* Sayi ELLE yazilmiyor: iksir sayisi x tur sayisi. v7.17'de
     dorduncu tur (gozalev) gelince elle yazilmis "24" iki ayri
     yerde bayatladi.                                        */
  const BEKLENEN = ayar.KADEMELER.length * TURLER.length;
  kontrol(BEKLENEN + " parcacik dosyasi (" + ayar.KADEMELER.length +
          " iksir x " + TURLER.length + " tur)", hepsi.length === BEKLENEN,
          hepsi.length + " dosya");

  for (const k of ayar.KADEMELER) {
    for (const tur of TURLER) {
      const yol = klasor + "/aura_" + tur + "_" + k.kimlik + ".particle.json";
      if (!existsSync(yol)) { kontrol(k.kimlik + "/" + tur + " dosyasi", false, yol); continue; }
      const d = oku(yol)["particle_effect"];
      dosyalar.push([k, tur, d]);
      /* Kimlik script'in kuracagi adla BIREBIR ayni olmali. */
      const beklenen = ayar.AURA_ONEK + tur + "_" + k.kimlik;
      if (d.description.identifier !== beklenen) {
        kontrol(k.kimlik + "/" + tur + " kimligi", false,
                d.description.identifier + " != " + beklenen);
      }
    }
  }
  kontrol("hepsinin kimligi script'in kuracagi adla ayni",
          dosyalar.length === BEKLENEN, dosyalar.length + " dosya okundu");

  const kotuMalzeme = dosyalar.filter(
    ([, , d]) => !GECERLI_MALZEME.includes(
      d.description.basic_render_parameters.material));
  /* Malzeme adi yanlissa parcacik HIC cizilmez, hata da yok. */
  kontrol("malzeme belgedeki uc degerden biri", kotuMalzeme.length === 0,
          kotuMalzeme.map(([k, t]) => k.kimlik + "/" + t).join(", ") || "hepsi gecerli");
  /* Kor ve kivilcim PARLAMALI: particles_add = toplamali harman,
     dunya isigindan bagimsiz. particles_blend olsaydi
     gece karanlikta aura da kararirdi.                      */
  kontrol("hepsi toplamali harman (particles_add)",
          dosyalar.every(([, , d]) =>
            d.description.basic_render_parameters.material === "particles_add"));

  const dokuYolu = dosyalar.map(([, , d]) =>
    d.description.basic_render_parameters.texture);
  kontrol("hepsi ayni dokuyu gosteriyor",
          new Set(dokuYolu).size === 1, [...new Set(dokuYolu)].join(", "));
  kontrol("doku diskte var",
          existsSync(RP + "/" + dokuYolu[0] + ".png"), dokuYolu[0]);
}

console.log("");
console.log("=== 3. FLIPBOOK DOKU SINIRINI ASMIYOR ===");
{
  /* EN SESSIZ HATA BU. flipbook max_frame * step_UV dokunun
     disina tasarsa zerre BOS bir UV ornekler ve gorunmez olur;
     oyun hicbir uyari vermez. Ayni sekilde base_UV satiri
     yanlissa baska bir sprite oynar.                        */
  const olc = JSON.parse(execFileSync("python3", ["-c", `
from PIL import Image
import json
im = Image.open(${JSON.stringify(RP + "/textures/particle/iksir_aura.png")})
print(json.dumps({"en": im.size[0], "boy": im.size[1]}))
`], { encoding: "utf8" }));
  /* Olcu ELLE yazilmiyor: uretecteki sabitlerden. v7.18'de
     kare sayisi 4 -> 8 olunca doku 128 -> 256 genisledi ve
     elle yazilmis "128x128" bayatladi.                     */
  /* Olcu ELLE yazilmiyor: hucre x kare (en) ve hucre x
     KULLANILAN SATIR SAYISI (boy). v7.18'de kare sayisi 4->8
     olunca en 128->256, v7.19'da yalniz goz alevi kalinca boy
     128->32 degisti; ikisinde de elle yazilmis sayi bayatladi. */
  const HUCRE = +/^AURA_HUCRE = (\d+)/m.exec(URETEC)[1];
  const BEK_EN = HUCRE * +/^AURA_KARE = (\d+)/m.exec(URETEC)[1];
  const BEK_BOY = HUCRE * SATIR_SAYISI;
  kontrol("doku " + BEK_EN + "x" + BEK_BOY,
          olc.en === BEK_EN && olc.boy === BEK_BOY,
          olc.en + "x" + olc.boy);

  let tasan = [], yanlisOlcu = [];
  for (const [k, tur, d] of dosyalar) {
    const bb = d.components["minecraft:particle_appearance_billboard"];
    const fb = bb && bb.uv && bb.uv.flipbook;
    if (!fb) { kontrol(k.kimlik + "/" + tur + " flipbook", false, "yok"); continue; }
    if (bb.uv.texturewidth !== olc.en || bb.uv.textureheight !== olc.boy) {
      yanlisOlcu.push(k.kimlik + "/" + tur);
    }
    const sagUc = fb.base_UV[0] + fb.step_UV[0] * (fb.max_frame - 1) + fb.size_UV[0];
    const altUc = fb.base_UV[1] + fb.step_UV[1] * (fb.max_frame - 1) + fb.size_UV[1];
    if (sagUc > olc.en || altUc > olc.boy) {
      tasan.push(k.kimlik + "/" + tur + " -> " + sagUc + "x" + altUc);
    }
  }
  kontrol("son kare dokunun ICINDE kaliyor", tasan.length === 0,
          tasan.join(", ") || "hepsi sigiyor");
  kontrol("bildirilen doku olcusu gercek olcuyle ayni",
          yanlisOlcu.length === 0, yanlisOlcu.join(", ") || "hepsi dogru");

  /* Her turun oynattigi satir, uretecteki AURA_SATIR'da
     yazan satirla ayni olmali. "Turler farkli satirlarda
     olsun" diye bakilamiyor: patlama ile gozkor bilerek AYNI
     satiri (kivilcim) paylasiyor -- ikisi de dikey bir cizgi,
     ikinci bir sprite cizmenin anlami yok. Onemli olan
     TEKLIK degil, DOGRULUK.                                */
  /* Her turun oynattigi satir, AURA_TUR_SATIR'da yazan satir
     olmali. "Turler farkli satirlarda olsun" diye bakilamaz:
     turler bilerek satir paylasabiliyor (patlama ve gozkor'un
     ikisi de dikey bir cizgi). Onemli olan TEKLIK degil,
     DOGRULUK.                                              */
  let yanlisSatir = [];
  for (const [, tur, d] of dosyalar) {
    const fb = d.components["minecraft:particle_appearance_billboard"].uv.flipbook;
    if (fb.base_UV[1] !== SATIR_INDEKS[TUR_SATIR[tur]] * HUCRE) {
      yanlisSatir.push(tur);
    }
  }
  kontrol("her tur uretecte yazan sprite satirini oynatiyor",
          yanlisSatir.length === 0,
          [...new Set(yanlisSatir)].join(", ") ||
          TURLER.map((t) => t + "->" + TUR_SATIR[t]).join("  "));
  /* Olu satir kalmasin: uretilen her satirin bir sahibi var. */
  kontrol("dokuda kullanilmayan satir yok",
          SATIR_SAYISI === new Set(TURLER.map((t) => TUR_SATIR[t])).size,
          SATIR_ADLARI.join(", "));
}

console.log("");
console.log("=== 3b. DONGU MU, SUREC MI? (v7.18) ===");
{
  /* ---- BU BOLUM NEDEN VAR ----
     Kullanici: "alev canli olsun -- bir buyusun bir kuculsun".
     v7.17'de dort satirin dordu de stretch_to_lifetime idi:
     animasyon zerrenin OMRUNE yayiliyor ve BIR KEZ oynuyordu.
     Yani her alev dili omru boyunca bir kez kisaliyordu --
     kirpismiyordu.

     Iki tuzak var ve ikisi de SESSIZ:
       1. stretch_to_lifetime acikken fps'in hicbir etkisi yok
          (belge: "overrides the base frames_per_second").
          Ikisi birden yazilirsa dongu ayari yok sayilir.
       2. Dongulu bir satirin kareleri bir SUREC anlatirsa
          (taze -> sonuk) animasyon basa sardiginda alev
          birden dirilmis gorunur.
     Asagisi ikisini de tutuyor.                            */
  const DONGU = {};
  for (const m of /AURA_DONGU = \{([^}]*)\}/.exec(URETEC)[1].matchAll(/"(\w+)": (\d+)/g)) {
    DONGU[m[1]] = +m[2];
  }
  const KARE = +/^AURA_KARE = (\d+)/m.exec(URETEC)[1];
  kontrol("sekiz kare", KARE === 8, String(KARE));
  kontrol("alev ve kor dongulu",
          "alev" in DONGU && "kor" in DONGU, Object.keys(DONGU).join(", "));

  for (const [kim, tur, d] of dosyalar) {
    if (kim.kimlik !== "nitroksin") continue;
    const fb = d.components["minecraft:particle_appearance_billboard"].uv.flipbook;
    const satirAdi = { gozalev: "alev", kor: "kor" }[tur];
    if (satirAdi && DONGU[satirAdi]) {
      kontrol(tur + ": DONGULU (loop, sabit fps)",
              fb.loop === true && fb.stretch_to_lifetime === false &&
              fb.frames_per_second === DONGU[satirAdi],
              "loop=" + fb.loop + " stretch=" + fb.stretch_to_lifetime +
              " fps=" + fb.frames_per_second);
      /* Omur boyunca EN AZ bir tam tur donmeli, yoksa dongu
         olmanin bir anlami yok.                            */
      const omur = parseFloat(
        d.components["minecraft:particle_lifetime_expression"].max_lifetime);
      kontrol(tur + ": omrunde en az bir tur donuyor",
              omur * fb.frames_per_second / KARE >= 1.0,
              (omur * fb.frames_per_second / KARE).toFixed(2) + " tur");
    } else {
      kontrol(tur + ": SURECLI (stretch, loop yok)",
              fb.stretch_to_lifetime === true && fb.loop === false,
              "loop=" + fb.loop + " stretch=" + fb.stretch_to_lifetime);
    }
    kontrol(tur + ": max_frame kare sayisiyla ayni", fb.max_frame === KARE,
            fb.max_frame + " / " + KARE);
  }
}

console.log("");
console.log("=== 4. RENK UYDURULMADI: GOZUN RENGI ===");
{
  /* Auranin rengi UYDURULMAMALI -- gozunde yanan renk ne ise
     etrafinda ucusan da o olmali. Uretecteki IKSIRLER
     tablosunun BESINCI sutunu goz rengi.                    */
  const blok = /IKSIRLER = \[([\s\S]*?)\n\]/.exec(URETEC)[1];
  const renkler = {};
  for (const m of blok.matchAll(
      /^\s*\("(\w+)",\s*"[^"]*",\s*\([^)]*\),\s*"[^"]*",\s*(\(\([^)]*\),\s*\([^)]*\)\)|\([^)]*\))/gm)) {
    const sayilar = [...m[2].matchAll(/\d+/g)].map((x) => +x[0]);
    renkler[m[1]] = sayilar;      // 3 sayi = tek renk, 6 = iki renk
  }
  kontrol("goz renkleri uretecten okundu",
          Object.keys(renkler).length === 8,
          Object.keys(renkler).length + " iksir");

  let uymayan = [], alfaBitmeyen = [];
  for (const [k, tur, d] of dosyalar) {
    const g = d.components["minecraft:particle_appearance_tinting"].color.gradient;
    const anahtarlar = Object.keys(g).map(Number).sort((a, b) => a - b);
    /* Zerre SONEREK kaybolmali: son durakta alfa 0. Aksi halde
       omru bitince aniden yok oluyor ve goze carpiyor.       */
    const son = g[String(anahtarlar[anahtarlar.length - 1].toFixed(1))] ||
                g[String(anahtarlar[anahtarlar.length - 1])];
    if (!son || son[3] !== 0) alfaBitmeyen.push(k.kimlik + "/" + tur);

    /* 0.18 duragı iksirin GOZ rengi olmali (255'e bolunmus). */
    const bek = renkler[k.kimlik].slice(0, 3).map((c) => +(c / 255).toFixed(4));
    const var_ = g["0.18"];
    if (!var_ || bek.some((c, i) => Math.abs(var_[i] - c) > 0.002)) {
      uymayan.push(k.kimlik + "/" + tur + " " + JSON.stringify(var_) +
                   " != " + JSON.stringify(bek));
    }
  }
  kontrol("gradyanin rengi gozun rengiyle ayni", uymayan.length === 0,
          uymayan.slice(0, 2).join(" | ") || dosyalar.length + " dosyanin hepsi");
  kontrol("zerre sonerek kayboluyor (son alfa 0)",
          alfaBitmeyen.length === 0, alfaBitmeyen.join(", ") || "hepsi soniyor");

  /* Element'in IKI goz rengi var (buz + ates, referanstan
     olculdu). Ikisi de gradyanda olmali -- yoksa onun aurasi
     digerlerinden ayrisamaz.                                */
  const el = dosyalar.find(([k, t]) => k.kimlik === "element" && t === TURLER[0])[2];
  const eg = el.components["minecraft:particle_appearance_tinting"].color.gradient;
  const iki = renkler["element"];
  kontrol("Element'in IKI rengi de gradyanda", iki.length === 6 &&
          Math.abs(eg["0.18"][0] - iki[0] / 255) < 0.002 &&
          Math.abs(eg["0.55"][0] - iki[3] / 255) < 0.002,
          JSON.stringify(eg["0.18"]) + " -> " + JSON.stringify(eg["0.55"]));
}

console.log("");
console.log("=== 5. GOZ ALEVI: HAREKET VE BOY ===");
{
  /* v7.19: bu bolum eskiden dort turu (kor/hale/patlama/
     gozkor) olcuyordu. Kullanici auranin kaldirilmasini
     istedi; geriye tek tur kaldi ve olcumler ona daraldi.
     Silinen turlerin kodu uretecte duruyor (AURA_URETILEN),
     geri gelirlerse buraya da olcumleri geri gelir.        */
  const al = (kim, tur) =>
    dosyalar.find(([k, t]) => k.kimlik === kim && t === tur)[2].components;
  const gz = al("nitroksin", "gozalev");
  const gb = gz["minecraft:particle_appearance_billboard"];
  const gm = gz["minecraft:particle_motion_dynamic"];

  /* Parcacik dosyasi yazilip da hareket bileseni unutulursa
     zerreler dogduklari yerde ASILI kalir.                 */
  const sabitIvme = (i) => {
    const m = /([+-]?\s*[\d.]+)\s*$/.exec(String(i));
    return m ? parseFloat(m[1].replace(/\s/g, "")) : parseFloat(i);
  };
  kontrol("alev YUKARI yukseliyor", sabitIvme(gm.linear_acceleration[1]) > 0,
          String(gm.linear_acceleration[1]));
  /* Surtunme YUKSEK olmali: alev gozun onunde asili kalmali,
     yukselip gitmemeli. Kalkis ivmesinden buyuk bir surtunme
     zerreyi kisa bir mesafede durduruyor.                  */
  kontrol("alev gozun onunde duruyor (yuksek surtunme)",
          gm.linear_drag_coefficient > sabitIvme(gm.linear_acceleration[1]),
          gm.linear_drag_coefficient + " > " +
          sabitIvme(gm.linear_acceleration[1]));

  /* Yukarisi yukarida kalsin: lookat_xyz kameraya TAMAMEN
     donuyor, yukaridan bakildiginda alev yan yatiyor.      */
  kontrol("billboard dik duruyor (lookat_y)",
          gb.face_camera_mode === "lookat_y", gb.face_camera_mode);
  /* Alev BOYUNA uzar; dis olcu de oyle olmali.             */
  const ilk = (s) => parseFloat(/[\d.]+/.exec(String(s))[0]);
  kontrol("boy enden UZUN", ilk(gb.size[1]) > ilk(gb.size[0]),
          ilk(gb.size[0]) + " x " + ilk(gb.size[1]));
  /* ...ama COK uzun degil: v7.18'de oran 0.64 idi ve oyunda
     alevler ince dikey CIZGILER gibi cikti (kullanicinin
     ekran goruntusunde ot gibi duruyorlardi). Kucuk olcekte
     dar bir ucgen "alev" degil "cizgi" okunuyor.           */
  kontrol("cizgi gibi ince DEGIL", ilk(gb.size[0]) / ilk(gb.size[1]) >= 0.7,
          "en/boy = " + (ilk(gb.size[0]) / ilk(gb.size[1])).toFixed(2));
  /* Goz 2 MC pikseli = 0.125 blok. Alev bundan buyuk olursa
     gozun yerine GECIYOR.                                  */
  kontrol("alev gozden buyuk degil", ilk(gb.size[1]) < 0.125,
          ilk(gb.size[1]) + " < 0.125 blok");

  /* ---- UC AYRI OLCEKTE HAREKET ----
     Kullanici "bir buyusun bir kuculsun" dedi. Tek bir egri
     canli gostermiyor: yavas bir zarf tek basina sisip inen
     bir balon.                                             */
  for (const boy of gb.size) {
    const s = String(boy);
    kontrol("zarf (omur boyu bir kez)",
            s.includes("math.sin(variable.particle_age /"), "");
    kontrol("nefes (saniyede birkac kez)",
            /math\.sin\(variable\.particle_age \* \d{3,}/.test(s), "");
    /* Nefesin FAZI her zerrede farkli olmali: ayni olsaydi
       butun alevler ayni anda buyuyup kuculur, tek bir nabiz
       gibi dururdu.                                        */
    kontrol("nefesin fazi zerreye ozel",
            /particle_age \* \d+ \+ variable\.particle_random_\d \* 360/.test(s), "");
    /* emitter_random bir YAYIMDAKI butun zerrelerde ayni:
       alev toptan kabarip toptan soniyor.                  */
    kontrol("puf olcegi (emitter_random)",
            s.includes("variable.emitter_random_1"), "");
  }
  /* Molang math.sin DERECE aliyor: 180 ile carpilmazsa egri
     omur boyunca neredeyse duz kalir.                      */
  kontrol("sin derece cinsinden (x 180)",
          String(gb.size[1]).includes("* 180"), String(gb.size[1]));

  /* ---- HIZ MIRASI ----
     Denge hizi v = a/d. Ivmedeki katsayi surtunmenin 20 kati
     olmali (getVelocity blok/TICK, parcacik blok/SANIYE).  */
  const bek = (20 * gm.linear_drag_coefficient).toFixed(1);
  kontrol("hiz mirasi katsayisi surtunmenin 20 kati",
          String(gm.linear_acceleration[0]) === "variable.hiz.x * " + bek &&
          String(gm.linear_acceleration[2]) === "variable.hiz.z * " + bek,
          gm.linear_acceleration[0] + " (beklenen " + bek + ")");
  /* Duvarin icinde yanmasin.                               */
  const gc = gz["minecraft:particle_motion_collision"];
  kontrol("duvara degince soniyor",
          !!gc && gc.expire_on_contact === true);

  /* ---- SAYICA DEGIL BOYCA ----
     v7.18'de yayim basina 2 zerre vardi ve goz basina ayni
     anda ~5 dil yasiyordu; oyunda ust uste binip bir TARAK
     gibi gorunuyorlardi.                                   */
  const adet = gz["minecraft:emitter_rate_instant"].num_particles;
  const omur = parseFloat(
    gz["minecraft:particle_lifetime_expression"].max_lifetime);
  const ayniAnda = adet * (20 / ayar.GOZ_ALEV_ARALIK) * omur;
  kontrol("goz basina ayni anda az sayida dil (<= 4)", ayniAnda <= 4,
          ayniAnda.toFixed(1) + " dil");

  /* Butun boy ve renk ifadeleri zerrenin YASINA bagli olmali;
     sabit sayi yazilsaydi zerre kuculmeden yok olurdu.     */
  let yassiz = [];
  for (const [k, tur, d] of dosyalar) {
    const c = d.components;
    const boy = JSON.stringify(c["minecraft:particle_appearance_billboard"].size);
    const ip = c["minecraft:particle_appearance_tinting"].color.interpolant;
    if (!boy.includes("particle_age") || !String(ip).includes("particle_age")) {
      yassiz.push(k.kimlik + "/" + tur);
    }
  }
  kontrol("boy ve renk zerrenin yasina bagli", yassiz.length === 0,
          yassiz.join(", ") || dosyalar.length + " dosyanin hepsi");
}

console.log("");
console.log("=== 5b. SPRITE ALEV MI, BALONCUK MU? (v7.17) ===");
{
  /* ---- BU BOLUM NEDEN VAR ----
     Kullanici v7.15'i oyunda gordu ve "etrafinda boyle kucuk
     baloncuklar olusuyor... alev gibi degil" dedi. v7.15'in
     kor sprite'i MERKEZDEN UZAKLIGA gore ciziliyordu
     (d = sqrt(dx^2+dy^2)), yani tanim geregi bir DAIRE.
     Hicbir test bunu yakalayamazdi cunku hicbiri sekle
     BAKMIYORDU -- onizleyici bile zerreleri daire ciziyordu.
     Asagidaki uc olcum daireyi alevden ayiriyor:
        1. alev boyuna uzar     -> boy > en
        2. alevin karni ASAGIDA -> en genis satir alt yarida
        3. alevin ucu SIVRI     -> en ust satir 1-3 piksel
     Bir daire ucunde de dusuyor: 1'de boy = en, 2'de en genis
     satir tam ortada, 3'te ust satir genis.                 */
  const png = readFileSync(RP + "/textures/particle/iksir_aura.png");

  /* Kucuk bir PNG cozucu: bu depoda dis bagimlilik yok.
     Yalniz 8-bit RGBA, filtre 0-4 -- uretecin yazdigi bicim. */
  function pngOku(b) {
    let p = 8, en = 0, boy = 0;
    const veri = [];
    while (p < b.length) {
      const uz = b.readUInt32BE(p);
      const tip = b.toString("ascii", p + 4, p + 8);
      if (tip === "IHDR") { en = b.readUInt32BE(p + 8); boy = b.readUInt32BE(p + 12); }
      if (tip === "IDAT") veri.push(b.subarray(p + 8, p + 8 + uz));
      p += 12 + uz;
    }
    const ham = zlibSync(Buffer.concat(veri));
    const satirBayt = en * 4;
    const cikti = Buffer.alloc(boy * satirBayt);
    for (let y = 0; y < boy; y++) {
      const f = ham[y * (satirBayt + 1)];
      const s = ham.subarray(y * (satirBayt + 1) + 1, (y + 1) * (satirBayt + 1));
      for (let i = 0; i < satirBayt; i++) {
        const a = i >= 4 ? cikti[y * satirBayt + i - 4] : 0;
        const bb = y > 0 ? cikti[(y - 1) * satirBayt + i] : 0;
        const c = (i >= 4 && y > 0) ? cikti[(y - 1) * satirBayt + i - 4] : 0;
        let v = s[i];
        if (f === 1) v += a;
        else if (f === 2) v += bb;
        else if (f === 3) v += (a + bb) >> 1;
        else if (f === 4) {
          const pp = a + bb - c, pa = Math.abs(pp - a),
                pb = Math.abs(pp - bb), pc = Math.abs(pp - c);
          v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? bb : c);
        }
        cikti[y * satirBayt + i] = v & 255;
      }
    }
    return { en, boy, veri: cikti };
  }
  const im = pngOku(png);
  const H = 32;
  const alfa = (x, y) => im.veri[(y * im.en + x) * 4 + 3];

  /* Satirlar dosyanin basinda ureteceten cikarildi
     (SATIR_ADLARI / SATIR_INDEKS). Burada yalnizca URETILEN
     satirlarin sekli olculuyor -- olu satir zaten yok.     */
  kontrol("dokuda satir var", SATIR_ADLARI.length >= 1,
          SATIR_ADLARI.join(", "));

  for (const tur of SATIR_ADLARI) {
    const s = SATIR_INDEKS[tur];
    for (let kare = 0; kare < 4; kare++) {
      const genis = [];
      for (let y = 0; y < H; y++) {
        let a = -1, b = -1;
        for (let x = 0; x < H; x++) {
          if (alfa(kare * H + x, s * H + y) > 12) { if (a < 0) a = x; b = x; }
        }
        genis.push(a < 0 ? 0 : b - a + 1);
      }
      const dolu = genis.map((g, i) => [g, i]).filter(([g]) => g > 0);
      const y0 = dolu[0][1], y1 = dolu[dolu.length - 1][1];
      const boy = y1 - y0 + 1;
      const en = Math.max(...genis);
      const karin = genis.indexOf(en);
      const oran = (karin - y0) / Math.max(1, boy - 1);
      const etiket = tur + " k" + kare;
      kontrol(etiket + ": boyuna uzun (daire degil)", boy > en,
              "boy " + boy + " > en " + en);
      kontrol(etiket + ": karni ASAGIDA (dairede tam ortada)", oran >= 0.58,
              "en genis satir %" + Math.round(oran * 100));
      kontrol(etiket + ": ucu SIVRI", genis[y0] <= 3,
              "ust satir " + genis[y0] + " piksel");
    }
  }
}

console.log("");
console.log("=== 6. SCRIPT TARAFI ===");
{
  const kaynak = readFileSync(BP + "/scripts/yetenekler/iksirler.js", "utf8");
  /* Metinde arama yapilirken once YORUMLAR ayiklaniyor: bu
     depoda dort kez yorum icindeki bir satir gercek kod
     sanildi.                                                */
  const kod = kaynak.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  kontrol("ayar kapisina bakiyor",
          /if \(!AURA_ACIK \|\| !GOZ_ALEV_ACIK\) return/.test(kod));
  /* Ad kademe.kimlik'ten KURULUYOR; elle tablo yok. Ikinci
     bir tablo tutulsaydi biri degisip oteki kalirdi.       */
  kontrol("parcacik adi kademe.kimlik'ten kuruluyor",
          /AURA_ONEK \+ "gozalev_" \+ kademe\.kimlik/.test(kod));
  /* Kafa hizasi: oyuncu.location AYAK hizasidir, aura orada
     ciksaydi zerreler bacaklardan yukselirdi.               */
  kontrol("kafa hizasindan cikiyor (getHeadLocation)",
          /getHeadLocation\(\)/.test(kod));
  /* Alevin tazelemeden ONCE gelmesi SART: sonra gelseydi
     IKSIR_TAZELEME ritmine duser, yani saniyede bir cikardi
     ve alev kesik kesik gorunurdu.                          */
  kontrol("alev tazeleme 'continue'sinden ONCE",
          kod.indexOf("simdi % GOZ_ALEV_ARALIK") <
          kod.indexOf("if (simdi < d.sonrakiTazeleme) continue"));
  /* METIN ARAMASI YETMEDI -- mutasyon denemesinde goruldu.
     `auraPatlat` cagrisini iksirIc'ten SILDIGIMDE test yine
     gecti, cunku regex fonksiyonun TANIMINI yakaliyordu
     ("export function auraPatlat(oyuncu, kademe)"). Yani satir
     "kod yazilmis mi"yi olcuyordu, "kod calisiyor mu"yu degil.
     Ayni sinif bosluk v6.9 ve v7.1'de de yasandi.

     Artik iksir GERCEKTEN iciliyor ve sahte dunyada parcacik
     dogdu mu diye bakiliyor.                                */
  const cikti = JSON.parse(execFileSync("node", ["--input-type=module", "-e", `
import { dunyaKur, oyuncuKur } from ${JSON.stringify(KOK + "/test/dunya.mjs")};
import { tickIlerlet, _durum } from "@minecraft/server";
const w = console.warn; console.warn = () => {};
const iks = await import(${JSON.stringify(KOK + "/test/pack/yetenekler/iksirler.js")});
const ayar = await import(${JSON.stringify(KOK + "/test/pack/ayarlar.js")});
const D = dunyaKur();
const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
o.id = "aura-1"; _durum.oyuncular = [o];
/* Kosan bir oyuncu: hiz mirasinin GERCEKTEN gectigini ancak
   sifirdan farkli bir hizla olcebiliriz. Blok/tick. */
o._hiz = { x: 0.21, y: -0.04, z: 0.13 };
const kademe = ayar.KADEMELER.find((k) => k.kimlik === "element");
iks.iksirIc(o, kademe);
const patlama = (D.sayac.parcacik || []).map((p) => p.tip);
D.sayac.parcacik = [];
for (let i = 0; i < 40; i++) { tickIlerlet(1); iks.iksirTara([o]); }
const tarama = (D.sayac.parcacik || []).map((p) => p.tip);
console.warn = w;
const bas = o.getHeadLocation();
console.log(JSON.stringify({
  patlama, tarama,
  korY: (D.sayac.parcacik || []).filter((p) => p.tip.includes("_kor_")).map((p) => p.y),
  basY: bas.y, basX: bas.x, basZ: bas.z,
  alev: (D.sayac.parcacik || []).filter((p) => p.tip.includes("_gozalev_"))
          .map((p) => ({ x: p.x, y: p.y, z: p.z, molang: p.molang })),
  koz: (D.sayac.parcacik || []).filter((p) => p.tip.includes("_gozkor_"))
          .map((p) => ({ x: p.x, y: p.y, z: p.z })),
  hiz: o.getVelocity()
}));
`], { encoding: "utf8", cwd: KOK + "/test" }).trim().split("\n").pop());

  /* 1) Iksir icilince kafa aurasi ARTIK CIKMAMALI (v7.19).
        Kullanici kaldirilmasini istedi; "kod silindi" demek
        yetmiyor, sahte dunyada gercekten cikmadigini
        gormek gerekiyor.                                    */
  kontrol("iksir icilince aura patlamasi CIKMIYOR",
          cikti.patlama.length === 0,
          cikti.patlama.join(", ") || "hic parcacik yok");
  kontrol("taramada kafa aurasi CIKMIYOR",
          !cikti.tarama.some((t) => /_kor_|_hale_|_patlama_|_gozkor_/.test(t)),
          [...new Set(cikti.tarama)].join(", ") || "hic");
  /* 2) Cikan tek sey goz alevi                              */
  kontrol("taramada goz alevi cikiyor",
          cikti.tarama.some((t) => t === "pa:aura_gozalev_element"),
          [...new Set(cikti.tarama)].join(", ") || "hic");
  /* 3) Ad ICILEN iksire gore -- sabit degil                 */
  kontrol("parcacik adi ICILEN iksirin adi",
          cikti.tarama.every((t) => t.endsWith("_element")),
          [...new Set(cikti.tarama)].join(", "));
  kontrol("hatasi yutulmuyor, yaziliyor", /hataYaz\("aura\./.test(kod));

  /* ---- GOZ ALEVI GERCEKTEN GOZLERIN ONUNDE Mi (v7.17) ----
     Metin aramasi burada YETMEZ: konum bakis yonunden
     hesaplaniyor ve o hesabin YANLIS olmasi hicbir metinde
     gorunmez. Sahte oyuncu +x yonune bakiyor, kafasi
     (0.5, 90.6, 0.5).                                       */
  const alev = cikti.alev || [];
  kontrol("goz alevi GERCEKTEN cikiyor", alev.length > 0,
          alev.length + " zerre");
  if (alev.length) {
    /* ---- ILERI KAYDIRMA (v7.18) ----
       Zerre nasil olsa geride kalacagi icin ILERIDE
       doguruluyor. Yani asagidaki geometri olcumleri ham
       konuma degil, KAYDIRILMIS merkeze gore yapilmali --
       yoksa kosan bir oyuncuda hepsi yanlis olur.
       Kayma ayrica KENDI BASINA sinaniyor: script bunu
       yapmayi birakirsa alev kosarken yuzden kopar ve
       hicbir hata cikmaz.                                  */
    const ONDEN = ayar.GOZ_ALEV_ONDEN;
    const kay = { x: cikti.hiz.x * 20 * ONDEN,
                  y: cikti.hiz.y * 20 * ONDEN,
                  z: cikti.hiz.z * 20 * ONDEN };
    kontrol("ileri kaydirma yapiliyor (kosarken)",
            Math.abs(kay.x) > 1e-6, "kayma x " + kay.x.toFixed(3));
    const merkezX = cikti.basX + kay.x;
    const merkezZ = cikti.basZ + kay.z;
    /* 1) ONDE: oyuncu +x'e bakiyor, alevler +x tarafinda.
          Bakis yonu hic kullanilmasaydi hepsi kafayla ayni
          x'te dogardi.                                      */
    kontrol("alevler yuzun ONUNDE (bakis yonunde)",
            alev.every((a) => a.x > cikti.basX + 0.2),
            "x " + alev[0].x.toFixed(3) + " > bas x " + cikti.basX);
    /* 2) IKI GOZ, SIMETRIK: +yan ve -yan. Isaret dusseydi iki
          alev de ayni yerde -- tek gozlu bir adam.          */
    const zler = [...new Set(alev.map((a) => +a.z.toFixed(4)))].sort();
    kontrol("iki ayri goz var", zler.length === 2, zler.join(" / "));
    /* Iki gozun ortasi, KAYDIRILMIS merkezle ayni olmali.
       Bu tek satir iki seyi birden tutuyor: simetri, ve
       kaymanin TAM DOGRU miktarda olmasi. Kayma katsayisi
       yanlis olsaydi orta nokta tutmazdi.                  */
    kontrol("iki goz kaydirilmis merkeze gore SIMETRIK",
            zler.length === 2 &&
            Math.abs((zler[0] + zler[1]) / 2 - merkezZ) < 1e-9,
            "orta " + ((zler[0] + zler[1]) / 2).toFixed(4) +
            " / beklenen " + merkezZ.toFixed(4));
    /* 3) KAFANIN DISINDA: kafa 0.5 blok, on yuzu 0.25'te.
          Daha yakini alevi kafanin ICINE koyar.             */
    const uzak = Math.hypot(alev[0].x - merkezX, alev[0].z - merkezZ);
    kontrol("alev kafanin ON YUZUNUN disinda", uzak > 0.25 && uzak < 0.5,
            uzak.toFixed(3) + " blok");
    /* 4) GOZ HIZASININ biraz ustunde -- icinde degil.       */
    const yuk = alev[0].y - kay.y - cikti.basY;
    kontrol("alev goz hizasinin ustunde", yuk > 0 && yuk <= 0.25,
            "+" + yuk.toFixed(3) + " blok");
    /* 5) RITIM: 40 tick, her GOZ_ALEV_ARALIK'ta IKI zerre.   */
    const bek = Math.floor(40 / ayar.GOZ_ALEV_ARALIK) * 2;
    kontrol("alev dogru ritimde (40 tick'te ~" + bek + ")",
            alev.length >= bek - 2 && alev.length <= bek + 2,
            alev.length + " zerre");
    /* 6) HIZ MIRASI (v7.18). Parcacik dosyasindaki ivme
          `variable.hiz.x * 68` yaziyor; o degiskeni buraya
          KOYAN yer script. Koymayi unutursa Molang tanimsiz
          degiskeni 0 sayar, alev geride kalir ve HICBIR HATA
          CIKMAZ -- yani ancak boyle olculebilir.            */
    const mh = alev[0].molang;
    kontrol("alev oyuncunun HIZINI aliyor",
            !!mh && !!mh.hiz, mh ? Object.keys(mh).join(", ") : "molang yok");
    kontrol("gecen hiz oyuncunun GERCEK hizi",
            !!mh && !!mh.hiz &&
            Math.abs(mh.hiz.x - cikti.hiz.x) < 1e-9 &&
            Math.abs(mh.hiz.y - cikti.hiz.y) < 1e-9 &&
            Math.abs(mh.hiz.z - cikti.hiz.z) < 1e-9,
            mh && mh.hiz ? JSON.stringify(mh.hiz) : "-");
  }

  /* Ayarlarin hepsi GERCEKTEN okunuyor mu -- tarama.mjs'in
     oksuz-ayar korumasinin buradaki karsiligi.              */
  for (const a of ["AURA_ACIK", "AURA_ONEK", "AURA_HIZ_MIRASI",
                   "GOZ_ALEV_ACIK", "GOZ_ALEV_ARALIK", "GOZ_ALEV_ON",
                   "GOZ_ALEV_YAN", "GOZ_ALEV_Y", "GOZ_ALEV_ONDEN"]) {
    kontrol("  " + a + " tanimli ve okunuyor",
            ayar[a] !== undefined && kod.includes(a), String(ayar[a]));
  }
  /* Her tick cikarsa hem pahali hem de zerreler ust uste
     binip tek bir bulut gorunuyor.                          */
  /* Her tick cikarsa hem pahali hem de zerreler ust uste
     binip tek bir bulut gorunuyor.                         */
  kontrol("her tick cikmiyor", ayar.GOZ_ALEV_ARALIK > 1,
          String(ayar.GOZ_ALEV_ARALIK));
  /* ...ama cok seyrek de olmamali: alev KESIKSIZ yanmali,
     yoksa alev degil kivilcim gorunuyor.                   */
  kontrol("alev kesiksiz (aralik <= 5)", ayar.GOZ_ALEV_ARALIK <= 5,
          String(ayar.GOZ_ALEV_ARALIK));

  /* ---- AURA GERCEKTEN KALKTI MI (v7.19) ----
     Kullanici "aura parcaciklarini kaldir" dedi. Ayari
     kapatmak yetmez; kapanmanin GERCEKTEN her seyi
     goturdugunu olcmek gerekiyor -- yoksa "kapali ama yine de
     pakete giren" bir sey kalir.                           */
  kontrol("script'te kafa aurasi cagrisi kalmamis",
          !/auraAt\(|auraPatlat\(|gozKoruAt\(/.test(kod),
          "kor / hale / patlama / gozkor yok");
  const artik = readdirSync(RP + "/particles")
    .filter((f) => !f.startsWith("aura_gozalev_"));
  kontrol("diskte artik aura dosyasi kalmamis", artik.length === 0,
          artik.join(", ") || "yalniz goz alevi");
}

console.log("");
console.log("=== 7. PAKETE GIRDI ===");
{
  /* v4.75 dersi: .mcpack'te eksik klasor "bazen calisiyor
     bazen calismiyor" gibi gorunuyor.                       */
  const man = oku(RP + "/manifest.json");
  const surum = "v" + man.header.version.join(".");
  const paket = KOK + "/Simsek_" + surum + "_Gorunum.mcpack";
  kontrol("gorunum paketi uretilmis", existsSync(paket), paket.split("/").pop());
  if (existsSync(paket)) {
    const liste = execFileSync("unzip", ["-Z1", paket], { encoding: "utf8" });
    const say = liste.split("\n").filter((r) => r.startsWith("particles/") &&
                                         r.endsWith(".particle.json")).length;
    kontrol(ayar.KADEMELER.length * TURLER.length + " parcacik pakette",
            say === ayar.KADEMELER.length * TURLER.length, say + " dosya");
    kontrol("parcacik dokusu pakette",
            liste.includes("textures/particle/iksir_aura.png"));
  }
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> iksir aurasi yerinde");
process.exit(hata ? 1 : 0);
