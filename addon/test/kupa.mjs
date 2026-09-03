/* KUPALAR -- ASILI/KAZIKLI GANIMETLER                   v7.25.0

   Kullanicinin istegi, kendi sozleriyle:
     "hani olmus Steve'ler, kafasi asilmis seyler var ya --
      ben skinler gondersem onlari onlarla degistirebilir
      misin? Mesela ben Herobrine asiyorum, havalilik. Ben tek
      basima Null'u oldurdum, bir nevi racon gibi."

   ---- BU DOSYA NEYI TUTUYOR ----
   Kupa depodaki ILK OZEL GEOMETRILI blok (onceki alti blogun
   altisi da tam kup). O yuzden burada tutulan seylerin cogu
   "gozle bakinca anlasilmaz" cinsinden:

     1. 30x30x30 SINIRI. Bedrock blok modeli bunu asamaz.
        Ilk carmih taslagi 36 birim genisti; render'da guzel
        gorunuyordu ama oyun onu yuklemezdi. Bu madde tek
        basina o hatayi bir daha gecirmez.
     2. TABAN KUPTEN EN AZ 1 PIKSEL. Ikinci sinir bu; modeli
        yukari kaydirirsak blok gecersiz olur.
     3. GEOMETRI VE MATERIAL_INSTANCES IKISI BIRDEN. 1.21.80'
        den beri zorunlu; biri unutulursa blok cizilmez.
     4. HER MATERIAL_INSTANCE ADI KARSILIGINI BULMALI. Kupte
        "odun" yaziyorsa blokta "odun" tanimli olmali, ve
        blokta tanimli olan da gercekten kullanilmali.
     5. IKINCI KATMAN CIZILMELI. Kullanici "entity303 pek
        olmamis, cubbeli olmasi lazim" dedi; sebep ikinci
        katmanin hic cizilmemesiydi.
     6. BOZUK SKIN URETILMEMELI. ferguson.png gurultuyle geldi
        (komsu piksel farki 78-96, gercek cizimde en fazla 56).
        Boyle bir skin sessizce gecip gokkusagi bir kupa
        uretmemeli.
     7. UV SKIN DUZENINDE KALMALI. Kupu kuculttugumuz an kutu
        UV kayiyor; o yuzden olcek 1.0 degilse yuz yuz UV
        yazilmali. Bu madde o kurali tutuyor.
     8. RACON DIL DOSYASINDA OLMALI. Kupanin butun anlami o.

   Olcum URETILEN DOSYALARDAN yapiliyor, kaynak koddan degil:
   sabit dogru olup da yazilmamis olabilir.                  */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const BP = KOK + "/Simsek_TNT_ToprakTopu";
const RP = KOK + "/Simsek_Kol_Kaynak";
const PY = readFileSync(KOK + "/kol_uret.py", "utf8");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

/* Python yorumlari ve metinleri ayiklanmis kod. will.mjs ve
   anna.mjs'te iki kez ayni tuzaga dusuldu: yorumda gecen bir
   satir gercek kod sanildi.                                 */
const KOD = PY.replace(/"""[\s\S]*?"""/g, "").replace(/^\s*#.*$/gm, "");

/* ---- KUPALAR listesi: kimlik -> bicim ---- */
const bloklar = readdirSync(BP + "/blocks")
  .filter(f => f.startsWith("kupa_") && f.endsWith(".json"))
  .map(f => f.slice(5, -5));

console.log("== 0. uretilmis kupalar: " + bloklar.join(", "));
kontrol("en az bir kupa uretilmis", bloklar.length > 0);

/* ---- 1-2. GEOMETRI SINIRLARI ---- */
function don(p, aci, pivot) {
  let [x, y, z] = [p[0] - pivot[0], p[1] - pivot[1], p[2] - pivot[2]];
  const [rx, ry, rz] = aci.map(a => a * Math.PI / 180);
  let c = Math.cos(rx), s = Math.sin(rx);
  [y, z] = [y * c - z * s, y * s + z * c];
  c = Math.cos(ry); s = Math.sin(ry);
  [x, z] = [x * c + z * s, -x * s + z * c];
  c = Math.cos(rz); s = Math.sin(rz);
  [x, y] = [x * c - y * s, x * s + y * c];
  return [x + pivot[0], y + pivot[1], z + pivot[2]];
}

function sinirlar(geo) {
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (const b of geo.bones) {
    for (const c of b.cubes || []) {
      const inf = c.inflate || 0;
      const o = c.origin.map(v => v - inf);
      const s = c.size.map(v => v + 2 * inf);
      for (const dx of [0, s[0]]) for (const dy of [0, s[1]]) for (const dz of [0, s[2]]) {
        let p = [o[0] + dx, o[1] + dy, o[2] + dz];
        if (c.rotation) p = don(p, c.rotation, c.pivot);
        for (let i = 0; i < 3; i++) {
          if (p[i] < mn[i]) mn[i] = p[i];
          if (p[i] > mx[i]) mx[i] = p[i];
        }
      }
    }
  }
  return { mn, mx, olcu: [0, 1, 2].map(i => mx[i] - mn[i]) };
}

console.log("");
console.log("== 1-4. her kupanin geometrisi ve blogu");
for (const k of bloklar) {
  const gy = RP + "/models/blocks/kupa_" + k + ".geo.json";
  const by = BP + "/blocks/kupa_" + k + ".json";
  if (!existsSync(gy)) { kontrol(k + ": geometri dosyasi var", false, gy); continue; }
  const geo = JSON.parse(readFileSync(gy, "utf8"))["minecraft:geometry"][0];
  const { mn, mx, olcu } = sinirlar(geo);

  /* 1. 30x30x30 */
  kontrol(k + ": model 30x30x30 icinde",
          olcu.every(v => v <= 30.0001),
          olcu.map(v => v.toFixed(1)).join(" x "));

  /* 2. taban kupun icinde en az 1 piksel (her eksende) */
  kontrol(k + ": taban kupte kaliyor",
          [0, 1, 2].every(i => mx[i] > 0.0001 && mn[i] < 15.9999),
          "min " + mn.map(v => v.toFixed(1)) + " / max " + mx.map(v => v.toFixed(1)));

  const blok = JSON.parse(readFileSync(by, "utf8"))["minecraft:block"];
  const bilesen = blok.components;

  /* 3. geometry + material_instances IKISI BIRDEN */
  kontrol(k + ": geometry ve material_instances ikisi de var",
          !!bilesen["minecraft:geometry"] && !!bilesen["minecraft:material_instances"]);
  kontrol(k + ": geometry kimligi geometriyle ayni",
          bilesen["minecraft:geometry"]?.identifier === geo.description.identifier,
          bilesen["minecraft:geometry"]?.identifier + " vs " + geo.description.identifier);

  /* 4. material_instance adlari iki yonlu esleşiyor */
  const mi = bilesen["minecraft:material_instances"] || {};
  const kullanilan = new Set();
  for (const b of geo.bones) for (const c of b.cubes || [])
    kullanilan.add(c.material_instance || "*");
  const tanimli = new Set(Object.keys(mi));
  kontrol(k + ": kupteki her malzeme adi blokta tanimli",
          [...kullanilan].every(a => tanimli.has(a)),
          [...kullanilan].filter(a => !tanimli.has(a)).join(",") || "-");
  kontrol(k + ": blokta oksuz malzeme yok",
          [...tanimli].every(a => kullanilan.has(a)),
          [...tanimli].filter(a => !kullanilan.has(a)).join(",") || "-");

  /* dokular gercekten var mi */
  const terrain = JSON.parse(readFileSync(
    RP + "/textures/terrain_texture.json", "utf8")).texture_data;
  for (const [ad, tanim] of Object.entries(mi)) {
    kontrol(k + ": '" + ad + "' dokusu terrain_texture'da",
            !!terrain[tanim.texture], tanim.texture);
    const dy = RP + "/textures/blocks/" + tanim.texture + ".png";
    kontrol(k + ": '" + ad + "' dokusu diskte", existsSync(dy), tanim.texture + ".png");
  }
}

/* ---- 5. IKINCI KATMAN ---- */
console.log("");
console.log("== 5. ikinci katman (cubbe/kukuleta) ciziliyor mu");
const UST_UV = { kafa: [32, 0], govde: [16, 32], sag_kol: [40, 32],
                 sol_kol: [48, 48], sag_bacak: [0, 32], sol_bacak: [0, 48] };
for (const k of bloklar) {
  const geo = JSON.parse(readFileSync(
    RP + "/models/blocks/kupa_" + k + ".geo.json", "utf8"))["minecraft:geometry"][0];
  const kupler = geo.bones.flatMap(b => b.cubes || []);
  /* Bir kupun UV'si kutu ([u,v]) ya da yuz yuz (sozluk).
     Ikisinde de ikinci katmanin baslangic noktasini ariyoruz. */
  const uvNokta = c => {
    if (Array.isArray(c.uv)) return c.uv;
    if (c.uv && c.uv.north) {
      /* yuz yuz UV'de north = [u+D, v+D]; D'yi kupten degil
         SKIN kutusundan cikaramayiz, o yuzden sadece dikey
         bandi karsilastiriyoruz: ikinci katman v>=32 ya da
         kafa icin u>=32. */
      return c.uv.north.uv;
    }
    return null;
  };
  const ustVar = kupler.some(c => {
    const n = uvNokta(c);
    if (!n) return false;
    return Object.values(UST_UV).some(([u, v]) =>
      n[0] >= u && n[0] < u + 32 && n[1] >= v && n[1] < v + 16 && (u >= 32 || v >= 32));
  });
  const sismeVar = kupler.some(c => (c.inflate || 0) > 0);
  kontrol(k + ": ikinci katman kupleri var", ustVar);
  kontrol(k + ": ikinci katman sisirilmis (inflate)", sismeVar);
}

/* ---- 5b. ZINCIR ELE DEGMELI ----
   Zincirli bicimde zincirin alt ucu KOLUN ICINDE bitmeli.
   Kod bunu aciyla HESAPLIYOR (elle yazmiyor), yani kol acisi
   degisince zincir pesinden gidiyor. Bu madde o bagi tutuyor:
   biri zincirin yerini sabit sayiya cevirirse burada dusar. */
console.log("");
console.log("== 5b. zincir ele degiyor mu");
for (const k of bloklar) {
  const geo = JSON.parse(readFileSync(
    RP + "/models/blocks/kupa_" + k + ".geo.json", "utf8"))["minecraft:geometry"][0];
  const kupler = geo.bones.flatMap(b => b.cubes || []);
  const zincirler = kupler.filter(c => c.material_instance === "zincir");
  if (!zincirler.length) continue;
  /* Kollar: donmus kuplerin taban katmani (inflate yok). */
  const kollar = kupler.filter(c => !c.material_instance && c.rotation &&
                                    !(c.inflate > 0));
  kontrol(k + ": zincir sayisi kol sayisiyla ayni",
          zincirler.length === kollar.length,
          zincirler.length + " zincir / " + kollar.length + " kol");
  for (const z of zincirler) {
    const zx = z.origin[0] + z.size[0] / 2;
    const zy = z.origin[1];                 // zincirin ALT ucu
    const degiyor = kollar.some(c => {
      const { mn, mx } = sinirlar({ bones: [{ cubes: [c] }] });
      return zx >= mn[0] - 0.6 && zx <= mx[0] + 0.6 &&
             zy >= mn[1] - 0.6 && zy <= mx[1] + 0.6;
    });
    kontrol(k + ": zincirin alt ucu kolun icinde",
            degiyor, "zincir x=" + zx.toFixed(1) + " y=" + zy.toFixed(1));
  }
}

/* ---- 6. BOZUK SKIN GUVENCESI ---- */
console.log("");
console.log("== 6. bozuk skin uretilmiyor");
kontrol("komsu farki esigi tanimli", /KUPA_GURULTU_ESIGI\s*=\s*[\d.]+/.test(KOD));
kontrol("palet esigi tanimli", /KUPA_PALET_ESIGI\s*=\s*[\d.]+/.test(KOD));
/* IKI KOSUL BIRDEN aranmali. Tek basina her ikisi de yanlis
   sonuc verdi: komsu farki dream.png'yi (uc saf renk, sert
   kenar) gurultu sandi; renk orani earl.png'nin yumusak
   gecisini gurultu sandi.                                  */
kontrol("gurultu IKI kosula birden bagli",
        /fark > KUPA_GURULTU_ESIGI[\s\S]{0,80}?oran > KUPA_PALET_ESIGI/.test(KOD));
kontrol("komsu piksel farki olculuyor", /_kupa_gurultulu_mu\s*\(/.test(KOD));

/* ---- SINIFLANDIRICI GERCEKTEN CALISTIRILIYOR ----
   Yukaridaki maddeler kodun SEKLINE bakiyor; bu madde
   HUKMUNE bakiyor. Depodaki bes skinin dordu temiz, biri
   (ferguson) bozuk -- siniflandirici bunu boyle demezse
   esikler kaymis demektir.                                 */
{
  const bekle = { dream: false, earl: false, entity303: false,
                  wyne: false, ferguson: true };
  const betik = `
import sys
sys.path.insert(0, ${JSON.stringify(KOK)})
sys.argv = ["kol_uret"]
import importlib.util
spec = importlib.util.spec_from_file_location("ku", ${JSON.stringify(KOK + "/kol_uret.py")})
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
from PIL import Image
import os
for ad in sorted(bekle_listesi):
    yol = os.path.join(${JSON.stringify(KOK)}, "kupa_skinleri", ad + ".png")
    if not os.path.exists(yol):
        print(ad, "YOK"); continue
    px = Image.open(yol).convert("RGBA").load()
    bozuk = False
    for kutu, (uv, olcu) in m.SKIN_KUTULARI.items():
        for yon, (x, y, en, boy) in m._kupa_yuz_dikdortgenleri(uv, olcu).items():
            if m._kupa_gurultulu_mu(px, x, y, en, boy)[0]:
                bozuk = True
    print(ad, "BOZUK" if bozuk else "TEMIZ")
`;
  const tam = "bekle_listesi = " + JSON.stringify(Object.keys(bekle)) + "\n" + betik;
  let cikti = "";
  try {
    cikti = execFileSync("python3", ["-c", tam], { encoding: "utf8" });
  } catch (e) {
    cikti = "(python3 calismadi: " + (e.message || "") + ")";
  }
  if (cikti.includes("calismadi") || cikti.includes("ModuleNotFound")) {
    console.log("  - python3/PIL yok, siniflandirici denemesi atlandi");
  } else {
    for (const [ad, bozukBekleniyor] of Object.entries(bekle)) {
      const satir = cikti.split("\n").find(l => l.startsWith(ad + " "));
      if (!satir) { kontrol(ad + ": siniflandirici sonucu var", false); continue; }
      if (satir.endsWith("YOK")) { console.log("  - " + ad + ": skin dosyasi yok"); continue; }
      kontrol(ad + ": siniflandirici " + (bozukBekleniyor ? "BOZUK" : "TEMIZ") + " demeli",
              satir.endsWith(bozukBekleniyor ? "BOZUK" : "TEMIZ"), satir.trim());
    }
  }
}
kontrol("bozuk skinde kupa URETILMIYOR (continue)",
        /_bozuk[\s\S]{0,400}?continue/.test(KOD));
kontrol("bozuk skinde artik dosyalar siliniyor",
        /_bozuk[\s\S]{0,400}?os\.remove/.test(KOD));
/* KUPALAR listesinde olup uretilmeyen varsa bunun SEBEBI
   ekrana yaziliyor olmali -- sessiz atlama yasak. */
kontrol("uretilmeyen kupa icin UYARI basiliyor",
        /print\("UYARI: %s kupasi URETILMEDI/.test(PY));

/* ---- 7. OLCEK VE UV ---- */
console.log("");
console.log("== 7. olcek 1.0 degilse yuz yuz UV");
kontrol("_kupa_kup olcege gore UV secmiyor mu diye bakiliyor",
        /if olcek == 1\.0:[\s\S]{0,120}?kup\["uv"\] = \[u, v\][\s\S]{0,120}?else:[\s\S]{0,120}?_kupa_yuz_uv/.test(KOD));
for (const k of bloklar) {
  const geo = JSON.parse(readFileSync(
    RP + "/models/blocks/kupa_" + k + ".geo.json", "utf8"))["minecraft:geometry"][0];
  let kotu = [];
  for (const b of geo.bones) for (const c of b.cubes || []) {
    if (c.material_instance) continue;          // odun/ip: skin degil
    /* skin kupu: olculeri tam sayi degilse UV yuz yuz olmali */
    const tam = c.size.every(v => Math.abs(v - Math.round(v)) < 1e-9);
    if (!tam && Array.isArray(c.uv)) kotu.push(c.size.join("x"));
  }
  kontrol(k + ": kesirli olculu kupte kutu UV yok", kotu.length === 0, kotu.join(" "));
}

/* ---- 8. RACON ---- */
console.log("");
console.log("== 8. racon dil dosyasinda");
for (const dil of ["tr_TR", "en_US"]) {
  const lang = readFileSync(RP + "/texts/" + dil + ".lang", "utf8");
  /* Butun dosyada anahtarsiz satir olmamali. Bu madde tek
     basina yukaridaki hatayi yakalar: \n yazan bir deger
     dosyada mutlaka '=' icermeyen bir satir birakir.       */
  const oksuz = lang.split("\n")
    .filter(s2 => s2.trim() && !s2.startsWith("#") && !s2.includes("="));
  kontrol(dil + ": anahtarsiz satir yok", oksuz.length === 0,
          oksuz.slice(0, 2).join(" | "));
  for (const k of bloklar) {
    const satir = lang.split("\n").find(s => s.startsWith("tile.pa:kupa_" + k + ".name="));
    kontrol(dil + " " + k + ": dil kaydi var", !!satir);
    if (satir) {
      const deger = satir.slice(satir.indexOf("=") + 1);
      /* Racon ADIN AYNI SATIRINDA olmali. .lang'da satir sonu
         degeri bitiriyor; alt satira yazilan racon anahtarsiz
         oksuz bir satir olur ve oyun onu hic okumaz. Bu tam
         olarak v7.25'te bir kez yapildi.                    */
      kontrol(dil + " " + k + ": racon adla ayni satirda",
              deger.includes("§8·") &&
              deger.split("§8·")[1].replace(/§./g, "").trim().length > 5,
              deger.slice(0, 70));
    }
  }
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> kupalar yerinde");
process.exit(hata ? 1 : 0);
