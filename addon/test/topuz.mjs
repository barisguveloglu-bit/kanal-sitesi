/* OSMANLI TOPUZU -- esya, turetilmis set ve tutus          v7.99.15

   Kullanici (2026-10-18/19): Omer'in silahi kendi modelimiz, oyunda da
   esya; elin sapta kaymasi kapali; dovus seti Epic Fight'in BALTASI,
   demir balta hiziyla. Ilk taban demir asaydi: 5 vurusun 3'unde sapin
   ARKA ucuyla vuruyor, el sap boyunca 5-26 px kayiyor, sol yumruk sapin
   14-16 px gerisini tutuyordu (17 px'lik topuzda gorunmeyen bir sap).
   Ikincisi uzun kilic: topuz bes vurusun besinde bedene giriyordu
   (havada vurusta kafada 3.6 px, auto1'in bitisinde yumruk govdede).
   On bir set olculdu, balta en az batan; Epic Fight Minecraft'in
   topuzunu da balta sayiyor. Duzeltme IZLEMELI (arac/wom_cevir.py
   TURETILMIS, carpisma_takip).
   Bu test sonucu Bedrock ileri kinematigiyle (arac/bedrock_onizleme.py,
   donusturucuden bagimsiz) olcuyor:

   1. esya: kimlik, model, doku, ikon, Turkce ad; betik onu "topuz"
      seti sayiyor; oyuncu ve aktor elinde tutunca topuz durusu
   2. set: baltanin kopyasi -- vurus adlari, sureleri, hasar
      fazlari ve hamle izi bire bir ayni; animasyonlar ayri adla
   3. tutus: sag yumruk her karede kabzada (kayma kanali yok)
   4. sol el gorunmeyen bir sapi tutmuyor (sap dogrusunda, topuzun
      ucundan 4 px'ten otede en cok 0.1 s; demir asada yakaliyordu)
   5. topuz kafa, govde, bacak ve sol kolun 0.5 px'ten derinine
      girmiyor -- kup KOSELERIYLE (20 Hz + temasa yakin anahtarlar);
      duzeltme once kolda, kalani bilekte; kabza disindaki topuz sag kola da
      girmiyor; duzeltme tavani asilmiyor
   6. ayak: zeminin altina inmiyor
   7. mutasyon: kayma geri gelince ve carpisma duzeltmesi kalkinca
      ilgili olcu dusuyor
   8. film araci topuzu taniyor; Omer topuzla vurunca topuz seti   */
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const KOK = new URL("..", import.meta.url).pathname;
const oku = (p) => JSON.parse(readFileSync(KOK + p, "utf8"));
/* Duzeltme tavani: turetilmis setin iki gecisi de wom_cevir.py'nin
   CARPISMA_EN'ini kullaniyor (kendi tavani yok). */
const CEN = Number(readFileSync(KOK + "arac/wom_cevir.py", "utf8").match(/^CARPISMA_EN = ([\d.]+)/m)[1]);
const TAVAN = { kol: CEN, bilek: CEN };

console.log("=== 1. ESYA ===");
const SETLER = oku("kaynak_anim/wom/wom_kilic.hareket.json").setler;
{
  const esya = oku("Simsek_TNT_ToprakTopu/items/osmanli_topuzu.json")["minecraft:item"];
  const att = oku("Simsek_Kol_Kaynak/attachables/osmanli_topuzu.json")["minecraft:attachable"].description;
  const geo = oku("Simsek_Kol_Kaynak/models/entity/osmanli_topuzu.geo.json")["minecraft:geometry"][0];
  kontrol("esya ve attachable ayni kimlik", esya.description.identifier === "pa:osmanli_topuzu" &&
          att.identifier === "pa:osmanli_topuzu" && att.geometry.default === "geometry.osmanli_topuzu" &&
          geo.description.identifier === "geometry.osmanli_topuzu");
  kontrol("model elin kemigine bagli (rightItem)", geo.bones[0].name === "rightItem" && geo.bones[1].parent === "rightItem");
  const z = geo.bones[1].cubes.flatMap((c) => [c.origin[2], c.origin[2] + c.size[2]]);
  kontrol("onaylanan bicim: 43 kup, 17 px, bas onde (-Z)", geo.bones[1].cubes.length === 43 &&
          Math.abs(Math.max(...z) - Math.min(...z) - 17) < 1e-6 && Math.min(...z) < -12,
          geo.bones[1].cubes.length + " kup, " + Math.min(...z) + " .. " + Math.max(...z));
  for (const p of ["Simsek_Kol_Kaynak/textures/entity/osmanli_topuzu.png", "Simsek_Kol_Kaynak/textures/item/osmanli_topuzu.png"])
    kontrol(p.split("/").slice(-2).join("/") + " var", existsSync(KOK + p));
  const atlas = oku("Simsek_Kol_Kaynak/textures/item_texture.json").texture_data;
  kontrol("ikon atlasta", atlas.osmanli_topuzu && atlas.osmanli_topuzu.textures === "textures/item/osmanli_topuzu");
  const dil = readFileSync(KOK + "Simsek_Kol_Kaynak/texts/tr_TR.lang", "utf8");
  kontrol("Turkce adi var, adin rengi esyadakiyle ayni", dil.includes("item.pa:osmanli_topuzu.name=§bOsmanlı Topuzu") &&
          esya.components["minecraft:display_name"].value === "§bOsmanlı Topuzu");
  const js = readFileSync(KOK + "Simsek_TNT_ToprakTopu/scripts/yetenekler/_wom_hareket.js", "utf8");
  const E = JSON.parse(js.match(/export const WOM_KILIC_ESYA = (.*);\n/)[1]);
  const S = JSON.parse(js.match(/export const WOM_KILIC_SETLER = (.*);\n/)[1]);
  kontrol("betik onu topuz seti sayiyor, hasari esyadaki", E["pa:osmanli_topuzu"] && E["pa:osmanli_topuzu"].set === "topuz" &&
          E["pa:osmanli_topuzu"].hasar === esya.components["minecraft:damage"], JSON.stringify(E["pa:osmanli_topuzu"]));
  kontrol("  betikteki set esyayi tasiyor", S.topuz && S.topuz.esyalar.includes("osmanli_topuzu"));
  const oyuncu = JSON.stringify(oku("Simsek_Oyuncu_Modeli/entity/player.entity.json"));
  const aktor = JSON.stringify(oku("Simsek_Kol_Kaynak/entity/aktor.entity.json"));
  kontrol("oyuncu elinde tutunca topuz durusu", oyuncu.includes("variable.wom_kilic_topuz = query.get_equipped_item_name('main_hand') == 'osmanli_topuzu'") &&
          oyuncu.includes('"wom_topuz_durus":"animation.wom.topuz.durus"'));
  kontrol("aktor elinde tutunca da", aktor.includes("variable.wom_topuz = query.get_equipped_item_name('main_hand') == 'osmanli_topuzu'"));
}

console.log("\n=== 2. TURETILMIS SET ===");
{
  const t = SETLER.topuz, a = SETLER.balta;
  kontrol("topuz seti baltadan", t && t.taban === "balta" && t.esyalar.length === 0, t && t.taban);
  kontrol("  balta seti esyasiz (yalniz taban), Epic Fight'in kombosu",
          a && a.esyalar.length === 0 && a.saldirilar.map((x) => x.ad).join(",") === "axe_auto1,axe_auto2,axe_dash,axe_airslash",
          a && a.saldirilar.map((x) => x.ad).join(","));
  const ayni = (x) => JSON.stringify(x.saldirilar.map(({ anim, ...k }) => k));
  kontrol("vurus adlari, sureler, hasar fazlari, hamle izi bire bir", ayni(t) === ayni(a),
          t.saldirilar.map((x) => x.ad).join(", "));
  const anims = oku("kaynak_anim/wom/wom_kilic.animation.json").animations;
  const adlar = [t.durus, t.durus_ust, ...t.saldirilar.map((x) => x.anim)];
  kontrol("animasyonlar ayri adla ve dosyada", adlar.every((x) => x.startsWith("animation.wom.topuz.") && anims[x]),
          adlar.length + " animasyon");
  kontrol("hicbirinde silahin elde kaymasi yok", adlar.every((x) => !(anims[x].bones.rightItem || {}).position));
  /* Bekleme durusu baltanin kendisi (Epic Fight'in normal durusu), yalniz
     kayma kanali eksik. Ilk
     bilek duzeltmesi sag kolu tam kutuyla engel sayiyordu: topuzun dibinin
     yumruga 0.13 px degmesi icin bilegi butun durus boyunca 12.7 derece
     ceviriyordu (wom_cevir.py KOL_PAY). */
  for (const d of ["durus", "durus_ust"]) {
    const taban = JSON.parse(JSON.stringify(anims[a[d]]));
    if (taban.bones.rightItem) delete taban.bones.rightItem.position;
    kontrol("  " + d + " baltanin durusuyla bire bir (kayma haric)",
            JSON.stringify(anims[t[d]]) === JSON.stringify(taban));
  }
}

/* ---- 3-6: ileri kinematik ---- */
const py = `
import json, sys, math, copy
sys.path.insert(0, ${JSON.stringify(KOK + "arac")})
import bedrock_onizleme as B
geo = B.oku("Simsek_Kol_Kaynak/models/entity/aktor.geo.json")
tgeo = B.oku("Simsek_Kol_Kaynak/models/entity/osmanli_topuzu.geo.json")
kem = {b["name"]: b for b in geo["minecraft:geometry"][0]["bones"]}
anims = B.oku("kaynak_anim/wom/wom_kilic.animation.json")["animations"]
setler = B.oku("kaynak_anim/wom/wom_kilic.hareket.json")["setler"]
kupler = tgeo["minecraft:geometry"][0]["bones"][1]["cubes"]
SK = tgeo["minecraft:geometry"][0]["bones"][1]["name"]
kabza = next(c for c in kupler if c["uv"]["east"]["uv"][0] == 7)
K0, K1 = kabza["origin"][2], kabza["origin"][2] + kabza["size"][2]
Z0 = min(c["origin"][2] for c in kupler); Z1 = max(c["origin"][2] + c["size"][2] for c in kupler)
P = [6.0, 13.3, 0.5]                      # yumruk = rightItem pivotu (ic uzay)
nok = sorted({tuple(round(x, 4) for x in B.ic([o[0] + s[0] * u, o[1] + s[1] * v, o[2] + s[2] * w]))
              for c in kupler for o, s in [(c["origin"], c["size"])]
              for u in (0, 1) for v in (0, 1) for w in (0, 0.5, 1)})
# dinlenmede sag kolun kutusunun icindeki noktalar (kabza) tutulan; digerleri kola giremez
_kc = kem["rightArm"]["cubes"][0]
_ko, _ks = B.ic([_kc["origin"][0] + _kc["size"][0], _kc["origin"][1], _kc["origin"][2]]), _kc["size"]
def tutulan(p):
    return all(_ko[i] - 0.01 <= p[i] <= _ko[i] + _ks[i] + 0.01 for i in range(3))
tm = B.Model(tgeo)
ENGEL = ("head", "body", "rightLeg", "leftLeg", "leftArm", "rightArm")
def kutular(m):
    out = []
    for ad in ENGEL:
        for c in kem[ad].get("cubes", []):
            if c.get("inflate", 0) > 0: continue
            o, z = c["origin"], c["size"]
            mn = [-(o[0] + z[0]), o[1], o[2]]; mx = [-o[0], o[1] + z[1], o[2] + z[2]]
            k = lambda a, b, d: m.nokta(ad, [mx[0] if a else mn[0], mx[1] if b else mn[1], mx[2] if d else mn[2]])
            c0 = k(0, 0, 0); E = []
            for v in (k(1, 0, 0), k(0, 1, 0), k(0, 0, 1)):
                e = [v[i] - c0[i] for i in range(3)]; L = math.sqrt(sum(x * x for x in e))
                E.append(([x / L for x in e], L))
            out.append((ad, c0, E))
    return out
def derinlik(m):
    dunya = [(tm.nokta(SK, list(p), m), not tutulan(p)) for p in nok]
    en = (-9.0, "")
    for ad, c0, E in kutular(m):
        for w, on in dunya:
            if ad == "rightArm" and not on:
                continue                   # kabza yumrugun icinde: tasarim geregi
            d = min(min(sum((w[k] - c0[k]) * e[k] for k in range(3)), L - sum((w[k] - c0[k]) * e[k] for k in range(3))) for e, L in E)
            if d > en[0]: en = (d, ad)
    return en
def eksen(m):
    a = m.nokta("rightItem", [P[0], P[1], P[2]]); b = m.nokta("rightItem", [P[0], P[1], P[2] - 16.0])
    ab = [b[i] - a[i] for i in range(3)]; L = math.sqrt(sum(x * x for x in ab))
    return a, [x / L for x in ab]
def tutus(m):
    """(sag yumruk -> kabza ekseni px, kabzada mi, sol el gorunmez sapta mi)"""
    a, e = eksen(m)
    def yer(p):
        v = [p[i] - a[i] for i in range(3)]; u = sum(v[i] * e[i] for i in range(3))
        return math.sqrt(max(0.0, sum(x * x for x in v) - u * u)), u
    d, u = yer(m.nokta("rightArm", list(P)))
    zu = P[2] - u                                   # u ileri (-Z) pozitif
    ds, us = yer(m.nokta("leftArm", [-P[0], P[1], P[2]]))
    # topuz u = P[2]-Z1 .. P[2]-Z0 araliginda; ucundan 4 px oteden sap dogrusunda = gorunmez sap
    sap = ds < 3.0 and (us < P[2] - Z1 - 4.0 or us > P[2] - Z0 + 4.0)
    return d, K0 <= zu <= K1, sap
TAVAN = ${JSON.stringify(TAVAN)}
def aci(R0, R1):
    tr = sum(R0[r][c] * R1[r][c] for r in range(3) for c in range(3))
    return math.degrees(math.acos(max(-1.0, min(1.0, (tr - 1) / 2))))
def ayak(m):
    y = 1e9
    for ad in ("rightLeg", "leftLeg"):
        for c in kem[ad].get("cubes", []):
            if c.get("inflate", 0) > 0: continue
            o, z = c["origin"], c["size"]
            for a in (0, 1):
                for b in (0, 1):
                    for d in (0, 1):
                        y = min(y, m.nokta(ad, [-(o[0] + z[0] * a), o[1] + z[1] * d, o[2] + z[2] * b])[1])
    return y
def olc(an, carpisma=True, adim=0.05, taban=None):
    uz = an.get("animation_length", 1.0) or 1.0
    r = {"derin": (-9.0, 0.0, ""), "sag": 0.0, "disari": 0, "sap": 0, "n": 0,
         "gomulu": 0.0, "duzeltme": {"rightArm": 0.0, "rightItem": 0.0}}
    yakin = []
    for i in range(int(uz / adim + 1e-9) + 1):
        t = round(i * adim, 4)
        m = B.Model(geo, an, t)
        d, ici, sap = tutus(m)
        r["n"] += 1; r["sag"] = max(r["sag"], d); r["disari"] += (not ici); r["sap"] += sap
        r["gomulu"] = max(r["gomulu"], -ayak(m))
        if taban is not None:
            for kb in r["duzeltme"]:
                k0, k1 = taban["bones"].get(kb, {}).get("rotation"), an["bones"].get(kb, {}).get("rotation")
                if k0 is not None and k1 is not None:
                    r["duzeltme"][kb] = max(r["duzeltme"][kb], aci(B.bb_mat(B.deger(k0, t)), B.bb_mat(B.deger(k1, t))))
        if carpisma:
            dd = derinlik(m)
            if dd[0] > r["derin"][0]: r["derin"] = (dd[0], t, dd[1])
            if dd[0] > -2.0: yakin.append(t)
    if carpisma:
        ks = sorted({float(k) for kb in ("rightArm", "rightItem", "body", "waist", "root")
                     for kn in ("rotation", "position") for k in (an["bones"].get(kb, {}).get(kn) or {})
                     if isinstance(an["bones"].get(kb, {}).get(kn), dict)})
        ince = sorted({k for k in ks for t in yakin if abs(k - t) <= adim and k <= uz})
        for t in ince:
            dd = derinlik(B.Model(geo, an, t))
            if dd[0] > r["derin"][0]: r["derin"] = (dd[0], t, dd[1])
        r["ince"] = len(ince)
    r["sap_sn"] = r["sap"] * adim
    return r
t = setler["topuz"]
adlar = [t["durus"], t["durus_ust"]] + [x["anim"] for x in t["saldirilar"]]
def tabandan(a):
    return anims[a.replace(".topuz.", "." + t["taban"] + ".")]
out = {"asil": {a.split(".")[-1]: olc(anims[a], taban=tabandan(a)) for a in adlar}}
# mutasyon 1: taban setin kendi animasyonu (kayma kanali duruyor)
out["kayma"] = {a.split(".")[-1]: olc(tabandan(a), False) for a in adlar[2:]}
# mutasyon 2: carpisma duzeltmesi yok (tabanin sag kolu ve bilegi, kayma kaldirilmis)
m2 = {}
for a in [x for x in adlar if x.endswith(("auto2", "airslash"))]:
    an = copy.deepcopy(anims[a])
    for kb in ("rightArm", "rightItem"):
        an["bones"][kb] = copy.deepcopy(tabandan(a)["bones"][kb])
    an["bones"]["rightItem"].pop("position", None)
    m2[a.split(".")[-1]] = olc(an)
out["duzeltmesiz"] = m2
print(json.dumps(out))
`;
const r = JSON.parse(execFileSync("python3", ["-c", py], { cwd: KOK, encoding: "utf8", maxBuffer: 1 << 24 }));
const A = Object.entries(r.asil);

console.log("\n=== 3. SAG YUMRUK KABZADA ===");
{
  const kotu = A.filter(([, v]) => v.sag > 0.01 || v.disari > 0);
  kontrol("her karede yumruk kabzanin ustunde", kotu.length === 0 && A.length === 6,
          A.reduce((n, [, v]) => n + v.n, 0) + " kare, en kotu " + Math.max(...A.map(([, v]) => v.sag)).toFixed(3) + " px");
}

console.log("\n=== 4. SOL EL GORUNMEYEN SAPI TUTMUYOR ===");
{
  const kotu = A.filter(([, v]) => v.sap_sn > 0.1);
  kontrol("sap dogrusunda, topuzun disinda en cok 0.1 s", kotu.length === 0,
          A.map(([k, v]) => k.replace("axe_", "") + " " + v.sap_sn.toFixed(2)).join(", "));
}

console.log("\n=== 5. TOPUZ BEDENE GIRMIYOR ===");
{
  const kotu = A.filter(([, v]) => v.derin[0] > 0.5);
  const en = A.reduce((m, [k, v]) => (v.derin[0] > m[1] ? [k, v.derin[0], v.derin[2]] : m), ["", -9, ""]);
  kontrol("kafa, govde, bacak, sol kol, sag kol (yumruk onu): kup koseleri 0.5 px'ten derine girmiyor", kotu.length === 0,
          kotu.length ? kotu.map(([k, v]) => k + " " + v.derin[0].toFixed(2) + "px t=" + v.derin[1] + " " + v.derin[2]).join(", ")
                      : "en derin " + en[1].toFixed(2) + " px (" + en[0] + " " + en[2] + "), " +
                        A.reduce((n, [, v]) => n + v.ince, 0) + " anahtar kare ayrica");
  /* Duzeltme tavani (wom_cevir.py TURETILMIS: kol_en, bilek_en). Tavana
     degen cozum, temiz olmasa bile tavanda kalir: bu olcu onu ayirir. */
  const kol = Math.max(...A.map(([, v]) => v.duzeltme.rightArm)), bilek = Math.max(...A.map(([, v]) => v.duzeltme.rightItem));
  kontrol("  duzeltme tavanin altinda (kol " + TAVAN.kol + ", bilek " + TAVAN.bilek + " derece)",
          kol <= TAVAN.kol + 0.5 && bilek <= TAVAN.bilek + 0.5,
          "kol en cok " + kol.toFixed(1) + ", bilek en cok " + bilek.toFixed(1) + " derece");
}

console.log("\n=== 6. AYAK YERDE ===");
{
  /* Dizli film bacaginin tabani diz.mjs'te; burada oyunun duz bacagi. */
  const gom = Math.max(...A.map(([, v]) => v.gomulu));
  kontrol("ayaklar zeminin altina inmiyor", gom <= 0.1, "en cok " + gom.toFixed(2) + " px");
}

console.log("\n=== 7. MUTASYON ===");
{
  /* Baltada el iki seri vurusta kayiyor (en cok 0.73 px): 3. bolumun
     esigi (0.01 px) onu yakaliyor mu. */
  const k = Object.entries(r.kayma);
  kontrol("kayma geri gelince yumruk kabzanin ustunden kayiyor", k.some(([, v]) => v.sag > 0.01 || v.disari > 0),
          k.filter(([, v]) => v.sag > 0.01).map(([n, v]) => n.replace("axe_", "") + " " + v.sag.toFixed(2) + " px").join(", ") || "hic");
  const d = Object.entries(r.duzeltmesiz);
  kontrol("carpisma duzeltmesi kalkinca topuz bedene giriyor", d.every(([, v]) => v.derin[0] > 0.5) && d.length === 2,
          d.map(([n, v]) => n.replace("axe_", "") + " " + v.derin[0].toFixed(2) + " px " + v.derin[2]).join(", "));
}

console.log("\n=== 8. FILM ARACI ===");
{
  const sen = {
    fps: 24, sure: 3.0,
    aktorler: {
      o: { skin: "x.png", isim: "Ömer", silah: "osmanli_topuzu", set: "topuz", konum: [-1.6, 0], bak: "d" },
      d: { skin: "y.png", isim: "Asker", set: "yumruk", konum: [1.6, 0], bak: "o" }
    },
    olaylar: [{ t: 0.3, aktor: "o", vur: "oto", hedef: "d" }, { t: 2.0, aktor: "o", vur: "oto", hedef: "d" }],
    kamera: [{ t: 0, aci: "genis", a: "o", b: "d" }]
  };
  const pyf = `
import json, sys, os
sys.path.insert(0, ${JSON.stringify(KOK + "arac")})
import blender_film as F
import bedrock_onizleme as B
sen = json.loads(sys.stdin.read())
ak = F.zaman_cizelgesi(sen, B.oku(F.HAREKET)["setler"], {})[0]
anim = [k["eylem"]["anim"] for k in ak["o"].kayit if k["eylem"]]
g, d = F.SILAH["osmanli_topuzu"]
print(json.dumps({"anim": sorted(set(anim)), "ilk": anim[0] if anim else None,
                  "dosya": os.path.exists(B.yol(g)) and os.path.exists(B.yol(d))}))
`;
  const f = JSON.parse(execFileSync("python3", ["-c", pyf], { cwd: KOK, input: JSON.stringify(sen), encoding: "utf8" }));
  kontrol("film araci topuzun modelini ve dokusunu buluyor", f.dosya);
  kontrol("Omer topuzla vurunca topuz setinin kombosu", f.ilk === "animation.wom.topuz.axe_auto1" &&
          f.anim.includes("animation.wom.topuz.axe_auto2"), f.anim.join(", "));
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> topuz: esya, set ve tutus tamam");
process.exit(hata ? 1 : 0);
