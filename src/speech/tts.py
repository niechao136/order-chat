import os
import sherpa_onnx
from typing import Optional

from src.utils.path import ROOT_DIR


_tts: Optional[sherpa_onnx.OfflineTts] = None


DEV_DIR = os.path.join(ROOT_DIR, "models", "matcha-icefall-zh-en")
MODEL_DIR = os.getenv("TTS_MODEL_DIR", DEV_DIR)


def init_tts() -> sherpa_onnx.OfflineTts:
    global _tts

    if _tts is not None:
        return _tts

    model_config = sherpa_onnx.OfflineTtsModelConfig(
        matcha=sherpa_onnx.OfflineTtsMatchaModelConfig(
            acoustic_model=os.path.join(MODEL_DIR, "model-steps-3.onnx"),
            vocoder=os.path.join(MODEL_DIR, "vocos-16khz-univ.onnx"),
            lexicon=os.path.join(MODEL_DIR, "lexicon.txt"),
            tokens=os.path.join(MODEL_DIR, "tokens.txt"),
            data_dir=MODEL_DIR,
            noise_scale=0.667,
            length_scale=1.0,
        ),
        num_threads=1,
        debug=False,
        provider="cpu",
    )
    tts_config = sherpa_onnx.OfflineTtsConfig(
        model=model_config,
        rule_fsts=f"{os.path.join(MODEL_DIR, 'date-zh.fst')},{os.path.join(MODEL_DIR, 'number-zh.fst')},{os.path.join(MODEL_DIR, 'phone-zh.fst')}",
        max_num_sentences=1,
    )
    tts = sherpa_onnx.OfflineTts(tts_config)
    _tts = tts
    return tts

