// arac/oyuncu_birlestir.py -- iki player.entity.json'u birlestiren arac.
//
// Neden test: Bedrock'ta `minecraft:player`'i ezen iki paket ayni anda
// calisamaz; ustteki alttakini BUTUNUYLE degistirir. Arac ikisini tek
// dosyada topluyor. En kritik davranisi, ayni denetleyiciyi iki tarafin
// da kosullandirdigi durumda kosullari `&&` ile BIRLESTIRMESI -- birini
// atmak o tarafin gorunumunu sessizce bozar (bizde `!variable.donusuk`,
// Ben 10 donusumunun anahtari).
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const BURADA = dirname(fileURLToPath(import.meta.url));
const ARAC = join(BURADA, "..", "arac", "oyuncu_birlestir.py");

let hata = 0;
function kontrol(ad, kosul, ek) {
  if (kosul) console.log("  ✓ " + ad + (ek ? "  ::  " + ek : ""));
  else { console.log("  ✗ " + ad + (ek ? "  ::  " + ek : "")); hata++; }
}
function kos(args) {
  const r = spawnSync("python3", [ARAC, ...args], { encoding: "utf8" });
  return { cikti: r.stdout || "", kod: r.status };
}
function istemci(desc) {
  return { format_version: "1.10.0",
           "minecraft:client_entity": { description: {
             identifier: "minecraft:player", ...desc } } };
}

const d = mkdtempSync(join(tmpdir(), "birles_"));
const A = join(d, "a.json"), B = join(d, "b.json"), C = join(d, "c.json");

console.log("=== 1. SOZLUKLER BIRLESIYOR ===");
{
  writeFileSync(A, JSON.stringify(istemci({
    animations: { x: "animation.x", ortak: "animation.ortak" },
    geometry: { g1: "geometry.g1" }, textures: {}, materials: {},
    render_controllers: [], scripts: {},
  })));
  writeFileSync(B, JSON.stringify(istemci({
    animations: { y: "animation.y", ortak: "animation.ortak" },
    geometry: { g2: "geometry.g2" }, textures: {}, materials: {},
    render_controllers: [], scripts: {},
  })));
  const r = kos([A, B, C]);
  const o = JSON.parse(readFileSync(C, "utf8"))["minecraft:client_entity"].description;
  kontrol("animasyonlar birlesti (2+2, ortak 1 -> 3)",
          Object.keys(o.animations).length === 3,
          Object.keys(o.animations).join(","));
  kontrol("geometriler birlesti", Object.keys(o.geometry).length === 2);
  kontrol("cikis kodu 0 (catisma yok)", r.kod === 0, String(r.kod));
}

console.log("");
console.log("=== 2. KOSULLAR && ILE BIRLESIYOR (asil is) ===");
{
  writeFileSync(A, JSON.stringify(istemci({
    animations: {}, geometry: {}, textures: {}, materials: {}, scripts: {},
    render_controllers: [
      { "controller.render.player.third_person":
        "!variable.is_first_person && !query.is_spectator && !variable.donusuk" },
    ],
  })));
  writeFileSync(B, JSON.stringify(istemci({
    animations: {}, geometry: {}, textures: {}, materials: {}, scripts: {},
    render_controllers: [
      { "controller.render.player.third_person":
        "!variable.is_first_person && !q.is_spectator && !variable.off_skin" },
    ],
  })));
  kos([A, B, C]);
  const o = JSON.parse(readFileSync(C, "utf8"))["minecraft:client_entity"].description;
  const k = o.render_controllers[0]["controller.render.player.third_person"];
  kontrol("BIZIM korumamiz duruyor", k.includes("!variable.donusuk"), k);
  kontrol("EKIN korumasi da durdu", k.includes("!variable.off_skin"));
  // q. ve query. ayni sey -- iki kez yazilmamali
  const kere = (k.match(/is_spectator/g) || []).length;
  kontrol("q./query. esitlendi, sart iki kez yazilmadi", kere === 1,
          kere + " kez");
  kontrol("tek denetleyici kaldi", o.render_controllers.length === 1);
}

console.log("");
console.log("=== 3. DEGER CATISMASI SESSIZ GECMIYOR ===");
{
  writeFileSync(A, JSON.stringify(istemci({
    animations: { k: "animation.BIZIM" }, geometry: {}, textures: {},
    materials: {}, render_controllers: [], scripts: {},
  })));
  writeFileSync(B, JSON.stringify(istemci({
    animations: { k: "animation.ONLARIN" }, geometry: {}, textures: {},
    materials: {}, render_controllers: [], scripts: {},
  })));
  const r = kos([A, B, C]);
  const o = JSON.parse(readFileSync(C, "utf8"))["minecraft:client_entity"].description;
  kontrol("taban kazandi", o.animations.k === "animation.BIZIM", o.animations.k);
  kontrol("catisma RAPORLANDI", r.cikti.includes("CATISMA"));
  kontrol("cikis kodu 1 (catisma var)", r.kod === 1, String(r.kod));
}

console.log("");
console.log("=== 4. SIRALI ALANLAR SIRAYI KORUYOR ===");
{
  writeFileSync(A, JSON.stringify(istemci({
    animations: {}, geometry: {}, textures: {}, materials: {},
    render_controllers: [],
    scripts: { pre_animation: ["v.a=1;", "v.ortak=0;"] },
  })));
  writeFileSync(B, JSON.stringify(istemci({
    animations: {}, geometry: {}, textures: {}, materials: {},
    render_controllers: [],
    scripts: { pre_animation: ["v.ortak=0;", "v.b=2;"] },
  })));
  kos([A, B, C]);
  const o = JSON.parse(readFileSync(C, "utf8"))["minecraft:client_entity"].description;
  const pa = o.scripts.pre_animation;
  kontrol("yinelenen satir bir kez", pa.length === 3, JSON.stringify(pa));
  kontrol("tabanin sirasi basta", pa[0] === "v.a=1;" && pa[1] === "v.ortak=0;");
  kontrol("ekin yeni satiri sonda", pa[2] === "v.b=2;");
}

console.log("");
console.log("=== 5. DAVRANIS KIPI: GRUPLAR DERIN BIRLESIYOR ===");
{
  const varlik = (g) => ({ format_version: "1.18.20",
    "minecraft:entity": { description: { identifier: "minecraft:player" },
      components: {}, component_groups: g, events: {} } });
  writeFileSync(A, JSON.stringify(varlik({
    "minecraft:raid_trigger": { "minecraft:raid_trigger": { a: 1 } } })));
  writeFileSync(B, JSON.stringify(varlik({
    "minecraft:raid_trigger": { "minecraft:raid_trigger": { a: 1 },
                                "minecraft:spell_effects": { b: 2 } } })));
  const r = kos(["--davranis", A, B, C]);
  const o = JSON.parse(readFileSync(C, "utf8"))["minecraft:entity"];
  const g = o.component_groups["minecraft:raid_trigger"];
  kontrol("grup EZILMEDI, icine eklendi",
          !!g["minecraft:raid_trigger"] && !!g["minecraft:spell_effects"],
          Object.keys(g).join(","));
  kontrol("derin birlesim raporlandi", r.cikti.includes("DERIN BIRLESEN"));
}

rmSync(d, { recursive: true, force: true });
console.log("");
console.log(hata ? "SORUN VAR" : "temiz");
process.exit(hata ? 1 : 0);
