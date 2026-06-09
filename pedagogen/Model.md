# PEDAGOGEN — Free Models Reference

Models available for free via **HuggingFace Inference API** (`https://api-inference.huggingface.co/models/{model_id}`) or **HuggingFace Router** (`https://router.huggingface.co/v1/chat/completions`).

> **Rate limits (free tier):** ~300 requests/hour, models under ~10B params work best.
> Get your token at: https://huggingface.co/settings/tokens

---

## TEXT — Large Language Models

### Chat / Instruction Following (via Router — OpenAI-compatible)

| Model | ID | Params | Context | License | Best For |
|---|---|---|---|---|---|
| **OpenAI gpt-oss-120b** | `openai/gpt-oss-120b:fastest` | 117B (5.1B active MoE) | 131K | Apache 2.0 | Reasoning, agentic tasks, function calling |
| **OpenAI gpt-oss-20b** | `openai/gpt-oss-20b` | 21B (3.6B active MoE) | 131K | Apache 2.0 | Fast reasoning, local dev |
| **DeepSeek R1** | `deepseek-ai/DeepSeek-R1` | 671B (37B active) | 128K | MIT | Complex reasoning, math, coding |
| **DeepSeek V3.2** | `deepseek-ai/DeepSeek-V3.2` | 671B MoE | 128K | MIT | General purpose, multilingual |
| **DeepSeek V4-Flash** | `deepseek-ai/DeepSeek-V4-Flash` | 158B MoE | 1M | MIT | Fast, cheap, long context |
| **Qwen 2.5 72B Instruct** | `Qwen/Qwen2.5-72B-Instruct` | 72B | 32K | Apache 2.0 | Instruction following, coding |
| **Qwen 3.6-35B-A3B** | `Qwen/Qwen3.6-35B-A3B` | 35B (3B active MoE) | 262K | Apache 2.0 | Fast reasoning, multilingual |
| **Llama 3.1 8B Instruct** | `meta-llama/Meta-Llama-3.1-8B-Instruct` | 8B | 128K | Llama 3.1 | General purpose, fast |
| **Llama 3.2 11B Vision** | `meta-llama/Llama-3.2-11B-Vision-Instruct` | 11B | 128K | Llama 3.2 | Text + vision input |
| **Gemma 2 9B Instruct** | `google/gemma-2-9b-it` | 9B | 8K | Gemma | Instruction following |
| **Gemma 4 12B** | `google/gemma-4-12B-it` | 12B | 262K | Gemma | Any-to-any multimodal |
| **Mistral 7B Instruct** | `mistralai/Mistral-7B-Instruct-v0.3` | 7B | 32K | Apache 2.0 | Fast inference, European languages |
| **NVIDIA Nemotron 3 Super** | `nvidia/Nemotron-3-Super` | 120B (12B active MoE) | 1M | NVIDIA Open | Multi-agent, agentic workflows |
| **Tencent Hy3 preview** | `tencent/Hy3-preview` | MoE | 262K | Custom | Code generation, agentic |

### Text Classification / NLP Tasks

| Model | ID | Task | License |
|---|---|---|---|
| **BERT-base** | `bert-base-uncased` | Text classification, fill-mask | Apache 2.0 |
| **RoBERTa-base** | `FacebookAI/roberta-base` | Sentiment analysis, NER | MIT |
| **DistilBERT** | `distilbert-base-uncased-finetuned-sst-2-english` | Sentiment analysis | Apache 2.0 |
| **BART-large-cnn** | `facebook/bart-large-cnn` | Summarization | MIT |
| **T5-base** | `google-t5/t5-base` | Translation, summarization | Apache 2.0 |
| **MarianMT** | `Helsinki-NLP/opus-mt-en-fr` | Translation (100+ pairs) | Apache 2.0 |

---

## IMAGES — Generation & Analysis

### Text-to-Image Generation

| Model | ID | Params | License | Notes |
|---|---|---|---|---|
| **FLUX.1 Dev** | `black-forest-labs/FLUX.1-dev` | 12B | FLUX.1-dev license | High quality, prompt adherence |
| **FLUX.1 Schnell** | `black-forest-labs/FLUX.1-schnell` | 12B | Apache 2.0 | Fast inference, 1-4 steps |
| **Stable Diffusion 3.5 Large** | `stabilityai/stable-diffusion-3.5-large` | 8B | Stability AI | High resolution, text rendering |
| **Stable Diffusion 3.5 Medium** | `stabilityai/stable-diffusion-3.5-medium` | 2.5B | Stability AI | Balanced quality/speed |
| **Stable Diffusion XL Turbo** | `stabilityai/sdxl-turbo` | 2.6B | CreativeML OpenRAIL | Real-time generation, 1 step |
| **SD 1.5 Free Generation** | `aiyouthalliance/Free-Image-Generation` | 1B | CC0 | Fine-tuned SD 1.5, fully free |
| **Ideogram 4** | `ideogram-ai/ideogram-4-fp8` | — | Proprietary | Best text-in-image rendering |

### Image Analysis

| Model | ID | Task | License |
|---|---|---|---|
| **ViT-base** | `google/vit-base-patch16-224` | Image classification | Apache 2.0 |
| **DETR** | `facebook/detr-resnet-50` | Object detection | Apache 2.0 |
| **SegFormer** | `nvidia/segformer-b0-finetuned-ade-512-512` | Semantic segmentation | Apache 2.0 |
| **CLIP** | `openai/clip-vit-base-patch32` | Image-text matching | MIT |
| **BLIP** | `Salesforce/blip-vqa-base` | Visual Q&A | BSD-3 |

---

## AUDIO — Speech & Sound

### Speech Recognition (ASR)

| Model | ID | Params | Languages | License |
|---|---|---|---|---|
| **Whisper Large V3** | `openai/whisper-large-v3` | 1.55B | 99+ | Apache 2.0 |
| **Whisper Large V3 Turbo** | `openai/whisper-large-v3-turbo` | 809M | 99+ | Apache 2.0 |
| **Whisper Medium** | `openai/whisper-medium` | 769M | 99+ | MIT |
| **Whisper Small** | `openai/whisper-small` | 244M | 99+ | MIT |
| **Cohere Transcribe** | `CohereLabs/cohere-transcribe-03-2026` | 2B | 14 languages | Apache 2.0 |
| **NVIDIA Parakeet TDT** | `nvidia/parakeet-tdt-1b-asr` | 1B | English | CC-BY-4.0 |
| **Wav2Vec2** | `facebook/wav2vec2-base` | 95M | English | MIT |

### Text-to-Speech (TTS)

| Model | ID | Params | License | Notes |
|---|---|---|---|---|
| **Kokoro v1.0** | `hexgrad/Kokoro-82M` | 82M | Apache 2.0 | Best naturalness per size, fast |
| **Dia** | `nari-labs/Dia-1.6B` | 1.6B | Apache 2.0 | Multi-speaker, dialogue |
| **Orpheus TTS** | `canopylabs/orpheus-tts` | 3B | Apache 2.0 | Emotional speech, voice cloning |
| **Sesame CSM** | `sesame/csm-1b` | 1B | Apache 2.0 | Conversational speech |
| **Piper** | `rhasspy/piper` | Varies | MIT | Ultra-fast, edge devices |
| **Higgs Audio V2** | `bosonai/higgs-audio-v2-tts` | 5.77B | Apache 2.0 | High quality, multi-lingual |
| **VibeVoice** | `microsoft/VibeVoice-1.5B` | 1.5B | Microsoft | Long-form, 90min, 4 speakers |
| **Stable Audio Open** | `stabilityai/stable-audio-open-1.0` | — | Apache 2.0 | Music + SFX generation |

### Audio Classification

| Model | ID | Task | License |
|---|---|---|---|
| **Wav2Vec2-Base** | `facebook/wav2vec2-base` | Audio classification | MIT |
| **Whisper (audio tags)** | `openai/whisper-large-v3` | Audio event detection | Apache 2.0 |

---

## VIDEOS — Generation

| Model | ID | Params | Output | License | Notes |
|---|---|---|---|---|---|
| **Wan 2.1 T2V 14B** | `Wan-AI/Wan2.1-T2V-14B-Diffusers` | 14B | 720p | Apache 2.0 | Best open-source text-to-video |
| **Wan 2.2 TI2V 5B** | `Wan-AI/Wan2.2-TI2V-5B` | 5B | 720p 24fps | Apache 2.0 | Text+Image-to-video, consumer GPU |
| **Wan 2.2 T2V A14B** | `Wan-AI/Wan2.2-T2V-A14B-GGUF` | 14B (GGUF) | 720p | Apache 2.0 | Quantized, runs on 10GB VRAM |
| **HunyuanVideo** | `Tencent/HunyuanVideo` | 13B | 720p | Tencent | Cinematic quality |
| **Stable Video Diffusion** | `stabilityai/stable-video-diffusion-img2vid-xt-1-1` | — | 576x1024 | Stability AI | Image-to-video |
| **LTX-Video** | `Lightricks/LTX-Video` | 2B | 720p | Apache 2.0 | Fast, 12GB VRAM |
| **Mochi 1** | `genmo/mochi-1-preview` | 10B | 720p | Apache 2.0 | High fidelity |
| **Linum v2** | `Linum-AI/linum-v2-720p` | 2B | 720p | Apache 2.0 | Lightweight, 2-5s clips |
| **SkyReels V1** | `SkyworkAI/SkyReels-V1` | — | 720p | Open | Cinematic, human characters |
| **Sulphur-2** | `SulphurAI/Sulphur-2-base` | 9B | 720p | Open | Text-to-video |

---

## MULTIMODAL — Any-to-Any

| Model | ID | Input → Output | License |
|---|---|---|---|
| **Qwen 2.5 Omni 3B** | `Qwen/Qwen2.5-Omni-3B` | Text+Audio+Image → Text+Audio | Apache 2.0 |
| **Gemma 4 12B** | `google/gemma-4-12B-it` | Any → Any | Gemma |
| **Phi-4 Multimodal** | `microsoft/Phi-4-multimodal-instruct` | Text+Image+Audio → Text | MIT |

---

## Quick Reference — Best Picks by Use Case

| Use Case | Recommended Model | ID |
|---|---|---|
| **Pedagogical doc generation (PEDAGOGEN)** | OpenAI gpt-oss-120b | `openai/gpt-oss-120b:fastest` |
| **Fast prototyping** | Llama 3.1 8B | `meta-llama/Meta-Llama-3.1-8B-Instruct` |
| **Complex reasoning** | DeepSeek R1 | `deepseek-ai/DeepSeek-R1` |
| **Image generation (free)** | FLUX.1 Schnell | `black-forest-labs/FLUX.1-schnell` |
| **Image analysis** | CLIP | `openai/clip-vit-base-patch32` |
| **Speech transcription** | Whisper Large V3 | `openai/whisper-large-v3` |
| **Text-to-speech** | Kokoro | `hexgrad/Kokoro-82M` |
| **Text-to-video** | Wan 2.2 TI2V 5B | `Wan-AI/Wan2.2-TI2V-5B` |
| **Translation** | MarianMT | `Helsinki-NLP/opus-mt-en-fr` |
| **Summarization** | BART-large-cnn | `facebook/bart-large-cnn` |

---

## API Usage Examples

### Text (Router — OpenAI-compatible)
```bash
curl https://router.huggingface.co/v1/chat/completions \
  -H "Authorization: Bearer $HF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openai/gpt-oss-120b:fastest",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### Image Generation (Serverless)
```bash
curl https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell \
  -H "Authorization: Bearer $HF_TOKEN" \
  -d '{"inputs": "A classroom in Morocco, warm lighting"}'
```

### Speech Recognition (Serverless)
```bash
curl https://api-inference.huggingface.co/models/openai/whisper-large-v3 \
  -H "Authorization: Bearer $HF_TOKEN" \
  --data-binary @audio.wav
```

### Text-to-Speech (Serverless)
```bash
curl https://api-inference.huggingface.co/models/hexgrad/Kokoro-82M \
  -H "Authorization: Bearer $HF_TOKEN" \
  -d '{"inputs": "Bonjour, bienvenue en classe!"}'
```
