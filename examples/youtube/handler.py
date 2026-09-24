"""Send YouTube subtitles to a new ChatGPT chat."""
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.request


VIDEO = re.compile(r"[A-Za-z0-9_-]{11}")
IOS_UA = "com.google.ios.youtube/20.10.38 (iPhone16,2; U; CPU iOS 18_3_2 like Mac OS X;)"


def lines_from(raw):
    lines = []

    def push(line):
        line = re.sub(r"\s+", " ", str(line or "")).strip()
        if line and line != (lines[-1] if lines else None):
            lines.append(line)

    try:
        parsed = json.loads(raw)
    except ValueError:
        parsed = None
    if isinstance(parsed, dict) and isinstance(parsed.get("events"), list):
        for event in parsed["events"]:
            segs = event.get("segs") if isinstance(event, dict) else None
            if segs:
                push("".join(seg.get("utf8", "") for seg in segs if isinstance(seg, dict)))
        return "\n".join(lines)
    for match in re.finditer(r"<text\b[^>]*>([\s\S]*?)</text>", raw):
        push(match.group(1))
    return "\n".join(lines)


def track_rank(track):
    lang = str(track.get("languageCode") or "").split("-")[0]
    asr = track.get("kind") == "asr"
    if lang == "ru" and not asr:
        return 0
    if lang == "ru":
        return 1
    if lang == "en" and not asr:
        return 2
    if lang == "en":
        return 3
    return 4


def opener():
    return urllib.request.build_opener(urllib.request.ProxyHandler({}))


def ios_captions(video):
    body = json.dumps({
        "context": {"client": {
            "clientName": "IOS",
            "clientVersion": "20.10.38",
            "deviceMake": "Apple",
            "deviceModel": "iPhone16,2",
            "osName": "iPhone",
            "osVersion": "18.3.2.22D82",
            "hl": "en",
            "gl": "US",
        }},
        "videoId": video,
        "contentCheckOk": True,
        "racyCheckOk": True,
    }).encode()
    request = urllib.request.Request(
        "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
        data=body,
        headers={"Content-Type": "application/json", "User-Agent": IOS_UA},
    )
    with opener().open(request, timeout=8) as response:
        player = json.loads(response.read().decode("utf-8"))
    tracks = ((player.get("captions") or {}).get("playerCaptionsTracklistRenderer") or {}).get("captionTracks") or []
    if not tracks:
        return None, ""
    track = sorted(tracks, key=track_rank)[0]
    url = track.get("baseUrl") or ""
    if not url:
        return None, ""
    if "fmt=" not in url:
        url += ("&" if "?" in url else "?") + "fmt=json3"
    download = urllib.request.Request(url, headers={"User-Agent": IOS_UA})
    with opener().open(download, timeout=8) as response:
        return track.get("languageCode"), response.read().decode("utf-8")


def archive_path(context, video):
    return Path(context["profile_root"]) / "data" / "readers" / "youtube.subtitles" / video / "subtitles.json"


def read_saved(path):
    if not path.is_file() or path.is_symlink():
        return None, ""
    saved = json.loads(path.read_text(encoding="utf-8"))
    raw = saved.get("raw") if isinstance(saved, dict) else ""
    return saved.get("lang") if isinstance(saved, dict) else None, lines_from(raw if isinstance(raw, str) else "")


def store(path, video, lang, raw):
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    value = {
        "contract": "youtube.subtitles/v1",
        "videoId": video,
        "lang": lang,
        "fmt": "json3",
        "raw": raw,
        "sha256": hashlib.sha256(raw.encode("utf-8")).hexdigest(),
    }
    with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent, delete=False) as target:
        temporary = Path(target.name)
        try:
            json.dump(value, target, ensure_ascii=False, allow_nan=False)
            target.flush()
            os.replace(temporary, path)
        finally:
            temporary.unlink(missing_ok=True)


def subtitles(context, video):
    path = archive_path(context, video)
    lang, text = read_saved(path)
    if text:
        return lang, text
    lang, raw = ios_captions(video)
    text = lines_from(raw)
    if text:
        store(path, video, lang, raw)
    return lang, text


def write_prompt(context, video, url, lang, text):
    output = Path(context["output_dir"])
    output.mkdir(parents=True, exist_ok=True, mode=0o700)
    target = output / f"chatgpt-subtitles-{video}.txt"
    source = url or f"https://youtu.be/{video}"
    body = "\n".join([
        f"Source: {source}",
        f"Video ID: {video}",
        f"Language: {lang or 'unknown'}",
        "",
        "Subtitles:",
        text,
        "",
    ])
    target.write_text(body, encoding="utf-8")
    return target


def tap_command(context):
    candidates = [
        shutil.which("tap"),
        str(Path.home() / ".local/bin/tap"),
        "/opt/homebrew/bin/tap",
        "/usr/local/bin/tap",
    ]
    profile_root = Path(context["profile_root"])
    candidates.append(str(profile_root.parent / "bin" / "tap"))
    for candidate in candidates:
        if candidate and Path(candidate).is_file():
            return candidate
    raise RuntimeError("tap CLI not found")


def send_to_chatgpt(context, path):
    command = [
        tap_command(context), "--profile", context["profile_root"],
        "chatgpt", "chat", "send", "--new", "--file", str(path), "--json",
    ]
    result = subprocess.run(command, text=True, capture_output=True, timeout=55)
    if result.returncode:
        raise RuntimeError((result.stderr or result.stdout or "chatgpt_send_failed").strip())
    return result.stdout.strip()


def handle(context, args):
    if not isinstance(args, dict) or args.get("op") != "chatgpt.subtitles":
        raise ValueError("invalid_request")
    video = args.get("videoId")
    if not isinstance(video, str) or not VIDEO.fullmatch(video):
        raise ValueError("invalid_video")
    url = args.get("url") if isinstance(args.get("url"), str) else ""
    lang, text = subtitles(context, video)
    if not text:
        raise ValueError("empty")
    prompt = write_prompt(context, video, url, lang, text)
    output = send_to_chatgpt(context, prompt)
    return {"videoId": video, "lang": lang, "file": str(prompt), "chatgpt": output}


def main():
    context = json.loads(os.environ["TAP_PACK_CONTEXT"])
    request = json.loads(sys.stdin.readline())
    try:
        value = handle(context, request.get("args"))
        reply = {"ok": True, "value": value}
    except ValueError as error:
        reply = {"ok": False, "error": {"code": str(error), "message": str(error)}}
    except Exception as error:
        reply = {"ok": False, "error": {"code": "chatgpt_send_failed", "message": str(error)}}
    print(json.dumps(reply, ensure_ascii=False))


if __name__ == "__main__":
    main()
