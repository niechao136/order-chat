import os
import sherpa_onnx

from src.utils.path import ROOT_DIR


SENSE_DEV = os.path.join(ROOT_DIR, "models", "sensevoice-small-onnx-quant")
SENSE_DIR = os.getenv("SENSE_DIR", SENSE_DEV)

_sense: sherpa_onnx.OfflineRecognizer | None = None


def init_sense() -> sherpa_onnx.OfflineRecognizer:
    global _sense

    if _sense is not None:
        return _sense

    sense = sherpa_onnx.OfflineRecognizer.from_sense_voice(
        model=os.path.join(SENSE_DIR, "model_q8.onnx"),
        tokens=os.path.join(SENSE_DIR, "tokens.txt"),
        num_threads=1
    )
    _sense = sense
    return sense
