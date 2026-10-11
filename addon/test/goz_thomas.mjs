/* THOMAS GOZLERI -- thomas_goz.py + arac_kur.sh + KAYNAKLAR      v7.99.13

   Kullanicinin karari (2026-10-11): goz sahneleri Thomas Rig Legacy'nin
   gozleriyle, YALNIZ GOZ; sahneye gore "bir o bir o"; isima 30 + Blow Out 12.
   Blender'siz olculenler:
   1. kirmizi kalip kullanicinin sectigi ayar (Emission 30, Blow_Out 12)
   2. goz ayari: kalip + ust yazma; sol/sag ayri; bilinmeyen anahtar/kalip HATA
   3. dugum girisleri: 1_ = karakterin SAG gozu, 2_ = SOL gozu; renk RGBA, Blow_Out tamsayi
   4. kapak -1..1 -> -0.052..0.052 (kirpilir)
   5. bakis: Z iki gozde ters isaretli, olculen sinirlarda kirpilir
   6. thomas planlari kamera_izi ile AYNI kuralla secilir; goz="thomas" olup
      goz ayarli aktor yoksa HATA; thomas plani yoksa iskelet hic yuklenmez
   7. kapak/bakis anahtarlari: olay basinda eski deger, sure sonunda yeni
   8. arac_kur.sh: resmi kaynak + SHA-256 (REFERANS ile ayni), tutmazsa KURULMUYOR;
      indirme/SHA hatasi Blender kurulumunu DURDURMUYOR (bulut her oturumda bu
      betigi calistiriyor); paketten YALNIZ iskelet .blend'i aciliyor, THOMAS_RIG yaziliyor
   9. depoda Mojang dokusu yok (Steve-base.png), KAYNAKLAR.md'de satir var,
      blender_film kur()'u cagiriyor, yuz yonu yuzey normalinden ALINMIYOR
      (ilk denemede kupler ters sarili oldugu icin kafa 180 derece ters oturdu)
   Mutasyonla isirdigi gosterildi: isima 15 -> 1-3 dustu; BAKIS_ISARET ters ->
   5 ve 7 dustu; plan secimi "<" -> 6 dustu; arac_kur'da SHA kontrolu silinince
   8 dustu; _yuz_yonu p.normal'a donunce 9 dustu. (Mutasyonu
   PYTHONDONTWRITEBYTECODE=1 ile kos: ayni saniyede ayni boyda degisen dosyada
   Python eski .pyc'yi kullaniyor -- ilk denemede yanlis maddeler dustu.) */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const KOK = new URL("../", import.meta.url).pathname;
const ARAC = KOK + "arac/";
const r = JSON.parse(execFileSync("python3", ["-c", `
import sys, json; sys.path.insert(0, ${JSON.stringify(ARAC)})
import thomas_goz as T, blender_film as F
s = {}
k = T.KALIPLAR["kirmizi"]
s["kalip"] = k
a = T.goz_ayari({"kalip": "kirmizi", "sag": {"isima": 0}})
s["ayar"] = a
hatalar = []
for kotu in ({"kalip": "yok"}, {"renk": [1, 0, 0]}, {"sol": {"yayilma": 3}}):
    try:
        T.goz_ayari(kotu); hatalar.append(False)
    except ValueError:
        hatalar.append(True)
s["hatalar"] = hatalar
g = T.giris_degerleri(a)
s["giris"] = {x: list(v) if isinstance(v, tuple) else v for x, v in g.items()}
s["blow_tip"] = type(g["Blow_Out"]).__name__
s["kapak"] = [T.kapak(x) for x in (-1, -0.5, 0, 1, -3, 3)]
s["bakis"] = {"sag_tam": T.bakis(1, 0), "sol_tam": T.bakis(-1, 0), "asiri": T.bakis(5, -5)}
sen = {"fps": 30, "sure": 3, "kamera": [{"t": 0, "aci": "elle"}, {"t": 1, "aci": "elle", "goz": "thomas"}, {"t": 2, "aci": "elle"}],
       "olaylar": [{"t": 1.2, "aktor": "a", "goz_kapak": {"sag": -1}, "sure": 0.2}, {"t": 1.5, "aktor": "a", "goz_bakis": [1, 0]}]}
h = F.zaman_haritasi(sen)
kar = T.thomas_kareleri(sen, h)
# bagimsiz hesap: kamera_izi'nin kurali (t'de baslamis son plan)
bek = [f + 1 for f, t in enumerate(h) if [c for c in sen["kamera"] if c["t"] <= t + 1e-9][-1].get("goz") == "thomas"]
s["kareler"] = {"ayni": kar == bek, "aralik": T.araliklar(kar)}
try:
    T.plan(sen, h, {"a": {}}); s["ayarsiz_hata"] = False
except ValueError:
    s["ayarsiz_hata"] = True
s["plansiz"] = T.plan(dict(sen, kamera=[{"t": 0, "aci": "elle"}]), h, {"a": {"goz": {"kalip": "kirmizi"}}})
s["plan"] = T.plan(sen, h, {"a": {"goz": {"kalip": "kirmizi"}}, "b": {}})
ol = T.goz_olaylari(sen, h, "a", F.kare_bul)
s["olay"] = {"kapak": ol["kapak"], "bakis_z": [(f, v["L"][2], v["R"][2]) for f, v in ol["bakis"]],
             "f_kapak": [F.kare_bul(h, 1.2) + 1, F.kare_bul(h, 1.4) + 1]}
try:
    T.goz_olaylari(dict(sen, olaylar=[{"t": 0.5, "aktor": "a", "goz_kapak": {"orta": 1}}]), h, "a", F.kare_bul)
    s["taraf_hata"] = False
except ValueError:
    s["taraf_hata"] = True
print(json.dumps(s))`], { encoding: "utf8" }).trim().split("\n").pop());

kontrol("1. kirmizi kalip: kullanicinin secimi Emission 30 + Blow Out 12, kirmizi iris",
        r.kalip.isima === 30 && r.kalip.yayilma === 12 && r.kalip.iris.join() === "1,0,0", JSON.stringify(r.kalip));
const a = r.ayar;
kontrol("2. goz ayari: kalip iki goze, sag goze ozel isima 0, ayri=true; kotu ayarlar HATA",
        a.sol.isima === 30 && a.sag.isima === 0 && a.ayri === true && a.ortak.yayilma === 12 &&
        a.sol.iris.join() === "1,0,0" && r.hatalar.every(Boolean), JSON.stringify(r.hatalar));
const g = r.giris;
kontrol("3. girisler: 1_ = sag goz, 2_ = sol goz; renk RGBA; Blow_Out tamsayi",
        g["1_Emission"] === 0 && g["2_Emission"] === 30 && g["2_Color1"].join() === "1,0,0,1" &&
        g.Blow_Out === 12 && r.blow_tip === "int", JSON.stringify(g).slice(0, 160));
kontrol("4. kapak: -1 tam kapali -0.052, +1 iyice acik +0.052, disi kirpiliyor",
        JSON.stringify(r.kapak) === JSON.stringify([-0.052, -0.026, 0, 0.052, -0.052, 0.052]), JSON.stringify(r.kapak));
const b = r.bakis;
kontrol("5. bakis: Z iki gozde ters isaretli (L -, R + = ekranin sagi), olculen sinirlarda",
        b.sag_tam.L[2] === -0.1 && b.sag_tam.R[2] === 0.1 && b.sol_tam.L[2] === 0.05 && b.sol_tam.R[2] === -0.05 &&
        b.asiri.L[1] === -0.1 && b.asiri.L[2] === -0.15 && b.asiri.R[2] === 0.15, JSON.stringify(b));
kontrol("6. planlar kamera_izi kuraliyla; ayarsiz thomas plani HATA; plan yoksa iskelet yuklenmez",
        r.kareler.ayni && JSON.stringify(r.kareler.aralik) === "[[31,60]]" && r.ayarsiz_hata &&
        JSON.stringify(r.plansiz) === "{}" && Object.keys(r.plan).join() === "a",
        JSON.stringify(r.kareler) + " plan " + Object.keys(r.plan));
const o = r.olay;
kontrol("7. kapak/bakis: olay basinda eski deger, sure sonunda yeni; bilinmeyen taraf HATA",
        o.kapak.length === 3 && o.kapak[1][0] === o.f_kapak[0] && o.kapak[1][1].sag === 0 &&
        o.kapak[2][0] === o.f_kapak[1] && o.kapak[2][1].sag === -0.052 && o.kapak[2][1].sol === 0 &&
        o.bakis_z.length === 3 && o.bakis_z[2][1] === -0.1 && o.bakis_z[2][2] === 0.1 && r.taraf_hata,
        JSON.stringify(o));

const betik = readFileSync(ARAC + "arac_kur.sh", "utf8");
const refSha = (readFileSync(KOK + "REFERANS_THOMAS_RIG.md", "utf8").match(/SHA-256 \| `([0-9a-f]{64})`/) || [])[1];
const sha = (betik.match(/THOMAS_SHA=([0-9a-f]{64})/) || [])[1];
kontrol("8. arac_kur: resmi kaynak + SHA-256 (REFERANS ile ayni), tutmazsa KURULMUYOR ama Blender kurulumu bozulmuyor, yalniz iskelet",
        sha && sha === refSha && betik.includes("https://extensions.blender.org/download/sha256:${THOMAS_SHA}/") &&
        /"\$gercek" != "\$THOMAS_SHA" \]; then\s+echo "HATA: Thomas Rig SHA-256 TUTMUYOR[^\n]*Kurulmadi\." >&2\s+else/.test(betik) &&
        !/thomas[\s\S]{0,400}exit 1/i.test(betik.slice(betik.indexOf("# ---- Thomas Rig Legacy: yalniz"), betik.indexOf("# ---- ffmpeg"))) &&
        betik.includes('THOMAS_ICI="assets/rigs/Thomas Rig Legacy.blend"') && !/extractall\([^)]*thomas/.test(betik) &&
        betik.includes('export THOMAS_RIG="$KOK/thomas_rig/thomas_rig_legacy.blend"'), `sha ${sha && sha.slice(0, 8)} ref ${refSha && refSha.slice(0, 8)}`);

const izli = execFileSync("git", ["ls-files"], { cwd: KOK, encoding: "utf8" });
const kaynaklar = readFileSync(KOK + "KAYNAKLAR.md", "utf8");
const film = readFileSync(ARAC + "blender_film.py", "utf8");
const tg = readFileSync(ARAC + "thomas_goz.py", "utf8");
const yuz = tg.slice(tg.indexOf("def _yuz_yonu"), tg.indexOf("def kur("));
kontrol("9. Mojang dokusu yok, KAYNAKLAR'da satir var, film kur()'u cagiriyor, yuz yonu normalden degil",
        !/Steve-base\.png|thomas_rig_legacy\.blend/i.test(izli) && /\| Thomas Rig Legacy[^|]*\| BlueEvilGFX/.test(kaynaklar) &&
        /thomas_goz\.kur\(bpy, senaryo, harita, aktorler, kemik_nesne, kare_bul, B\.yol\)/.test(film) &&
        yuz.includes("p.center - merkez") && !/return p\.normal/.test(yuz), "");

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> Thomas gozleri: kullanicinin ayari, olculen sinirlar, resmi kaynak");
process.exit(hata ? 1 : 0);
