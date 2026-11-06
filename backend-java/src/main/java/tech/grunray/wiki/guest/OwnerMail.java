package tech.grunray.wiki.guest;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Properties;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import jakarta.mail.Message;
import jakarta.mail.Session;
import jakarta.mail.Transport;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;

/** 站长邮件。失败只记日志，不影响已经成功的提交。 */
@Component
public class OwnerMail {

    private static final Logger log = LoggerFactory.getLogger(OwnerMail.class);

    private final boolean enabled;
    private final String host;
    private final int port;
    private final boolean ssl;
    private final String user;
    private final String password;
    private final String to;
    private final String from;
    private final String failFlag;

    public OwnerMail(
            @Value("${NOTIFY_EMAIL_ENABLED:false}") boolean enabled,
            @Value("${SMTP_HOST:}") String host,
            @Value("${SMTP_PORT:465}") int port,
            @Value("${SMTP_USE_SSL:true}") boolean ssl,
            @Value("${SMTP_USER:}") String user,
            @Value("${SMTP_PASSWORD:}") String password,
            @Value("${NOTIFY_EMAIL_TO:}") String to,
            @Value("${NOTIFY_EMAIL_FROM:}") String from,
            @Value("${SMTP_FAIL_FLAG:}") String failFlag) {
        this.enabled = enabled;
        this.host = host;
        this.port = port;
        this.ssl = ssl;
        this.user = user;
        this.password = password;
        this.to = to;
        this.from = from == null || from.isBlank() ? user : from;
        this.failFlag = failFlag;
    }

    public boolean configured() {
        return enabled && !host.isBlank() && !user.isBlank() && !password.isBlank() && !to.isBlank();
    }

    public void schedule(String subject, String body) {
        if (!configured()) {
            return;
        }
        Thread thread = new Thread(() -> send(subject, body), "owner-mail");
        thread.setDaemon(true);
        thread.start();
    }

    private void send(String subject, String body) {
        try {
            if (failFlag != null && !failFlag.isBlank() && Files.exists(Path.of(failFlag))) {
                throw new SmtpDataError();
            }
            Properties props = new Properties();
            String prefix = ssl ? "mail.smtps" : "mail.smtp";
            props.put(prefix + ".host", host);
            props.put(prefix + ".port", Integer.toString(port));
            props.put(prefix + ".auth", "true");
            props.put(prefix + ".connectiontimeout", "15000");
            props.put(prefix + ".timeout", "15000");
            props.put(prefix + ".ssl.enable", "true");
            props.put(prefix + ".ssl.trust", "*");
            props.put(prefix + ".ssl.checkserveridentity", "false");
            props.put(prefix + ".ssl.protocols", "TLSv1.2");
            Session session = Session.getInstance(props);
            MimeMessage message = new MimeMessage(session);
            message.setFrom(new InternetAddress(from));
            message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(to));
            message.setSubject(subject, "UTF-8");
            message.setText(body, "UTF-8");
            Transport transport = session.getTransport(ssl ? "smtps" : "smtp");
            try {
                transport.connect(host, port, user, password);
                transport.sendMessage(message, message.getAllRecipients());
            } finally {
                transport.close();
            }
        } catch (Exception e) {
            String name = e instanceof SmtpDataError || String.valueOf(e.getMessage()).contains("554")
                    ? "SMTPDataError"
                    : e.getClass().getSimpleName();
            log.warn("owner mail failed: {} {}", name, e.getMessage());
        }
    }

    private static final class SmtpDataError extends Exception {
    }
}
