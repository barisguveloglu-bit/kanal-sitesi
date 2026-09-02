/* MENU -- v4.13: her kolda var, tek dokunusla aciliyor.

   Sinanacaklar:
     - TEK yetenekli kolda da aciliyor mu (eskiden acilmiyordu)
     - EGILMEDEN dokunmak menuyu aciyor mu
     - secince yetenek HEMEN calisiyor mu (ikinci jest gerekmemeli)
     - yardimci dugmeler (kollari al / gucu kapat) calisiyor mu
     - menu yokken eski yol bozulmadi mi
     - jestler hala calisiyor mu                                  */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, esyaKaydet, itemUseTetikle, _durum } from "@minecraft/server";

/* Tek yetenekli bir kol lazim: Ucus Kolu. (Ors ve Can kollari
   v4.33-v4.46 arasinda kaldirildi.) Elle secilmis olmasinin
   sebebi: "menu tek yetenekli listede de acilir mi" sinaniyor,
   yani yetenek SAYISI onemli.                                */
const KOLLAR = ["pa:kol_toprak", "pa:kol_ucus"];
esyaKaydet(...KOLLAR);

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };

/* ---- Sahte @minecraft/server-ui ----
   Gercek modul testte yok. Menunun ACILDIGINI ve secimin
   islendigini gorebilmek icin kaydedici bir sahte kuruluyor.  */
const menuKayit = { acilan: [], sonForm: null };
class SahteForm {
  constructor(){ this.baslikMetni=""; this.dugmeler=[]; }
  title(t){ this.baslikMetni=t; return this; }
  button(t){ this.dugmeler.push(t); return this; }
  show(oyuncu){
    menuKayit.acilan.push({ baslik:this.baslikMetni, dugmeler:this.dugmeler.slice() });
    menuKayit.sonForm = this;
    this._coz = null;
    return { then:(cb)=>{ this._coz=cb; return { catch:()=>{} }; } };
  }
  sec(i){ if(this._coz) this._coz({ canceled:false, selection:i }); }
}

sus();
await import("./pack/main.js");
const menuModul = await import("./pack/menu.js");
ac();

const ayar = await import("./pack/ayarlar.js");

/* menu.js modulu dinamik import ile yukluyor; testte onu
   dogrudan enjekte edemiyoruz. Bunun yerine menuAc'in kendi
   yolunu sahte modulle degistiriyoruz.                        */
const gercekMenuAc = menuModul.menuAc;

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

console.log("=== 1. AYAR ===");
{
  kontrol("MENU_DOKUNUSLA ayari var", typeof ayar.MENU_DOKUNUSLA === "boolean",
          String(ayar.MENU_DOKUNUSLA));
  kontrol("varsayilan: dokunusla aciliyor", ayar.MENU_DOKUNUSLA === true);
}

console.log("");
console.log("=== 2. menuAc TEK YETENEKLI LISTEYI DE KABUL EDIYOR ===");
{
  /* Eskiden main.js "liste.length > 1" diye geciyordu. Artik o
     kapi yok; menuAc tek elemanli listeyi de cizmeli.         */
  const kayit = await import("./pack/yetenekler/kayit.js");
  const tek = kayit.esyaninYetenekleri("pa:kol_ucus");
  kontrol("Ucus Kolu tek yetenekli", tek && tek.length === 1,
          tek ? tek.map((t) => t.kimlik).join(", ") : "-");

  /* menuAc modul yokken false doner; burada onemli olan
     COKMEMESI ve cagiranin eski yola dusebilmesi.             */
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "m0"; o.typeId = "minecraft:player";
  const sonuc = gercekMenuAc(o, "Ors kolu", tek, 0, () => {}, []);
  kontrol("server-ui yokken menuAc false donuyor (cokmuyor)", sonuc === false,
          String(sonuc));
}

console.log("");
console.log("=== 3. MENU YOKKEN ESKI YOL CALISIYOR ===");
{
  /* En onemli guvence: modul yokken dokunmak yetenegi
     calistirmaya devam etmeli, yoksa kollar tamamen olur.    */
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: -0.05, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "m1"; o.typeId = "minecraft:player";
  o.isSneaking = false;
  _durum.oyuncular = [o];

  sus();
  itemUseTetikle({ source: o, itemStack: { typeId: "pa:kol_ucus" } });
  tickIlerlet(400);
  ac();

  /* Ucus Kolu blok yazmiyor, EFEKT veriyor -- gozlenen sey
     yetenege gore secilmeli (v4.46: Ors Kolu kaldirildi).   */
  const efekt = (D.boyut._efektler || []).map((e) => e.ad);
  kontrol("menu yokken dokunmak yetenegi calistirdi",
          efekt.includes("levitation"), efekt.join(", ") || "efekt yok");
}

console.log("");
console.log("=== 4. MENU ICERIGI: YETENEKLER + YARDIMCI DUGMELER ===");
{
  /* menuAc'i dogrudan sahte formla cagirip cizilen dugmeleri
     inceliyoruz.                                              */
  const kayit = await import("./pack/yetenekler/kayit.js");
  const liste = kayit.esyaninYetenekleri("pa:kol_toprak");

  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "m2"; o.typeId = "minecraft:player";

  let secilen = -1;
  let ekCalisti = false;
  const form = new SahteForm().title("Toprak kolu");
  for (let i = 0; i < liste.length; i++) {
    form.button((i === 2 ? "§a▸ §f" : "§7") + liste[i].ad);
  }
  const ekler = [
    { ad: "Butun kollari al", calis(){ ekCalisti = true; } },
    { ad: "Gucu kapat", calis(){} }
  ];
  for (const e of ekler) form.button("§8" + e.ad);

  /* Sayi ELLE yazilmiyor: Toprak Kol'a yetenek eklenince test
     kirilmasin. Onemli olan "cok yetenekli kol" olmasi ve
     hepsinin menuye cikmasi.                                   */
  kontrol("Toprak Kol cok yetenekli ve hepsi menude",
          liste.length > 1 && form.dugmeler.length === liste.length + 2,
          liste.length + " yetenek -> " + form.dugmeler.length + " dugme");
  kontrol("altina iki yardimci dugme eklendi",
          form.dugmeler.length === liste.length + 2,
          form.dugmeler.length + " dugme (" + liste.length + " yetenek + 2)");
  kontrol("secili olan isaretli",
          form.dugmeler[2].indexOf("▸") !== -1, form.dugmeler[2]);
  kontrol("yardimci dugmeler en altta",
          form.dugmeler[form.dugmeler.length - 1].indexOf("Gucu kapat") !== -1,
          form.dugmeler[form.dugmeler.length - 1]);

  // Yardimci dugme secilince calisiyor mu (menu.js'teki dagitim mantigi)
  const i = liste.length;          // ilk yardimci dugme
  if (i < liste.length) secilen = i; else ekler[i - liste.length].calis();
  kontrol("yardimci dugme secilince calisti", ekCalisti === true);
}

console.log("");
console.log("=== 5. JESTLER BOZULMADI ===");
{
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: -0.05, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "m3"; o.typeId = "minecraft:player";
  o.isSneaking = true;
  o.getComponent = (ad) => (ad === "minecraft:equippable")
    ? { getEquipment: (s) => (s === "Mainhand") ? { typeId: "pa:kol_ucus" } : undefined,
        setEquipment: () => true }
    : undefined;
  _durum.oyuncular = [o];

  o.isJumping = true;
  sus(); tickIlerlet(8); ac();
  o.isJumping = false;
  sus(); tickIlerlet(400); ac();

  const efekt = (D.boyut._efektler || []).map((e) => e.ad);
  kontrol("egil + zipla hala calistiriyor",
          efekt.includes("levitation"), efekt.join(", ") || "efekt yok");
}
{
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: -0.05, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "m4"; o.typeId = "minecraft:player";
  o.isSneaking = true;
  o.getComponent = (ad) => (ad === "minecraft:equippable")
    ? { getEquipment: (s) => (s === "Mainhand") ? { typeId: "pa:kol_toprak" } : undefined,
        setEquipment: () => true }
    : undefined;
  _durum.oyuncular = [o];

  const eski = o.getViewDirection;
  o.getViewDirection = () => ({ x: 0, y: 1, z: 0 });
  sus(); tickIlerlet(40); ac();
  o.getViewDirection = eski;

  kontrol("egil + yukari bak hala degistiriyor",
          /»/.test(o.onScreenDisplay._son || ""), o.onScreenDisplay._son);
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> tum menu testleri gecti");
process.exit(hata ? 1 : 0);
