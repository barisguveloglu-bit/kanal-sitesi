/* ================================================================
   SAHTE OYUNCULU TARAMA ARACI -- GUVENLIK KILITLERI        v7.99.17

   `sunucu/tarama_dene.py` paketi GERCEK MOTORDA calistiriyor
   (Bedrock Dedicated Server + @minecraft/server-gametest). Motor
   bu takimda yok; burada olculen, aracin motora DOKUNMADAN once
   ve SONRA yaptiklari:

     1. Yanlis klasorde calismiyor: --deneme yazilmadan ve izin
        listesi dolu bir (gercek) sunucuda REDDEDIYOR. Tarama
        dunyayi bozar; bu iki kapi gercek sunucunun tek korumasi.
     2. Hazirlik gercekten hazirliyor: ek main.js'e giriyor,
        manifest sahte oyuncu modulunu istiyor, dunyada deney acik.
     3. GERI ALMA bire bir: manifest ve level.dat BAYT BAYT eski
        hali, betikler depodakinin aynisi. Geri alinmayan bir
        tarama, deneme sunucusunda beta bagimlilikli bir paket
        birakirdi.
     4. Ozet dogru sayiyor: beklenen satir (cikan oyuncu) hata
        sayilmiyor, beklenmeyen satir sayiliyor.
     5. Ek, main.js'in gercekten var olan adlarini kullaniyor --
        biri yeniden adlandirilirsa tarama acilista cokerdi.
   ================================================================ */
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, cpSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const BURADA = dirname(fileURLToPath(import.meta.url));
const ADDON = join(BURADA, "..");
const SET = join(ADDON, "sunucu");
const PAKET = "Simsek_TNT_ToprakTopu";

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const ORTAM = { ...process.env, PYTHONDONTWRITEBYTECODE: "1" };
const kos = (args, girdi) => {
  try {
    return { kod: 0, cikti: execFileSync("python3", ["-B", ...args],
      { encoding: "utf8", env: ORTAM, input: girdi, stdio: ["pipe", "pipe", "pipe"] }) };
  } catch (e) {
    return { kod: e.status, cikti: String(e.stdout || "") + String(e.stderr || "") };
  }
};
const arac = join(SET, "tarama_dene.py");

/* Sahte bir sunucu klasoru: paket + dunya, motor yok. */
function sahteSunucu(izinli) {
  const kok = mkdtempSync(join(tmpdir(), "tarama-"));
  const bp = join(kok, "behavior_packs", PAKET);
  mkdirSync(bp, { recursive: true });
  cpSync(join(ADDON, PAKET, "manifest.json"), join(bp, "manifest.json"));
  mkdirSync(join(bp, "scripts"));
  writeFileSync(join(bp, "scripts", "main.js"), "// eski, bayat betik\n");
  mkdirSync(join(kok, "worlds", "Deneme"), { recursive: true });
  /* level.dat'i deponun kendi NBT yazicisiyla uret. */
  const r = kos(["-c", [
    "import sys",
    "sys.path.insert(0, sys.argv[1])",
    "import nbt",
    "open(sys.argv[2], 'wb').write(nbt.level_dat_yaz({'LevelName': nbt.Y('Deneme'), 'commandsEnabled': nbt.B(0)}))",
  ].join("\n"), join(ADDON, "arac"), join(kok, "worlds", "Deneme", "level.dat")]);
  if (r.kod !== 0) throw new Error("level.dat yazilamadi: " + r.cikti);
  writeFileSync(join(kok, "allowlist.json"), JSON.stringify(izinli || []));
  return kok;
}

console.log("=== 1. YANLIS KLASORDE CALISMIYOR ===");
{
  const kok = sahteSunucu([]);
  const onay = kos([arac, "--hedef", kok]);
  kontrol("--deneme yazilmadan reddediyor", onay.kod === 1 && onay.cikti.includes("--deneme"),
          onay.cikti.trim().split("\n")[0]);
  kontrol("  ve pakete DOKUNMUYOR",
          readFileSync(join(kok, "behavior_packs", PAKET, "scripts", "main.js"), "utf8")
            === "// eski, bayat betik\n");
  rmSync(kok, { recursive: true, force: true });

  const gercek = sahteSunucu([{ name: "Oyuncu", ignoresPlayerLimit: false }]);
  const r = kos([arac, "--hedef", gercek, "--deneme"]);
  kontrol("izin listesi doluysa (gercek sunucu) reddediyor",
          r.kod === 1 && r.cikti.includes("izin listesinde"), r.cikti.trim().split("\n")[0]);
  kontrol("  ve pakete DOKUNMUYOR",
          readFileSync(join(gercek, "behavior_packs", PAKET, "scripts", "main.js"), "utf8")
            === "// eski, bayat betik\n");
  rmSync(gercek, { recursive: true, force: true });
}

console.log("");
console.log("=== 2. HAZIRLIK VE 3. GERI ALMA ===");
{
  const kok = sahteSunucu([]);
  const bp = join(kok, "behavior_packs", PAKET);
  const seviye = join(kok, "worlds", "Deneme", "level.dat");
  const manifestOnce = readFileSync(join(bp, "manifest.json"));
  const seviyeOnce = readFileSync(seviye);

  /* hazirla() -> durumu yaz -> geri_al() -> durumu yaz. Motor acilmiyor. */
  const r = kos(["-c", [
    "import sys, json, os",
    "sys.dont_write_bytecode = True",
    "sys.path.insert(0, sys.argv[1])",
    "import tarama_dene as t, nbt",
    "kok = sys.argv[2]",
    "bp = os.path.join(kok, 'behavior_packs', t.PAKET)",
    "sev = os.path.join(kok, 'worlds', 'Deneme', 'level.dat')",
    "geri, nk, ne = t.hazirla(kok)",
    "ana = open(os.path.join(bp, 'scripts', 'main.js'), encoding='utf-8').read()",
    "m = json.load(open(os.path.join(bp, 'manifest.json'), encoding='utf-8'))",
    "d = nbt.level_dat_oku(open(sev, 'rb').read())[1]",
    "print(json.dumps({",
    "  'komut': nk, 'esya': ne,",
    "  'ek': '[TARAMA]' in ana, 'liste': 'const __TUM_ESYALAR = [' in ana,",
    "  'oyun_testi': [x for x in m['dependencies'] if x.get('module_name') == t.OYUN_TESTI],",
    "  'bagimlilik': len(m['dependencies']),",
    "  'deney': d['experiments'].deger['gametest'].deger,",
    "  'eski_alan': d['LevelName'].deger}))",
    "geri()",
  ].join("\n"), SET, kok]);
  let h = null;
  try { h = JSON.parse(r.cikti.trim().split("\n").pop()); } catch (e) { h = null; }
  kontrol("hazirlik calisti", r.kod === 0 && h !== null, r.cikti.slice(0, 200));
  if (h) {
    kontrol("ek main.js'e girdi", h.ek === true && h.liste === true);
    kontrol("komut ve esya listesi dolu", h.komut >= 40 && h.esya >= 500,
            h.komut + " komut · " + h.esya + " esya");
    kontrol("manifest sahte oyuncu modulunu istiyor",
            h.oyun_testi.length === 1 && h.oyun_testi[0].version === "1.0.0-beta",
            JSON.stringify(h.oyun_testi));
    kontrol("dunyada Beta API deneyi acik", h.deney === 1);
    kontrol("level.dat'in eski alanlari duruyor", h.eski_alan === "Deneme");
  }
  kontrol("GERI ALMA: manifest bayt bayt ayni",
          readFileSync(join(bp, "manifest.json")).equals(manifestOnce));
  kontrol("GERI ALMA: level.dat bayt bayt ayni", readFileSync(seviye).equals(seviyeOnce));
  kontrol("GERI ALMA: betikler depodakinin aynisi (ek yok)",
          readFileSync(join(bp, "scripts", "main.js"), "utf8")
            === readFileSync(join(ADDON, PAKET, "scripts", "main.js"), "utf8"));
  rmSync(kok, { recursive: true, force: true });
}

console.log("");
console.log("=== 4. OZET DOGRU SAYIYOR ===");
{
  const satirlar = [
    "[t WARN] [Scripting] [TARAMA] calisti gura_tenchi -> is",
    "[t WARN] [Scripting] [TARAMA] calisti arinma -> anlik",
    "[t WARN] [Scripting] [TARAMA] calisti arinma -> anlik",
    "[t WARN] [Scripting] [SimsekTNT] HATA @ actionbarYaz: Failed to call function 'sendMessage' due to Entity being invalid (has the Entity been removed?).",
    "[t WARN] [Scripting] [SimsekTNT] HATA @ arinma.fog: Syntax error: Unexpected \"13\": at \"@s remove >>13<<\"",
    "[t WARN] [Scripting] [SimsekTNT] HATA @ arinma.fog: Syntax error: Unexpected \"11\": at \"@s remove >>11<<\"",
    "[t WARN] [Scripting] [TARAMA] ISTISNA bozuk_yetenek: x is not a function",
    "[t WARN] [Scripting] [TARAMA] HIC CALISMAYAN: kayip_bir,kayip_iki",
    "[t WARN] [Scripting] [TARAMA] BITTI",
  ];
  const r = kos(["-c", [
    "import sys, json",
    "sys.dont_write_bytecode = True",
    "sys.path.insert(0, sys.argv[1])",
    "import tarama_dene as t",
    "c, hic, ist, hat, bitti = t.ozetle(json.load(sys.stdin))",
    "bek = [m for m in hat if any(b in m for b in t.BEKLENEN)]",
    "print(json.dumps({'calisan': sorted(c), 'hic': hic, 'istisna': ist, 'hata': dict(hat), 'beklenen': bek, 'bitti': bitti}))",
  ].join("\n"), SET], JSON.stringify(satirlar));
  let o = null;
  try { o = JSON.parse(r.cikti.trim()); } catch (e) { o = null; }
  kontrol("ozet okundu", o !== null, r.cikti.slice(0, 200));
  if (o) {
    kontrol("calisan yetenek TEKIL sayiliyor", o.calisan.length === 2, o.calisan.join(","));
    kontrol("hic calismayanlar listeleniyor", o.hic.length === 2 && o.hic[0] === "kayip_bir");
    kontrol("istisna yakalaniyor", o.istisna.length === 1);
    kontrol("bitis goruluyor", o.bitti === true);
    /* Iki sis satiri yalniz sayida ayriliyor: tek cesit, iki kez. */
    const sis = Object.entries(o.hata).filter(([m]) => m.includes("arinma.fog"));
    kontrol("ayni hatanin sayi farki tek cesitte toplaniyor",
            sis.length === 1 && sis[0][1] === 2, JSON.stringify(sis));
    kontrol("cikan oyuncuya yazma BEKLENEN sayiliyor",
            o.beklenen.length === 1 && o.beklenen[0].includes("Entity being invalid"));
    kontrol("gercek hata beklenen SAYILMIYOR",
            !o.beklenen.some((m) => m.includes("arinma.fog")));
  }
}

console.log("");
console.log("=== 5. EK, main.js'IN GERCEK ADLARINI KULLANIYOR ===");
{
  const ek = readFileSync(join(SET, "tarama_eki.js"), "utf8");
  const ana = readFileSync(join(ADDON, PAKET, "scripts", "main.js"), "utf8");
  for (const [ad, desen] of [
    ["tumYetenekler", /\btumYetenekler\b[^;]*from "\.\/yetenekler\/kayit\.js"|import \{[^}]*\btumYetenekler\b/],
    ["yetenekTetikle", /^function yetenekTetikle\(/m],
    ["oyuncuIsSayisi", /^function oyuncuIsSayisi\(/m],
    ["AYNI_ANDA", /\bAYNI_ANDA\b/],
  ]) {
    kontrol("ek " + ad + " kullaniyor ve main.js'te var", ek.includes(ad) && desen.test(ana));
  }
  const enerji = readFileSync(join(ADDON, PAKET, "scripts", "enerji.js"), "utf8");
  kontrol("enerjiVer disa acik", /^export function enerjiVer\(/m.test(enerji));
  kontrol("ek pakete GIRMIYOR (scripts/ altinda yok)",
          !existsSync(join(ADDON, PAKET, "scripts", "tarama_eki.js")));
  kontrol("paketin manifesti sahte oyuncu modulunu ISTEMIYOR",
          !readFileSync(join(ADDON, PAKET, "manifest.json"), "utf8").includes("server-gametest"));
}

kontrol("kosu klasorde __pycache__ birakmadi", !existsSync(join(SET, "__pycache__")));

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> tarama araci: kilitler yerinde");
process.exit(hata ? 1 : 0);
