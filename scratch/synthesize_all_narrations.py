import os
import sys
import json
import urllib.request
import subprocess

API_KEY = os.environ.get("ELEVENLABS_API_KEY")
if not API_KEY:
    print("Error: ELEVENLABS_API_KEY not found in environment!")
    sys.exit(1)

# Voice ID for Brian: nPczCjzI2devNBz1zQrb (Deep, Resonant, Authoritative Broadcaster)
VOICE_ID = "nPczCjzI2devNBz1zQrb"
URL = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"

AUDIO_OUT_DIR = os.path.abspath("submission/video_output/eleven_audio")
os.makedirs(AUDIO_OUT_DIR, exist_ok=True)

TRACKS = [
    {
        "id": "prologue",
        "text": "Welcome to OpsCrew. We built an autonomous multi-agent copilot for the AI Builder Cup 2026. Deployed securely on Google Cloud Run with Vertex AI and Gemini, OpsCrew bridges the gap between AI deliberation and enterprise policy. Let's observe a live production transaction."
    },
    {
        "id": "ch1_slide",
        "text": "Chapter one: Visitor Isolation and DEV-04 Intake."
    },
    {
        "id": "ch1_demo",
        "text": "A secure visitor session is initiated. We inject synthetic exception DEV-04: A thirty-eight dollar parking expense with a missing receipt. The system prepares for autonomous analysis."
    },
    {
        "id": "ch2_slide",
        "text": "Chapter two: Cloud Multi-Agent Deliberation."
    },
    {
        "id": "ch2_demo",
        "text": "A specialized multi-agent pipeline takes over. A Gemini Extractor isolates the facts; a Planner formulates the resolution; and an adversarial Reviewer validates against corporate policy. Every micro-decision is immutably logged for complete telemetry transparency."
    },
    {
        "id": "ch3_slide",
        "text": "Chapter three: Deterministic Policy Matrix."
    },
    {
        "id": "ch3_demo",
        "text": "The deliberation yields a deterministic result. Guardrail SYN-004 correctly identifies the missing receipt, restricting automated reimbursement. A pre-draft notice is generated, but crucially, no action is taken without explicit approval."
    },
    {
        "id": "ch4_slide",
        "text": "Chapter four: Human-in-the-Loop Authorization."
    },
    {
        "id": "ch4_demo",
        "text": "We enforce a strict human-in-the-loop mandate. The operator inspects the proposed plan, validates the constraints, and explicitly authorizes the creation of the synthetic case record."
    },
    {
        "id": "ch5_slide",
        "text": "Chapter five: Firestore Readback and Audit Parity."
    },
    {
        "id": "ch5_demo",
        "text": "Trust requires verification. The operator executes a separate read request directly from Firestore. The case record achieves perfect audit parity, proving cryptographic binding and absolute consistency."
    },
    {
        "id": "epilogue",
        "text": "OpsCrew operates with precision. Backed by 232 verified tests, a sub-15-second SLA, and strict forty-dollar boundary constraints. Experience the live Cloud Run deployment today."
    }
]

print(f"=== Synthesizing {len(TRACKS)} Narration Audio Tracks using ElevenLabs 'Brian' ===")
for i, item in enumerate(TRACKS):
    track_id = item["id"]
    text = item["text"]
    mp3_path = os.path.join(AUDIO_OUT_DIR, f"{track_id}.mp3")
    wav_path = os.path.join(AUDIO_OUT_DIR, f"{track_id}.wav")

    print(f"[{i+1}/{len(TRACKS)}] Synthesizing {track_id} ({len(text)} chars)...")
    payload = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.75,
            "similarity_boost": 0.85,
            "style": 0.15,
            "use_speaker_boost": True,
            "speed": 0.95
        }
    }

    req = urllib.request.Request(
        URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "xi-api-key": API_KEY,
            "Accept": "audio/mpeg"
        }
    )

    try:
        with urllib.request.urlopen(req) as response:
            with open(mp3_path, "wb") as f:
                f.write(response.read())
        
        # Convert to standard 48kHz stereo WAV
        subprocess.run(
            ["ffmpeg", "-y", "-i", mp3_path, "-ar", "48000", "-ac", "2", wav_path],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )

        dur_out = subprocess.check_output(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", wav_path]
        ).decode().strip()
        print(f"  -> Generated {track_id}.wav: {float(dur_out):.2f}s")
    except Exception as e:
        print(f"  -> Error synthesizing {track_id}: {e}")
        sys.exit(1)

print("\nAll audio tracks synthesized successfully!")
