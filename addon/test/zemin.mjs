/* ZEMIN -- yatan beden yerde, aktor bastigi zeminde               v7.99.14

   Kullanici Part 2'yi izleyince (2026-10-12): "yerde yatarken havada
   yatiyormus gibi gordum" ve "yavas yavas yuruyup yere yatiyor ya, o zaman
   ucuyormus gibi oluyor; azicik daha yurusun, orada oyle yatsin".
   Uc ayri sebep olculdu (arac/zemin_denetim.py basinda yazili):
   1. yuzustu, bayil ve dus (dovus v2: vurusla dusme) son hali: bas, govde, bacaklar, kollar duz zemine
      <= 0,25 px (eskisi: yuzustu govde 3,46 px, bayil govde 4,23 px havada)
   2. zemin_yuksekligi: ayak izinin (0,6 x 0,6) altindaki EN YUKSEK blok;
      cukur "t"den once kapakli; zemin_kur ayni cukur_derinligi'yle ciziyor
      (cizilen zemin ile basilan zemin ayri kurallara ayrilmasin)
   3. Part 2 (1067-2645, dovus v2): hicbir aktor zeminden kopuk degil (havada
      vurus ve 4 karelik basamak inisi haric). Eskisi: Baris 314 kare havada.
   4. Part 2 yatislari: ana parcalarin alt yuzunun en az %90'i zeminde;
      yatan beden ayaktaki aktorun kokune en az 0,45 blok
   5. isiriyor: eski yuzustu (kafa 30 derece) 1'i, eski bayilma yeri ve
      eski El-Harkos-Baris arasi 4'u dusuruyor; zemini izlemeyen aktor
      3'te havada kalirdi (Part 2'de cukura basilan kare sayisi > 0)
   Mutasyonla isirdigi gosterildi: zaman cizelgesi zemini izlemeyince
   (hz_ = 0) 3 dustu (322 kopuk kare); film_poz'a eski yuzustu son hali
   konunca 1 ve 4 dustu (govde 3,464 px, destek 0,833); senaryoda Baris'in
   geri adimi silinince 4 dustu (El-Harkos'un kafasi 0,152 blok). */
import { execFileSync } from "node:child_process";

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const KOK = new URL("../", import.meta.url).pathname;
const r = JSON.parse(execFileSync("python3", ["-c", `
import sys, json, math, inspect
sys.path.insert(0, ${JSON.stringify(KOK + "arac/")})
import zemin_denetim as Z, blender_film as F, film_poz as FP
sen = F.B.oku("film/bolum1_orman.json")
out = {}
out["bosluk"] = {p: Z.poz_bosluklari(p, t) for p, t in (("yuzustu", 0.8), ("bayil", 1.0), ("dus", 0.7))}
ck = sen["zemin"]["cukur"]
z = lambda x, y, t=10.0: F.zemin_yuksekligi(sen, x, y, t)
erken = dict(sen, zemin=dict(sen["zemin"], cukur=dict(ck, t=30.0)))
out["zemin"] = {
    "merkez": z(ck["x"], ck["y"]), "halka": z(-2.0, -1.5), "karisik": z(-2.0, -1.0), "uzak": z(ck["x"] + 6, ck["y"]),
    "kenar_ust": z(-0.986, -0.944), "kapakli": F.zemin_yuksekligi(erken, ck["x"], ck["y"], 10.0),
    "kur_ayni": "cukur_derinligi(ck, cx, cy)" in inspect.getsource(F.zemin_kur)}
ak = Z.cizelge(sen)
d = Z.denetle(sen, sen["parcalar"]["part2"], ak)
out["kopuk"] = d["kopuk"]
out["yatis"] = d["yatis"]
out["cukurda"] = sum(1 for a in ak.values() for i, k in enumerate(ak[a.ad].kayit)
                     if sen["parcalar"]["part2"][0] <= i + 1 <= sen["parcalar"]["part2"][1] and F.zemin_yuksekligi(sen, k["x"], k["y"], k["t"]) < -0.01)
# isiriyor (eski hal, Blender'siz): eski yuzustu son hali ve eski yerler
geo = FP._geo()
eski = {"bones": {"root": {"rotation": [90, 0, 0]}, "rightLeg": {"rotation": [0, 0, 4]}, "leftLeg": {"rotation": [0, 0, -4]},
                  "head": {"rotation": [0, 30, 0]}, "rightArm": {"rotation": [0, 0, 15]}, "leftArm": {"rotation": [0, 0, -15]}}}
Z._hazir(); Z._poz[FP.ONEK + "_eski_yuzustu"] = eski
out["eski_bosluk"] = Z.poz_bosluklari("_eski_yuzustu", 0)
out["eski_bayil_destek"] = min(min(Z.destek_orani(sen, "bayil", 1.0, (-3.928, -1.159), 94.2, 0.0, y).values()) for y in (1, -1))
# eski El-Harkos yuzustu yeri ve acisi (dovus v1, kare 2141) -- dovus v2'de
# ikisi de degisti; olcu eski yerde, Baris'in geri adimdan onceki yerine
ESKI_H, ESKI_ACI = (0.934, -0.804), -625.8154617710843
noktalar = Z.iz("yuzustu", 0.8, ESKI_H, ESKI_ACI, 1) + Z.iz("yuzustu", 0.8, ESKI_H, ESKI_ACI, -1)
out["eski_ara"] = min(math.hypot(x + 0.986, y + 0.944) for x, y in noktalar)
print(json.dumps(out))`], { encoding: "utf8", cwd: KOK, maxBuffer: 1 << 26 }).trim().split("\n").pop());

const ANA = ["head", "body", "rightLeg", "leftLeg", "rightArm", "leftArm"];
for (const [p, b] of Object.entries(r.bosluk))
  kontrol(`1. ${p} son hali: bas, govde, bacaklar, kollar yerde (<= 0,25 px)`,
          ANA.every(k => b[k] <= 0.25), ANA.map(k => `${k} ${b[k]}`).join(", "));
const zm = r.zemin;
kontrol("2. zemin: cukur merkezi -0,35, halka -0,158, derin+halka ustundeki ayak halkada, kenara tasan ayak 0, uzak 0, kapak kapaliyken 0, cizim ayni kural",
        Math.abs(zm.merkez + 0.35) < 1e-9 && Math.abs(zm.halka + 0.1575) < 1e-9 && Math.abs(zm.karisik + 0.1575) < 1e-9 &&
        zm.uzak === 0 && zm.kenar_ust === 0 && zm.kapakli === 0 && zm.kur_ayni,
        JSON.stringify(zm));
kontrol("3. Part 2: aktorler bastiklari zeminde (havada vurus ve basamak inisi haric)",
        r.kopuk.length === 0, `${r.kopuk.length} kopuk kare ${JSON.stringify(r.kopuk.slice(0, 4))}; cukura basilan kare ${r.cukurda}`);
kontrol("4. Part 2 yatislari: alt yuzun >= %90'i zeminde, ayaktaki aktore >= 0,45 blok",
        r.yatis.length >= 2 && r.yatis.every(y => y.destek >= 0.9 && y.en_yakin >= 0.45),
        r.yatis.map(y => `${y.aktor} ${y.poz} kare ${y.kare}: destek ${y.destek}, en yakin ${y.en_yakin}`).join("; "));
kontrol("5. isiriyor: eski yuzustu 1'i, eski bayilma yeri ve eski El-Harkos-Baris arasi 4'u dusurur; zemini izlemeyen aktor 3'te havada kalirdi",
        Math.max(...ANA.map(k => r.eski_bosluk[k])) > 3 && r.eski_bayil_destek < 0.9 && r.eski_ara < 0.45 && r.cukurda > 0,
        `eski yuzustu govde ${r.eski_bosluk.body} px, eski bayil destek ${r.eski_bayil_destek}, eski ara ${r.eski_ara.toFixed(3)}, cukurda ${r.cukurda} kare`);

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> Yatan beden yerde, aktorler bastiklari zeminde");
process.exit(hata ? 1 : 0);
