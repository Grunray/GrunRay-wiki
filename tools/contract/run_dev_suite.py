"""开发环境全面测试。不连生产库，不改 Nginx / systemd。

  backend\\.venv\\Scripts\\python.exe tools/contract/run_dev_suite.py

说明见同目录 README.md。
"""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import common as C  # noqa: E402

PY = Path(sys.executable)
ROOT = C.REPO_ROOT


def log(msg: str) -> None:
    print(f"\n[suite] {msg}", flush=True)


def run(args: list[str], cwd: Path, env: dict[str, str] | None = None) -> None:
    log(" ".join(args))
    subprocess.check_call(args, cwd=cwd, env=env or os.environ.copy())


def java_env() -> dict[str, str]:
    env = os.environ.copy()
    home = env.get("JAVA_HOME", "").strip()
    if not home:
        guessed = Path.home() / ".jdks" / "jdk-21.0.13+9"
        java = guessed / "bin" / ("java.exe" if os.name == "nt" else "java")
        if java.is_file():
            env["JAVA_HOME"] = str(guessed)
    return env


def contract(args: list[str], env: dict[str, str]) -> None:
    run([str(PY), str(C.TOOLS_DIR / args[0]), *args[1:]], ROOT, env)


def main() -> None:
    env = java_env()
    if env.get("JAVA_HOME"):
        os.environ["JAVA_HOME"] = env["JAVA_HOME"]
    mvnw = ROOT / "backend-java" / ("mvnw.cmd" if os.name == "nt" else "mvnw")
    npx = "npx.cmd" if os.name == "nt" else "npx"

    run([str(PY), "-m", "pytest"], ROOT / "backend", env)
    run([str(mvnw), "-B", "verify"], ROOT / "backend-java", env)
    run([npx, "vue-tsc", "-b"], ROOT / "frontend", env)
    run([npx, "vite", "build"], ROOT / "frontend", env)

    contract(["setup_sandbox.py", "--reset"], env)
    contract(["services.py", "start", "--java"], env)
    try:
        contract(["compare_bases.py"], env)
        contract(["run_cases.py", "--base", C.JAVA_BASE, "--phase", "default", "--label", "java"], env)
        contract(["services.py", "restart-java", "--profile", "autopublish"], env)
        contract(["run_cases.py", "--base", C.JAVA_BASE, "--phase", "autopublish", "--label", "java-b"], env)
    finally:
        contract(["services.py", "stop"], env)

    contract(["setup_sandbox.py", "--reset"], env)
    contract(["services.py", "start"], env)
    try:
        contract(["run_cases.py", "--phase", "default", "--label", "flask"], env)
        contract(["services.py", "restart-flask", "--profile", "autopublish"], env)
        contract(["run_cases.py", "--phase", "autopublish", "--label", "flask-b"], env)
    finally:
        contract(["services.py", "stop"], env)

    contract(["flyway_check.py"], env)
    contract(["rollback_drill.py"], env)
    log("开发环境全面测试完成")


if __name__ == "__main__":
    main()
