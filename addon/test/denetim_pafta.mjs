/* DENETIM PAFTASI -- kare numarali temas sayfalari              v7.99.15

   Gemini videoyu saniyede bir kare goruyor (GEMINI_ISCI.md); arac/denetim_pafta.py
   cizimden ya da videodan cekim cekim pafta cizer, raporlar oradaki kare
   numaralariyla yazilir. Sentetik bir cizim uzerinde olculur: 100 kare,
   10 fps, kesme 31'de, kendi boyu kadar hizli giden bir kutu, gurultu ve
   uc butun-kare hatasi: 51 siyah, 71 parlaklik +%8, 81 obur cekimden
   gelmis kare (parlakligi ayni). 61'de yerel bir sicrama da var: bilerek
   aranmiyor (gercek dovuste hizli hareketten ayrilmadi, arac/denetim_pafta.py).

   1. cekim ve zaman: cekimler senaryodan, zaman (k-1)/fps, ornekleme
      ilk + son + her 0,5 sn, satirda iki cekim yok
   2. altyazi: ekrandaki yazi blender_film.altyazi_bas'in kuraliyla
   3. tek kare: yalniz 51, 71, 81; hizli kutu, kesme ve yerel sicrama
      suphe degil; --adim'li taslakta da bulunuyor
   4. video: kayipsiz videodan ayni sonuc; --atla/--ilk numarayi tutuyor
   5. guvenlik: cikti herkese acik depodaysa HATA
   6. mutasyon: isik olcusu kapaninca titreme (71), kapsam olcusu
      kapaninca obur cekimden gelen kare (81) kaciyor; hata silinince
      suphe kalmiyor; kesme kayinca cekim siniri kayiyor                 */
import { execFileSync } from "node:child_process";

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const KOK = new URL("..", import.meta.url).pathname;
const py = `
import json, math, os, shutil, subprocess, sys, tempfile
sys.path.insert(0, ${JSON.stringify(KOK + "arac")})
import numpy as np
from PIL import Image, ImageDraw
import denetim_pafta as P

gecici = tempfile.mkdtemp(prefix="pafta_test_")
out = {}

def kare(f, yerel=0):
    # iki cekimin zemini ayni parlaklikta (kanal ortalamasi 83,3), rengi farkli
    im = Image.new("RGB", (160, 90), (40, 70, 140) if f <= 30 else (60, 130, 60))
    d = ImageDraw.Draw(im)
    x, y = 20 + f, 40 + yerel
    d.rectangle([x, y - 30, x + 12, y - 18], fill=(240, 240, 240))
    a = f * 8 / 30.0                      # cember uzerinde 8 px/kare: kendi boyu
    hx, hy = 110 + 30 * math.cos(a), 45 + 30 * math.sin(a)
    d.rectangle([hx - 4, hy - 4, hx + 4, hy + 4], fill=(200, 60, 60))
    return np.asarray(im, dtype=np.int16)

def uret(hedef, hata=True, adim=1):
    os.makedirs(os.path.join(hedef, "kare"), exist_ok=True)
    rnd = np.random.default_rng(5)
    for f in range(1, 101, adim):
        r = kare(f, 8 if f == 61 else 0)              # yerel sicrama: aranmiyor
        if hata and f == 51:
            r = np.zeros_like(r)                      # siyah kare
        elif hata and f == 71:
            r = r * 1.08                              # isik titremesi
        elif hata and f == 81:
            r = kare(10)                              # obur cekimden gelmis kare
        g = rnd.integers(-3, 4, size=(90, 160, 1))
        Image.fromarray(np.clip(r + g, 0, 255).astype(np.uint8)).save(os.path.join(hedef, "kare", "%04d.png" % f))
    yazilar = [{"t": 1.0, "sure": 1.0, "metin": "Kaçamazsın!", "tur": "soyle", "isim": "Zisa"},
               {"t": 0.0, "sure": 2.5, "metin": "BAŞLIK", "tur": "baslik"},
               {"t": 4.0, "sure": 1.5, "metin": "Yıllar sonra...", "tur": "anlat"}]
    json.dump({"fps": 10, "kare": 100, "yazilar": yazilar},
              open(os.path.join(hedef, "yazilar.json"), "w", encoding="utf-8"), ensure_ascii=False)
    return yazilar

def senaryo(kesme=3.0):
    return {"fps": 10, "sure": 9.9, "aktorler": {}, "olaylar": [],
            "kamera": [{"t": 0.0, "aci": "genis", "a": "z", "b": "b"}, {"t": kesme, "aci": "omuz", "a": "z", "b": "b"}]}

def calistir(ad, kaynak, sen=None, yazilar=None, **k):
    return P.pafta_uret(kaynak, os.path.join(gecici, ad), sen, yazilar, "deneme", 0.5, 3, 3, 160,
                        fps=10, kaynak_adi=ad, **k)

def ozet(d):
    return {k: (v["t"], v["cekim"], v["yazi"], v["isaret"]) for k, v in d["kareler"].items()}

try:
    yazilar = uret(os.path.join(gecici, "cizim"))
    d = calistir("cikti", P.Klasor(os.path.join(gecici, "cizim")), senaryo(), yazilar)

    # ---- 1. cekim ve zaman ----
    out["cekimler"] = [(c["no"], c["bas"], c["son"]) for c in d["cekimler"]]
    out["zaman"] = all(abs(v["t"] - (int(k) - 1) / 10) < 1e-9 for k, v in d["kareler"].items())
    out["ornek1"] = sorted(int(k) for k, v in d["kareler"].items() if v["cekim"] == 1)
    satirlar = [s for p in d["paftalar"] for s in p["satirlar"]]
    out["satir_tek_cekim"] = all(all(d["kareler"][str(f)]["cekim"] == s["cekim"] for f in s["kareler"]) for s in satirlar)
    hepsi = [f for s in satirlar for f in s["kareler"]]
    out["her_kare_bir_paftada"] = sorted(hepsi) == sorted(int(k) for k in d["kareler"]) and len(hepsi) == len(set(hepsi))
    im = Image.open(os.path.join(gecici, "cikti", d["paftalar"][0]["dosya"]))
    out["pafta_boyu"] = [list(im.size), [3 * 160 + 4 * P.BOSLUK, P.BASLIK_Y + 3 * (90 + P.ETIKET_Y + P.BOSLUK) + P.BOSLUK]]
    out["md"] = open(os.path.join(gecici, "cikti", "pafta.md"), encoding="utf-8").read()

    # ---- 2. altyazi ----
    out["yazi_kareleri"] = {k: v["yazi"] for k, v in d["kareler"].items() if v["yazi"]}
    out["yazi_saf"] = [P.ekrandaki_yazi(yazilar, (f - 1) / 10) for f in (10, 11, 20, 21, 41, 55, 56)]

    # ---- 3. tek kare ----
    out["tek"] = [s["kare"] for s in d["tek_kare"]]
    out["tek_olcu"] = [[s["isik"] >= P.ISIK_ESIK, s["kapsam"] >= P.KAPSAM_ESIK] for s in d["tek_kare"]]
    out["isaret"] = {k: v["isaret"] for k, v in d["kareler"].items() if v["isaret"]}
    d2 = calistir("senaryosuz", P.Klasor(os.path.join(gecici, "cizim")), None, yazilar)
    out["senaryosuz"] = [[(c["no"], c["bas"], c["son"]) for c in d2["cekimler"]], [s["kare"] for s in d2["tek_kare"]]]
    uret(os.path.join(gecici, "adim2"), adim=2)
    d3 = calistir("adim2_cikti", P.Klasor(os.path.join(gecici, "adim2")), senaryo(), yazilar)
    out["adim2"] = [[s["kare"] for s in d3["tek_kare"]], all(int(k) % 2 == 1 for k in d3["kareler"])]

    # ---- 4. video ----
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-framerate", "10", "-i",
                    os.path.join(gecici, "cizim", "kare", "%04d.png"), "-c:v", "ffv1", "-pix_fmt", "bgr0",
                    os.path.join(gecici, "film.mkv")], check=True)
    d4 = calistir("video", P.Video(os.path.join(gecici, "film.mkv")), senaryo(), yazilar)
    # puan videoda biraz farkli olabilir (olcekleme ffmpeg'de); numara ve isaret ayni olmali
    out["video_ayni"] = ozet(d4) == ozet(d) and [x["kare"] for x in d4["tek_kare"]] == [x["kare"] for x in d["tek_kare"]]
    d5 = calistir("video_atla", P.Video(os.path.join(gecici, "film.mkv"), ilk=11, atla=1.0), senaryo(), yazilar)
    out["video_atla"] = [d5["aralik"], [s["kare"] for s in d5["tek_kare"]],
                         all(ozet(d5)[k] == ozet(d)[k] for k in ozet(d5) if k in ozet(d))]

    # ---- 5. guvenlik ----
    depo = os.path.join(${JSON.stringify(KOK)}, "pafta_test_buraya_yazilmamali")
    r = subprocess.run([sys.executable, os.path.join(${JSON.stringify(KOK + "arac")}, "denetim_pafta.py"),
                        os.path.join(gecici, "cizim"), "--cikti", depo], capture_output=True, text=True)
    out["guvenlik"] = [r.returncode != 0, "herkese acik" in r.stderr + r.stdout, not os.path.exists(depo)]

    # ---- 6. mutasyon ----
    uret(os.path.join(gecici, "temiz"), hata=False)
    out["m_temiz"] = [s["kare"] for s in calistir("temiz_cikti", P.Klasor(os.path.join(gecici, "temiz")), senaryo(), yazilar)["tek_kare"]]
    out["m_kesme"] = [(c["no"], c["bas"], c["son"]) for c in P.cekimler(senaryo(4.0), 1, 100)]
    for ad in ("ISIK_ESIK", "KAPSAM_ESIK"):
        eski = getattr(P, ad)
        setattr(P, ad, float("inf"))
        try:
            out["m_" + ad] = [s["kare"] for s in calistir("m_" + ad, P.Klasor(os.path.join(gecici, "cizim")), senaryo(), yazilar)["tek_kare"]]
        finally:
            setattr(P, ad, eski)
finally:
    shutil.rmtree(gecici, ignore_errors=True)
print(json.dumps(out, ensure_ascii=False))
`;
const r = JSON.parse(execFileSync("python3", ["-c", py], { cwd: KOK, encoding: "utf8", maxBuffer: 1 << 26 }));

console.log("=== 1. CEKIM VE ZAMAN ===");
kontrol("cekimler senaryonun kamerasindan: 1-30 ve 31-100", JSON.stringify(r.cekimler) === JSON.stringify([[1, 1, 30], [2, 31, 100]]),
        JSON.stringify(r.cekimler));
kontrol("her karenin zamani (k - 1) / fps", r.zaman);
kontrol("ornekleme: cekimin ilk ve son karesi + her 0,5 sn", JSON.stringify(r.ornek1) === JSON.stringify([1, 6, 11, 16, 21, 26, 30]),
        JSON.stringify(r.ornek1));
kontrol("bir satirda iki cekim yok", r.satir_tek_cekim);
kontrol("her secilen kare tam bir kez bir paftada", r.her_kare_bir_paftada);
kontrol("pafta boyu yerlesimle tutarli", JSON.stringify(r.pafta_boyu[0]) === JSON.stringify(r.pafta_boyu[1]), JSON.stringify(r.pafta_boyu));
kontrol("pafta.md cekim tablosu ve suphe listesi tasiyor",
        r.md.includes("| 1 | genis (z, b) | 1–30 |") && r.md.includes("| 2 | omuz (z, b) | 31–100 |") &&
        r.md.includes("| 51 | 2 |") && r.md.includes("| 71 | 2 |") && r.md.includes("| 81 | 2 |"));

console.log("\n=== 2. ALTYAZI ===");
kontrol("konusma isimle, yalniz 11-20. karelerde (bitis haric)",
        JSON.stringify(r.yazi_saf.slice(0, 4)) === JSON.stringify([null, "Zisa: Kaçamazsın!", "Zisa: Kaçamazsın!", null]),
        JSON.stringify(r.yazi_saf.slice(0, 4)));
kontrol("anlatim 41-55. karelerde", JSON.stringify(r.yazi_saf.slice(4)) === JSON.stringify(["Yıllar sonra...", "Yıllar sonra...", null]),
        JSON.stringify(r.yazi_saf.slice(4)));
kontrol("baslik sahnede degil (ayri kart): hicbir karede yok", !Object.values(r.yazi_kareleri).includes("BAŞLIK"));

console.log("\n=== 3. TEK KARE ===");
kontrol("yalniz 51 (siyah), 71 (titreme), 81 (obur cekimden): hizli kutu, kesme ve yerel sicrama degil",
        JSON.stringify(r.tek) === JSON.stringify([51, 71, 81]), JSON.stringify(r.tek));
kontrol("hangi olcu: siyah ikisi de, titreme isik, obur cekimden gelen kapsam",
        JSON.stringify(r.tek_olcu) === JSON.stringify([[true, true], [true, false], [false, true]]), JSON.stringify(r.tek_olcu));
kontrol("suphe komsulariyla paftada (komsular gri cerceveli)",
        ["51", "71", "81"].every((k) => r.isaret[k] === "suphe" && r.isaret[String(+k - 1)] === "komsu" &&
                                     r.isaret[String(+k + 1)] === "komsu"), JSON.stringify(r.isaret));
kontrol("senaryosuz: tek cekim, kesme (31) suphe degil", JSON.stringify(r.senaryosuz) === JSON.stringify([[[1, 1, 100]], [51, 71, 81]]),
        JSON.stringify(r.senaryosuz));
kontrol("--adim 2 taslakta (yalniz tek kareler var) ucu de bulunuyor", JSON.stringify(r.adim2) === JSON.stringify([[51, 71, 81], true]),
        JSON.stringify(r.adim2));

console.log("\n=== 4. VIDEO ===");
kontrol("kayipsiz videodan ayni kareler, zaman, cekim, altyazi ve suphe", r.video_ayni);
kontrol("--atla 1 --ilk 11: numara klasorunkiyle ayni", JSON.stringify(r.video_atla[0]) === "[11,100]" &&
        JSON.stringify(r.video_atla[1]) === "[51,71,81]" && r.video_atla[2], JSON.stringify(r.video_atla));

console.log("\n=== 5. GUVENLIK ===");
kontrol("cikti herkese acik depodaysa HATA, hicbir sey yazilmiyor", r.guvenlik.every(Boolean), JSON.stringify(r.guvenlik));

console.log("\n=== 6. MUTASYON ===");
kontrol("hata silinince suphe kalmiyor", r.m_temiz.length === 0, JSON.stringify(r.m_temiz));
kontrol("isik olcusu kapaninca titreme (71) kaciyor", JSON.stringify(r.m_ISIK_ESIK) === "[51,81]", JSON.stringify(r.m_ISIK_ESIK));
kontrol("kapsam olcusu kapaninca obur cekimden gelen kare (81) kaciyor", JSON.stringify(r.m_KAPSAM_ESIK) === "[51,71]",
        JSON.stringify(r.m_KAPSAM_ESIK));
kontrol("kesme 4,0 sn'ye kayinca cekim siniri 41'e kayiyor", JSON.stringify(r.m_kesme) === JSON.stringify([[1, 1, 40], [2, 41, 100]]),
        JSON.stringify(r.m_kesme));

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> denetim paftasi: cekim, altyazi, tek kare, video ve guvenlik tamam");
process.exit(hata ? 1 : 0);
