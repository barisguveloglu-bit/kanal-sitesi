# Film aracı — yetenek haritası

v7.99.16 · 2026-11-01 (akıcı hareket eklendi; 2026-10-25'te ince kollu model; 2026-10-19'da Osmanlı Topuzu, balta seti ve dizli bacak; ilk hâli v7.99.14 · 2026-10-17). Kaynak: `arac/blender_film.py`, `film_poz.py`, `hareket.py`,
`kamera_denetim.py`, `zemin_denetim.py`, `form_model.py`, `thomas_goz.py`,
`film_ses.py`, `film_birlestir.py` ve `test/` altındaki film testleri.
Kod okunarak çıkarıldı; bu bir envanter, karar değil. Sayılar ya kod
sabiti ya da kayıtlı ölçüm.

## Hazır olan / hiç olmayan

**Akıcı hareket (v7.99.16, senaryoda `"akici": true`)**

Kullanıcı: *"robotik dövüşlerden ya da hareketlerden memnun değilim."*
Kodda ölçülen sebepler ve karşılıkları (`arac/hareket.py`, kilit
`test/hareket.mjs`):

**Hareket denetimi (v7.99.16, kullanıcı: *"yürüyüşler her şey robotik olmayacak değil mi, bunları ayrıca denetle"*):** `python3 arac/hareket_denetim.py film/<senaryo>.json` her oyuncunun kökünü kare kare ölçer: tek karede hız sıçraması (> 18 blok/sn²; zıplayış inişinden sonraki 0,5 sn'de > 47), ani dönüş (> 4160°/sn² ya da > 790°/sn), ışınlanma (> 0,5 blok/kare), yürümeden kayma. `"akici": true` açık diye güvenilmez, ölçülür. 1. bölüm dışındaki her senaryo temiz olmalı (`test/hareket_denetim.mjs`). İlk koşuda Part 1'in beş senaryosunda 8 bulgu çıktı; aşağıdaki tablonun son üç satırı onların düzeltmesi. Kemik düzeyi (kol, bacak) bu denetimin dışında: onu önizleme gösterir.

| robotik görünen | eskisi | akıcıda |
|---|---|---|
| dönüş | sabit 540°/sn, ilk karede 22,5° atlıyor, anında duruyor | ivme sınırlı yay: ilk karede ~2°, en çok 26,6°/kare, yavaşlayarak oturur (180° ≈ 0,8 sn) |
| yürümeye başlama/durma | ilk karede 0 → 4,3 blok/sn, varışta anında durma | 9 blok/sn² ivme, varışa yaklaşırken frenleme; son 0,3 blokta hız kalanın 0,6. kuvvetiyle söner (fren hiç 9'u aşmaz, son kare ~0,2 blok/sn; v7.99.16 denetimi: sabit frenle son karede 0,6 → 0) |
| yürürken yeni `git` | yol tek karede kırılıyor (yan ivme 51 blok/sn²) | yol kavisli: hareket yönü hedefe en çok 9 blok/sn² yan ivmeyle döner, hedef yanda kaldıkça yavaşlar; son 0,15 blokta doğrudan hedefe |
| zıplama | kalkış karesinde bir kare yerinde (yürürken 2,6 → 0 → 2,6), yere değince yatay hız tek karede 4,5 → 0 | kalkış olayın karesinde; inişte yatay hız sürtünmeyle söner (τ 0,12 sn, ~0,5 blok kayma, Minecraft'ın yer sürtünmesine yakın) |
| adım | sert bacak açılınca iki ayak havada (40°'de 1,5 px, koşuda 3 px) | gövde ayak temasına iner (bacağın alt köşesi, gerçek modelle bire bir); doğal inip kalkma |
| yürüyen gövde | yalnız kol ve bacak sallanıyor | hıza göre öne eğilme, göğüs burulması (baş sabit), kollar gövdeye sürtmez |
| baş | kendiliğinden hiçbir yere bakmıyor | vurduğu / yürüdüğü / `bak`tığı aktöre, yoksa 10 blok içindeki en yakına döner; yayla gecikir (dönüşe baş önce başlar); vuruşta %70 azalır, film pozunda poz yönetir. `"bak_bas": [x, y, z]` başı bir NOKTAYA çevirir (aşağı eğim sınırı 25° yerine 45°; yerde yatanın yüzü), `null` olağan takibe döndürür |
| hareketler arası geçiş | 0,12 sn doğrusal | aynı süre, smoothstep (yumuşak giriş-çıkış). Aynı anda biten ve başlayan iki film pozunda eski poz, yenisi tam girene kadar tutulur (poz devri): geçiş iki poz arasında olur, tabandaki ayakta duruş araya girmez |
| film pozları (`dus`, `kalk`...) | birkaç anahtar arası doğrusal | Blender'ın "auto clamped" eğrisi (taşmasız), kol ve baş gövdeden 0,05 sn geride (örtüşme), büyük kol hareketinin sonunda hafif taşma; yere değen pozlar 30 Hz'de yeniden zemine oturtuluyor. Temas hesaplı pozlarda (`_cozum`) kaydırma ve taşma yok: el yere/bloğa aynı anda değer |
| darbe tepkisi | hep aynı | vuruşun yönüne ve gücüne göre baş ve gövde ırkilmesi, küçük deterministik oynama; savunan da hafifçe sarsılır |
| itme sönümü | karede ×0,8 (kare hızına bağlı) | zamana bağlı (24 kare/sn'de eskisiyle aynı) |
| duran karakter | yalnız nefes | nefese ek ağırlık aktarma (5,3 sn) |
| **yürürken duruş (kullanıcı: "Barış'da duruş bozukluğu var")** | setin TAM duruşu yürürken de kalıyordu: Barış antitheus duruşunun 21° yana dönük kökü ve 12–20° burulmuş bacaklarıyla, salınım üstüne eklenerek yürüyordu. Oyun hareket edince `durus_ust`a geçiyor, film hiç geçmiyordu. **1. bölümün iki partında da var; kullanıcının kararı: 1. bölüm yeniden çizilmeyecek** (*"1. bölüm artık çok geç, çizme en iyisi"*, 2026-11-01). | yürürken üst beden duruşuna yumuşak geçiş (oyundaki gibi): kök ve bacak burulması 0° |
| dizsiz bacak | Epic Fight duruşu dize kurulu; tek kutu bacak uyluğun açısını alınca ayak gövdenin altından kayıyor (ayaklık üstünde durur gibi) | akıcı senaryoda diz varsayılan (`"diz": false` ile kapanır) |

**`akici` yazılmayan senaryo eski hareketi verir**: 1. bölümün iki
senaryosu değişmedi (dosyayı değiştirmek özetini değiştirir, çizilmiş
her blok "başka sürümle çizilmiş" uyarısı verirdi). Eski ve yeni kod
1. bölümün 14.487 karesinde bire bir aynı çıktı verdi. `film/` altındaki
1. bölüm dışı her senaryo `"akici": true` taşımak zorunda (test kilitliyor).
Önce/sonra karşılaştırması (önizleme kalitesi): aynı sahne iki kez
çizildi, yan yana video kullanıcıya gönderildi.

**Hamle**
- Hazır:
  - **Hareket:** `git` (yürüme 4,3, koşma 5,6 blok/sn; `adim` ile elle hız), `bak` (540°/sn), `kacin` geri/sağ/sol (2,4 blok, 0,3 sn; kaçış sırasında vuruş geçmez), `isinlan` (iki mor flaş), `gizle`/`goster`.
  - **Saldırı:** `vur` türleri `oto` (kombo sırası; 2 sn ara verilince başa döner), `kosu`, `hava` (havaya kalkan vuruş) ya da vuruşun adı. Ayarları: `hiz`, `hamle` (atılma çarpanı), `itme`, `kan`, `dusur` (vuruşla yere düşürme). Temas anı ve hamle izi oyundaki WoM verisinden geliyor; menzil 3,5 blok.
  - **Savunma ve tepki:** `savun` (süreli) önden gelen vuruşun itmesini %35'e indirir, darbe tepkisi oynatmaz. Darbe tepkisi (0,4 sn) otomatik. İki aktörün merkezleri arasında en az 1,05 blok kalır.
- Dövüş setleri (17):
  - `antitheus` (Barış): `auto_1/2/4`, koşu vuruşu `agression`, hava vuruşu `guillotine`.
  - `yumruk` (El-Harkos).
  - 6 asa seti: `staff_auto_1–3`, `squall`, `kingkong`.
  - `topuz` (Ömer, v7.99.15): Epic Fight baltasından **türetilmiş** (`arac/wom_cevir.py` `TURETILMIS`): `axe_auto1/2`, koşu `axe_dash`, hava `axe_airslash`, bekleme duruşu Epic Fight'ın normal duruşu. Vuruşlar, süreler, hasar ve hamle baltayla aynı (hız demir balta, 0,9). Silah elde kaymıyor; çarpışma düzeltmesi önce kolda, kalanı bilekte, ikisi de izlemeli.
  - `balta` (v7.99.15): Epic Fight'ın tek elli baltası; eşyası yok, yalnız topuzun tabanı.
  - ruine, longsword, satsujin, evil_tachi, nova, herrscher, solar.
- **Zıplama ve düşme (v7.99.16, yalnız blok mekânda):** `zipla: [x, y]` Minecraft'ın tik hesabıyla (0,42 blok/tik, yer çekimi 0,08, tik başına %2 sürtünme; tepe 1,2522 blok) hedefe tam iner; kenardan yürüyen aktör de aynı yer çekimiyle düşer. Hızlı inişte diz çöker (uyluk θ, baldır 2θ: ayak kalçanın altında kalır), iniş sesi. Basamağa çıkış Minecraft gibi 0,6 blok. Kilit `test/mekan.mjs`.
- Ortam: `yer_vurus` (yumruk yere iner, toprak sıçrar, önüne 0,5 blokluk bir blok kopar) → `parca_al` (iki elle; el ile blok arası ≤ 0,15 blok denetleniyor) → `parca_at` (balistik uçuş 0,15–1,5 sn, hedefin önünde kırılır).
- Yok:
  - büyü ya da mermi saldırısı, kalkan, bir aktörü tutup fırlatma, aynı anda birden çok kişiye vuruş;
  - yol bulma, engelden dolaşma, tırmanma, uçma; duvar çarpışması (blok mekânda aktör zemine basar ama duvarın içinden geçebilir: yolu senaryo seçer);
  - ağaç devirme, blok kırma, topraktan başka blok türü;
  - **Karanlık Tırpan ve Osmanlı Topuzu dışında çizilen silah modeli.** Ay Işığı Asası'nın modeli eklentide var ama filme bağlı değil; başka setle dövüşen aktör eli boş savurur.

**Poz** (`film_poz`, 20)
- Hazır:
  - **Film pozları:** `dus`, `kalk`, `sendele`, `diz_cok`, `yuzustu`, `bayil`, `govde_tut` (yaralı yürüyüş), `comel_dokun`, `etrafa_bak`, `kagit`, `yere_yumruk`, `blok_al`, `blok_at`, `tirpan_bekle`.
  - **2. bölüm Part 1 (v7.99.16, kilit `test/kulube_sahne.mjs`):** `dogrul` (yatakta sersem doğrulma, oturup bakınma; `dus` ile yatırılmış aktörden; yatağa oturur, en alt nokta her an ≤ 0,1 px), `kitap_al` / `kitap_oku` (sayfa çevirir, döngü) / `kitap_koy` (aynı kol açısından birbirine bağlanır), `titre` (üşüme, 8 Hz döngü), `kapi_tikla` (iki vuruş).
  - **Dövüş kimliği (2026-11-04, kilit `test/dovus_kimlik.mjs`; kullanıcı: *"öğrendiklerinin hepsini karakterlerimize entegre et"*):** aktöre `"kimlik": "baris" | "ice_man" | "pipos" | "omer" | "zisa" | "arkadas" | "asker"` (`arac/dovus_kimlik.py`), dövüşe `"dovus": true` olayıyla girilir, `false` ile çıkılır. Dövüş hâlinde (yalnız akıcı) nefesin süresi ve genliği, ağırlık aktarması ve dövüşe hazır bekleme duruşu (bel eğimi, ayak açıklığı) karaktere göre: Ice-man kıpırtısız (nefes %15), Barış hızlı solur ve beli 8° önde, Pipos geniş ve yavaş. Bekleme duruşu yürürken söner. Dövüş dışında her sayı bire bir eski: Part 1'in altı senaryosu kimlik etiketi taşıyor, pozlar etiketsiz hâliyle aynı (ölçüldü). Aynı modülde kendi hamle setlerimizin künye doğrulaması (`kunye_dogrula`: başlangıç < temas ≤ toparlanma, ağırlık sınıfı, işaret, savrulma 2–6 kare önce, vurulanın tepkisi) ve vuruş donması sayıları (`donma_kare`: hafif 1, orta 2, ağır 3 kare, Saldırı II +1); donma henüz zaman haritasına bağlı değil (ilk kendi setimizle bağlanacak). Tasarım: `DOVUS_KIMLIKLERI.md`, araştırma: `REFERANS_DOVUS_KOREOGRAFI.md`.
  - **Hanedanın girişi (2026-11-03, kilit `test/part1_parcalar.mjs` 13. bölüm):** `endise` (eller karnın önünde kenetli, birbirini ovuşturur, döngü; baş eğik), `eller_arkada` (sakin bekleyiş, eller sırtta). `eller_arkada` `"_bas_serbest"` taşır: film pozu başı yönetmez, baş takibi sürer (bekleyen arkadaş Pipos'u gözüyle izler); öbür film pozları başı eskisi gibi yönetir. Geri alınan iki deneme: eli çenede (düz Minecraft kolu çene için fazla uzun, kol yüzün önünden yatay geçti) ve göğüste kavuşmuş kollar (iki kolun ucu kameraya bakıyor, kullanıcı elde silah sandı).
  - **Oyundan gelenler:** `savun`, üç yöne `kacin`, `darbe`, `konus`.
  - **Otomatik:** nefes ve yürüyüş.
  - Yere değen pozlar ölçülerek zemine oturtuluyor.
- Yok: yataktan kalkıp yatağın yanına inme (Part 1'de kesmeyle: oturan aktör gizlenir, ayaktaki gösterilir), sandalyede oturma, büyü yapma ya da el açma, kalkan duruşu, selam.

**Efekt**
- Hazır:
  - kıvılcım (vuruşta sarı, savunmada mavi), mor ışınlanma flaşı, gücü ayarlanabilen toprak sıçraması, uçan ve kırılan blok, azaltılmış kan;
  - çukur (`zemin.cukur`): t anında açılır, ezik zemin ve saçılmış toprak bırakır, aktör çukura basar;
  - `efekt` olayıyla bu efektlerden biri istenen noktaya konabiliyor;
  - `zaman` aralığıyla ağır çekim (0,25) ve donma (≤ 0,04);
  - sarsıntı: savunulmamış vuruşun son temasında ve yer yumruğunda kendiliğinden, **sabit şiddette** (0,06 blok, 0,3 sn).
- Yok:
  - ateş, alev, duman, patlama ışığı;
  - yarı saydam kalkan kubbesi ve çarpma dalgası;
  - buz ve donma efekti (seyrek kar var, aşağıda);
  - şiddeti ayarlanabilen sarsıntı (görüntü titremesi artık var, aşağıda);
  - beyaz geçiş (kararma var, aşağıda);
  - yumuşak hız rampası (`zaman` aralıkları basamak gibi değişiyor).
- **Ağız ve boynuz (v7.99.16, kilit `test/agiz.mjs`; kullanıcı: 2. bölüm Part 2'den itibaren, 2026-11-07'den beri ağız Part 1'de de; 1. bölümde yok):**
  - Senaryoda `"agiz": true` (ya da aktörde `"agiz": true/false`): dokuyla yapılan ağız. Yüzün ağız satırlarına (varsayılan 6–7; Zisa'da yalnız 7, gözleri 6'da) ince bir katman, kafa kemiğine bağlı, kafanın ön yüzüyle aynı UV kuralıyla (`B.kupler`; skin aynası dahil hizalı), yüzün 0,05 px önünde (şapka katmanının arkasında). Şekil kareye göre anında değişir.
  - Şekiller: dudak senkronunun alışılmış harfleri (A kapalı M/B/P, B az açık, C açık, D geniş, E yuvarlak, F büzük, G F/V, H L, X dinlenme = skinin kendi yüzü) + `gulumse`, `sirit`, `kahkaha`. Varsayılan şekiller kendi çizimimiz (kodla, skinin tenine göre); kullanıcı çizerse `kaynak_doku/agiz/<skin adı>` geçerli (hücreler yan yana, `agiz.SEKILLER` sırasında).
  - Dudak senkronu `"soyle"` metninden (seslendirme kaydı yok): Türkçe harf → şekil, en kısa tutma 2 kare, konuşma altyazı süresine ve bir sonraki konuşmanın başına sığar. İfade: `{"aktor", "agiz": "sirit"}`, `null` dinlenmeye döner; konuşmadan sonra ifade geri gelir. Kayıt gelirse Rhubarb Lip Sync (MIT, Türkçe için `phonetic` tanıyıcı) aynı harflerle zaman çizelgesi verir; bu makineden GitHub sürüm sayfası 403 verdi, kurulmadı.
  - Aktörde `"boynuz": "seytan"` (kısa, yukarı, öne/dışa kıvrık, sivrilen; 5 kademe) ya da `"keci"` (geriye ve aşağı, kafanın üstünden dolanan; 9 kademe); iki yan ayna simetrik, koyu kırmızıdan siyaha; `{"tur", "renk": [[r,g,b], [r,g,b]]}` ile renk.
  - **Thomas Rig Legacy'nin 3B ağzı** (kullanıcı: *"onda ağız da var"*; 2026-11-07'den beri bütün konuşmalar bununla — her konuşma anı `goz: "thomas"` planında, göz rengi skinin kendi pikselinden, `test/agiz.mjs` 6. bölüm): `goz: "thomas"` planlarında aynı çizelgeyle iskeletin kendi ağzı konuşur (kontroller ölçüldü, `REFERANS_THOMAS_RIG.md` "Ağız"; dişler ve dil yalnız ağız açıkken çizilir); o planlarda doku ağzı gizli. Öbür planlarda doku ağzı.
  - Yazılmazsa hiçbir şey eklenmez: 1. bölüm ve Part 1 bire bir eskisi.
- **2. bölüm Part 1 parçaları (v7.99.16, kilit `test/part1_parcalar.mjs`):**
  - `"kararma": [{"t": [t0, t1], "giris", "cikis"}]`: görüntü pozlamayla siyaha iner ve açılır (göz kapanıp açılması, bayılma). Titremeyle aynı pozlama eğrisinde; titremenin rastgele dizisini değiştirmez.
  - `"bulaniklik": [{"t", "fstop", "mesafe", "gecis"}]`: odak gözün önüne çekilir, diyafram açılır (Barış'ın gözünden bulanık cadı). Yalnız bulanıklık için açılan alan derinliği aralık dışında f/128: odak yazmayan çekim keskin kalır.
  - `"kar": {"t", "merkez", "alan", "sayi", "hiz", "ruzgar", "tohum"}`: Minecraft kar tanesi gibi küçük beyaz kareler, rüzgârla batıya kayar, yere inen tane tepeden yeniden başlar. Pooka karı bağlanmadı; seyrek kar için bu yetti.
  - `"esya": "fener"`: Minecraft'ın asılı feneri sol yumruktan sarkar, içinde sıcak nokta ışığı (`"fener_guc"`, W).
  - Savaş odası (`arac/hanedan.py` `savas_odasi`): kalenin zemin katının kuzey yarısı, bölme duvarında açık kapı, harita masası, kırmızı halı, tavandan sarkan fenerler, meşaleler, kitaplık, altın köşeler; kapının iki yanında iki sancak. Kalenin dışı bire bir aynı. Biçim Claude'un önerisi.
  - Sancak ve savaş haritası **kendi çizimimiz**, kodla piksel piksel üretiliyor (dosya yok): sancak 20×40 Minecraft sancağı ölçüsünde, "Surda Şafak" (kullanıcı onayı bekliyor). İkinci sürüm (kullanıcı: *"daha iyi yap, detaylı"*): düz üç renk yerine piksel doku — çekilen gecenin son yıldızları, ufka doğru turuncuya dönen kızıl gök, on altı ışınlı güneş mazgallı surun ARKASINDAN doğuyor, tuğlalı sur, kemerli tahta kapı, altın kenar şeridi.; harita parşömen üstünde kıta, buzlu doğu, bölge sınırları, ülke işaretleri.
- **Satanachia'nın ruhu ve görüntü titremesi (v7.99.16, kilit `test/ruh_kure.mjs`):**
  - `"ruh": {"yaricap", "yol": [{"t", "nokta"}], "gir", "parilti"}` kara duman küre: küçük mat siyah çekirdek, çevresinde kenarı gürültüyle lime lime olan siyah hacim (ışığı yutar, saçmaz). İlk noktada 0,35 sn'de büyüyerek belirir, yol boyunca zamana göre Catmull-Rom eğrisiyle gider (anahtarda hız sıçramaz), `gir` anında son noktada küçülüp kaybolur.
  - `"parilti": {"renk", "guc", "isik"}` **Claude'un önerisi, varsayılan değil:** dumanın içinde seyrek, sönük közler, isteğe bağlı olarak içinde kızıl nokta ışığı. Gece katıksız kara duman kara gökte ve karanlık odada kayboluyordu.
  - `"titreme": [{"t": [t0, t1], "guc"}]`: o aralıkta kamera her karede biraz kayar ve döner, pozlama kırpışır; uçlarda 0,15 sn'de açılıp kapanır. Ayrı tohumla çalışır; `titreme` yazmayan senaryonun kamerası bire bir eskisi kalır.
- **Kurulu ama bağlı değil (v7.99.15):** ateş, duman, patlama, yıldırım,
  kritik vuruş ve büyü parçacıkları (Pooka, Kenney), gerçekçi VDB patlamaları
  (`--vdb`), Quaternius dövüş animasyonları (yumruk, yuvarlanma, kalkan,
  fırlatma, yerden kalkış, büyü atma), MCprep yaratık rig'leri. Yukarıdaki
  "Yok" maddelerinin bir kısmı bunlarla kapanabilir; film aracı henüz hiçbirini
  okumuyor. Ölçüm (Cycles denemesi dahil): `REFERANS_HAZIR_PAKETLER.md`;
  2. bölümde hangisi nerede: `SERI_SEZON1.md` ("4 part kesimi").

**Kamera**
- Hazır:
  - 10 kalıp (`genis`, `yan`, `omuz`, `yakin`, `yakin_on`, `ust`, `dusuk`, `yorunge`, `takip`, POV için `goz`) ve `elle` (nokta, `kaydir`);
  - ayarlar: `gecis`, `lens`, `yatik`, `odak` (alan derinliği), `taraf`, `kam_dz`/`bak_dz`;
  - kamera denetimi blok mekânda (v7.99.16): kamera bir bloğun içindeyse `DUVAR`; duvar, yaprak ve sarkan sarmaşık konuyu kapatıyorsa `KADRAJ`. Orman ağaçları yalnız ormanda sayılır.
  - 180° kilidi ve yumuşak takip kendiliğinden.
- Yok:
  - çekim içinde zoom (lens çekim boyunca sabit);
  - sürekli el kamerası titremesi;
  - diz çöken, yatan ya da birbirine giren aktöre uyan kalıp. Kalıplar ayaktaki aktöre göre kurulu; bu anlar `elle` çekim istiyor.

**Karakter**
- Hazır:
  - skin ve isim;
  - `form`: 1,5 kat boy ve iki ek kol (`alt` ya da `omuz`);
  - Thomas gözleri: `kirmizi`/`mavi` kalıp, her göze ayrı ayar, `goz_kapak`, `goz_bakis`; planda `goz: "thomas"` ile açılır;
  - `silah`: `karanlik_tirpan` (Barış) ya da `osmanli_topuzu` (Ömer); `silah_gizli`/`silah_goster`, `durus`, sol elde kâğıt;
  - sol elde kitap (v7.99.16): `"esya": "kitap"` kapalı (raftan alırken, koyarken), `"kitap_acik"` sırttan V açık, sayfalar okuyana dönük (`blender_film.kitap_ormesi`);
  - aktörün başlangıç `"bak"`ı bir nokta da olabilir (v7.99.16; eskiden sessizce yok sayılıyordu);
  - `diz: true` (v7.99.15): bacak uyluk + baldır, diz açısı Epic Fight'ın (`wom_cevir.py --diz`; dövüş setlerinin bütün duruş ve vuruşlarında). Yazılmazsa eski düz bacak; oyundaki model değişmez.
  - İnce kol (v7.99.15, Alex tipi, 3 px): skin ince kolluysa model `aktor_ince.geo.json`, kollar kendi pivotlarında (y 21,5) döner. Yazılmazsa skinden oyundaki ölçüyle anlaşılır (`kol_uret.aktor_ince_mi`: sağ kolun 4. sütunu boş); `ince: true`/`false` elle, `form` ile birlikte hata. Bugün ince olan tek skin Zisa'nınki; 1. bölümün skinleri geniş, çizimleri değişmedi.
- Yok:
  - ağız ve yüz ifadesi;
  - zombi, iskelet, creeper, golem modeli (yalnız insan aktör var);
  - kâğıt, kitap ve el fenerinden başka eşya.

**Sahne**
- Hazır:
  - **orman:** çimen, açıklığın dışında ağaçlar, çukur, gökyüzü (Blender 5.2'de fiilen `MULTIPLE_SCATTERING`, aşağıda "2. bölümden önce açık"), güneş ve ay; `isik` anahtarlarıyla sabahtan geceye geçiş;
  - **oda:** deepslate oda, açılan kapı, bembeyaz dış, ışık hüzmesi, sis, toz, iki göz, kötünün karanlığı. Kötü yerinden oynayamaz.
- **Blok mekânlar (v7.99.16, senaryoda `"mekan": "bataklik"` ya da `"hanedan"`; `arac/mekan.py`, kilit `test/mekan.mjs`):**
  - **bataklık ve cadının kulübesi** (`arac/kulube.py`, önizleme `arac/kulube_onizle.py`, kilit `test/kulube.mjs`): ölçülen kulübe + kırmızı yatak ve kitaplık, Minecraft'ın bataklık renkleri ve bataklık meşesi, havuzlar, nilüfer, sarmaşık, mor geçit;
  - **hanedan** (`arac/hanedan.py`, `hanedan_onizle.py`). Köylüler filmde henüz çizilmiyor (yalnız önizlemede).
  - Aktör bloklara basar (yatak 9/16, basamak yarım yarım, kulübenin içindeki aktör çatıya basmaz); başlangıç yüksekliği `"kat"`. Senaryo eksenleri Blender'ın: Minecraft (x, z) → senaryo [x, -z].
  - Fener, meşale ve geçit doku rengiyle ışır (`mekan_kur`'un kendi malzemesi; `doku_malzemesi`'ne dokunulmadı).
  - Ufuk ortası boş: bataklıkta kare çerçeve, hanedanda surdan başlayan halka.
  Blok kurucu (`arac/blok_kur.py`) bu iş için: biyom boyası, blok başına boya, ova dışında çimen yan yüzüne boyalı örtü, Nether geçidi, şerit dokularda (su, geçit) yalnız ilk kare.
- Yok:
  - Nether, zihin ortamı, karlı arazi (savaş odası var, aşağıda);
  - hava durumu;
  - elde meşale ve ateş ışığı (el feneri ve görünmeyen dolgu ışığı var, aşağıda).
- **Dolgu ışığı (v7.99.16):** senaryoda `"isiklar": [{"nokta", "guc", "renk", "yaricap", "t"}]` görünmeyen nokta ışığı (sinemadaki gibi); `t` verilirse yalnız o aralıkta yanar. Kulübenin içinde Barış'ın siyah kıyafeti ışıksız okunmuyordu.

**Yazı ve ses**
- Hazır:
  - **Yazı:** `soyle` (isim ve metin), `anlat`, `baslik` (ayrı siyah kart).
  - **Efekt sesleri** karelere oturuyor: adım, savurma, temas (yumruk, metal, tahta), kan, yer vuruşu, kırılma, fırlatma, düşüş, ışınlanma, kapı, kâğıt, donma vurgusu.
  - **Ortam sesi:** rüzgâr, cırcır böceği, oda uğultusu.
  - **Müzik:** tek parça ve susma aralıkları.
  - Seviye −14 LUFS; stem'ler ayrı veriliyor.
- Yok: ateş, buz, büyü ve kalkan sesleri; ikinci bir müzik parçası.
- **Beğen / abone çağrı animasyonu (2026-11-08, 2. tur; `arac/cagri_animasyon.py`, kilit `test/cagri.mjs`):** 6 sn, saydam. Minecraft arayüzü panelinde Barış'ın yüzü (tıklamada başını sallar, iki kez göz kırpar); üstünde sohbet satırı "<Barış> Beğen ve abone ol!"; piksel imleç kavisli yollarla beğen → ABONE OL → zil (üstüne gelinen düğme parlar; tıklamada halka, beğende kıvılcım ve "+1", abonede ışık süzülmesi, beyaz parlama, çizilen tik ve konfeti, zilde sallanma, ses dalgası ve "1" rozeti); sağ üstte "Başarım kazanıldı! / Kanala abone oldun!" bildirimi. Yazı tipi kendi piksel çizimimiz (Türk alfabesi tam, Minecraft gibi gölgeli); YouTube logosu ve Mojang yazı tipi/dokusu yok. Sesler: Kenney (CC0) kumaş ve zil + sentez tık, pop, 8-bit ezgi. Her şey altyazının üstünde (y ≤ 920), ekranın ortası hiç kapanmıyor. Filme: **her videoda kendiliğinden 3 kez** (kullanıcı, 2026-11-08; %15 / %50 / %85, üst üste binmez, kısa taslakta sığmayan atlanır, küçük çözünürlüklü taslakta ölçeklenir); yerleri elle `film_birlestir.py ... --cagri 12,40,70` (bitmiş filmin saniyeleri, başlık kartı dahil), kapatmak `--cagri yok`; kendi kurgu programı için alfalı `cagri.mov` (ProRes 4444); `--zemin kare.png` ile herhangi bir karenin üstünde önizleme.

**Çizim ve denetim**
- Taslak seçenekleri:
  - `--onizleme` (yarım çözünürlük, 6 örnek);
  - `--adim N`, `--kare`, `--aralik`;
  - `motor: workbench` kodda var ama hiç ölçülmedi.
- Tam kalite: 1920×1080, 30 fps, 4096 örnek. Yarıda kalırsa kaldığı yerden sürer.
- Aynı senaryo her seferinde aynı hareketi verir: taslakta görülen dövüş tam kalitede bire bir aynı oynar (`blender_film.mjs`).
- Blender'sız denetim: `kamera_denetim` (9 kural), `zemin_denetim`, tek kare dönüş süzgeci.
- Denetim paftası (v7.99.15, `denetim_pafta.py`): çizimden ya da videodan çekim çekim kare numaralı pafta; altyazı her karenin altında. Bütün kareyi bozan tek karelik hatayı (siyah kare, ışık titremesi, başka yerden gelmiş kare) ölçüp kırmızı çerçeveyle gösterir. Yerel tek kare hatasını aramaz. Gemini'nin denetimi bunun üstüne kurulu (`GEMINI_ISCI.md`).

**Dövüş hissi ve efektleri (2026-11-08, kullanıcı: "daha fazla araştır, hepsini ekle")**
Yöntem `REFERANS_DOVUS_KOREOGRAFI.md` §62–§74. **Yeni her dövüş senaryosu
`"vurus_donmasi": true` ve `"darbe_vurgusu": true` taşır**; ikisi de yazılmazsa
film bire bir eskisi (1. bölüm ve Part 1 bayraksız, testler kilitliyor).
- Hazır (bayrakla):
  - **Vuruş donması** (`vurus_donmasi`): temas karesinden sonra bütün sahne durur; kare sayısı saldıranın kimlik ağırlığından (hafif 1, orta 2, ağır 3; savunulan 1; Saldırı II +1). `test/vurus_donmasi.mjs`.
  - **Darbe vurgusu** (`darbe_vurgusu`): travma modeli kamera sarsıntısı (ağırlıkla, düzgün gürültü, vuruş yönüne eğilimli, donma boyunca da söner); ağır vuruşta temas ışığı; kıvılcım sayısı ağırlıkla; savrulma sesi temastan 2/4/6 kare önce, darbe sesi katmanlı ve arka arkaya aynı değil; **sıralı ırkilme** (gövde → kollar → baş, baş ~2 kare sonra). `test/darbe_vurgusu.mjs`, `test/dovus_efekt.mjs` 7.
  - **Dövüş planı denetimi** (`kamera_denetim.py` 10–11): temastan önceki 6 karede kesme yok; ilk vuruşta iki taraf kadrajda. `test/dovus_denetim.mjs`.
- Hazır (olayla, `arac/dovus_efekt.py`, `test/dovus_efekt.mjs`):
  - **İşaret:** `{"t", "efekt": "isaret", "nokta", "sure": 0.35, "renk", "boyut", "cizgi": [x, y]}` — noktada büyüyen parıltı ve ışık, bırakışta tepe, 0,12 sn'de söner; `cizgi` verilirse yerde hedefe ilerleyen çizgi (buz çizgisi). Ses: yükselen vızıltı.
  - **Cam kırılması:** `{"efekt": "cam_kir", "nokta", "genislik", "yukseklik", "normal": [x, y], "tohum", "butun": true}` — levha 1/4 blokluk parçalara ayrılır, darbe yönünde balistik uçar, yerde kalır.
  - **Patlama (creeper):** `{"efekt": "patlama", "nokta", "guc", "tohum", "doku"}` — güçlü kısa ışık, büyüyüp sönen gri-beyaz küp duman, uçan bloklar, kamera sarsıntısı, boğuk patlama sesi.
  - **Darbe karesi:** `{"efekt": "darbe_karesi", "kare": 1-3, "ters": false}` — yüksek kontrastlı siyah-beyaz kare(ler). Yalnız adı konmuş doruk vuruşlarına (§64); karar sahne yazılırken.
  - **Sürü düzeni:** senaryoda `"suru": {"hedef", "uyeler", "t": [t0, t1], "tohum", "yaricap": 3.2, "tempo": 1.5}` — hedefin vuruş menzilinde aynı anda tek saldıran; sıradaki halkadan içeri adım atar; ötekiler halkada kendi hızıyla dolaşır, durunca hedefe döner (`"varinca_bak"` — `git` olayına da yazılabilir). **Sınır:** halka hedefin BAŞLANGIÇ konumuna kurulur; sürü aralığında hedef yerinde kalmalı.
  - **Sis perdesi:** senaryo düzeyinde `"atmosfer": {"yogunluk", "renk", "baslangic", "derinlik", "egri"}` (kompozitörde mist geçişi). Plan başına yazılamaz (süreklilik, §54); kar zaten senaryo değeri.
  - **Siluet paftası:** `denetim_pafta.py --gri` (renk atılır, kontrast açılır).
- Deneme çizimi (2026-11-08, 640×360, düşük örnek): altı efekt çöktmeden çizildi; sis, patlama, darbe karesi, yer çizgisi göründü. **İşaret küresi aydınlık, beyaza yakın gökyüzünün önünde seçilmiyor** (ışıma 20 → 2'ye indirildi, nesne ölçüldü, yerinde); karanlık ve fırtınalı sahnede ilk dövüş önizlemesinde bakılacak.

## 1. bölümde ne kullanıldı

- **Dövüş:** 17 vuruş, 4 savunma, 3 kaçış.
- **Kamera:** 40 çekim: `elle` 12, `omuz` 8, `yan` 6, `genis` 5, `dusuk` 4, `yakin_on` 3, `goz` 1, `ust` 1.
- **Hiç kullanılmayanlar:** `yorunge`, `takip`, `yakin`, `gecis` (bütün geçişler sert kesme) ve `efekt` olayı.
- **Ağır çekim ve donma:** yalnız iki delen darbede (57,0 ve 63,7 sn).

## Geçmiş hatalar ve onları yakalayan katman

**Kamera denetimi** (kilit: `kamera_denetim.mjs`)
- İlk koşuda 399 sorunlu kare: aktörler birbirinin içinden geçiyordu, 180° kuralı a/b sırasıyla bozuluyordu, yakın planda yüz kadrajı taşıyordu.
- Hamle ve çarpışma çözümü aktörü bir karede ışınlıyordu (1,7 blok).
- Dövüş v2'de fırlatmadan sonra alçak açı Barış'ı kadraj dışına atıyordu; kaçışta geniş açı 0,8 blok sıçrıyordu.

**Önizleme karesi** (betik "0 sorun" derken bulunanlar)
- Ufuk düzlemi çukuru örtüyordu.
- Bir aktör ötekini kapatıyordu. ORTME/ONPLAN kuralları buradan çıktı.
- POV kamerası kafanın içindeydi: ~1 sn gri boşluk.
- Final sahnesi simsiyahtı; kâğıt görünmüyordu.
- Hamle, Barış'ı rakibin içinden geçiriyordu.
- Sönmeyen kıvılcımlar görüntüyü kaplıyordu.
- `adim` adlı bir değişken `--adim`'i ezip 7 karede bir çiziyordu.
- AgX renkleri soldurdu.
- Odada göz kafanın içinde kaldı, taç karanlıkta parladı.
- Thomas kafası 180° ters oturdu.
- Form rakibin içine giriyordu.
- Dövüş v2'de beş kadraj hatası ve çizimi ilk karede çökerten `KeyError`.
- Zisa'nın ince kollu skini 4 px kollu modele giydiriliyordu: kolun boş dış sütunu kenarda kırık bir şerit olarak görünüyordu (kilit: `ince_kol.mjs`).
- Kulübe sahnesi denemesi (v7.99.16, kilit: `kulube_sahne.mjs`): iç mekân ışıksız kaldı, Barış'ın siyah kıyafeti zeminle birleşti (dolgu ışığı eklendi); aktör tanımındaki `"bak": [x, y]` sessizce yok sayıldı, Barış kitaplığa değil duvara uzandı; kapalı kitapla okumak garip durdu ve kol -80'de kitap yüzü kapattı (açık kitap, göğüs hizası); ayakucundaki kamera doğrulan Barış'ın sırtını gösterdi.
- Part 1 önizlemesi, kullanıcının bulduğu üç hata (v7.99.16, kilit: `part1_parcalar.mjs` 10–12. bölüm): Barış doğrulurken bir an kalkıp geri yattı (`dus` sönerken `dogrul` giriyordu, ikisi tabanın üstüne yarım yarım karışınca arada ayakta duruş %31 göründü; poz devri); POV'da cadının başı hep yana baktı (baş en yakın aktörün KÖKÜNE, ayakta göz hizasında bakıyordu, yani yerde yatan Barış'ın ayaklarının üstündeki boşluğa; `bak_bas` + önüne zayıf dolgu ışığı, yüz arkadaki tek ışıkta karanlıktı); cadı geçide yanından girdi, düzeltince de iniş kayması onu 0,3 blok ileri taşıyıp mor yüzün ARKASINA geçirdi ve parlamadan önce kayboldu (zıplayış obsidyenin üstüne, kayma bitince mor yüzün önünde durur).
- Part 1 önizleme denetimi (v7.99.16, kilit: `part1_parcalar.mjs` 9. bölüm): askerin 103 harflik cümlesi ekrana sığmıyordu ve süresi Ömer'in "Tamam."ına taşıyıp ikisi aynı satıra üst üste basıldı. Altyazı artık sığmazsa iki satır (`altyazi_satirlari`), bir konuşmanın altyazısı sonraki konuşma başlayınca biter; senaryoda Ömer'in cevabı okuma süresinden sonraya alındı.
- Part 1 denemeleri (v7.99.16, kilit: `part1_parcalar.mjs`): POV'da bulanıklık f/0,5'te her şeyi lapaya çevirdi (f/0,8, odak 0,45 m); `"adim"` hızdır (blok/sn), 0,8 verilince cadı ağır çekimde yürüdü; çömelen cadı kameranın içine girdi (ayakta kalıp eğiliyor); yürürken verilen `"bak"` yürüyüşün yönüyle ezildi (varıştan sonra verilir); kale tepede, oyunculara `kat` yazılmayınca yerin altında kaldılar; köşe kulesinin duvarı odanın köşesine giriyor, ilk kamera onun içinde kaldı; sancak kumaşının iki ters yüzü üst üste binip simsiyah çıktı (tek yüz); gece–sabah kesmesi tek senaryoda temiz olmuyor (ışık anahtarları 7 karede bir, yumuşak), Part 1 beş dosyaya bölündü.
- Ruh küresi denemesi (v7.99.16, kilit: `ruh_kure.mjs`): ilk çizimde Blender düştü (sıfıra yakın ölçekli hacim, openvdb "Non-zero scale values required"; ölçek tabanda kalıyor, nesne gizleniyor); büyük parlak çekirdek bilye gibi durdu, duman soluk gri sis gibi kaldı (çekirdek küçültüldü ve matlaştı, duman siyah ve yoğun); gece kara küre görünmedi, kızıl parıltı tek başına kırmızı bir top yaptı (közler dumanın içine alındı); yol anahtar noktalar arasında süreler eşit değilken her noktada hızı 1,4 blok/sn sıçratıyordu (düz Catmull-Rom; zamana göre teğet). Klibin son saniyesi neredeyse kapkara çıktı: dolgu ışığının `t` aralığı Blender 5.2'de hiç sabitlenmemiş, ışık 3 sn boyunca yavaş yavaş sönmüş. Blender 5'te `action.fcurves` yok, eski kod onu `hasattr` ile sorup sessizce boş liste alıyordu (`egriler()`; kilit: `kulube_sahne.mjs` 7. bölüm).
- Bataklıkta ilk film denemesi (v7.99.16, kilit: `mekan.mjs`): kamera sarkan sarmaşıkların arasına düştü, kare kapandı, denetim "0 sorun" dedi (sarmaşık görüşü kesen sayılmıyordu; çekimin konusu da yazılmamıştı). İlk zıplama 0,89 blok çıktı (sürekli zamanlı hesap; Minecraft 1,25) ve hedefi 0,26 blok aştı (yatay hareket bir kare erken başlıyordu).
- Bataklık önizlemesi (v7.99.16, kilit: `kulube.mjs`): ufuk düzlemi havuzların suyunu örtüyordu (hanedanda da tarla sularını); su dokusu 32 karelik şerit hâlinde bir bloğa sıkışıyordu; çimen yan dokusundaki hazır ova yeşili havuz kenarlarında parlak çizgi oluyordu, örtü konunca kuzey yüzleri "ön" sayıldığı için örtüsüz kaldı; kapının önüne sarmaşık sarkıyordu.

**Kullanıcının izlemesi**
- Tırpan tutuşu: sağ el 10–18 px kayıktı (kilit: `tutus.mjs`, `silah_govde.mjs`).
- Kâğıtla el arasında boşluk vardı.
- Dört göz çizilmişti, istenen iki gözdü.
- Tam kalitede elde beyaz tahta görünüyordu: kâğıdın ilk karesine anahtar yazılmamıştı (kilit: `blender_film.mjs`).
- Part 2'de dövüş dengesizdi (8 saldırıya 4).
- Part 2'de kötünün bedeni yoktu ve griydi (kilit: `kotu_karanlik.mjs`).
- Part 2'de aktörler havada yatıyor ve yürüyordu (kilit: `zemin.mjs`).
- Topuz önizlemesinde "ayaklar yerden kesiliyor" (2026-10-18): dizsiz bacak eğilince yere tek köşesiyle basıyordu (asanın `staff_auto_3`'ü: destek bacağı 25° eğik, tabanın öbür köşeleri 1–2 px havada). Dizli bacakla kapandı (kilit: `diz.mjs`). Asanın `kingkong`'unda beden inişten sonra 2,1 px havada kalıyor (aşağıda, açık).

**Tam kalite çıktının uzun denetimi**
- 849, 900 ve 945. karelerde tek kare 18° dönüş vardı; El-Harkos kopyalara dönmüyordu. Sebep takılan yürüyüş (kilit: `tek_kare_donus.mjs`).
- Açılış kıpırdamıyordu.
- Renk BT.601'le kodlanıyordu (kilit: `renk_kodlama.mjs`).
- Ses: −11,3 LUFS, −80 LUFS rüzgâr, sessiz anda +20 dB yükselme, iki kez AAC kodlama, sonda tık (kilit: `ses_seviye.mjs`, `ses_kenar.mjs`).
- Birleştirmede Part 2'nin son karesi düşüyordu (kilit: `ses_dilim.mjs`).

**Silah ölçümü** (çizimden önce, `topuz.mjs`)
- Demir asada el sap boyunca 5–26 px kayıyordu; 17 px'lik topuzda yumruk silahın dışına çıkardı. Asa beş vuruşun üçünde sapın arka ucuyla vuruyor, sol yumruk sapın 14–16 px gerisini tutuyordu (görünmeyen bir sap).
- Çarpışma düzeltmesi yalnız küplerin orta çizgisine bakıyordu, köşeleri 0,9 px kaçırıyordu (`silah_kose`).
- Uzun kılıçta topuz beş vuruşun beşinde bedene giriyordu (düzeltmesiz toplam 2,5 sn, havada vuruşta kafada 3,6 px, `auto1`'in bitişinde yumruk gövdede). Sıfırdan çözüm derin batmada takılıyordu: itmeler birbirini götürüyor (`auto1` t=0,7: tork 8°'de durdu, kaba arama 37°'de temiz). İzlemeyle temizlemek kolu 48°, bileği 50° çeviriyordu.
- On bir set topuzun modeliyle, düzeltmesiz ölçüldü (bedene 0,5 px'ten derin batma süresi, toplam): balta 0,95 sn, asa 1,3, herrscher 1,6, uzun kılıç 2,5, Epic Fight tek elli kılıç 2,5, nova 2,65, evil_tachi 3,35, solar 5,1, antitheus 5,4, ruine 6,15, satsujin 8,6. Balta dört vuruşun dördünde başı önde, sol el sapı hiç tutmuyor; Epic Fight Minecraft'ın topuzunu da balta sayıyor. Kullanıcı baltayı seçti (2026-10-19).
- Baltadan türetilmiş topuz: en derin batma 0,40 px (eşik 0,5); düzeltme kolda en çok 35° (yalnız `axe_auto2`'nin kalkışı: düzeltmesiz topuz kafanın içinden 2,5 px geçiyordu, 0,35 sn'de sıfıra iner), bilekte en çok 25,6°. Bekleme duruşu baltanınkiyle bire bir.

**Süre ölçümü**
- Tek tek anahtar kare yazmak sahne kurulumunu 12 dk yapıyordu; anahtarlar toplu yazılıyor.
- Ağaçlar küp küp nesneydi; tek örgüye birleştirildi.

**Bulut işçisi**
- Kompozitör GPU/EGL istedi, oda işçisi durdu; kompozitör CPU'ya alındı.
- İşçi eski kodla çizilmiş kareyi "var" saydı; kareye `.girdi` imzası eklendi (kilit: `cizim_dagit.mjs`).

**Çizilen karelerin incelemesi** (2026-11-08, kullanıcı: *"her birini ciddi olarak incele"*; 2. bölüm Part 1'in o ana kadar çizilen 919 karesi: orman 316, ruh 284, kulübe 319)
- Yöntem: her kare gizli depodan açılıp kayıttaki piksel md5'iyle karşılaştırıldı (hepsi tuttu); tam çözünürlükte boyut, saydamlık, siyah/beyaz/mor (eksik doku), parlak nokta, gürültü ve önceki kareyle fark ölçüldü, aynı çekimde komşu karelerden sapan işaretlendi; her kare küçük paftada gözle, şüpheliler ve eski hata anları tam boyutta incelendi.
- **Ruh sahnesinin son karesi (284) karardı:** kulübenin dolgu ışığı 6,41–9,81 yazılı, sahne 9,41'de bitiyor; `kare_bul` bitişi son kareye kırptığı için ışığın sönme anahtarı son kareye yazılıyordu. Aynı kalıp karda da vardı (`kar` aralığı sona kadarsa son karede kayboluyordu; kulübenin 619. karesi) ve orman 316'da (kararmanın altında görünmüyor). Sebep kod; hiçbir test ışığın/karın son karedeki durumuna bakmıyordu. Düzeltme: `aralik_anahtarlari` (bitiş sahnenin son anına ya da sonrasına düşüyorsa kapanma anahtarı yazılmaz); kilit `part1_parcalar.mjs` 14 (mutasyonla ısırıyor). Çizilmiş 284: **kullanıcının kararı (2026-11-08) birleştirmede yerine 283 konur**, yeniden çizilmez.
- **Kameranın dibinden geçen kar tanesi** (2026-11-08, ikinci inceleme; kulübenin 3. çekimi, kareler 534–562 ≈ 1 sn): bir kar tanesi kameranın 0,6–0,86 m önünden geçiyor, ekranda 150–218 px'lik keskin beyaz küp oluyor (düşen bir blok sanılır). Nasıl: `kar_kur` taneleri `merkez` çevresindeki alana dağıtıyor, kameranın bulunduğu yer de bu alanın içinde; 7 cm'lik tane lense yaklaşınca büyüyor, alan derinliği kapalı olduğu için de bulanıklaşmıyor. Sebep kod (yakınlık sınırı yoktu). Neden yakalanmadı: hiçbir denetim tanenin kameraya uzaklığına bakmıyordu; ölçüm tabanlı kare incelemesi de yakalamadı (parlaklık ortalaması az değişiyor), paftada gözle görüldü. Kesin liste hesapla çıkarıldı (tane yolu ve kamera belirli): yalnız bu 29 karede 80 px'i aşan tane var; öteki karlı karelerde en büyük tane ~80 px. Düzeltme: kameraya `KAR_YAKIN` (1,5 blok) içindeki tane o karede gizlenir (`kar_gizli_kareler`); kilit `part1_parcalar.mjs` 15. Çizilmiş/çizilecek 29 kare eski kodla (işçiler `5a5a34a`'da): karar kullanıcının.
- **Ruh sahnesinin ışınlanma parçaları beyaza yakın** (86–97): kodda mor (ışıma 25), renk doyup beyaz küp gibi çıkıyor. 1. bölümdeki ışınlanma da böyleydi; yeni hata değil, kayıt.
- **Kulübede kitap başın üstünde beliriyor ve kayboluyor** (≈ 145–181 al, 286–322 koy): `kitap_al`/`kitap_koy` sol kolu sabit açıyla (öne-yukarı −118°) kaldırıyor, rafın gerçek yerine çözmüyor; Barış raftan ~1 blok uzakta ve kamera açısından kalkan kol yüzün önünden geçiyor; kitap kavrama anında el başın üstündeyken görünür oluyor. Okurken kitabın açık yüzü rafa dönük, izleyici yalnız kenarını görüyor. Sebep poz ve sahne kurulumu (render değil); denetimler kolun rafa ulaşıp ulaşmadığını ölçmüyor. Düzeltilmedi: **kullanıcının kararı (2026-11-08) olduğu gibi kalır** (yeniden çizim limit harcar). Yeni bir raftan kitap sahnesi yazılırsa kolun rafa uzanması önce ölçülmeli.
- Kasıtlı olup ölçünün işaretlediği: orman kararmaları (göz açılıp kapanması), ruhta portal çakması ve Barış–Çarpık değişimi (7,66–7,96), kulübede kar taneleri (parlak nokta sayısı), çekim geçişleri.

**Dış iskeletle karşılaştırma**
- **Ömer'de dört göz (2026-11-07, kullanıcı buldu; savaş odası, 13,0 sn'den sona, Thomas ağzıyla "Tamam"):** Thomas iskeletinin gözleri yüzde sabit yükseklikte, Steve'in göz satırında (4. satır); Ömer'in skininde o satır kaş, gözleri 5. satırda. İskeletin göz yuvaları kaşın yerine açıldı, skine boyalı gözler altında kaldı. Sebep ölçü: skinin göz satırı iskeletinkiyle hiç karşılaştırılmamıştı (önceki Thomas skinlerinin gözü 4. satırdaydı); test göz rengini ölçüyor, yerini ölçmüyordu; önizlemeye bakarken Claude da kaçırdı. Düzeltme: aktörün `goz.satir` ayarı → `Eyes_UP_DOWN` (1 satır = kemikte 0,1; Blender'da ölçüldü: kemik −0,06 → göz 0,036 iner, ilk deneme 0,06 ile yarım kaldı). Kilit: `goz_thomas.mjs` 11, `agiz.mjs` 6 (Thomas gözü skinin göz satırında). Sınır: iskelet gözü en çok 5. satıra iner; Zisa (gözleri 6. satırda) Thomas kafasıyla konuşamaz, kod HATA verir. **İkinci tur (kullanıcı yakından baktı: "hâlâ var"):** satıra indirmek yetmedi; Thomas gözü ~0,9 px boyunda, boyalı gözün alt kenarı her gözün altında ince çizgi olarak kaldı. Düzeltme: Thomas kafasının skin kopyasında boyalı gözler tenle siliniyor (`boyali_gozler`: göz satırında tenden belirgin farklı pikseller; bizim kafa kendi resmini kullanıyor, değişmiyor). Ömer ve asker yakından çizildi, iz yok. Kilit: `goz_thomas.mjs` 12 (iki mutasyonla ısırıyor). Ders: düzeltilen kareye **yakından** bakılır; 960 px'lik karede ince çizgi gözden kaçtı.
- Bizim araç skinleri yatay aynalıyor. **Kullanıcının kararı (2026-11-02): aynı kalsın** (1. bölümle aynı görünüş).

**Ders:**
- Betik temiz derken karede hata çıktı: v7.99.10'da beş, dövüş v2'de beş.
- Part 2'nin üç hatası tam kalite çizimden sonra bulundu ve yeniden çizim gerekti.
- Bu yüzden sıra: Blender'sız denetim → her çekimden önizleme karesi → taslak video → tam kalite.

## 2. bölümden önce açık

- **Gökyüzü türü (v7.99.16'da ölçüldü):** Blender 5.2'de `NISHITA` yok (`SINGLE_SCATTERING`, `MULTIPLE_SCATTERING`, `PREETHAM`, `HOSEK_WILKIE`). `blender_film.py` türü ayarlarken hata alıyor ve aynı `try` içindeki `gunes_yukseklik`'i atlıyor: gökyüzü fiilen varsayılan `MULTIPLE_SCATTERING`, `isik` anahtarı olmayan senaryoda `gunes_yukseklik` uygulanmıyor. `isik` anahtarları yüksekliği ayrı bir `try` içinde yazdığı için 1. bölümün orman çizimi etkilenmedi. Film aracında düzeltilmedi (1. bölümün görünüşü bu); önizleme betikleri (`hanedan_onizle`, `kulube_onizle`) yüksekliği artık ayrı yazıyor.
- **Takılan yürüyüş:** kök düzeltmesi yapılmadı (SERI_SEZON1, "bilinen hata"). Kalabalık sahneler bunu sık tetikler.
- **Skin aynası — KAPANDI (kullanıcı, 2026-11-02: "aynı kalsın"):** düzeltilmiyor. Thomas planıyla bizim plan arasında yüz aynalanır; skinin iki yanı farklıysa (Barış'ın kolları) filmde taraflar ters görünür.
- **Antitheus `auto_3`:** kullanılmıyor, çünkü sap 0,1–0,2 sn boyunca başın içinden geçiyor.
- **Zıplayan vuruşta iniş:** Barış'ın `guillotine`'inde beden inişten sonra 6,7 px, asaların `kingkong`'unda 2,1 px havada kalıyor; düzeltilmedi. Part 2 çizilirken `antitheus` setine dokunulmadı.
- **Film pozlarında diz yok:** dizli aktörde de `diz_cok`, `dus`, `yuzustu` gibi film pozlarında baldır düz kalır (diz kanalı yalnız dövüş setlerinin animasyonlarında).
- **İnce kolda el:** silahın ve kâğıdın tutma noktası geniş kolunki, ince elde yarım piksel dışta kalır (oyunda da öyle). Zisa'nın bıçakları elde tutulmuyor; ölçülmedi. Denetimler ince kolu ayırmıyor ama etkilenmiyor da: zemin denetimi kollara bakmıyor, kamera denetimi aktörü kaba bir silindirle ölçüyor.

- **Hareket denetimi dövüşte temiz değil (2026-11-08'de ölçüldü, sürü testinde):** `hareket_denetim.py` iki kişilik **her** dövüşte `ani_kalkis` buluyor: hamlenin kendi atılması (Epic Fight kök hareketi, ~135–164 blok/sn²) ve darbe itmesi (~99). Sınır yürüyüş için (18). Part 1'de dövüş olmadığı için görülmemişti. Düzeltilmedi; ilk dövüş sahnesi yazılırken karar: denetim hamle ve itmeyi ayırsın mı, yoksa atılma yumuşatılsın mı.
- **180° dönüşün sonu:** akıcı dönüş yayı hedefe otururken tek karede açısal ivme sınırın ~1,1–1,25 katına çıkıyor (sürüde geri çekilen üyede ölçüldü). Bütün akıcı senaryolarda ortak (`hareket.aci_yayi`); Part 1 çizilirken değiştirilmedi. `test/dovus_efekt.mjs` kötüleşmeyi tutuyor.
- **Cam sesi gerçek cam kaydı değil:** Kenney Impact Sounds'un cam dosyaları depoda yok; site otomatik indirmeyi reddetti (403). Şimdilik metal tıngırtıları yüksek perdeyle. Kullanıcı CC0 cam sesi verirse `film_ses.py`'de tek satır.

## Maliyet ölçüsü

- **Tam kalite:** 1. bölüm Part 2, 2210 kare (orman 1579 + oda 631; 73,7 sn) ve yaklaşık 500 makine-saati sürdü. Ortalama ~13,6 dk/kare, yani **film saniyesi başına ~6,8 makine-saati**. Tek bir kare 6–25 dk arası sürüyor.
- **Ağır çekim ve donma:** bu kareler de tek tek çiziliyor; film süresi, hikâye süresinin hıza bölümü kadar uzuyor. 1. bölümdeki 0,12 sn'lik donma (hız 0,03) 4 sn film tuttu, yaklaşık 27 makine-saati.
- **Taslak:** tek ölçüm `--onizleme` için var: 640×360, 6 örnek, kare başına ≈ 2,4 sn (4 çekirdek, v7.99.9). Bu hızla 74 sn yaklaşık 1,5 makine-saati. 960×540'ta, sisli ya da efektli sahnede ölçülmedi.

## Test koşusu (2026-10-25, v7.99.15)

- **Tam takım** (`kos.sh`'in aynısı, `cizim_dagit.mjs` hariç): 165 testin 164'ü geçti, 37 dk. Düşen yine `efsane_dunyasi.mjs` (aşağıda). `denetim_pafta.mjs` takım başladıktan sonra yazıldı; ayrı koşuldu, geçti.
- **Yeni testler:** `ince_kol.mjs` (geometri, oyunla aynı ölçü, Blender'ın satır sırası, ayar, mutasyon) ve `denetim_pafta.mjs` (çekim, zaman, altyazı, tek kare, video, güvenlik, mutasyon). İkisinde de kod kasıtlı bozulunca ilgili kontrol düşüyor.
- **Blender'da ölçülen:**
  - İnce kol algılaması Blender'ın kendi okumasıyla da aynı: 11 skinden yalnız Zisa'nınki ince.
  - Geniş kollu sahne (düz, dizli ve formlu aktör, üç kare) eski ve yeni film aracında **piksel piksel aynı**.
  - Denetim paftası gerçek bir dövüş önizlemesinde (1. bölüm 1140–1330, 191 kare, 28,5 dk çizim) yanlış alarm vermedi. Aynı karelere eklenen siyah kare, ±%8 ışık titremesi ve başka çekimden gelmiş kare yakalandı; 4 px kamera kayması ve sırası karışmış kare yakalanmadı (aranmıyor).

### Önceki koşu (2026-10-19)

- **Tam takım** (`kos.sh`'in aynısı, `cizim_dagit.mjs` hariç): 164 testin 163'ü geçti, 32 dk. Düşen `efsane_dunyasi.mjs` (gökyüzü paketinin sürümü 7.94.0, ana paket 7.99.8): HEAD'de de düşüyor, bu işle ilgisi yok.
- **Yeni testler:** `topuz.mjs` (eşya, baltadan türetilmiş set, tutuş, çarpışma, mutasyon) ve `diz.mjs` (geometri, Epic Fight'ın diz açısı, film aracı, mutasyon).
- **Blender'da ölçülen:** dizli aktör film aracında çiziliyor (Ömer topuzla, iki balta vuruşu); `diz` yazılmayan senaryoda HEAD'in film aracıyla bugünkü aynı kareyi **piksel piksel aynı** çiziyor (1. bölüm etkilenmiyor).

### Daha önceki koşu (2026-10-17)

- **Çalıştırılan:** Blender gerektirmeyen 16 film testi; 122 madde geçti, 0 düştü. Testler: `blender_film`, `kamera_denetim`, `zemin`, `tek_kare_donus`, `kotu_karanlik`, `form_model`, `goz_thomas`, `baslik_karti`, `renk_kodlama`, `ses_dilim`, `ses_kenar`, `ses_seviye`, `tutus`, `silah_govde` (tek başına ~20 dk), `onizleme`, `arac_kur`.
- **Bilerek çalıştırılmayan:** `cizim_dagit.mjs` (çizim işçilerini taklit ediyor) ve `wom_kilic.mjs` (oyun içi eklenti testi). Blender bu makinede kurulu değildi.
- **Yan etki:** testler depoya hiçbir şey yazmadı; çalışma ağacı temiz kaldı.
