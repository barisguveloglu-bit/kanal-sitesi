/* TEK KARELIK DONUS + 4. SAHNE BAKISLARI                         v7.99.12

   Part 1 denetiminde kare 900'de El-Harkos bir kare 18 derece donup geri
   geliyordu (849 ve 945'te de). Sebep: 592'de baslayan yuruyusu carpisma
   yuzunden bitmiyor, yuruyus yonu her karede "bak"i eziyordu -- 4. sahnede
   kopyalara hic donmedi (k2 tam arkasinda belirdi, donmedi).
   Ilk cozum (db74bfd) yalniz tek karelik sivriyi suzuyordu. Uzun denetimde
   kok neden 4. sahne icin kapatildi: senaryonun "bak_serbest" araliginda
   yuruyus yonu bak'i ezmez. Aralik disinda davranis eskisiyle ayni.
   1. iki senaryoda da hicbir aktorde tek karelik aci sivrisi yok
   2. sivriler kaynaginda yok: suzgec orman ve oda'da HIC kare degistirmiyor
      (guvenlik agi olarak kaliyor)
   3. El-Harkos her kopyaya donuyor (bak'tan 0.3 sn sonra < 5 derece)
   4. bak_serbest yalniz 849-1038'i degistiriyor; Part 2 (1067+) konum,
      aci, kamera, eylem, efekt ve altyazi olarak BIRE BIR ayni (cizilmis
      Part 2 kareleri gecerli kaliyor)
   5. genel kok duzeltme (takilan yuruyusu bitirmek) 2. bolumden once:
      SERI_SEZON1.md'de bilinen hata olarak kayitli
   Mutasyonla isirdigi gosterildi: aralik kosulu kaldirilinca 3 dustu;
   aralik Part 2'ye uzatilinca 4 dustu.
   v7.99.14: Part 2 yeniden ciziliyor (yatma/zemin duzeltmesi) ve Part 2'ye
   IKINCI bir aralik girdi: El-Harkos one devrilirken Baris ona bakarak geri
   adim atiyor (62,9-63,8 sn). 4 artik iki araligi AYRI olcuyor: Part 1
   araligi yine yalniz 849-1038'i degistiriyor ve Part 2'ye HIC dokunmuyor;
   Part 2 araligi yalniz kendi geri adimini (aralik basi + 2,6 sn; dovus
   v1'de 62,9-65,5, v2'de 69,2-71,8) degistiriyor. */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const ADDON = new URL("../", import.meta.url).pathname;
const r = JSON.parse(execFileSync("python3", ["-c", `
import sys, json, copy; sys.path.insert(0, "arac")
import blender_film as F, bedrock_onizleme as B
setler = B.oku(F.HAREKET)["setler"]
n = lambda d: (d + 180) % 360 - 180
def temiz(v):
    if isinstance(v, dict): return {k: (getattr(x, "ad", None) if k == "hedef" else temiz(x)) for k, x in v.items() if k != "vuruldu"}
    if isinstance(v, (list, tuple)): return [temiz(x) for x in v]
    # 1e-9: Part 1'in bakisi Part 2'deki bir konumu son basamakta oynatabiliyor
    # (dovus v2: toprak efektinin x'i 1e-15 farkli cikti; konum denetimi 1e-6)
    if isinstance(v, float): return round(v, 9)
    return v
cikti = {}
for ad in ("bolum1_orman", "bolum1_oda"):
    sen = B.oku("film/%s.json" % ad)
    ham, *_ = F.zaman_cizelgesi(sen, setler, {}, suz=False)
    duz, *_ = F.zaman_cizelgesi(sen, setler, {})
    sivri = {a: [f + 1 for f in range(1, len(k.kayit) - 1)
                 if abs(n(k.kayit[f]["aci"] - k.kayit[f - 1]["aci"])) > 0.5
                 and abs(n(k.kayit[f + 1]["aci"] - k.kayit[f - 1]["aci"])) < 0.5] for a, k in duz.items()}
    fark = sorted({"%s:%d" % (a, f + 1) for a in ham for f in range(len(ham[a].kayit))
                   if any(ham[a].kayit[f][x] != duz[a].kayit[f][x] for x in ("x", "y", "z", "aci"))})
    cikti[ad] = {"sivri": {a: v for a, v in sivri.items() if v}, "suzgec": fark}
    if ad != "bolum1_orman":
        continue
    # 3. her kopyaya donus: bak olayindan 0.3 sn sonra
    fps = sen["fps"]
    don = {}
    for o in sen["olaylar"]:
        if o.get("aktor") == "h" and isinstance(o.get("bak"), list) \
                and any(b0 <= o["t"] <= b1 for b0, b1 in sen.get("bak_serbest", [])):
            f = int(round((o["t"] + 0.3) * fps))
            h = duz["h"].kayit[f]
            don["%.2f" % o["t"]] = round(abs(n(h["aci"] - F.yon_aci((h["x"], h["y"]), o["bak"]))), 2)
    cikti[ad]["donus"] = don
    # 4. Part 1 araligi olmadan: degisen kareler ve Part 2 kimligi
    p2t = F.zaman_haritasi(sen)[sen["parcalar"]["part2"][0] - 1]
    eski = copy.deepcopy(sen); eski["bak_serbest"] = [b for b in sen["bak_serbest"] if b[0] >= p2t]
    e, ef_e, ya_e, *_ = F.zaman_cizelgesi(eski, setler, {})
    y, ef_y, ya_y, *_ = F.zaman_cizelgesi(sen, setler, {})
    ke, ky = F.kamera_izi(eski, e), F.kamera_izi(sen, y)
    p2 = sen["parcalar"]["part2"][0]
    degisen = [f + 1 for f in range(len(e["h"].kayit))
               if any(abs(e[a].kayit[f][x] - y[a].kayit[f][x]) > 1e-6 for a in e for x in ("x", "y", "z"))
               or any(abs(n(e[a].kayit[f]["aci"] - y[a].kayit[f]["aci"])) > 1e-6 for a in e)
               or any(abs(p - q) > 1e-6 for p, q in zip(list(ke[f][0]) + list(ke[f][1]), list(ky[f][0]) + list(ky[f][1])))]
    p2_alan = sum(1 for f in range(p2 - 1, len(e["h"].kayit)) for a in e for k in e[a].kayit[f]
                  if k != "aci" and temiz(e[a].kayit[f][k]) != temiz(y[a].kayit[f][k]))
    # 4b. Part 2 araligi (Baris'in geri adimi) yalniz kendini degistiriyor
    eski2 = copy.deepcopy(sen); eski2["bak_serbest"] = [b for b in sen["bak_serbest"] if b[0] < p2t]
    e2, *_ = F.zaman_cizelgesi(eski2, setler, {})
    hr = F.zaman_haritasi(sen)
    degisen2 = [f + 1 for f in range(len(e2["h"].kayit))
                if any(abs(n(e2[a].kayit[f]["aci"] - y[a].kayit[f]["aci"])) > 1e-6
                       or any(abs(e2[a].kayit[f][x] - y[a].kayit[f][x]) > 1e-6 for x in ("x", "y", "z")) for a in e2)]
    p2_ar = [b for b in sen["bak_serbest"] if b[0] >= p2t]
    cikti[ad]["p2_aralik"] = {"aralik": p2_ar, "adet": len(degisen2),
                              "ilk": degisen2[0] if degisen2 else None, "son": degisen2[-1] if degisen2 else None,
                              "alt": F.kare_bul(hr, p2_ar[0][0]) + 1 if p2_ar else None,
                              "ust": F.kare_bul(hr, p2_ar[0][0] + 2.6) + 1 if p2_ar else None}
    cikti[ad].update({"ilk": degisen[0] if degisen else None, "son": degisen[-1] if degisen else None,
                      "adet": len(degisen), "p2": [f for f in degisen if f >= p2][:5], "p2_alan": p2_alan,
                      "efekt_ayni": temiz(ef_e) == temiz(ef_y), "yazi_ayni": temiz(ya_e) == temiz(ya_y), "aralik": sen.get("bak_serbest")})
print(json.dumps(cikti))`], { encoding: "utf8", cwd: ADDON }).trim());

const o = r.bolum1_orman, d = r.bolum1_oda;
kontrol("orman: hicbir aktorde tek karelik donus yok", Object.keys(o.sivri).length === 0, JSON.stringify(o.sivri));
kontrol("oda: hicbir aktorde tek karelik donus yok", Object.keys(d.sivri).length === 0, JSON.stringify(d.sivri));
kontrol("sivriler kaynaginda yok: suzgec orman'da hic kare degistirmiyor", o.suzgec.length === 0, JSON.stringify(o.suzgec));
kontrol("oda sahnesinde suzgec hic kare degistirmiyor", d.suzgec.length === 0, JSON.stringify(d.suzgec));
const don = Object.values(o.donus);
kontrol("El-Harkos 3 kopyaya da donuyor (bak'tan 0.3 sn sonra < 5 derece)", don.length === 3 && don.every((x) => x < 5),
        JSON.stringify(o.donus));
kontrol("bak_serbest'in Part 1 araligi yalniz 849-1038'i degistiriyor", o.ilk === 849 && o.son === 1038 && o.adet === 190,
        `${o.ilk}-${o.son}, ${o.adet} kare, aralik ${JSON.stringify(o.aralik)}`);
kontrol("Part 1 araligi Part 2'ye dokunmuyor (konum/aci/kamera + diger alanlar)", o.p2.length === 0 && o.p2_alan === 0,
        JSON.stringify([o.p2, o.p2_alan]));
const q = o.p2_aralik;
kontrol("Part 2 araligi (Baris'in geri adimi) yalniz kendi karelerini degistiriyor", q.adet > 0 && q.ilk >= q.alt && q.son <= q.ust,
        `${q.ilk}-${q.son}, ${q.adet} kare, sinir ${q.alt}-${q.ust}, aralik ${JSON.stringify(q.aralik)}`);
kontrol("efektler ve altyazilar degismiyor", o.efekt_ayni && o.yazi_ayni);
const kayit = readFileSync(ADDON + "SERI_SEZON1.md", "utf8");
kontrol("genel kok duzeltme SERI_SEZON1.md'de bilinen hata olarak kayitli",
        kayit.includes("Bilinen hata") && kayit.includes("takılan yürüyüş") && kayit.includes("bak_serbest"));

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> 4. sahne: El-Harkos kopyalara donuyor; Part 1 araligi Part 2ye dokunmuyor");
process.exit(hata ? 1 : 0);
