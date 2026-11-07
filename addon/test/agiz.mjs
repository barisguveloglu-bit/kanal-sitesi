/* AGIZ VE BOYNUZ -- arac/agiz.py + blender_film                  v7.99.16

   Kullanici (2026-11-02): dokuyla yapilan agiz (ifade kareye gore ANINDA
   degisir) ve kuplerden boynuz; "2. bolumun Part 2'sinde bu sisteme
   gecelim". Blender gerekmiyor.

   ---- BU DOSYANIN TUTTUGU SEY ----
   1. Dudak senkronu (altyazi metninden): M/B/P kapali (A), A genis (D),
      O yuvarlak (E), E/I disli; son sekil X (susma); hicbir sekil 2
      kareden kisa degil (kullanici: "2-3 karede bir degisim yeterli").
   2. Konusma altyazinin suresine ve bir sonraki konusmanin basina sigiyor
      (askerin cumlesi Omer'in "Tamam"inin ustune tasiyordu); ifade
      konusmadan sonra geri geliyor.
   3. Agiz hucresi: X tamamen saydam (skinin kendi yuzu); obur sekiller
      yalniz agiz satirlarina ve 1-6. sutunlara dokunur; on bir sekil
      birbirinden farkli. Zisa'da agiz yalniz 7. satir (gozleri 6'da).
   4. Kullanicinin cizdigi agiz resmi hucre hucre okunuyor.
   5. Boynuz: iki yan ayna simetrik; seytan yukari cikip sivriliyor,
      keci geriye gidip kafanin ustunden asagi iniyor; hicbir parca
      kafanin icinde degil.
   6. Kapsam (kullanici 2026-11-07: "herkes altyazıyla senkron, Part 1'de
      de olsun"): 2. bolum Part 1'in alti senaryosunun hepsinde "agiz";
      1. bolumde yok (yeniden cizilmez); boynuz henuz hicbirinde yok (kimde
      olacagi acik soru). Konusan aktorun agzi sapka katmaninin arkasinda
      kalmiyor (Pipos'un altin maskesi agiz bolgesini kapliyor).
      Konusma Thomas Rig Legacy'nin 3B agziyla (kullanici 2026-11-07:
      "Thomas Rig Legacy ile yapacaksin bu isi"): her konusma ani bir
      goz="thomas" planinin icinde, konusanin Thomas kafasi var ve goz
      rengi uydurulmadi, skinin kendi yuz pikselinden (dogrusal).
   7. Thomas Rig Legacy'nin 3B agzi (kullanici: "onda agiz da var"): her
      sekle olculen sinirlar icinde kontrol degeri; disler ve dil yalniz
      agiz acikken; Thomas planlarinda doku agzi gizli. */
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

console.log("=== 1-2. DUDAK SENKRONU ===");
{
  const r = py(`
import agiz as A, blender_film as F
ilk = lambda m: A.dudak(m, 0.0)[0][1]
d = A.dudak("Efendim, Doğu bölgesinden çok büyük buz dalgaları hissediyoruz.", 0.0)
kisa = min(b[0] - a[0] for a, b in zip(d, d[1:]))
sen = json.load(open(${JSON.stringify(join(FILM, "bolum2_p1_4_savas.json"))}))
s = A.agiz_cizelgesi(sen["olaylar"], "s", 30, F.yazi_suresi)
o_bas = [x["t"] for x in sen["olaylar"] if x.get("aktor") == "o" and x.get("soyle")][0]
ifade = A.agiz_cizelgesi([{"t": 1, "aktor": "o", "agiz": "gulumse"}, {"t": 2, "aktor": "o", "soyle": "Tamam."}], "o")
print(json.dumps({"m": ilk("mm"), "b": ilk("bb"), "a": ilk("aa"), "o": ilk("oo"), "u": ilk("uu"), "f": ilk("ff"),
                  "son": d[-1][1], "kisa": kisa, "s_son": s[-1][0], "o_bas": o_bas,
                  "ifade_son": ifade[-1][1], "ifade_ilk": ifade[0][1]}))`);
  kontrol("M/B kapali (A), A genis (D), O yuvarlak (E), U buzuk (F), F disler dudakta (G)",
          r.m === "A" && r.b === "A" && r.a === "D" && r.o === "E" && r.u === "F" && r.f === "G",
          [r.m, r.b, r.a, r.o, r.u, r.f].join(" "));
  kontrol("konusma susmayla (X) bitiyor", r.son === "X");
  kontrol("hicbir sekil 2 kareden kisa degil", r.kisa >= 2 / 30 - 1e-9, (r.kisa * 30).toFixed(2) + " kare");
  kontrol("askerin konusmasi Omer'in sozunden once bitiyor", r.s_son < r.o_bas, r.s_son.toFixed(2) + " < " + r.o_bas);
  kontrol("konusmadan sonra ifade (gulumse) geri geliyor", r.ifade_ilk === "gulumse" && r.ifade_son === "gulumse");
}

console.log("\n=== 3-4. AGIZ HUCRESI ===");
{
  const r = py(`
import agiz as A
from PIL import Image
def yuz(yol):
    im = Image.open(yol).convert("RGBA")
    return [[im.getpixel((8 + c, 8 + r)) for c in range(8)] for r in range(8)]
ys = yuz("../kaynak_doku/aktor/omer.png")
x = A.agiz_hucresi(ys, "X", 6)
sekil = {s: A.agiz_hucresi(ys, s, 6) for s in A.SEKILLER}
disari = [s for s, h in sekil.items() for r in range(2) for c in (0, 7) if h[r][c][3]]
farkli = len({json.dumps(h) for h in sekil.values()})
zs = A.agiz_hucresi(yuz("../kaynak_doku/aktor/zisa.png"), "D", A.agiz_satiri("kaynak_doku/aktor/zisa.png"))
# kullanicinin agiz resmi: 11 hucre yan yana, D hucresi kirmizi
atlas = [[(255, 0, 0, 255) if 8 * 3 <= c < 8 * 4 else (0, 0, 0, 0) for c in range(8 * len(A.SEKILLER))] for r in range(2)]
print(json.dumps({"x_saydam": all(p[3] == 0 for r in x for p in r), "disari": disari, "farkli": farkli,
                  "zisa_satir": len(zs), "zisa_ayar": A.agiz_satiri("x/zisa.png"), "varsayilan": A.agiz_satiri("x/omer.png"),
                  "atlas_d": A.atlas_hucresi(atlas, "D", 2)[0][0], "atlas_a": A.atlas_hucresi(atlas, "A", 2)[0][0]}))`);
  kontrol("X (dinlenme) tamamen saydam: skinin kendi yuzu", r.x_saydam);
  kontrol("sekiller yalniz 1-6. sutunlara dokunuyor", r.disari.length === 0, r.disari.join(" "));
  kontrol("on bir sekil birbirinden farkli", r.farkli === 11, String(r.farkli));
  kontrol("Zisa'da agiz yalniz 7. satir (gozleri 6'da); varsayilan 6-7", r.zisa_satir === 1 && r.zisa_ayar === 7 && r.varsayilan === 6);
  kontrol("kullanicinin cizdigi agiz resmi hucre hucre okunuyor",
          JSON.stringify(r.atlas_d) === "[255,0,0,255]" && r.atlas_a[3] === 0);
}

console.log("\n=== 5. BOYNUZ ===");
{
  const r = py(`
import agiz as A
out = {}
for tur in ("seytan", "keci"):
    p = A.boynuz_parcalari(tur)
    n = len(p) // 2
    sag, sol = p[:n], p[n:]
    ayna = all(abs(a["merkez"][0] + b["merkez"][0]) < 1e-9 and a["merkez"][1:] == b["merkez"][1:] for a, b in zip(sag, sol))
    ic = [q for q in p if abs(q["merkez"][0]) < 4 + q["kenar"] / 2 - 1e-9 and 24 < q["merkez"][1] < 32 and abs(q["merkez"][2]) < 4]
    out[tur] = {"n": n, "ayna": ayna, "ic": len(ic), "y": [q["merkez"][1] for q in sag], "z": [q["merkez"][2] for q in sag],
                "kenar": [q["kenar"] for q in sag]}
print(json.dumps(out))`);
  const s = r.seytan, k = r.keci;
  kontrol("iki yan ayna simetrik (seytan, keci)", s.ayna && k.ayna);
  kontrol("seytan: yukari cikiyor ve sivriliyor (5 kademe)",
          s.n === 5 && s.y.every((y, i) => i === 0 || y > s.y[i - 1]) && s.kenar.every((x, i) => i === 0 || x < s.kenar[i - 1]),
          JSON.stringify(s.y));
  kontrol("keci: geriye gidip kafanin ustunden asagi iniyor, daha cok parca",
          k.n > s.n && Math.max(...k.z) > 4 && k.y[k.y.length - 1] < 32, "z en cok " + Math.max(...k.z) + ", son y " + k.y[k.y.length - 1]);
  kontrol("hicbir boynuz parcasi kafanin icinde degil", s.ic === 0 && k.ic === 0, s.ic + " / " + k.ic);
}

console.log("\n=== 7. THOMAS RIG LEGACY'NIN 3B AGZI ===");
{
  // kullanici: "Thomas Rig Legacy kullan, onda agiz da var" -- goz: "thomas"
  // planlarinda iskeletin kendi agzi konusur (olculen kontroller)
  const r = py(`
import agiz as A
S = A.THOMAS_SINIR
sinir_disi, eksik = [], [s for s in A.SEKILLER + ["X"] if s not in A.THOMAS_AGIZ]
for s, a in A.THOMAS_AGIZ.items():
    x, y = a.get("konum", (0, 0))
    if not (S["x"][0] <= x <= S["x"][1] and S["y"][0] <= y <= S["y"][1]): sinir_disi.append(s)
    for k in ("yuvarlak", "yumusak", "kare", "dis"):
        if not (S["surgu"][0] <= a.get(k, 0) <= S["surgu"][1]): sinir_disi.append(s + ":" + k)
d = {s: A.thomas_degerleri(s) for s in A.THOMAS_AGIZ}
y = lambda s: d[s][A.THOMAS_KONTROL]["location"][1]
x = lambda s: d[s][A.THOMAS_KONTROL]["location"][0]
z = lambda s: d[s][A.THOMAS_KONTROL]["rotation_euler"][2]
print(json.dumps({"eksik": eksik, "sinir_disi": sinir_disi, "acik": [y("C"), y("D"), y("kahkaha")], "kapali": [y("X"), y("A")],
                  "buzuk_x": x("F"), "gul": [z("gulumse"), y("gulumse"), z("sirit"), z("kahkaha")],
                  "surgu_hep": all(set(v) >= set(A.THOMAS_SURGU.values()) | {A.THOMAS_KONTROL} for v in d.values())}))`);
  kontrol("her sekil (X dahil) icin Thomas kontrol degeri var", r.eksik.length === 0, r.eksik.join(" "));
  kontrol("degerler olculen sinirlarin icinde (iskeletin LIMIT_LOCATION'i)", r.sinir_disi.length === 0, r.sinir_disi.join(" "));
  kontrol("acik sekiller (C, D, kahkaha) agzi acar; X ve A kapali",
          r.acik.every((v) => v <= -0.1) && r.kapali.every((v) => v >= 0), JSON.stringify(r.acik) + " / " + JSON.stringify(r.kapali));
  kontrol("F (U) buzuk: kontrol en solda", Math.abs(r.buzuk_x + 0.1648) < 1e-9, String(r.buzuk_x));
  kontrol("gulumse/sirit/kahkaha koseleri yukari (Z donusu eksi); gulumse azicik acik (kapaliyken gorunmuyordu)",
          r.gul[0] < 0 && r.gul[1] < 0 && r.gul[2] < 0 && r.gul[3] < 0, JSON.stringify(r.gul));
  kontrol("her sekilde butun kontroller yaziliyor (onceki sekilden deger kalmasin)", r.surgu_hep);
  const tg = readFileSync(join(ARAC, "thomas_goz.py"), "utf8");
  const bf = readFileSync(join(ARAC, "blender_film.py"), "utf8");
  kontrol("disler ve dil yalniz agiz acikken cizilir (1. bolumun goz planlari degismez)",
          /cizilen = CIZILEN \| \(AGIZ_CIZILEN if agiz_c else set\(\)\)/.test(tg));
  kontrol("Thomas planlarinda doku agzi gizli (yuzun onunde asili kalmasin)", /s_ = "X" if \(f \+ 1\) in t_kare else/.test(bf));
}

console.log("\n=== 6. KAPSAM: PART 1 AGIZLI, 1. BOLUM DEGIL ===");
{
  const oku = (a) => readFileSync(join(FILM, a), "utf8");
  const b1 = readdirSync(FILM).filter((a) => a.startsWith("bolum1_"));
  const p1 = readdirSync(FILM).filter((a) => a.startsWith("bolum2_p1_") && a.endsWith(".json"));
  const b1_var = b1.filter((a) => /"agiz"\s*:\s*true|"boynuz"/.test(oku(a)));
  kontrol("1. bolum senaryolarinda agiz/boynuz yok (1. bolum yeniden cizilmez)", b1.length > 0 && b1_var.length === 0, b1_var.join(" "));
  const p1_yok = p1.filter((a) => JSON.parse(oku(a)).agiz !== true);
  kontrol("2. bolum Part 1'in alti senaryosunun hepsinde \"agiz\": true", p1.length === 6 && p1_yok.length === 0,
          p1.length + " senaryo; eksik: " + p1_yok.join(" "));
  kontrol("Part 1'de boynuz yok (kimde olacagi acik soru)", p1.every((a) => !/"boynuz"/.test(oku(a))));
  const r = py(`
import agiz as A, os
from PIL import Image
os.chdir(${JSON.stringify(join(BURADA, ".."))})
sonuc = []
for y in sys.argv[2:]:
    s = json.load(open(y))
    konusan = sorted({o["aktor"] for o in s["olaylar"] if o.get("soyle")})
    for ad in konusan:
        skin = s["aktorler"][ad]["skin"]
        im = Image.open(skin).convert("RGBA")
        satir = A.agiz_satiri(skin)
        n = (8 - satir) * 6
        kapali = sum(1 for r_ in range(satir, 8) for c in range(1, 7) if im.getpixel((40 + c, 8 + r_))[3] > 0)
        sonuc.append([y.split("/")[-1], ad, kapali, n])
print(json.dumps(sonuc))`.replace("sys.argv[2:]", JSON.stringify(p1.map((a) => "film/" + a))));
  kontrol("konusan aktorlerin agzi sapka katmaninin arkasinda kalmiyor (en cok yarisi kapali)",
          r.length >= 2 && r.every(([, , k, n]) => k * 2 <= n), JSON.stringify(r));
  const th = py(`
import agiz as A, blender_film as F, os
from PIL import Image
os.chdir(${JSON.stringify(join(BURADA, ".."))})
def dogrusal(c):
    c = c / 255.0
    return round(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4, 4)
sonuc = []
for y in sys.argv[2:]:
    s = json.load(open(y))
    atis = sorted(s.get("kamera", []), key=lambda c: c["t"])
    def thomas(t):
        suan = [c for c in atis if c["t"] <= t + 1e-9]
        return (suan[-1] if suan else atis[0]).get("goz") == "thomas"
    for ad in sorted({o["aktor"] for o in s["olaylar"] if o.get("soyle")}):
        c = A.agiz_cizelgesi(s["olaylar"], ad, 30, F.yazi_suresi)
        anlar = [i / 30.0 for i in range(int(c[0][0] * 30), int(c[-1][0] * 30) + 2)
                 if A.sekil_karede(c, i / 30.0) != "X"]
        disari = [round(t, 2) for t in anlar if not thomas(t)]
        v = s["aktorler"][ad]
        im = Image.open(v["skin"]).convert("RGB")
        yuz = {tuple(dogrusal(x) for x in im.getpixel((8 + i, 8 + j))) for i in range(8) for j in range(8)}
        g = v.get("goz") or {}
        sonuc.append([y.split("/")[-1], ad, len(anlar), disari[:5], bool(g), tuple(g.get("iris", ())) in yuz])
print(json.dumps(sonuc))`.replace("sys.argv[2:]", JSON.stringify(p1.map((a) => "film/" + a))));
  kontrol("Part 1'de her konusma ani Thomas planinda (3B agiz; doku agzi konusmuyor)",
          th.length >= 2 && th.every(([, , n, d]) => n > 0 && d.length === 0), JSON.stringify(th.map((x) => x.slice(0, 4))));
  kontrol("konusanlarin Thomas kafasi var; goz rengi skinin kendi yuz pikseli (uydurulmadi)",
          th.every(([, , , , g, renk]) => g && renk), JSON.stringify(th.map((x) => [x[1], x[4], x[5]])));
  const kod = readFileSync(join(ARAC, "blender_film.py"), "utf8");
  kontrol("film araci agzi yalniz \"agiz\" yazilinca kuruyor", /if not a\.v\.get\("agiz", senaryo\.get\("agiz", False\)\):/.test(kod));
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> agiz ve boynuz: senkron, hucreler ve geometri tutarli");
process.exit(hata ? 1 : 0);
