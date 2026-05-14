// Canvas2D client for the semantic spatial runtime.
//
// Renders three entity classes:
//   - region: translucent labeled backdrop grouping a cluster
//   - edge:   directed arrow between two node entities
//   - node:   a card with icon, title, subtitle, accent bar
//
// Plus annotations (sticky notes) layered on top.
//
// Interaction tiers (see SKILL.md):
//   - immediate: hover highlight, drag preview, tooltip — stays in browser
//   - semantic:  entity_clicked, canvas_clicked, annotation_submitted — WS

(() => {
  "use strict";

  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const statusEl = document.getElementById("status");
  const annotInput = document.getElementById("annotation-input");
  const tooltipEl = document.getElementById("tooltip");
  const drawerEl = document.getElementById("drawer");
  const drawerIcon = document.getElementById("drawer-icon");
  const drawerTitle = document.getElementById("drawer-title");
  const drawerSubtitle = document.getElementById("drawer-subtitle");
  const drawerDesc = document.getElementById("drawer-desc");
  const drawerNeighbors = document.getElementById("drawer-neighbors");
  const drawerAccent = drawerEl.querySelector(".d-accent");
  const drawerClose = document.getElementById("drawer-close");
  const drawerAnnotate = document.getElementById("drawer-annotate");
  const drawerAsk = document.getElementById("drawer-ask");

  // ---- state ----
  let snapshot = null;
  let hoveredId = null;
  let focusedId = null; // immediate-tier focus: dims non-neighbors and opens drawer
  let drag = null;
  let pendingBounds = null;
  let dpr = window.devicePixelRatio || 1;
  let lastPointer = { x: 0, y: 0 };

  // ---- canvas sizing ----
  function resize() {
    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    requestAnimationFrame(render);
  }
  window.addEventListener("resize", resize);
  resize();

  // ---- websocket ----
  const wsUrl = (location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/ws";
  let ws = null;
  let reconnectDelay = 500;
  function connect() {
    ws = new WebSocket(wsUrl);
    ws.onopen = () => { statusEl.textContent = "connected"; reconnectDelay = 500; };
    ws.onmessage = (e) => {
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }
      if (msg.kind === "snapshot") {
        snapshot = msg.state;
        statusEl.textContent = "v" + snapshot.version + " · " + Object.keys(snapshot.entities).length + " entities";
        // Keep focus state coherent across mutations.
        if (focusedId) {
          if (!snapshot.entities[focusedId]) {
            setFocus(null);
          } else {
            focusedNeighbors = computeNeighbors(focusedId);
            renderDrawer();
          }
        }
        requestAnimationFrame(render);
      }
    };
    ws.onclose = () => {
      statusEl.textContent = "disconnected — reconnecting…";
      setTimeout(connect, reconnectDelay);
      reconnectDelay = Math.min(reconnectDelay * 2, 5000);
    };
    ws.onerror = () => { try { ws.close(); } catch {} };
  }
  connect();

  function send(obj) {
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
  }

  // ---- camera (fit world to viewport) ----
  function worldToScreen() {
    if (!snapshot) return { sx: 1, sy: 1, ox: 0, oy: 0 };
    const cw = snapshot.canvas.width;
    const ch = snapshot.canvas.height;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 40;
    const scale = Math.min((vw - margin * 2) / cw, (vh - margin * 2) / ch);
    const ox = (vw - cw * scale) / 2;
    const oy = (vh - ch * scale) / 2;
    return { sx: scale, sy: scale, ox, oy };
  }
  function screenToWorld(px, py) {
    const { sx, ox, oy } = worldToScreen();
    return { x: (px - ox) / sx, y: (py - oy) / sx };
  }

  // ---- hit testing (nodes only; regions and edges are non-interactive) ----
  function hitTest(wx, wy) {
    if (!snapshot) return null;
    let hit = null;
    for (const id in snapshot.entities) {
      const e = snapshot.entities[id];
      if (e.type !== "node") continue;
      const b = e.spatial;
      if (wx >= b.x && wx <= b.x + b.width && wy >= b.y && wy <= b.y + b.height) {
        hit = e;
      }
    }
    return hit;
  }

  // Apply a transient alpha to a draw block. Used for focus dimming.
  function withAlpha(alpha, fn) {
    if (alpha >= 1) { fn(); return; }
    const prev = ctx.globalAlpha;
    ctx.globalAlpha = prev * alpha;
    fn();
    ctx.globalAlpha = prev;
  }

  // ---- shape helpers ----
  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
  }

  function entityCenter(e) {
    const b = e.spatial;
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  }

  // Compute 1-hop neighbors of an entity by walking edges. Returns sets of
  // neighbor node ids and connecting edge ids.
  function computeNeighbors(entityId) {
    const nodes = new Set();
    const edges = new Set();
    if (!snapshot) return { nodes, edges };
    for (const id in snapshot.entities) {
      const e = snapshot.entities[id];
      if (e.type !== "edge") continue;
      const from = e.metadata && e.metadata.from;
      const to = e.metadata && e.metadata.to;
      if (from === entityId && to) { nodes.add(to); edges.add(id); }
      else if (to === entityId && from) { nodes.add(from); edges.add(id); }
    }
    return { nodes, edges };
  }

  // Returns dim alpha multiplier for an entity given current focus.
  // 1 = full opacity, < 1 = dimmed.
  function focusAlpha(entity) {
    if (!focusedId) return 1;
    if (entity.type === "region") return 1;
    if (entity.type === "annotation") return 1;
    if (entity.id === focusedId) return 1;
    const fn = focusedNeighbors;
    if (entity.type === "edge") return fn.edges.has(entity.id) ? 1 : 0.18;
    return fn.nodes.has(entity.id) ? 1 : 0.18;
  }

  let focusedNeighbors = { nodes: new Set(), edges: new Set() };

  // Find the intersection point on a rectangle's perimeter for an arrow
  // coming from `from` to the rect's center.
  function rectAnchor(rect, from) {
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    const dx = from.x - cx;
    const dy = from.y - cy;
    if (dx === 0 && dy === 0) return { x: cx, y: cy };
    const halfW = rect.width / 2;
    const halfH = rect.height / 2;
    const scaleX = Math.abs(dx) / halfW;
    const scaleY = Math.abs(dy) / halfH;
    const s = Math.max(scaleX, scaleY);
    return { x: cx + dx / s, y: cy + dy / s };
  }

  // ---- renderer ----
  function render() {
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    if (!snapshot) { ctx.restore(); return; }

    const { sx, ox, oy } = worldToScreen();
    ctx.translate(ox, oy);
    ctx.scale(sx, sx);

    drawGrid(snapshot.canvas);

    const regions = [];
    const edges = [];
    const nodes = [];
    const annotations = [];
    for (const id in snapshot.entities) {
      const e = snapshot.entities[id];
      if (e.type === "region") regions.push(e);
      else if (e.type === "edge") edges.push(e);
      else if (e.type === "annotation") annotations.push(e);
      else nodes.push(e);
    }

    regions.forEach((r) => withAlpha(focusAlpha(r), () => drawRegion(r)));
    edges.forEach((e) => withAlpha(focusAlpha(e), () => drawEdge(e, snapshot.entities)));
    nodes.forEach((n) => withAlpha(focusAlpha(n), () =>
      drawNode(n, n.id === hoveredId, n.id === focusedId)
    ));
    annotations.forEach((a) => drawAnnotation(a));

    if (drag) drawDragPreview();

    ctx.restore();
  }

  function drawGrid(canvasBounds) {
    const step = 60;
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.025)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= canvasBounds.width; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvasBounds.height); ctx.stroke();
    }
    for (let y = 0; y <= canvasBounds.height; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvasBounds.width, y); ctx.stroke();
    }
    ctx.restore();
  }

  function drawRegion(e) {
    const b = e.spatial;
    const accent = (e.metadata && e.metadata.accent) || "#5a6a88";
    ctx.save();
    roundRect(ctx, b.x, b.y, b.width, b.height, 18);
    ctx.fillStyle = hexAlpha(accent, 0.06);
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = hexAlpha(accent, 0.35);
    ctx.stroke();
    ctx.setLineDash([]);

    const title = (e.metadata && e.metadata.title) || "";
    if (title) {
      ctx.font = "600 11px Inter, -apple-system, sans-serif";
      ctx.fillStyle = hexAlpha(accent, 0.85);
      ctx.textBaseline = "alphabetic";
      ctx.fillText(title.toUpperCase(), b.x + 14, b.y + 22);
    }
    ctx.restore();
  }

  function drawNode(e, hovered, focused) {
    const b = e.spatial;
    const m = e.metadata || {};
    const accent = m.accent || "#6a7a8a";

    ctx.save();

    // focus glow ring (rendered behind the card)
    if (focused) {
      ctx.save();
      const pad = 6;
      roundRect(ctx, b.x - pad, b.y - pad, b.width + pad * 2, b.height + pad * 2, 14);
      ctx.fillStyle = hexAlpha(accent, 0.12);
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = hexAlpha(accent, 0.65);
      ctx.stroke();
      ctx.restore();
    }

    // shadow
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = focused ? 28 : hovered ? 22 : 14;
    ctx.shadowOffsetY = focused ? 8 : hovered ? 6 : 3;

    // card body
    roundRect(ctx, b.x, b.y, b.width, b.height, 10);
    const grad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.height);
    grad.addColorStop(0, "#1b2030");
    grad.addColorStop(1, "#141821");
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // accent top strip
    ctx.save();
    roundRect(ctx, b.x, b.y, b.width, b.height, 10);
    ctx.clip();
    ctx.fillStyle = accent;
    ctx.fillRect(b.x, b.y, b.width, 3);
    ctx.restore();

    // border
    roundRect(ctx, b.x, b.y, b.width, b.height, 10);
    ctx.lineWidth = focused ? 1.8 : hovered ? 1.6 : 1;
    ctx.strokeStyle = focused ? accent : hovered ? accent : "rgba(255,255,255,0.08)";
    ctx.stroke();

    // icon
    const icon = m.icon || "■";
    const iconSize = Math.min(28, b.height * 0.42);
    ctx.font = `${iconSize}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",-apple-system,sans-serif`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillStyle = "#fff";
    const iconX = b.x + 14;
    const iconCY = b.y + b.height / 2 + 1;
    ctx.fillText(icon, iconX, iconCY);

    // title + subtitle
    const textX = iconX + iconSize + 12;
    const title = m.title || e.id;
    const subtitle = m.subtitle || "";
    ctx.fillStyle = "#f1f4fa";
    ctx.font = "600 13px Inter, -apple-system, sans-serif";
    ctx.textBaseline = "alphabetic";
    const titleY = subtitle ? b.y + b.height / 2 - 2 : b.y + b.height / 2 + 5;
    ctx.fillText(truncate(ctx, title, b.width - (textX - b.x) - 14), textX, titleY);

    if (subtitle) {
      ctx.fillStyle = "#8995af";
      ctx.font = "11px Inter, -apple-system, sans-serif";
      ctx.fillText(truncate(ctx, subtitle, b.width - (textX - b.x) - 14), textX, b.y + b.height / 2 + 14);
    }

    ctx.restore();
  }

  function drawEdge(edge, entities) {
    const m = edge.metadata || {};
    const from = entities[m.from];
    const to = entities[m.to];
    if (!from || !to || from.type !== "node" || to.type !== "node") return;

    const fromCenter = entityCenter(from);
    const toCenter = entityCenter(to);
    const a = rectAnchor(from.spatial, toCenter);
    const b = rectAnchor(to.spatial, fromCenter);

    const accent = m.accent || "rgba(140,160,200,0.55)";
    const dashed = m.dashed === true;

    ctx.save();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.4;
    if (dashed) ctx.setLineDash([5, 5]);

    // curved control point
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const curve = Math.min(40, len * 0.15);
    // perpendicular offset for slight curve
    const px = -dy / len * curve;
    const py = dx / len * curve;
    const cpx = midX + px * 0;
    const cpy = midY + py * 0;

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(cpx, cpy, b.x, b.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // arrowhead at b
    const angle = Math.atan2(b.y - cpy, b.x - cpx);
    const ah = 8;
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - ah * Math.cos(angle - Math.PI / 7), b.y - ah * Math.sin(angle - Math.PI / 7));
    ctx.lineTo(b.x - ah * Math.cos(angle + Math.PI / 7), b.y - ah * Math.sin(angle + Math.PI / 7));
    ctx.closePath();
    ctx.fill();

    // label
    if (m.label) {
      ctx.font = "10px Inter, -apple-system, sans-serif";
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      const tw = ctx.measureText(m.label).width + 10;
      const lx = midX;
      const ly = midY;
      roundRect(ctx, lx - tw / 2, ly - 8, tw, 16, 4);
      ctx.fillStyle = "rgba(20,24,34,0.92)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "#c8d0e0";
      ctx.fillText(m.label, lx, ly + 0.5);
    }

    ctx.restore();
  }

  function drawAnnotation(e) {
    const b = e.spatial;
    ctx.save();
    ctx.fillStyle = "rgba(255, 234, 120, 0.10)";
    ctx.strokeStyle = "rgba(255, 220, 100, 0.85)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    roundRect(ctx, b.x, b.y, b.width, b.height, 6);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);

    const text = (e.metadata && e.metadata.text) || "";
    const tabW = Math.min(b.width, 260);
    roundRect(ctx, b.x, b.y - 24, tabW, 22, 4);
    ctx.fillStyle = "rgba(255, 234, 120, 0.95)";
    ctx.fill();
    ctx.fillStyle = "#3a2a00";
    ctx.font = "600 11px Inter, -apple-system, sans-serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    const truncated = text.length > 42 ? text.slice(0, 40) + "…" : text;
    ctx.fillText(truncated, b.x + 8, b.y - 13);
    ctx.restore();
  }

  function drawDragPreview() {
    const x = Math.min(drag.x0, drag.x1);
    const y = Math.min(drag.y0, drag.y1);
    const w = Math.abs(drag.x1 - drag.x0);
    const h = Math.abs(drag.y1 - drag.y0);
    ctx.save();
    ctx.fillStyle = "rgba(255, 234, 120, 0.10)";
    ctx.strokeStyle = "rgba(255, 220, 100, 0.9)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    roundRect(ctx, x, y, w, h, 6);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // ---- helpers ----
  function hexAlpha(color, alpha) {
    if (color.startsWith("rgba")) return color;
    if (color.startsWith("#") && color.length === 7) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r},${g},${b},${alpha})`;
    }
    return color;
  }
  function truncate(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let lo = 0, hi = text.length;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (ctx.measureText(text.slice(0, mid) + "…").width <= maxWidth) lo = mid;
      else hi = mid - 1;
    }
    return text.slice(0, lo) + "…";
  }

  // ---- tooltip ----
  function showTooltip(e, screenX, screenY) {
    const m = e.metadata || {};
    tooltipEl.innerHTML =
      `<div class="t-title">${escapeHtml(m.title || e.id)}</div>` +
      (m.subtitle ? `<div class="t-sub">${escapeHtml(m.subtitle)}</div>` : "") +
      (m.desc ? `<div class="t-desc">${escapeHtml(m.desc)}</div>` : "");
    tooltipEl.style.display = "block";
    const rect = tooltipEl.getBoundingClientRect();
    let left = screenX + 14;
    let top = screenY + 14;
    if (left + rect.width > window.innerWidth - 8) left = screenX - rect.width - 14;
    if (top + rect.height > window.innerHeight - 8) top = screenY - rect.height - 14;
    tooltipEl.style.left = Math.max(8, left) + "px";
    tooltipEl.style.top = Math.max(8, top) + "px";
  }
  function hideTooltip() { tooltipEl.style.display = "none"; }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[c]);
  }

  // ---- pointer handling ----
  let dragStarted = false;
  const DRAG_THRESHOLD = 4;

  canvas.addEventListener("pointermove", (ev) => {
    lastPointer = { x: ev.clientX, y: ev.clientY };
    const w = screenToWorld(ev.clientX, ev.clientY);

    if (drag && (Math.abs(ev.clientX - drag.screenX0) > DRAG_THRESHOLD ||
                  Math.abs(ev.clientY - drag.screenY0) > DRAG_THRESHOLD)) {
      dragStarted = true;
    }
    if (drag && dragStarted) {
      drag.x1 = w.x;
      drag.y1 = w.y;
      requestAnimationFrame(render);
      return;
    }
    const hit = hitTest(w.x, w.y);
    const newHovered = hit ? hit.id : null;
    if (newHovered !== hoveredId) {
      hoveredId = newHovered;
      canvas.style.cursor = hit ? "pointer" : "crosshair";
      requestAnimationFrame(render);
    }
    if (hit) showTooltip(hit, ev.clientX, ev.clientY);
    else hideTooltip();
  });

  canvas.addEventListener("pointerleave", () => { hideTooltip(); hoveredId = null; requestAnimationFrame(render); });

  canvas.addEventListener("pointerdown", (ev) => {
    if (pendingBounds || annotInput.style.display === "block") return;
    hideTooltip();
    const w = screenToWorld(ev.clientX, ev.clientY);
    drag = { x0: w.x, y0: w.y, x1: w.x, y1: w.y, screenX0: ev.clientX, screenY0: ev.clientY };
    dragStarted = false;
    canvas.setPointerCapture(ev.pointerId);
  });

  canvas.addEventListener("pointerup", (ev) => {
    if (!drag) return;
    const w = screenToWorld(ev.clientX, ev.clientY);
    const wasDrag = dragStarted;
    const startWorld = { x: drag.x0, y: drag.y0 };
    drag = null;
    dragStarted = false;

    if (wasDrag) {
      const bounds = {
        x: Math.min(startWorld.x, w.x),
        y: Math.min(startWorld.y, w.y),
        width: Math.abs(w.x - startWorld.x),
        height: Math.abs(w.y - startWorld.y),
      };
      if (bounds.width < 8 || bounds.height < 8) {
        requestAnimationFrame(render);
        return;
      }
      pendingBounds = bounds;
      const { sx, ox, oy } = worldToScreen();
      annotInput.style.left = ox + bounds.x * sx + "px";
      annotInput.style.top = oy + bounds.y * sx + "px";
      annotInput.style.width = Math.max(180, bounds.width * sx) + "px";
      annotInput.style.height = Math.max(60, bounds.height * sx) + "px";
      annotInput.style.display = "block";
      annotInput.value = "";
      annotInput.focus();
      requestAnimationFrame(render);
      return;
    }

    const hit = hitTest(w.x, w.y);
    if (hit) {
      setFocus(hit.id);
      send({ event: "entity_clicked", entityId: hit.id, x: w.x, y: w.y });
    } else {
      setFocus(null);
      send({ event: "canvas_clicked", x: w.x, y: w.y });
    }
    requestAnimationFrame(render);
  });

  // ---- focus + drawer ----
  function setFocus(id) {
    if (id === focusedId) {
      if (id) renderDrawer(); // re-sync drawer if snapshot changed
      return;
    }
    focusedId = id;
    focusedNeighbors = id ? computeNeighbors(id) : { nodes: new Set(), edges: new Set() };
    if (id) openDrawer(); else closeDrawer();
    requestAnimationFrame(render);
  }

  function openDrawer() {
    renderDrawer();
    drawerEl.classList.add("open");
    drawerEl.setAttribute("aria-hidden", "false");
  }
  function closeDrawer() {
    drawerEl.classList.remove("open");
    drawerEl.setAttribute("aria-hidden", "true");
  }
  function renderDrawer() {
    if (!focusedId || !snapshot) return;
    const e = snapshot.entities[focusedId];
    if (!e) return;
    const m = e.metadata || {};
    drawerAccent.style.background = m.accent || "#6a8aff";
    drawerIcon.textContent = m.icon || "■";
    drawerTitle.textContent = m.title || e.id;
    drawerSubtitle.textContent = m.subtitle || "";
    drawerDesc.textContent = m.desc || "(no description)";

    // neighbors list
    drawerNeighbors.innerHTML = "";
    const neighborRows = [];
    for (const edgeId in snapshot.entities) {
      const edge = snapshot.entities[edgeId];
      if (edge.type !== "edge") continue;
      const from = edge.metadata && edge.metadata.from;
      const to = edge.metadata && edge.metadata.to;
      const label = (edge.metadata && edge.metadata.label) || "";
      if (from === focusedId && to) {
        neighborRows.push({ id: to, dir: "→", label });
      } else if (to === focusedId && from) {
        neighborRows.push({ id: from, dir: "←", label });
      }
    }
    if (neighborRows.length === 0) {
      const li = document.createElement("li");
      li.className = "d-empty";
      li.textContent = "(no connections)";
      drawerNeighbors.appendChild(li);
    } else {
      for (const row of neighborRows) {
        const n = snapshot.entities[row.id];
        if (!n) continue;
        const nm = n.metadata || {};
        const li = document.createElement("li");
        li.className = "d-neighbor";
        li.dataset.id = row.id;
        li.innerHTML =
          `<span class="n-dir">${row.dir}</span>` +
          `<span class="n-icon">${escapeHtml(nm.icon || "■")}</span>` +
          `<span class="n-text">` +
            `<div class="n-title">${escapeHtml(nm.title || row.id)}</div>` +
            (row.label ? `<div class="n-edge">${escapeHtml(row.label)}</div>` : "") +
          `</span>`;
        li.addEventListener("click", () => setFocus(row.id));
        drawerNeighbors.appendChild(li);
      }
    }
  }

  drawerClose.addEventListener("click", () => setFocus(null));

  drawerAnnotate.addEventListener("click", () => openAnnotationOverFocused(""));
  drawerAsk.addEventListener("click", () => openAnnotationOverFocused("Explain this"));

  function openAnnotationOverFocused(prefillText) {
    if (!focusedId || !snapshot) return;
    const e = snapshot.entities[focusedId];
    if (!e) return;
    const b = e.spatial;
    const padding = 10;
    const bounds = {
      x: b.x - padding,
      y: b.y - padding,
      width: b.width + padding * 2,
      height: b.height + padding * 2,
    };
    pendingBounds = bounds;
    const { sx, ox, oy } = worldToScreen();
    annotInput.style.left = ox + bounds.x * sx + "px";
    annotInput.style.top = oy + bounds.y * sx + "px";
    annotInput.style.width = Math.max(220, bounds.width * sx) + "px";
    annotInput.style.height = Math.max(60, bounds.height * sx) + "px";
    annotInput.style.display = "block";
    annotInput.value = prefillText;
    annotInput.focus();
    if (prefillText) annotInput.select();
  }

  // Escape clears focus (when not in annotation input)
  window.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && focusedId && annotInput.style.display !== "block") {
      ev.preventDefault();
      setFocus(null);
    }
  });

  // ---- annotation submit ----
  function submitAnnotation() {
    if (!pendingBounds) return;
    const text = annotInput.value.trim();
    annotInput.style.display = "none";
    const bounds = pendingBounds;
    pendingBounds = null;
    if (!text) return;
    send({ event: "annotation_submitted", bounds, text });
  }
  function cancelAnnotation() {
    annotInput.style.display = "none";
    pendingBounds = null;
    requestAnimationFrame(render);
  }
  annotInput.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && !ev.shiftKey) { ev.preventDefault(); submitAnnotation(); }
    else if (ev.key === "Escape") { ev.preventDefault(); cancelAnnotation(); }
  });
  annotInput.addEventListener("blur", () => { if (pendingBounds) submitAnnotation(); });
})();
