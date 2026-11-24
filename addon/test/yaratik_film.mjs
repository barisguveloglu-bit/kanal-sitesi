/* BUZ ORDUSU FILMDE -- arac/yaratik_film.py + blender_film.py      2026-11-24

   Kullanici: "1. maddeyle baslayalim" -- yaratiklari ve Hilal Ay'i film
   aracina baglamak (piksel piksel isima, creeper'in tislamasi, creeper ve
   orumcegin yurumesi). Blender gerekmez.

   1. ayar: yaratik turu ve asamasi cizimden once denetleniyor; insan
      aktorun ayarlari (skin, form, diz, ince) yaratikta HATA
   2. silah: iskeletin varsayilani buz yayi; Hilal Ay ve buz yayi cizim
      klasorune uretiliyor (geo + doku + isima); disktekiler isimasiz
   3. yurume sayaci: oyunun kurali (hiz -> min(4 d, 1), sonum 0.4/tik,
      konum += hiz); duran yaratikta 0
   4. duruslar: zombi kollari -80 (saldirgan -120), yay durusu -90 / -5.73 /
      28.65, kol -90'da el one gidiyor (film aracinin kuraliyla)
   5. creeper ve orumcek: bacak genligi 1.4 rad / 0.4 rad, capraz ciftler,
      sag-sol simetri, durunca dinlenme pozu
   6. tislama: sisme olayla 0 -> 1 (1.5 sn), olcek oyunun formulu
      (1.393, 1.106), yanip sonme onda birlerde
   7. zaman cizelgesi: yaratikli senaryo film aracindan gecer (2 sn, 24 fps:
      49 kare); yaratigin
      dovus seti yok, insan aktor degismez
   8. mutasyon: yurume katsayisi, zombi kolunun isareti ve sisme ussu
      bozulunca ilgili kontrol dusuyor                                    */
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
const gecici = mkdtempSync(join(tmpdir(), "yaratik-film-"));
const py = `
import json, sys, os, math, importlib
sys.dont_write_bytecode = True
sys.path.insert(0, ${JSON.stringify(KOK + "arac")})
os.chdir(${JSON.stringify(KOK)})
import yaratik_film as YF
import bedrock_onizleme as B
import blender_film as BF
gec = sys.argv[1]
out = {}

# 1. ayar
def hata_mi(v):
    try:
        YF.yaratik_ayari(v)
        return False
    except ValueError:
        return True
out["ayar"] = {
    "dogru": YF.yaratik_ayari({"yaratik": "zombi", "asama": 3}) == {"tur": "zombi", "asama": 3, "insansi": True},
    "dort_ayak": YF.yaratik_ayari({"yaratik": "creeper"})["insansi"] is False,
    "yok": YF.yaratik_ayari({"skin": "x.png"}) is None,
    "hatalar": [hata_mi(v) for v in ({"yaratik": "golem"}, {"yaratik": "iskelet", "asama": 3},
                                     {"yaratik": "zombi", "asama": 0}, {"yaratik": "zombi", "skin": "x.png"},
                                     {"yaratik": "zombi", "form": "alt"}, {"yaratik": "orumcek", "asama": "2"})],
}

# 2. silah
out["silah_adi"] = [YF.silah_adi({}, YF.yaratik_ayari({"yaratik": "iskelet"})),
                    YF.silah_adi({"silah": "osmanli_topuzu"}, YF.yaratik_ayari({"yaratik": "iskelet"})),
                    YF.silah_adi({}, YF.yaratik_ayari({"yaratik": "zombi"})), YF.silah_adi({}, None)]
k = os.path.join(gec, "varlik")
hilal = YF.silah_varliklari("karanlik_tirpan_hilal", k)
yay = YF.silah_varliklari("buz_yay", k)
out["silah"] = {"hilal": [os.path.isfile(p) for p in hilal], "yay": [os.path.isfile(p) for p in yay],
                "eski": BF.silah_yollari("karanlik_tirpan", gec), "yok": BF.silah_yollari(None, gec),
                "bilinmeyen": YF.silah_varliklari("yok_boyle", k)}
v = YF.yaratik_varliklari("creeper", 2, k)
v2 = YF.yaratik_varliklari("zombi", 1, k)
out["varlik"] = {"creeper": sorted(x for x, p in v.items() if p and os.path.isfile(p)),
                 "zombi": sorted(x for x, p in v2.items() if p and os.path.isfile(p)),
                 "kimlik": B.oku(v["geo"])["minecraft:geometry"][0]["description"]["identifier"]}

# 3. yurume sayaci
dur = YF.yurume_sayaci([(0.0, 0.0)] * 48, 24)
yuru = YF.yurume_sayaci([(i * 4.3 / 24, 0.0) for i in range(96)], 24)     # 4,3 blok/sn yurume
kos = YF.yurume_sayaci([(i * 7.0 / 24, 0.0) for i in range(96)], 24)      # kosu: hiz 1'de kalir
out["sayac"] = {"dur": max(abs(a) + abs(b) for a, b in dur),
                "yuru_hiz": round(yuru[-1][1], 4), "beklenen": round(4 * 4.3 / 20, 4),
                "yuru_konum_blok": round((yuru[-1][0] - yuru[-25][0]) / (24 * 4.3 / 24), 3),
                "kos_hiz": round(kos[-1][1], 4)}

# 4. insansi duruslar
z = YF.zombi_kollari()
zs = YF.zombi_kollari(saldirgan=True)
zv = YF.zombi_kollari(vurus=0.5)
yd = YF.yay_durusu()
yb = YF.yay_durusu(20.0, -10.0)
out["durus"] = {"zombi": [round(z["rightArm"][0], 2), round(z["rightArm"][1], 2), round(z["leftArm"][1], 2)],
                "saldirgan": round(zs["rightArm"][0], 2), "vurus_kalkar": zv["rightArm"][0] > z["rightArm"][0],
                "yay": [round(yd["rightArm"][0], 2), round(yd["rightArm"][1], 2), round(yd["leftArm"][1], 2)],
                "yay_bas": [round(yb["rightArm"][0], 2), round(yb["rightArm"][1], 2)]}
# kol -90: film aracinin kuraliyla (bedrock_onizleme) el one (-z) gidiyor
g = BF.B.oku(BF.GEO_AKTOR)
m = B.Model(g, {"bones": {"rightArm": {"rotation": yd["rightArm"]}}}, 0)
el = m.nokta("rightArm", B.ic([-6, 12, 0]))
out["durus"]["el_onde"] = el[2] < -8 and abs(el[1] - 22) < 1.5
ol = [{"t": 0.0, "aktor": "z", "saldirgan": True}, {"t": 1.0, "aktor": "i", "nisan": 2.0}]
out["ezme"] = {"zombi": sorted(YF.kol_ezmesi(YF.yaratik_ayari({"yaratik": "zombi"}), 0.5, ol, "z")),
               "iskelet_once": YF.kol_ezmesi(YF.yaratik_ayari({"yaratik": "iskelet"}), 0.5, ol, "i"),
               "iskelet_nisan": sorted(YF.kol_ezmesi(YF.yaratik_ayari({"yaratik": "iskelet"}), 2.0, ol, "i")),
               "iskelet_sonra": YF.kol_ezmesi(YF.yaratik_ayari({"yaratik": "iskelet"}), 3.5, ol, "i"),
               "creeper": YF.kol_ezmesi(YF.yaratik_ayari({"yaratik": "creeper"}), 0.5, ol, "c")}

# 5. creeper, orumcek
cr = [YF.creeper_pozu(x * 0.1, 1.0) for x in range(200)]
out["creeper"] = {"genlik": round(max(abs(p["rightHindLeg"][0]) for p in cr), 2),
                  "capraz": all(abs(p["rightHindLeg"][0] - p["leftFrontLeg"][0]) < 1e-9 and
                                abs(p["leftHindLeg"][0] + p["rightHindLeg"][0]) < 1e-9 for p in cr),
                  "durgun": max(abs(v[0]) for v in YF.creeper_pozu(3.0, 0.0).values())}
import buz_ordu as BO
og = BO.geometri("orumcek", 1)
dinlenme = {b["name"]: b.get("rotation", [0, 0, 0]) for b in og["minecraft:geometry"][0]["bones"]}
orm = [YF.orumcek_pozu(dinlenme, x * 0.1, 1.0) for x in range(200)]
out["orumcek"] = {"durgun_dinlenme": all(YF.orumcek_pozu(dinlenme, 5.0, 0.0)[k_] == list(dinlenme[k_])
                                         for k_ in dinlenme if "Leg" in k_),
                  "y_genlik": round(max(abs(p["rightHindLeg"][1] - dinlenme["rightHindLeg"][1]) for p in orm), 2),
                  "simetri": all(abs((p[s][1] - dinlenme[s][1]) + (p[l][1] - dinlenme[l][1])) < 1e-9 and
                                 abs((p[s][2] - dinlenme[s][2]) + (p[l][2] - dinlenme[l][2])) < 1e-9
                                 for p in orm for s, l, _f in YF.ORUMCEK_CIFT)}

# 6. tislama
ol = [{"t": 1.0, "aktor": "c", "tisla": 1.5}]
out["tislama"] = {"sisme": [round(YF.sisme(t, ol, "c"), 3) for t in (0.5, 1.0, 1.75, 2.5, 4.0)],
                  "olcek0": [round(v, 4) for v in YF.sisme_olcegi(0.0)],
                  "olcek1": [round(v, 3) for v in YF.sisme_olcegi(1.0)],
                  "sonme": [YF.yanip_sonme(s) for s in (0.05, 0.15, 0.25, 0.35, 0.95)]}

# 7. zaman cizelgesi
sen = {"fps": 24, "sure": 2.0, "akici": True, "aktorler": {
    "a": {"skin": "Simsek_Kol_Kaynak/textures/entity/aktor/uzak_akraba.png", "silah": "karanlik_tirpan_hilal",
          "set": "antitheus", "konum": [0, 0]},
    "z": {"yaratik": "zombi", "asama": 2, "konum": [3, 4]},
    "o": {"yaratik": "orumcek", "konum": [-3, 6]}},
    "olaylar": [{"t": 0.2, "aktor": "z", "git": [3, 1]}, {"t": 0.1, "aktor": "o", "git": [-3, 2]},
                {"t": 0.3, "aktor": "z", "saldirgan": True}],
    "kamera": [{"t": 0.0, "aci": "genis", "a": "a", "b": "z"}]}
setler = B.oku(BF.HAREKET)["setler"]
anims = {}
anims.update(B.oku(BF.ANIM_WOM)["animations"]); anims.update(B.oku(BF.ANIM_AKTOR)["animations"])
akt, _e, _y, _s = BF.zaman_cizelgesi(sen, setler, anims)
out["cizelge"] = {"kare": {ad: len(a.kayit) for ad, a in akt.items()},
                  "set": {ad: a.set for ad, a in akt.items()},
                  "yaratik": {ad: (a.yaratik or {}).get("tur") for ad, a in akt.items()},
                  "yurudu": round(akt["o"].kayit[-1]["y"], 2), "senaryo_ayni": "skin" not in sen["aktorler"]["z"]}

# 8. mutasyon
mut = {}
yf = importlib.reload(YF)
kaynak = open("arac/yaratik_film.py", encoding="utf-8").read()
for ad, eski, yeni, olc in (
        ("sayac", "min(4.0 * d, 1.0)", "min(3.0 * d, 1.0)",
         lambda m_: round(m_.yurume_sayaci([(i * 4.3 / 24, 0.0) for i in range(96)], 24)[-1][1], 4)),
        ("zombi", "f6 = -math.pi / (1.5 if saldirgan else 2.25)", "f6 = math.pi / (1.5 if saldirgan else 2.25)",
         lambda m_: round(m_.zombi_kollari()["rightArm"][0], 2)),
        ("sisme", "max(0.0, min(1.0, s)) ** 4", "max(0.0, min(1.0, s)) ** 2",
         lambda m_: round(m_.sisme_olcegi(0.5)[0], 4))):
    assert kaynak.count(eski) == 1, ad
    ns = {"__file__": os.path.abspath("arac/yaratik_film.py"), "__name__": "mut"}
    exec(compile(kaynak.replace(eski, yeni), "mut", "exec"), ns)
    class M: pass
    m_ = M(); m_.__dict__.update(ns)
    mut[ad] = olc(m_)
mut["sisme_dogru"] = round(YF.sisme_olcegi(0.5)[0], 4)
out["mut"] = mut
print(json.dumps(out))
`;
try {
  const r = JSON.parse(execFileSync("python3", ["-B", "-c", py, gecici], { encoding: "utf8", maxBuffer: 1 << 24 }));

  console.log("1. ayar");
  kontrol("dogru ayar okunuyor, dort ayakli insansi degil, yaratiksiz aktor None",
          r.ayar.dogru && r.ayar.dort_ayak && r.ayar.yok);
  kontrol("bilinmeyen tur, yanlis asama, insan aktorun ayari cizimden once HATA",
          r.ayar.hatalar.every(Boolean), JSON.stringify(r.ayar.hatalar));

  console.log("2. silah");
  kontrol("iskeletin varsayilani buz yayi; yazilan silah gecerli; zombide silah yok",
          JSON.stringify(r.silah_adi) === '["buz_yay","osmanli_topuzu",null,null]', JSON.stringify(r.silah_adi));
  kontrol("Hilal Ay ve buz yayi uretiliyor (geo + doku + isima)",
          r.silah.hilal.every(Boolean) && r.silah.yay.every(Boolean) && r.silah.bilinmeyen === null);
  kontrol("diskteki silah isimasiz, silahsiz aktor None",
          JSON.stringify(r.silah.eski.slice(2)) === "[null]" && r.silah.yok === null, JSON.stringify(r.silah.eski));
  kontrol("yaratik varliklari: creeper'da tislama haritasi var, zombide yok",
          JSON.stringify(r.varlik.creeper) === '["doku","geo","isik","tislama"]' &&
          JSON.stringify(r.varlik.zombi) === '["doku","geo","isik"]' && r.varlik.kimlik === "geometry.buz_creeper_2",
          JSON.stringify(r.varlik));

  console.log("3. yurume sayaci (oyunun kurali)");
  const s = r.sayac;
  kontrol("duran yaratikta konum ve hiz 0", s.dur === 0, String(s.dur));
  kontrol("4,3 blok/sn yurumede hiz min(4 d, 1) = 0.86", Math.abs(s.yuru_hiz - s.beklenen) < 0.002,
          s.yuru_hiz + " / " + s.beklenen);
  kontrol("oturmus yurumede konum yolun 4 kati", Math.abs(s.yuru_konum_blok - 4) < 0.02, String(s.yuru_konum_blok));
  kontrol("kosuda hiz 1'de kaliyor", Math.abs(s.kos_hiz - 1) < 1e-3, String(s.kos_hiz));

  console.log("4. zombi ve iskelet");
  const d = r.durus;
  kontrol("zombi kollari -80, y -5.73 / +5.73; saldirgan -120; vurusta kol savruluyor",
          JSON.stringify(d.zombi) === "[-80,-5.73,5.73]" && d.saldirgan === -120 && d.vurus_kalkar,
          JSON.stringify(d));
  kontrol("yay durusu -90, sag -5.73, sol 28.65; kollar basla doner",
          JSON.stringify(d.yay) === "[-90,-5.73,28.65]" && JSON.stringify(d.yay_bas) === "[-100,14.27]",
          JSON.stringify([d.yay, d.yay_bas]));
  kontrol("kol -90'da el one gidiyor (film aracinin donus kuraliyla)", d.el_onde);
  const e = r.ezme;
  kontrol("zombinin kollari hep ezilir; iskelet yalniz nisan suresince; creeper'da kol yok",
          JSON.stringify(e.zombi) === '["leftArm","rightArm"]' && JSON.stringify(e.iskelet_once) === "{}" &&
          JSON.stringify(e.iskelet_nisan) === '["leftArm","rightArm"]' && JSON.stringify(e.iskelet_sonra) === "{}" &&
          JSON.stringify(e.creeper) === "{}", JSON.stringify(e));

  console.log("5. creeper ve orumcek");
  kontrol("creeper bacak genligi 1.4 rad (80.21 derece), capraz ciftler birlikte, durunca 0",
          r.creeper.genlik === 80.21 && r.creeper.capraz && r.creeper.durgun === 0, JSON.stringify(r.creeper));
  kontrol("orumcek: durunca dinlenme pozu, y genligi 0.4 rad (22.92), sag-sol simetrik",
          r.orumcek.durgun_dinlenme && r.orumcek.y_genlik === 22.92 && r.orumcek.simetri, JSON.stringify(r.orumcek));

  console.log("6. tislama");
  const t = r.tislama;
  kontrol("sisme olayla 0 -> 1 (1.5 sn), sonra 1'de", JSON.stringify(t.sisme) === "[0,0,0.5,1,1]", JSON.stringify(t.sisme));
  kontrol("olcek oyunun formulu: sismesiz 1, tam sismede 1.393 / 1.106",
          JSON.stringify(t.olcek0) === "[1,1]" && JSON.stringify(t.olcek1) === "[1.393,1.106]",
          JSON.stringify([t.olcek0, t.olcek1]));
  kontrol("yanip sonme: cift onda birlerde sonuk, teklerde 0.5..1",
          JSON.stringify(t.sonme) === "[0,0.5,0,0.5,0.95]", JSON.stringify(t.sonme));

  console.log("7. zaman cizelgesi");
  const c = r.cizelge;
  kontrol("yaratikli senaryo film aracindan geciyor (her aktor 0..48: 49 kare)",
          Object.values(c.kare).every((n) => n === 49), JSON.stringify(c.kare));
  kontrol("yaratigin dovus seti yok, insan aktorun seti degismedi",
          c.set.z === null && c.set.o === null && c.set.a === "antitheus", JSON.stringify(c.set));
  kontrol("orumcek yurudu; senaryo sozlugu degismedi (skin yazilmadi)", c.yurudu < 3 && c.senaryo_ayni,
          JSON.stringify([c.yurudu, c.senaryo_ayni]));

  console.log("8. mutasyon: test isiriyor");
  kontrol("yurume katsayisi 4 -> 3 olunca hiz kontrolu dusuyor", r.mut.sayac !== r.sayac.beklenen, String(r.mut.sayac));
  kontrol("zombi kolunun isareti donunce durus kontrolu dusuyor", r.mut.zombi !== -80, String(r.mut.zombi));
  kontrol("sisme ussu 4 -> 2 olunca olcek degisiyor", r.mut.sisme !== r.mut.sisme_dogru,
          r.mut.sisme + " / " + r.mut.sisme_dogru);
} finally {
  rmSync(gecici, { recursive: true, force: true });
}
console.log(hata ? "\n>>> SORUN VAR" : "\n>>> Buz ordusu filmde: ayar, silah, yurume, duruslar ve tislama oyunun kurallariyla");
process.exit(hata ? 1 : 0);
