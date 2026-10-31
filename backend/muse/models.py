"""Model ids, reasoning-effort policy, and pricing for cost logging."""

SPARK_13 = "muse-spark-1.3"
SPARK_12 = "muse-spark-1.2"
SPARK_11 = "muse-spark-1.1"
WONDER = "muse-wonder-1.0"
IMAGE = "muse-image-1.0"
VOICE = "muse-voice-transcribe-1.0"
SAM = "sam-3.1"

# (temperature, max_tokens) per effort tier.
EFFORT = {
    "low": (0.2, 1024),
    "medium": (0.4, 2048),
    "high": (0.7, 4096),
}

# USD per 1M tokens: (input, output). Cached input billed at ~1/8; ignored here (conservative).
PRICING = {
    SPARK_13: (1.25, 4.25),
    SPARK_12: (1.25, 4.25),
    SPARK_11: (1.25, 4.25),
    WONDER: (4.00, 20.00),
}

IMAGE_USD_PER_IMAGE = 0.01


def price(model: str, input_tokens: int, output_tokens: int) -> float:
    inp, out = PRICING[model]
    return (input_tokens * inp + output_tokens * out) / 1_000_000
