/* AKICI HAREKET -- arac/hareket.py + blender_film "akici"          v7.99.16

   Kullanici (2026-11-01): "robotik dovuslerden ya da hareketlerden memnun
   degilim." Olculen sebepler ve burada kilitlenen karsiliklari:

   1. Saf matematik: smoothstep uclarda hizsiz; kritik sonumlu yay
      tasmadan varir; donus yayi ilk karede hizsiz; yurume ivmeyle kalkar,
      varista yavaslar; adim cokmesi GERCEK modelin en alt kosesine esit;
      bas takibi yonu ve siniri; irkilme 0,6 sn'de biter; film pozu egrisi
      anahtarlardan gecer, anahtar araliginin disina tasmaz.
   2. Zaman cizelgesi (akici): yurume ilk karede tam hiz ALMIYOR (eskisi
      tek karede 0 -> 4,3 blok/sn), donus ilk karede 22,5 derece ATLAMIYOR,
      bas rakibe donuyor, vurulan irkiliyor.
   3. akici yazilmayan senaryo ESKI hareketi verir: yeni alan yok, ek yok
      (1. bolumun cizilmis bloklari; tam karsilastirma 14.487 karede yapildi).
      Yururken ust beden durusu (oyundaki gibi): Baris'in kok ve bacaklari
      antitheus durusunun yana donuk ve burulmus acilarini tasimiyor;
      akici senaryoda diz varsayilan.
   4. Film pozlari (akici): egrili ve sik anahtarli; yere degen pozun
      ARA anlarinda da en alt nokta zeminde.
   5. Kural: film/ altindaki 1. bolum disi her senaryo "akici": true. */
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
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
const py = (kod, girdi = "") => JSON.parse(execFileSync("python3", ["-c",
  "import sys, json, math\nsys.dont_write_bytecode = True\nsys.path.insert(0, sys.argv[1])\n" + kod, ARAC],
  { encoding: "utf8", env: ORTAM, input: girdi, maxBuffer: 1 << 26 }));

console.log("=== 1. SAF MATEMATIK ===");
{
  const r = py(`
import hareket as H, film_poz as F
d = 1e-4
yum = [H.yumusak(0), H.yumusak(1), (H.yumusak(d) - H.yumusak(0)) / d, (H.yumusak(1) - H.yumusak(1 - d)) / d]
# yay: 0 -> 1, tasma yok, tekduze yaklasir
x, v, xs = 0.0, 0.0, []
for i in range(60):
    x, v = H.yay(x, v, 1.0, 1 / 30, 15.0); xs.append(x)
yay_tasma = max(xs) > 1.0 + 1e-9
yay_tek = all(b >= a - 1e-12 for a, b in zip(xs, xs[1:]))
# donus: 180 derece, 24 kare/sn
a, w, adimlar, n = 0.0, 0.0, [], 0
while True:
    a2, w, vardi = H.aci_yayi(a, w, 180.0, 1 / 24)
    adimlar.append(abs((a2 - a + 180) % 360 - 180)); a = a2; n += 1
    if vardi or n > 200: break
# yurume: 0'dan 4.3'e, 6 blok yol
v, yol, vs = 0.0, 0.0, []
while yol < 6.0 - 0.02 and len(vs) < 400:
    v = H.yuru_hizi(v, 4.3, 6.0 - yol, 1 / 24); yol += max(v, 0.05) / 24; vs.append(v)
ivme = max(abs(b - a) for a, b in zip([0.0] + vs, vs)) * 24
# adim cokmesi gercek modelde
geo = F._geo()
cok = []
for th in (5, 15, 30, 40, 52):
    an = {"bones": {"rightLeg": {"rotation": [th, 0, 0]}, "leftLeg": {"rotation": [-th, 0, 0]}}}
    cok.append(abs(F.en_alt(geo, an, 0) + H.adim_cokmesi(0.0, th / 40.0) * 16))
# bas takibi: aktor +y'ye bakiyor (aci 0); hedef sagda (+x), arkada, asagida
sag = H.bas_takibi((0, 0), 0.0, 1.6, (2, 2), 1.6)
arka = H.bas_takibi((0, 0), 0.0, 1.6, (0.1, -3), 1.6)
asagi = H.bas_takibi((0, 0), 0.0, 1.6, (0, 2), 0.5)
irk = [H.irkilme(0.05, 1, 1), H.irkilme(0.7, 1, 1), H.irkilme(0.05, 1, -1)]
# egri: anahtarlardan gecer, araligin disina tasmaz, tutmada hizsiz
k = {"0.0": [0, 0, 0], "0.3": [-90, 10, 0], "0.6": [-90, 10, 0], "1.0": [-20, 0, 5]}
e = H.akici_kanal(k)
import bedrock_onizleme as B
gecer = all(max(abs(a - b) for a, b in zip(B.deger(e, float(t)), v)) < 1e-3 for t, v in k.items())
x0 = [B.deger(e, i / 100)[0] for i in range(0, 101)]
tasma = min(x0) < -90 - 1e-6 or max(x0) > 0 + 1e-6
tutma_hiz = abs(B.deger(e, 0.31)[0] - B.deger(e, 0.30)[0]) / 0.01
bas_hiz = abs(B.deger(e, 0.01)[0] - B.deger(e, 0.0)[0]) / 0.01
print(json.dumps({"yum": yum, "yay_tasma": yay_tasma, "yay_tek": yay_tek, "don_ilk": adimlar[0], "don_kare": n,
                  "don_max": max(adimlar), "yuru_kare": len(vs), "ilk_v": vs[0], "son_v": vs[-1], "ivme": ivme,
                  "cok": max(cok), "sag": sag, "arka": arka, "asagi": asagi,
                  "irk": [irk[0].get("head"), irk[1], irk[2].get("head")], "gecer": gecer, "tasma": tasma,
                  "tutma_hiz": tutma_hiz, "bas_hiz": bas_hiz, "egri_n": len(e)}))`);
  kontrol("yumusatma uclarda 0 ve 1, hizsiz", r.yum[0] === 0 && r.yum[1] === 1 && r.yum[2] < 0.01 && r.yum[3] < 0.01,
          JSON.stringify(r.yum.map((x) => +x.toFixed(4))));
  kontrol("yay hedefe tasmadan, tek yonde varir", !r.yay_tasma && r.yay_tek);
  kontrol("donus ilk karede yavas basliyor (eskisi 22,5 derece)", r.don_ilk < 6, r.don_ilk.toFixed(2) + " derece");
  kontrol("  180 derece donus 0,9 sn icinde biter, karede en cok 30 derece, surekli",
          r.don_kare <= 22 && r.don_max <= 30, r.don_kare + " kare, en buyuk adim " + r.don_max.toFixed(1));
  kontrol("yurume ilk karede tam hiz almiyor, ivme sinirli (eskisi tek karede 0 -> 4,3)",
          r.ilk_v < 0.5 && r.ivme <= 9.0 + 1e-6, "ilk " + r.ilk_v.toFixed(3) + " blok/sn, ivme " + r.ivme.toFixed(2));
  kontrol("  varista yavasliyor", r.son_v < 1.0, "son hiz " + r.son_v.toFixed(3));
  kontrol("adim cokmesi gercek modelin en alt kosesine esit (5-52 derece)", r.cok < 0.01, r.cok.toFixed(4) + " px");
  kontrol("bas sagdaki hedefe saga donuyor", r.sag[0] > 30 && Math.abs(r.sag[1]) < 1, JSON.stringify(r.sag));
  kontrol("  arkadaki hedefte 55 derecede duruyor", Math.abs(Math.abs(r.arka[0]) - 55) < 1e-6, JSON.stringify(r.arka));
  kontrol("  asagidaki hedefe asagi bakiyor", r.asagi[1] > 10, JSON.stringify(r.asagi));
  kontrol("irkilme: sagdan gelen vurusta bas sola, 0,6 sn sonra bitmis",
          r.irk[0][1] < 0 && r.irk[2][1] > 0 && Object.keys(r.irk[1]).length === 0, JSON.stringify(r.irk));
  kontrol("poz egrisi anahtarlardan geciyor", r.gecer);
  kontrol("  anahtar araliginin disina tasmiyor", !r.tasma);
    // 1/30 sn ornekleme ilk araligin ORTALAMASINI verir; dogrusal olsaydi
  // 300 derece/sn (90 derece / 0,3 sn) olurdu
  kontrol("  tutmada hizsiz, baslangicta yavas (dogrusalin %40'indan az)", r.tutma_hiz < 20 && r.bas_hiz < 0.4 * 300,
          r.tutma_hiz.toFixed(1) + " / " + r.bas_hiz.toFixed(1) + " derece/sn");
}

console.log("\n=== 2-3. ZAMAN CIZELGESI ===");
{
  const sen = {
    fps: 24, sure: 4.0,
    aktorler: {
      a: { skin: "x.png", isim: "A", set: "antitheus", silah: "karanlik_tirpan", konum: [-3.2, 0], bak: 90 },
      b: { skin: "y.png", isim: "B", set: "yumruk", konum: [3.0, 0], bak: "a" },
      // seyirci: yana bakiyor, hic donmuyor -- basini yalniz bas takibi cevirir
      c: { skin: "z.png", isim: "C", konum: [0.0, 3.0], bak: 0 }
    },
    olaylar: [
      { t: 0.4, aktor: "a", bak: "b" }, { t: 1.1, aktor: "a", git: "b" },
      { t: 2.6, aktor: "a", vur: "oto", hedef: "b" }
    ],
    kamera: [{ t: 0, aci: "genis", a: "a", b: "b" }]
  };
  const r = py(`
import blender_film as F, bedrock_onizleme as B
sen = json.loads(sys.stdin.read())
setler = B.oku(F.HAREKET)["setler"]
def olc(akici):
    s = dict(sen)
    if akici is not None:
        s["akici"] = akici
    ak, *_ = F.zaman_cizelgesi(s, setler, {})
    a = ak["a"].kayit; b = ak["b"].kayit
    fps = 24
    v = [math.hypot(a[i]["x"] - a[i - 1]["x"], a[i]["y"] - a[i - 1]["y"]) * fps for i in range(1, len(a))]
    yuru = [i for i in range(int(1.1 * fps), int(2.5 * fps))]
    dv = max(abs(v[i] - v[i - 1]) for i in yuru)
    n = lambda x: (x + 180) % 360 - 180
    don = [abs(n(a[i]["aci"] - a[i - 1]["aci"])) for i in range(int(0.4 * fps), int(1.1 * fps))]
    ilk_don = next((x for x in don if x > 1e-6), 0.0)
    bas = [k.get("bas") for k in a]
    c_bas = [abs((k.get("bas") or [0, 0])[0]) for k in ak["c"].kayit]
    irk = any(k.get("irk") for k in b)
    yeni_alan = any(x in k for k in a + b for x in ("bas", "bob", "irk"))
    ek = [F.kare_ekleri(ak["a"], k, []) for k in a[::6]]
    return {"dv": dv, "ilk_don": ilk_don, "bas_yuru": bas[int(1.6 * fps)], "irk": irk, "c_bas": max(c_bas),
            "yeni_alan": yeni_alan, "ek_bos": all(not e for e in ek), "bob": min(k.get("bob", 0) for k in a)}
# yuruyen Baris: ust beden durusuna geciyor mu (kok ve bacak burulmasi)
anims = {}
anims.update(B.oku(F.ANIM_WOM)["animations"]); anims.update(B.oku(F.ANIM_AKTOR)["animations"])
def yuruyus(akici):
    s = dict(sen, akici=akici)
    ak, *_ = F.zaman_cizelgesi(s, setler, anims)
    a = ak["a"]
    kem = ["root", "waist", "body", "head", "rightArm", "leftArm", "rightItem", "leftItem", "rightLeg", "leftLeg"]
    kok, bacak = [], []
    for k in a.kayit[int(1.5 * 24):int(2.3 * 24)]:
        poz, _ = F.kare_pozu(a, k, kem, anims, setler)
        kok.append(abs(poz["root"][0][0][1]))
        bacak.append(max(abs(poz["rightLeg"][0][0][1]), abs(poz["leftLeg"][0][0][1])))
    return {"kok_yaw": max(kok), "bacak_burul": max(bacak), "diz": a.diz}
print(json.dumps({"yeni": olc(True), "eski": olc(False), "yazilmamis": olc(None),
                  "yuru_yeni": yuruyus(True), "yuru_eski": yuruyus(False)}))`, JSON.stringify(sen));
  kontrol("yurume: kareden kareye hiz sicramasi kucuk (eskisi " + r.eski.dv.toFixed(2) + " blok/sn)",
          r.yeni.dv <= 0.45 && r.eski.dv > 3, r.yeni.dv.toFixed(3) + " blok/sn");
  kontrol("donus: ilk kare kucuk adim (eskisi " + r.eski.ilk_don.toFixed(1) + " derece)",
          r.yeni.ilk_don < 6 && r.eski.ilk_don > 20, r.yeni.ilk_don.toFixed(2) + " derece");
  kontrol("yururken bas rakipte (sapma kucuk)", r.yeni.bas_yuru && Math.abs(r.yeni.bas_yuru[0]) < 20,
          JSON.stringify(r.yeni.bas_yuru));
  kontrol("yana bakan seyircinin basi yakindakilere donuyor", r.yeni.c_bas > 30, r.yeni.c_bas.toFixed(1) + " derece");
  kontrol("vurulan irkiliyor", r.yeni.irk);
  kontrol("yururken govde iniyor (adim cokmesi var)", r.yeni.bob < -0.03, r.yeni.bob.toFixed(3) + " blok");
  kontrol("akici: false -- yeni alan yok, ek yok (eski hareket)", !r.eski.yeni_alan && r.eski.ek_bos);
  kontrol("akici HIC yazilmamis senaryo da eski hareket (1. bolum boyle)",
          !r.yazilmamis.yeni_alan && r.yazilmamis.ek_bos && r.yazilmamis.dv > 3);
  // Kullanici: "Baris'da durus bozuklugu var" -- yururken kok antitheus
  // durusunun 21 derece yana donuk acisinda, bacaklar 12-20 derece burulmus
  kontrol("yururken ust beden durusu: kok yana donuk degil (eskisi " + r.yuru_eski.kok_yaw.toFixed(1) + " derece)",
          r.yuru_yeni.kok_yaw < 3 && r.yuru_eski.kok_yaw > 15, r.yuru_yeni.kok_yaw.toFixed(2) + " derece");
  kontrol("  bacaklar burulmus degil (eskisi " + r.yuru_eski.bacak_burul.toFixed(1) + " derece)",
          r.yuru_yeni.bacak_burul < 3 && r.yuru_eski.bacak_burul > 10, r.yuru_yeni.bacak_burul.toFixed(2) + " derece");
  kontrol("akici senaryoda diz varsayilan, eskisinde yok", r.yuru_yeni.diz === true && r.yuru_eski.diz === false);
}

console.log("\n=== 4. FILM POZLARI ===");
{
  const r = py(`
import film_poz as F, bedrock_onizleme as B
d = F.pozlar(); a = F.pozlar(akici=True)
geo = F._geo()
sonuc = {}
for ad in ("kalk", "dus", "comel_dokun"):
    k = F.ONEK + ad
    uz = a[k]["animation_length"]
    alt = [abs(F.en_alt(geo, a[k], i * uz / 23)) for i in range(24)]
    rk = a[k]["bones"].get("rightArm", {}).get("rotation")
    sonuc[ad] = {"alt": max(alt), "n": len(rk) if isinstance(rk, dict) else 0,
                 "eski_n": len(d[k]["bones"].get("rightArm", {}).get("rotation", {})) if isinstance(d[k]["bones"].get("rightArm", {}).get("rotation"), dict) else 0}
# temasli poz: elin yere degdigi an korunuyor (comel_dokun 0.9 sn)
m1 = B.Model(geo, d[F.ONEK + "comel_dokun"], 0.9); m2 = B.Model(geo, a[F.ONEK + "comel_dokun"], 0.9)
e1 = m1.nokta("rightArm", list(F.SAG_YUMRUK)); e2 = m2.nokta("rightArm", list(F.SAG_YUMRUK))
sonuc["temas"] = math.dist(e1, e2)
print(json.dumps(sonuc))`);
  for (const ad of ["kalk", "dus", "comel_dokun"]) {
    kontrol(ad + ": sik anahtarli egri (" + r[ad].eski_n + " -> " + r[ad].n + ")", r[ad].n > r[ad].eski_n * 3);
    kontrol("  ara anlarda da zemine basiyor (24 anda en alt)", r[ad].alt < 0.15, r[ad].alt.toFixed(3) + " px");
  }
  kontrol("temasli pozda el yere degdigi anda ayni yerde", r.temas < 0.05, r.temas.toFixed(4) + " px");
}

console.log("\n=== 5. YENI SENARYOLAR AKICI ===");
{
  const klasor = join(BURADA, "..", "film");
  const eksik = readdirSync(klasor).filter((f) => f.endsWith(".json") && !f.startsWith("bolum1_"))
    .filter((f) => JSON.parse(readFileSync(join(klasor, f), "utf8")).akici !== true);
  kontrol("film/ altindaki 1. bolum disi her senaryo \"akici\": true", eksik.length === 0, eksik.join(", "));
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> akici hareket: olculdu, eski hareket korunuyor");
process.exit(hata ? 1 : 0);
