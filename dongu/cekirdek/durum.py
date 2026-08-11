"""
Paylaşılan durum nesnesi.

Entegrasyonun somut kısmı burası. Dört döngü de **aynı** Plan nesnesini okuyup
yazar:

  - Planlayıcı adımları üretir ve gerekirse yeniden yazar,
  - ReAct adımın `kanitlar` listesine gözlem bırakır,
  - Yansıtma `bulgular` ve `yansitma_turu` alanlarını doldurur,
  - İnsan kapısı `durum` alanını değiştirir (atla/dur/devam).

Bu nesne olmadan "entegrasyon" sahtedir: yansıtma neye göre yargıladığını,
insan neyi onayladığını bilemez.
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path


class AdimDurumu(str, Enum):
    BEKLIYOR = "bekliyor"
    YURUTULUYOR = "yurutuluyor"
    DOGRULANIYOR = "dogrulaniyor"
    TAMAM = "tamam"
    BASARISIZ = "basarisiz"
    ATLANDI = "atlandi"


#: Üzerinde iş kalmayan durumlar.
BITMIS_DURUMLAR = (AdimDurumu.TAMAM, AdimDurumu.BASARISIZ, AdimDurumu.ATLANDI)


@dataclass
class Kanit:
    """ReAct döngüsünün bıraktığı iz — bir eylem ve onun gözlemi."""

    kaynak: str  # araç adı, ya da "model"
    girdi: dict
    gozlem: str
    hata: bool = False
    zaman: float = field(default_factory=time.time)

    def sozluge(self) -> dict:
        return {
            "kaynak": self.kaynak,
            "girdi": self.girdi,
            "gozlem": self.gozlem,
            "hata": self.hata,
            "zaman": self.zaman,
        }


@dataclass
class Adim:
    kimlik: str
    baslik: str
    aciklama: str = ""
    uzman: str = ""  # bu adımı hangi uzman ajan yürütüyor (yönetici atar)
    durum: AdimDurumu = AdimDurumu.BEKLIYOR
    cikti: str = ""
    kanitlar: list[Kanit] = field(default_factory=list)
    yansitma_turu: int = 0
    denenen_uzmanlar: list[str] = field(default_factory=list)
    bulgular: list[str] = field(default_factory=list)
    notlar: list[str] = field(default_factory=list)

    def bitti_mi(self) -> bool:
        return self.durum in BITMIS_DURUMLAR

    def sifirla(self) -> None:
        """Yansıtma reddettiğinde adımı yeniden denemeye hazırla.

        Kanıtlar korunur — modelin neyi neden yanlış yaptığını görmesi lazım.
        """
        self.durum = AdimDurumu.BEKLIYOR
        self.cikti = ""

    def sozluge(self) -> dict:
        return {
            "kimlik": self.kimlik,
            "baslik": self.baslik,
            "aciklama": self.aciklama,
            "uzman": self.uzman,
            "durum": self.durum.value,
            "cikti": self.cikti,
            "kanitlar": [k.sozluge() for k in self.kanitlar],
            "yansitma_turu": self.yansitma_turu,
            "denenen_uzmanlar": list(self.denenen_uzmanlar),
            "bulgular": list(self.bulgular),
            "notlar": list(self.notlar),
        }


@dataclass
class Plan:
    hedef: str
    adimlar: list[Adim] = field(default_factory=list)
    surum: int = 1
    yeniden_planlama_sayisi: int = 0

    # ---- sorgular -------------------------------------------------------

    def siradaki(self) -> Adim | None:
        """Üzerinde iş kalan ilk adım."""
        for adim in self.adimlar:
            if not adim.bitti_mi():
                return adim
        return None

    def bitti_mi(self) -> bool:
        return self.siradaki() is None

    def basarili_mi(self) -> bool:
        return self.bitti_mi() and all(
            a.durum in (AdimDurumu.TAMAM, AdimDurumu.ATLANDI) for a in self.adimlar
        )

    def bul(self, kimlik: str) -> Adim | None:
        for adim in self.adimlar:
            if adim.kimlik == kimlik:
                return adim
        return None

    # ---- değişiklikler --------------------------------------------------

    def yerine_koy(self, yeni_adimlar: list[Adim]) -> None:
        """Yeniden planlama: bitmiş adımlar korunur, kalanlar değiştirilir.

        Tamamlanmış işi çöpe atmamak önemli — yoksa her yeniden planlama
        döngüyü başa sarar ve iş asla bitmez.
        """
        bitmisler = [a for a in self.adimlar if a.bitti_mi()]
        bitmis_kimlikler = {a.kimlik for a in bitmisler}
        kalanlar = [a for a in yeni_adimlar if a.kimlik not in bitmis_kimlikler]
        self.adimlar = bitmisler + kalanlar
        self.surum += 1
        self.yeniden_planlama_sayisi += 1

    # ---- kalıcılık ------------------------------------------------------

    def sozluge(self) -> dict:
        return {
            "hedef": self.hedef,
            "surum": self.surum,
            "yeniden_planlama_sayisi": self.yeniden_planlama_sayisi,
            "adimlar": [a.sozluge() for a in self.adimlar],
        }

    def kaydet(self, yol: str | Path) -> None:
        Path(yol).write_text(
            json.dumps(self.sozluge(), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    @classmethod
    def yukle(cls, yol: str | Path) -> "Plan":
        ham = json.loads(Path(yol).read_text(encoding="utf-8"))
        plan = cls(
            hedef=ham["hedef"],
            surum=ham.get("surum", 1),
            yeniden_planlama_sayisi=ham.get("yeniden_planlama_sayisi", 0),
        )
        for ha in ham.get("adimlar", []):
            adim = Adim(
                kimlik=ha["kimlik"],
                baslik=ha["baslik"],
                aciklama=ha.get("aciklama", ""),
                uzman=ha.get("uzman", ""),
                durum=AdimDurumu(ha.get("durum", "bekliyor")),
                cikti=ha.get("cikti", ""),
                yansitma_turu=ha.get("yansitma_turu", 0),
                denenen_uzmanlar=list(ha.get("denenen_uzmanlar", [])),
                bulgular=list(ha.get("bulgular", [])),
                notlar=list(ha.get("notlar", [])),
            )
            for hk in ha.get("kanitlar", []):
                adim.kanitlar.append(
                    Kanit(
                        kaynak=hk["kaynak"],
                        girdi=hk.get("girdi", {}),
                        gozlem=hk.get("gozlem", ""),
                        hata=hk.get("hata", False),
                        zaman=hk.get("zaman", 0.0),
                    )
                )
            plan.adimlar.append(adim)
        return plan

    # ---- gösterim -------------------------------------------------------

    def ozet(self) -> str:
        isaret = {
            AdimDurumu.TAMAM: "✔",
            AdimDurumu.BASARISIZ: "✘",
            AdimDurumu.ATLANDI: "→",
            AdimDurumu.BEKLIYOR: "·",
            AdimDurumu.YURUTULUYOR: "…",
            AdimDurumu.DOGRULANIYOR: "?",
        }
        satirlar = [f"Hedef: {self.hedef}   (plan sürümü {self.surum})"]
        for sira, adim in enumerate(self.adimlar, 1):
            ek = f"  [yansıtma turu: {adim.yansitma_turu}]" if adim.yansitma_turu else ""
            kim = f" @{adim.uzman}" if adim.uzman else ""
            satirlar.append(
                f"  {isaret[adim.durum]} {sira}. {adim.baslik}{kim} "
                f"({adim.durum.value}){ek}"
            )
        return "\n".join(satirlar)
