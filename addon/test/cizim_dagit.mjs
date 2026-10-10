/* DAGITIK FILM CIZIMI -- arac/cizim_ortak.py, cizim_isci.py, cizim_dagit.py, cizim_topla.py

   Filmin tam kalite cizimi ~10-12 bulut oturumuna dagitiliyor; biten kareler
   kayipsiz paketlenip GIZLI depoya itiliyor. Burada BLENDER'SIZ olculur:
   Blender yerine kareyi belirleyici (tohumlu) ureten sahte bir "blender",
   GitHub yerine yerel ciplak depo.

   1. BOLME   her kare tam BIR kez; blok bolum sinirini asmiyor; her iscinin
              listesi cizim sirasinda (Part 1 once); ardisik bloklar farkli
              iscide (serpistirme); isci yukleri dengeli
   2. PAKET   kayipsiz: geri acilan her kare kaynakla piksel piksel ayni
              (BAGIMSIZ ffmpeg acisiyla da); alfa 255 -> x264rgb, alfa
              degisken -> FFV1; kunye md5'i bozuksa acilis REDDEDILIR
   3. UCTAN UCA  iki isci ayni depoya paralel yaziyor, biri itme yarisini
              kaybediyor (kanca) ve fetch + yeniden ile kazaniyor; yabanci
              commit korunuyor; her kare tam bir kez cizildi; --ayar hic
              verilmedi; topla her kareyi bire bir geri aciyor
   4. DEVAM   isci yarida olunce: durum eksigi dogru soyluyor, eksik
              yeniden dagitimi eksigi tam bir kez kapsiyor; yeniden
              baslayan isci depodakileri CIZMIYOR, Blender'in birakdigi 0
              baytlik yer tutucuyu silip yeniden ciziyor; disk tamamen
              gitse de (yeni calisma + yeni klon) hicbir sey cizilmiyor
   5. KALITE  yanlis boyutlu (onizleme) kare depoya giremiyor; topla
              herkese acik depoya yazmayi reddediyor

   Mutasyonla isirdigi gosterildi (her biri bozuldu, test DUSTU, geri alindi):
     dagit "i % n" -> ardisik dagitim               -> 1. serpistirme dustu
     bloklar "x + blok - 1" -> "x + blok"           -> 1. tam bir kez dustu
     paketle crf 0 -> 12 ve md5 karsilastirmasi atlandi -> 2. kayipsiz dustu
     blok_isle depo atlamasi kaldirildi              -> 4. yeniden cizmiyor dustu
     ciz yer tutucu silme kaldirildi                 -> 4. devam (isci cikis) dustu
     gonder reddedilince yeniden deneme kaldirildi   -> 3. itme yarisi dustu  */
import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, chmodSync, rmSync, mkdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const ARAC = new URL("../arac/", import.meta.url).pathname;
const KANAL = new URL("../../", import.meta.url).pathname;
const T = mkdtempSync(join(tmpdir(), "cizim_dagit_"));
const py = (args, opt = {}) => execFileSync("python3", args, { encoding: "utf8", maxBuffer: 1 << 26, stdio: ["ignore", "pipe", "pipe"], ...opt });
const git = (cwd, ...a) => execFileSync("git", a, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
try { execFileSync("ffmpeg", ["-version"], { stdio: "ignore" }); } catch {
  console.log("  ✗ ffmpeg yok -- paketleme olculemez (arac_kur.sh kurar)"); process.exit(1);
}

// ---------- yardimci python: belirleyici kare ureteci + bagimsiz kontrol ----------
writeFileSync(join(T, "uret.py"), `
import random, sys, os, json, hashlib, subprocess
def kare(kok, f, w, h, alfa_sabit=True):
    r = random.Random("%s:%d" % (kok, f))
    b = bytearray()
    for y in range(h):
        for x in range(w):
            b += bytes(((x * 5 + f * 3) % 256, (y * 9 + f) % 256, r.randrange(256),
                        255 if alfa_sabit else r.randrange(256)))
    return bytes(b)
def png(yol, kok, f, w, h, alfa_sabit=True):
    from PIL import Image
    Image.frombytes("RGBA", (w, h), kare(kok, f, w, h, alfa_sabit)).save(yol)
`);
// sahte blender: blender_film.py'nin komut satirini ve use_overwrite=False +
// use_placeholder davranisini taklit eder (var olan dosya -- 0 bayt bile -- cizilmez)
writeFileSync(join(T, "blender"), `#!/usr/bin/env python3
import sys, os, json
sys.path.insert(0, ${JSON.stringify(T)})
import uret
arg = sys.argv[sys.argv.index("--") + 1:]
with open(os.environ["SAHTE_KAYIT"], "a") as fh:
    fh.write(json.dumps(arg) + "\\n")
sen = json.load(open(arg[0]))
kok = os.path.splitext(os.path.basename(arg[0]))[0]
w, h = sen["cozunurluk"]
if os.environ.get("SAHTE_BOYUT"):
    w, h = map(int, os.environ["SAHTE_BOYUT"].split("x"))
a, b = map(int, arg[arg.index("--aralik") + 1].split("-"))
os.makedirs(os.path.join(arg[1], "kare"), exist_ok=True)
dur = int(os.environ.get("SAHTE_DUR", "0"))
for f in range(a, b + 1):
    p = os.path.join(arg[1], "kare", "%04d.png" % f)
    if os.path.exists(p):
        continue
    open(p, "wb").close()                      # yer tutucu
    if dur and f >= dur:
        sys.exit(1)                             # cizim yarida kesildi
    uret.png(p, kok, f, w, h)
    with open(os.environ["SAHTE_KAYIT"] + ".kare", "a") as fh:
        fh.write("%s %d\\n" % (kok, f))
json.dump({"fps": sen["fps"], "yazilar": [], "kare": 0}, open(os.path.join(arg[1], "yazilar.json"), "w"))
`);
chmodSync(join(T, "blender"), 0o755);

// ============ 1. BOLME ============
console.log("1. bolme");
const gercek = JSON.parse(py(["-c", `
import sys, json; sys.path.insert(0, ${JSON.stringify(ARAC)})
import cizim_ortak as O
print(json.dumps([[s["kok"], s["toplam"], s["bolumler"]] for s in O.senaryolar()]))`]));
kontrol("film: orman 2456 kare (part1 1-1066, part2 1067-2456) + oda 631",
        JSON.stringify(gercek) === JSON.stringify([["bolum1_orman", 2456, [["part1", 1, 1066], ["part2", 1067, 2456]]], ["bolum1_oda", 631, [["tum", 1, 631]]]]),
        JSON.stringify(gercek));
const sira = (kok) => gercek.findIndex((g) => g[0] === kok);
let bolmeTamam = true, sinirTamam = true, siraTamam = true, serpTamam = true, dengeTamam = true, bolmeDetay = "";
for (const [n, blok] of [[1, 10], [2, 10], [5, 10], [12, 10], [13, 10], [12, 7]]) {
  const plan = JSON.parse(py([ARAC + "cizim_dagit.py", "plan", "--isci", String(n), "--blok", String(blok), "--json"]));
  const say = new Map();
  const sahip = [];
  plan.forEach((liste, k) => {
    let onceki = [-1, 0];
    for (const [kok, a, b, bol] of liste) {
      for (let f = a; f <= b; f++) say.set(kok + ":" + f, (say.get(kok + ":" + f) || 0) + 1);
      const bols = gercek[sira(kok)][2].find((x) => x[0] === bol);
      if (!bols || a < bols[1] || b > bols[2] || b - a + 1 > blok) sinirTamam = false;
      const anahtar = [sira(kok), a];
      if (anahtar[0] < onceki[0] || (anahtar[0] === onceki[0] && anahtar[1] <= onceki[1])) siraTamam = false;
      onceki = anahtar;
      sahip.push([sira(kok), a, k]);
    }
  });
  for (const [kok, top] of gercek)
    for (let f = 1; f <= top; f++) if (say.get(kok + ":" + f) !== 1) { bolmeTamam = false; bolmeDetay = `N=${n} ${kok}:${f} x${say.get(kok + ":" + f) || 0}`; }
  if (say.size !== gercek.reduce((s, g) => s + g[1], 0)) bolmeTamam = false;
  sahip.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  if (n > 1) for (let i = 1; i < sahip.length; i++) if (sahip[i][2] === sahip[i - 1][2]) serpTamam = false;
  const yuk = plan.map((l) => l.reduce((s, [, a, b]) => s + b - a + 1, 0));
  if (Math.max(...yuk) - Math.min(...yuk) > 2 * blok) dengeTamam = false;
}
kontrol("her kare tam BIR kez (N = 1, 2, 5, 12, 13; blok 10 ve 7)", bolmeTamam, bolmeDetay);
kontrol("blok bolum sinirini asmiyor, blok boyunu gecmiyor", sinirTamam);
kontrol("her iscinin listesi cizim sirasinda (Part 1 -> Part 2 -> oda)", siraTamam);
kontrol("serpistirme: ardisik iki blok hicbir zaman ayni iscide degil", serpTamam);
kontrol("isci yukleri dengeli (fark <= 2 blok)", dengeTamam);

// ============ 2. PAKET ============
console.log("2. paket");
let paketSonuc;
try { paketSonuc = JSON.parse(py(["-c", `
import sys, os, json, subprocess, hashlib
sys.path.insert(0, ${JSON.stringify(ARAC)}); sys.path.insert(0, ${JSON.stringify(T)})
import cizim_ortak as O, uret
from PIL import Image
w, h = 64, 36
sonuc = {}
for ad, alfa in (("sabit", True), ("degisken", False)):
    d = os.path.join(${JSON.stringify(T)}, "pk_" + ad); os.makedirs(d, exist_ok=True)
    for f in range(5, 11):
        uret.png(os.path.join(d, "%04d.png" % f), ad, f, w, h, alfa)
    mkv = os.path.join(d, "p.mkv")
    # alfa sabit: x264rgb ZORLANIR (en kucugu secme kurali onu atlamasin, kayipsizligi olculsun)
    k = O.paketle(d, 5, 10, 30, mkv, ["x264rgb-crf0"] if alfa else None)
    serbest = O.paketle(d, 5, 10, 30, mkv + ".s.mkv") if alfa else k
    # BAGIMSIZ acis: modulun fonksiyonu degil, ffmpeg dogrudan
    ham = subprocess.run(["ffmpeg", "-v", "error", "-i", mkv, "-f", "rawvideo", "-pix_fmt", "rgba", "-"], capture_output=True, check=True).stdout
    kaynak = b"".join(Image.open(os.path.join(d, "%04d.png" % f)).convert("RGBA").tobytes() for f in range(5, 11))
    ac = os.path.join(d, "ac"); O.paket_ac(mkv, k, ac)
    geri = b"".join(Image.open(os.path.join(ac, "%04d.png" % f)).convert("RGBA").tobytes() for f in range(5, 11))
    bozuk = dict(k, piksel_md5=list(k["piksel_md5"])); bozuk["piksel_md5"][3] = "0" * 32
    try:
        O.paket_ac(mkv, bozuk, os.path.join(d, "ac2")); red = False
    except RuntimeError:
        red = True
    sonuc[ad] = {"kodek": k["kodek"], "bagimsiz": ham == kaynak, "png": geri == kaynak, "red": red,
                 "kare": sorted(os.listdir(ac)), "serbest": [serbest["kodek"], serbest["kayipli_cikan"]], "md5": k["piksel_md5"] == [hashlib.md5(uret.kare(ad, f, w, h, alfa)).hexdigest() for f in range(5, 11)]}
print(json.dumps(sonuc))`])); } catch (e) {
  kontrol("paketleme denemesi coktu", false, String(e.stderr).trim().split("\n").pop());
  paketSonuc = { sabit: { serbest: ["", ["?"]] }, degisken: { serbest: ["", []] } };
}
for (const ad of ["sabit", "degisken"]) {
  const s = paketSonuc[ad];
  kontrol(`alfa ${ad}: kodek ${ad === "sabit" ? "x264rgb-crf0 (zorlanan)" : "ffv1-bgra (x264rgb alfayi tasimaz, dogrulamada elendi)"}`,
          ad === "sabit" ? s.kodek === "x264rgb-crf0" : s.kodek === "ffv1-bgra" && s.serbest[1].join() === "x264rgb-crf0", JSON.stringify(s.serbest));
  if (ad === "sabit") kontrol("alfa sabit, serbest secim: iki aday da kayipsiz gecti", s.serbest[1].length === 0, JSON.stringify(s.serbest));
  kontrol(`alfa ${ad}: bagimsiz ffmpeg acisi kaynakla BIRE BIR`, s.bagimsiz);
  kontrol(`alfa ${ad}: paket_ac PNG'leri kaynakla bire bir, adlar 0005-0010`, s.png && (s.kare || []).join() === "0005.png,0006.png,0007.png,0008.png,0009.png,0010.png");
  kontrol(`alfa ${ad}: kunye md5'leri kaynak pikselin md5'i`, s.md5);
  kontrol(`alfa ${ad}: kunye md5'i bozuksa acilis REDDEDILIYOR`, s.red);
}

// ============ ortak: sahte senaryolar + ciplak depo ============
const SEN = join(T, "sen");
mkdirSync(SEN);
writeFileSync(join(SEN, "deneme_a.json"), JSON.stringify({ fps: 10, sure: 2.4, cozunurluk: [48, 27], parcalar: { part1: [1, 12], part2: [13, 25] } }));
writeFileSync(join(SEN, "deneme_b.json"), JSON.stringify({ fps: 10, sure: 0.9, cozunurluk: [48, 27] }));
const SENLER = [join(SEN, "deneme_a.json"), join(SEN, "deneme_b.json")].join(",");
const TUM = [...Array(25)].map((_, i) => "deneme_a " + (i + 1)).concat([...Array(10)].map((_, i) => "deneme_b " + (i + 1)));

function ciplakDepo(ad) {
  const bare = join(T, ad + ".git");
  git(T, "init", "-q", "--bare", "-b", "main", bare);
  git(bare, "config", "uploadpack.allowfilter", "true");
  git(bare, "config", "uploadpack.allowanysha1inwant", "true");
  const tohum = join(T, ad + "_tohum");
  git(T, "clone", "-q", bare, tohum);
  writeFileSync(join(tohum, "README.md"), "gizli\n");
  git(tohum, "add", "README.md");
  git(tohum, "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "-m", "ilk");
  git(tohum, "push", "-q", "origin", "HEAD:main");
  return "file://" + bare;
}
function isci(args, ortam = {}) {
  return new Promise((coz) => {
    const p = spawn("python3", [ARAC + "cizim_isci.py", "--kurma", "--blok", "4", "--senaryolar", SENLER, ...args],
      { env: { ...process.env, BLENDER: join(T, "blender"), ...ortam }, cwd: KANAL });
    let cikti = "";
    p.stdout.on("data", (d) => (cikti += d));
    p.stderr.on("data", (d) => (cikti += d));
    p.on("close", (kod) => coz({ kod, cikti }));
  });
}
const dagitPy = (...a) => JSON.parse(py([ARAC + "cizim_dagit.py", ...a, "--senaryolar", SENLER, "--blok", "4", "--json"]));
const kareKaydi = (k) => (existsSync(k + ".kare") ? readFileSync(k + ".kare", "utf8").trim().split("\n").filter(Boolean) : []);
function toplaKontrol(uzak, ad) {
  const hedef = join(T, ad + "_hedef");
  let kod = 0, cikti;
  try { cikti = py([ARAC + "cizim_topla.py", "--hedef", hedef, "--depo", join(T, ad + "_topla_depo"), "--uzak", uzak, "--senaryolar", SENLER]); }
  catch (e) { kod = e.status; cikti = String(e.stdout) + String(e.stderr); }
  const ayni = py(["-c", `
import sys, os, hashlib; sys.path.insert(0, ${JSON.stringify(T)}); import uret
from PIL import Image
k = 0
for kok, n in (("deneme_a", 25), ("deneme_b", 10)):
    for f in range(1, n + 1):
        p = os.path.join(${JSON.stringify(hedef)}, kok, "kare", "%04d.png" % f)
        if os.path.exists(p) and Image.open(p).convert("RGBA").tobytes() == uret.kare(kok, f, 48, 27): k += 1
print(k)`]).trim();
  return { kod, cikti, ayni: Number(ayni), yazilar: existsSync(join(hedef, "deneme_a", "yazilar.json")) && existsSync(join(hedef, "deneme_b", "yazilar.json")) };
}

// ============ 3. UCTAN UCA: iki paralel isci + itme yarisi ============
console.log("3. uctan uca (iki isci, ayni depo)");
{
  const uzak = ciplakDepo("u3");
  const kayit = join(T, "u3_blender.log");
  // kanca: isci 1'in ILK itmesinden hemen once depoya yabanci bir commit iter -> itme reddedilir
  const yabanci = join(T, "u3_yabanci");
  git(T, "clone", "-q", uzak, yabanci);
  // (kanca da yarisa girebilir -- isci 2 ayni anda itiyor -- o yuzden basarana kadar her itmede dener)
  const kanca = `test -e ${T}/u3_kanca_oldu || (cd ${yabanci} && (test -e yabanci.txt || (echo x > yabanci.txt && git add yabanci.txt && git -c user.name=y -c user.email=y@y commit -q -m yabanci)) && git pull -q --rebase origin main && git push -q origin HEAD:main && touch ${T}/u3_kanca_oldu) >/dev/null 2>&1`;
  const [r1, r2] = await Promise.all([
    isci(["--isci", "1/2", "--depo", join(T, "u3_d1"), "--uzak", uzak, "--calisma", join(T, "u3_c1")], { SAHTE_KAYIT: kayit, CIZIM_ITME_KANCASI: kanca }),
    isci(["--isci", "2/2", "--depo", join(T, "u3_d2"), "--uzak", uzak, "--calisma", join(T, "u3_c2")], { SAHTE_KAYIT: kayit }),
  ]);
  kontrol("iki isci de bitti (cikis 0, BITTI isareti)", r1.kod === 0 && r2.kod === 0 && existsSync(join(T, "u3_c1", "BITTI")) && existsSync(join(T, "u3_c2", "BITTI")),
          r1.kod || r2.kod ? (r1.kod ? r1.cikti : r2.cikti).slice(-400) : "");
  kontrol("itme yarisi yasandi: isci 1 reddedildi, fetch + yeniden ile itti", existsSync(join(T, "u3_kanca_oldu")) && /itme reddedildi/.test(r1.cikti));
  kontrol("isci klonu KISMI (blob:none): baskalarinin paketleri indirilmiyor",
          git(join(T, "u3_d1"), "config", "--get", "remote.origin.partialclonefilter") === "blob:none");
  const sonGecmis = git(join(T, "u3.git"), "log", "--format=%s", "main");
  kontrol("yabanci commit korundu (uzerine yazilmadi)", sonGecmis.includes("yabanci") && git(join(T, "u3.git"), "ls-tree", "main", "yabanci.txt") !== "");
  const cizilen = kareKaydi(kayit).sort();
  kontrol("her kare tam bir kez cizildi (35 kare, tekrar yok)", JSON.stringify(cizilen) === JSON.stringify([...TUM].sort()), cizilen.length + " cizim");
  const cagrilar = readFileSync(kayit, "utf8").trim().split("\n").map((s) => JSON.parse(s));
  kontrol("Blender'a hic --ayar verilmedi, her cagri --aralik ile", cagrilar.every((c) => !c.includes("--ayar") && c.includes("--aralik")), cagrilar.length + " cagri");
  const d = dagitPy("durum", "--depo", join(T, "u3_durum"), "--uzak", uzak);
  kontrol("durum: kalan 0, iki isci gorunuyor", d.kalan === 0 && Object.keys(d.isciler).sort().join() === "1/2,2/2", JSON.stringify({ kalan: d.kalan, isciler: Object.keys(d.isciler) }));
  const t = toplaKontrol(uzak, "u3");
  kontrol("topla: 35 karenin 35'i ureticiyle bire bir, yazilar.json'lar yerinde, cikis 0", t.kod === 0 && t.ayni === 35 && t.yazilar, t.kod ? t.cikti.slice(-300) : t.ayni + "/35");
  kontrol("topla: birlestirme icin TAMAM diyor", /TAMAM/.test(t.cikti) && !/EKSIK/.test(t.cikti));
}

// ============ 4. KALDIGI YERDEN DEVAM ============
console.log("4. kaldigi yerden devam");
{
  const uzak = ciplakDepo("u4");
  const k1 = join(T, "u4_b1.log"), k2 = join(T, "u4_b2.log"), k3 = join(T, "u4_b3.log");
  const ortak = ["--isci", "1/1", "--uzak", uzak];
  const r1 = await isci([...ortak, "--depo", join(T, "u4_d"), "--calisma", join(T, "u4_c")], { SAHTE_KAYIT: k1, SAHTE_DUR: "10" });
  const yerTutucu = join(T, "u4_c", "deneme_a", "kare", "0010.png");
  kontrol("kesilen isci hata ile cikti, kare 10'un 0 baytlik yer tutucusu kaldi", r1.kod !== 0 && existsSync(yerTutucu) && statSync(yerTutucu).size === 0, "kod " + r1.kod);
  const d = dagitPy("durum", "--depo", join(T, "u4_durum"), "--uzak", uzak);
  const a = d.senaryolar.find((s) => s.kok === "deneme_a"), b = d.senaryolar.find((s) => s.kok === "deneme_b");
  kontrol("durum: eksik = a part1 9-12, a part2 13-25, b 1-10; kalan 27",
          JSON.stringify(a.bolumler.map((x) => x.eksik)) === "[[[9,12]],[[13,25]]]" && JSON.stringify(b.bolumler[0].eksik) === "[[1,10]]" && d.kalan === 27,
          JSON.stringify([a.bolumler.map((x) => x.eksik), b.bolumler[0].eksik, d.kalan]));
  const e = dagitPy("eksik", "--depo", join(T, "u4_durum"), "--uzak", uzak, "--yeni", "3");
  const kap = new Map();
  for (const liste of e.bloklar) for (const [kok, x, y] of liste) for (let f = x; f <= y; f++) kap.set(kok + " " + f, (kap.get(kok + " " + f) || 0) + 1);
  const bekle = [9, 10, 11, 12, ...Array.from({ length: 13 }, (_, i) => 13 + i)].map((f) => "deneme_a " + f).concat([...Array(10)].map((_, i) => "deneme_b " + (i + 1)));
  kontrol("eksik --yeni 3: eksik kareleri tam bir kez kapsiyor, 3 isciye yayilmis, --is komutlari var",
          kap.size === bekle.length && bekle.every((k) => kap.get(k) === 1) && e.bloklar.every((l) => l.length > 0) && e.isler.every((s) => /^--is deneme_a:/.test(s) || /^--is deneme_b:/.test(s)),
          JSON.stringify(e.isler));
  const r2 = await isci([...ortak, "--depo", join(T, "u4_d"), "--calisma", join(T, "u4_c")], { SAHTE_KAYIT: k2 });
  const ikinci = kareKaydi(k2);
  kontrol("yeniden baslayan isci bitti", r2.kod === 0, r2.kod ? r2.cikti.slice(-300) : "");
  kontrol("depodaki 1-8 YENIDEN CIZILMEDI; yerelde gecerli kare 9 da cizilmedi", !ikinci.some((s) => /^deneme_a [1-9]$/.test(s)), ikinci.slice(0, 4).join(", "));
  kontrol("yer tutucu (kare 10) silinip yeniden cizildi", ikinci.includes("deneme_a 10"));
  kontrol("ikinci kosuda cizilen = tam olarak eksik kalanlar (26 kare)", ikinci.length === 26, String(ikinci.length));
  const r3 = await isci([...ortak, "--depo", join(T, "u4_d_yeni"), "--calisma", join(T, "u4_c_yeni")], { SAHTE_KAYIT: k3 });
  kontrol("disk gitti (yeni calisma + yeni klon): hicbir kare cizilmedi, hepsi atlandi",
          r3.kod === 0 && kareKaydi(k3).length === 0 && !existsSync(k3) && /BITTI: 0 kare itildi, 35 kare zaten/.test(r3.cikti), r3.kod ? r3.cikti.slice(-200) : "");
  const t = toplaKontrol(uzak, "u4");
  kontrol("topla: 35/35 kare bire bir", t.kod === 0 && t.ayni === 35, String(t.ayni));
}

// ============ 5. KALITE KILIDI ============
console.log("5. kalite kilidi");
{
  const uzak = ciplakDepo("u5");
  const r = await isci(["--is", "deneme_a:1-4", "--depo", join(T, "u5_d"), "--uzak", uzak, "--calisma", join(T, "u5_c")],
    { SAHTE_KAYIT: join(T, "u5.log"), SAHTE_BOYUT: "24x14" });
  kontrol("yanlis boyutlu kareler: isci durdu, depoya hicbir paket girmedi",
          r.kod !== 0 && git(join(T, "u5.git"), "ls-tree", "-r", "--name-only", "main").split("\n").every((x) => !x.startsWith("film/")), (r.cikti.match(/HATA: .*/) || [""])[0].slice(0, 90));
  let red = false;
  try { py([ARAC + "cizim_topla.py", "--hedef", join(KANAL, "addon", "film_kare_deneme"), "--depo", join(T, "u5_d"), "--uzak", uzak, "--senaryolar", SENLER]); }
  catch (e) { red = /herkese acik/.test(String(e.stderr) + String(e.stdout)); }
  kontrol("topla herkese acik depoya (kanal-sitesi) yazmayi reddediyor", red && !existsSync(join(KANAL, "addon", "film_kare_deneme")));
}

rmSync(T, { recursive: true, force: true });
console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> dagitik cizim: tam bir kez, kayipsiz, kaldigi yerden, gizli depoya");
process.exit(hata ? 1 : 0);
