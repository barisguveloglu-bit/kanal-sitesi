/* KAMERA DENETIMI -- 1. bolumun her film karesinde kamera     v7.99.10

   Kullanici: "kamera duruslari bozuk degil degil mi, sinematografi icin
   onemli." arac/kamera_denetim.py her karede olcuyor: zemin/tavan, agac
   icinde, aktor icinde, konu kadrajda ve agac onunu kapatmiyor, kesmede
   30 derece kurali, 180 derece kurali (bilerek serbest araliklar haric),
   cekim icinde sicrama. Ilk kosuda 399 sorunlu kare vardi (aktorler
   birbirinin icinden geciyordu, 180 kurali a/b sirasiyla bozuluyordu,
   yakin plan yuzu tasiyordu); hepsi kaynaginda duzeltildi.
   Burada: iki senaryo da 0 sorun + denetleyicinin isirdigi (kamera bir
   agacin icine konunca sorun buluyor).
   ORTME/ONPLAN onizlemeden sonra eklendi: denetim 0 diyordu ama alcak
   aci ve omuz ustu cekimlerde bir aktor otekini kapatiyordu. Isirdigi
   da burada: konunun arkasindaki aktorun dibine konan kamera. */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const KOK = new URL("..", import.meta.url).pathname;
const kos = (yol) => {
  try {
    return { kod: 0, cikti: execFileSync("python3", [KOK + "arac/kamera_denetim.py", yol], { encoding: "utf8" }) };
  } catch (e) {
    return { kod: e.status, cikti: String(e.stdout) };
  }
};
for (const ad of ["bolum1_orman.json", "bolum1_oda.json"]) {
  const r = kos(KOK + "film/" + ad);
  kontrol(ad + ": her karede kamera temiz", r.kod === 0, r.cikti.split("\n")[0]);
}
// isiriyor mu: ormanin ilk cekimini bir agacin govdesine koy
const sen = JSON.parse(readFileSync(KOK + "film/bolum1_orman.json", "utf8"));
const agac = JSON.parse(execFileSync("python3", ["-c",
  `import sys,json; sys.path.insert(0, ${JSON.stringify(KOK + "arac")}); import blender_film as F
print(json.dumps(F.agac_yerleri(json.loads(sys.stdin.read()))[0]))`], { input: JSON.stringify(sen), encoding: "utf8" }));
sen.kamera.unshift({ t: 0, aci: "elle", kam: [agac[0] + 0.5, agac[1] + 0.5, 1.0], bak: "b" });
sen.kamera.splice(1, 1);
const gec = join(mkdtempSync(join(tmpdir(), "kd-")), "s.json");
writeFileSync(gec, JSON.stringify(sen));
const m = kos(gec);
kontrol("isiriyor: agacin icindeki kamera yakalaniyor", m.kod !== 0 && m.cikti.includes("[AGAC]"),
        m.cikti.split("\n")[0]);
// isiriyor mu (ORTME/ONPLAN, v7.99.10 onizlemesi): bir dovus anina
// konunun ARKASINDAN, oteki aktorun omzunun dibinden bakan elle kamera
const kayit = JSON.parse(execFileSync("python3", ["-c",
  `import sys,json; sys.path.insert(0, ${JSON.stringify(KOK + "arac")}); import blender_film as F, bedrock_onizleme as B
s = json.loads(sys.stdin.read()); ak = F.zaman_cizelgesi(s, B.oku(F.HAREKET)["setler"], {})[0]
h = F.zaman_haritasi(s); f = F.kare_bul(h, 60.0)
print(json.dumps([ak["b"].kayit[f], ak["h"].kayit[f]], default=str))`], { input: readFileSync(KOK + "film/bolum1_orman.json", "utf8"), encoding: "utf8" }));
const [rb, rh] = kayit;
const ux = rb.x - rh.x, uy = rb.y - rh.y, n = Math.hypot(ux, uy);
const sen2 = JSON.parse(readFileSync(KOK + "film/bolum1_orman.json", "utf8"));
// h'nin arkasinda, b'ye bakan cizgi tam h'nin govdesinden gecer
sen2.kamera.push({ t: 59.9, aci: "elle", kam: [rh.x - ux / n * 0.9, rh.y - uy / n * 0.9, 1.3], bak: "b", bak_yuks: 1.2 },
                 { t: 60.4, aci: "genis", a: "b", b: "h" });
const gec2 = join(mkdtempSync(join(tmpdir(), "kd-")), "s.json");
writeFileSync(gec2, JSON.stringify(sen2));
const m2 = kos(gec2);
kontrol("isiriyor: konuyu baska aktorun govdesi ortunce yakalaniyor", m2.kod !== 0 && m2.cikti.includes("[ORTME]"),
        (m2.cikti.match(/.*\[ORTME\].*/) || [m2.cikti.split("\n")[0]])[0].trim());
kontrol("isiriyor: kameranin dibindeki aktor (on plan) yakalaniyor", m2.cikti.includes("[ONPLAN]"),
        (m2.cikti.match(/.*\[ONPLAN\].*/) || ["yok"])[0].trim());

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> kamera: her karede temiz, denetim isiriyor");
process.exit(hata ? 1 : 0);
