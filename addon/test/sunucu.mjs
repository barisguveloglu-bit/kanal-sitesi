/* SIMSEK DUELLO SUNUCUSU -- kurulum setinin kilitleri      v7.99.16

   Kullanici: "BDS + siki ayarlar + izin listesi tamam, sunucuya
   basla." Set addon/sunucu/ altinda, rehber addon/SUNUCU_REHBERI.md.

   ---- BU DOSYANIN TUTTUGU SEY ----
   1. sunucu.properties'teki kilitler gevsemiyor (izin listesi,
      Xbox dogrulamasi, komut yok, uc siki ayar, paket hiz siniri).
   2. packetlimitconfig.json Mojang'in belgeledigi sinirlarda ve
      sohbet (paket 9) kendi grubunda, siki.
   3. sunucu_ayar.py: birlestirme Mojang'in dosyasini koruyor,
      denetim gevseyen ayari ve cift anahtari yakaliyor, paket kurulumu
      kimligi manifest'ten okuyor ve yerel/ kolunu reddediyor, izin
      listesi tekrar eklemiyor.
   4. sunucu_kur.sh: surum ve SHA-256 sabit, indirme resmi adresten,
      SHA acmadan ONCE denetleniyor, yerel/ hic okunmuyor.
   5. Arena: kapali kutu, zemin kabuktan sonra, dogus icinde, dovus
      kurallari; arena_kur.py olculmus gercek cevaplari dogru yorumluyor.
   6. Uctan uca kurulum (BDS'siz, agsiz): ayar, paket, dunya, izin;
      var olan dunya ve elle yapilan ayar korunuyor; sunucu calisirken
      kurulum reddediliyor.
   7. Depoya BDS ikilisi girmedi.

   BDS ve ag GEREKMIYOR. Gercek acilis denemesi ayri:
   python3 addon/sunucu/acilis_dene.py (rehberin 4. bolumu).       */
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const BURADA = dirname(fileURLToPath(import.meta.url));
const ADDON = join(BURADA, "..");
const KOK = join(ADDON, "..");
const SET = join(ADDON, "sunucu");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const ayarOku = (metin) => {
  const c = [];
  for (const s of metin.split("\n").map((x) => x.trim())) {
    if (!s || s.startsWith("#") || s.indexOf("=") === -1) continue;
    const i = s.indexOf("=");
    c.push([s.slice(0, i).trim(), s.slice(i + 1).trim()]);
  }
  return c;
};
/* Python bayt kodu yazmasin: depoda __pycache__ birakiyordu ve mutasyon
   denemesinde ayni saniyede ayni boyutta degisen dosyanin BAYAT kodu
   kosuyordu (madde yanlis sebeple dustu).                            */
const ORTAM = { ...process.env, PYTHONDONTWRITEBYTECODE: "1" };
const py = (...a) => {
  try {
    return { kod: 0, cikti: execFileSync("python3", [join(SET, "sunucu_ayar.py"), ...a],
                                          { encoding: "utf8", env: ORTAM, stdio: ["ignore", "pipe", "pipe"] }) };
  } catch (e) {
    return { kod: e.status, cikti: String(e.stdout || "") + String(e.stderr || "") };
  }
};

console.log("=== 1. SIKI AYARLAR GEVSEMIYOR ===");
const bizimMetin = readFileSync(join(SET, "sunucu.properties"), "utf8");
const bizim = ayarOku(bizimMetin);
const A = Object.fromEntries(bizim);
{
  const adlar = bizim.map(([a]) => a);
  kontrol("her anahtar bir kez", new Set(adlar).size === adlar.length);
  const kilit = [
    ["allow-list", "true"], ["online-mode", "true"], ["allow-cheats", "false"],
    ["server-authoritative-movement-strict", "true"],
    ["server-authoritative-dismount-strict", "true"],
    ["server-authoritative-entity-interactions-strict", "true"],
    ["enable-packet-rate-limiter", "true"], ["enable-lan-visibility", "false"],
    ["texturepack-required", "true"], ["content-log-file-enabled", "true"],
    /* Duello yeri: blok kirma/koyma yok, kip her giriste zorlaniyor. */
    ["gamemode", "adventure"], ["force-gamemode", "true"],
    /* raknet IPv6'siz makinede acilmiyor (olculdu); varsayilan acikca. */
    ["transport", "nethernet"]
  ];
  for (const [a, d] of kilit) kontrol(a + "=" + d, A[a] === d, String(A[a]));
  kontrol("ilk giren operator DEGIL",
          A["default-player-permission-level"] === "member" ||
          A["default-player-permission-level"] === "visitor",
          A["default-player-permission-level"]);
  /* Mojang'in kendi metni: "Values beyond 1.0 increase chances of
     allowing cheating."                                          */
  const esik = Number(A["player-position-acceptance-threshold"]);
  kontrol("konum hosgorusu <= 1.0 (Mojang'in siniri)", esik > 0 && esik <= 1.0, String(esik));
  const yon = Number(A["player-movement-action-direction-threshold"]);
  kontrol("vurus yonu esigi varsayilandan gevsek degil (>= 0.85)", yon >= 0.85 && yon <= 1, String(yon));
  /* Gercek dosyada (1.26.52.3) bu anahtar YOK; yazmak calismayan bir
     ayar uydurmak olurdu.                                          */
  kontrol("var olmayan 'server-authoritative-block-breaking' yazilmadi",
          !("server-authoritative-block-breaking" in A));
  const udp = /^(\d+)-(\d+)$/.exec(A["server-udp-ports"] || "");
  kontrol("oyuncu UDP portlari sabit bir aralikta (guvenlik duvari icin)",
          !!udp && Number(udp[1]) > 1024 && Number(udp[2]) >= Number(udp[1]) + 7 &&
          Number(udp[2]) <= 65535, A["server-udp-ports"]);
}

console.log("\n=== 2. PAKET HIZ SINIRI ===");
{
  let J = null;
  try { J = JSON.parse(readFileSync(join(SET, "packetlimitconfig.json"), "utf8")); } catch (e) { J = null; }
  kontrol("packetlimitconfig.json gecerli JSON", J !== null && Array.isArray(J.limitGroups));
  const gruplar = J ? J.limitGroups : [];
  const algoritmalar = gruplar.map((g) => g.algorithm);
  kontrol("yalniz BucketPacketLimitAlgorithm (Mojang: tek desteklenen)",
          algoritmalar.length > 0 && algoritmalar.every((x) => x && x.name === "BucketPacketLimitAlgorithm"));
  kontrol("parametreler belgedeki aralikta",
          algoritmalar.every((x) => {
            const p = x.params || {};
            return p.drainRatePerSec >= 0 && p.drainRatePerSec <= 10000 &&
                   Number.isInteger(p.maxBucketSize) && p.maxBucketSize >= 1 && p.maxBucketSize <= 10000;
          }));
  const grup = (id) => gruplar.find((g) => (g.minecraftPacketIds || []).indexOf(id) !== -1);
  const sohbet = grup(9);
  kontrol("sohbet (paket 9) kendi grubunda", !!sohbet && sohbet.minecraftPacketIds.length === 1);
  kontrol("  saniyede en fazla 2, yigin en fazla 10",
          !!sohbet && sohbet.algorithm.params.drainRatePerSec <= 2 &&
          sohbet.algorithm.params.maxBucketSize <= 10,
          sohbet ? JSON.stringify(sohbet.algorithm.params) : "-");
  kontrol("giris paketleri (193, 4) Mojang'in sinirinda", !!grup(193) && grup(193) === grup(4));
  /* Varsayilan algoritma BUTUN paketlere biner -- hareket paketi
     saniyede 20 geliyor ve sunucu oyuncuyu bogar.                 */
  kontrol("defaultAlgorithm YOK (hareket paketlerini de keserdi)", J && !("defaultAlgorithm" in J));
}

console.log("\n=== 3. sunucu_ayar.py ===");
const gecici = mkdtempSync(join(tmpdir(), "sunucu_test_"));
try {
  /* -- birlestir / denetle -- */
  const mojang = join(gecici, "mojang.properties");
  writeFileSync(mojang, [
    "server-name=Dedicated Server", "# Used as the server name",
    "allow-cheats=true", "allow-list=false",
    "server-authoritative-movement-strict=false",
    "# bir yorum satiri", "tick-distance=4", ""
  ].join("\n"));
  const cikti = join(gecici, "server.properties");
  const r = py("birlestir", mojang, join(SET, "sunucu.properties"), cikti);
  kontrol("birlestir calisti", r.kod === 0, r.cikti.trim().slice(0, 80));
  const son = readFileSync(cikti, "utf8");
  const S = Object.fromEntries(ayarOku(son));
  kontrol("Mojang'in degeri bizimkiyle degisti (allow-cheats)", S["allow-cheats"] === "false");
  kontrol("Mojang'in yorumlari korundu", son.indexOf("# Used as the server name") !== -1 &&
                                         son.indexOf("# bir yorum satiri") !== -1);
  /* Bizim dosyada OLMAYAN bir anahtar secilmeli: ilk yazilista
     view-distance'ti, sonra biz de onu ayarlamaya baslayinca madde
     yanlis sebeple dustu.                                         */
  kontrol("bizim olmayan anahtar korundu (tick-distance)",
          !("tick-distance" in A) && S["tick-distance"] === "4");
  kontrol("Mojang'da olmayan anahtar sona eklendi (enable-packet-rate-limiter)",
          S["enable-packet-rate-limiter"] === "true");
  kontrol("satir sirasi korundu: degisen anahtar yerinde",
          son.indexOf("allow-cheats=false") < son.indexOf("tick-distance=4"));
  kontrol("denetle: birlesmis dosya temiz", py("denetle", cikti, join(SET, "sunucu.properties")).kod === 0);

  writeFileSync(cikti, son.replace("server-authoritative-movement-strict=true",
                                   "server-authoritative-movement-strict=false"));
  const g = py("denetle", cikti, join(SET, "sunucu.properties"));
  kontrol("denetle: gevsetilen siki ayari YAKALADI", g.kod === 1 &&
          g.cikti.indexOf("server-authoritative-movement-strict") !== -1, g.cikti.trim());
  writeFileSync(cikti, son + "\nallow-list=false\n");
  const c = py("denetle", cikti, join(SET, "sunucu.properties"));
  kontrol("denetle: sona eklenen ikinci allow-list'i YAKALADI (BDS sonuncuyu okur)",
          c.kod === 1 && c.cikti.indexOf("allow-list") !== -1, c.cikti.trim());

  /* -- paketler -- */
  const addon = join(gecici, "addon");
  const bds = join(gecici, "bds");
  const pk = (ad, uuid, tur, surum) => {
    mkdirSync(join(addon, ad), { recursive: true });
    writeFileSync(join(addon, ad, "manifest.json"), JSON.stringify({
      format_version: 2, header: { uuid, version: surum },
      modules: tur.map((t) => ({ type: t }))
    }));
  };
  pk("BP", "aaaa", ["data", "script"], [1, 2, 3]);
  mkdirSync(join(addon, "BP", "__pycache__"), { recursive: true });
  writeFileSync(join(addon, "BP", "__pycache__", "x.pyc"), "artik");
  writeFileSync(join(addon, "BP", ".gizli"), "artik");
  pk("RP", "bbbb", ["resources"], [4, 5, 6]);
  pk("SK", "cccc", ["skin_pack"], [1, 0, 0]);
  const dunya = join(bds, "worlds", "D");
  mkdirSync(dunya, { recursive: true });
  writeFileSync(join(dunya, "world_behavior_packs.json"),
                JSON.stringify([{ pack_id: "baska", version: [9, 9, 9] }, { pack_id: "aaaa", version: [0, 0, 1] }]));
  const p = py("paketler", addon, bds, "D", "BP", "RP");
  kontrol("paketler calisti", p.kod === 0, p.cikti.trim().slice(0, 80));
  kontrol("davranis paketi behavior_packs'e", existsSync(join(bds, "behavior_packs", "BP", "manifest.json")));
  kontrol("gorunum paketi resource_packs'e", existsSync(join(bds, "resource_packs", "RP", "manifest.json")));
  kontrol("uretim artigi ve gizli dosya kopyalanmadi (paketle.sh ile ayni kural)",
          !existsSync(join(bds, "behavior_packs", "BP", "__pycache__")) &&
          !existsSync(join(bds, "behavior_packs", "BP", ".gizli")));
  const wb = JSON.parse(readFileSync(join(dunya, "world_behavior_packs.json"), "utf8"));
  kontrol("kimlik ve surum manifest'ten (eski surum guncellendi)",
          wb.some((e) => e.pack_id === "aaaa" && e.version.join(".") === "1.2.3") &&
          wb.filter((e) => e.pack_id === "aaaa").length === 1);
  kontrol("dunyanin kendi paketi silinmedi", wb.some((e) => e.pack_id === "baska"));
  const wr = JSON.parse(readFileSync(join(dunya, "world_resource_packs.json"), "utf8"));
  kontrol("gorunum listesi yazildi", wr.length === 1 && wr[0].pack_id === "bbbb");
  kontrol("skin paketi dunyaya kurulmuyor (hata veriyor)", py("paketler", addon, bds, "D", "SK").kod !== 0);
  /* Gecerli bir manifest SART: ilk yazilista yoktu ve mutasyon KACTI
     -- koruma silinince betik manifest okurken baska bir hatayla
     dusuyordu, test de bunu "reddetti" sayiyordu. Artik reddin
     KENDI mesaji ve kopyalanmamis olmasi soruluyor.               */
  pk(join("yerel", "BP2"), "dddd", ["data", "script"], [1, 0, 0]);
  const y = py("paketler", addon, bds, "D", "yerel/BP2");
  kontrol("yerel/ kolu REDDEDILDI (kisisel izin)",
          y.kod !== 0 && y.cikti.indexOf("addon/yerel sunucuya kurulmaz") !== -1, y.cikti.trim().slice(-60));
  kontrol("  ve sunucuya kopyalanmadi", !existsSync(join(bds, "behavior_packs", "BP2")));

  /* -- izin -- */
  const liste = join(gecici, "allowlist.json");
  writeFileSync(liste, JSON.stringify([{ ignoresPlayerLimit: false, name: "Eski", xuid: "123" }]));
  py("izin", liste, "Yeni Oyuncu", "eski", "Yeni Oyuncu");
  const L = JSON.parse(readFileSync(liste, "utf8"));
  kontrol("izin: yeni ad eklendi, tekrar ve buyuk-kucuk harf farki eklenmedi",
          L.length === 2 && L[1].name === "Yeni Oyuncu", L.map((e) => e.name).join(", "));
  kontrol("izin: var olan kaydin xuid'i korundu", L[0].xuid === "123");
} finally {
  rmSync(gecici, { recursive: true, force: true });
}

console.log("\n=== 4. sunucu_kur.sh ===");
{
  const kur = readFileSync(join(SET, "sunucu_kur.sh"), "utf8");
  const kod = kur.split("\n").filter((s) => !s.trim().startsWith("#")).join("\n");
  const surum = (kur.match(/^BDS_SURUM=(\S+)$/m) || [])[1];
  const sha = (kur.match(/^BDS_SHA256=(\S+)$/m) || [])[1];
  kontrol("BDS surumu sabit", /^\d+\.\d+\.\d+\.\d+$/.test(surum || ""), surum);
  kontrol("SHA-256 yazili (64 onaltilik)", /^[0-9a-f]{64}$/.test(sha || ""));
  kontrol("indirme resmi adresten (www.minecraft.net)",
          /^BDS_URL=https:\/\/www\.minecraft\.net\/bedrockdedicatedserver\/bin-linux\/bedrock-server-\$\{BDS_SURUM\}\.zip$/m.test(kur));
  const shaYeri = kod.indexOf('"$gercek" != "$BDS_SHA256"');
  const acYeri = kod.indexOf("extractall");
  kontrol("SHA-256 arsiv ACILMADAN once denetleniyor", shaYeri !== -1 && acYeri !== -1 && shaYeri < acYeri);
  kontrol("SHA tutmazsa kurulum duruyor (exit 1)",
          /!= "\$BDS_SHA256" \]; then[\s\S]{0,200}?exit 1/.test(kod));
  kontrol("yerel/ betigin kodunda hic gecmiyor", kod.indexOf("yerel") === -1);
  kontrol("depo denetimi klasor acilmadan once",
          kod.indexOf('"$DEPO"/*)') !== -1 && kod.indexOf('"$DEPO"/*)') < kod.indexOf('mkdir -p "$HEDEF"'));
  kontrol("kullanicinin izin listesi ve yetkileri guncellemede korunuyor",
          /for korunan in allowlist\.json permissions\.json/.test(kod));
  const paketler = ((kur.match(/^PAKETLER=\(([^)]*)\)$/m) || [])[1] || "").trim().split(/\s+/);
  kontrol("kurulan paketler depoda var",
          paketler.length > 0 && paketler.every((p) => existsSync(join(ADDON, p, "manifest.json"))),
          paketler.join(" "));
  const bp = JSON.parse(readFileSync(join(ADDON, "Simsek_TNT_ToprakTopu", "manifest.json"), "utf8"));
  const bagimli = (bp.dependencies || []).filter((d) => d.uuid).map((d) => d.uuid);
  const kurulan = paketler.map((p) => JSON.parse(readFileSync(join(ADDON, p, "manifest.json"), "utf8")).header.uuid);
  kontrol("mod paketinin bagimli oldugu paketler de kuruluyor",
          bagimli.every((u) => kurulan.indexOf(u) !== -1), bagimli.join(", "));
  const dene = readFileSync(join(SET, "acilis_dene.py"), "utf8");
  kontrol("acilis denemesi bizim mod paketinin kimligini ariyor",
          dene.indexOf('BIZIM_BP = "' + bp.header.uuid + '"') !== -1);
  kontrol("yoklanan esya ve varlik depoda tanimli",
          existsSync(join(ADDON, "Simsek_TNT_ToprakTopu", "items", "kol_toprak.json")) &&
          existsSync(join(ADDON, "Simsek_TNT_ToprakTopu", "entities", "bot.json")) &&
          dene.indexOf("pa:kol_toprak") !== -1 && dene.indexOf("pa:bot") !== -1);
}

console.log("\n=== 5. ARENA (arena.komut) ===");
{
  const satirlar = readFileSync(join(SET, "arena.komut"), "utf8").split("\n")
    .map((x) => x.trim()).filter((x) => x && !x.startsWith("#"));
  const sayi = (p) => p.map(Number);
  const fill = satirlar.filter((x) => x.startsWith("fill ")).map((x) => {
    const p = x.split(/\s+/);
    const [x1, y1, z1, x2, y2, z2] = sayi(p.slice(1, 7));
    return { x1, y1, z1, x2, y2, z2, blok: p[7], kip: p[8] || "", satir: x,
             hacim: (Math.abs(x2 - x1) + 1) * (Math.abs(y2 - y1) + 1) * (Math.abs(z2 - z1) + 1) };
  });
  kontrol("her fill tek komut sinirinda (32768 blok)", fill.length > 0 && fill.every((f) => f.hacim <= 32768),
          Math.max(...fill.map((f) => f.hacim)) + " en buyuk");
  const kabuk = fill.find((f) => f.blok === "barrier" && f.kip === "hollow");
  kontrol("kapali kabuk var (barrier, hollow)", !!kabuk);
  const K = kabuk || { x1: 0, y1: 0, z1: 0, x2: 0, y2: 0, z2: 0 };
  const zemin = fill.find((f) => f.blok === "bedrock" && f.y1 === K.y1 && f.y2 === K.y1 &&
                               f.x1 === K.x1 && f.x2 === K.x2 && f.z1 === K.z1 && f.z2 === K.z2);
  kontrol("zemin kabugun tabaninin TAMAMI, bedrock", !!zemin);
  kontrol("  zemin kabuktan SONRA (hollow tabani da barrier yapiyor)",
          !!zemin && fill.indexOf(zemin) > fill.indexOf(kabuk));
  kontrol("arena dogal arazinin ustunde, dunya sinirinin altinda",
          K.y1 >= 257 && K.y2 <= 319, K.y1 + ".." + K.y2);
  const ta = satirlar.find((x) => x.startsWith("tickingarea add "));
  const T = ta ? sayi(ta.split(/\s+/).slice(2, 8)) : [];
  kontrol("tickingarea arenanin tamamini kapsiyor",
          !!ta && T[0] <= K.x1 && T[2] <= K.z1 && T[3] >= K.x2 && T[5] >= K.z2);
  kontrol("tickingarea fill'lerden ONCE", !!ta && satirlar.indexOf(ta) < satirlar.indexOf(kabuk.satir));
  const dogus = (satirlar.find((x) => x.startsWith("setworldspawn ")) || "").split(/\s+/).slice(1).map(Number);
  kontrol("dogus noktasi kutunun icinde, zeminin ustunde",
          dogus.length === 3 && dogus[0] > K.x1 && dogus[0] < K.x2 && dogus[2] > K.z1 && dogus[2] < K.z2 &&
          dogus[1] === K.y1 + 1, dogus.join(" "));
  const kural = Object.fromEntries(satirlar.filter((x) => /^gamerule \S+ \S+$/.test(x))
                                           .map((x) => x.split(/\s+/).slice(1)));
  for (const [ad, d] of [["keepinventory", "true"], ["pvp", "true"], ["domobspawning", "false"],
                         ["spawnradius", "0"], ["doweathercycle", "false"]]) {
    kontrol("gamerule " + ad + " " + d, kural[ad] === d, String(kural[ad]));
  }
  const tfb = satirlar.filter((x) => x.startsWith("testforblock "));
  const tur = (blok) => tfb.filter((x) => x.endsWith(" " + blok)).length;
  kontrol("dogrulama zemini, duvari/tavani ve ic havayi soruyor",
          tur("bedrock") >= 2 && tur("barrier") >= 2 && tur("air") >= 1, tfb.length + " soru");
  kontrol("dogrulama kurulumdan SONRA", tfb.length > 0 &&
          satirlar.indexOf(tfb[0]) > satirlar.indexOf(fill[fill.length - 1].satir));

  /* arena_kur.py'nin cevap yorumu -- olculmus gercek cevaplarla. */
  const yorum = (komut, cevap) => JSON.parse(execFileSync("python3", ["-c", `
import json, sys
sys.path.insert(0, sys.argv[1])
import arena_kur
print(json.dumps(arena_kur.cevap_tamam(sys.argv[2], json.loads(sys.argv[3]))[:2]))
`, SET, komut, JSON.stringify(cevap)], { encoding: "utf8", env: ORTAM }));
  const Z = "[2026-10-27 08:21:19:359 ";
  kontrol("yuklu olmayan bolge: TEKRAR DENE",
          JSON.stringify(yorum("fill 0 0 0 1 1 1 bedrock", [Z + "ERROR] Cannot place blocks outside of the world"])) === "[false,true]");
  kontrol("'16 blocks filled': tamam",
          JSON.stringify(yorum("fill 0 0 0 1 1 1 bedrock", [Z + "INFO] 16 blocks filled"])) === "[true,false]");
  kontrol("testforblock basarisiz: tamam DEGIL, tekrar yok",
          JSON.stringify(yorum("testforblock 1 2 3 bedrock",
                               [Z + "ERROR] The block at 1,2,3 is Air (expected: Bedrock)."])) === "[false,false]");
  kontrol("testforblock basarili: tamam",
          JSON.stringify(yorum("testforblock 1 2 3 bedrock",
                               [Z + "INFO] Successfully found the block at 1,2,3."])) === "[true,false]");
  kontrol("cevapsiz komut: tamam DEGIL", JSON.stringify(yorum("time set noon", [])) === "[false,false]");
  kontrol("ERROR donen gamerule: tamam DEGIL",
          JSON.stringify(yorum("gamerule yok true", [Z + "ERROR] Syntax error"])) === "[false,false]");

  const kurallar = JSON.parse(execFileSync("python3", ["-c", `
import json, sys
sys.path.insert(0, sys.argv[1])
import acilis_dene
print(json.dumps([acilis_dene.kural_listesi([sys.argv[2]]), acilis_dene.istenen_kurallar()]))
`, SET, Z + "INFO] commandBlockOutput = true, keepInventory = false, pvp = true"], { encoding: "utf8", env: ORTAM }));
  kontrol("acilis denemesi gamerule listesini okuyor",
          kurallar[0].keepinventory === "false" && kurallar[0].pvp === "true");
  kontrol("acilis denemesi istenen kurallari arena.komut'tan aliyor",
          kurallar[1].keepinventory === "true" && Object.keys(kurallar[1]).length >= 5);
}

console.log("\n=== 6. UCTAN UCA KURULUM (BDS'siz, agsiz) ===");
{
  /* BDS zaten kurulu gibi davranan sahte bir hedef: ikili /bin/sleep'in
     kopyasi (adi bedrock_server), surum isareti, Mojang'in dosyasi. Arena
     adimi gercek sunucu ister, --arenasiz ile atlaniyor; arenanin kendisi
     gercek motorda olculdu (rehberin 4. bolumu).                     */
  const kur = readFileSync(join(SET, "sunucu_kur.sh"), "utf8");
  const surum = (kur.match(/^BDS_SURUM=(\S+)$/m) || [])[1];
  const g = mkdtempSync(join(tmpdir(), "sunucu_kur_"));
  const H = join(g, "sunucu");
  try {
    mkdirSync(H, { recursive: true });
    execFileSync("cp", ["/bin/sleep", join(H, "bedrock_server")]);
    writeFileSync(join(H, ".surum_" + surum), "");
    writeFileSync(join(H, "server.properties.mojang"),
                  "server-name=Dedicated Server\n# yorum\nallow-cheats=true\nview-distance=32\nlevel-name=Bedrock level\n");
    writeFileSync(join(H, "allowlist.json"), "[]");
    writeFileSync(join(H, "permissions.json"), "[]");
    /* Sahte .mcworld: level.dat + levelname.txt */
    const dk = join(g, "dunya");
    mkdirSync(dk);
    writeFileSync(join(dk, "level.dat"), "sahte");
    writeFileSync(join(dk, "levelname.txt"), "Telefon Dunyasi");
    execFileSync("python3", ["-c", `
import sys, zipfile, os
z = zipfile.ZipFile(sys.argv[2], "w")
for a in os.listdir(sys.argv[1]): z.write(os.path.join(sys.argv[1], a), a)
z.close()`, dk, join(g, "d.mcworld")], { env: ORTAM });
    const calistir = (...ek) => {
      try {
        return { kod: 0, cikti: execFileSync("bash", [join(SET, "sunucu_kur.sh"), "--hedef", H, "--arenasiz", ...ek],
                                             { encoding: "utf8", env: ORTAM, stdio: ["ignore", "pipe", "pipe"] }) };
      } catch (e) { return { kod: e.status, cikti: String(e.stdout || "") + String(e.stderr || "") }; }
    };
    const r1 = calistir("--izin", "Bir,Iki", "--dunya", join(g, "d.mcworld"));
    kontrol("kurulum calisti", r1.kod === 0, r1.cikti.trim().split("\n").slice(-1)[0]);
    kontrol("  BDS yeniden indirilmedi (surum isareti)", r1.cikti.indexOf("zaten kurulu") !== -1);
    const sp = readFileSync(join(H, "server.properties"), "utf8");
    kontrol("  server.properties siki ayarlarla", py("denetle", join(H, "server.properties"),
                                                     join(SET, "sunucu.properties")).kod === 0);
    kontrol("  Mojang'in yorum satiri korundu", sp.indexOf("# yorum") !== -1);
    kontrol("  paket hiz siniri kopyalandi", existsSync(join(H, "packetlimitconfig.json")));
    const ad = A["level-name"];
    const dunya = join(H, "worlds", ad);
    kontrol("  .mcworld dunya klasorune acildi", readFileSync(join(dunya, "level.dat"), "utf8") === "sahte");
    kontrol("  dunyaya bizim paketler baglandi",
            JSON.parse(readFileSync(join(dunya, "world_behavior_packs.json"), "utf8")).length === 1 &&
            JSON.parse(readFileSync(join(dunya, "world_resource_packs.json"), "utf8")).length === 2);
    kontrol("  izin listesinde iki oyuncu",
            JSON.parse(readFileSync(join(H, "allowlist.json"), "utf8")).length === 2);
    kontrol("  arena atlandi ve bunu soyledi", r1.cikti.indexOf("arena: atlandi") !== -1);

    /* Tek klasore sarili arsiv ve level.dat'siz arsiv (sunucu_ayar.py). */
    const zipYap = (adlar, cikti) => execFileSync("python3", ["-c", `
import sys, zipfile
z = zipfile.ZipFile(sys.argv[1], "w")
for a in sys.argv[2:]: z.writestr(a, "x")
z.close()`, cikti, ...adlar], { env: ORTAM });
    zipYap(["Dunyam/level.dat", "Dunyam/db/CURRENT"], join(g, "sarili.mcworld"));
    zipYap(["benioku.txt"], join(g, "bos.mcworld"));
    const s1 = py("dunya_ac", join(g, "sarili.mcworld"), join(g, "w1"));
    kontrol("tek klasore sarili .mcworld: icerik yukari alindi",
            s1.kod === 0 && existsSync(join(g, "w1", "level.dat")) && existsSync(join(g, "w1", "db", "CURRENT")));
    const s2 = py("dunya_ac", join(g, "bos.mcworld"), join(g, "w2"));
    kontrol("level.dat'siz arsiv REDDEDILDI ve iz birakmadi (BDS bos klasoru yeni dunya sanar)",
            s2.kod !== 0 && !existsSync(join(g, "w2")), s2.cikti.trim().slice(-50));

    const r2 = calistir("--dunya", join(g, "d.mcworld"));
    kontrol("var olan dunyanin USTUNE yazilmiyor", r2.kod !== 0 && r2.cikti.indexOf("ustune yazilmadi") !== -1);

    writeFileSync(join(H, "server.properties"), sp.replace("view-distance=10", "view-distance=12"));
    const r3 = calistir();
    kontrol("elle degistirilmis ayar kaybolmuyor: .onceki saklandi",
            r3.kod === 0 && existsSync(join(H, "server.properties.onceki")) &&
            readFileSync(join(H, "server.properties.onceki"), "utf8").indexOf("view-distance=12") !== -1);

    /* Bu klasorde "calisan sunucu": adi bedrock_server olan, cwd'si H. */
    const { spawn } = await import("node:child_process");
    const surec = spawn(join(H, "bedrock_server"), ["30"], { cwd: H, stdio: "ignore" });
    await new Promise((t) => setTimeout(t, 300));
    const r4 = calistir();
    surec.kill();
    kontrol("sunucu calisirken kurulum REDDEDILDI", r4.kod !== 0 && r4.cikti.indexOf("sunucu calisiyor") !== -1,
            r4.cikti.trim().slice(0, 70));
  } finally {
    rmSync(g, { recursive: true, force: true });
  }
}

console.log("\n=== 7. DEPOYA BDS GIRMEDI ===");
{
  let izli = "";
  try { izli = execFileSync("git", ["ls-files", "addon/sunucu"], { cwd: KOK, encoding: "utf8" }); }
  catch (e) { izli = ""; }
  const dosyalar = izli.split("\n").filter(Boolean);
  kontrol("izlenen dosyalar arasinda bedrock_server yok",
          !dosyalar.some((d) => /bedrock_server|\.so$|\.zip$/.test(d)), dosyalar.join(" "));
  const beklenen = ["acilis_dene.py", "arena.komut", "arena_kur.py", "baslat.sh", "konsol.py",
                    "packetlimitconfig.json", "sunucu.properties", "sunucu_ayar.py", "sunucu_kur.sh"];
  kontrol("test kosusu klasorde __pycache__ birakmadi", !existsSync(join(SET, "__pycache__")));
  kontrol("klasorde yalniz kurulum setinin dosyalari",
          beklenen.every((d) => existsSync(join(SET, d))));
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> sunucu kurulum seti: kilitler yerinde");
process.exit(hata ? 1 : 0);
