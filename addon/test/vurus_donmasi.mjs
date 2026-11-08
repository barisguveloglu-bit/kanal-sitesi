/* VURUS DONMASI (hitstop) -- blender_film.zaman_haritasi + donma_noktalari   2026-11-08

   Kullanici (2026-11-08): "dovus entegrasyonlarini ekledik, bundan sonra
   dovusler daha iyi olacak degil mi ... daha fazla arastir, hepsini ekle."
   Arastirma: REFERANS_DOVUS_KOREOGRAFI.md §4, §62. Blender gerekmiyor.

   ---- BU DOSYANIN TUTTUGU SEY ----
   1. "vurus_donmasi": true ile her temas karesinin ardina donma karesi
      eklenir; sayi saldiranin kimlik agirligindan (Omer agir 3, asker orta 2),
      savunulan vurus 1, "saldiri_ii" +1.
   2. Donma karelerinde BUTUN sahne durur: iki dovuscunun konumu ve acisi
      degismez, hikaye zamani yalniz DONMA_ADIM ilerler; donmadan sonra zaman
      normal adimla surer.
   3. Temas, ikinci geciste de donmanin ILK karesinde (efektin karesi);
      sonraki temaslar eklenen kareler kadar kayar.
   4. Yazilmazsa harita bire bir eskisi; Part 1'in alti senaryosu ve 1. bolum
      degismez (kare sayilari ayni). */
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
  "import sys, json, os\nsys.dont_write_bytecode = True\nsys.path.insert(0, sys.argv[1])\nos.chdir(os.path.join(sys.argv[1], '..'))\n" + kod, ARAC],
  { encoding: "utf8", env: ORTAM, maxBuffer: 1 << 26 }));

const r = py(`
import glob
import blender_film as F, bedrock_onizleme as B
setler = B.oku(F.HAREKET)["setler"]
def dovus(**ek):
    s = {"fps": 30, "sure": 4.0, "akici": True,
         "aktorler": {"a": {"skin": "kaynak_doku/aktor/omer.png", "set": "yumruk", "konum": [0, 0], "bak": "b", "kimlik": "omer"},
                      "b": {"skin": "kaynak_doku/aktor/sur_askeri_gri.png", "set": "yumruk", "konum": [1.2, 0], "bak": "a", "kimlik": "asker"}},
         "olaylar": [{"t": 0.5, "aktor": "a", "vur": "oto", "hedef": "b"},
                     {"t": 1.6, "aktor": "b", "vur": "oto", "hedef": "a"},
                     {"t": 2.6, "aktor": "a", "vur": "oto", "hedef": "b"}],
         "kamera": [{"t": 0, "aci": "elle", "kam": [0.6, -4, 1.6], "bak": [0.6, 0, 1.2], "lens": 30}]}
    s.update(ek)
    return s
s0 = dovus()
s1 = dovus(vurus_donmasi=True)
h0, h1 = F.zaman_haritasi(s0), F.zaman_haritasi(s1)
nok = F.donma_noktalari(s1)
ak, ef, _, _ = F.zaman_cizelgesi(s1, setler, {})
tem = [e for e in ef if e["tur"] in ("vurus", "kan", "savun")]
durgun, sonra = [], []
for (t0, n) in nok:
    f = F.kare_bul(h1, t0)
    m = 0.0
    for ad in ("a", "b"):
        k0 = ak[ad].kayit[f]
        for i in range(1, n + 1):
            for an in ("x", "y", "z", "aci"):
                m = max(m, abs(ak[ad].kayit[f + i][an] - k0[an]))
    durgun.append(m)
    sonra.append(round((h1[f + n + 1] - h1[f]) * 30, 4))
# savunulan vurus: b, a'nin ikinci vurusunu savunur
s2 = dovus(vurus_donmasi=True)
s2["olaylar"] = s2["olaylar"] + [{"t": 2.4, "aktor": "b", "savun": 1.0}]
nok2 = F.donma_noktalari(s2)
ef2 = F.zaman_cizelgesi(s2, setler, {})[1]
sav = [e["t"] for e in ef2 if e["tur"] == "savun"]
# saldiri_ii: a'nin agir vurusu 3 -> 4
s3 = dovus(vurus_donmasi=True)
s3["aktorler"]["a"]["saldiri_ii"] = True
nok3 = F.donma_noktalari(s3)
# Part 1 ve 1. bolum: bayrak yok, kare sayilari degismez
eski = {}
for y in sorted(glob.glob("film/bolum2_p1_*.json")) + sorted(glob.glob("film/bolum1_*.json")):
    sen = B.oku(y)
    eski[os.path.basename(y)] = [len(F.zaman_haritasi(sen)), len(F.zaman_haritasi(sen, donmali=False)), bool(sen.get("vurus_donmasi"))]
print(json.dumps({"n0": len(h0), "n1": len(h1), "nok": [[round(t, 4), n] for t, n in nok],
                  "tem_kare": [F.kare_bul(h1, e["t"]) + 1 for e in tem], "nok_kare": [F.kare_bul(h1, t) + 1 for t, _ in nok],
                  "durgun": durgun, "sonra": sonra, "adim": F.DONMA_ADIM,
                  "nok2": [[round(t, 4), n] for t, n in nok2], "sav": [round(t, 4) for t in sav],
                  "nok3": [n for _, n in nok3], "eski": eski,
                  "ayni0": h0 == F.zaman_haritasi(s0, donmali=False)}))`);

console.log("=== 1. DONMA SAYISI KIMLIKTEN ===");
kontrol("Omer (agir) 3, asker (orta) 2, Omer 3; toplam 8 kare eklendi",
        JSON.stringify(r.nok.map((x) => x[1])) === "[3,2,3]" && r.n1 - r.n0 === 8, JSON.stringify(r.nok) + " " + r.n0 + " -> " + r.n1);
kontrol("savunulan vurus 1 kare", r.sav.length >= 1 && r.sav.every((t) => r.nok2.some(([t2, n]) => Math.abs(t2 - t) < 1e-3 && n === 1)),
        JSON.stringify(r.sav) + " " + JSON.stringify(r.nok2));
kontrol("Saldiri II agir vurusa bir kare ekler (3 -> 4)", JSON.stringify(r.nok3) === "[4,2,4]", JSON.stringify(r.nok3));

console.log("\n=== 2. DONMADA SAHNE DURUR ===");
kontrol("donma karelerinde iki dovuscunun konumu/acisi degismiyor (< 1e-4)", r.durgun.every((m) => m < 1e-4), JSON.stringify(r.durgun));
kontrol("donmadan sonraki kare normal adimla (1 kare = 1/30 sn)", r.sonra.every((d) => Math.abs(d - 1) < 1e-3), JSON.stringify(r.sonra));

console.log("\n=== 3. TEMAS DONMANIN ILK KARESINDE ===");
kontrol("efektin karesi = donmanin ilk karesi; sonraki temaslar eklenen kadar kayar",
        JSON.stringify(r.tem_kare) === JSON.stringify(r.nok_kare) && r.nok_kare[1] - r.nok_kare[0] > 0, JSON.stringify(r.tem_kare));

console.log("\n=== 4. YAZILMAZSA ESKISI ===");
const eski = Object.entries(r.eski);
kontrol("bayraksiz senaryoda harita bire bir donmasiz harita", r.ayni0);
kontrol("Part 1'in alti senaryosu ve 1. bolum bayraksiz, kare sayilari ayni",
        eski.length >= 8 && eski.every(([, [a, b, bayrak]]) => a === b && !bayrak), JSON.stringify(r.eski));

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> vurus donmasi: kimlikten sayi, sahne durur, temas yerinde, eskisi degismez");
process.exit(hata ? 1 : 0);
