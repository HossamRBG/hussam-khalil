const themeToggle = document.querySelector("#theme-toggle");
const toggleIcon = themeToggle.querySelector(".toggle-icon");
const canvas = document.querySelector("#space");
const context = canvas.getContext("2d");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let canvasWidth = 0;
let canvasHeight = 0;
let pixelRatio = 1;
let stars = [];
let animationFrame = 0;
let lastFrameTime = 0;
let resizeTimer = 0;
let starColor = getStarColor();
let pointerOffsetX = 0;
let pointerOffsetY = 0;
let pointerTargetX = 0;
let pointerTargetY = 0;

function getStarColor() {
  return getComputedStyle(document.body).getPropertyValue("--star-rgb").trim() || "225, 242, 240";
}

function getMaxDepth() {
  return Math.max(1, Math.min(canvasWidth, canvasHeight) * 2);
}

function createStar(startAtRandomDepth = false) {
  const maxDepth = getMaxDepth();

  return {
    x: Math.random() * canvasWidth - canvasWidth / 2,
    y: Math.random() * canvasHeight - canvasHeight / 2,
    z: startAtRandomDepth ? Math.max(1, Math.random() * maxDepth) : maxDepth,
    speed: Math.random() * 6 + 6,
    baseRadius: Math.random() * 2 + 1,
    lastX: null,
    lastY: null,
  };
}

function resetStar(star) {
  const replacement = createStar(false);
  Object.assign(star, replacement);
}

function drawFrame(elapsed = 0) {
  context.clearRect(0, 0, canvasWidth, canvasHeight);

  if (elapsed > 0) {
    const easing = 1 - Math.pow(0.98, elapsed / 16.67);
    pointerOffsetX += (pointerTargetX - pointerOffsetX) * easing;
    pointerOffsetY += (pointerTargetY - pointerOffsetY) * easing;
  }

  const maxDepth = getMaxDepth();

  for (const star of stars) {
    if (elapsed > 0) {
      star.z -= star.speed * (elapsed / 16.67);
    }

    if (star.z <= 0) {
      resetStar(star);
    }

    const x = canvasWidth / 2 + canvasWidth * (star.x / star.z) - pointerOffsetX;
    const y = canvasHeight / 2 + canvasHeight * (star.y / star.z) - pointerOffsetY;
    const progress = 1 - Math.min(star.z / maxDepth, 1);
    const opacity = Math.round(progress * 10) / 10;
    const radius = Math.max(0.25, progress * star.baseRadius);

    if (elapsed > 0 && star.lastX !== null && Number.isFinite(x) && Number.isFinite(y)) {
      context.lineWidth = radius;
      context.strokeStyle = `rgba(${starColor}, ${opacity / 4})`;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(star.lastX, star.lastY);
      context.stroke();
    }

    context.fillStyle = `rgba(${starColor}, ${opacity})`;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();

    star.lastX = x;
    star.lastY = y;
  }
}

function resizeCanvas() {
  canvasWidth = window.innerWidth;
  canvasHeight = window.innerHeight;
  pointerOffsetX = 0;
  pointerOffsetY = 0;
  pointerTargetX = 0;
  pointerTargetY = 0;
  pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.round(canvasWidth * pixelRatio);
  canvas.height = Math.round(canvasHeight * pixelRatio);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  const starCount = Math.min(4000, Math.max(4000, Math.round((canvasWidth * canvasHeight) / 1)));
  stars = Array.from({ length: starCount }, () => createStar(true));
  drawFrame(0);
}

function animate(time) {
  if (document.hidden || reducedMotion.matches) {
    animationFrame = 0;
    return;
  }

  const elapsed = lastFrameTime ? Math.min(time - lastFrameTime, 50) : 16.67;
  lastFrameTime = time;
  drawFrame(elapsed);
  animationFrame = window.requestAnimationFrame(animate);
}

function startAnimation() {
  if (reducedMotion.matches) {
    drawFrame(0);
    return;
  }

  if (!animationFrame && !document.hidden) {
    lastFrameTime = 0;
    animationFrame = window.requestAnimationFrame(animate);
  }
}

function stopAnimation() {
  if (animationFrame) {
    window.cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  }
  lastFrameTime = 0;
}

function followPointer(event) {
  if (event.pointerType === "touch" || reducedMotion.matches) {
    return;
  }

  pointerTargetX = (event.clientX - canvasWidth / 2) * 0.12;
  pointerTargetY = (event.clientY - canvasHeight / 2) * 0.12;
}

function resetPointer() {
  pointerTargetX = 0;
  pointerTargetY = 0;
}

themeToggle.addEventListener("click", () => {
  const isDark = document.body.classList.toggle("dark");
  const nextMode = isDark ? "light" : "dark";

  themeToggle.setAttribute("aria-pressed", String(isDark));
  themeToggle.setAttribute("aria-label", `Switch to ${nextMode} mode`);
  themeToggle.setAttribute("title", `Switch to ${nextMode} mode`);
  toggleIcon.textContent = isDark ? "☀" : "☾";

  starColor = getStarColor();
  if (reducedMotion.matches) {
    drawFrame(0);
  }
});

window.addEventListener("resize", () => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(resizeCanvas, 120);
}, { passive: true });

window.addEventListener("pointermove", followPointer, { passive: true });
window.addEventListener("blur", resetPointer);
window.addEventListener("pointerout", (event) => {
  if (!event.relatedTarget) {
    resetPointer();
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopAnimation();
  } else {
    startAnimation();
  }
});

reducedMotion.addEventListener?.("change", () => {
  stopAnimation();
  drawFrame(0);
  startAnimation();
});

resizeCanvas();
startAnimation();
