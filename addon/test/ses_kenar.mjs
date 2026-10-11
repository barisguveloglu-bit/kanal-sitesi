/* SES KENARLARI -- film_birlestir.parca                           v7.99.12

   Part 1 uzun denetiminde olculdu: parcanin sesi muzigin/efektin ortasindan
   dilimleniyordu; Part 1'in sonunda, siyaha geciste ses -14 dBFS'ten TEK
   ornekte sifira iniyordu (sicrama 0.44, filmdeki normal sicramalarin ~22
   kati) -> duyulur tik. Basta da kucuk bir basamak vardi (0.05).
   1. kenar_yumusat: ilk ve son ornek sifir, gecis KENAR_MS (10 ms), gecis
      icinde sicrama genlik/gecis_boyu'nu asmiyor, ortadaki ornekler AYNEN
      kaliyor, uzunluk degismiyor; kisa ve bos ses bozulmuyor
   2. parca(): karisim (ses_part1.wav) ve uc stem'in ikisi de uclarda
      sifira iniyor; ortada genlik korunuyor (yalniz kenar degisti)
   3. stem'ler karisimla ayni gecisi aliyor (Resolve'da ornek ornek hizali)
   Mutasyonla isirdigi gosterildi: parca'da karisimdan kenar_yumusat
   cikarilinca 2 dustu; stem'lerden cikarilinca 3 dustu; gecis 0 ms
   yapilinca 1 dustu. */
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
const T = mkdtempSync(join(tmpdir(), "ses_kenar_"));
try {
  const r = JSON.parse(execFileSync("python3", ["-c", `
import sys, os, json, wave; sys.path.insert(0, ${JSON.stringify(ARAC)})
import numpy as np
from PIL import Image
import blender_film as F, film_birlestir as B, film_ses
T = ${JSON.stringify(T)}
sonuc = {}
# 1. birim: sabit 0.5 genlikli 1 sn
x = np.full((film_ses.ORAN, 2), 0.5, np.float32)
y = B.kenar_yumusat(x)
k = int(film_ses.ORAN * B.KENAR_MS / 1000)
sonuc["birim"] = {"ms": B.KENAR_MS, "ilk": float(np.abs(y[0]).max()), "son": float(np.abs(y[-1]).max()),
                  "sicrama": float(np.abs(np.diff(y, axis=0)).max()), "sinir": 0.5 / max(k, 1) * 1.01,
                  "orta_ayni": bool((y[k:-k] == x[k:-k]).all()), "uzunluk": y.shape == x.shape,
                  "gecis_ornek": int((np.abs(y[:, 0] - 0.5) > 1e-6).sum())}
kisa = B.kenar_yumusat(np.ones((100, 2), np.float32))
sonuc["kisa"] = {"uclar": [float(kisa[0, 0]), float(kisa[-1, 0])], "bos": list(B.kenar_yumusat(np.zeros((0, 2))).shape)}
# 2-3. parca(): gercek mux; ses 0.5 genlikli 440 Hz + DC (kesimde tik garantili)
kl = os.path.join(T, "orman"); os.makedirs(os.path.join(kl, "kare"))
for i in range(30):
    Image.new("RGB", (64, 36), (40, 160, 60)).save(os.path.join(kl, "kare", "%04d.png" % (i + 1)))
json.dump({"fps": 30, "yazilar": [], "kare": 30}, open(os.path.join(kl, "yazilar.json"), "w"))
F.altyazi_bas(kl)
n = film_ses.ORAN + 4000
t = np.arange(n) / film_ses.ORAN
sin = (0.25 + 0.25 * np.sin(2 * np.pi * 440 * t)).astype(np.float32)[:, None].repeat(2, 1)
B.B.oku = lambda yol: {"fps": 30, "parcalar": {"part1": [1, 30]}}
B.F.altyazi_bas = lambda *a, **kw: None
B.film_ses.ses_kur = lambda sen, katmanlar=False: ({"muzik": sin, "efekt": sin * 0.5, "ortam": sin * 0.25} if katmanlar else sin)
B.parca(kl, "x.json", 1, "part1")
def oku(p):
    w = wave.open(p); a = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(np.float32) / 32767
    return a.reshape(-1, w.getnchannels())
def olc(p, c):
    a = oku(p)
    # gecis icinde izin verilen en buyuk sicrama: sinusun kendi egimi + rampanin egimi
    sinir = c * (0.25 * 2 * np.pi * 440 / film_ses.ORAN + 0.5 / max(k, 1)) * 1.1 + 1.5 / 32767
    return {"ilk": float(np.abs(a[0]).max()), "son": float(np.abs(a[-1]).max()), "sinir": float(sinir),
            "uc_sicrama": float(max(np.abs(np.diff(a[:k + 2], axis=0)).max(), np.abs(np.diff(a[-k - 2:], axis=0)).max())),
            "orta_tepe": float(np.abs(a[len(a) // 2 - 480:len(a) // 2 + 480]).max()), "tam_tepe": 0.5 * c,
            "uzunluk": len(a)}
sonuc["karisim"] = olc(os.path.join(kl, "ses_part1.wav"), 1)
sonuc["stem"] = {ad: olc(os.path.join(kl, "stem_part1_%s.wav" % ad), c) for ad, c in (("muzik", 1), ("efekt", 0.5), ("ortam", 0.25))}
sonuc["k"] = k
print(json.dumps(sonuc))`], { encoding: "utf8", cwd: T }).trim().split("\n").pop());
  const b = r.birim;
  kontrol(`kenar_yumusat: uclar sifir, gecis ${b.ms} ms, sicrama sinirli, orta aynen`,
          b.ms === 10 && b.ilk === 0 && b.son === 0 && b.sicrama <= b.sinir && b.orta_ayni && b.uzunluk &&
          b.gecis_ornek === 2 * r.k && r.kisa.uclar[0] === 0 && r.kisa.uclar[1] === 0 && r.kisa.bos[0] === 0,
          JSON.stringify(b) + " kisa " + JSON.stringify(r.kisa));
  // 16 bit: bir adim 1/32767; ucta en fazla bir adim
  const ADIM = 1.5 / 32767;
  const m = r.karisim;
  kontrol("parca: karisim uclarda sifira iniyor, ortada genlik korunuyor",
          m.ilk <= ADIM && m.son <= ADIM && m.uc_sicrama <= m.sinir && Math.abs(m.orta_tepe - m.tam_tepe) < 0.002,
          JSON.stringify(m));
  const st = Object.entries(r.stem);
  kontrol("parca: uc stem de ayni gecisi aliyor (karisimla hizali)",
          st.length === 3 && st.every(([, s]) => s.ilk <= ADIM && s.son <= ADIM && s.uzunluk === m.uzunluk &&
                                       s.uc_sicrama <= s.sinir && Math.abs(s.orta_tepe - s.tam_tepe) < 0.002),
          st.map(([a, s]) => `${a}: ilk ${s.ilk.toFixed(5)} son ${s.son.toFixed(5)} uc ${s.uc_sicrama.toFixed(4)}`).join(", "));
} finally {
  rmSync(T, { recursive: true, force: true });
}
console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> ses kenarlari: kesimde tik yok, ortadaki ses aynen");
process.exit(hata ? 1 : 0);
