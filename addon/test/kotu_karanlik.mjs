/* KOTUNUN KARANLIGI -- oda sahnesi (1. bolum, 7. sahne)           v7.99.14

   Kullanici (2026-10-12): "karanlık gözükmesi lazımdı yani ışığın gelmemesi
   lazımdı ... bedeni yok sadece gözü var", 8 kat parlatilmis onizlemede
   "340 daha beyaz 610 kare siyah" ve "etrafı da karanlık kendisi de
   karanlık sadece gözleri gözükecek". Olculen cozum (Blender'da, 960x540,
   64 ornek): 340'ta beden 6,69 -> 1,62/255, kare ortalamasi 2,53/255;
   610 eskisiyle ayni. Kompozitor Blender ister; bu test Blender'siz,
   kurulumun DAYANDIGI seyleri tutar:
   1. senaryo: "kotu" aktoru var, skini kullanicinin dosyasi (bire bir),
      gozler kotunun kafasinda (goz_bak YOK), kotu yerinden oynamiyor
      (karanlik bolgenin merkezi sabit)
   2. beden butun isiklardan dislaniyor ve simsiyah (isik baglamasi,
      renk / yansima 0)
   3. kompozitor: bedenin kapsami (Cryptomatte) ile karanlik bolgenin
      buyugu; icinde yalniz gozlerin isik grubu (gurultu gidericiden
      gecmis); konum SISSIZ ayri katmandan (ana katmanin konumu sisle
      kayiyor, ilk onizlemede maske karincalandi)
   4. son yakin plan kotuye bagli (kamera denetimi onu konu sayiyor)
   Mutasyonla isirdigi gosterildi: sis katmandan dislanmayinca 3,
   skin md5'i degisince 1 dustu. */
import { execFileSync } from "node:child_process";

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const KOK = new URL("../", import.meta.url).pathname;
const r = JSON.parse(execFileSync("python3", ["-c", `
import sys, json, hashlib, inspect
sys.path.insert(0, ${JSON.stringify(KOK + "arac/")})
import blender_film as F
sen = F.B.oku("film/bolum1_oda.json")
o = sen["oda"]; k = o.get("kotu"); g = sen["aktorler"].get(k, {})
skin = g.get("skin", "")
out = {"kotu": k, "skin": skin,
       "md5": hashlib.md5(open(skin, "rb").read()).hexdigest() if skin else None,
       "kaynak_md5": hashlib.md5(open("kaynak_doku/aktor/zifiri_kotu.png", "rb").read()).hexdigest(),
       "goz_bak": [x["t"] for x in sen["olaylar"] if "goz_bak" in x],
       "hareket": [x["t"] for x in sen["olaylar"] if x.get("aktor") == k and ("git" in x or "kacin" in x or "vur" in x)],
       "gizli": bool(g.get("gizli"))}
oda = inspect.getsource(F.oda_kur); kk = inspect.getsource(F.kotu_karanlik_kur)
out["isik"] = all(s in oda for s in ('link_state = "EXCLUDE"', "receiver_collection = kc", '"Base Color"].default_value = (0, 0, 0, 1)',
                                     '"Specular IOR Level"].default_value = 0.0', "goz_k.parent = kemik_nesne[kotu][\\"head\\"]"))
out["komp"] = {"crypto": "CompositorNodeCryptomatteV2" in kk and "matte_id" in kk,
               "grup": "lightgroups.add" in kk and "Combined_" in kk and "CompositorNodeDenoise" in kk,
               "buyuk": 'operation = "MAXIMUM"' in kk and '"SMOOTHSTEP"' in kk,
               "sissiz": 'view_layers.new("kotu_konum")' in kk and ".exclude = True" in kk and "rk.outputs[\\"Position\\"]" in kk,
               "ana_konum_yok": "rl.outputs[\\"Position\\"]" not in kk,
               "cagri": "kotu_karanlik_kur(bpy, kotu_parca" in oda and ", sk)" in oda}
son = [c for c in sen["kamera"] if c["t"] == max(c2["t"] for c2 in sen["kamera"])][0]
out["son_kamera"] = son.get("bak")
print(json.dumps(out))`], { encoding: "utf8", cwd: KOK }).trim().split("\n").pop());

kontrol("1. senaryo: kotu aktoru, skini kullanicinin dosyasi bire bir, gozler kafada, yerinden oynamiyor",
        r.kotu === "g" && r.md5 === "f40137a84c07b6cfc176dbd99d5e7f7b" && r.kaynak_md5 === r.md5 &&
        r.goz_bak.length === 0 && r.hareket.length === 0 && !r.gizli,
        `kotu ${r.kotu}, md5 ${r.md5}, goz_bak ${JSON.stringify(r.goz_bak)}, hareket ${JSON.stringify(r.hareket)}`);
kontrol("2. beden butun isiklardan dislaniyor ve simsiyah", r.isik);
kontrol("3. kompozitor: kapsam + karanlik bolge (buyugu), icinde gozlerin isik grubu, konum sissiz katmandan",
        Object.values(r.komp).every(Boolean), JSON.stringify(r.komp));
kontrol("4. son yakin plan kotuye bagli", r.son_kamera === r.kotu, String(r.son_kamera));

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> Kotu karanlikta: yalniz gozleri gorunuyor");
process.exit(hata ? 1 : 0);
