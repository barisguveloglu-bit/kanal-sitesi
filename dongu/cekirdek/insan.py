"""
Katman 4 — İnsan Denetimli Döngü (Human-in-the-Loop).

İki tasarım kararı:

  1. **Eşikler ilan edilir, sezilmez.** `Esikler` bir veri sınıfı; hangi
     durumda insana çıkılacağı koda yazılı. "Model tehlikeli bir şey yapıyor
     gibi hissediyorum" bir eşik değildir.

  2. **İnsan kapısı, yansıtmanın çıkış vanasıdır.** Ayrı, paralel bir
     mekanizma değil. İyileştirme döngüsüne tavan konur; tavana çarpınca
     insana çıkar. Tavan yoksa sonsuz iyileştirme ya da iki kötü çıktı
     arasında salınım alırsın.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Protocol

from .olaylar import Katman, OlayGunlugu


class Karar(str, Enum):
    ONAY = "onay"      # devam et
    RET = "ret"        # bu eylemi yapma, döngü kendi yolunu bulsun
    ATLA = "atla"      # bu adımı bitmiş say, geç
    DURDUR = "durdur"  # bütün koşuyu bitir


@dataclass
class OnayIstegi:
    sebep: str  # eşiğin makine adı — telemetri ve test için
    baslik: str
    ayrinti: str
    secenekler: tuple[Karar, ...] = (Karar.ONAY, Karar.RET, Karar.DURDUR)


@dataclass
class Esikler:
    """Hangi durumda insana çıkılır — hepsi ilan edilmiş."""

    plan_onayi: bool = True
    """Yürütmeye başlamadan önce planı göster."""

    geri_alinamaz_araclar: bool = True
    """`Arac.geri_alinamaz` işaretli her çağrı öncesi sor."""

    azami_yansitma_turu: int = 2
    """Bir adım kaç kez iyileştirilmeye çalışılır; sonrası insana."""

    azami_react_adimi: int = 8
    """Tek bir plan adımı içinde en fazla kaç ReAct turu."""

    azami_yeniden_planlama: int = 2
    """Plan kaç kez yeniden yazılabilir; sonrası insana."""

    azami_adim_sayisi: int = 12
    """Plan bu boyutu aşarsa kapsam kaçıyor demektir; insana çık."""

    azami_birlestirme_turu: int = 2
    """Yönetici kaç kez eksik kapatma turu açabilir; sonrası insana."""


class InsanKapisi(Protocol):
    def sor(self, istek: OnayIstegi) -> Karar: ...


class OtomatikKapi:
    """Testler ve gözetimsiz koşular için sabit yanıt veren kapı.

    Üretimde bunu kullanmak, insan denetimini kapatmak demektir — bilinçli
    bir tercih olmalı, varsayılan değil.
    """

    def __init__(self, varsayilan: Karar = Karar.ONAY, yanitlar: dict[str, Karar] | None = None):
        self.varsayilan = varsayilan
        self.yanitlar = yanitlar or {}
        self.gecmis: list[OnayIstegi] = []

    def sor(self, istek: OnayIstegi) -> Karar:
        self.gecmis.append(istek)
        return self.yanitlar.get(istek.sebep, self.varsayilan)


class KonsolKapisi:
    """Terminalden gerçek onay ister."""

    _HARF = {"o": Karar.ONAY, "r": Karar.RET, "a": Karar.ATLA, "d": Karar.DURDUR}
    _ETIKET = {
        Karar.ONAY: "o) onayla",
        Karar.RET: "r) reddet",
        Karar.ATLA: "a) adımı atla",
        Karar.DURDUR: "d) durdur",
    }

    def sor(self, istek: OnayIstegi) -> Karar:
        print()
        print("─" * 68)
        print(f"⏸  İNSAN ONAYI GEREKİYOR — {istek.baslik}")
        print(f"   eşik: {istek.sebep}")
        print("─" * 68)
        print(istek.ayrinti)
        print()
        secenek_metni = "  ".join(self._ETIKET[s] for s in istek.secenekler)
        gecerli = {h: k for h, k in self._HARF.items() if k in istek.secenekler}
        while True:
            try:
                cevap = input(f"{secenek_metni} > ").strip().lower()[:1]
            except EOFError:
                # Etkileşimsiz ortamda güvenli taraf: onaylamama.
                print("(girdi yok — reddedildi)")
                return Karar.RET
            if cevap in gecerli:
                return gecerli[cevap]
            print("Anlaşılmadı, tekrar dene.")


class Kapi:
    """Eşikleri ve gerçek kapıyı bir arada tutan sarmalayıcı."""

    def __init__(self, esikler: Esikler, kapi: InsanKapisi, gunluk: OlayGunlugu) -> None:
        self.esikler = esikler
        self.kapi = kapi
        self.gunluk = gunluk

    def sor(
        self,
        sebep: str,
        baslik: str,
        ayrinti: str,
        secenekler: tuple[Karar, ...] = (Karar.ONAY, Karar.RET, Karar.DURDUR),
    ) -> Karar:
        self.gunluk.yaz(Katman.INSAN, "soruldu", f"{baslik} (eşik: {sebep})")
        karar = self.kapi.sor(OnayIstegi(sebep, baslik, ayrinti, secenekler))
        self.gunluk.yaz(Katman.INSAN, f"karar-{karar.value}", f"{baslik} → {karar.value}")
        return karar
