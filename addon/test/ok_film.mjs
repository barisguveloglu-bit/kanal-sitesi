/* BUZ OKLARI FILMDE -- arac/ok_film.py + blender_film.py           2026-11-25

   Kullanici: "Siradaki 2. madde: iskeletlerin buz oklari ve Pipos'un oklari
   iskeletlere geri savusturmasi, ikisini de yap." Blender gerekmez.

   1. fizik (oyunun kodundan): tik basina konum += hiz, hiz * 0.99, dusey
      -0.05; atis hizi 1.6 blok/tik, dusey farka yatay uzakligin 0.2'si;
      cikis goz yuksekliginin 0.1 alti; nisan boyunun 1/3'u
   2. ucus: 14 blok oteye atilan ok hedefe ~0.45 sn'de varir ve saplanir;
      bos yere atilan ok yere saplanip kalir; ok atanini vurmaz
   2b. akicilik (30 fps): ok tikin icinde de ilerler (oyunda istemci iki tik
      arasini ara degerle cizer); her karede ~1,07 blok, agir cekimde ~0,27;
      ilk karede yaydan birakistan beri gecen sure kadar uzakta; isabet
      karesinde temas noktasinda; savusturma noktasinda beklemez
   3. savusturma: penceresi acik savusturan oku atanina geri yollar, ok
      atani vurur ve "dusur" uygulanir; savunma durusu oktan once baslar;
      pencere yoksa ok savusturani vurur
   4. nisan: iskelet birakmadan 1 sn once yayi gerer ve hedefe doner
   5. hata: bilinmeyen aktor ve ayni adli iki ok cizimden once HATA
   6. model: buz oku oyunun olcusunde (uc 3.6 px onde, kuyruk 10.8 px
      arkada); uretec 35 dosya yaziyor
   7. mutasyon: yercekimi, hiz, savusturma ve tik arasi ilerleme bozulunca
      ilgili kontrol dusuyor */
import { execFileSync } from "node:child_process";

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const KOK = new URL("..", import.meta.url).pathname;
const py = `
import json, sys, os, math, importlib
sys.dont_write_bytecode = True
sys.path.insert(0, ${JSON.stringify(KOK + "arac")})
os.chdir(${JSON.stringify(KOK)})
import ok_film as OK
import yaratik_film as YF
import blender_film as BF
import bedrock_onizleme as B
import buz_ordu as BO
out = {}

# 1. fizik
k, v = OK.tik_adimi([0, 0, 10], [1.0, 0.0, 0.0])
out["tik"] = [round(x, 6) for x in k + v]
h = OK.atis_hizi([0, 0, 0], [0, 10, 0])
out["atis"] = {"hiz": round(math.sqrt(sum(x * x for x in h)), 6), "egim": round(h[2] / h[1], 6)}
class A:
    pass
def aktor(ad, poz, yaratik=None):
    a = A(); a.ad = ad; a.poz = list(poz); a.z = 0.0; a.olcek = 1.0
    a.yaratik = {"tur": yaratik} if yaratik else None; a.gorunur = True
    return a
out["noktalar"] = {"iskelet_cikis": round(OK.cikis_noktasi(aktor("i", (0, 0), "iskelet"))[2], 4),
                   "insan_hedef": round(OK.hedef_noktasi(aktor("p", (0, 0)))[2], 4),
                   "iskelet_hedef": round(OK.hedef_noktasi(aktor("i", (0, 0), "iskelet"))[2], 4)}

# 2-4. senaryolar
setler = B.oku(BF.HAREKET)["setler"]
anims = {}
anims.update(B.oku(BF.ANIM_WOM)["animations"]); anims.update(B.oku(BF.ANIM_AKTOR)["animations"])
def kos(olaylar, sure=4.0, oklar_al=True, fps=24, zaman=None):
    sen = {"fps": fps, "sure": sure, "akici": True, "zaman": zaman or [], "aktorler": {
        "pipos": {"skin": "kaynak_doku/film_aktor/pipos.png", "konum": [0, 0], "bak": "i1"},
        "i1": {"yaratik": "iskelet", "konum": [0, 14], "bak": "pipos"},
        "i2": {"yaratik": "iskelet", "konum": [6, 14], "bak": 180}},
        "olaylar": olaylar, "kamera": [{"t": 0.0, "aci": "genis", "a": "pipos", "b": "i1"}]}
    oklar = []
    akt, ef, _y, _s = BF.zaman_cizelgesi(sen, setler, dict(anims, **BF.film_pozlari(True)),
                                         oklar=oklar if oklar_al else None)
    return akt, ef, oklar
def tepkiler(a):
    return sorted({(r["anim"].split(".")[-1], round(r["bas"], 3)) for k in a.kayit for r in k["tepki"]})
def gorunur_kare(ok):
    return [i for i, k in enumerate(ok["kareler"]) if k and k[5]]

akt, ef, oklar = kos([{"t": 1.5, "aktor": "i1", "ok": "pipos", "ad": "ok1"}])
o = oklar[0]
isabet = [e for e in ef if e["tur"] == "buz_kirigi" and e.get("hedef") == "pipos"]
out["isabet"] = {"durum": o["durum"], "vurulan": [e.get("hedef") for e in ef if e["tur"] == "buz_kirigi"],
                 "sure": round(isabet[0]["t"] - 1.5, 3) if isabet else None,
                 "pipos": tepkiler(akt["pipos"]), "i1": tepkiler(akt["i1"])}
akt, ef, oklar = kos([{"t": 1.0, "aktor": "i2", "ok": [6, 4, 0], "ad": "bos"}])
o = oklar[0]
g = gorunur_kare(o)
out["saplanma"] = {"durum": o["durum"], "son_z": round(o["kareler"][-1][2], 3),
                   "kalir": bool(g) and g[-1] == len(o["kareler"]) - 1,
                   "egik": o["kareler"][-1][4] < -5}
akt, ef, oklar = kos([{"t": 0.5, "aktor": "pipos", "savustur": 3.0, "dusur": "dus"},
                      {"t": 1.5, "aktor": "i1", "ok": "pipos", "ad": "ok1"}])
o = oklar[0]
sav = [e for e in ef if e["tur"] == "buz_kirigi" and "hedef" not in e]
don = [e for e in ef if e["tur"] == "buz_kirigi" and e.get("hedef") == "i1"]
pt = tepkiler(akt["pipos"])
out["savusturma"] = {"savusturuldu": o["savusturuldu"], "durum": o["durum"],
                     "i1": tepkiler(akt["i1"]), "pipos": pt,
                     "once": bool(sav) and any(an == "savun" and b < sav[0]["t"] for an, b in pt),
                     "geri_sure": round(don[0]["t"] - sav[0]["t"], 3) if sav and don else None,
                     "dusus_sesi": any(e["tur"] == "dusus" for e in ef)}
# 2b. akicilik (30 fps)
def kare_yollari(ok):
    k = ok["kareler"]
    g = [i for i, r in enumerate(k) if r and r[5]]
    return [math.dist(k[i][:3], k[i + 1][:3]) for i in g if i + 1 < len(k) and k[i + 1] and k[i + 1][5]], g
def akicilik():
    a = {}
    akt, ef, oklar = kos([{"t": 1.51, "aktor": "i1", "ok": "pipos", "ad": "ok1"}], fps=30)
    d, g = kare_yollari(oklar[0])
    k = oklar[0]["kareler"]
    gecen = (g[0] / 30.0 - 1.51) * OK.TIK
    a["normal"] = [round(min(d[:-1]), 3), round(max(d), 3)]
    a["ilk"] = [round(math.dist(k[g[0]][:3], OK.cikis_noktasi(akt["i1"])), 4), round(gecen * OK.OK_HIZ, 4)]
    son, pk = k[g[-1]], akt["pipos"].kayit[g[-1]]      # isabet karesinde Pipos (sonra itme tasir)
    a["temas"] = round(math.hypot(son[0] - pk["x"], son[1] - pk["y"]), 3)
    a["sonra_gizli"] = g[-1] + 1 < len(k) and not k[g[-1] + 1][5]
    agir = [{"t": 1.4, "sure": 1.4, "hiz": 0.25}]
    akt, ef, oklar = kos([{"t": 1.51, "aktor": "i1", "ok": "pipos", "ad": "ok1"}], fps=30, zaman=agir)
    d, g = kare_yollari(oklar[0])
    a["agir"] = [round(min(d[:-1]), 3), round(max(d[:-1]), 3)]
    akt, ef, oklar = kos([{"t": 0.5, "aktor": "pipos", "savustur": 3.0, "dusur": "dus"},
                          {"t": 1.51, "aktor": "i1", "ok": "pipos", "ad": "ok1"}], fps=30, zaman=agir)
    d, g = kare_yollari(oklar[0])
    en_uzun = say = 0
    for x in d:
        say = say + 1 if x < 0.05 else 0
        en_uzun = max(en_uzun, say)
    a["bekleme"], a["savusturuldu"] = en_uzun, oklar[0]["savusturuldu"]
    return a
out["akici"] = akicilik()

# 4. nisan
akt, ef, oklar = kos([{"t": 2.0, "aktor": "i2", "ok": "pipos"}], sure=2.5)
i2 = akt["i2"]
ezme = {t: sorted(YF.kol_ezmesi(i2.yaratik, t, [{"t": 2.0, "aktor": "i2", "ok": "pipos"}], "i2"))
        for t in (0.8, 1.2, 2.1, 2.3)}
aci_1 = [k["aci"] for k in i2.kayit if abs(k["t"] - 1.9) < 0.03][0]
beklenen = BF.yon_aci(i2.poz, akt["pipos"].poz)
out["nisan"] = {"ezme": {str(t): v for t, v in ezme.items()},
                "dondu": abs((aci_1 - beklenen + 180) % 360 - 180) < 3, "aci": [round(aci_1, 1), round(beklenen, 1)],
                "oklar_yok": len(kos([{"t": 2.0, "aktor": "i2", "ok": "pipos"}], sure=2.5, oklar_al=False)[2]) == 0}
# 5. hata
def hata_mi(olaylar):
    try:
        kos(olaylar, sure=1.0)
        return False
    except ValueError:
        return True
out["hata"] = [hata_mi([{"t": 0.2, "aktor": "yok", "ok": "pipos"}]), hata_mi([{"t": 0.2, "aktor": "i1", "ok": "yok"}]),
               hata_mi([{"t": 0.2, "aktor": "i1", "ok": "pipos", "ad": "x"}, {"t": 0.4, "aktor": "i2", "ok": "pipos", "ad": "x"}])]
# 6. model
g = BO.ok_geometri()["minecraft:geometry"][0]
zs = [c["origin"][2] for c in g["bones"][0]["cubes"]] + [c["origin"][2] + c["size"][2] for c in g["bones"][0]["cubes"]]
out["model"] = {"uc": round(min(zs), 3), "kuyruk": round(max(zs), 3), "kimlik": g["description"]["identifier"]}
import tempfile
with tempfile.TemporaryDirectory() as d:
    out["dosya"] = len(BO.uret(d))
    out["ok_varlik"] = [os.path.isfile(p) for p in YF.ok_varliklari(os.path.join(d, "v"))]

# 7. mutasyon
mut = {}
for ad, adi, deger in (("yercekimi", "YERCEKIMI", 0.0), ("hiz", "OK_HIZ", 0.8)):
    eski = getattr(OK, adi)
    setattr(OK, adi, deger)
    try:
        if ad == "yercekimi":
            mut[ad] = [round(x, 6) for x in OK.tik_adimi([0, 0, 10], [1.0, 0.0, 0.0])[1]]
        else:
            mut[ad] = round(math.sqrt(sum(x * x for x in OK.atis_hizi([0, 0, 0], [0, 10, 0]))), 6)
    finally:
        setattr(OK, adi, eski)
eski = OK.SAVUSTURMA_MENZIL
OK.SAVUSTURMA_MENZIL = 0.0
try:
    akt, ef, oklar = kos([{"t": 0.5, "aktor": "pipos", "savustur": 3.0, "dusur": "dus"},
                          {"t": 1.5, "aktor": "i1", "ok": "pipos", "ad": "ok1"}])
    mut["savusturma"] = oklar[0]["savusturuldu"]
finally:
    OK.SAVUSTURMA_MENZIL = eski
kaynak = open(os.path.join("arac", "ok_film.py"), encoding="utf-8").read()
bozuk = kaynak.replace("            hedef = (t - ok.t0) * TIK\\n",
                       "            hedef = math.floor((t - ok.t0) * TIK + 1e-9)\\n", 1)
assert bozuk != kaynak
exec(compile(bozuk, "ok_film_bozuk", "exec"), OK.__dict__)
try:
    mut["tik_arasi"] = akicilik()["normal"][0]
finally:
    exec(compile(kaynak, "ok_film", "exec"), OK.__dict__)
out["mut"] = mut
print(json.dumps(out))
`;
const r = JSON.parse(execFileSync("python3", ["-B", "-c", py], { encoding: "utf8", maxBuffer: 1 << 24 }));

console.log("1. fizik (oyunun kodundan)");
kontrol("tik: konum += hiz, hiz * 0.99, dusey -0.05", JSON.stringify(r.tik) === "[1,0,10,0.99,0,-0.05]", JSON.stringify(r.tik));
kontrol("atis: hiz 1.6 blok/tik, dusey farka yatay uzakligin 0.2'si", r.atis.hiz === 1.6 && r.atis.egim === 0.2,
        JSON.stringify(r.atis));
kontrol("cikis: iskeletin gozu 1.74 - 0.1; nisan boyunun 1/3'u (oyuncu 1.8, iskelet 1.99)",
        r.noktalar.iskelet_cikis === 1.64 && r.noktalar.insan_hedef === 0.6 && r.noktalar.iskelet_hedef === 0.6633,
        JSON.stringify(r.noktalar));

console.log("2. ucus");
const i = r.isabet;
kontrol("14 blok oteye atilan ok hedefe ~0.45 sn'de saplaniyor (32 blok/sn)",
        i.durum === "isabet" && i.sure > 0.35 && i.sure < 0.6 && JSON.stringify(i.vurulan) === '["pipos"]', JSON.stringify(i));
kontrol("vurulan darbe aliyor, atan kendi okuyla vurulmuyor",
        i.pipos.some(([an]) => an === "darbe") && i.i1.length === 0, JSON.stringify([i.pipos, i.i1]));
kontrol("bos yere atilan ok yere egik saplaniyor ve sahne boyunca kaliyor",
        r.saplanma.durum === "saplandi" && Math.abs(r.saplanma.son_z) < 0.05 && r.saplanma.kalir && r.saplanma.egik,
        JSON.stringify(r.saplanma));

console.log("2b. akicilik (30 fps)");
const a = r.akici;
kontrol("ok her karede ilerliyor: kare basina ~1,07 blok (1,6 blok/tik, 20 tik/sn)",
        a.normal[0] > 0.9 && a.normal[1] < 1.1, JSON.stringify(a.normal));
kontrol("ilk karede ok yaydan birakistan beri gecen sure kadar uzakta",
        Math.abs(a.ilk[0] - a.ilk[1]) < 0.01 && a.ilk[1] > 0.1, JSON.stringify(a.ilk));
kontrol("isabet karesinde ok temas noktasinda (eksenden 0,55), sonraki karede yok",
        Math.abs(a.temas - 0.55) < 0.02 && a.sonra_gizli, JSON.stringify([a.temas, a.sonra_gizli]));
kontrol("agir cekimde (0,25) ok her karede ~0,27 blok ilerliyor", a.agir[0] > 0.2 && a.agir[1] < 0.3,
        JSON.stringify(a.agir));
kontrol("agir cekimde savusturma noktasinda beklemiyor (ard arda en cok 1 kare < 0,05 blok)",
        a.savusturuldu && a.bekleme <= 1, JSON.stringify([a.savusturuldu, a.bekleme]));

console.log("3. savusturma");
const s = r.savusturma;
kontrol("Pipos oku atanina geri yolluyor, ok iskeleti vuruyor ve dusuruyor",
        s.savusturuldu && s.durum === "isabet" && s.i1.some(([an]) => an === "dus") && s.dusus_sesi, JSON.stringify(s));
kontrol("savunma durusu ok gelmeden basliyor, Pipos darbe almiyor",
        s.once && !s.pipos.some(([an]) => an === "darbe"), JSON.stringify(s.pipos));
kontrol("geri donen ok ~0.4 sn'de atanina variyor", s.geri_sure > 0.3 && s.geri_sure < 0.6, String(s.geri_sure));

console.log("4. nisan");
const n = r.nisan;
kontrol("iskelet birakmadan 1 sn once gerer, birakinca 0.15 sn tutar",
        JSON.stringify(n.ezme["0.8"]) === "[]" && JSON.stringify(n.ezme["1.2"]) === '["leftArm","rightArm"]' &&
        JSON.stringify(n.ezme["2.1"]) === '["leftArm","rightArm"]' && JSON.stringify(n.ezme["2.3"]) === "[]",
        JSON.stringify(n.ezme));
kontrol("gerince hedefe donuyor", n.dondu, JSON.stringify(n.aci));
kontrol("oklar listesi verilmeden de calisiyor (denetim araclari)", n.oklar_yok);

console.log("5. hata");
kontrol("bilinmeyen atan, bilinmeyen hedef, ayni adli iki ok cizimden once HATA", r.hata.every(Boolean), JSON.stringify(r.hata));

console.log("6. model");
kontrol("buz oku oyunun olcusunde: uc 3.6 px onde, kuyruk 10.8 px arkada",
        r.model.uc === -3.6 && r.model.kuyruk === 10.8 && r.model.kimlik === "geometry.buz_ok", JSON.stringify(r.model));
kontrol("uretec 35 dosya yaziyor, ok varliklari cizim klasorune", r.dosya === 35 && r.ok_varlik.every(Boolean),
        JSON.stringify([r.dosya, r.ok_varlik]));

console.log("7. mutasyon: test isiriyor");
kontrol("yercekimi 0 olunca tik kontrolu dusuyor", JSON.stringify(r.mut.yercekimi) !== "[0.99,0,-0.05]",
        JSON.stringify(r.mut.yercekimi));
kontrol("atis hizi 0.8 olunca hiz kontrolu dusuyor", r.mut.hiz !== 1.6, String(r.mut.hiz));
kontrol("savusturma menzili 0 olunca ok geri donmuyor", r.mut.savusturma === false, String(r.mut.savusturma));
kontrol("ok yalniz tik sinirinda ilerleyince 'her karede ilerliyor' dusuyor", r.mut.tik_arasi < 0.9,
        String(r.mut.tik_arasi));

console.log(hata ? "\n>>> SORUN VAR" : "\n>>> Buz oklari: oyunun fizigiyle ucuyor, saplaniyor, Pipos geri savusturuyor");
process.exit(hata ? 1 : 0);
