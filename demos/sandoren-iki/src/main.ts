import "./style.css";
import { IkiMotion, IkiPlayer } from "@ikijs/engine";
import { parseIkiModel, StandardParameter, type IkiModel } from "@ikijs/format";

const canvas = document.getElementById("stage") as HTMLCanvasElement;
const statusEl = document.getElementById("status")!;
const panel = document.getElementById("panel")!;
const slidersRoot = document.getElementById("sliders")!;
const toggleBtn = document.getElementById("toggle-panel")!;

const LABELS: Record<string, string> = {
  smile: "微笑",
  laugh: "大笑",
  angry: "生气",
  sad: "难过",
  surprised: "惊讶",
  shy: "害羞",
  sleepy: "犯困",
  Nod: "点头",
  Shake: "摇头",
  Tilt: "歪头",
  Bow: "鞠躬",
  Greet: "打招呼",
  Glance: "瞥一眼",
  Sigh: "叹气",
  Squat: "下蹲",
};

const LINES: Record<string, string> = {
  smile: "哼。看够了吗，勉强还算顺眼。",
  laugh: "呵。也就这样，也配让我笑？",
  angry: "放肆。别拿这种事来烦我。",
  sad: "……没什么。你听错了。",
  surprised: "哦？倒是出乎意料。",
  shy: "谁在害羞。把眼睛挪开。",
  sleepy: "我没有困。只是懒得理你。",
  Nod: "嗯。算你说对了。",
  Shake: "不行。想都别想。",
  Tilt: "……你究竟在说什么。",
  Bow: "别误会，这只是礼节。",
  Greet: "哦，是你。别指望我热情。",
  Glance: "看一眼就够了。",
  Sigh: "真是麻烦。",
  Squat: "……只是活动一下。别盯着看。",
};

const expressionBar = document.getElementById("expression-bar")!;
const motionBar = document.getElementById("motion-bar")!;
const lineEl = document.getElementById("line")!;
const drawer = document.getElementById("drawer")!;
const drawerBody = document.getElementById("drawer-body")!;
const toggleDrawerBtn = document.getElementById("toggle-drawer")!;
const notice = document.getElementById("notice")!;
const noticeText = document.getElementById("notice-text")!;
const noticeCancel = document.getElementById("notice-cancel")!;
const noticeContinue = document.getElementById("notice-continue")!;
const SQUAT_NOTICE =
  "腿部没有单独的膝关节，下蹲效果会比较差。使用时请留意。";

function hideNotice() {
  notice.hidden = true;
}

function showSquatNotice() {
  noticeText.textContent = SQUAT_NOTICE;
  notice.hidden = false;
}

function playMotionGroup(group: string) {
  const ok = motion.playMotion(group, 0);
  if (!ok) {
    setStatus(`无法播放动作：${group}`);
    return;
  }
  const clip = model.motions?.[group]?.[0];
  motionLockUntil = performance.now() + (clip?.duration ?? 1.2) * 1000;
  say(group);
  setStatus(`动作：${labelOf(group)}`);
}
const ANGLE_X_MAX = 24;
const ANGLE_Y_MAX = 16;
const EYE_MAX = 0.42;
const ROLL_MAX = 12;
const ARM_SWING = 14;
const ARM_VEL_GAIN = 0.4;
const ARM_SMALL = 0.4;
let armTowardRight = true;
const SMOOTH = 0.12;
const player = new IkiPlayer(canvas);
let model: IkiModel;
let motion: IkiMotion;

const target = { ax: 0, ay: 0, ex: 0, ey: 0 };
const current = { ax: 0, ay: 0, ex: 0, ey: 0 };
const arm = { l: 0, r: 0, vl: 0, vr: 0 };
const manual = new Map<string, number>();
let pointerActive = false;
let lastFrame = 0;
let prevAx = 0;
const armHistory: { t: number; v: number }[] = [];

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.floor(window.innerWidth * dpr);
  const h = Math.floor(window.innerHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}

function setStatus(text: string) {
  statusEl.textContent = text;
}

function buildSliders() {
  slidersRoot.replaceChildren();
  for (const p of player.getParameters()) {
    const label = document.createElement("label");
    const name = document.createElement("span");
    name.textContent = p.name ?? p.id;
    const value = document.createElement("span");
    value.className = "value";
    value.textContent = String(p.default);
    const input = document.createElement("input");
    input.type = "range";
    input.min = String(p.min);
    input.max = String(p.max);
    input.step = String((p.max - p.min) / 200 || 0.01);
    input.value = String(p.default);
    input.addEventListener("input", () => {
      const v = Number(input.value);
      value.textContent = v.toFixed(2);
      manual.set(p.id, v);
    });
    label.append(name, value, input);
    slidersRoot.append(label);
  }
}

function onPointer(clientX: number, clientY: number) {
  const nx = (clientX / window.innerWidth) * 2 - 1;
  const ny = (clientY / window.innerHeight) * 2 - 1;
  target.ax = nx * ANGLE_X_MAX;
  target.ay = -ny * ANGLE_Y_MAX;
  target.ex = nx * EYE_MAX;
  target.ey = -ny * EYE_MAX;
  pointerActive = true;
}

canvas.addEventListener("pointermove", (e) => onPointer(e.clientX, e.clientY));
canvas.addEventListener("pointerleave", () => {
  pointerActive = false;
  target.ax = 0;
  target.ay = 0;
  target.ex = 0;
  target.ey = 0;
});

let activeExpression: string | null = null;
let motionLockUntil = 0;

function labelOf(id: string) {
  return LABELS[id] ?? id;
}

function say(id: string) {
  lineEl.textContent = LINES[id] ?? "";
}

function buildControls() {
  expressionBar.replaceChildren();
  for (const expression of model.expressions ?? []) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = labelOf(expression.id);
    button.addEventListener("click", () => {
      if (activeExpression === expression.id) {
        motion.stopExpression();
        activeExpression = null;
        for (const other of expressionBar.querySelectorAll("button")) {
          other.classList.remove("active");
        }
        say("");
        setStatus("表情已恢复");
        return;
      }
      const ok = motion.playExpression(expression.id);
      if (!ok) {
        setStatus(`无法播放表情：${expression.id}`);
        return;
      }
      activeExpression = expression.id;
      for (const other of expressionBar.querySelectorAll("button")) {
        other.classList.toggle("active", other === button);
      }
      say(expression.id);
      setStatus(`表情：${labelOf(expression.id)}`);
    });
    expressionBar.append(button);
  }

  motionBar.replaceChildren();
  for (const group of Object.keys(model.motions ?? {})) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = labelOf(group);
    button.addEventListener("click", () => {
      if (group === "Squat") {
        showSquatNotice();
        return;
      }
      playMotionGroup(group);
    });
    motionBar.append(button);
  }
}

toggleDrawerBtn.addEventListener("click", () => {
  const open = drawer.classList.toggle("open");
  drawerBody.hidden = !open;
  toggleDrawerBtn.textContent = open ? "收起功能" : "展开功能";
  toggleDrawerBtn.setAttribute("aria-expanded", open ? "true" : "false");
});

toggleBtn.addEventListener("click", () => {
  panel.classList.toggle("collapsed");
});

noticeCancel.addEventListener("click", () => {
  hideNotice();
  setStatus("已取消下蹲");
});

noticeContinue.addEventListener("click", () => {
  hideNotice();
  playMotionGroup("Squat");
});

notice.addEventListener("click", (event) => {
  if (event.target === notice) {
    hideNotice();
    setStatus("已取消下蹲");
  }
});

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function stepSpring(pos: number, vel: number, goal: number, dt: number, stiffness: number, damping: number) {
  const accel = stiffness * (goal - pos) - damping * vel;
  const nextVel = vel + accel * dt;
  return [pos + nextVel * dt, nextVel] as const;
}

function delayedSwing(now: number, value: number, lagMs: number) {
  armHistory.push({ t: now, v: value });
  const cutoff = now - 700;
  while (armHistory.length > 2 && armHistory[0].t < cutoff) armHistory.shift();
  const want = now - lagMs;
  let prev = armHistory[0];
  for (const sample of armHistory) {
    if (sample.t >= want) {
      const span = sample.t - prev.t;
      if (span <= 0) return sample.v;
      const u = (want - prev.t) / span;
      return prev.v + (sample.v - prev.v) * u;
    }
    prev = sample;
  }
  return prev?.v ?? 0;
}

function frame(now: number) {
  resize();
  motion.update(now);

  const dt = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 0.016;
  lastFrame = now;

  current.ax = lerp(current.ax, target.ax, SMOOTH);
  current.ay = lerp(current.ay, target.ay, SMOOTH);
  current.ex = lerp(current.ex, target.ex, SMOOTH);
  current.ey = lerp(current.ey, target.ey, SMOOTH);

  const locked = now < motionLockUntil;
  const axRate = dt > 0 ? (current.ax - prevAx) / dt : 0;
  prevAx = current.ax;
  if (Math.abs(axRate) > 12) armTowardRight = axRate > 0;
  const swing = Math.max(-ARM_SWING, Math.min(ARM_SWING, axRate * ARM_VEL_GAIN));
  const late = delayedSwing(now, locked ? 0 : swing, 240);
  // The arm left behind moves more, and later. The near arm only shifts a little.
  const armGoalL = locked ? 0 : -(armTowardRight ? swing * ARM_SMALL : late);
  const armGoalR = locked ? 0 : (armTowardRight ? late : swing * ARM_SMALL);
  [arm.l, arm.vl] = stepSpring(arm.l, arm.vl, armGoalL, dt, 34, 8);
  [arm.r, arm.vr] = stepSpring(arm.r, arm.vr, armGoalR, dt, 18, 5.5);

  const looking = pointerActive || Math.abs(current.ax) + Math.abs(current.ay) > 0.01;
  const armsMoving = Math.abs(arm.l) + Math.abs(arm.r) > 0.2;
  if (!locked && (looking || armsMoving)) {
    player.setParameter(StandardParameter.AngleX, current.ax);
    player.setParameter(StandardParameter.AngleY, current.ay);
    player.setParameter(StandardParameter.AngleZ, (current.ax / ANGLE_X_MAX) * ROLL_MAX);
    player.setParameter(StandardParameter.EyeballX, current.ex);
    player.setParameter(StandardParameter.EyeballY, current.ey);
    player.setParameter(StandardParameter.ArmLeft, arm.l);
    player.setParameter(StandardParameter.ArmRight, arm.r);
    player.setParameter(StandardParameter.ElbowLeft, 0);
    player.setParameter(StandardParameter.ElbowRight, 0);
  }

  for (const [id, value] of manual) {
    player.setParameter(id, value);
  }

  requestAnimationFrame(frame);
}

async function main() {
  resize();
  window.addEventListener("resize", resize);
  setStatus("正在加载模型…");

  const res = await fetch(new URL("sandoren.iki", window.location.href));
  if (!res.ok) throw new Error(`加载失败 HTTP ${res.status}`);
  const raw = await res.json();
  model = parseIkiModel(raw);

  const loadResult = await player.load(model);
  if (loadResult.failedTextures.length) {
    console.error("部分贴图失败", loadResult.failedTextures);
  }

  motion = new IkiMotion(
    model,
    (id) => player.getParameter(id),
    (id, value) => player.setParameter(id, value),
  );

  // See-Through 画布是正方形，人物几乎顶到上下边缘，取整张画布避免裁到鞋。
  player.setView({
    x: 0,
    y: 0,
    width: model.canvas.width,
    height: model.canvas.height,
  });

  player.start();
  buildControls();
  buildSliders();
  setStatus(
    `已就绪 · 表情 ${(model.expressions ?? []).length} · 动作 ${Object.keys(model.motions ?? {}).length}`,
  );
  requestAnimationFrame(frame);
}

main().catch((err) => {
  console.error(err);
  setStatus(`错误：${err instanceof Error ? err.message : String(err)}`);
});
