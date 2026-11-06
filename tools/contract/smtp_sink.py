"""本机 SMTP 收件槽（127.0.0.1:1025，隐式 TLS，自签证书，接受 AUTH PLAIN/LOGIN）。

每封信写入 .contract-sandbox/mail/<序号>.eml；存在 run/smtp_fail.flag 时对 DATA 回 554，
用于验证「邮件失败不影响接口响应」。
"""
from __future__ import annotations

import datetime as dt
import itertools
import socketserver
import ssl
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import common as C  # noqa: E402

CERT = C.RUN_DIR / "smtp-cert.pem"
KEY = C.RUN_DIR / "smtp-key.pem"
_counter = itertools.count(1)


def ensure_cert() -> None:
    if CERT.is_file() and KEY.is_file():
        return
    from cryptography import x509
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.x509.oid import NameOID

    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "contract-smtp.local")])
    now = dt.datetime.now(dt.timezone.utc)
    cert = (
        x509.CertificateBuilder()
        .subject_name(name)
        .issuer_name(name)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - dt.timedelta(days=1))
        .not_valid_after(now + dt.timedelta(days=30))
        .sign(key, hashes.SHA256())
    )
    KEY.write_bytes(
        key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.TraditionalOpenSSL,
            serialization.NoEncryption(),
        )
    )
    CERT.write_bytes(cert.public_bytes(serialization.Encoding.PEM))


class SMTPHandler(socketserver.StreamRequestHandler):
    def _send(self, line: str) -> None:
        self.wfile.write((line + "\r\n").encode("ascii"))
        self.wfile.flush()

    def _readline(self) -> str:
        raw = self.rfile.readline(65536)
        if not raw:
            raise ConnectionError("client closed")
        return raw.decode("utf-8", errors="replace").rstrip("\r\n")

    def handle(self) -> None:
        mail_from = ""
        rcpts: list[str] = []
        authed = False
        try:
            self._send("220 contract-smtp ESMTP ready")
            while True:
                line = self._readline()
                verb = line.split(" ", 1)[0].upper()
                if verb in ("EHLO", "HELO"):
                    self.wfile.write(b"250-contract-smtp\r\n250-AUTH PLAIN LOGIN\r\n250-8BITMIME\r\n250 OK\r\n")
                    self.wfile.flush()
                elif verb == "AUTH":
                    parts = line.split()
                    if len(parts) >= 2 and parts[1].upper() == "LOGIN":
                        self._send("334 VXNlcm5hbWU6")
                        self._readline()
                        self._send("334 UGFzc3dvcmQ6")
                        self._readline()
                    elif len(parts) == 2:
                        self._send("334 ")
                        self._readline()
                    authed = True
                    self._send("235 2.7.0 Authentication successful")
                elif verb == "MAIL":
                    mail_from = line.split(":", 1)[1].strip() if ":" in line else ""
                    rcpts = []
                    self._send("250 OK")
                elif verb == "RCPT":
                    rcpts.append(line.split(":", 1)[1].strip() if ":" in line else "")
                    self._send("250 OK")
                elif verb == "DATA":
                    self._send("354 End data with <CR><LF>.<CR><LF>")
                    chunks: list[bytes] = []
                    while True:
                        raw = self.rfile.readline(1 << 20)
                        if not raw or raw in (b".\r\n", b".\n"):
                            break
                        if raw.startswith(b".."):
                            raw = raw[1:]
                        chunks.append(raw)
                    if C.SMTP_FAIL_FLAG.exists():
                        print(f"[smtp_sink] rejected DATA from={mail_from} (fail flag)", flush=True)
                        self._send("554 5.0.0 Transaction failed (contract fail flag)")
                        continue
                    n = next(_counter)
                    stamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
                    out = C.MAIL_DIR / f"{stamp}-{n:03d}.eml"
                    header = f"X-Contract-Auth: {authed}\r\nX-Contract-Envelope-From: {mail_from}\r\nX-Contract-Envelope-To: {', '.join(rcpts)}\r\n"
                    out.write_bytes(header.encode("utf-8") + b"".join(chunks))
                    print(f"[smtp_sink] stored {out.name} from={mail_from} to={rcpts}", flush=True)
                    self._send("250 OK queued")
                elif verb in ("RSET", "NOOP"):
                    self._send("250 OK")
                elif verb == "QUIT":
                    self._send("221 Bye")
                    return
                else:
                    self._send("502 Command not implemented")
        except (ConnectionError, ssl.SSLError, OSError):
            return


class TLSServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True

    def __init__(self, addr, handler, context: ssl.SSLContext):
        super().__init__(addr, handler)
        self.context = context

    def get_request(self):
        sock, addr = super().get_request()
        try:
            return self.context.wrap_socket(sock, server_side=True), addr
        except ssl.SSLError:
            sock.close()
            raise


def main() -> None:
    C.RUN_DIR.mkdir(parents=True, exist_ok=True)
    C.MAIL_DIR.mkdir(parents=True, exist_ok=True)
    ensure_cert()
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ctx.load_cert_chain(CERT, KEY)
    server = TLSServer((C.HOST, C.SMTP_PORT), SMTPHandler, ctx)
    print(f"[smtp_sink] listen smtps://{C.HOST}:{C.SMTP_PORT} mail_dir={C.MAIL_DIR}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
