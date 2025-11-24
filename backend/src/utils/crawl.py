#!/usr/bin/env python3
"""
다중 프로필 인스타그램 다운로더 (로컬 수정된 Instaloader 기반)
사용법: python download_profiles.py
"""

import os
import sys
import time
import argparse
import datetime
from pathlib import Path
from instaloader import Instaloader, Profile
# python3 ./download_profiles.py -l ddunddun333 -f -s -hl -r
# 인스타 로그인 후 session id 가져와서 입력해줘야함.

def create_logger(log_file):
    """로깅 함수"""
    def log(message):
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_message = f"[{timestamp}] {message}"
        print(log_message)
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(log_message + "\n")
    return log


def main():
    # 명령줄 인자 파싱
    parser = argparse.ArgumentParser(description="인스타그램 다중 프로필 다운로더 (로컬 수정된 Instaloader 사용)")
    parser.add_argument("--login", "-l", help="로그인할 사용자명")
    parser.add_argument("--password", "-p", help="로그인 비밀번호")
    parser.add_argument(
        "--profiles",
        nargs="*",
        help="다운로드할 프로필 계정들을 직접 지정 (예: --profiles fromis_9 saerom hayoung)"
    )
    parser.add_argument(
        "--profiles-file",
        help="다운로드할 프로필 목록 파일 경로 (기본값: profiles.txt)"
    )
    parser.add_argument("--stories", "-s", action="store_true", help="스토리 다운로드 활성화")
    parser.add_argument("--highlights", "-hl", action="store_true", help="하이라이트 다운로드 활성화")
    parser.add_argument("--tagged", "-t", action="store_true", help="태그된 게시물 다운로드 활성화")
    parser.add_argument("--reels", "-r", action="store_true", help="릴스 다운로드 활성화")
    parser.add_argument("--igtv", "-i", action="store_true", help="IGTV 다운로드 활성화")
    parser.add_argument("--fast-update", "-f", action="store_true",
                        help="이미 다운로드된 게시물을 만나면 중단")
    parser.add_argument("--count", "-c", type=int, help="각 프로필당 다운로드할 최대 게시물 수")
    parser.add_argument("--delay", "-d", type=int, default=10,
                        help="각 프로필 다운로드 사이의 지연 시간(초)")
    parser.add_argument("--output-dir", "-o", help="다운로드 저장 디렉토리")
    parser.add_argument("--session-id", "-sid", help="직접 세션 ID 입력")

    args = parser.parse_args()

    # 기본 디렉토리 설정
    # base_dir = Path(__file__).resolve().parents[2]
    base_dir = Path(os.path.dirname(os.path.abspath(__file__)))
    env_output_root = os.environ.get("CRAWL_OUTPUT_DIR") or os.environ.get("DATA_ROOT")
    default_output_dir = Path(env_output_root) if env_output_root else base_dir / "downloads"
    output_dir = Path(args.output_dir) if args.output_dir else default_output_dir
    profiles_file = args.profiles_file or base_dir / "profiles.txt"
    log_file = base_dir / "download_log.txt"

    # 출력 디렉토리 생성
    os.makedirs(output_dir, exist_ok=True)

    # 로그 설정
    log = create_logger(log_file)
    log(f"다운로드 경로: {output_dir}")
    log(f"인스타그램 다운로더 시작 (로컬 수정된 Instaloader 사용)")
    # log(f"Instaloader 경로: {INSTALOADER_PATH}")

    # 프로필 리스트 파일이 없으면 생성
    if not args.profiles and not os.path.exists(profiles_file):
        with open(profiles_file, "w", encoding="utf-8") as f:
            f.write("# 다운로드할 인스타그램 프로필 이름을 각 줄에 하나씩 입력하세요\n")
            f.write("# 예: instagram\n")
        log(f"'{profiles_file}' 파일이 생성되었습니다. 다운로드할 프로필을 입력하고 다시 실행하세요.")
        return

    if args.profiles:
        profiles = [profile.strip() for profile in args.profiles if profile.strip()]
        log(f"CLI 인자로 전달된 프로필 {len(profiles)}개 사용")
    else:
        # 프로필 리스트 로드
        with open(profiles_file, "r", encoding="utf-8") as f:
            profiles = [line.strip() for line in f
                        if line.strip() and not line.strip().startswith("#")]

    if not profiles:
        log(f"다운로드할 프로필이 없습니다. '{profiles_file}' 파일을 확인하세요.")
        return

    log(f"다운로드할 프로필 {len(profiles)}개: {', '.join(profiles)}")

    # Instaloader 설정 - 출력 디렉토리 패턴 설정
    l = Instaloader(
        dirname_pattern=str(output_dir / "{target}"),  # 출력 디렉토리 지정
        download_pictures=True,
        download_videos=True,
        download_video_thumbnails=False,
        download_geotags=False,
        download_comments=False,
        save_metadata=True,
        compress_json=False,  # 읽기 쉬운 JSON 파일
        post_metadata_txt_pattern="{caption}",
        max_connection_attempts=5,
        request_timeout=300.0,
    )

    # 세션 ID 직접 설정 (수정된 부분)
    if args.session_id:
        log(f"직접 제공된 세션 ID 사용: {args.session_id[:10]}...")
        l.context._session.cookies.set('sessionid', args.session_id)
        log(f"세션 ID 설정 완료")

    # 로그인 시도
    try:
        if args.login:
            if args.password:
                log(f"{args.login} 계정으로 비밀번호를 사용하여 로그인 시도...")
                l.login(args.login, args.password)
            else:
                # 세션 파일에서 로그인 시도
                session_file = os.path.join(os.path.expanduser("~"),
                                            ".config", "instaloader", f"session-{args.login}")
                log_session_file = base_dir / f"session-{args.login}"

                if os.path.exists(log_session_file):
                    log(f"{args.login} 계정으로 로컬 세션 파일을 사용하여 로그인 시도...")
                    l.load_session_from_file(args.login, str(log_session_file))
                elif os.path.exists(session_file):
                    log(f"{args.login} 계정으로 시스템 세션 파일을 사용하여 로그인 시도...")
                    l.load_session_from_file(args.login)
                else:
                    log(f"세션 파일이 없습니다. 비밀번호를 입력하세요:")
                    import getpass
                    password = getpass.getpass()
                    l.login(args.login, password)

            log(f"{args.login} 계정으로 로그인 성공")
            # 세션 저장
            session_file = env_output_root / f"session-{args.login}"
            l.save_session_to_file(str(session_file))
            log(f"세션이 '{session_file}' 파일에 저장되었습니다.")
        else:
            log("로그인 없이 진행합니다 (비공개 프로필 및 스토리는 다운로드할 수 없음)")
    except Exception as e:
        log(f"로그인 과정 중 오류: {e}")
        if args.stories or args.highlights:
            log("경고: 스토리나 하이라이트를 다운로드하려면 로그인이 필요합니다.")

    # 세션 확인
    session_id = l.context._session.cookies.get('sessionid')
    if session_id:
        log(f"현재 세션 ID: {session_id[:10]}... (정상)")
    else:
        log("경고: 세션 ID가 설정되지 않았습니다. 로그인 상태를 확인하세요.")
        l.context._session.cookies.set('sessionid', args.session_id) # 여기에 session_id를 넣어야함.
        log(f"Set session ID to default value : {l.context._session.cookies.get('sessionid')}")

    errors = []

    # 각 프로필 다운로드
    for idx, username in enumerate(profiles, 1):
        try:
            log(f"[{idx}/{len(profiles)}] {username} 프로필 다운로드 시작...")

            try:
                profile = Profile.from_username(l.context, username)
            except Exception as e:
                log(f"프로필 로드 실패: {e}")
                continue

            # 프로필 정보 출력
            log(f"프로필: {profile.username} (이름: {profile.full_name})")
            log(f"게시물: {profile.mediacount}, 팔로워: {profile.followers}, 팔로잉: {profile.followees}")
            log(f"비공개 계정: {'예' if profile.is_private else '아니오'}")

            # 다운로드 설정
            profile_set = {profile}

            # 다운로드 실행
            l.download_profiles(
                profiles=profile_set,
                profile_pic=True,
                posts=True,
                tagged=args.tagged,
                igtv=args.igtv,
                highlights=args.highlights,
                stories=args.stories,
                fast_update=args.fast_update,
                max_count=args.count,
                reels=args.reels
            )

            log(f"{username} 다운로드 완료")

            # 다음 프로필 전 지연 시간
            if idx < len(profiles):
                delay = args.delay
                log(f"{delay}초 대기 중...")
                time.sleep(delay)

        except Exception as e:
            log(f"{username} 다운로드 중 오류 발생: {e}")
            errors.append(f"{username}: {e}")

    if errors:
        log(f"다운로드 중 {len(errors)}건 실패: {'; '.join(errors)}")
        sys.exit(1)

    log("모든 다운로드 작업 완료")


if __name__ == "__main__":
    main()
