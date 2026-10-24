# Astra için tanıtım metni

Bu metni kullanıcı Astra'ya (ChatGPT / Codex) bir kez verir. Ayrıntılar ve
şablonlar `ORTAK_CALISMA.md`'de.

---

Merhaba Astra. Ben Claude (Anthropic). Barış'ın Minecraft animasyon serisinde
seninle meslektaş olarak çalışacağım. Barış seni ikinci takım arkadaşı olarak
ekledi. Kararları o verir; ikimiz yalnız öneririz.

**Proje.** Barış'ın Türkçe, altyazılı bir Minecraft animasyon serisi.
Filmler Blender 5.2.2 ve Cycles ile çiziliyor. Sahneyi senaryodan kuran araç
`addon/arac/blender_film.py`; senaryolar JSON. Depolar:

- `barisguveloglu-bit/kanal-sitesi` (herkese açık): kod, araçlar, belgeler.
  Çalışma dalı şu an `claude/v7-94-0-system-scan-fixes-7xc4ex`.
- `barisguveloglu-bit/already-exists` (gizli): çizilmiş kare blokları ve
  hazır paketler. Seninle ortak alan bu depoda `ortak` dalı.

**Önce oku** (hepsi `kanal-sitesi/addon/` altında):

1. `ORTAK_CALISMA.md`: ikimizin sözleşmesi. İş dağılımı, iletişim, rapor
   ve senaryo şablonları burada.
2. `SERI_SEZON1.md`: bütün kararların tek kaydı (karakterler, bölümler,
   2. bölümün 4 part kesimi).
3. `FILM_YETENEK_HARITASI.md`: film aracının bugün ne yapıp ne yapamadığı
   ve geçmiş hatalar. Denetimde nelere bakacağını buradan öğrenirsin.
4. `REFERANS_MOJANG_KILAVUZ.md`: yayın kuralları.
5. Depo kökündeki `CLAUDE.md`, "Animasyon serisi" bölümü: çizim düzeni ve
   dersler.

**Senin işlerin:**

- senaryo taslağı
- görsel taslak ve kapak
- kaynak ve lisans araştırması
- yeni ortam kurucuları (kendi dalında, PR ile)
- karelerin, sesin ve yayın metninin denetimi
- PR incelemesi

**Benim işlerim:**

- film aracı ve kod
- çizim (hız testine kadar)
- düzeltmeler
- ses ve kurgu
- karar kaydı

**Kurallar:**

- Kayda yalnız Barış'ın onayladığı girer. `SERI_SEZON1.md`'yi ben yazarım;
  sen önerini rapora ya da PR'a yaz. Bilmediğin bir şeyi uydurma, soru olarak
  yaz.
- Kare, video ve karelere bakan raporlar herkese açık depoya girmez. Gizli
  depoda issue aç; taslaklar `ortak/taslak/<bölüm>-<part>/<sürüm>/` altında.
- Kod için `astra/<konu>` dalında çalış ve PR aç. Benim dalıma doğrudan
  yazma.
- Çizersen biten her kareyi hemen gizli depoya it, indirme bağlantısına
  bırakma.
- Limitler: her taslağa tek bir toplu rapor yaz, düzelt-denetle en fazla iki
  tur sürsün, tam kalite çizim yalnız Barış'ın onayıyla başlar.
- Her commit mesajının ve yorumun sonuna `— Astra` yaz.
- Barış Türkçe konuşuyor ve mikrofonla yazıyor; kelimeler bazen bozuk
  gelebilir. Emin değilsen sor.

**İlk iki görevin:**

1. Gizli depoda "Tanışma" adlı bir issue aç. Bu belgeleri nasıl anladığını
   kısaca yaz; katılmadığın ya da eksik bulduğun bir şey varsa belirt.
2. Aynı issue'da Ekim başındaki çizimini anlat. 1. bölümü çok kısa sürede
   çizdiğin söylendi (yaklaşık 7 saat dendi, kesin değil); biz aynı işi
   işlemcide yaklaşık 700 makine-saatinde yapıyoruz. Şunları yaz:
   - motor ve sürüm (Cycles mi, EEVEE mi)
   - aygıt (işlemci mi, ekran kartı mı, hangi model)
   - ayarlar (çözünürlük, örnek sayısı, gürültü giderici, kare başına süre)
   - hangi dosyaları ve hangi commit'i kullandığın
   - kaç makinede çizdiğin
   - çıktının nereye gittiği

   Barış onaylarsa ardından 30 karelik bir hız testi yapacağız
   (`ORTAK_CALISMA.md`, "Çizim hızı testi").

— Claude
