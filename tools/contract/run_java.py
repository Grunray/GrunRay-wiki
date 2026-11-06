"""从沙箱配置启动 Java API（127.0.0.1:5010）。不读仓库 backend/.env。

  backend\\.venv\\Scripts\\python.exe tools/contract/run_java.py
"""
from __future__ import annotations

import os
import shutil
import subprocess
import sys
import argparse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import common as C  # noqa: E402


def _sandbox_env() -> dict[str, str]:
    from dotenv import dotenv_values

    env_path = C.SANDBOX_BACKEND / ".env"
    if not env_path.is_file():
        raise SystemExit("找不到沙箱 .env，先运行 tools/contract/setup_sandbox.py")
    values = {k: (v or "") for k, v in dotenv_values(env_path).items()}
    host = (values.get("MYSQL_HOST") or "127.0.0.1").strip()
    database = (values.get("MYSQL_DATABASE") or "").strip()
    if host not in C.LOOPBACK_HOSTS:
        raise SystemExit(f"拒绝：沙箱 MYSQL_HOST={host!r} 不是回环地址")
    if database != C.CONTRACT_DB:
        raise SystemExit(f"拒绝：沙箱 MYSQL_DATABASE={database!r}，期望 {C.CONTRACT_DB}")
    return values


def _mvnw() -> Path:
    name = "mvnw.cmd" if os.name == "nt" else "mvnw"
    path = C.JAVA_DIR / name
    if not path.is_file():
        raise SystemExit(f"找不到 {path}")
    return path


def _java_bin() -> str:
    home = os.environ.get("JAVA_HOME", "").strip()
    if home:
        candidate = Path(home) / "bin" / ("java.exe" if os.name == "nt" else "java")
        if candidate.is_file():
            return str(candidate)
    found = shutil.which("java")
    if not found:
        raise SystemExit("找不到 java，请安装 JDK 21 或设置 JAVA_HOME")
    return found


def main() -> None:
    parser = argparse.ArgumentParser(description="从沙箱配置启动 Java API（127.0.0.1:5010）")
    parser.add_argument("--profile", default="default", choices=sorted(C.PROFILES))
    args = parser.parse_args()
    values = _sandbox_env()
    content = (C.SANDBOX_BACKEND / "content").resolve()
    if not content.is_dir():
        raise SystemExit(f"找不到沙箱内容目录 {content}")

    env = {k: v for k, v in os.environ.items() if not k.startswith("MYSQL_")}
    for k in ("HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy", "ALL_PROXY", "all_proxy"):
        env.pop(k, None)
    forwarded = {k: v for k, v in values.items() if k not in {"PORT", "CONTENT_ROOT", "MYSQL_DATABASE"}}
    for key in ("MESSAGE_SENSITIVE_WORDS_PATH", "FRIEND_SPECIAL_LINKS_PATH"):
        raw = forwarded.get(key)
        if raw and not Path(raw).is_absolute():
            forwarded[key] = str((C.SANDBOX_BACKEND / raw).resolve())
    env.update(forwarded)
    env.update(
        {
            "MYSQL_DATABASE": C.CONTRACT_DB,
            "CONTENT_ROOT": str(content),
            "PORT": str(C.JAVA_PORT),
            "BIND_ADDRESS": C.HOST,
            "SPRING_PROFILES_ACTIVE": "contract",
            "NO_PROXY": "127.0.0.1,localhost",
            "GRUNRAY_OAUTH_HTTP_BASE": C.MOCK_OAUTH_BASE,
            "SMTP_FAIL_FLAG": str(C.SMTP_FAIL_FLAG),
        }
    )
    for key, raw in C.PROFILES[args.profile].items():
        env[key] = raw

    print("[java] mvn package", flush=True)
    subprocess.check_call(
        [str(_mvnw()), "-q", "-DskipTests", "package"],
        cwd=C.JAVA_DIR,
        env=env,
    )
    jar = C.JAVA_DIR / "target" / "grunray-wiki-api.jar"
    if not jar.is_file():
        raise SystemExit("package 成功但找不到 grunray-wiki-api.jar")

    print(f"[java] listen {C.JAVA_BASE}  content_root={content}", flush=True)
    raise SystemExit(
        subprocess.call(
            [_java_bin(), "-jar", str(jar), "--spring.profiles.active=contract"],
            cwd=C.JAVA_DIR,
            env=env,
        )
    )


if __name__ == "__main__":
    main()
