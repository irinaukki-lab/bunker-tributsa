/* Бункер Трибуца — интерактив лендинга (без зависимостей) */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isMobile = window.matchMedia("(max-width: 760px)").matches;

  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  // прогресс p в отрезке [a, b] → 0..1
  function seg(p, a, b) { return clamp((p - a) / (b - a), 0, 1); }
  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  // прогресс прокрутки секции со sticky-сценой: 0 — сцена прилипла, 1 — отпустила
  function scrollProgress(el) {
    var r = el.getBoundingClientRect();
    var range = r.height - window.innerHeight;
    return range > 0 ? clamp(-r.top / range, 0, 1) : 0;
  }

  /* ---------- Появление блоков ---------- */
  var revealTargets = document.querySelectorAll(".reveal, .cable-divider");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    revealTargets.forEach(function (el) { io.observe(el); });
  } else {
    revealTargets.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- Строки эпиграфа в блоке 9: проявляются по одной при прокрутке ---------- */
  document.documentElement.classList.add("js");
  var epiLines = document.querySelectorAll(".epigraph--memory .line, .epigraph--memory figcaption");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var queue = 0;
    var lio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        lio.unobserve(e.target);
        // строки, попавшие в кадр одновременно, всё равно появляются друг за другом
        setTimeout(function () { e.target.classList.add("is-visible"); queue = Math.max(0, queue - 1); }, queue++ * 260);
      });
    }, { rootMargin: "0px 0px -18% 0px" });
    epiLines.forEach(function (el) { lio.observe(el); });
  } else {
    epiLines.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- Телеграфная лента: печать текста ---------- */
  var tape = document.querySelector("[data-typewriter]");
  if (tape && !reduceMotion && "IntersectionObserver" in window) {
    var full = tape.textContent.trim();
    tape.style.minHeight = tape.offsetHeight + "px"; // без скачков вёрстки
    tape.textContent = "";
    var tio = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      tio.disconnect();
      tape.classList.add("is-typing");
      var i = 0;
      (function type() {
        i = Math.min(full.length, i + 3);
        tape.textContent = full.slice(0, i);
        if (i < full.length) setTimeout(type, 22);
        else tape.classList.remove("is-typing");
      })();
    }, { threshold: 0.4 });
    tio.observe(tape);
  }

  /* ---------- Частицы ---------- */
  var PRESETS = {
    lights:  { count: 46, color: "255,236,200", size: [0.6, 2.4], vy: [-0.12, -0.02], vx: 0.06, glow: 8 },
    bubbles: { count: 90, color: "220,225,225", size: [0.5, 2.6], vy: [-0.6, -0.15], vx: 0.12, glow: 0, ring: true },
    sparks:  { count: 70, color: "232,168,76", size: [0.6, 2.2], vy: [-0.7, -0.2], vx: 0.35, glow: 10, emitter: true },
    dust:    { count: 55, color: "230,222,205", size: [0.4, 1.6], vy: [-0.05, 0.08], vx: 0.08, glow: 0 }
  };

  function Particles(canvas, preset) {
    this.c = canvas;
    this.ctx = canvas.getContext("2d");
    this.o = preset;
    this.n = Math.round(preset.count * (isMobile ? 0.4 : 1));
    this.list = [];
    this.intensity = 1;   // управляется скроллом
    this.speed = 1;
    this.emit = null;     // {x, y} в px — источник искр
    this.visible = false;
    this.resize();
    for (var i = 0; i < this.n; i++) this.list.push(this.spawn(true));
  }
  Particles.prototype.resize = function () {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = this.c.clientWidth; this.h = this.c.clientHeight;
    this.c.width = this.w * dpr; this.c.height = this.h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  Particles.prototype.spawn = function (initial) {
    var o = this.o, p = {};
    p.r = lerp(o.size[0], o.size[1], Math.random());
    p.vy = lerp(o.vy[0], o.vy[1], Math.random());
    p.vx = (Math.random() - 0.5) * o.vx * 2;
    p.a = 0.3 + Math.random() * 0.4;         // мерцание 0.3–0.7
    p.ph = Math.random() * Math.PI * 2;
    p.life = 1;
    if (o.emitter && this.emit) {
      p.x = this.emit.x + (Math.random() - 0.5) * 30;
      p.y = this.emit.y + (Math.random() - 0.5) * 20;
      p.life = 0.6 + Math.random() * 0.8;
      p.vx *= 2;
    } else {
      p.x = Math.random() * this.w;
      p.y = initial ? Math.random() * this.h : (p.vy < 0 ? this.h + 5 : -5);
    }
    return p;
  };
  Particles.prototype.step = function (t) {
    var ctx = this.ctx, o = this.o;
    ctx.clearRect(0, 0, this.w, this.h);
    if (this.intensity <= 0.01) return;
    ctx.shadowColor = "rgba(" + o.color + ",0.8)";
    for (var i = 0; i < this.list.length; i++) {
      var p = this.list[i];
      p.x += p.vx * this.speed + Math.sin(t / 1600 + p.ph) * 0.08;
      p.y += p.vy * this.speed;
      if (o.emitter && this.emit) p.life -= 0.004;
      if (p.y < -10 || p.y > this.h + 10 || p.x < -10 || p.x > this.w + 10 || p.life <= 0) {
        this.list[i] = this.spawn(false);
        continue;
      }
      var a = p.a * (0.6 + 0.4 * Math.sin(t / 700 + p.ph)) * this.intensity * Math.min(1, p.life);
      ctx.shadowBlur = o.glow;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      if (o.ring) {
        ctx.strokeStyle = "rgba(" + o.color + "," + a + ")";
        ctx.lineWidth = 0.7;
        ctx.stroke();
      } else {
        ctx.fillStyle = "rgba(" + o.color + "," + a + ")";
        ctx.fill();
      }
    }
  };

  var systems = [];
  if (!reduceMotion) {
    document.querySelectorAll("canvas[data-particles]").forEach(function (c) {
      var preset = PRESETS[c.getAttribute("data-particles")];
      if (!preset) return;
      var s = new Particles(c, preset);
      s.kind = c.getAttribute("data-particles");
      systems.push(s);
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (es) { s.visible = es[0].isIntersecting; }).observe(c.parentElement);
      } else {
        s.visible = true;
      }
    });
  }
  function byKind(k) { for (var i = 0; i < systems.length; i++) if (systems[i].kind === k) return systems[i]; return null; }

  /* ---------- Сцена «Спуск» ---------- */
  var descent = document.querySelector(".descent");
  var D = descent && {
    surface: descent.querySelector(".descent__frame--surface"),
    deep: descent.querySelector(".descent__frame--deep"),
    sky: descent.querySelector(".layer--sky"),
    sea: descent.querySelector(".layer--sea"),
    mo: descent.querySelector(".layer--mo"),
    water: descent.querySelector(".layer--water"),
    lodka: descent.querySelector(".layer--lodka"),
    mina1: descent.querySelector(".layer--mina1"),
    mina2: descent.querySelector(".layer--mina2"),
    seabed: descent.querySelector(".layer--seabed"),
    glow: descent.querySelector(".descent__surface-glow"),
    fog: descent.querySelector(".fog--descent")
  };

  function tf(el, x, y, s) {
    el.style.transform = "translate3d(" + (x || 0) + "%," + (y || 0) + "%,0)" + (s ? " scale(" + s + ")" : "");
  }

  function updateDescent(t) {
    var p = scrollProgress(descent);
    // 0–0.5: поверхность (небо, море, тральщик) уходит вверх, подводный мир поднимается
    var dive = ease(seg(p, 0.12, 0.5));
    tf(D.surface, 0, -85 * dive);
    D.surface.style.opacity = (1 - seg(dive, 0.75, 1)).toFixed(3);
    tf(D.deep, 0, 100 * (1 - dive));
    D.deep.style.setProperty("--seam", (30 * (1 - seg(dive, 0.8, 1))).toFixed(1) + "%");

    // слои поверхности: небо движется медленнее, море — быстрее
    var sp = seg(p, 0, 0.5);
    tf(D.sky, 0, 14 * sp, 1.08);
    tf(D.sea, 0, -6 * sp, 1.04);
    var bob = reduceMotion ? 0 : Math.sin(t / 1400) * 0.4;
    tf(D.mo, lerp(10, -12, sp), bob);

    // подводный мир: мины, лодка, дно
    var deep = seg(p, 0.35, 1);
    tf(D.water, 0, -10 * deep, 1.06);
    tf(D.mina2, lerp(4, -2, deep), lerp(30, -25, deep));
    tf(D.mina1, 0, lerp(55, -45, deep) + bob * 2);
    tf(D.lodka, lerp(70, -75, ease(seg(p, 0.42, 0.85))), lerp(30, 18, deep));
    tf(D.seabed, 0, lerp(35, 0, ease(seg(p, 0.5, 1))));

    // туман гуще с глубиной; свет с поверхности при погружении
    D.fog.style.opacity = (0.15 + 0.75 * seg(p, 0.3, 1)).toFixed(3);
    D.glow.style.opacity = (Math.sin(Math.PI * seg(p, 0.3, 0.75)) * 0.7).toFixed(3);

    var bubbles = byKind("bubbles");
    if (bubbles) {
      bubbles.intensity = seg(p, 0.3, 0.5);
      bubbles.speed = 1 + Math.abs(lastDelta) * 0.02;
    }
  }

  /* ---------- Маяк ---------- */
  var lh = document.querySelector(".lighthouse");
  var L = lh && {
    stage: lh.querySelector(".lighthouse__stage"),
    color: lh.querySelector(".lighthouse__color"),
    frame: lh.querySelector(".lighthouse__frame")
  };
  function updateLighthouse() {
    var p = scrollProgress(lh);
    var c = ease(seg(p, 0.15, 0.75));
    L.color.style.opacity = c.toFixed(3);
    var g = seg(p, 0.05, 0.6);
    L.stage.style.setProperty("--glow", g.toFixed(3));
    L.stage.style.setProperty("--glow-scale", (0.3 + 0.7 * g).toFixed(3));
    var sparks = byKind("sparks");
    if (sparks) {
      var fr = L.frame.getBoundingClientRect(), sr = L.stage.getBoundingClientRect();
      sparks.emit = { x: fr.left - sr.left + fr.width * 0.638, y: fr.top - sr.top + fr.height * 0.37 };
      sparks.intensity = g;
    }
  }

  /* ---------- Обрыв кабеля: связь восстанавливается по мере чтения блока 9 ---------- */
  var cableBreak = document.querySelector(".cable-break");
  function updateCableBreak() {
    var r = cableBreak.getBoundingClientRect(), vh = window.innerHeight;
    // 0 — обрыв у нижнего края экрана, 1 — поднялся на треть экрана выше верхнего края
    var k = reduceMotion ? 1 : ease(seg((vh - r.top) / (vh * 1.1), 0.15, 1));
    cableBreak.style.setProperty("--repair", k.toFixed(3));
    cableBreak.classList.toggle("is-repaired", k > 0.98);
  }

  /* ---------- Навигация и индикатор глубины ---------- */
  var nav = document.querySelector(".nav");
  var sappers = document.getElementById("sappers");
  var root = document.documentElement;
  var lastY = window.scrollY, lastDelta = 0;

  function onFrame(t) {
    var y = window.scrollY;
    lastDelta = y - lastY; lastY = y;
    var max = root.scrollHeight - window.innerHeight;
    root.style.setProperty("--depth", max > 0 ? (y / max).toFixed(4) : 0);
    nav.classList.toggle("is-scrolled", y > 40);
    // с блока «Сапёры памяти» кабельный фон уходит
    if (sappers) document.body.classList.toggle("is-memory", sappers.getBoundingClientRect().top < window.innerHeight * 0.6);

    if (descent && descent.getBoundingClientRect().bottom > 0 && descent.getBoundingClientRect().top < window.innerHeight) updateDescent(t);
    if (cableBreak) updateCableBreak();
    if (lh && lh.getBoundingClientRect().bottom > 0 && lh.getBoundingClientRect().top < window.innerHeight) updateLighthouse();

    for (var i = 0; i < systems.length; i++) if (systems[i].visible) systems[i].step(t);
    requestAnimationFrame(onFrame);
  }
  requestAnimationFrame(onFrame);

  window.addEventListener("resize", function () {
    systems.forEach(function (s) { s.resize(); });
  });

  /* ---------- Галерея бункера: подсказка по тапу на сенсорных экранах ---------- */
  document.querySelectorAll(".gallery__item").forEach(function (item) {
    item.addEventListener("click", function () { item.classList.toggle("is-open"); });
  });

  /* ---------- Модальное окно героя ---------- */
  var modal = document.getElementById("person-modal");
  if (modal) {
    var mPhoto = modal.querySelector(".modal__photo");
    var mRank = modal.querySelector(".modal__rank");
    var mName = modal.querySelector(".modal__name");
    var mBio = modal.querySelector(".modal__bio");
    var lastTrigger = null;

    document.querySelectorAll(".person__more").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var card = btn.closest(".person");
        var img = card.querySelector(".person__photo");
        mPhoto.src = img.src; mPhoto.alt = img.alt;
        mRank.textContent = card.querySelector(".person__rank").textContent;
        mName.textContent = card.querySelector(".person__name").textContent;
        mBio.innerHTML = card.querySelector(".person__bio").innerHTML;
        lastTrigger = btn;
        if (typeof modal.showModal === "function") modal.showModal();
        else modal.setAttribute("open", "");
      });
    });

    function close() {
      if (typeof modal.close === "function") modal.close(); else modal.removeAttribute("open");
    }
    modal.querySelector(".modal__close").addEventListener("click", close);
    modal.addEventListener("click", function (e) { if (e.target === modal) close(); }); // клик по подложке
    modal.addEventListener("close", function () { if (lastTrigger) lastTrigger.focus(); });
  }
})();
