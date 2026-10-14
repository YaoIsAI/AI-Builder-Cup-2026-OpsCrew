#!/usr/bin/env python3
"""
render_demo_video.py
Renders the official demo video for Team OpsCrew (AI Builder Cup 2026).
Produces TWO official versions:
  1. Subtitled Version (带字幕版): Burned-in, high-contrast modern subtitle pills + embedded mov_text track.
  2. Clean Version (无字幕版): Pure slides/screenshots without burned-in text, with embedded soft subtitle track.
Ensures exact duration = 168.18 seconds (< 180s contest rule).
Uses Google Text-to-Speech (gTTS) for natural, calm, broadcast-grade English narration.
Applies professional audio mastering: EQ presence, high-pass filtering, EBU R128 loudnorm, and acoustic padding.
"""

import os
import sys
import subprocess
import json
import shutil
from gtts import gTTS
from PIL import Image, ImageDraw, ImageFont

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(BASE_DIR)
BUILD_DIR = os.path.join(BASE_DIR, "build")

OUTPUT_VIDEO_SUBTITLED = os.path.join(BASE_DIR, "OpsCrew_Official_Demo_Subtitled.mp4")
OUTPUT_VIDEO_CLEAN = os.path.join(BASE_DIR, "OpsCrew_Official_Demo_Clean.mp4")
OUTPUT_VIDEO_DEFAULT = os.path.join(BASE_DIR, "OpsCrew_Official_Demo_165s.mp4")
OUTPUT_SRT = os.path.join(BASE_DIR, "OpsCrew_Official_Demo_165s.srt")
OUTPUT_VTT = os.path.join(BASE_DIR, "OpsCrew_Official_Demo_165s.vtt")

SCENES = [
    {
        "id": "scene_01",
        "duration": 12.0,
        "image": os.path.join(BASE_DIR, "assets", "slides", "slide-01.png"),
        "narration": "Welcome to OpsCrew, an autonomous multi-agent copilot for enterprise operations, developed for the AI Builder Cup 2026.",
        "subtitle": "Welcome to OpsCrew, an autonomous multi-agent copilot for enterprise operations,\ndeveloped for the AI Builder Cup 2026."
    },
    {
        "id": "scene_02",
        "duration": 11.5,
        "image": os.path.join(BASE_DIR, "assets", "slides", "slide-02.png"),
        "narration": "Traditional expense exception auditing suffers from forty-eight-hour backlogs, manual spreadsheets, and fragmented compliance policies.",
        "subtitle": "Traditional expense exception auditing suffers from forty-eight-hour backlogs,\nmanual spreadsheets, and fragmented compliance policies."
    },
    {
        "id": "scene_03",
        "duration": 11.5,
        "image": os.path.join(BASE_DIR, "assets", "slides", "slide-03.png"),
        "narration": "OpsCrew solves this with three specialized Gemini agents: a Fact Extractor, a Policy Planner, and an Adversarial Reviewer.",
        "subtitle": "OpsCrew solves this with three specialized Gemini agents:\na Fact Extractor, a Policy Planner, and an Adversarial Reviewer."
    },
    {
        "id": "scene_04",
        "duration": 14.5,
        "image": os.path.join(BASE_DIR, "assets", "slides", "slide-04.png"),
        "narration": "Our deterministic rule engine enforces policies SYN-001 through SYN-008, preventing AI hallucinations and unverified payouts.",
        "subtitle": "Our deterministic rule engine enforces policies SYN-001 through SYN-008,\npreventing AI hallucinations and unverified payouts."
    },
    {
        "id": "scene_05",
        "duration": 13.5,
        "image": os.path.join(BASE_DIR, "assets", "slides", "slide-06.png"),
        "narration": "In the live web app, operators see under fifteen seconds cloud deliberation replacing 48-hour manual backlogs, one hundred percent auditability, and modeled annual savings.",
        "subtitle": "In the live web app, operators see under fifteen seconds cloud deliberation replacing 48-hour manual backlogs,\none hundred percent auditability, and modeled annual savings."
    },
    {
        "id": "scene_06",
        "duration": 13.0,
        "image": os.path.join(PROJECT_DIR, "docs", "acceptance", "S02-live-ui-desktop-2026-10-10.png"),
        "narration": "Here we inspect synthetic scenario DEV-04: a thirty-eight-dollar expense with a missing receipt hitting clause SYN-004 for evidence requests, featuring multimodal drag-and-drop intake.",
        "subtitle": "Here we inspect synthetic scenario DEV-04: a thirty-eight-dollar expense with a missing receipt hitting clause SYN-004 for evidence requests,\nfeaturing multimodal drag-and-drop intake."
    },
    {
        "id": "scene_07",
        "duration": 12.0,
        "image": os.path.join(PROJECT_DIR, "docs", "acceptance", "S02-live-ui-review-2026-10-10.png"),
        "narration": "Running the workflow invokes Gemini. Facts are hashed, the Planner requests receipt proof, and the Reviewer validates rule compliance.",
        "subtitle": "Running the workflow invokes Gemini. Facts are hashed,\nthe Planner requests receipt proof, and the Reviewer validates rule compliance."
    },
    {
        "id": "scene_08",
        "duration": 13.0,
        "image": os.path.join(BASE_DIR, "assets", "slides", "slide-05.png"),
        "narration": "With a PASS verdict, OpsCrew generates an interactive pre-draft notice citing SYN-004, ready for one-click dispatch without authorizing payout.",
        "subtitle": "With a PASS verdict, OpsCrew generates an interactive pre-draft notice citing SYN-004,\nready for one-click dispatch without authorizing payout."
    },
    {
        "id": "scene_09",
        "duration": 10.5,
        "image": os.path.join(PROJECT_DIR, "docs", "acceptance", "S03-emulator-ui-desktop-2026-10-10.png"),
        "narration": "Strict governance requires explicit human review. The operator inspects the plan and confirms the case with a single click.",
        "subtitle": "Strict governance requires explicit human review.\nThe operator inspects the plan and confirms the case with a single click."
    },
    {
        "id": "scene_10",
        "duration": 10.5,
        "image": os.path.join(BASE_DIR, "assets", "slides", "slide-07.png"),
        "narration": "The server atomically commits the approval and audit trail to Google Cloud Firestore Native, backed by idempotent key binding.",
        "subtitle": "The server atomically commits the approval and audit trail to Google Cloud Firestore Native,\nbacked by idempotent key binding."
    },
    {
        "id": "scene_11",
        "duration": 12.0,
        "image": os.path.join(BASE_DIR, "assets", "slides", "slide-08.png"),
        "narration": "OpsCrew is verified by two hundred thirty-two automated tests with zero failures, including offline evaluation and security guardrails.",
        "subtitle": "OpsCrew is verified by two hundred thirty-two automated tests with zero failures,\nincluding offline evaluation and security guardrails."
    },
    {
        "id": "scene_12",
        "duration": 11.0,
        "image": os.path.join(BASE_DIR, "assets", "slides", "slide-09.png"),
        "narration": "With a strict forty-dollar monthly budget guardrail and fail-closed admission, OpsCrew delivers extraordinary return on investment.",
        "subtitle": "With a strict forty-dollar monthly budget guardrail and fail-closed admission,\nOpsCrew delivers extraordinary return on investment."
    },
    {
        "id": "scene_13",
        "duration": 11.5,
        "image": os.path.join(BASE_DIR, "assets", "slides", "slide-10.png"),
        "narration": "Deployed on Google Cloud Run in US-Central-1 with Secret Manager credential isolation, OpsCrew is secure and containerized.",
        "subtitle": "Deployed on Google Cloud Run in US-Central-1 with Secret Manager credential isolation,\nOpsCrew is secure and containerized."
    },
    {
        "id": "scene_14",
        "duration": 11.5,
        "image": os.path.join(BASE_DIR, "assets", "slides", "slide-13.png"),
        "narration": "OpsCrew combines autonomous AI with deterministic enterprise safety. We invite you to test our live deployment at opscrew-883881551915.us-central1.run.app.",
        "subtitle": "OpsCrew combines autonomous AI with deterministic enterprise safety.\nWe invite you to test our live deployment at opscrew-883881551915.us-central1.run.app."
    }
]

def format_timestamp_srt(seconds):
    millis = int(round((seconds - int(seconds)) * 1000))
    s = int(seconds) % 60
    m = (int(seconds) // 60) % 60
    h = int(seconds) // 3600
    return f"{h:02d}:{m:02d}:{s:02d},{millis:03d}"

def format_timestamp_vtt(seconds):
    millis = int(round((seconds - int(seconds)) * 1000))
    s = int(seconds) % 60
    m = (int(seconds) // 60) % 60
    h = int(seconds) // 3600
    return f"{h:02d}:{m:02d}:{s:02d}.{millis:03d}"

def get_audio_duration(file_path):
    cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        file_path
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, check=True)
    return float(res.stdout.strip())

def create_subtitled_slide(image_path, subtitle_text, out_path):
    base_img = Image.open(image_path).convert('RGBA')
    target_w, target_h = 1920, 1080
    img_w, img_h = base_img.size
    scale = min(target_w / img_w, target_h / img_h)
    new_w = int(img_w * scale)
    new_h = int(img_h * scale)
    resized = base_img.resize((new_w, new_h), Image.Resampling.LANCZOS)

    canvas = Image.new('RGBA', (target_w, target_h), (0, 0, 0, 255))
    offset_x = (target_w - new_w) // 2
    offset_y = (target_h - new_h) // 2
    canvas.paste(resized, (offset_x, offset_y))

    font_candidates = [
        '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
        '/System/Library/Fonts/Supplemental/Arial.ttf',
        '/System/Library/Fonts/HelveticaNeue.ttc',
        '/Library/Fonts/Arial.ttf'
    ]
    font_path = None
    for fc in font_candidates:
        if os.path.exists(fc):
            font_path = fc
            break

    font = ImageFont.truetype(font_path, 28) if font_path else ImageFont.load_default()

    draw = ImageDraw.Draw(canvas)
    bbox = draw.multiline_textbbox((0, 0), subtitle_text, font=font, align='center', spacing=8)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]

    pad_x = 32
    pad_y = 14
    pill_w = text_w + pad_x * 2
    pill_h = text_h + pad_y * 2

    pill_x = (target_w - pill_w) // 2
    pill_y = target_h - pill_h - 15

    overlay = Image.new('RGBA', (target_w, target_h), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)

    # Soft drop shadow
    shadow_offset = 3
    overlay_draw.rounded_rectangle(
        [pill_x + shadow_offset, pill_y + shadow_offset, pill_x + pill_w + shadow_offset, pill_y + pill_h + shadow_offset],
        radius=14,
        fill=(0, 0, 0, 160)
    )

    # High-contrast rounded pill container
    overlay_draw.rounded_rectangle(
        [pill_x, pill_y, pill_x + pill_w, pill_y + pill_h],
        radius=12,
        fill=(15, 23, 42, 190),
        outline=(56, 189, 248, 160),
        width=2
    )

    canvas = Image.alpha_composite(canvas, overlay)

    draw_final = ImageDraw.Draw(canvas)
    text_x = pill_x + pad_x - bbox[0]
    text_y = pill_y + pad_y - bbox[1]
    draw_final.multiline_text((text_x, text_y), subtitle_text, font=font, align='center', spacing=8, fill=(255, 255, 255, 255))

    canvas.convert('RGB').save(out_path, quality=95)

def create_clean_slide(image_path, out_path):
    base_img = Image.open(image_path).convert('RGB')
    target_w, target_h = 1920, 1080
    img_w, img_h = base_img.size
    scale = min(target_w / img_w, target_h / img_h)
    new_w = int(img_w * scale)
    new_h = int(img_h * scale)
    resized = base_img.resize((new_w, new_h), Image.Resampling.LANCZOS)

    canvas = Image.new('RGB', (target_w, target_h), (0, 0, 0))
    offset_x = (target_w - new_w) // 2
    offset_y = (target_h - new_h) // 2
    canvas.paste(resized, (offset_x, offset_y))
    canvas.save(out_path, quality=95)

def main():
    print("=== OpsCrew Official Demo Video Generator (Dual Versions: Subtitled & Clean) ===")
    total_target = sum(s["duration"] for s in SCENES)
    print(f"Total target video duration: {total_target:.1f} seconds (< 180s contest rule)")

    os.makedirs(BUILD_DIR, exist_ok=True)

    # 1. Generate SRT & VTT subtitles
    print("\n--- Generating Subtitles (SRT & VTT) ---")
    current_time = 0.0
    srt_lines = []
    vtt_lines = ["WEBVTT", ""]

    for idx, scene in enumerate(SCENES, 1):
        start_t = current_time
        end_t = current_time + scene["duration"]
        current_time = end_t

        sub_text = scene["subtitle"]

        srt_lines.append(str(idx))
        srt_lines.append(f"{format_timestamp_srt(start_t)} --> {format_timestamp_srt(end_t)}")
        srt_lines.append(sub_text)
        srt_lines.append("")

        vtt_lines.append(f"{format_timestamp_vtt(start_t)} --> {format_timestamp_vtt(end_t)}")
        vtt_lines.append(sub_text)
        vtt_lines.append("")

    with open(OUTPUT_SRT, "w", encoding="utf-8") as f:
        f.write("\n".join(srt_lines))
    print(f"Saved: {OUTPUT_SRT}")

    with open(OUTPUT_VTT, "w", encoding="utf-8") as f:
        f.write("\n".join(vtt_lines))
    print(f"Saved: {OUTPUT_VTT}")

    # 2. Render each scene clip (Both Clean & Subtitled)
    clean_clips = []
    subtitled_clips = []
    concat_clean_file = os.path.join(BUILD_DIR, "concat_clean_list.txt")
    concat_sub_file = os.path.join(BUILD_DIR, "concat_sub_list.txt")

    for idx, scene in enumerate(SCENES, 1):
        scene_id = scene["id"]
        target_dur = scene["duration"]
        print(f"\nProcessing [{idx}/{len(SCENES)}] {scene_id} (Target: {target_dur}s)...")

        raw_mp3_path = os.path.join(BUILD_DIR, f"{scene_id}_raw.mp3")
        final_wav_path = os.path.join(BUILD_DIR, f"{scene_id}_audio.wav")

        # Step A: Synthesize natural speech with Google TTS (cached if valid)
        if not os.path.exists(raw_mp3_path) or os.path.getsize(raw_mp3_path) == 0:
            tts = gTTS(scene["narration"], lang="en", tld="co.uk")
            tts.save(raw_mp3_path)

        speech_dur = get_audio_duration(raw_mp3_path)

        # Step B: Master audio with EQ, presence boost, EBU R128 loudnorm, and acoustic padding (cached if valid)
        if not os.path.exists(final_wav_path) or os.path.getsize(final_wav_path) == 0:
            pad_needed = max(0.1, target_dur - speech_dur)
            audio_filter = (
                f"adelay=500|500,"
                f"highpass=f=75,"
                f"equalizer=f=3200:t=q:w=1.2:g=1.5,"
                f"loudnorm=I=-14:LRA=7:tp=-1.0,"
                f"apad=pad_dur={pad_needed:.3f}"
            )
            subprocess.run([
                "ffmpeg", "-y",
                "-i", raw_mp3_path,
                "-af", audio_filter,
                "-ar", "48000", "-ac", "2",
                "-t", f"{target_dur:.3f}",
                final_wav_path
            ], check=True, stderr=subprocess.DEVNULL)

        actual_audio_dur = get_audio_duration(final_wav_path)
        print(f"  Speech: {speech_dur:.2f}s | Mastered Audio: {actual_audio_dur:.2f}s")

        # Step C: Prepare Clean & Subtitled 1080p slide images
        clean_img_path = os.path.join(BUILD_DIR, f"{scene_id}_clean.png")
        sub_img_path = os.path.join(BUILD_DIR, f"{scene_id}_subtitled.png")

        create_clean_slide(scene["image"], clean_img_path)
        create_subtitled_slide(scene["image"], scene["subtitle"], sub_img_path)

        # Step D: Encode Clean video clip
        clip_clean_path = os.path.join(BUILD_DIR, f"{scene_id}_clean.mp4")
        subprocess.run([
            "ffmpeg", "-y",
            "-loop", "1", "-i", clean_img_path,
            "-i", final_wav_path,
            "-c:v", "libx264", "-preset", "fast", "-crf", "18",
            "-c:a", "aac", "-b:a", "192k",
            "-pix_fmt", "yuv420p",
            "-t", f"{target_dur:.3f}",
            clip_clean_path
        ], check=True, stderr=subprocess.DEVNULL)
        clean_clips.append(clip_clean_path)

        # Step E: Encode Subtitled video clip
        clip_sub_path = os.path.join(BUILD_DIR, f"{scene_id}_subtitled.mp4")
        subprocess.run([
            "ffmpeg", "-y",
            "-loop", "1", "-i", sub_img_path,
            "-i", final_wav_path,
            "-c:v", "libx264", "-preset", "fast", "-crf", "18",
            "-c:a", "aac", "-b:a", "192k",
            "-pix_fmt", "yuv420p",
            "-t", f"{target_dur:.3f}",
            clip_sub_path
        ], check=True, stderr=subprocess.DEVNULL)
        subtitled_clips.append(clip_sub_path)

    # 3. Concatenate and assemble both master videos
    print("\n--- Assembling [1/2] Clean Video (OpsCrew_Official_Demo_Clean.mp4) ---")
    with open(concat_clean_file, "w", encoding="utf-8") as f:
        for clip in clean_clips:
            f.write(f"file '{clip}'\n")

    temp_clean = os.path.join(BUILD_DIR, "merged_clean.mp4")
    subprocess.run([
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0",
        "-i", concat_clean_file,
        "-c", "copy",
        temp_clean
    ], check=True, stderr=subprocess.DEVNULL)

    subprocess.run([
        "ffmpeg", "-y",
        "-i", temp_clean,
        "-i", OUTPUT_SRT,
        "-c:v", "copy",
        "-c:a", "copy",
        "-c:s", "mov_text",
        "-metadata:s:s:0", "language=eng",
        "-metadata", "title=OpsCrew AI Builder Cup 2026 Demo (Clean)",
        "-metadata", "artist=Team OpsCrew",
        "-movflags", "+faststart",
        OUTPUT_VIDEO_CLEAN
    ], check=True, stderr=subprocess.DEVNULL)

    print("\n--- Assembling [2/2] Subtitled Video (OpsCrew_Official_Demo_Subtitled.mp4) ---")
    with open(concat_sub_file, "w", encoding="utf-8") as f:
        for clip in subtitled_clips:
            f.write(f"file '{clip}'\n")

    temp_sub = os.path.join(BUILD_DIR, "merged_subtitled.mp4")
    subprocess.run([
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0",
        "-i", concat_sub_file,
        "-c", "copy",
        temp_sub
    ], check=True, stderr=subprocess.DEVNULL)

    subprocess.run([
        "ffmpeg", "-y",
        "-i", temp_sub,
        "-i", OUTPUT_SRT,
        "-c:v", "copy",
        "-c:a", "copy",
        "-c:s", "mov_text",
        "-metadata:s:s:0", "language=eng",
        "-metadata", "title=OpsCrew AI Builder Cup 2026 Demo (Subtitled)",
        "-metadata", "artist=Team OpsCrew",
        "-movflags", "+faststart",
        OUTPUT_VIDEO_SUBTITLED
    ], check=True, stderr=subprocess.DEVNULL)

    # Also keep OpsCrew_Official_Demo_165s.mp4 synced with the subtitled version
    shutil.copyfile(OUTPUT_VIDEO_SUBTITLED, OUTPUT_VIDEO_DEFAULT)

    # 4. Final verification and report
    dur_sub = get_audio_duration(OUTPUT_VIDEO_SUBTITLED)
    size_sub_mb = os.path.getsize(OUTPUT_VIDEO_SUBTITLED) / (1024 * 1024)
    dur_clean = get_audio_duration(OUTPUT_VIDEO_CLEAN)
    size_clean_mb = os.path.getsize(OUTPUT_VIDEO_CLEAN) / (1024 * 1024)

    print("\n===========================================================")
    print("DEMO VIDEOS GENERATED SUCCESSFULLY (DUAL VERSIONS)!")
    print(f"1. Subtitled Version: {OUTPUT_VIDEO_SUBTITLED}")
    print(f"   Duration: {dur_sub:.2f}s | Size: {size_sub_mb:.2f} MB | Contest Check: {'PASSED (<180s)' if dur_sub < 180 else 'FAILED'}")
    print(f"2. Clean Version:     {OUTPUT_VIDEO_CLEAN}")
    print(f"   Duration: {dur_clean:.2f}s | Size: {size_clean_mb:.2f} MB | Contest Check: {'PASSED (<180s)' if dur_clean < 180 else 'FAILED'}")
    print(f"3. Default Video:     {OUTPUT_VIDEO_DEFAULT}")
    print(f"4. Captions:          {OUTPUT_SRT} & {OUTPUT_VTT}")
    print("===========================================================")

if __name__ == "__main__":
    main()
