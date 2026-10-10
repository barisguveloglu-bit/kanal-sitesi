/* BASLIK KARTI -- film_birlestir.py                         v7.99.10

   Mojang kullanim kilavuzu: "title card ... outside of the actual game
   content" (REFERANS_MOJANG_KILAVUZ.md madde 7). "1. BOLUM" yazisi
   eskiden acilis sahnesinin USTUNE basiliyordu. Simdi:
   1. altyazi_bas baslik yazisini sahneye BASMIYOR (kare kaynakla ayni)
   2. film_birlestir sahneden ONCE ayri siyah kart koyuyor (ortasi yazili)
   3. film suresi = kart + sahne + siyah son
   4. basligi olmayan parca (Part 2) kartsiz basliyor
   Sahte kareler ve kucuk bir senaryoyla, Blender'siz olculur. */
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const ARAC = new URL("../arac/", import.meta.url).pathname;
const T = mkdtempSync(join(tmpdir(), "baslik_"));
const py = (kod) => execFileSync("python3", ["-c", kod], { encoding: "utf8", cwd: T }).trim();
try {
  const sen = { fps: 10, sure: 3.0, cozunurluk: [160, 90], parcalar: { part1: [1, 15], part2: [16, 30] },
                aktorler: {}, olaylar: [{ t: 0.1, baslik: "1. BÖLÜM" }], kamera: [{ t: 0, aci: "genis" }] };
  writeFileSync(join(T, "sen.json"), JSON.stringify(sen));
  const K = join(T, "film");
  mkdirSync(join(K, "kare"), { recursive: true });
  py(`
from PIL import Image
for f in range(1, 31):
    Image.new("RGB", (160, 90), (40, 140, 60)).save("film/kare/%04d.png" % f)
import json
json.dump({"fps": 10, "kare": 30, "yazilar": [{"t": 0.1, "sure": 1.0, "metin": "1. BÖLÜM", "tur": "baslik"}]},
          open("film/yazilar.json", "w"), ensure_ascii=False)`);
  // 1. altyazi_bas baslik basmiyor
  const sahne = py(`
import sys; sys.path.insert(0, ${JSON.stringify(ARAC)})
import blender_film as F
from PIL import Image
F.altyazi_bas("film", 1, [1, 15])
a = Image.open("film/altyazili/0003.png").convert("RGB").tobytes()
b = Image.open("film/kare/0003.png").convert("RGB").tobytes()
print("ayni" if a == b else "farkli", F.BASLIK_SAHNEDE)`);
  kontrol("altyazi_bas baslik yazisini sahneye basmiyor (kare kaynakla bire bir)", sahne === "ayni False", sahne);
  // 2-3. film_birlestir: kart + sahne + siyah son
  execFileSync("python3", [ARAC + "film_birlestir.py", join(T, "p1.mp4"), K + ":" + join(T, "sen.json") + ":part1"],
               { cwd: T, stdio: "pipe" });
  const sure = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0",
                                                 join(T, "p1.mp4")], { encoding: "utf8" }).trim());
  kontrol("Part 1 suresi = kart 2.5 + sahne 1.5 + siyah 0.6 sn", Math.abs(sure - 4.6) < 0.15, sure.toFixed(2) + " sn");
  const olc = py(`
import subprocess
def kare(t):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(t), "-i", "p1.mp4", "-frames:v", "1",
                          "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
    return raw
k = kare(1.2); s = kare(3.0)
W = 160
satir = [k[(45 * W + x) * 3] for x in range(W)]   # kartin ortasi: yazi beyaz
kenar = k[(5 * W + 5) * 3: (5 * W + 5) * 3 + 3]  # kartin kosesi: siyah
yesil = s[(45 * W + 80) * 3: (45 * W + 80) * 3 + 3]
print(max(satir) > 200, max(kenar) < 30, yesil[1] > 100 and yesil[0] < 90)`);
  kontrol("film siyah KARTLA basliyor (kose siyah, ortada beyaz yazi)", olc.startsWith("True True"), olc);
  kontrol("kartin ardindan sahne geliyor, sahnenin ustunde baslik yok", olc.endsWith("True"), olc);
  // 4. basligi olmayan parca kartsiz
  execFileSync("python3", [ARAC + "film_birlestir.py", join(T, "p2.mp4"), K + ":" + join(T, "sen.json") + ":part2"],
               { cwd: T, stdio: "pipe" });
  const sure2 = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0",
                                                  join(T, "p2.mp4")], { encoding: "utf8" }).trim());
  kontrol("basligi olmayan Part 2 kartsiz (sahne 1.5 + siyah 0.6 sn)", Math.abs(sure2 - 2.1) < 0.15, sure2.toFixed(2) + " sn");
} catch (e) {
  kontrol("deneme coktu", false, String(e.stderr || e).trim().split("\n").slice(-3).join(" | "));
} finally {
  rmSync(T, { recursive: true, force: true });
}
console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> baslik karti: sahnenin disinda, ayri siyah kart");
process.exit(hata ? 1 : 0);
