/* KAR FIRTINASI VE YILDIRIM -- arac/firtina.py                     2026-11-25

   Kullanici: "Sirada 3. madden devam et" (3. madde: sis duvariyla yogun kar
   firtinasi ve simsek). Blender gerekmez; cizim blender_film.firtina_gok_kur
   ve firtina_kar_kur (onizlemeyle bakildi).

   1. yildirimin omru (LightningBolt): ilk tikte gok gurultusu; ilk cakistan
      sonra 1-3 yeniden cakis (flashes = rastgele(3) + 1), her yeniden cakista
      bicim degisir (2-4 bicim); her cakis 2 tik parlar
   2. yildirimin bicimi (LightningBoltRenderer): 8 parca x 16 blok = 128; ana
      cizgi carpma noktasinda biter, her parcada en cok 5 blok kayar; 2 dal x
      3 parca, en cok 15 blok; 4 katman, yari genislik 0,1..0,7
   3. ayar: gelis adlari, yanlis ad, yogunluk 0..1, kamera kaydinda firtina,
      atmosferle birlikte HATA; yogunluk egrisi; kar sayisi yogunlukla;
      ruzgar firtinanin geldigi yonun tersine
   4. yildirimlar: yazili liste zamana gore; {"sayi", "tohum"} ayni tohumla
      ayni, firtina duvarinin yonunde ve uzakliginda
   5. gok gurultusu: uzaklik / 343 sn sonra, uzakta daha kisik
   6. mutasyon: kayma, omur ve ses hizi bozulunca ilgili kontrol dusuyor */
import { execFileSync } from "node:child_process";

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const KOK = new URL("..", import.meta.url).pathname;
const py = `
import json, sys, os, math
sys.dont_write_bytecode = True
sys.path.insert(0, ${JSON.stringify(KOK + "arac")})
import firtina as FR
out = {}

def omur_ozet():
    flas, ses_ilk, parlama_2, bicim_degisir = set(), True, True, True
    for t in range(1, 301):
        o = FR.yildirim_omru(t)
        bicim = max(k["bicim"] for k in o) + 1
        flas.add(bicim)
        ses_ilk &= [k["tik"] for k in o if k["ses"]] == [0]
        parlama_2 &= sum(1 for k in o if k["parlama"]) == 2 * bicim
        ilk = [k for k in o if k["bicim"] == 0]
        parlama_2 &= [k["tik"] for k in ilk if k["parlama"]] == [0, 1]
    return {"flas": sorted(flas), "ses_ilk": ses_ilk, "parlama_2": parlama_2}
out["omur"] = omur_ozet()

def bicim_ozet():
    ana_kayma = dal_kayma = 0.0
    sonda, tepe, dallar, parca_boy = True, True, True, True
    for t in range(1, 201):
        b = FR.yildirim_bicimi(t)
        ana = [p for p in b if p["dal"] == 0]
        sonda &= ana[-1]["alt"] == (0.0, 0, 0.0)
        tepe &= ana[0]["ust"][1] == 128
        dallar &= [len([p for p in b if p["dal"] == d]) for d in (1, 2)] == [3, 3]
        for p in b:
            parca_boy &= p["ust"][1] - p["alt"][1] == 16
            k = max(abs(p["alt"][0] - p["ust"][0]), abs(p["alt"][2] - p["ust"][2]))
            if p["dal"] == 0:
                ana_kayma = max(ana_kayma, k)
            else:
                dal_kayma = max(dal_kayma, k)
    return {"sonda": sonda, "tepe": tepe, "dallar": dallar, "parca": parca_boy, "ana": ana_kayma, "dal": dal_kayma,
            "genislik": [round(FR.yari_genislik(k), 2) for k in range(FR.KATMAN)], "renk": list(FR.RENK), "saydam": FR.SAYDAM}
out["bicim"] = bicim_ozet()

def hata_mi(sen):
    try:
        FR.ayar(sen)
        return False
    except ValueError:
        return True
f = FR.ayar({"firtina": {"yogunluk": [[0.0, 0.2], [4.0, 1.0]], "gelis": "dogu"}})
out["ayar"] = {"yok": FR.ayar({}) is None, "gelis": f["gelis"],
               "kuzey": FR.ayar({"firtina": {"gelis": "kuzey"}})["gelis"],
               "egri": [round(FR.yogunluk(f, t), 3) for t in (-1.0, 0.0, 2.0, 4.0, 9.0)],
               "kar": [FR.kar_sayisi(f, 0.0), FR.kar_sayisi(f, 4.0)], "ruzgar": FR.ruzgar(f),
               "hata": [hata_mi({"firtina": {"gelis": "yukari"}}), hata_mi({"firtina": {"yogunluk": [[0.0, 1.4]]}}),
                        hata_mi({"firtina": {}, "kamera": [{"t": 0, "firtina": {}}]}),
                        hata_mi({"firtina": {"gelis": "dogu"}, "atmosfer": {"yogunluk": 0.5}})]}

g = FR.ayar({"firtina": {"yildirim": [{"t": 3.0, "nokta": [200, 0]}, {"t": 1.0, "nokta": [180, 30], "tohum": 9}]}})
yl = FR.yildirimlar(g, 5.0)
h = FR.ayar({"firtina": {"yildirim": {"sayi": 6, "tohum": 4}, "duvar": {"uzaklik": [[0.0, 200.0]], "aci": 120}}})
a1, a2 = FR.yildirimlar(h, 8.0), FR.yildirimlar(h, 8.0)
yon_ok = all(abs(math.degrees(math.atan2(y["nokta"][1], y["nokta"][0]))) <= 120.0 * 0.4 + 1e-6 for y in a1)
uz_ok = all(200 * 0.85 - 1e-6 <= math.hypot(*y["nokta"]) <= 200 * 1.25 + 1e-6 for y in a1)
out["yildirim"] = {"sira": [y["t"] for y in yl], "tohum": yl[0]["tohum"], "sayi": len(a1),
                   "ayni": [(y["t"], y["nokta"]) for y in a1] == [(y["t"], y["nokta"]) for y in a2],
                   "yon": yon_ok, "uzak": uz_ok}

k = FR.ayar({"firtina": {"yildirim": [{"t": 2.0, "nokta": [343.0, 0.0]}, {"t": 2.0, "nokta": [100.0, 0.0]}]}})
ses = FR.gurultu_sesleri(k, 5.0, lambda t: t)
out["ses"] = {"gecikme": round(FR.gurultu_gecikmesi([343.0, 0.0], [0.0, 0.0]), 6),
              "uzak": [round(s[1], 3) for s in ses if s[0].endswith("000.ogg")],
              "duzey": [round(s[2], 3) for s in ses if s[0].endswith("000.ogg")]}

mut = {}
eski = FR.ANA_KAYMA
FR.ANA_KAYMA = 21
try:
    mut["kayma"] = bicim_ozet()["ana"]
finally:
    FR.ANA_KAYMA = eski
eski = FR.YILDIRIM_LIFE
FR.YILDIRIM_LIFE = 3
try:
    mut["omur"] = omur_ozet()["parlama_2"]
finally:
    FR.YILDIRIM_LIFE = eski
eski = FR.SES_HIZI
FR.SES_HIZI = 1000.0
try:
    mut["ses"] = round(FR.gurultu_gecikmesi([343.0, 0.0], [0.0, 0.0]), 6)
finally:
    FR.SES_HIZI = eski
out["mut"] = mut
print(json.dumps(out))
`;
const r = JSON.parse(execFileSync("python3", ["-B", "-c", py], { encoding: "utf8", maxBuffer: 1 << 24 }));

console.log("1. yildirimin omru (LightningBolt)");
const o = r.omur;
kontrol("ilk cakistan sonra 1-3 yeniden cakis: 2-4 bicim (300 tohumda ucu de)", JSON.stringify(o.flas) === "[2,3,4]",
        JSON.stringify(o.flas));
kontrol("gok gurultusu yalniz ilk tikte", o.ses_ilk);
kontrol("her cakis 2 tik parliyor (ilki 0. ve 1. tik)", o.parlama_2);

console.log("2. yildirimin bicimi (LightningBoltRenderer)");
const b = r.bicim;
kontrol("8 parca x 16 blok, tepe 128, ana cizgi carpma noktasinda bitiyor", b.sonda && b.tepe && b.parca,
        JSON.stringify([b.sonda, b.tepe, b.parca]));
kontrol("ana cizgi parca basina en cok 5, dallar en cok 15 blok kayiyor; 2 dal x 3 parca",
        b.ana <= 5 && b.ana >= 4 && b.dal <= 15 && b.dal >= 10 && b.dallar, JSON.stringify([b.ana, b.dal, b.dallar]));
kontrol("4 katman, yari genislik 0,1 / 0,3 / 0,5 / 0,7; renk (0,45, 0,45, 0,5), saydamlik 0,3",
        JSON.stringify(b.genislik) === "[0.1,0.3,0.5,0.7]" && JSON.stringify(b.renk) === "[0.45,0.45,0.5]" && b.saydam === 0.3,
        JSON.stringify([b.genislik, b.renk, b.saydam]));

console.log("3. ayar");
const a = r.ayar;
kontrol("firtina yazilmazsa yok; dogu [1, 0], kuzey [0, 1]", a.yok && JSON.stringify(a.gelis) === "[1,0]" &&
        JSON.stringify(a.kuzey) === "[0,1]", JSON.stringify([a.gelis, a.kuzey]));
kontrol("yogunluk egrisi uclarda sabit, arada dogrusal", JSON.stringify(a.egri) === "[0.2,0.2,0.6,1,1]",
        JSON.stringify(a.egri));
kontrol("kar sayisi yogunlukla (12000 x 0,2 -> 12000); ruzgar firtinanin tersine (batiya)",
        JSON.stringify(a.kar) === "[2400,12000]" && a.ruzgar[0] < 0 && Math.abs(a.ruzgar[1]) < 1e-9,
        JSON.stringify([a.kar, a.ruzgar]));
kontrol("yanlis yon, 1'i asan yogunluk, kamera kaydinda firtina, atmosferle birlikte: HATA",
        a.hata.every(Boolean), JSON.stringify(a.hata));

console.log("4. yildirimlar");
const y = r.yildirim;
kontrol("yazili liste zamana gore siralaniyor, tohum korunuyor", JSON.stringify(y.sira) === "[1,3]" && y.tohum === 9,
        JSON.stringify([y.sira, y.tohum]));
kontrol("{sayi, tohum}: ayni tohum ayni yildirimlar, firtina duvarinin yonunde ve uzakliginda",
        y.sayi === 6 && y.ayni && y.yon && y.uzak, JSON.stringify(y));

console.log("5. gok gurultusu");
const s = r.ses;
kontrol("343 blok uzakta 1 sn sonra (isik aninda)", s.gecikme === 1, String(s.gecikme));
kontrol("yakindaki once ve daha yuksek", s.uzak[0] > s.uzak[1] && s.duzey[0] < s.duzey[1], JSON.stringify(s));

console.log("6. mutasyon: test isiriyor");
kontrol("ana kayma rastgele(21) olunca kayma kontrolu dusuyor", r.mut.kayma > 5, String(r.mut.kayma));
kontrol("omur life 3 olunca parlama kontrolu dusuyor", r.mut.omur === false, String(r.mut.omur));
kontrol("ses hizi 1000 olunca gecikme kontrolu dusuyor", r.mut.ses !== 1, String(r.mut.ses));

console.log(hata ? "\n>>> SORUN VAR" : "\n>>> Firtina: yildirim oyunun bicim ve zamanlamasiyla, gok gurultusu uzaklikla gecikiyor");
process.exit(hata ? 1 : 0);
