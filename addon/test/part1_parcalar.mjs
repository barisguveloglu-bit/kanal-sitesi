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
      kilidi), "akici": true, toplam sure hedefte (<= 73,7 sn).
   9. Altyazi: sigmayan iki satir, konusmalar ust uste binmez.
   10. Poz devri: ayni anda biten ve baslayan iki poz arasinda taban
       (ayakta durus) gorunmez -- Baris dogrulurken bir an kalkmaz.
   11. "bak_bas": bas bir noktaya doner (yerde yatanin yuzu); orman
       sahnesinde cadi Baris'in gozune (POV kamerasi) bakar.
   12. Cadi gecide obsidyenin ustunden girer, isinlanmadan once cercevede
       mor yuzun ONUNDE durur (inis kaymasi arkaya gecirmez). */
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

console.log("\n=== 10. POZ DEVRI: AYNI ANDA BITEN VE BASLAYAN POZ ARASINDA TABAN GORUNMEZ ===");
{
  // onizleme denetimi (kullanici): "Baris kalkarken saliselik kalkiyor sonra
  // geri yatmis gibi gorunuyor". "dus" sonerken "dogrul" giriyordu; ikisi
  // tabanin ustune yarim yarim karisinca arada ayakta durus one cikti.
  // Olcu: poz katmanlari sirayla tabanin ustune karisiyor, tabanin kalan
  // payi = carpim (1 - w). Devir boyunca 0 olmali.
  const r = py(`
import blender_film as F, bedrock_onizleme as B
setler = B.oku(F.HAREKET)["setler"]
anims = {}
anims.update(B.oku(F.ANIM_WOM)["animations"]); anims.update(B.oku(F.ANIM_AKTOR)["animations"])
anims.update(F.film_pozlari(True))
kem = ["root", "waist", "body", "head", "rightArm", "leftArm", "rightLeg", "leftLeg"]
def olc(bitir_once, akici=True):
    bit = {"t": 1.0, "aktor": "b", "poz_bitir": "dus"}
    yeni = {"t": 1.0, "aktor": "b", "poz": "dogrul", "tut": True}
    sen = {"fps": 30, "sure": 2.0, "akici": akici,
           "aktorler": {"b": {"skin": "x.png", "konum": [0, 0], "bak": 0}},
           "olaylar": [{"t": 0.0, "aktor": "b", "poz": "dus", "atla": 0.7, "tut": True}] + ([bit, yeni] if bitir_once else [yeni, bit]),
           "kamera": [{"t": 0, "aci": "genis", "a": "b"}]}
    ak, *_ = F.zaman_cizelgesi(sen, setler, anims)
    a = ak["b"]
    taban, son = 0.0, {}
    for k in a.kayit:
        _, kat = F.kare_pozu(a, k, kem, anims, setler)
        ws = {ad.split(".")[-1]: w for ad, _, w in kat if ad.startswith(F.film_poz.ONEK)}
        p = 1.0
        for w in ws.values():
            p *= (1.0 - w)
        if 0.9 <= k["t"] <= 1.6:
            taban = max(taban, p)
        son = ws
    return {"taban": taban, "dogrul": son.get("dogrul", 0.0), "dus": son.get("dus", 0.0)}
print(json.dumps({"bitir_once": olc(True), "poz_once": olc(False), "eski": olc(True, False)}))`);
  for (const [ad, x] of [["poz_bitir once yazilmis", r.bitir_once], ["poz once yazilmis", r.poz_once]]) {
    kontrol("devirde taban gorunmuyor (" + ad + ")", x.taban < 0.01, x.taban.toFixed(4));
    kontrol("devirden sonra yalniz yeni poz kalir (" + ad + ")", x.dogrul > 0.999 && x.dus < 1e-6,
            "dogrul " + x.dogrul.toFixed(3) + ", dus " + x.dus.toFixed(3));
  }
  kontrol("akici: false eski karisim (olcu isiriyor: taban gorunuyordu)", r.eski.taban > 0.2, r.eski.taban.toFixed(3));
}

console.log("\n=== 11. ELLE BAKIS NOKTASI: CADI YERDE YATANIN YUZUNE BAKAR ===");
{
  // onizleme denetimi (kullanici): POV'da "cadinin surati hep bir yone
  // bakiyor". Bas en yakin aktorun KOKUNE, ayakta goz hizasinda bakiyordu:
  // yerde yatan Baris'in ayaklarinin ustundeki bosluga. "bak_bas": [x, y, z]
  // basi o noktaya (Baris'in gozu = POV kamerasi) cevirir.
  const r = py(`
import blender_film as F, bedrock_onizleme as B, hareket as H
setler = B.oku(F.HAREKET)["setler"]
def olc(kip):
    ol = [{"t": 0.0, "aktor": "b", "poz": "bayil", "tut": True, "atla": 3.0}]
    if kip != "yok":
        ol.append({"t": 0.2, "aktor": "c", "bak_bas": [-0.3, 5.35, 0.45]})
    if kip == "geri":
        ol.append({"t": 1.5, "aktor": "c", "bak_bas": None})
    sen = {"fps": 30, "sure": 3.0, "akici": True,
           "aktorler": {"b": {"skin": "x.png", "konum": [0.55, 6.934], "bak": [5.0, 6.934]},
                        "c": {"skin": "y.png", "konum": [1.05, 4.7], "bak": [-0.35, 5.3]}},
           "olaylar": ol, "kamera": [{"t": 0, "aci": "genis", "a": "c"}]}
    ak, *_ = F.zaman_cizelgesi(sen, setler, F.film_pozlari(True))
    c = ak["c"].kayit
    return {"bas": c[int(1.4 * 30)]["bas"], "son": c[-1]["bas"]}
yaw, pitch = H.bas_takibi([1.05, 4.7], F.yon_aci([1.05, 4.7], [-0.35, 5.3]), F.BAS_YUKSEK, [-0.3, 5.35], 0.45,
                          pitch_siniri=90)
p = json.load(open(sys.argv[1] + "/../film/bolum2_p1_1_orman.json"))
bb = [o for o in p["olaylar"] if "bak_bas" in o]
print(json.dumps({"elle": olc("elle"), "yok": olc("yok"), "geri": olc("geri"), "yaw": yaw, "pitch": pitch,
                  "BAS_PITCH": H.BAS_PITCH, "ELLE": H.BAS_PITCH_ELLE, "orman": bb}))`);
  kontrol("bas noktaya doner: asagi egim hesaplanan aciya oturur", Math.abs(r.elle.bas[1] - r.pitch) < 0.5 && Math.abs(r.elle.bas[0] - r.yaw) < 0.5,
          r.elle.bas.map((x) => x.toFixed(1)).join(", ") + " / beklenen " + r.yaw.toFixed(1) + ", " + r.pitch.toFixed(1));
  kontrol("yerdeki yuz icin egim olagan sinirin otesinde, elle sinirin icinde",
          r.pitch > r.BAS_PITCH && r.pitch < r.ELLE, r.pitch.toFixed(1) + " (olagan " + r.BAS_PITCH + ", elle " + r.ELLE + ")");
  kontrol("yazilmazsa eski davranis: bas yatanin kokune, egim yok (olcu isiriyor)",
          Math.abs(r.yok.bas[1]) < 0.5 && Math.abs(r.yok.bas[0]) > 30, r.yok.bas.map((x) => x.toFixed(1)).join(", "));
  kontrol("\"bak_bas\": null olagan takibe dondurur", Math.abs(r.geri.son[0] - r.yok.son[0]) < 0.5 && Math.abs(r.geri.son[1]) < 0.5,
          r.geri.son.map((x) => x.toFixed(1)).join(", "));
  kontrol("orman sahnesinde cadi POV kamerasina (Baris'in gozu) bakiyor",
          r.orman.length === 1 && JSON.stringify(r.orman[0].bak_bas) === "[-0.3,5.35,0.45]" && r.orman[0].aktor === "c");
}

console.log("\n=== 12. CADI GECIDE OBSIDYENIN USTUNDEN GIRER, ISINLANMADAN ONCE CERCEVEDE DURUR ===");
{
  // onizleme denetimi (kullanici): "portala girerken hemen yanindan giriyor
  // ... ilk once portalin obsidyen yerine cikmasi lazim sonra da isinlanir".
  // Sonra ikinci hata olculdu: inis kaymasi cadiyi 0,3 blok ileri tasiyip
  // gecidin mor yuzunun ARKASINA geciriyordu (x -19,79), parlamadan once
  // gozden kayboluyordu. Olcu gecidin kendi bilgisinden (kulube._gecit).
  const r = py(`
import blender_film as F, bedrock_onizleme as B, kulube as K
_, bilgi = K.bataklik()
g = bilgi["gecit"]
duzlem = g["cerceve"][0][0] + 0.5                     # gecit blogunun ortasi (4 px kalin dilim)
ic_y = sorted([-g["ic"][0][2], -(g["ic"][1][2] + 1)])  # Minecraft z -> film -y
taban = g["cerceve"][0][1] + 1                          # alt obsidyenin ustu
s = json.load(open(sys.argv[1] + "/../film/bolum2_p1_2_ruh.json"))
ak, *_ = F.zaman_cizelgesi(s, B.oku(F.HAREKET)["setler"], F.film_pozlari(True))
c = ak["c"].kayit
gizle = next(o["t"] for o in s["olaylar"] if o.get("aktor") == "c" and o.get("gizle"))
k_once = [k for k in c if k["t"] < gizle - 1e-6]
son = k_once[-1]
# cercevede ayakta: obsidyenin ustunde, ic genislikte, dilime degiyor ama mor yuzun onunde
icinde = [k for k in k_once if abs(k["z"] - taban) < 1e-6 and ic_y[0] + 0.3 <= k["y"] <= ic_y[1] - 0.3
          and k["x"] - 0.3 < duzlem + 0.125 and k["x"] > duzlem]
kenar = [k["z"] for k in c if k["t"] < gizle and k["x"] - 0.3 < duzlem + 0.5 and k["z"] < taban - 1e-6]
print(json.dumps({"son": [son["x"], son["y"], son["z"]], "duzlem": duzlem, "ic_y": ic_y, "taban": taban,
                  "durus": len(icinde) / s["fps"], "kenar": kenar, "gorunur": son["gorunur"],
                  "sonra": [k["gorunur"] for k in c if k["t"] > gizle + 0.05][:1]}))`);
  kontrol("isinlanmadan once obsidyenin USTUNDE, cercevenin icinde", Math.abs(r.son[2] - r.taban) < 1e-6 &&
          r.son[1] >= r.ic_y[0] + 0.3 && r.son[1] <= r.ic_y[1] - 0.3, r.son.map((x) => x.toFixed(3)).join(", "));
  kontrol("gecit dilimine degiyor (Minecraft'ta gecide girmis sayilir)", r.son[0] - 0.3 < r.duzlem + 0.125,
          "on yuz " + (r.son[0] - 0.3).toFixed(3) + " < " + (r.duzlem + 0.125).toFixed(3));
  kontrol("mor yuzun arkasina gecmiyor (govdesi gorunur kalir)", r.son[0] > r.duzlem, r.son[0].toFixed(3) + " > " + r.duzlem);
  kontrol("parlamadan once en az 0,4 sn cercevede duruyor", r.durus >= 0.4, r.durus.toFixed(2) + " sn");
  kontrol("obsidyenin kenarina girmeden ustune cikiyor", r.kenar.length === 0, r.kenar.length + " kare");
  kontrol("parlamayla gizleniyor", r.gorunur === true && r.sonra[0] === false);
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> Part 1 parcalari: kararma, bulaniklik, kar, sancak, harita, savas odasi tutarli");
process.exit(hata ? 1 : 0);
