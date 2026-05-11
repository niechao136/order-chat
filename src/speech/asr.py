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


ONLINE_DEV = os.path.join(ROOT_DIR, "models", "speech_paraformer")
ONLINE_DIR = os.getenv("ONLINE_DIR", ONLINE_DEV)

_online: sherpa_onnx.OnlineRecognizer | None = None

def init_online() -> sherpa_onnx.OnlineRecognizer:
    global _online

    if _online is not None:
        return _online

    online = sherpa_onnx.OnlineRecognizer.from_paraformer(
        decoder=os.path.join(ONLINE_DIR, "decoder.int8.onnx"),
        encoder=os.path.join(ONLINE_DIR, "encoder.int8.onnx"),
        tokens=os.path.join(ONLINE_DIR, "tokens.txt"),
        enable_endpoint_detection=True,
        num_threads=1
    )
    _online = online
    return online
