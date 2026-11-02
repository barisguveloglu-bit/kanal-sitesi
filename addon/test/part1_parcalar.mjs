/* 2. BOLUM PART 1'IN FILM PARCALARI                              v7.99.16

   Part 1'in bes senaryosu (addon/film/bolum2_p1_*.json) ve onlar icin
   film aracina eklenenler: cadinin el feneri, Baris'in gozunden bulanik
   goruntu, kararma (goz kapanmasi), seyrek kar, savas odasi (kalenin
   zemin kati), sancak ve savas haritasi. Blender gerekmiyor.

   ---- BU DOSYANIN TUTTUGU SEY ----
   1. Kararma: aralikta 0..1, ortada tam siyah, aralik disinda hic yok;
      giris 0 ise ilk karede tam.
   2. Bulaniklik: aralikta odak yakina ceker, disinda yok.
   3. Kar: tane alanin icinde kalir, zamanla duser, tepeye donup surer
      (sonsuz), ruzgarla bati yonune kayar, ayni tohum ayni kar.
   4. Sancak: 20 x 40 kumas (Minecraft sancagi), "Surda Safak": ust yari
      kirmizi, gunes UFKUN USTUNDE yarim daire, alt yari gri.
   5. Savas haritasi: boyut, cerceve, bizim kirmizi isaret karada.
   6. Savas odasi yalniz kalenin ICINDE: hanedanin geri kalani bire bir
      ayni (onaylanmis tasarim degismez).
   7. Fener esyasi gorunurluk anahtari ilk karede de yaziliyor.
   8. Part 1'in bes senaryosu: 30 fps, 1920x1080, 4096 ornek (kalite
      kilidi), "akici": true, toplam sure hedefte (<= 73,7 sn). */
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const BURADA = dirname(fileURLToPath(import.meta.url));
const ARAC = join(BURADA, "..", "arac");
const FILM = join(BURADA, "..", "film");
const ORTAM = { ...process.env, PYTHONDONTWRITEBYTECODE: "1" };
let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const py = (kod) => JSON.parse(execFileSync("python3", ["-c",
  "import sys, json, math\nsys.dont_write_bytecode = True\nsys.path.insert(0, sys.argv[1])\n" + kod, ARAC],
  { encoding: "utf8", env: ORTAM, maxBuffer: 1 << 26 }));

console.log("=== 1-2. KARARMA VE BULANIKLIK ===");
{
  const r = py(`
import blender_film as F
h = [i / 30.0 for i in range(30 * 12)]
k = F.kararma_karaleri({"kararma": [{"t": [3.4, 4.4], "giris": 0.0, "cikis": 1.0},
                                    {"t": [8.7, 10.5], "giris": 0.9, "cikis": 0.0}]}, h, len(h))
b = F.bulaniklik_karaleri({"bulaniklik": [{"t": [3.5, 10.5], "fstop": 0.8, "mesafe": 0.45, "gecis": 0.0}]}, h, len(h))
print(json.dumps({"ilk": k.get(int(3.4 * 30) + 1, 0), "acilmis": k.get(int(4.5 * 30), 0),
                  "acilirken": k.get(int(4.2 * 30), 0),
                  "sonda": k.get(int(10.0 * 30), 0), "disari": [f for f in k if not (3.4 <= h[f] <= 4.4 or 8.7 <= h[f] <= 10.5)],
                  "bos": len(F.kararma_karaleri({}, h, len(h))),
                  "b_ic": b.get(int(6 * 30)), "b_dis": b.get(int(2 * 30)), "b_bos": len(F.bulaniklik_karaleri({}, h, len(h)))}))`);
  kontrol("kararma giris 0: aralik basinda tam siyah", r.ilk > 0.99, String(r.ilk));
  kontrol("kararma cikista acilir (4,2 sn'de yari acik, aralik sonrasi 0)", r.acilmis === 0 && r.acilirken > 0 && r.acilirken < 0.5,
          r.acilirken.toFixed(3) + " -> " + r.acilmis);
  kontrol("goz kapanir: sonda tam siyah", r.sonda > 0.99, String(r.sonda));
  kontrol("kararma aralik disina tasmiyor; yazilmazsa hic yok", r.disari.length === 0 && r.bos === 0);
  kontrol("bulaniklik aralikta: odak 0,45 m, f/0,8", r.b_ic && r.b_ic[0] === 1 && r.b_ic[1] === 0.8 && r.b_ic[2] === 0.45,
          JSON.stringify(r.b_ic));
  kontrol("bulaniklik disinda yok; yazilmazsa hic yok", r.b_dis === null && r.b_bos === 0);
}

console.log("\n=== 3. SEYREK KAR ===");
{
  const r = py(`
import blender_film as F
kar = {"merkez": [1.5, 9.0], "alan": 9.0, "sayi": 50, "hiz": 0.7, "ruzgar": [-0.35, 0.0], "taban": 0.0, "yukseklik": 8.0, "tohum": 3}
icinde, dusus, x_kay = True, 0, 0
for i in range(50):
    for t in [j / 10.0 for j in range(0, 200)]:
        x, y, z = F.kar_yolu(kar, i, t)
        if not (1.5 - 9 <= x <= 1.5 + 9 and 0 <= y <= 18 and 0 <= z <= 8.0 + 1e-9):
            icinde = False
    a, b = F.kar_yolu(kar, i, 1.0), F.kar_yolu(kar, i, 1.5)
    if b[2] < a[2]: dusus += 1
uzun = [F.kar_yolu(kar, 7, t / 10.0)[2] for t in range(0, 400)]
donus = any(uzun[j + 1] > uzun[j] + 4 for j in range(len(uzun) - 1))
ayni = F.kar_yolu(kar, 5, 2.3) == F.kar_yolu(dict(kar), 5, 2.3)
# ruzgar: tanelerin 0,5 sn'deki yatay kaymasinin ORTANCASI (ortalama degil:
# kenardan karsi kenara donen tane 18 blok sicrar ve ortalamayi bozar)
dxs = sorted(F.kar_yolu(kar, i, 0.6)[0] - F.kar_yolu(kar, i, 0.1)[0] for i in range(50))
dx = dxs[len(dxs) // 2]
print(json.dumps({"icinde": icinde, "dusus": dusus, "donus": donus, "ayni": ayni, "dx": dx}))`);
  kontrol("taneler alanin icinde kaliyor (20 sn)", r.icinde);
  kontrol("taneler dusuyor (1,0 -> 1,5 sn; tepeye donen birkaci haric)", r.dusus >= 45, r.dusus + "/50");
  kontrol("tane yere inince tepeden yeniden basliyor (sonsuz kar)", r.donus);
  kontrol("ayni tohum ayni kar", r.ayni);
  kontrol("ruzgar bati yonune (dogudan gelen soguk)", r.dx < -0.1, r.dx.toFixed(3));
}

console.log("\n=== 4-5. SANCAK VE SAVAS HARITASI ===");
{
  const r = py(`
import blender_film as F
s = F.sancak_pikselleri("surda_safak")
K, S, G = F.BOYA["kirmizi"], F.BOYA["sari"], F.BOYA["gri"]
ust = all(c in (K, S) for row in s[:20] for c in row)
alt = all(c == G for row in s[20:] for c in row)
sari = [(x, y) for y, row in enumerate(s) for x, c in enumerate(row) if c == S]
h = F.harita_pikselleri()
gen, yuk = len(h[0]), len(h)
u, v = F.HARITA_ISARET[0][0]
biz = h[int(v * yuk)][int(u * gen)]
cerceve = all(h[0][x] == h[yuk - 1][x] for x in range(gen))
print(json.dumps({"boyut": [len(s[0]), len(s)], "ust": ust, "alt": alt, "sari_alt": max(y for x, y in sari),
                  "sari_ust": min(y for x, y in sari), "sari_say": len(sari), "h": [gen, yuk],
                  "biz": list(biz), "kirmizi": list(K), "cerceve": cerceve}))`);
  kontrol("sancak 20 x 40 (Minecraft sancagi)", r.boyut[0] === 20 && r.boyut[1] === 40, JSON.stringify(r.boyut));
  kontrol("ust yari kirmizi ve gunes, alt yari tamamen gri (sur)", r.ust && r.alt);
  kontrol("gunes ufkun ustunde yarim daire (sari yalniz 15-19. satirda)", r.sari_alt === 19 && r.sari_ust >= 13 && r.sari_say > 20,
          r.sari_ust + "-" + r.sari_alt + ", " + r.sari_say + " px");
  kontrol("savas haritasi 160 x 96, cerceveli", r.h[0] === 160 && r.h[1] === 96 && r.cerceve);
  kontrol("haritada bizim hanedanin kirmizi isareti", JSON.stringify(r.biz) === JSON.stringify(r.kirmizi));
}

console.log("\n=== 6. SAVAS ODASI YALNIZ KALENIN ICINDE ===");
{
  const r = py(`
import hanedan
d = hanedan.Dunya()
oda = hanedan.savas_odasi(d)
G = 6
y0 = hanedan.TEPE_YUKSEKLIK + 1
dis = [q["p"] for q in d.bloklar() if not (abs(q["p"][0]) < G and abs(q["p"][2]) < G and y0 <= q["p"][1] <= y0 + 3)]
b, bilgi = hanedan.hanedan()
kapi = [q for q in b if tuple(q["p"]) in (tuple(oda["kapi"]),)]
print(json.dumps({"dis": dis, "n": len(d.bloklar()), "bilgi": "savas_odasi" in bilgi,
                  "sancak": len(bilgi["savas_odasi"]["sancaklar"]), "kapi_acik": bool(kapi and kapi[0].get("s", {}).get("open_bit"))}))`);
  kontrol("savas odasinin her blogu kalenin ic duvarlarinin icinde", r.dis.length === 0 && r.n > 50, r.n + " blok, disarida " + r.dis.length);
  kontrol("hanedan bilgisi savas odasini tasiyor, iki sancak", r.bilgi && r.sancak === 2);
  kontrol("savas odasinin kapisi acik (asker acik kapiya vurup girer)", r.kapi_acik);
}

console.log("\n=== 7. FENER ESYASI ===");
{
  const r = py(`
import blender_film as F
kayit = [{"esya": None}] * 3 + [{"esya": "fener"}] * 4 + [{"esya": None}]
print(json.dumps(F.esya_anahtarlari(kayit, esya="fener")))`);
  kontrol("fener: ilk karede anahtar (kapali), sonra acilir ve kapanir",
          JSON.stringify(r) === JSON.stringify([[1, false], [4, true], [8, false]]), JSON.stringify(r));
}

console.log("\n=== 8. PART 1'IN BES SENARYOSU ===");
{
  const adlar = readdirSync(FILM).filter((a) => a.startsWith("bolum2_p1_") && a.endsWith(".json")).sort();
  let sure = 0;
  const kotu = [];
  for (const a of adlar) {
    const d = JSON.parse(readFileSync(join(FILM, a), "utf8"));
    sure += d.sure;
    if (!(d.fps === 30 && d.cozunurluk[0] === 1920 && d.cozunurluk[1] === 1080 && d.ornek === 4096 && d.akici === true)) kotu.push(a);
  }
  kontrol("bes senaryo", adlar.length === 5, adlar.join(" "));
  kontrol("hepsi 30 fps, 1920x1080, 4096 ornek, akici", kotu.length === 0, kotu.join(" "));
  kontrol("toplam sure hedefte (50-73,7 sn)", sure >= 50 && sure <= 73.7, sure.toFixed(1) + " sn");
}

console.log("\n=== 9. ALTYAZI: SIGMAYAN IKI SATIR, KONUSMALAR UST USTE BINMEZ ===");
{
  // onizleme denetimi: askerin 103 harflik cumlesi ekrana sigmiyordu ve
  // suresi Omer'in "Tamam."ina tasiyip ayni satira ust uste basildi
  const r = py(`
import blender_film as F, tempfile, os
from PIL import Image
olc = lambda m: len(m) * 12.0
uzun = F.altyazi_satirlari("Asker: ", "Efendim, Doğu bölgesinden çok büyük buz dalgaları hissediyoruz. Hanedanımızın büyücüleri öyle hissetti.", olc, 864)
kisa = F.altyazi_satirlari("Ömer: ", "Tamam.", olc, 864)
# ust uste binme: iki konusma, ilkinin suresi ikincinin icine tasiyor
d = tempfile.mkdtemp(); os.makedirs(os.path.join(d, "kare"))
for f in range(1, 31):
    Image.new("RGB", (320, 180), (20, 60, 30)).save(os.path.join(d, "kare", "%04d.png" % f))
json.dump({"fps": 10, "kare": 30, "yazilar": [
    {"t": 0.0, "sure": 2.5, "metin": "Birinci", "tur": "soyle", "isim": "A"},
    {"t": 1.0, "sure": 1.5, "metin": "İkinci", "tur": "soyle", "isim": "B"}]}, open(os.path.join(d, "yazilar.json"), "w"))
F.altyazi_bas(d)
# ayni kareler, yalniz ikinci konusmayla
d2 = tempfile.mkdtemp(); os.makedirs(os.path.join(d2, "kare"))
for f in range(1, 31):
    Image.new("RGB", (320, 180), (20, 60, 30)).save(os.path.join(d2, "kare", "%04d.png" % f))
json.dump({"fps": 10, "kare": 30, "yazilar": [{"t": 1.0, "sure": 1.5, "metin": "İkinci", "tur": "soyle", "isim": "B"}]},
          open(os.path.join(d2, "yazilar.json"), "w"))
F.altyazi_bas(d2)
px = lambda k, f: Image.open(os.path.join(k, "altyazili", "%04d.png" % f)).convert("L").tobytes()
# ikinci konusma 1,0 sn'de basliyor: 1,3 sn'deki kare (14) yalniz ikinciyi
# tasimali -- iki konusmali cizim, yalniz ikinciyle cizime bire bir esit
print(json.dumps({"uzun": [list(x) for x in uzun], "kisa": [list(x) for x in kisa],
                  "tek14": px(d, 14) == px(d2, 14), "ilk5_dolu": px(d, 5) != px(d2, 5),
                  "olc_sig": max(olc(a + b) for a, b in uzun) <= 864}))`);
  kontrol("sigmayan altyazi iki satir, isim ilk satirda, iki satir da sigiyor",
          r.uzun.length === 2 && r.uzun[0][0] === "Asker: " && r.uzun[1][0] === "" && r.olc_sig, JSON.stringify(r.uzun.map((x) => x[1].length)));
  kontrol("sigan altyazi tek satir (1. bolum degismez)", r.kisa.length === 1);
  kontrol("onceki konusma sonrakinin basinda biter: o anda yalniz yeni konusma var", r.tek14 && r.ilk5_dolu);
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> Part 1 parcalari: kararma, bulaniklik, kar, sancak, harita, savas odasi tutarli");
process.exit(hata ? 1 : 0);
