/* RENK + KODLAMA -- altyazi_bas ve film_birlestir                  v7.99.12

   Part 1 uzun denetiminde olculdu: ffmpeg RGB->YUV'de varsayilan BT.601
   matrisini kullanip etiket koymuyordu; oynaticilar ve YouTube HD'yi BT.709
   sayiyor -> yesiller ~6.7 seviye koyu gorunuyordu. Ayrica ses iki kez AAC'ye
   cevriliyordu (parca + son) ve video iki kez crf 18 ile.
   1. altyazi_bas ciktisi BT.709 etiketli (matris/primer/aktarim/aralik)
   2. BT.709 ile cozulunce renkler kaynaga yakin (< 2.5), BT.601 ile cozulunce
      uzak -- yani gercekten BT.709 matrisiyle kodlanmis (etiket yalan degil)
   3. parca ara dosyasinda ses KAYIPSIZ (FLAC), AAC'ye yalniz sonda
   4. son kodlama BT.709 etiketli, crf 16, GOP 15 (YouTube onerisi)
   5. son ses AAC 384k, video kopya: etiketler son dosyada da duruyor
   Mutasyonla isirdigi gosterildi: altyazi_bas'tan matris suzgeci cikinca 2
   dustu; VIDEO_CIKIS'tan etiketler cikinca 4 dustu. */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const ARAC = new URL("../arac/", import.meta.url).pathname;
const T = mkdtempSync(join(tmpdir(), "renk_kodlama_"));
try {
  const r = JSON.parse(execFileSync("python3", ["-c", `
import sys, os, json, subprocess; sys.path.insert(0, ${JSON.stringify(ARAC)})
import numpy as np
from PIL import Image
import blender_film as F, film_birlestir as B
T = ${JSON.stringify(T)}
k = os.path.join(T, "orman"); os.makedirs(os.path.join(k, "kare"))
renk = [(40, 160, 60), (190, 40, 30), (30, 70, 200), (120, 200, 90)]   # cimen, kirmizi, mavi, acik yesil
for i, c in enumerate(renk):
    Image.new("RGB", (320, 180), c).save(os.path.join(k, "kare", "%04d.png" % (i + 1)))
json.dump({"fps": 30, "yazilar": [], "kare": len(renk)}, open(os.path.join(k, "yazilar.json"), "w"))
F.altyazi_bas(k)
film = os.path.join(k, "film.mp4")
def etiket(p):
    o = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                        "stream=color_space,color_primaries,color_transfer,color_range", "-of", "json", p],
                       capture_output=True, text=True, check=True)
    return json.loads(o.stdout)["streams"][0]
def coz_hata(p, matris):
    o = subprocess.run(["ffmpeg", "-v", "error", "-i", p, "-vf",
                        "scale=in_color_matrix=%s:in_range=tv:out_range=pc,format=rgb24" % matris,
                        "-f", "rawvideo", "-"], capture_output=True, check=True).stdout
    y = np.frombuffer(o, dtype=np.uint8).reshape(-1, 180, 320, 3).astype(np.float32)
    return max(float(np.abs(y[i].reshape(-1, 3).mean(0) - np.array(c)).max()) for i, c in enumerate(renk))
sonuc = {"etiket": etiket(film), "h709": coz_hata(film, "bt709"), "h601": coz_hata(film, "bt601")}
# 3. parca: ses kayipsiz
import film_ses
B.B.oku = lambda yol: {"fps": 30, "parcalar": {"part1": [1, len(renk)]}}
B.F.altyazi_bas = lambda *a, **kw: None
sessiz = np.zeros((int(len(renk) / 30 * film_ses.ORAN) + 10, 2))
B.film_ses.ses_kur = lambda sen, katmanlar=False: ({"muzik": sessiz, "efekt": sessiz, "ortam": sessiz} if katmanlar else sessiz)
p, fps = B.parca(k, "x.json", 1, "part1")
o = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries", "stream=codec_name",
                    "-of", "csv=p=0", p], capture_output=True, text=True, check=True)
sonuc["parca"] = os.path.basename(p); sonuc["parca_ses"] = o.stdout.strip()
# 4-5. son kodlama: gercek ses_ayarla, cagrilari yakala
cagri = []
gercek = subprocess.run
def yakala(args, *a, **kw):
    cagri.append(list(args)); return gercek(args, *a, **kw)
B.subprocess.run = yakala
B.parca = lambda *a, **kw: (p, 30)
B.baslik_karti = lambda *a, **kw: None
cikti = os.path.join(T, "son.mp4")
B.main([cikti, k + ":x.json:part1"])
B.subprocess.run = gercek
kod = [c for c in cagri if "-filter_complex" in c][0]
def deger(c, ad): return c[c.index(ad) + 1] if ad in c else None
son_ses = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries", "stream=codec_name",
                          "-of", "csv=p=0", cikti], capture_output=True, text=True, check=True).stdout.strip()
aac = [c for c in cagri if "aac" in c][0]
sonuc.update({"kod": {x: deger(kod, x) for x in ("-colorspace", "-color_primaries", "-color_trc", "-color_range", "-crf", "-g")},
              "son_etiket": etiket(cikti), "son_ses": son_ses, "ses_bit": deger(aac, "-b:a")})
print(json.dumps(sonuc))`], { encoding: "utf8", cwd: T }).trim().split("\n").pop());
  const e = r.etiket;
  kontrol("altyazi_bas ciktisi BT.709 etiketli", e.color_space === "bt709" && e.color_primaries === "bt709" &&
          e.color_transfer === "bt709" && e.color_range === "tv", JSON.stringify(e));
  kontrol("gercekten BT.709 matrisiyle kodlanmis (709 ile cozum < 2.5, 601 ile > 3)", r.h709 < 2.5 && r.h601 > 3,
          `709: ${r.h709.toFixed(2)}, 601: ${r.h601.toFixed(2)}`);
  kontrol("parca ara dosyasinda ses kayipsiz (FLAC, .mkv)", r.parca_ses === "flac" && r.parca.endsWith(".mkv"),
          `${r.parca} / ${r.parca_ses}`);
  const k = r.kod;
  kontrol("son kodlama BT.709 etiketli, crf 16, GOP 15", k["-colorspace"] === "bt709" && k["-color_primaries"] === "bt709" &&
          k["-color_trc"] === "bt709" && k["-color_range"] === "tv" && k["-crf"] === "16" && k["-g"] === "15", JSON.stringify(k));
  const s = r.son_etiket;
  kontrol("son dosya: AAC 384k, BT.709 etiketleri duruyor", r.son_ses === "aac" && r.ses_bit === "384k" &&
          s.color_space === "bt709" && s.color_primaries === "bt709" && s.color_transfer === "bt709",
          `${r.son_ses} ${r.ses_bit} ${JSON.stringify(s)}`);
} finally {
  rmSync(T, { recursive: true, force: true });
}
console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> renk: BT.709 kodlu ve etiketli; ses tek AAC");
process.exit(hata ? 1 : 0);
