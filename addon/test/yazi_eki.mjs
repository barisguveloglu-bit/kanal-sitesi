/* YAZI EKLERI -- cizimden SONRA eklenen yazilar (ic ses, anlatici)   2026-11-22

   Kullanici (2026-11-22): Part 1'de 74 sn'de yalniz 2 konusma satiri
   vardi, "daha konusma ekle" dedi; "Ic ses / anlatim" secti (yeniden
   cizim yok) ve Claude'un taslak yazdigi 14 satirin hepsini onayladi.
   Satirlar film/yazi_ekleri/bolum2_p1.json'da; film_birlestir altyaziyi
   basarken cizimin yazilar.json'una ekliyor (yazi_ekleri). Kareler ve
   senaryolar DEGISMEZ: senaryodaki "soyle" konusma hareketi ve agiz
   cizdirir, yazi eki yalniz altyaziya girer.

   1. veri: onaylanan 14 satir yerinde; her biri kendi sahnesinin icinde,
      senaryonun kendi satirlariyla ve birbiriyle cakismiyor, okunur hizda;
      ek konusma yalniz agzi gorunmeyen biri icin (isim + neden)
   2. basma: ek satir yalniz kendi araliginda basiliyor, anlatim gri,
      konusma beyaz + sari isim; asil kareler (kare/) degismiyor
   3. baglanti: film_birlestir senaryonun eklerini kendiliginden buluyor
      ve altyazi_bas'a veriyor; eki olmayan sahne bos
   4. dogrulama: sahneden tasan, cakisan ve bozuk satir HATA veriyor
      (altyazi_bas satiri sessizce keserdi)                            */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const KOK = new URL("..", import.meta.url).pathname;
const gecici = mkdtempSync(join(tmpdir(), "yazi-eki-"));
const py = `
import json, sys, os, hashlib
sys.dont_write_bytecode = True
sys.path.insert(0, ${JSON.stringify(KOK + "arac")})
os.chdir(${JSON.stringify(KOK)})
import numpy as np
from PIL import Image
import film_birlestir as FB, blender_film as F, bedrock_onizleme as B
gec = sys.argv[1]
out = {}

# ---- 1. veri ----
veri = json.load(open("film/yazi_ekleri/bolum2_p1.json", encoding="utf-8"))
sahneler = sorted(k for k in veri if not k.startswith("_"))
out["sayilar"] = {k: len(veri[k]) for k in sahneler}
out["senaryo_var"] = all(os.path.exists("film/%s.json" % k) for k in sahneler)
setler = B.oku(F.HAREKET)["setler"]
sorun, hiz = [], []
for k in sahneler:
    sen = json.load(open("film/%s.json" % k, encoding="utf-8"))
    son = len(F.zaman_haritasi(sen)) / sen.get("fps", 24)
    _, _, kendi, _ = F.zaman_cizelgesi(sen, setler, F.film_pozlari(F.akici_mi(sen)))
    ek = FB.yazi_ekleri("film/%s.json" % k)
    try:
        FB.yazi_ekleri_sigiyor(kendi, ek, son, k)
    except ValueError as e:
        sorun.append(str(e))
    hiz += [round(len(y["metin"]) / y["sure"], 1) for y in ek]
out["sigiyor"] = sorun
out["hiz"] = max(hiz)
konusma = [y for k in sahneler for y in veri[k] if y["tur"] == "soyle"]
out["konusma"] = sorted({(y["isim"], bool(y.get("neden"))) for y in konusma})

# ---- 2. basma ----
kl = os.path.join(gec, "s")
os.makedirs(os.path.join(kl, "kare"))
for i in range(30):
    Image.new("RGB", (320, 180), (40, 40, 40)).save(os.path.join(kl, "kare", "%04d.png" % (i + 1)))
json.dump({"fps": 10, "kare": 30, "yazilar": [{"t": 0.2, "sure": 0.8, "metin": "Var", "tur": "soyle", "isim": "A"}]},
          open(os.path.join(kl, "yazilar.json"), "w"))
oz = lambda: [hashlib.md5(open(os.path.join(kl, "kare", f), "rb").read()).hexdigest() for f in sorted(os.listdir(os.path.join(kl, "kare")))]
once = oz()
ek = [FB.yazi_eki({"t": 1.5, "sure": 1.0, "metin": "(Ic ses)", "tur": "anlat"}, "test")]
F.altyazi_bas(kl, 1, None, ek=ek)
def bant(t):
    a = np.asarray(Image.open(os.path.join(kl, "altyazili", "%04d.png" % (int(round(t * 10)) + 1))).convert("RGB")).astype(int)
    return a[int(180 * 0.78):, :]
def acik(b):
    return int((b.max(2) > 150).sum())
out["basma"] = {"oncesi": acik(bant(1.2)), "ek": acik(bant(1.9)), "sonrasi": acik(bant(2.7)),
                "ek_tepe": int(bant(1.9).max()), "konusma_tepe": int(bant(0.6).max()),
                "sari_isim": int(((bant(0.6)[..., 0] > 200) & (bant(0.6)[..., 1] > 150) & (bant(0.6)[..., 2] < 140)).sum()),
                "kare_ayni": oz() == once}

# ---- 3. baglanti ----
kod = open("arac/film_birlestir.py", encoding="utf-8").read()
parca = kod[kod.index("def parca("): kod.index("\\ndef ", kod.index("def parca(") + 5)]
out["baglanti"] = {"orman": len(FB.yazi_ekleri("film/bolum2_p1_1_orman.json")),
                   "savas": len(FB.yazi_ekleri("film/bolum2_p1_4_savas.json")),
                   "yok": len(FB.yazi_ekleri("film/olmayan_sahne.json")),
                   "parca": "yazi_ekleri(senaryo_yolu)" in parca and "ek=ek" in parca and "yazi_ekleri_sigiyor(" in parca}

# ---- 4. dogrulama ----
def hata_mi(f):
    try:
        f()
    except ValueError:
        return True
    return False
y = lambda t, s, m="x": {"t": t, "sure": s, "metin": m, "tur": "anlat"}
out["dogrulama"] = {
    "tasan": hata_mi(lambda: FB.yazi_ekleri_sigiyor([], [y(9.0, 2.0)], 10.0, "t")),
    "sigan": not hata_mi(lambda: FB.yazi_ekleri_sigiyor([], [y(7.0, 2.0)], 10.0, "t")),
    "kendisiyle": hata_mi(lambda: FB.yazi_ekleri_sigiyor([y(1.0, 3.0)], [y(2.0, 1.0)], 10.0, "t")),
    "birbiriyle": hata_mi(lambda: FB.yazi_ekleri_sigiyor([], [y(1.0, 3.0), y(3.5, 1.0)], 10.0, "t")),
    "baslik_sayilmaz": not hata_mi(lambda: FB.yazi_ekleri_sigiyor([{"t": 0.0, "sure": 5.0, "metin": "B", "tur": "baslik"}],
                                                                   [y(1.0, 1.0)], 10.0, "t")),
    "tur": hata_mi(lambda: FB.yazi_eki({"t": 1, "metin": "x", "tur": "baslik"}, "t")),
    "isimsiz": hata_mi(lambda: FB.yazi_eki({"t": 1, "metin": "x", "tur": "soyle", "neden": "n"}, "t")),
    "nedensiz": hata_mi(lambda: FB.yazi_eki({"t": 1, "metin": "x", "tur": "soyle", "isim": "A"}, "t")),
    "bos": hata_mi(lambda: FB.yazi_eki({"t": 1, "metin": " ", "tur": "anlat"}, "t")),
    "eksi": hata_mi(lambda: FB.yazi_eki({"t": -1, "metin": "x", "tur": "anlat"}, "t")),
    "varsayilan_sure": FB.yazi_eki({"t": 1, "metin": "x" * 60, "tur": "anlat"}, "t")["sure"] == F.yazi_suresi("x" * 60)}
print(json.dumps(out, ensure_ascii=False))
`;
try {
  const r = JSON.parse(execFileSync("python3", ["-B", "-c", py, gecici], { encoding: "utf8", maxBuffer: 1 << 24 }));

  console.log("1. veri: onaylanan 14 satir (film/yazi_ekleri/bolum2_p1.json)");
  kontrol("sahne basina satirlar: orman 3, ruh 3, kulube 4, giris 4",
          JSON.stringify(r.sayilar) === JSON.stringify({ bolum2_p1_1_orman: 3, bolum2_p1_2_ruh: 3, bolum2_p1_3_kulube: 4, bolum2_p1_4b_giris: 4 }),
          JSON.stringify(r.sayilar));
  kontrol("her anahtar gercek bir senaryonun adi", r.senaryo_var);
  kontrol("her satir sahnesinin icinde; senaryonun kendi satirlariyla ve birbiriyle cakismiyor", r.sigiyor.length === 0,
          r.sigiyor.join(" | "));
  kontrol("okunur hizda (en hizli satir saniyede 20 harfi gecmiyor)", r.hiz <= 20, String(r.hiz));
  kontrol("ek konusma yalniz Pipos'ta (maske agzi ortuyor) ve her biri nedenini yaziyor",
          JSON.stringify(r.konusma) === JSON.stringify([["Pipos", true]]), JSON.stringify(r.konusma));

  console.log("2. basma");
  const b = r.basma;
  kontrol("ek satir yalniz kendi araliginda (oncesinde ve sonrasinda bant bos)", b.oncesi === 0 && b.ek > 50 && b.sonrasi === 0,
          JSON.stringify([b.oncesi, b.ek, b.sonrasi]));
  kontrol("anlatim gri (en acik ~220), konusma beyaz ve sari isimli", b.ek_tepe >= 200 && b.ek_tepe <= 230 &&
          b.konusma_tepe >= 250 && b.sari_isim > 10, JSON.stringify([b.ek_tepe, b.konusma_tepe, b.sari_isim]));
  kontrol("asil kareler (kare/) degismiyor", b.kare_ayni);

  console.log("3. baglanti");
  const g = r.baglanti;
  kontrol("film_birlestir senaryonun eklerini kendiliginden buluyor (orman 3, savas 0, olmayan 0)",
          g.orman === 3 && g.savas === 0 && g.yok === 0, JSON.stringify(g));
  kontrol("parca() ekleri dogrulayip altyazi_bas'a veriyor", g.parca);

  console.log("4. dogrulama: sessizce kesilecek satir HATA");
  const d = r.dogrulama;
  kontrol("sahne bitince kesilecek satir hata, sigan satir gecer", d.tasan && d.sigan);
  kontrol("cizimin satiriyla ya da baska bir ekle cakisan satir hata; baslik karti sayilmaz",
          d.kendisiyle && d.birbiriyle && d.baslik_sayilmaz);
  kontrol("bozuk satir hata: tur, isimsiz/nedensiz konusma, bos metin, eksi zaman",
          d.tur && d.isimsiz && d.nedensiz && d.bos && d.eksi);
  kontrol("sure yazilmazsa okuma suresi (yazi_suresi)", d.varsayilan_sure);
} finally {
  rmSync(gecici, { recursive: true, force: true });
}
console.log(hata ? "\n>>> SORUN VAR" : "\n>>> yazi ekleri: onaylanan satirlar yerinde, yalniz altyaziya giriyor");
process.exit(hata ? 1 : 0);
