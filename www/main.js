
    import { createNavigation } from "./modules/navigation.js";
    import { loadState, saveState } from "./modules/storage.js";
    import { createLevels, genChains } from "./modules/levels.js";
    import {
      dist,
      norm,
      pathLength,
      roundedPath,
      sampleTrack,
    } from "./modules/geometry.js";
    import {
      SHAPE_N,
      shCircle,
      shEllipse,
      shPoly,
      shRect,
      shStarPts,
      shSub,
      shToMap,
      shGrid,
      shUnion,
    } from "./modules/shape-geometry.js";
    import { S } from "./modules/state.js";
    import { BASE_SHAPE_DEFS } from "./modules/shapes.js";

    (function () {
        "use strict";
        /* dirs: 0 up, 1 right, 2 down, 3 left */
        const DX = [0, 1, 0, -1],
          DY = [-1, 0, 1, 0];
        const INK = "#1c2540";

        function rng(seed) {
          let a = seed >>> 0;
          return function () {
            a += 0x6d2b79f5;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
          };
        }
        function shuffled(arr, rand) {
          const a = arr.slice();
          for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(rand() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
          }
          return a;
        }
        /* ---------- shapes: built from geometric primitives so each one reads as
   the real object (star looks like a star, heart like a heart, etc.) ---------- */
        const SHAPE_DEFS = [
          ...BASE_SHAPE_DEFS,
          
          
        ];
        const SHAPES = SHAPE_DEFS.map((d) => ({
          name: d.name,
          icon: d.icon,
          color: d.color,
          map: shToMap(d.build()),
        }));
        function shapePixels(s) {
          const out = [];
          s.map.forEach((row, y) =>
            [...row].forEach((c, x) => {
              if (c === "#") out.push({ x, y });
            }),
          );
          return out;
        }

        const LEVELS = createLevels();

        /* ---------- level generator — ported from Unity LevelGenerator.cs ----------
   DFS-grown snake pieces fully tile the board; solvability is verified by
   actually simulating removal (fixed-point: repeatedly remove any piece whose
   exit path is clear until none remain, or none left removable). */
        

        const $ = (id) => document.getElementById(id);
        const svg = $("maze-svg"),
          boardCard = $("board-card"),
          app = $("app");
        const screens = {
          menu: $("screen-menu"),
          difficulty: $("screen-difficulty"),
          levels: $("screen-levels"),
          game: $("screen-game"),
        };
        const { show } = createNavigation(screens, $("top-bar"));

        function load() {
          Object.assign(S, loadState());
        }
        function save() {
          saveState({
            solved: S.solved,
            coins: S.coins,
            hints: S.hints,
            sound: S.sound,
            streak: S.streak,
            lastDay: S.lastDay,
            week: S.week,
            bestCombo: S.bestCombo,
          });
        }

        let ac = null;
        function beep(f, d, v) {
          if (!S.sound) return;
          try {
            ac = ac || new (window.AudioContext || window.webkitAudioContext)();
            const o = ac.createOscillator(),
              g = ac.createGain();
            o.type = "triangle";
            o.frequency.value = f;
            g.gain.setValueAtTime(v || 0.05, ac.currentTime);
            g.gain.exponentialRampToValueAtTime(
              0.0001,
              ac.currentTime + (d || 0.09),
            );
            o.connect(g);
            g.connect(ac.destination);
            o.start();
            o.stop(ac.currentTime + (d || 0.09));
          } catch (e) {}
        }
        function buzz(p) {
          if (navigator.vibrate)
            try {
              navigator.vibrate(p);
            } catch (e) {}
        }
        /* ---------- streak ---------- */
        function today() {
          return new Date().toISOString().slice(0, 10);
        }
        function markPlayed() {
          const t = today();
          if (S.lastDay === t) return;
          const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
          S.streak = S.lastDay === y ? S.streak + 1 : 1;
          S.lastDay = t;
          S.week = (S.week || []).filter(
            (d) => Date.now() - new Date(d).getTime() < 7 * 864e5,
          );
          S.week.push(t);
          if (S.week.length === 3) {
            S.coins += 100;
            toast("Weekly chest: +100 coins");
          }
          save();
          renderStreak();
        }
        function renderStreak() {
          $("streak-n").textContent =
            S.streak + (S.streak === 1 ? " day" : " days");
          const r = $("week-row");
          r.innerHTML = "";
          for (let i = 0; i < 7; i++) {
            const d = document.createElement("div");
            d.className = "day" + (i < S.week.length ? " on" : "");
            r.appendChild(d);
          }
          $("streak-note").textContent =
            S.week.length >= 3
              ? "This week's chest is already unlocked."
              : `Play 3 days this week (${S.week.length}/3) to earn 100 coins.`;
        }

        /* ---------- level ---------- */
        function def() {
          if (S.daily) {
            const d = today();
            let h = 0;
            for (let i = 0; i < d.length; i++)
              h = d.charCodeAt(i) + ((h << 5) - h);
            h = Math.abs(h);
            return {
              id: "Daily",
              w: 13,
              h: 13,
              lenMin: 2,
              lenMax: 7,
              seed: h,
              shape: h % SHAPES.length,
            };
          }
          return LEVELS[S.idx];
        }
        function loadLevel(i, daily) {
          S.idx = i;
          S.daily = !!daily;
          const L = def();
          S.W = L.w;
          S.H = L.h;
          S.chains = genChains(L.w, L.h, L.lenMin, L.lenMax, L.seed);
          if (S.chains.length > 3) {
            const bi = Math.floor(rng(L.seed + 17)() * S.chains.length);
            S.chains[bi].bonus = true;
          }
          S.totalLen = S.chains.reduce((s, c) => s + c.cells.length, 0);
          S.removed = [];
          S.lives = 3;
          S.combo = 0;
          S.penalized = new Set();
          S.shape = SHAPES[L.shape];
          S.pixels = shapePixels(S.shape);
          S.filled = 0;
          $("level-title").textContent = daily
            ? "Daily shape"
            : "Level " + L.id;
          buildShape();
          build();
          updateHud();
          show("game");
          resetIdle();
        }

        /* ---------- shape panel ---------- */
        function buildShape() {
          const g = $("shape-grid"),
            w = S.shape.map[0].length,
            h = S.shape.map.length;
          const cs = Math.min(11, Math.floor(120 / h));
          g.style.gridTemplateColumns = `repeat(${w},${cs}px)`;
          g.style.setProperty("--shape", S.shape.color);
          g.innerHTML = "";
          S.pxEls = [];
          const solvedBefore = !S.daily && S.solved[String(S.idx)];
          S.shape.map.forEach((row, y) =>
            [...row].forEach((c, x) => {
              const d = document.createElement("div");
              d.className = "px";
              d.style.cssText = `width:${cs}px;height:${cs}px`;
              if (c !== "#") d.style.background = "transparent";
              g.appendChild(d);
              if (c === "#") S.pxEls.push(d);
            }),
          );
          $("shape-name").textContent = solvedBefore
            ? S.shape.name
            : "Mystery shape";
          $("shape-sub").textContent = solvedBefore
            ? "Solve it again to earn more stars"
            : "Release snake-arrows to fill the shape";
          $("shape-bar").style.width = "0%";
        }
        function fillPixels(n, fromPoint) {
          const total = S.pxEls.length;
          for (let k = 0; k < n && S.filled < total; k++) {
            const target = S.pxEls[S.filled++];
            fly(fromPoint, target, k * 70);
          }
          $("shape-bar").style.width =
            Math.round((S.filled / total) * 100) + "%";
          if (
            S.filled >= total * 0.55 &&
            $("shape-name").textContent === "Mystery shape"
          ) {
            $("shape-name").textContent = S.shape.name;
          }
        }
        function fly(fromPoint, target, delay) {
          const a = app.getBoundingClientRect(),
            t = target.getBoundingClientRect();
          const s = document.createElement("div");
          s.className = "spark";
          s.style.cssText = `position:absolute;width:10px;height:10px;border-radius:50%;background:${S.shape.color};z-index:35;pointer-events:none;box-shadow:0 0 10px rgba(0,0,0,.18);transition:transform .5s cubic-bezier(.3,0,.2,1),opacity .5s`;
          s.style.left = fromPoint.left - a.left - 5 + "px";
          s.style.top = fromPoint.top - a.top - 5 + "px";
          app.appendChild(s);
          const dx =
            t.left - a.left + t.width / 2 - 5 - (fromPoint.left - a.left - 5);
          const dy =
            t.top - a.top + t.height / 2 - 5 - (fromPoint.top - a.top - 5);
          setTimeout(() => {
            s.style.transform = `translate(${dx}px,${dy}px) scale(.6)`;
            s.style.opacity = ".85";
          }, 20 + delay);
          setTimeout(() => {
            target.classList.add("on");
            s.remove();
            beep(700, 0.05, 0.03);
          }, 540 + delay);
        }

        /* ---------- board ---------- */
        const CELL_BASE = 28,
          PAD = 12;
        function cellCenter(x, y) {
          return {
            x: x * CELL_BASE + PAD + CELL_BASE / 2,
            y: y * CELL_BASE + PAD + CELL_BASE / 2,
          };
        }
        function screenPointForCell(x, y) {
          const rect = svg.getBoundingClientRect();
          const vw = S.W * CELL_BASE + PAD * 2,
            vh = S.H * CELL_BASE + PAD * 2;
          const sx = rect.width / vw,
            sy = rect.height / vh;
          const c = cellCenter(x, y);
          return { left: rect.left + c.x * sx, top: rect.top + c.y * sy };
        }
        function rebuildCellMap() {
          S.cellMap = new Map();
          S.chains.forEach((ch) => {
            if (!ch.out)
              ch.cells.forEach((c) => S.cellMap.set(c.x + "," + c.y, ch));
          });
        }
        function findBlocker(chain) {
          const d = chain.dir,
            head = chain.cells[chain.cells.length - 1];
          let steps = 0,
            x = head.x + DX[d],
            y = head.y + DY[d];
          while (x >= 0 && y >= 0 && x < S.W && y < S.H) {
            steps++;
            const hit = S.cellMap.get(x + "," + y);
            if (hit && hit !== chain) return { chain: hit, steps };
            x += DX[d];
            y += DY[d];
          }
          return null;
        }
        function freeList() {
          return S.chains.filter((c) => !c.out && !findBlocker(c));
        }

        function chainColor(ch) {
          return ch.bonus ? "#e5a51a" : "#1c2b52";
        }

        function addDots(cells) {
          cells.forEach((c) => {
            const p = cellCenter(c.x, c.y);
            const dot = document.createElementNS(
              "http://www.w3.org/2000/svg",
              "circle",
            );
            dot.setAttribute("cx", p.x);
            dot.setAttribute("cy", p.y);
            dot.setAttribute("r", CELL_BASE * 0.045);
            dot.setAttribute("fill", "#cdc4b0");
            S.dotsLayer && S.dotsLayer.appendChild(dot);
          });
        }

        /* Visual points for a chain's own path. A single-cell chain has no "last two
   points" to derive a direction from, so we give it a short real segment
   (using its stored exit direction) rather than a degenerate 1-point path —
   this keeps the "direction always comes from the last two path points" rule
   truthful even for length-1 pieces, and gives them a visible slide animation. */
        function chainVisualPoints(ch) {
          const pts = ch.cells.map((c) => cellCenter(c.x, c.y));
          if (pts.length === 1) {
            const dv = { x: DX[ch.dir], y: DY[ch.dir] };
            return [
              {
                x: pts[0].x - dv.x * CELL_BASE * 0.5,
                y: pts[0].y - dv.y * CELL_BASE * 0.5,
              },
              pts[0],
            ];
          }
          return pts;
        }

        const STROKE_W = CELL_BASE * 0.16;
        function chevronD(center, dirV, size) {
          const px = -dirV.y,
            py = dirV.x;
          const tip = {
            x: center.x + dirV.x * size * 0.55,
            y: center.y + dirV.y * size * 0.55,
          };
          const backC = {
            x: center.x - dirV.x * size * 0.45,
            y: center.y - dirV.y * size * 0.45,
          };
          const l = {
            x: backC.x + px * size * 0.5,
            y: backC.y + py * size * 0.5,
          };
          const r = {
            x: backC.x - px * size * 0.5,
            y: backC.y - py * size * 0.5,
          };
          return `M${l.x} ${l.y} L${tip.x} ${tip.y} L${r.x} ${r.y}`;
        }
        /* Single continuous polyline per arrow: the body path IS the maze line, and the
   arrowhead is one small open chevron attached at the very end, with its
   rotation always computed from the final two points of that same path —
   never a separately-stored direction. */
        function renderChainPoints(ch, pts, color) {
          if (pts.length < 2)
            pts = [pts[0], { x: pts[0].x + 0.01, y: pts[0].y + 0.01 }];
          const prev = pts[pts.length - 2],
            last = pts[pts.length - 1];
          const dirV = norm(last.x - prev.x, last.y - prev.y);
          const shortHead = {
            x: last.x - dirV.x * CELL_BASE * 0.24,
            y: last.y - dirV.y * CELL_BASE * 0.24,
          };
          const bodyPts = [...pts.slice(0, -1), shortHead];
          const d = roundedPath(bodyPts, CELL_BASE * 0.26);
          ch.bodyEl.setAttribute("d", d);
          ch.bodyEl.setAttribute("stroke", color);
          ch.bodyEl.setAttribute("stroke-width", STROKE_W);
          ch.headEl.setAttribute(
            "d",
            chevronD(shortHead, dirV, CELL_BASE * 0.48),
          );
          ch.headEl.setAttribute("stroke", color);
          ch.headEl.setAttribute("stroke-width", STROKE_W * 1.15);
        }

        function build() {
          rebuildCellMap();
          const vw = S.W * CELL_BASE + PAD * 2,
            vh = S.H * CELL_BASE + PAD * 2;
          svg.setAttribute("viewBox", `0 0 ${vw} ${vh}`);
          svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
          svg.innerHTML = "";
          const dots = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "g",
          );
          dots.setAttribute("class", "dots");
          svg.appendChild(dots);
          S.dotsLayer = dots;
          for (let y = 0; y < S.H; y++)
            for (let x = 0; x < S.W; x++) {
              if (!S.cellMap.has(x + "," + y)) addDots([{ x, y }]);
            }
          S.chains.forEach((ch, idx) => {
            if (ch.out) return;
            const g = document.createElementNS(
              "http://www.w3.org/2000/svg",
              "g",
            );
            g.setAttribute("class", "chain" + (ch.bonus ? " bonus" : ""));
            g.style.setProperty("--d", idx * 14 + "ms");
            const body = document.createElementNS(
              "http://www.w3.org/2000/svg",
              "path",
            );
            body.setAttribute("class", "body");
            const head = document.createElementNS(
              "http://www.w3.org/2000/svg",
              "path",
            );
            head.setAttribute("class", "head");
            head.setAttribute("fill", "none");
            head.setAttribute("stroke-linecap", "round");
            head.setAttribute("stroke-linejoin", "round");
            g.appendChild(body);
            g.appendChild(head);
            svg.appendChild(g);
            ch.el = g;
            ch.bodyEl = body;
            ch.headEl = head;
            ch._raf = null;
            renderChainPoints(ch, chainVisualPoints(ch), chainColor(ch));
            g.addEventListener("click", () => tap(ch));
          });
          markFree();
        }
        function markFree() {
          $("m-free").textContent = freeList().length;
          $("pill-left").textContent =
            S.chains.filter((c) => !c.out).length + " left";
        }

        /* ---------- animations (ported from LineArrow.cs Move/PlayBlockedMove) ---------- */
        function animateRelease(ch) {
          const trackPts = chainVisualPoints(ch);
          const dirV = { x: DX[ch.dir], y: DY[ch.dir] };
          const arrowLength = Math.max(0.001, pathLength(trackPts));
          const escapeDistance = (S.W + S.H + 6) * CELL_BASE;
          const track = [
            ...trackPts,
            {
              x: trackPts[trackPts.length - 1].x + dirV.x * escapeDistance,
              y: trackPts[trackPts.length - 1].y + dirV.y * escapeDistance,
            },
          ];
          const color = chainColor(ch);
          const speed = CELL_BASE * 11;
          const endDist = arrowLength + escapeDistance;
          let headDist = arrowLength,
            last = performance.now();
          function frame(now) {
            const dt = Math.min(48, now - last) / 1000;
            last = now;
            headDist = Math.min(endDist, headDist + speed * dt);
            const pts = sampleTrack(track, headDist, arrowLength);
            if (pts.length >= 2 && ch.bodyEl) renderChainPoints(ch, pts, color);
            const tail = pts[0];
            const tcx = (tail.x - PAD) / CELL_BASE,
              tcy = (tail.y - PAD) / CELL_BASE;
            const offBoard =
              tcx < -1.4 || tcx > S.W + 1.4 || tcy < -1.4 || tcy > S.H + 1.4;
            if (offBoard || headDist >= endDist) {
              ch._raf = null;
              if (ch.el) ch.el.remove();
              return;
            }
            ch._raf = requestAnimationFrame(frame);
          }
          ch._raf = requestAnimationFrame(frame);
        }
        function animateBump(ch, distanceToObstacle) {
          const trackPts = chainVisualPoints(ch);
          const dirV = { x: DX[ch.dir], y: DY[ch.dir] };
          const arrowLength = Math.max(0.001, pathLength(trackPts));
          const impact = {
            x: trackPts[trackPts.length - 1].x + dirV.x * distanceToObstacle,
            y: trackPts[trackPts.length - 1].y + dirV.y * distanceToObstacle,
          };
          const track = [...trackPts, impact];
          const startDist = arrowLength,
            endDist = arrowLength + distanceToObstacle;
          const forwardDur = Math.max(
            60,
            (distanceToObstacle / (CELL_BASE * 15)) * 1000,
          );
          const normalColor = chainColor(ch);
          let phase = "forward",
            t0 = performance.now();
          function frame(now) {
            if (!ch.bodyEl) {
              ch._raf = null;
              return;
            }
            if (phase === "forward") {
              const p = Math.min(1, (now - t0) / forwardDur);
              const hd = startDist + (endDist - startDist) * p;
              const pts = sampleTrack(track, hd, arrowLength);
              if (pts.length >= 2) renderChainPoints(ch, pts, "#d1495b");
              if (p >= 1) {
                phase = "pause";
                t0 = now;
              }
              ch._raf = requestAnimationFrame(frame);
            } else if (phase === "pause") {
              if (now - t0 >= 55) ((phase = "back"), (t0 = now));
              ch._raf = requestAnimationFrame(frame);
            } else {
              const p = Math.min(1, (now - t0) / 150);
              const ep = 1 - Math.pow(1 - p, 2);
              const hd = endDist - (endDist - startDist) * ep;
              const pts = sampleTrack(track, hd, arrowLength);
              renderChainPoints(ch, pts, p >= 1 ? normalColor : "#d1495b");
              if (p >= 1) {
                ch._raf = null;
                return;
              }
              ch._raf = requestAnimationFrame(frame);
            }
          }
          ch._raf = requestAnimationFrame(frame);
        }
        function blinkChain(ch) {
          if (!ch.bodyEl) return;
          const normal = chainColor(ch);
          const pts = chainVisualPoints(ch);
          let n = 0;
          const iv = setInterval(() => {
            if (!ch.bodyEl) {
              clearInterval(iv);
              return;
            }
            const c = n % 2 === 0 ? "#d1495b" : normal;
            renderChainPoints(ch, pts, c);
            n++;
            if (n >= 4) {
              clearInterval(iv);
              if (ch.bodyEl) renderChainPoints(ch, pts, normal);
            }
          }, 130);
        }

        let idleT = null;
        function resetIdle() {
          clearTimeout(idleT);
          document
            .querySelectorAll?.(".chain.idle-pulse")
            .forEach?.((el) => el.classList.remove("idle-pulse"));
          idleT = setTimeout(() => {
            const free = freeList();
            if (!free.length) return;
            const pick = free[Math.floor(Math.random() * free.length)];
            pick.el && pick.el.classList.add("idle-pulse");
          }, 7500);
        }
        function tap(ch) {
          resetIdle();
          if (ch.out || ch._raf) return;
          const blockInfo = findBlocker(ch);
          if (blockInfo) {
            boardCard.classList.remove("shake");
            void boardCard.offsetWidth;
            boardCard.classList.add("shake");
            const distObstacle = Math.max(
              CELL_BASE * 0.15,
              blockInfo.steps * CELL_BASE - CELL_BASE * 0.5,
            );
            animateBump(ch, distObstacle);
            blinkChain(blockInfo.chain);
            beep(150, 0.1, 0.05);
            buzz(20);
            if (!S.penalized.has(ch.id)) {
              S.penalized.add(ch.id);
              S.lives--;
              S.combo = 0;
              clearTimeout(S.comboT);
              updateHud();
              if (S.lives <= 0) fail();
            }
            return;
          }
          ch.out = true;
          rebuildCellMap();
          addDots(ch.cells);
          const headCell = ch.cells[ch.cells.length - 1];
          const fromPoint = screenPointForCell(headCell.x, headCell.y);
          const left = S.pxEls.length - S.filled;
          const remaining = S.chains.filter((x) => !x.out).length;
          const baseShare = Math.max(
            1,
            Math.round((S.pxEls.length * ch.cells.length) / S.totalLen),
          );
          const share =
            remaining === 0 ? left : ch.bonus ? baseShare * 3 : baseShare;
          const n = Math.min(share, left);
          S.removed.push({ chain: ch, n });
          fillPixels(n, fromPoint);
          animateRelease(ch);

          S.combo++;
          if (S.combo > S.bestCombo) {
            S.bestCombo = S.combo;
            save();
          }
          const coinGain =
            (1 + (S.combo >= 3 ? S.combo : 0)) * (ch.bonus ? 3 : 1);
          S.coins += coinGain;
          beep(ch.bonus ? 820 : 400 + Math.min(S.combo, 10) * 45, 0.09, 0.05);
          buzz(ch.bonus ? [10, 20, 10, 20] : 12);
          if (ch.bonus)
            flash("Golden snake! +" + coinGain + " coins, shape jump!");
          else if (S.combo >= 3)
            flash("Combo x" + S.combo + "  +" + S.combo + " coins");
          clearTimeout(S.comboT);
          S.comboT = setTimeout(() => {
            S.combo = 0;
            updateHud();
          }, 3500);
          markFree();
          updateHud();
          if (S.chains.every((x) => x.out)) setTimeout(win, 700);
        }
        function flash(t) {
          const c = $("combo-text");
          c.textContent = t;
          c.classList.add("show");
          setTimeout(() => c.classList.remove("show"), 1100);
        }
        function updateHud() {
          $("m-combo").textContent = "x" + S.combo;
          $("m-lives").textContent = "♥".repeat(Math.max(0, S.lives)) || "–";
          $("m-hints").textContent = S.hints;
          $("hint-count").textContent = S.hints;
          $("pill-coins").textContent = "🪙 " + S.coins;
          $("pill-left").textContent =
            S.chains.filter((a) => !a.out).length + " left";
        }

        /* ---------- end ---------- */
        function miniShape() {
          const box = $("modal-shape"),
            w = S.shape.map[0].length;
          box.style.gridTemplateColumns = `repeat(${w},7px)`;
          box.innerHTML = "";
          S.shape.map.forEach((row) =>
            [...row].forEach((c) => {
              const d = document.createElement("div");
              d.style.cssText = `width:7px;height:7px;border-radius:2px;background:${c === "#" ? S.shape.color : "transparent"}`;
              box.appendChild(d);
            }),
          );
        }
        function win() {
          const stars = S.lives === 3 ? 3 : S.lives === 2 ? 2 : 1;
          const key = S.daily ? "daily" : String(S.idx);
          if (!S.daily && (S.solved[key] || 0) < stars) S.solved[key] = stars;
          S.coins += stars * 10;
          markPlayed();
          save();
          renderLevels();
          updateMenu();
          updateHud();
          beep(660, 0.12, 0.06);
          setTimeout(() => beep(880, 0.18, 0.06), 120);
          buzz([15, 40, 25]);
          miniShape();
          $("star-rating").innerHTML = [0, 1, 2]
            .map((i) => (i < stars ? "★" : '<span class="off">★</span>'))
            .join("");
          $("modal-title").textContent = S.shape.name + " complete";
          $("modal-msg").textContent =
            `${S.chains.length} arrow-snakes filled the shape. Best combo x${S.bestCombo}. +${stars * 10} coins.`;
          $("btn-modal-next").textContent = "Next";
          $("btn-modal-next").dataset.retry = "";
          $("btn-modal-next").style.display =
            !S.daily && S.idx < LEVELS.length - 1 ? "block" : "none";
          $("modal").classList.remove("hidden");
        }
        function fail() {
          beep(180, 0.25, 0.06);
          buzz([40, 60, 40]);
          $("modal-shape").innerHTML = "";
          $("star-rating").innerHTML = '<span class="off">★★★</span>';
          $("modal-title").textContent = "Shape left unfinished";
          $("modal-msg").textContent =
            "All 3 lives used up. Undo a move or try again.";
          $("btn-modal-next").textContent = "Retry";
          $("btn-modal-next").dataset.retry = "1";
          $("btn-modal-next").style.display = "block";
          $("modal").classList.remove("hidden");
        }

        function useHint() {
          const free = freeList();
          if (!free.length) return;
          if (S.hints <= 0) {
            if (S.coins >= 50) {
              S.coins -= 50;
              S.hints += 3;
              save();
              updateHud();
              toast("Got 3 hints for 50 coins");
            } else toast("Out of hints — 3 more for 50 coins");
            return;
          }
          S.hints--;
          save();
          updateHud();
          const pick = free[Math.floor(Math.random() * free.length)];
          pick.el && pick.el.classList.add("hinting");
          setTimeout(
            () => pick.el && pick.el.classList.remove("hinting"),
            2200,
          );
        }
        function undo() {
          const entry = S.removed.pop();
          if (!entry) return;
          if (entry.chain._raf) {
            cancelAnimationFrame(entry.chain._raf);
            entry.chain._raf = null;
          }
          entry.chain.out = false;
          S.combo = 0;
          for (let k = 0; k < entry.n && S.filled > 0; k++) {
            S.pxEls[--S.filled].classList.remove("on");
          }
          $("shape-bar").style.width =
            Math.round((S.filled / S.pxEls.length) * 100) + "%";
          build();
          updateHud();
          resetIdle();
        }
        let tT = null;
        function toast(m) {
          const t = $("toast");
          t.textContent = m;
          t.classList.add("show");
          clearTimeout(tT);
          tT = setTimeout(() => t.classList.remove("show"), 1900);
        }

        function renderLevels() {
          const g = $("levels-grid");
          g.innerHTML = "";
          LEVELS.forEach((L, i) => {
            const st = S.solved[String(i)] || 0,
              open = i === 0 || S.solved[String(i - 1)];
            const d = document.createElement("div");
            d.className = "lv" + (st ? " done" : "") + (open ? "" : " locked");
            const icon = st ? `<img src="${SHAPES[L.shape].icon}" alt="${SHAPES[L.shape].name}">` : "❓";
            d.innerHTML = `<span class="ic">${icon}</span> ${L.id} <div class="st">${st ? "★".repeat(st) : ""}</div>`; 
           if (open) d.onclick = () => loadLevel(i, false);
            g.appendChild(d);
          });
        }
        function openDifficulties() {
          show("difficulty");
        }
          function openLevels() {
            renderLevels();
            show("levels");
          }
        function updateMenu() {
          $("menu-coins").textContent = S.coins;
          $("menu-solved").textContent = Object.keys(S.solved).filter(
            (k) => k !== "daily",
          ).length;
          $("menu-combo").textContent = S.bestCombo;
        }
        function firstOpen() {
          for (let i = 0; i < LEVELS.length; i++)
            if (!S.solved[String(i)]) return i;
          return 0;
        }

        function bind() {
          const logoScreen = $("logo-screen");
          const splash = $("splash-screen");
          const dismissLogo = () => {
            if (!logoScreen || logoScreen.classList.contains("dismissed")) return;
            logoScreen.classList.add("dismissed");
            setTimeout(() => logoScreen.remove(), 520);
          };
          const dismissSplash = () => {
            if (!splash || splash.classList.contains("dismissed")) return;
            splash.classList.add("dismissed");
            setTimeout(() => splash.remove(), 520);
          };
          $("btn-splash-start").onclick = dismissSplash;
          setTimeout(dismissLogo, 1200);
          $("btn-play").onclick = () => loadLevel(firstOpen(), false);
          $("btn-levels").onclick = openDifficulties;
          $("btn-back-difficulty").onclick = () => show("menu");
          $("btn-difficulty-easy").onclick = openLevels;
          $("btn-daily").onclick = () => loadLevel(0, true);
          $("btn-back-game").onclick = openLevels;
          $("btn-back-levels").onclick = openDifficulties;
          $("btn-undo").onclick = undo;
          $("btn-hint").onclick = useHint;
          $("btn-restart").onclick = () => {
            $("modal").classList.add("hidden");
            loadLevel(S.idx, S.daily);
          };
          $("btn-sound").onclick = () => {
            S.sound = !S.sound;
            $("btn-sound").classList.toggle("on", S.sound);
            save();
          };
          $("btn-modal-main").onclick = () => {
            $("modal").classList.add("hidden");
            openLevels();
          };
          $("btn-modal-next").onclick = () => {
            const m = $("btn-modal-next");
            $("modal").classList.add("hidden");
            if (m.dataset.retry) {
              m.dataset.retry = "";
              loadLevel(S.idx, S.daily);
            } else loadLevel(Math.min(S.idx + 1, LEVELS.length - 1), false);
          };
          window.addEventListener("resize", () => {
            if (screens.game.classList.contains("active")) build();
          });
        }

        load();
        bind();
        renderLevels();
        updateMenu();
        renderStreak();
        updateHud();
        $("btn-sound").classList.toggle("on", S.sound);
      })();
