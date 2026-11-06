package tech.grunray.wiki.guest;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import jakarta.servlet.http.HttpServletRequest;

/** 进程内限流，成功写入后才记数。IP 取 X-Forwarded-For 第一段。 */
@Component
public class RateLimits {

    private final int messageIpCooldown;
    private final int replyCooldown;
    private final int perUser;
    private final int friendIpCooldown;
    private final int friendPerDay;
    private final Map<String, Long> messageIp = new ConcurrentHashMap<>();
    private final Map<String, Long> replyIp = new ConcurrentHashMap<>();
    private final Map<Integer, List<Long>> userPosts = new ConcurrentHashMap<>();
    private final Map<String, Long> friendIp = new ConcurrentHashMap<>();
    private final Map<String, List<Long>> friendDay = new ConcurrentHashMap<>();

    public RateLimits(
            @Value("${MESSAGE_IP_COOLDOWN_SEC:60}") int messageIpCooldown,
            @Value("${MESSAGE_OWNER_REPLY_COOLDOWN_SEC:10}") int replyCooldown,
            @Value("${MESSAGE_RATE_LIMIT_PER_USER:10}") int perUser,
            @Value("${FRIEND_IP_COOLDOWN_SEC:120}") int friendIpCooldown,
            @Value("${FRIEND_APPLICATION_MAX_PER_IP_PER_DAY:5}") int friendPerDay) {
        this.messageIpCooldown = messageIpCooldown;
        this.replyCooldown = replyCooldown;
        this.perUser = perUser;
        this.friendIpCooldown = friendIpCooldown;
        this.friendPerDay = friendPerDay;
    }

    public String checkMessageIp(HttpServletRequest request) {
        return cooldown(messageIp, ip(request), messageIpCooldown, "提交过于频繁，请稍后再试");
    }

    public void recordMessageIp(HttpServletRequest request) {
        messageIp.put(ip(request), System.nanoTime());
    }

    public String checkReplyIp(HttpServletRequest request) {
        return cooldown(replyIp, ip(request), replyCooldown, "回复过于频繁，请稍后再试");
    }

    public void recordReplyIp(HttpServletRequest request) {
        replyIp.put(ip(request), System.nanoTime());
    }

    public String checkHourly(int userId) {
        long now = System.currentTimeMillis();
        List<Long> history = userPosts.computeIfAbsent(userId, k -> new ArrayList<>());
        synchronized (history) {
            history.removeIf(t -> now - t >= 3_600_000);
            if (history.size() >= perUser) {
                return "已达到本小时留言上限，请稍后再试";
            }
        }
        return null;
    }

    public void recordHourly(int userId) {
        List<Long> history = userPosts.computeIfAbsent(userId, k -> new ArrayList<>());
        synchronized (history) {
            history.add(System.currentTimeMillis());
        }
    }

    public String checkFriendIp(HttpServletRequest request) {
        String cool = cooldown(friendIp, ip(request), friendIpCooldown, "提交过于频繁，请稍后再试");
        if (cool != null) {
            return cool;
        }
        long now = System.currentTimeMillis();
        List<Long> history = friendDay.computeIfAbsent(ip(request), k -> new ArrayList<>());
        synchronized (history) {
            history.removeIf(t -> now - t >= 86_400_000);
            if (history.size() >= friendPerDay) {
                return "今日申请次数已达上限，请明日再试";
            }
        }
        return null;
    }

    public void recordFriend(HttpServletRequest request) {
        String ip = ip(request);
        friendIp.put(ip, System.nanoTime());
        friendDay.computeIfAbsent(ip, k -> new ArrayList<>()).add(System.currentTimeMillis());
    }

    private static String cooldown(Map<String, Long> store, String ip, int seconds, String message) {
        if (seconds <= 0) {
            return null;
        }
        Long last = store.get(ip);
        if (last != null && System.nanoTime() - last < seconds * 1_000_000_000L) {
            return message;
        }
        return null;
    }

    public static String ip(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].strip();
        }
        return request.getRemoteAddr() == null ? "unknown" : request.getRemoteAddr();
    }
}
