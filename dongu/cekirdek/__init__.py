"""
Beş halkalı ajan döngüsü — referans iskeleti.

Katmanlar:
    0    Plan            planlayici/motor.planla
    1    Execute         yurutucu.Yurutucu
    1.5  Orchestrator    uzmanlar.Yonetici  (yönetici + uzman ajanlar)
    2    ReAct           react.ReactDongusu
    3    Reflect         yansitma.Yansitici
    4    Human-in-loop   insan.Kapi

Hepsi tek bir `durum.Plan` nesnesini okuyup yazar.
"""

from .araclar import Arac, AracKaydi, dosya_araclari
from .durum import Adim, AdimDurumu, Kanit, Plan
from .insan import Esikler, Kapi, Karar, KonsolKapisi, OtomatikKapi
from .motor import ClaudeMotor, Motor, SahteMotor, motor_sec
from .olaylar import Katman, Olay, OlayGunlugu
from .react import ReactDongusu
from .uzmanlar import Uzman, UzmanKaydi, Yonetici, ornek_kadro, ozet_dosyasi_oragi
from .yansitma import Yansitici, bos_olmasin, dosya_bolumleri, yasakli_ifadeler
from .yurutucu import KosuSonucu, Yurutucu

__all__ = [
    "Adim",
    "AdimDurumu",
    "Arac",
    "AracKaydi",
    "ClaudeMotor",
    "Esikler",
    "Kanit",
    "Kapi",
    "Karar",
    "Katman",
    "KonsolKapisi",
    "KosuSonucu",
    "Motor",
    "Olay",
    "OlayGunlugu",
    "OtomatikKapi",
    "Plan",
    "ReactDongusu",
    "SahteMotor",
    "Uzman",
    "UzmanKaydi",
    "Yansitici",
    "Yonetici",
    "Yurutucu",
    "bos_olmasin",
    "dosya_araclari",
    "dosya_bolumleri",
    "motor_sec",
    "ornek_kadro",
    "ozet_dosyasi_oragi",
    "yasakli_ifadeler",
]
