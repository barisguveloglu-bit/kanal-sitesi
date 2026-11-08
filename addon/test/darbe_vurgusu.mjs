/* DARBE VURGUSU -- blender_film: darbe_listesi, travma_karaleri, sarsinti_ofseti   2026-11-08

   Kullanici (2026-11-08): "daha fazla arastir, hepsini ekle." Arastirma:
   REFERANS_DOVUS_KOREOGRAFI.md §63 (Eiserloh'un travma modeli), §71
   (kivilcim agirlikla). Blender gerekmiyor.

   ---- BU DOSYANIN TUTTUGU SEY ----
   1. Her temas saldiranin kimlik agirligiyla travma ekler (agir 0,85, orta
      0,55, hafif 0,35); savunulan vurus yarisi; temassiz sarsinti (zemin) agir.
   2. Travma FILM zamaninda dogrusal soner (~0,35 sn), vurus donmasi boyunca
      da surer (donma kareleri sarsintiyi kesmez); 1'de kirpilir.
   3. Gorunen sarsinti travmanin KARESI: agir/hafif genlik orani ~(0,85/0,35)^2.
   4. Duzgun: ortalama kare adimi / RMS 0,9'un altinda ve eski rastgele
      sarsintidan (1,04) belirgin az -- 7-15 Hz denenip olculdu, rastgeleden
      kesik cikti (1,56), 3-6 Hz secildi; belirleyici.
   5. Vurus yonune egilimli: yon (1, 0) iken x'teki sapma y'dekinden buyuk.
   6. Agir vurusun temas isigi temasta parlar, 5 karede soner; kivilcim
      agirlikla artar (hafif < orta < agir).
   7. Yazilmazsa eski sarsinti kodu yerinde (kombonun son vurusu, 0,3 sn).
   8. Ses (film_ses): savrulma TEMASTAN agirliga gore once (hafif 2, orta 4,
      agir 6 kare; §30, §69), agirin savrulmasi pes; darbe agirlikla
      katmanlanir (agirda alcak gumburtu), arka arkaya iki vurus ayni
      dosyayi calmaz; dosyalar depoda; karisim uctan uca kuruluyor;
      yazilmazsa eski savrulma (saldiri + 0,15 sn). */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
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
  "import sys, json, os, math\nsys.dont_write_bytecode = True\nsys.path.insert(0, sys.argv[1])\nos.chdir(os.path.join(sys.argv[1], '..'))\n" + kod, ARAC],
  { encoding: "utf8", env: ORTAM, maxBuffer: 1 << 26 }));

const r = py(`
import blender_film as F, bedrock_onizleme as B
setler = B.oku(F.HAREKET)["setler"]
s = {"fps": 30, "sure": 4.0, "akici": True, "vurus_donmasi": True, "darbe_vurgusu": True,
     "aktorler": {"a": {"skin": "kaynak_doku/aktor/omer.png", "set": "yumruk", "konum": [0, 0], "bak": "b", "kimlik": "omer"},
                  "b": {"skin": "kaynak_doku/aktor/sur_askeri_gri.png", "set": "yumruk", "konum": [1.2, 0], "bak": "a", "kimlik": "asker"}},
     "olaylar": [{"t": 0.5, "aktor": "a", "vur": "oto", "hedef": "b"},
                 {"t": 1.6, "aktor": "b", "vur": "oto", "hedef": "a"},
                 {"t": 2.6, "aktor": "a", "vur": "oto", "hedef": "b"},
                 {"t": 2.4, "aktor": "b", "savun": 1.0}],
     "kamera": [{"t": 0, "aci": "elle", "kam": [0.6, -4, 1.6], "bak": [0.6, 0, 1.2], "lens": 30}]}
h = F.zaman_haritasi(s)
_, ef, _, sars = F.zaman_cizelgesi(s, setler, {})
dl = F.darbe_listesi(s, ef, sars)
dl_zemin = F.darbe_listesi(s, [], [1.0])
tk = F.travma_karaleri(dl, h, 30, len(h))
f0 = F.kare_bul(h, dl[0][0])
n_don = dict(F.donma_noktalari(s))[dl[0][0]]
sonum = [round(tk[f0 + i][0], 4) for i in range(0, 14)]
def tepe(tr, yon=(0.0, 0.0)):
    return max(math.sqrt(sum(c * c for c in F.sarsinti_ofseti(f, tr, yon, 30)[:3])) for f in range(0, 90))
oran = tepe(0.85) / tepe(0.35)
seri = [F.sarsinti_ofseti(f, 0.85, (0.0, 0.0), 30) for f in range(0, 300)]
def duzgunluk(xs):
    adim = sum(abs(xs[i + 1] - xs[i]) for i in range(len(xs) - 1)) / (len(xs) - 1)
    return adim / math.sqrt(sum(x * x for x in xs) / len(xs))
yeni_d = max(duzgunluk([o[j] for o in seri]) for j in range(3))
import random as R
rr = R.Random(7)
eski_d = duzgunluk([rr.uniform(-1, 1) for _ in range(300)])
# dusuk frekansli gurultu kisa ornekte oynak: 3000 kare (100 sn) ile olcülur
yonlu = [F.sarsinti_ofseti(f, 0.85, (1.0, 0.0), 30) for f in range(0, 3000)]
vx = sum(o[0] ** 2 for o in yonlu) / len(yonlu)
vy = sum(o[1] ** 2 for o in yonlu) / len(yonlu)
yonlu2 = [F.sarsinti_ofseti(f, 0.85, (0.0, 1.0), 30) for f in range(0, 3000)]
vy2 = sum(o[1] ** 2 for o in yonlu2) / len(yonlu2)
vx2 = sum(o[0] ** 2 for o in yonlu2) / len(yonlu2)
import film_ses as S
sv = S.savrulma_zamanlari(s, ef, h, 30)
tem_kare = [F.kare_bul(h, e["t"]) for e in ef if e["tur"] in ("vurus", "kan", "savun")]
katman = [S.darbe_katmanlari(ag, i) for i, ag in enumerate(["agir", "agir", "orta", "orta", "hafif", "agir"])]
dosyalar = sorted({k[0] for kk in katman for k in kk} | {"cloth1.ogg", "cloth2.ogg"})
var = all(os.path.exists(os.path.join(S.KAYNAK, a)) for a in dosyalar)
kar = S.ses_kur(s)
print(json.dumps({"sv": [[round(t * 30, 3), ag] for t, ag in sv], "tem_kare": tem_kare,
                  "katman": [[k[0] for k in kk] for kk in katman], "katman_agir": katman[0],
                  "var": var, "kar": [int(kar.shape[0]), float(abs(kar).max())],
                  "pes": [S.SAVRULMA_HIZ[a] for a in ("hafif", "orta", "agir")],
                  "dl": [[round(t, 3), round(tr, 3)] for t, tr, _ in dl],
                  "dl_zemin": [round(tr, 3) for _, tr, _ in dl_zemin],
                  "sonum": sonum, "n_don": n_don, "oran": oran, "yeni_d": yeni_d, "eski_d": eski_d,
                  "ayni": F.sarsinti_ofseti(17, 0.7, (0.3, 0.4), 30) == F.sarsinti_ofseti(17, 0.7, (0.3, 0.4), 30),
                  "sifir": F.sarsinti_ofseti(5, 0.0, (1, 0), 30), "vx_vy": vx / vy, "vy_vx": vy2 / vx2,
                  "isik": F.darbe_isik_anahtarlari(40), "kiv": F.DARBE_KIVILCIM}))`);

console.log("=== 1. TRAVMA AGIRLIKTAN ===");
const tr = r.dl.map((x) => x[1]);
kontrol("Omer agir 0,85, asker orta 0,55, savunulan vurus yarisi (0,425)",
        tr.length === 3 && tr[0] === 0.85 && tr[1] === 0.55 && tr[2] === 0.425, JSON.stringify(r.dl));
kontrol("temassiz sarsinti (zemin vurusu) agir sayilir", JSON.stringify(r.dl_zemin) === "[0.85]", JSON.stringify(r.dl_zemin));

console.log("\n=== 2. SONUM: FILM ZAMANINDA, DONMADA DA SURER ===");
const s = r.sonum;
const adimlar = s.slice(1, 9).map((v, i) => +(s[i] - v).toFixed(4));
kontrol("temas karesinde 0,85; her kare 0,08 azalir (2,4/sn), ~11 karede biter",
        s[0] === 0.85 && adimlar.every((d) => Math.abs(d - 0.08) < 1e-3) && s[12] === 0 && s[10] > 0, JSON.stringify(s));
kontrol("donma kareleri (" + r.n_don + ") boyunca travma surer, kesilmez",
        r.n_don >= 2 && s.slice(0, r.n_don + 1).every((v, i) => i === 0 || v < s[i - 1]), JSON.stringify(s.slice(0, r.n_don + 1)));

console.log("\n=== 3-5. GENLIK, DUZGUNLUK, YON ===");
kontrol("genlik travmanin karesiyle: agir/hafif tepe orani ~5,9", r.oran > 4.5 && r.oran < 7.5, r.oran.toFixed(2));
kontrol("duzgun: ortalama kare adimi / RMS < 0,9 ve eski rastgele sarsintidan belirgin az",
        r.yeni_d < 0.9 && r.yeni_d < r.eski_d * 0.85, r.yeni_d.toFixed(3) + " (rastgele " + r.eski_d.toFixed(3) + ")");
kontrol("belirleyici; travma 0'da sarsinti yok", r.ayni && r.sifir.every((v) => v === 0), JSON.stringify(r.sifir));
kontrol("vurus yonune egilimli: yon (1,0) iken x varyansi y'den, (0,1) iken y'ninki x'ten ~1,6 kat",
        r.vx_vy > 1.4 && r.vy_vx > 1.4, r.vx_vy.toFixed(2) + " / " + r.vy_vx.toFixed(2));

console.log("\n=== 6. ISIK VE KIVILCIM ===");
const is = r.isik;
kontrol("temas isigi: once 0, temasta tepe, 5 karede 0",
        is[0][1] === 0 && is[1][0] === 40 && is[1][1] === Math.max(...is.map((x) => x[1])) && is[is.length - 1][0] === 45 && is[is.length - 1][1] === 0,
        JSON.stringify(is));
kontrol("kivilcim agirlikla artar (hafif < orta < agir)", r.kiv.hafif < r.kiv.orta && r.kiv.orta < r.kiv.agir, JSON.stringify(r.kiv));

console.log("\n=== 8. SAVRULMA VE DARBE SESI ===");
const once = r.sv.map(([fk], i) => +(r.tem_kare[i] - fk).toFixed(3));
kontrol("savrulma temastan once: Omer (agir) 6, asker (orta) 4, Omer'in savunulan vurusu 6 kare",
        JSON.stringify(once) === "[6,4,6]" && JSON.stringify(r.sv.map((x) => x[1])) === '["agir","orta","agir"]', JSON.stringify(once));
kontrol("agirin savrulmasi pes (oynatma hizi hafif > orta > agir)", r.pes[0] > r.pes[1] && r.pes[1] > r.pes[2], JSON.stringify(r.pes));
kontrol("agir darbe iki katman: agir yumruk + alcak gumburtu", r.katman_agir.length === 2 && /impactPunch_heavy/.test(r.katman_agir[0][0]) &&
        /lowFrequency/.test(r.katman_agir[1][0]), JSON.stringify(r.katman_agir));
kontrol("arka arkaya iki vurus ayni dosyayi calmiyor", r.katman.every((k, i) => i === 0 || k[0] !== r.katman[i - 1][0]), JSON.stringify(r.katman.map((k) => k[0])));
kontrol("ses dosyalari depoda, karisim uctan uca kuruluyor (sessiz degil)", r.var && r.kar[0] > 48000 && r.kar[1] > 0.01, JSON.stringify(r.kar));
const ses_kod = readFileSync(join(ARAC, "film_ses.py"), "utf8");
kontrol("bayrak yoksa eski savrulma (saldiri + 0,15 sn) yerinde", /if "vur" in o and not vurgu:\n\s+ef\.ekle\(oku\("cloth%d\.ogg" % \(1 \+ int\(t \* 10\) % 2\)\), film_t\(t \+ 0\.15\)/.test(ses_kod));

console.log("\n=== 7. YAZILMAZSA ESKISI ===");
const kod = readFileSync(join(ARAC, "blender_film.py"), "utf8");
kontrol("bayrak yoksa eski sarsinti (kombonun son vurusu, 0,3 sn, rastgele) yerinde",
        /if senaryo\.get\("darbe_vurgusu"\) else None\)/.test(kod) &&
        kod.includes("sars = sum(max(0.0, 1 - (f - s) / (0.3 * fps)) for s in sars_kare if 0 <= f - s < 0.3 * fps)") &&
        /for _ in range\(DARBE_KIVILCIM\[ag\] if ag else 10\):/.test(kod));

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> darbe vurgusu: travma agirliktan, karesiyle sarsinti, duzgun, yonlu; eskisi degismez");
process.exit(hata ? 1 : 0);
