/* KULUBE SAHNELERI -- 2. bolum Part 1                          v7.99.16

   Baris kulubede uyanir, dogrulur, kitapliktan ates kitabini alir,
   okur, yerine koyar; disari cikinca usur; savas odasinda kapi
   tiklatilir. Pozlar arac/film_poz.py, kitap esyasi ve dolgu isigi
   arac/blender_film.py. Blender gerekmiyor.

   ---- BU DOSYANIN TUTTUGU SEY ----
   1. Alti yeni poz var; 1. bolumun 14 pozu degismedi (kontrol eski
      pozlarin adlarini ve sayisini tutuyor).
   2. dogrul (akici): yatakta dogrulurken bedenin en alt noktasi her an
      zeminde (<= 0,1 px), son hali OTURMUS (kok donusu 0, bacaklar one).
   3. kitap_al biter, kitap_oku baslar, kitap_koy baslar: ayni kol acisi
      (atlama yok); okurken kitap GOGUS hizasinda (kol -80 yuzu kapatiyordu).
   4. titre dongu (0,25 sn), kapi_tikla iki vurus.
   5. Kitap esyasi: kapali (iki kapak, sirt, sayfa) ve acik (sirttan V,
      sayfalar kapaklarin USTUNDE -- okurken okuyana bakar).
   6. Aktorun "bak"i bir nokta olabilir (eskiden sessizce yok sayiliyordu,
      Baris kitapliga degil duvara uzandi). */
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const BURADA = dirname(fileURLToPath(import.meta.url));
const ARAC = join(BURADA, "..", "arac");
const ORTAM = { ...process.env, PYTHONDONTWRITEBYTECODE: "1" };
let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const py = (kod) => JSON.parse(execFileSync("python3", ["-c",
  "import sys, json, math\nsys.dont_write_bytecode = True\nsys.path.insert(0, sys.argv[1])\n" + kod, ARAC],
  { encoding: "utf8", env: ORTAM, maxBuffer: 1 << 26 }));

console.log("=== 1-4. POZLAR ===");
{
  const r = py(`
import film_poz as FP, bedrock_onizleme as B
P = FP.pozlar(True); D = FP.pozlar(False)
ad = lambda k: FP.ONEK + k
geo = FP._geo()
a = P[ad("dogrul")]
alt = [FP.en_alt(geo, a, t / 20.0) for t in range(0, int(a["animation_length"] * 20) + 1)]
son = a["animation_length"]
kok = B.deger(a["bones"]["root"]["rotation"], son)
bacak = B.deger(a["bones"]["rightLeg"]["rotation"], son)
kv = lambda p, kem, t: B.deger(D[ad(p)]["bones"][kem]["rotation"], t)
eski = ["dus", "comel_dokun", "etrafa_bak", "kagit", "sendele", "diz_cok", "yuzustu", "govde_tut", "bayil",
        "kalk", "yere_yumruk", "blok_al", "blok_at", "tirpan_bekle"]
print(json.dumps({
  "yeni": all(ad(k) in P for k in ("dogrul", "kitap_al", "kitap_oku", "kitap_koy", "titre", "kapi_tikla")),
  "eski": all(ad(k) in D for k in eski), "toplam": len(D),
  "alt": [min(alt), max(alt)], "kok": kok, "bacak": bacak,
  "al_son": kv("kitap_al", "leftArm", D[ad("kitap_al")]["animation_length"]),
  "oku_bas": kv("kitap_oku", "leftArm", 0.0), "koy_bas": kv("kitap_koy", "leftArm", 0.0),
  "titre": [D[ad("titre")]["loop"], D[ad("titre")]["animation_length"]],
  "tikla": D[ad("kapi_tikla")]["_cozum"]["vurus_t"]}))`);
  kontrol("alti yeni poz var", r.yeni);
  // 20 + 2: hanedanin girisi (2026-11-03) endise ve eller_arkada ekledi;
  // ikisi part1_parcalar.mjs 13. bolumde olculuyor
  kontrol("1. bolumun 14 pozu yerinde", r.eski && r.toplam === 22, r.toplam + " poz");
  kontrol("dogrul: en alt nokta her an zeminde (<= 0,1 px)", Math.max(Math.abs(r.alt[0]), Math.abs(r.alt[1])) <= 0.1,
          r.alt.map((x) => x.toFixed(3)).join(" .. "));
  kontrol("dogrul: sonunda oturuyor (kok dik, bacaklar one)",
          Math.abs(r.kok[0]) < 1e-6 && Math.abs(r.bacak[0] + 90) < 1e-6, JSON.stringify([r.kok, r.bacak]));
  const ayni = (a, b) => a.every((x, i) => Math.abs(x - b[i]) < 1e-6);
  kontrol("kitap_al -> kitap_oku -> kitap_koy ayni kol acisindan (atlama yok)",
          ayni(r.al_son, r.oku_bas) && ayni(r.oku_bas, r.koy_bas), JSON.stringify(r.oku_bas));
  kontrol("okurken kitap gogus hizasinda (kol -80'den asagida)", r.oku_bas[0] > -70 && r.oku_bas[0] < -40,
          String(r.oku_bas[0]));
  kontrol("titre dongu, 0,25 sn", r.titre[0] === true && r.titre[1] === 0.25, JSON.stringify(r.titre));
  kontrol("kapi_tikla iki vurus", r.tikla.length === 2, JSON.stringify(r.tikla));
}

console.log("\n=== 5. KITAP ESYASI ===");
{
  const r = py(`
import blender_film as F
k0, y0, m0 = F.kitap_ormesi(False)
k1, y1, m1 = F.kitap_ormesi(True)
def ort(k, y, m, mal):
    zs = [k[i][2] for f, mm in zip(y, m) if mm == mal for i in f]
    return sum(zs) / len(zs)
# acik kitapta her yarinin dis kenari sirttan yukarida (V)
dis = [v for v in k1 if abs(v[0]) > 4.0 / 16]
print(json.dumps({"kapali": [len(y0), m0.count(1)], "acik": [len(y1), m1.count(1)],
                  "sayfa_ustte": ort(k1, y1, m1, 1) > ort(k1, y1, m1, 0),
                  "v": min(v[2] for v in dis) > 0, "esya": list(F.KITAP_ESYA), "aci": F.KITAP_ACI}))`);
  kontrol("kapali kitap: iki kapak, sirt, sayfa (24 yuz, 6'si sayfa)", r.kapali[0] === 24 && r.kapali[1] === 6,
          JSON.stringify(r.kapali));
  kontrol("acik kitap: iki yari (24 yuz, 12'si sayfa)", r.acik[0] === 24 && r.acik[1] === 12, JSON.stringify(r.acik));
  kontrol("acik kitapta sayfalar kapaklarin ustunde (okuyana bakar)", r.sayfa_ustte);
  kontrol("acik kitap sirttan V acilmis (dis kenarlar yukarida)", r.v && r.aci > 0, String(r.aci));
  kontrol("iki esya adi: kitap, kitap_acik", JSON.stringify(r.esya) === '["kitap","kitap_acik"]');
}

console.log("\n=== 6. AKTORUN BAKISI BIR NOKTA ===");
{
  const r = py(`
import blender_film as F, bedrock_onizleme as B
sen = {"fps": 10, "sure": 0.5, "akici": True,
       "aktorler": {"b": {"skin": "x.png", "konum": [0.75, 0.5], "bak": [-0.5, 0.5]}},
       "olaylar": [], "kamera": [{"t": 0, "aci": "genis", "a": "b"}]}
ak, _, _, _ = F.zaman_cizelgesi(sen, B.oku(F.HAREKET)["setler"], F.film_pozlari(True))
print(json.dumps({"aci": ak["b"].kayit[0]["aci"], "beklenen": F.yon_aci([0.75, 0.5], [-0.5, 0.5])}))`);
  kontrol("\"bak\": [x, y] aktoru o noktaya dondurur (bati = 90)", Math.abs(r.aci - r.beklenen) < 1e-6 && Math.abs(r.aci - 90) < 1e-6,
          r.aci.toFixed(2));
}

console.log("\n=== 7. DOLGU ISIGI ARALIKTA YANIP SONER (Blender 5) ===");
{
  // Blender 5'te action katmanli; action.fcurves yok. Eski yol sessizce bos
  // liste verdi, dolgu isigi CONSTANT olmadi ve "t" araligi boyunca yavas
  // yavas sondu (kure onizlemesi: son saniye neredeyse kapkara).
  // Blender'siz olculuyor: egrilere yalniz egriler() ile ulasiliyor mu.
  const { readFileSync } = await import("node:fs");
  const kod = readFileSync(join(ARAC, "blender_film.py"), "utf8");
  const bas = kod.indexOf("\ndef egriler(");
  const son = kod.indexOf("\ndef ", bas + 1);
  const disarida = [...kod.matchAll(/action\.fcurves/g)].filter((m) => m.index < bas || m.index > son).length;
  kontrol("egriler() var, Blender 5'in katmanli action'ina iniyor", bas > 0 && kod.slice(bas, son).includes("channelbags"));
  kontrol("egriler() disinda action.fcurves yok", disarida === 0, disarida + " yer");
  kontrol("dolgu isigi egrilerini egriler() ile CONSTANT yapiyor", /for fc in egriler\(lamba\):/.test(kod));
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> kulube sahneleri: pozlar, kitap ve bakis tutarli");
process.exit(hata ? 1 : 0);
