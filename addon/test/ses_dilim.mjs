/* SES DILIMI -- film_birlestir.ses_dilimi                       v7.99.14

   Part 2'de (2026-10-12) orman sahnesinin SON karesi (2456) filme girmedi:
   ses dilimi int(2456 / 30 * 48000) ile kesiliyordu, kayan noktada
   3929599.9999999995 -> ses goruntuden 1 ornek kisa -> "-shortest" son
   kareyi atti, oda'ya geciste 1 karelik zaman boslugu kaldi (ffprobe
   paket zamanlari: tek 0.066 sn adim; kare_dogrula2: orman 2456 PSNR 17.8).
   1..3000 arasinda 182 kare siniri bu hataya dusuyordu; Part 1'in siniri
   (1066) dusmuyordu, o yuzden Part 1 temiz cikti (1159 kare, bosluk yok).
   1. bolumlerin "parcalar" araliklari: ses dilimi = kare * 48000 / fps, TAM
   2. butun sinirlar 1..3000: her aralik tam boy, ardisik araliklar bitisik
   Mutasyonla isirdigi gosterildi: eski int(b / fps * ORAN) formulune
   donulunce 1 ve 2 dustu (2456 ve 182 sinir). */
import { execFileSync } from "node:child_process";

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const KOK = new URL("../", import.meta.url).pathname;
const r = JSON.parse(execFileSync("python3", ["-c", `
import sys, json, glob
sys.path.insert(0, ${JSON.stringify(KOK + "arac/")})
import film_birlestir as FB, film_ses
s = {"parca": [], "bozuk": []}
for yol in sorted(glob.glob("film/*.json")):
    sen = json.load(open(yol, encoding="utf-8"))
    fps = sen.get("fps", 24)
    for ad, (a, b) in sen.get("parcalar", {}).items():
        d = FB.ses_dilimi([a, b], fps)
        s["parca"].append([yol, ad, a, b, d.stop - d.start, (b - a + 1) * film_ses.ORAN / fps])
for b in range(1, 3001):
    d = FB.ses_dilimi([1, b], 30)
    e = FB.ses_dilimi([b + 1, b + 7], 30)
    if d.stop - d.start != b * 1600 or e.start != d.stop:
        s["bozuk"].append(b)
print(json.dumps(s))`], { encoding: "utf8", cwd: KOK }).trim().split("\n").pop());

kontrol("1. bolum araliklari: ses dilimi kare suresine TAM esit (Part 2 orman 1067-2456 dahil)",
        r.parca.length >= 2 && r.parca.every(p => p[4] === p[5]) && r.parca.some(p => p[2] === 1067 && p[3] === 2456),
        r.parca.map(p => `${p[1]} ${p[2]}-${p[3]}: ${p[4]}/${p[5]}`).join(", "));
kontrol("2. 1..3000 butun sinirlar: tam boy ve bitisik", r.bozuk.length === 0, `${r.bozuk.length} bozuk sinir ${r.bozuk.slice(0, 6).join(",")}`);

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> Ses dilimi tam sayi: parcanin son karesi dusmuyor");
process.exit(hata ? 1 : 0);
