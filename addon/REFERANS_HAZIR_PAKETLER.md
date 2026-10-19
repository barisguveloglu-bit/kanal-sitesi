# Hazır paketler — efekt, animasyon, ses (v7.99.15)

Kullanıcının isteği: *"bazı hazır dosyaları kullanmamız gerekiyor ... dövüş
sahneleri yaparken işe yarayacak"* ve *"yeni açtığım oturumda da
kullanabilsin."* Bu belge 2026-10-18'de indirilip **ölçülen** paketleri,
nereden geldiklerini, hangi izinle kullanıldıklarını ve neyin henüz
denenmediğini tutar.

**Hiçbiri film aracına (`blender_film.py`) bağlı değil.** Kurulu ve ölçülü
duruyorlar. Hangisinin 2. bölümün hangi sahnesinde kullanılacağı
kararlaştırıldı: `SERI_SEZON1.md`, "4 part kesimi ve hazır paketler"
(Claude'un kararı, kullanıcı bıraktı). Bağlamadan önce her efektten **bir
önizleme karesi çiz** (CLAUDE.md, dövüş v2 kuralı): aşağıdaki "denenmedi"
maddeleri o önizlemeyle kapanır.

## Kurulum

`bash addon/arac/arac_kur.sh` hepsini `$FILM_PAKETLER` altına kurar
(varsayılan `/opt/araclar/paketler/`). Her dosya betikte **sabit SHA-256**
ile karşılaştırılır; tutmayan kurulmaz, biri inemezse gerisi bozulmaz.
İkinci koşu hiçbir şey indirmez. Ölçüldü: VDB'siz ilk kurulum 9,7 sn;
`--vdb` ile 1 dk 48 sn (açılınca diskte 3,4 GB), ardından ikinci koşu 0,5 sn.

- **CC0 paketler resmî kaynaktan** (OpenGameArt; JangaFX'in kendi
  sayfasındaki MediaFire bağlantıları). MediaFire'ın doğrudan bağlantısı
  her seferinde sayfadan okunur (bağlantı jetonlu, değişiyor).
- **Kullanıcının indirip verdiği paketler** gizli
  `barisguveloglu-bit/already-exists` deposunun **`araclar`** dalından.
  Oturumda o depoya erişim yoksa betik uyarır ve atlar; önce
  `add_repo barisguveloglu-bit/already-exists` yapılır. Dalın kendi
  `README.md`'si dosyaları ve izinleri tekrar sayar.
- **JangaFX VDB'leri yalnız `--vdb` ile** (ya da `FILM_VDB=1`): ~2 GB,
  her oturumun başını yavaşlatmasın.

| klasör (`$FILM_PAKETLER/…`) | dosya | SHA-256 | kaynak | izin |
|---|---|---|---|---|
| `kenney_parcacik` | `kenney_particlePack.zip` (9,8 MB) | `163b839ba7f62f8a420da93a62beaa80013588d5d6b1eb30841e1a553635ad70` | opengameart.org (Kenney) | CC0 |
| `kenney_duman` | `smokeParticleAssets.zip` (13,2 MB) | `da9260580d0f6a522496d03783fc9f740f13faa70844b52fb8df90ea9b72cb7a` | opengameart.org (Kenney) | CC0 |
| `ses_yumruk` | `qubodupPunch.7z` (0,2 MB) | `757795e8778acc377abacea902052c2dc707583c69d00b8baa2e76b670a02398` | opengameart.org (qubodup) | CC0 |
| `pooka` | `pooka_efektler_temiz.blend` (4,2 MB) | `1a83586d726fbbb176a539dc43c089f9f3a0762307c4e64395068487d7b452ed` | gizli `araclar` dalı | yapımcı: "Use it for anything" |
| `quaternius` | `License.txt` | `6d01f55c6e4c49a2c9963e147e561945ae2c83958c8ca667d90a6bffdbfac061` | gizli `araclar` dalı | CC0 |
| `quaternius` | `UAL1_Standard.glb` (7,6 MB) | `69591853d817488edaa8fd9bf8fc1d821eaeaf789f8627b3cd23b41c4ed67997` | gizli `araclar` dalı | CC0 |
| `quaternius` | `UAL1_Standard_RM.glb` (7,6 MB) | `be684571ed655a1b892c2c07e6e2aeca053b606c442d34004adaf1d944090d01` | gizli `araclar` dalı | CC0 |
| `quaternius` | `UAL2_Standard.glb` (8,1 MB) | `8cee20ab1bc55130092447e810e26df22dd2803eccc54f52137a7d54d7ab88a8` | gizli `araclar` dalı | CC0 |
| `quaternius` | `UAL2_Standard_RM.glb` (8,1 MB) | `814eee878f82934992d3ea746c539df25e981487109c591f5efbb8dd03286f99` | gizli `araclar` dalı | CC0 |
| `jangafx_ates` (`--vdb`) | `Fire_01.rar` (68 MB) | `c130c42bf2ffc52254691e2d870c5c54cfda40e73bde4831d1603ccee94fb681` | jangafx.com → MediaFire | CC0 |
| `jangafx_kamp_atesi` (`--vdb`) | `SmallCampfireVDB.zip` (62 MB) | `fce2ad670a4738957f15b742410162e26bb84790e8bddb72ec2a4bd64bcebe30` | jangafx.com → MediaFire | CC0 |
| `jangafx_yer_patlamasi` (`--vdb`) | `GroundExplosionVDB.zip` (694 MB) | `47c2c1d352b3c0dce31e462d09ede9f8bc95b5333ca9764564073b02113dc7b9` | jangafx.com → MediaFire | CC0 |
| `jangafx_hava_patlamasi` (`--vdb`) | `Midair_Explosion_01.rar` (1,23 GB) | `a0d3429e44611fa46872b61657608e97a398dc44e1da031462c964b6f0d380b6` | jangafx.com → MediaFire | CC0 |

`test/arac_kur.mjs` bu tablodaki SHA-256'ların betiktekilerle aynı
olduğunu, SHA'sı tutmayan dosyanın gerçekten kurulmadığını ve hiçbir
paket dosyasının depoya girmediğini ölçüyor.

## Pooka's MineCraft Effects for Blender (Th3pooka)

Gumroad'da ücretsiz (`th3pooka.gumroad.com/l/wmlagc`, 524 indirme, 5,0
puan). Sayfadaki şart: *"Use it for anything! ... You can have these
creations for ANY of your projects!"* Yeniden dağıtım **yazılı değil** →
herkese açık depoya girmez, yalnız gizli dalda (kullanıcının onayıyla,
2026-10-18). Yapımcı MCprep'teki hava efektlerinin de sahibi.

**Ölçüm** (Blender 5.2.2, `--disable-autoexec`; dosya 4.5 ile kaydedilmiş):

- 101 düğüm grubu, **0 tanımsız düğüm** (5.2.2'de hepsi yükleniyor),
  3 simülasyon bölgesi; 417 nesne (378 örgü), 137 geometri düğümü
  değiştiricisi, 15 parçacık sistemi, 172 malzeme. **Python metni yok.**
- Yüklemede 9 bağımlılık döngüsü uyarısı (havai fişek renk değiştirici ve
  büyü masası malzemeleri); dosyayı açmayı engellemiyor.
- Sahne motoru **EEVEE**, 60 fps. Bulut işçisinde EEVEE yok (ekran kartı/EGL
  yok, bkz. CLAUDE.md "Karanlık kötü"); efektler Cycles'ta tek tek denendi,
  aşağıda "Cycles denemesi".
- Dövüşe yarayacak koleksiyonlar: `Explotion All`, `Explotion GeometryNode`,
  `Smoke Explotion GeometryNode`, `Eevee Motion Explosion` (patlama);
  `Applied Lightning`, `Lightning Hook`, `Lightning Solid` (yıldırım);
  `Crit Particles` (kritik vuruş parçacığı); `Sculk Charge`, `Sculk Pop`,
  `Sculk Soul Partical`, `Soul Particals`; `Enchantment Particles`,
  `Portal particals …` (büyü); `Simulation Node Effects` (25 nesne,
  `Smoke Simulation Nodes` dahil); `Simple effects` (`Light Rays`,
  `Magic Circle flame` …); duman çeşitleri, kamp ateşi, meşale, su sıçraması,
  yağmur, kar, yaprak, `Tornado blocks`, `End Transition`.
- Kullanılmayacaklar: `Pooka` ve `Referance Scale` koleksiyonlarındaki oyuncu
  modelleri (Pooka'nın kendi skinleri), zırh modelleri (dokuları çıkarıldı).

**Temiz kopya — neden ve nasıl.** Asıl dosyaya 193 resim gömülüydü ve
çoğu **Mojang'ın oyun dokuları** (parçacık, blok, zırh); ayrıca bir
arkadaşının skini, başka paketlerden (BSS, Rymdnisse, Twilight Forest)
dokular ve iki stok resim. Kuralımız Mojang dosyalarını depolarımıza
sokmamak. Asıl dosya kullanıcının Drive'ında kaldı
(`Pooka Effects SHARED.blend`, 4.178.312 bayt, SHA-256
`7ef56e01b977849903ceb0a0e42e4f8a49612671a1a19ea171091cccf67f3b14`);
gizli dala giden kopyada:

- **174 doku MCprep'teki aynı adlı dokuya bağlandı** (gömülü veri
  çıkarıldı, yol `/opt/araclar/mcprep/.../mcprep_default/assets/minecraft/textures/…`).
  Filmlerimizin blok dokuları da oradan geliyor.
- **24 gömülü doku çıkarıldı**, karşılığı yok: zırh katmanları, `note_block`,
  `spore_blossom`, `End_Portal_29_JE1`, `enchanted_item_glint`, başkasının
  skini, BSS/Rymdnisse/Twilight Forest dokuları, stok resimler. Bunları
  kullanan malzemeler **pembe** çıkar; kullanmadan önce kendi dokumuzla
  ya da Kenney ile değiştir.
- `Minecraft Italic` yazı tipi çıkarıldı (lisansı bilinmiyor, marka yazısı).
- Pooka'nın kendi 6 resmi (`CREATED/…`, kendi skinleri) içinde kaldı.

`$ARAC_KOK` `/opt/araclar` değilse MCprep'e giden 174 yol kırılır: dosya
açıldıktan sonra yolların kökü değiştirilir.

### Cycles denemesi (2026-10-19)

Blender 5.2.2, Cycles CPU, 24 örnek, 640×360, nötr gri dünya ve bir güneş.
Her efekt **tek başına** çizildi (geri kalan her şey `hide_render`);
simülasyonlu olanlar kare kare ilerletildi. Betikler depoda değil.

**Tuzak — dışlanmış koleksiyonlar.** Dosyadaki 92 koleksiyonun 82'si görünüm
katmanından dışlanmış (`layer_collection.exclude`): parçacık kaynakları
(`Crit Particles`, `Soul Particals`, `Snow Particles` …), `Simulation Node
Effects` ve `Unused` altındaki her şey. Böyle bir koleksiyondaki nesne,
`hide_render` kapalı olsa da **boş çizilir**; önce kendi koleksiyonu ve
üstleri açılır. İlk denemede kritik vuruş, ruh, sculk ruhu simülasyonu ve
kasırga bu yüzden boş çıktı ve "çalışmıyor" diye yazıldı. Bu yanlıştı ve
düzeltildi. Dağıtıcı nesneler (`Simple Partical Distribution`, `Simple
effects`) açık koleksiyonda, doğrudan çiziliyor.

| durum | efektler |
|---|---|
| çiziliyor | `Explotion All` (patlama), `Applied Lightning` (yıldırım), `Enchantment Particals Simple` (büyü harfleri), `Flame box` (alev), `Large Smoke Simple` (duman), `Light Rays` (ışık huzmesi; varsayılanı pembe), `Magic Circle flame`, `Nether Portal Particals Simple`, `Potion particals` (yeşil), `Snow Simple`, `Wind Simple`, `Delta Ash Simple` (kül), `Simple Effect`, `Smoke Simple Torch area` (meşale dumanı), `Spawner` (spawner alevi), `Warden Blast GeoNode` (şok halkası, camgöbeği) |
| koleksiyonu açılınca çiziliyor | `Crit Particles.000–.004` (kritik vuruşun 5 karesi; dokusuz, düz beyaz-gri örgü), `Soul.000` (ruh), `Sculk Soul Simulation Nodes` (sculk ruhu, camgöbeği), `Smoke Progretion Curve.001` (kasırga: 45 m'lik sütun ve uçuşan bloklar; yazarın `Unused` koleksiyonunda) |
| boş | `Summoning circle`: şeklini `shapes-34437_640.png` stok resminden okuyor, resim temiz kopyadan çıkarıldığı için 0 köşe. `Leafy Wind GeoNodes` (`Unused`): koleksiyonu açılınca da boş, sebebi ölçülmedi. |

**Zamanlama.** `Explotion All` (60 fps): 1. karede yok, 5–35. karelerde dolu,
50. karede bitmek üzere, 80'den sonra boş. Patlama ~0,1–0,8 sn arasında
görünüyor. Filmimiz 30 fps, kare sayısı yarıya iner. MCprep'in iki TNT
sahnesi (24 fps, 130 kare, EEVEE) de Cycles'ta çiziliyor:
`tnt_explosion_instant` 2–14. karelerde görünür, 22'de boş (~0,1–0,6 sn).
`tnt_explosion` (fitilli) 2–30. karelerin hepsinde çizim var (30'da
azalıyor; sonrası ölçülmedi).

**Maliyet.** Tek başına bir efekt karesi bu ayarda 1–10 sn sürdü. Filmin tam
kalitesinde, sahnenin içinde ölçülmedi.

## Quaternius Universal Animation Library 1 ve 2 [Standard]

itch.io'da ücretsiz Standard sürüm (`quaternius.itch.io/universal-animation-library`
ve `…-2`); zip'in kendi `License.txt`'si: **CC0 1.0**. Kullanıcı indirip
Drive'a koydu (boyutlar Drive'dakiyle bayt bayt aynı); yalnız `.glb`'ler
alındı. `_RM` sürümlerinde kök hareketi (root motion) animasyona işlenmiş.

**Ölçüm** (Blender 5.2.2 glTF içe aktarma): ikisinde de aynı iskelet,
65 kemik, Unreal manken adları: `root`, `pelvis`, `spine_01–03`, `neck_01`,
`Head`, `clavicle/upperarm/lowerarm/hand_{l,r}` (+ parmaklar),
`thigh/calf/foot/ball_{l,r}`. Her kütüphanede 43 eylem. Dövüşe yarayanlar
(parantezde içe aktarmadaki kare aralığı):

- **UAL1:** `Punch_Jab` (0–20), `Punch_Cross` (0–24), `Roll` (0–35),
  `Hit_Chest` (0–8), `Hit_Head` (0–10), `Death01` (0–57),
  `Spell_Simple_Enter/Idle_Loop/Shoot/Exit` (büyü atma; ateş topu için),
  `Sword_Attack`, `Sword_Idle`, `Jump_Start/Loop/Land`, `Sprint_Loop`,
  `Crouch_Idle_Loop`.
- **UAL2:** `Melee_Hook` (+ `_Rec`), `Hit_Knockback` (0–20),
  `Idle_Shield_Loop`, `Shield_OneShot`, `Shield_Dash`, `Idle_Shield_Break`
  (kalkan), `Sword_Block`, `Sword_Dash`, `Sword_Regular_A/B/C` (+ `_Rec`),
  `Sword_Regular_Combo`, `Sword_Heavy_Combo` (0–104), `OverhandThrow`
  (fırlatma; blok atma için), `NinjaJump_Start/Idle_Loop/Land`,
  `Slide_Start/Loop/Exit`, `LayToIdle` (yerden kalkış), `ClimbUp_1m`,
  `Zombie_Idle_Loop/Walk_Fwd_Loop/Scratch`.

**Denenmedi:** bizim aktöre aktarma (retarget). Minecraft gövdesinde dirsek
ve diz yok; en basit eşleme `Head→head`, `spine_03→body`,
`upperarm_{r,l}→rightArm/leftArm`, `thigh_{r,l}→rightLeg/leftLeg` ve alt
kemiklerin dönüşünü üst kemiğe katmak. Kare aralıkları Blender'ın içe
aktarmasındaki karelerdir; saniyeye çevirmeden önce eylemin fps'ini ölç.

## Kenney parçacıkları ve duman (CC0)

- `kenney_particlePack.zip`: 97 PNG (ateş, duman, büyü, kıvılcım, elektrik,
  ışık deseni) + Unity paketi (kullanılmaz). Kendi `License.txt`'si: CC0.
- `smokeParticleAssets.zip`: 79 PNG, beş tarz (siyah duman, patlama,
  parlama, beyaz duman, …). Kendi `license.txt`'si: CC0.

Yumuşak, blok tarzı olmayan resimler; billboard parçacık olarak.

## Yumruk sesi — qubodup "Punch" (CC0)

5 `.flac` + aynı 5 `.ogg`. Film sesimiz zaten Kenney darbe seslerini
kullanıyor (`kaynak_ses/film/`, KAYNAKLAR.md); bu ek seçenek.

## JangaFX EmberGen VDB'leri (CC0, `--vdb`)

Her paketin `LICENSE.txt`'si CC0, `README.txt`'si: *"free to use these VDBs
in any project however you please, both commercially and non-commercially"*.
Kare sayıları: `Fire_01` 101, `SmallCampfire` 200, `GroundExplosion` 200,
`Midair_Explosion_01` 126 `.vdb`. Gerçekçi hacimsel duman/ateş; Minecraft
tarzına uymuyor. **Cycles'ta çizim maliyeti ölçülmedi** — hacim çizimi CPU'da
pahalı, kare başına 6–25 dk'lık bütçemizi büyütür. Önce tek kare önizleme.

## Zaten kurulu olan: MCprep 3.6.3

`$MCPREP_DOKU`'nun bulunduğu paket ayrıca şunları taşıyor
(`/opt/araclar/mcprep/MCprep_addon/MCprep_resources/`):

- **Oyuncu rig'leri (7):** Player FancyFeet v2.6.0 (+ zırhlı), Slim
  FancyFeet, Simple Rig ve Simple Slim Rig (Boxscape), VMcomix Rig v2,
  StoryMode Jesse.
- **Yaratık rig'leri (~30):** zombi, iskelet, illager'lar, demir golem,
  warden, blaze, kurt … (2. bölümdeki "asker gönderme" için). Ordu için
  seçilenler: `hostile/stray - thefunnypie2.blend` (buz iskeleti),
  `hostile/Zombie - HissingCreeper.blend`, `hostile/creeper - TheDuckCow.blend`,
  `friendly/Iron Golem - Trainguy.blend`. **Henüz çizilmedi.**
- **Efektler:** `tnt_explosion`, `tnt_explosion_instant` (ikisi de Cycles'ta
  çiziliyor, yukarıda "Cycles denemesi"), TheDuckCow'un parçacıkları,
  Th3pooka'nın hava efektleri.

MCprep GPL-3.0; rig'ler dosya adlarında yapımcılarıyla dağıtılıyor.

## Alınmayanlar

- **BPS Rig v4** (Black Plasma Studios): lisans yazılı değil; resmî bağlantı
  (`mcsqm.com/bpsrigv4dl` → `redirect.squaredmedia.org`) sunucudan
  Cloudflare denetimine takılıyor (403). Kullanıcı indirmedi.
- **Ice Cube rig:** sayfası "open source" diyor, lisans dosyası bulunamadı.
- Ücretli paketler (BlendAtlas BPS animasyonları, Elemental VFX vb.):
  Pooka + Kenney + Quaternius'un kapatmadığı bir ihtiyaç çıkmadıkça gerek yok.

## 2. bölümdeki kullanım

Burada eskiden bir öneri tablosu duruyordu. O tablo karara dönüştü ve karar
**yalnız** `SERI_SEZON1.md`'de ("4 part kesimi ve hazır paketler",
2026-10-19); iki belge birbirine ters düşmesin diye burada tekrar yazılmadı.
Tablodan kalan bir bilgi: yarım küre buz kalkanının hiçbir pakette karşılığı
yok, kendi kubbe ve kenar parlaması gölgelendiricimiz yazılacak.
