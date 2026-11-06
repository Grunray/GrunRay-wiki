"""启停契约沙箱服务：smtp_sink(1025)、mock_oauth(5002)、Flask(5001)、可选 Java(5010)。

  backend\\.venv\\Scripts\\python.exe tools/contract/services.py start [--profile default] [--java]
  backend\\.venv\\Scripts\\python.exe tools/contract/services.py restart-flask --profile autopublish
  backend\\.venv\\Scripts\\python.exe tools/contract/services.py restart-java
  backend\\.venv\\Scripts\\python.exe tools/contract/services.py stop
"""
from __future__ import annotations

import argparse
import json
import os
import socket
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import common as C  # noqa: E402

PID_FILE = C.RUN_DIR / "pids.json"
SERVICES = {
    "smtp_sink": ("smtp_sink.py", C.SMTP_PORT),
    "mock_oauth": ("mock_oauth.py", C.MOCK_OAUTH_PORT),
    "flask": ("run_flask.py", C.FLASK_PORT),
    "java": ("run_java.py", C.JAVA_PORT),
}


def _port_open(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.3)
        return s.connect_ex((C.HOST, port)) == 0


def _load_pids() -> dict[str, int]:
    if PID_FILE.is_file():
        return json.loads(PID_FILE.read_text(encoding="utf-8"))
    return {}


def _save_pids(pids: dict[str, int]) -> None:
    PID_FILE.write_text(json.dumps(pids, indent=2), encoding="utf-8")


def _child_env() -> dict[str, str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("MYSQL_")}
    for k in ("HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy", "ALL_PROXY", "all_proxy"):
        env.pop(k, None)
    env.update({"PYTHONUTF8": "1", "PYTHONIOENCODING": "utf-8", "NO_PROXY": "127.0.0.1,localhost"})
    return env


def _start(name: str, extra_args: list[str]) -> int:
    script, port = SERVICES[name]
    if _port_open(port):
        raise SystemExit(f"端口 {port} 已被占用，先执行 stop 或检查占用进程")
    log_path = C.LOG_DIR / f"{name}.log"
    log_f = log_path.open("a", encoding="utf-8")
    log_f.write(f"\n===== start {time.strftime('%Y-%m-%d %H:%M:%S')} args={extra_args} =====\n")
    log_f.flush()
    flags = 0
    if os.name == "nt":
        flags = subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.DETACHED_PROCESS
    proc = subprocess.Popen(
        [str(C.backend_python()), "-u", str(C.TOOLS_DIR / script), *extra_args],
        cwd=C.REPO_ROOT,
        env=_child_env(),
        stdout=log_f,
        stderr=subprocess.STDOUT,
        stdin=subprocess.DEVNULL,
        creationflags=flags,
    )
    # Java 第一次 mvn package 可能要下载依赖，多等一会儿。
    tries = 240 if name == "java" else 60
    for _ in range(tries):
        if _port_open(port):
            print(f"[services] {name} pid={proc.pid} listen {C.HOST}:{port}")
            return proc.pid
        if proc.poll() is not None:
            break
        time.sleep(0.25)
    raise SystemExit(f"{name} 启动失败，见 {log_path}")


def _kill(pid: int) -> None:
    if os.name == "nt":
        subprocess.run(["taskkill", "/PID", str(pid), "/T", "/F"], capture_output=True)
    else:
        try:
            os.kill(pid, 15)
        except ProcessLookupError:
            pass


def _stop(name: str, pids: dict[str, int]) -> None:
    pid = pids.pop(name, None)
    if pid:
        _kill(pid)
    port = SERVICES[name][1]
    for _ in range(40):
        if not _port_open(port):
            break
        time.sleep(0.25)
    state = "仍在监听（请手动检查）" if _port_open(port) else "已停止"
    print(f"[services] {name} {state}")


def main() -> None:
    parser = argparse.ArgumentParser(description="启停契约沙箱服务")
    parser.add_argument("action", choices=["start", "stop", "restart-flask", "restart-java", "status"])
    parser.add_argument("--profile", default="default", choices=sorted(C.PROFILES))
    parser.add_argument("--java", action="store_true", help="start 时同时拉起 Java 5010")
    args = parser.parse_args()
    C.RUN_DIR.mkdir(parents=True, exist_ok=True)
    C.LOG_DIR.mkdir(parents=True, exist_ok=True)
    pids = _load_pids()

    if args.action == "start":
        for name in ("smtp_sink", "mock_oauth"):
            pids[name] = _start(name, [])
        pids["flask"] = _start("flask", ["--profile", args.profile])
        if args.java:
            pids["java"] = _start("java", ["--profile", args.profile])
    elif args.action == "restart-flask":
        _stop("flask", pids)
        pids["flask"] = _start("flask", ["--profile", args.profile])
    elif args.action == "restart-java":
        _stop("java", pids)
        pids["java"] = _start("java", ["--profile", args.profile])
    elif args.action == "stop":
        for name in ("java", "flask", "mock_oauth", "smtp_sink"):
            _stop(name, pids)
    else:
        for name, (_, port) in SERVICES.items():
            print(f"{name}: pid={pids.get(name)} port {port} {'open' if _port_open(port) else 'closed'}")
    _save_pids(pids)


if __name__ == "__main__":
    main()
