#!/usr/bin/env python3
"""Instagram crawler orchestrator for Fromistargram.

This script wraps instaloader with the project's storage conventions:

* Each account has its own directory under the configured data root.
* Post media files follow `<timestamp>_UTC_{n}.(jpg|mp4)` naming.
* Captions are stored as `<timestamp>_UTC.txt` encoded in UTF-8.
* Profile pictures are archived with `<timestamp>_UTC_profile_pic.jpg` when the
  image hash changes.

The crawler reuses persisted instaloader sessions, sequentially iterates over
configured accounts, and emits structured logs that can be collected by Docker
and forwarded to external log processors.
"""
from __future__ import annotations

import argparse
import dataclasses
import datetime as dt
import hashlib
import json
import logging
import os
import re
import time
from pathlib import Path
from typing import Iterable, List, Optional

import instaloader
from instaloader import Instaloader, InstaloaderException, Profile

try:
    from instaloader.structures import Post
except ImportError:  # pragma: no cover - optional dependency guard
    Post = "Post"  # type: ignore

LOGGER = logging.getLogger("fromistargram.crawler")
DEFAULT_RETRY_ATTEMPTS = 3
DEFAULT_RETRY_BACKOFF_SECONDS = 30

MEDIA_PATTERN = re.compile(
    r"^\\d{4}-\\d{2}-\\d{2}_\\d{2}-\\d{2}-\\d{2}_UTC(?:_\\d+)?\\.(?:jpg|mp4)$"
)
CAPTION_PATTERN = re.compile(r"^\\d{4}-\\d{2}-\\d{2}_\\d{2}-\\d{2}-\\d{2}_UTC\\.txt$")
PROFILE_PATTERN = re.compile(
    r"^\\d{4}-\\d{2}-\\d{2}_\\d{2}-\\d{2}-\\d{2}_UTC_profile_pic\\.jpg$"
)
PROFILE_HASH_FILENAME = ".profile_pic_hashes.json"


@dataclasses.dataclass
class CrawlerConfig:
    accounts: List[str]
    login_username: str
    password: Optional[str]
    data_root: Path
    session_dir: Path
    interval_minutes: Optional[int]
    retry_attempts: int
    retry_backoff_seconds: int
    max_posts_per_account: Optional[int]


def parse_args(env: dict[str, str]) -> CrawlerConfig:
    parser = argparse.ArgumentParser(description="Fromistargram crawler runner")
    parser.add_argument(
        "--accounts",
        help="Comma separated list of instagram usernames to crawl. Overrides CRAWL_ACCOUNTS.",
    )
    parser.add_argument(
        "--interval",
        type=int,
        help="Run continuously with the provided interval (minutes). Overrides CRAWL_INTERVAL_MINUTES.",
    )
    parser.add_argument(
        "--max-posts",
        type=int,
        help="Limit posts fetched per account (useful for smoke tests).",
    )
    parser.add_argument(
        "--retry-attempts",
        type=int,
        help="Override retry attempts for transient failures.",
    )
    parser.add_argument(
        "--retry-backoff",
        type=int,
        help="Override retry backoff seconds for transient failures.",
    )
    parser.add_argument(
        "--data-root",
        help="Root directory where account folders are stored. Overrides DATA_ROOT.",
    )
    parser.add_argument(
        "--session-dir",
        help="Directory where instaloader session files are stored. Overrides SESSION_DIR.",
    )
    args = parser.parse_args()

    accounts_env = args.accounts or env.get("CRAWL_ACCOUNTS", "")
    accounts = [acct.strip() for acct in accounts_env.split(",") if acct.strip()]
    if not accounts:
        parser.error("No crawl accounts provided via --accounts or CRAWL_ACCOUNTS")

    login_username = env.get("INSTAGRAM_USERNAME")
    if not login_username:
        parser.error("INSTAGRAM_USERNAME is required for session reuse")

    password = env.get("INSTAGRAM_PASSWORD")

    data_root = Path(args.data_root or env.get("DATA_ROOT", "/root")).expanduser()
    session_dir = Path(args.session_dir or env.get("SESSION_DIR", "./sessions")).expanduser()

    interval_env = args.interval if args.interval is not None else env.get("CRAWL_INTERVAL_MINUTES")
    interval_minutes = int(interval_env) if interval_env is not None else None

    retry_attempts = args.retry_attempts or int(env.get("CRAWLER_RETRY_ATTEMPTS", DEFAULT_RETRY_ATTEMPTS))
    retry_backoff_seconds = args.retry_backoff or int(
        env.get("CRAWLER_RETRY_BACKOFF_SECONDS", DEFAULT_RETRY_BACKOFF_SECONDS)
    )

    max_posts = args.max_posts or env.get("CRAWLER_MAX_POSTS")
    max_posts_int = int(max_posts) if max_posts is not None else None

    return CrawlerConfig(
        accounts=accounts,
        login_username=login_username,
        password=password,
        data_root=data_root,
        session_dir=session_dir,
        interval_minutes=interval_minutes,
        retry_attempts=retry_attempts,
        retry_backoff_seconds=retry_backoff_seconds,
        max_posts_per_account=max_posts_int,
    )


def setup_logging() -> None:
    log_level = os.getenv("CRAWLER_LOG_LEVEL", "INFO").upper()
    logging.basicConfig(
        level=getattr(logging, log_level, logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s :: %(message)s",
    )


def load_or_login(loader: Instaloader, config: CrawlerConfig) -> None:
    session_dir = config.session_dir
    session_dir.mkdir(parents=True, exist_ok=True)
    session_path = session_dir / f"{config.login_username}.session"

    if session_path.exists():
        LOGGER.info("Loading session for %s from %s", config.login_username, session_path)
        loader.load_session_from_file(config.login_username, str(session_path))
        return

    if not config.password:
        raise SystemExit(
            "INSTAGRAM_PASSWORD is required to create a new session; provide it once to bootstrap the session file."
        )

    LOGGER.info("No session file found. Logging in and persisting session to %s", session_path)
    loader.login(config.login_username, config.password)
    loader.save_session_to_file(str(session_path))


def ensure_account_dir(root: Path, username: str) -> Path:
    account_dir = root / username
    account_dir.mkdir(parents=True, exist_ok=True)
    return account_dir


def download_profile_picture(loader: Instaloader, profile: Profile, account_dir: Path) -> None:
    timestamp = dt.datetime.utcnow().strftime("%Y-%m-%d_%H-%M-%S")
    filename = account_dir / f"{timestamp}_UTC_profile_pic.jpg"

    context = loader.context
    pic_bytes = context.get_raw(profile.profile_pic_url)
    digest = hashlib.sha256(pic_bytes).hexdigest()

    hashes = _load_profile_hashes(account_dir)
    if digest in hashes.values():
        LOGGER.debug("Profile picture for %s unchanged; skipping archival", profile.username)
        return

    LOGGER.info("Archiving new profile picture for %s", profile.username)
    filename.write_bytes(pic_bytes)
    hashes[str(timestamp)] = digest
    _save_profile_hashes(account_dir, hashes)


def _load_profile_hashes(account_dir: Path) -> dict[str, str]:
    path = account_dir / PROFILE_HASH_FILENAME
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text())
    except json.JSONDecodeError:
        LOGGER.warning("Profile hash cache corrupted at %s; resetting", path)
        return {}


def _save_profile_hashes(account_dir: Path, hashes: dict[str, str]) -> None:
    path = account_dir / PROFILE_HASH_FILENAME
    path.write_text(json.dumps(hashes, indent=2, sort_keys=True))


def crawl_account(
    loader: Instaloader,
    profile: Profile,
    account_dir: Path,
    max_posts: Optional[int] = None,
) -> None:
    LOGGER.info("Starting crawl for %s", profile.username)
    posts_iterable: Iterable[Post] = profile.get_posts()
    count = 0
    for post in posts_iterable:
        store_post(loader, post, account_dir)
        count += 1
        if max_posts is not None and count >= max_posts:
            LOGGER.info("Max posts limit (%s) reached for %s", max_posts, profile.username)
            break
    validate_storage(account_dir)


def store_post(loader: Instaloader, post: Post, account_dir: Path) -> None:
    timestamp = post.date_utc.strftime("%Y-%m-%d_%H-%M-%S")
    caption_path = account_dir / f"{timestamp}_UTC.txt"
    if not caption_path.exists():
        caption = post.caption or ""
        hashtags = " ".join(f"#{tag}" for tag in post.caption_hashtags)
        document = caption.strip()
        if hashtags:
            document = f"{document}\n\n{hashtags}" if document else hashtags
        caption_path.write_text(document, encoding="utf-8")
        LOGGER.debug("Saved caption for %s", post.shortcode)

    media_nodes = list(iter_media_nodes(post))
    for index, node in enumerate(media_nodes, start=1):
        extension = "mp4" if node["is_video"] else "jpg"
        filename = account_dir / f"{timestamp}_UTC_{index}.{extension}"
        if filename.exists():
            LOGGER.debug("Media %s already exists; skipping", filename)
            continue
        url = node["video_url"] if node["is_video"] else node["display_url"]
        if not url:
            LOGGER.warning("Skipping media without resolvable URL for %s", post.shortcode)
            continue
        LOGGER.debug("Downloading media from %s to %s", url, filename)
        data = loader.context.get_raw(url)
        filename.write_bytes(data)


def iter_media_nodes(post: Post) -> Iterable[dict[str, Optional[str]]]:
    if post.typename == "GraphSidecar":
        for node in post.get_sidecar_nodes():
            yield {
                "is_video": bool(getattr(node, "is_video", False)),
                "display_url": getattr(node, "display_url", None),
                "video_url": getattr(node, "video_url", None),
            }
    else:
        yield {
            "is_video": post.is_video,
            "display_url": post.url,
            "video_url": post.video_url,
        }


def validate_storage(account_dir: Path) -> None:
    """Verify file naming conventions for the account directory."""
    invalid_files: list[Path] = []
    for item in account_dir.iterdir():
        if item.name == PROFILE_HASH_FILENAME:
            continue
        if item.is_dir():
            invalid_files.append(item)
            continue
        if item.suffix == ".txt":
            if not CAPTION_PATTERN.match(item.name):
                invalid_files.append(item)
        elif item.name.endswith("_profile_pic.jpg"):
            if not PROFILE_PATTERN.match(item.name):
                invalid_files.append(item)
        elif item.suffix in {".jpg", ".mp4"}:
            if not MEDIA_PATTERN.match(item.name):
                invalid_files.append(item)
        else:
            invalid_files.append(item)
    if invalid_files:
        paths = ", ".join(str(path.name) for path in invalid_files)
        LOGGER.warning("Detected files violating naming convention in %s: %s", account_dir, paths)


def create_loader() -> Instaloader:
    loader = instaloader.Instaloader(
        dirname_pattern="{target}",
        filename_pattern="{date_utc}",
        download_geotags=False,
        download_comments=False,
        save_metadata=False,
        download_video_thumbnails=False,
        compress_json=False,
        post_metadata_txt_pattern="",
    )
    loader.quiet = True
    return loader


def run_once(loader: Instaloader, config: CrawlerConfig) -> None:
    for account in config.accounts:
        account_dir = ensure_account_dir(config.data_root, account)
        for attempt in range(1, config.retry_attempts + 1):
            try:
                profile = Profile.from_username(loader.context, account)
                download_profile_picture(loader, profile, account_dir)
                crawl_account(loader, profile, account_dir, config.max_posts_per_account)
                break
            except InstaloaderException as exc:
                LOGGER.exception(
                    "Failed to crawl %s on attempt %s/%s: %s",
                    account,
                    attempt,
                    config.retry_attempts,
                    exc,
                )
                if attempt == config.retry_attempts:
                    LOGGER.error("Exhausted retries for %s", account)
                    continue
                sleep_time = config.retry_backoff_seconds * attempt
                LOGGER.info("Retrying %s in %s seconds", account, sleep_time)
                time.sleep(sleep_time)


def loop(loader: Instaloader, config: CrawlerConfig) -> None:
    if not config.interval_minutes:
        run_once(loader, config)
        return

    LOGGER.info(
        "Entering scheduled mode with %s-minute interval", config.interval_minutes
    )
    interval_seconds = config.interval_minutes * 60
    while True:
        cycle_started = time.monotonic()
        run_once(loader, config)
        elapsed = time.monotonic() - cycle_started
        sleep_for = max(0, interval_seconds - elapsed)
        LOGGER.info("Cycle complete in %.1fs; sleeping for %.1fs", elapsed, sleep_for)
        time.sleep(sleep_for)


def main() -> None:
    setup_logging()
    config = parse_args(os.environ)
    loader = create_loader()
    load_or_login(loader, config)
    try:
        loop(loader, config)
    except KeyboardInterrupt:
        LOGGER.info("Received interrupt; exiting cleanly")


if __name__ == "__main__":
    main()
