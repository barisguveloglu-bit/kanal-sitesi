"""
Katman 1.5 — Yönetici ve Uzman Ajanlar (Orchestrator–Workers / Supervisor).

Kritik ayrım: **tek seferlik dağıtım bir iş akışıdır, döngü değil.** Bunu
gerçek bir döngü yapan üç kenar var ve üçü de burada:

  1. `ata`         — yönetici her adımı, işe uygun uzmana verir (dinamik
                     bölme; plan sürümü değişince atama da değişir).
  2. `yeniden_ata` — yansıtma bir adımı reddettiğinde yönetici *yeniden görev
                     verir*: aynı uzmana bulgularla, ya da uzmanı değiştirerek.
  3. `birlestir`   — bütün adımlar bittikten sonra sonuçlar tek yerde
                     denetlenir; eksik veya çelişki varsa **yeni adım üretilir**
                     ve plana eklenir. Halkanın kapandığı yer burası.

Uzmanlar birbirinden iki şeyle ayrılır: kendi yönergesi (nasıl çalışacağı) ve
kendi araç alt kümesi (neye eli değebileceği). İkincisi güvenlik sınırıdır —
"yazar" uzmanının silme aracı yoktur, dolayısıyla silemez.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Protocol

from .araclar import AracKaydi
from .durum import Adim, AdimDurumu, Plan
from .olaylar import Katman, OlayGunlugu


@dataclass
class Uzman:
    ad: str
    tanim: str
    yonerge: str
    izinli_araclar: tuple[str, ...] = ()  # boş = hepsi

    def araclari(self, tum_araclar: AracKaydi) -> AracKaydi:
        """Uzmanın görebildiği araç alt kümesi."""
        if not self.izinli_araclar:
            return tum_araclar
        alt = AracKaydi()
        for arac in tum_araclar.hepsi():
            if arac.ad in self.izinli_araclar:
                alt.ekle(arac)
        return alt


class UzmanKaydi:
    def __init__(self, uzmanlar: list[Uzman] | None = None) -> None:
        self._uzmanlar: dict[str, Uzman] = {}
        for uzman in uzmanlar or []:
            self.ekle(uzman)

    def ekle(self, uzman: Uzman) -> None:
        self._uzmanlar[uzman.ad] = uzman

    def bul(self, ad: str) -> Uzman | None:
        return self._uzmanlar.get(ad)

    def hepsi(self) -> list[Uzman]:
        return list(self._uzmanlar.values())

    def adlar(self) -> list[str]:
        return list(self._uzmanlar)

    def tarif(self) -> str:
        return "\n".join(f"- {u.ad}: {u.tanim}" for u in self._uzmanlar.values())

    def varsayilan(self) -> Uzman:
        if not self._uzmanlar:
            raise ValueError("uzman kaydı boş")
        return next(iter(self._uzmanlar.values()))


def _sadelestir(metin: str) -> str:
    """Noktalamayı boşluğa çevirip küçült — kaba kelime eşleştirme için."""
    return "".join(h.lower() if h.isalnum() else " " for h in metin)


@dataclass
class BirlestirmeSonucu:
    tamam: bool
    eksikler: list[str] = field(default_factory=list)
    yeni_adimlar: list[Adim] = field(default_factory=list)


#: Birleştirme orağı: bitmiş planı denetler, eksikleri madde madde döndürür.
#: Boş liste = birleşik sonuç tutarlı.
BirlestirmeOragi = Callable[[Plan], list[str]]


class Yonetici:
    """Uzmanları süren yönetici ajan."""

    def __init__(
        self,
        kayit: UzmanKaydi,
        gunluk: OlayGunlugu,
        birlestirme_oraklari: list[BirlestirmeOragi] | None = None,
    ) -> None:
        self.kayit = kayit
        self.gunluk = gunluk
        self.birlestirme_oraklari = birlestirme_oraklari or []

    # -- 1) dağıtım --------------------------------------------------------

    def ata(self, adim: Adim) -> Uzman:
        """Adımın uzmanını çöz; atanmamışsa varsayılana düşür."""
        uzman = self.kayit.bul(adim.uzman) if adim.uzman else None
        if uzman is None:
            uzman = self.kayit.varsayilan()
            self.gunluk.yaz(
                Katman.YONETICI,
                "atama-varsayilan",
                f"{adim.kimlik} için '{adim.uzman or '?'}' bulunamadı → {uzman.ad}",
            )
            adim.uzman = uzman.ad
        if uzman.ad not in adim.denenen_uzmanlar:
            adim.denenen_uzmanlar.append(uzman.ad)
        return uzman

    # -- 2) yeniden görevlendirme -----------------------------------------

    def yeniden_ata(self, adim: Adim, bulgular: list[str]) -> Uzman:
        """Yansıtma reddetti — görevi yeniden dağıt.

        Önce aynı uzmana bulgularla bir şans daha veriyoruz. O da tükendiyse
        henüz denenmemiş bir uzmana devrediyoruz: aynı kafanın aynı hatayı
        tekrar etmesi, iyileştirme döngüsünün en yaygın kilitlenme biçimi.
        """
        mevcut = adim.uzman
        aday = next(
            (u for u in self.kayit.hepsi() if u.ad not in adim.denenen_uzmanlar),
            None,
        )
        if adim.yansitma_turu <= 1 or aday is None:
            self.gunluk.yaz(
                Katman.YONETICI,
                "yeniden-gorev",
                f"{adim.kimlik} aynı uzmana geri verildi ({mevcut}) — "
                f"{len(bulgular)} bulgu iletildi",
            )
            return self.ata(adim)

        adim.uzman = aday.ad
        adim.denenen_uzmanlar.append(aday.ad)
        self.gunluk.yaz(
            Katman.YONETICI,
            "uzman-degisimi",
            f"{adim.kimlik}: {mevcut} → {aday.ad} (aynı uzman iki turdur geçemedi)",
        )
        return aday

    # -- 3) birleştirme ----------------------------------------------------

    def birlestir(self, plan: Plan) -> BirlestirmeSonucu:
        """Bütün uzman çıktılarını tek yerde denetle.

        Bir adımın kendi başına doğru olması, sonuçların *birlikte* tutarlı
        olduğu anlamına gelmiyor. Eksik bulunursa iş bitmemiştir: yeni adım
        üretilir ve plana eklenir.
        """
        eksikler: list[str] = []
        for orak in self.birlestirme_oraklari:
            eksikler.extend(orak(plan))

        if not eksikler:
            self.gunluk.yaz(
                Katman.YONETICI, "birlestirme-tamam", "birleşik sonuç tutarlı"
            )
            return BirlestirmeSonucu(tamam=True)

        self.gunluk.yaz(
            Katman.YONETICI,
            "birlestirme-eksik",
            f"{len(eksikler)} eksik: {'; '.join(eksikler)}",
            eksikler=eksikler,
        )
        yeni = self._eksikleri_goreve_cevir(plan, eksikler)
        return BirlestirmeSonucu(tamam=False, eksikler=eksikler, yeni_adimlar=yeni)

    def _eksikleri_goreve_cevir(self, plan: Plan, eksikler: list[str]) -> list[Adim]:
        mevcut_kimlikler = {a.kimlik for a in plan.adimlar}
        yeni: list[Adim] = []
        for sira, eksik in enumerate(eksikler, 1):
            kimlik = f"kapanis-{plan.surum}-{sira}"
            if kimlik in mevcut_kimlikler:
                continue
            uzman = self._eksige_uygun_uzman(eksik)
            yeni.append(
                Adim(
                    kimlik=kimlik,
                    baslik=f"Eksiği kapat: {eksik[:60]}",
                    aciklama=(
                        "Birleştirme denetimi bu eksiği bildirdi, kapat: " + eksik
                    ),
                    uzman=uzman.ad,
                )
            )
        return yeni

    def _eksige_uygun_uzman(self, eksik: str) -> Uzman:
        """Eksiği en çok örten tanıma sahip uzmanı seç.

        Kelime örtüşmesine bakan kaba bir yönlendirici. Gerçek projede bu
        kararı model verir (`Motor.planla` zaten uzman atayabiliyor); burada
        deterministik kalması, döngüyü testte oynatabilmek için.
        """
        metin = _sadelestir(eksik)
        en_iyi, en_yuksek = self.kayit.varsayilan(), 0
        for uzman in self.kayit.hepsi():
            anahtarlar = {k for k in _sadelestir(uzman.tanim).split() if len(k) >= 4}
            puan = sum(1 for k in anahtarlar if k in metin)
            if puan > en_yuksek:
                en_iyi, en_yuksek = uzman, puan
        return en_iyi


# ---------------------------------------------------------------------------
# Örnek uzman kadrosu ve birleştirme orağı
# ---------------------------------------------------------------------------


def ornek_kadro() -> UzmanKaydi:
    return UzmanKaydi(
        [
            Uzman(
                ad="arastirmaci",
                tanim="Veri toplar, dosya okur, ölçüm ve hesap işlerini yapar.",
                yonerge=(
                    "Yalnızca gözlemlediğin veriyi bildir. Elinde olmayan bir sayıyı "
                    "uydurma; veri eksikse bunu açıkça söyle."
                ),
                izinli_araclar=("dosya_oku", "dosya_listele", "hesapla", "dosya_yaz"),
            ),
            Uzman(
                ad="yazar",
                tanim="Rapor ve özet metinleri yazar, belgeleri biçimlendirir.",
                yonerge=(
                    "Yalnızca sana verilen bulgulara dayan. Bölüm başlıklarını "
                    "eksiksiz koy. Veri yoksa boş bırak, doldurma."
                ),
                izinli_araclar=("dosya_oku", "dosya_yaz", "dosya_listele"),
            ),
            Uzman(
                ad="bakimci",
                tanim="Temizlik, silme ve dosya düzeni işlerini yapar.",
                yonerge=(
                    "Yalnızca açıkça geçici olduğu belirtilen dosyalara dokun. "
                    "Şüphedeysen silme."
                ),
                izinli_araclar=("dosya_listele", "dosya_sil", "dosya_oku"),
            ),
        ]
    )


def ozet_dosyasi_oragi(calisma_dizini: str | Path) -> BirlestirmeOragi:
    """Örnek birleştirme orağı.

    Adımların hepsi tek tek geçse bile iş bitmemiş olabilir: uzmanlar kendi
    parçalarını doğru yapar ama kimse sonucu birbirine bağlamaz. Bu orak tam
    olarak o boşluğu arar — bütün uzman çıktılarına atıf yapan bir kapanış
    özeti var mı? Yoksa yönetici bir görev daha üretir.
    """
    kok = Path(calisma_dizini)

    def denetle(plan: Plan) -> list[str]:
        ozet = kok / "ozet.txt"
        if not ozet.exists():
            return ["kapanış özeti (ozet.txt) hiçbir uzman tarafından yazılmadı"]

        metin = ozet.read_text(encoding="utf-8")
        eksikler: list[str] = []
        if len(metin.strip()) < 40:
            eksikler.append("ozet.txt var ama yapılan işi anlatmayacak kadar kısa")

        # Uzmanların ürettiği somut çıktılara atıf var mı?
        for uretim in ("rapor.md",):
            if (kok / uretim).exists() and uretim not in metin:
                eksikler.append(f"özet, üretilen {uretim} dosyasından hiç söz etmiyor")

        tamamlanan = [a for a in plan.adimlar if a.durum is AdimDurumu.TAMAM]
        if tamamlanan and not any(a.uzman and a.uzman in metin for a in tamamlanan):
            eksikler.append("özet, işi hangi uzmanın yaptığını hiç belirtmiyor")
        return eksikler

    return denetle
