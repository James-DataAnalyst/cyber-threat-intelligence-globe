const svg = d3.select("#viz");
const tooltip = d3.select("#tooltip");

let width = window.innerWidth;
let height = window.innerHeight;
const layout = getLayout();
let centerX = layout.centerX;
let centerY = layout.centerY;
let baseRadius = layout.radius;

svg
  .attr("viewBox", [0, 0, width, height])
  .attr("preserveAspectRatio", "xMidYMid slice");

const defs = svg.append("defs");
defs
  .append("radialGradient")
  .attr("id", "oceanGradient")
  .selectAll("stop")
  .data([
    { offset: "0%", color: "#115564" },
    { offset: "42%", color: "#082f43" },
    { offset: "76%", color: "#031622" },
    { offset: "100%", color: "#01070d" },
  ])
  .join("stop")
  .attr("offset", (d) => d.offset)
  .attr("stop-color", (d) => d.color);
[
  "outerGlow:2.5",
  "arcGlow:2",
  "nodeGlow:3",
  "particleGlow:1.5",
  "hotGlow:4",
].forEach((item) => {
  const [id, blur] = item.split(":");
  defs
    .append("filter")
    .attr("id", id)
    .html(
      `<feGaussianBlur stdDeviation="${blur}" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>`,
    );
});

const projection = d3
  .geoOrthographic()
  .scale(baseRadius)
  .translate([centerX, centerY])
  .clipAngle(90)
  .precision(0.35)
  .rotate([-22, -11, 0]);

const path = d3.geoPath(projection);
const graticule = d3.geoGraticule10();

const starsLayer = svg.append("g");
const scannerLayer = svg.append("g");
const backTraceLayer = svg.append("g");
const globeLayer = svg.append("g");
const countryLayer = globeLayer.append("g");
const routeLayer = svg.append("g");
const lightningLayer = svg.append("g");
const particleLayer = svg.append("g");
const hotLayer = svg.append("g");
const nodeLayer = svg.append("g");

const regions = {
  global: { label: "GLOBAL", rotate: [-22, -11, 0], scale: 1 },
  "north-america": {
    label: "NORTH AMERICA",
    rotate: [96, -34, 0],
    scale: 1.35,
  },
  "latin-america": { label: "LATIN AMERICA", rotate: [62, 15, 0], scale: 1.34 },
  europe: { label: "EUROPE", rotate: [-15, -50, 0], scale: 1.45 },
  africa: { label: "AFRICA", rotate: [-20, 4, 0], scale: 1.38 },
  "middle-east": { label: "MIDDLE EAST", rotate: [-47, -26, 0], scale: 1.5 },
  "asia-pacific": {
    label: "ASIA PACIFIC",
    rotate: [-102, -24, 0],
    scale: 1.34,
  },
};

const hubs = [
  ["San Francisco", "USA", "north-america", -122.4194, 37.7749, 92],
  ["New York", "USA", "north-america", -74.006, 40.7128, 90],
  ["Toronto", "Canada", "north-america", -79.3832, 43.6532, 74],
  ["Mexico City", "Mexico", "latin-america", -99.1332, 19.4326, 71],
  ["São Paulo", "Brazil", "latin-america", -46.6333, -23.5505, 82],
  ["Buenos Aires", "Argentina", "latin-america", -58.3816, -34.6037, 67],
  ["London", "UK", "europe", -0.1276, 51.5072, 88],
  ["Paris", "France", "europe", 2.3522, 48.8566, 78],
  ["Berlin", "Germany", "europe", 13.405, 52.52, 84],
  ["Stockholm", "Sweden", "europe", 18.0686, 59.3293, 70],
  ["Kyiv", "Ukraine", "europe", 30.5234, 50.4501, 93],
  ["Moscow", "Russia", "europe", 37.6173, 55.7558, 86],
  ["Lagos", "Nigeria", "africa", 3.3792, 6.5244, 81],
  ["Cairo", "Egypt", "africa", 31.2357, 30.0444, 77],
  ["Nairobi", "Kenya", "africa", 36.8219, -1.2921, 72],
  ["Cape Town", "South Africa", "africa", 18.4241, -33.9249, 68],
  ["Dubai", "UAE", "middle-east", 55.2708, 25.2048, 85],
  ["Riyadh", "Saudi Arabia", "middle-east", 46.6753, 24.7136, 73],
  ["Tel Aviv", "Israel", "middle-east", 34.7818, 32.0853, 83],
  ["Istanbul", "Turkey", "middle-east", 28.9784, 41.0082, 79],
  ["Mumbai", "India", "asia-pacific", 72.8777, 19.076, 86],
  ["Singapore", "Singapore", "asia-pacific", 103.8198, 1.3521, 91],
  ["Tokyo", "Japan", "asia-pacific", 139.6917, 35.6895, 89],
  ["Seoul", "South Korea", "asia-pacific", 126.978, 37.5665, 80],
  ["Hong Kong", "China", "asia-pacific", 114.1694, 22.3193, 87],
  ["Sydney", "Australia", "asia-pacific", 151.2093, -33.8688, 76],
].map(([city, country, region, lon, lat, value]) => ({
  city,
  country,
  region,
  lon,
  lat,
  value,
}));

const severities = {
  critical: { color: "#ff4054", width: 2.25, label: "CRITICAL" },
  high: { color: "#ff7b8b", width: 1.6, label: "HIGH" },
  medium: { color: "#00eaff", width: 1.05, label: "MEDIUM" },
};
const attackNames = [
  "Zero-Day Probe",
  "Botnet Surge",
  "Credential Storm",
  "API Exploit",
  "DDoS Wave",
  "Data Exfiltration",
  "Phishing Relay",
  "Ransomware Beacon",
  "Cloud Breach",
  "Supply-Chain Scan",
  "Privilege Escalation",
  "Command Injection",
];

let countries = [];
let arcs = [];
let activeFilter = "all";
let activeRegion = "global";
let autoRotate = true;
let currentScale = baseRadius;
let dragRotationStart = null;
let dragPointStart = null;
let lastFrame = performance.now();

createStarfield();
createScanner();
updateClock();
setInterval(updateClock, 1000);

d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json").then(
  (world) => {
    countries = topojson.feature(world, world.objects.countries).features;
    drawGlobe();
    buildNetwork();
    bindInteraction();
    animate();
    startTelemetry();
    focusRegion("global", 0);
  },
);

function getLayout() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const rightPanel = w > 880 ? Math.min(360, Math.max(300, w * 0.2)) : 28;
  const leftVisual = w > 1180 ? Math.min(310, Math.max(255, w * 0.17)) : 28;
  const topSafe = w > 640 ? 78 : 86;
  const bottomSafe = w > 880 ? 92 : 42;
  const availableW = w - leftVisual - rightPanel - 56;
  const availableH = h - topSafe - bottomSafe;
  const radius = Math.max(
    190,
    Math.min(availableW * 0.43, availableH * 0.53, Math.min(w, h) * 0.39),
  );
  return {
    centerX: leftVisual + availableW * 0.54,
    centerY: topSafe + availableH * 0.52,
    radius,
  };
}

function drawGlobe() {
  globeLayer
    .append("path")
    .datum({ type: "Sphere" })
    .attr("class", "globe-ocean")
    .attr("d", path);
  globeLayer
    .append("path")
    .datum({ type: "Sphere" })
    .attr("class", "globe-atmosphere")
    .attr("d", path);
  globeLayer
    .append("path")
    .datum({ type: "Sphere" })
    .attr("class", "globe-limb")
    .attr("d", path);
  globeLayer
    .append("path")
    .datum(graticule)
    .attr("class", "graticule")
    .attr("d", path);
  countryLayer
    .selectAll(".country")
    .data(countries)
    .join("path")
    .attr("class", "country")
    .attr("d", path)
    .on("mousemove", showCountryTooltip)
    .on("mouseleave", hideTooltip);
}

function buildNetwork() {
  arcs = d3.range(48).map((_, id) => makeArc(id));
  drawAll();
  refreshUI();
}

function makeArc(id) {
  let source = hubs[Math.floor(Math.random() * hubs.length)];
  let target = hubs[Math.floor(Math.random() * hubs.length)];
  while (target.city === source.city)
    target = hubs[Math.floor(Math.random() * hubs.length)];
  const severity = weightedSeverity();
  return {
    id,
    source,
    target,
    severity,
    type: attackNames[Math.floor(Math.random() * attackNames.length)],
    packets: Math.round(d3.randomUniform(1800, 165000)()),
    delay: Math.random() * 5200,
  };
}
function weightedSeverity() {
  const r = Math.random();
  return r > 0.78 ? "critical" : r > 0.43 ? "high" : "medium";
}
function routeVisible(d) {
  return (
    (activeFilter === "all" || d.severity === activeFilter) &&
    (activeRegion === "global" ||
      d.source.region === activeRegion ||
      d.target.region === activeRegion)
  );
}
function geoVisible(point) {
  return (
    d3.geoDistance(
      [point.lon, point.lat],
      projection.invert([centerX, centerY]),
    ) <
    Math.PI / 2
  );
}

function routePath(d, lift = 1) {
  const s = projection([d.source.lon, d.source.lat]);
  const t = projection([d.target.lon, d.target.lat]);
  if (!s || !t) return "";
  const dx = t[0] - s[0],
    dy = t[1] - s[1];
  const dr =
    Math.sqrt(dx * dx + dy * dy) *
    (1.18 + lift * (d.severity === "critical" ? 0.52 : 0.28));
  return `M${s[0]},${s[1]}A${dr},${dr} 0 0,${d.source.lon < d.target.lon ? 1 : 0} ${t[0]},${t[1]}`;
}
function lightningPath(d) {
  const s = projection([d.source.lon, d.source.lat]);
  const t = projection([d.target.lon, d.target.lat]);
  if (!s || !t) return "";
  const points = d3.range(8).map((i) => {
    const k = i / 7;
    const amp = Math.sin(k * Math.PI) * 15;
    return [
      s[0] + (t[0] - s[0]) * k + (Math.random() - 0.5) * amp,
      s[1] + (t[1] - s[1]) * k + (Math.random() - 0.5) * amp,
    ];
  });
  return d3.line().curve(d3.curveCatmullRom.alpha(0.7))(points);
}

function drawAll() {
  drawBackTrace();
  drawRoutes();
  drawHotspots();
  drawNodes();
}
function drawBackTrace() {
  backTraceLayer
    .selectAll("path.back-trace")
    .data(arcs.slice(0, 72), (d) => d.id)
    .join("path")
    .attr("class", "back-trace")
    .attr("d", (d) => routePath(d, 0.55));
}
function drawRoutes() {
  const visible = arcs.filter(routeVisible);
  routeLayer
    .selectAll("path.arc")
    .data(visible, (d) => d.id)
    .join(
      (enter) =>
        enter
          .append("path")
          .attr("class", "arc")
          .attr("stroke", (d) => severities[d.severity].color)
          .attr("d", routePath)
          .each(function (d) {
            animateArc(d3.select(this), d);
          }),
      (update) => update,
      (exit) => exit.transition().duration(220).attr("opacity", 0).remove(),
    )
    .attr("d", routePath)
    .attr("stroke", (d) => severities[d.severity].color)
    .attr("stroke-width", (d) => severities[d.severity].width + 1.25)
    .attr("opacity", (d) =>
      geoVisible(d.source) || geoVisible(d.target) ? 0.58 : 0.045,
    );

  routeLayer
    .selectAll("path.arc-core")
    .data(visible, (d) => d.id)
    .join("path")
    .attr("class", "arc-core")
    .attr("d", routePath)
    .attr("opacity", (d) =>
      geoVisible(d.source) || geoVisible(d.target) ? 0.5 : 0.03,
    );

  lightningLayer
    .selectAll("path.lightning")
    .data(
      visible.filter((d) => d.severity === "critical").slice(0, 16),
      (d) => d.id,
    )
    .join("path")
    .attr("class", "lightning")
    .attr("d", lightningPath)
    .attr("stroke", (d) => severities[d.severity].color)
    .attr("opacity", (d) =>
      geoVisible(d.source) || geoVisible(d.target) ? 0.52 : 0.025,
    );
}
function animateArc(selection, d) {
  selection.interrupt();
  const node = selection.node();
  if (!node) return;
  let totalLength = 900;
  try {
    totalLength = node.getTotalLength();
  } catch (e) {}
  selection
    .attr("stroke-dasharray", `${totalLength * 0.16} ${totalLength}`)
    .attr("stroke-dashoffset", totalLength)
    .transition()
    .delay(d.delay)
    .duration(2300 + Math.random() * 2200)
    .ease(d3.easeCubicInOut)
    .attr("stroke-dashoffset", 0)
    .transition()
    .duration(950)
    .attr("opacity", 0.11)
    .on("end", function () {
      animateArc(d3.select(this), d);
    });
}
function drawNodes() {
  const visibleHubs =
    activeRegion === "global"
      ? hubs
      : hubs.filter((d) => d.region === activeRegion);
  const node = nodeLayer
    .selectAll("g.node")
    .data(visibleHubs, (d) => d.city)
    .join(
      (enter) => {
        const g = enter
          .append("g")
          .attr("class", "node")
          .on("mousemove", showNodeTooltip)
          .on("mouseleave", hideTooltip);
        g.append("circle")
          .attr("class", "node-ring")
          .attr("r", (d) => 8 + d.value / 8)
          .attr("stroke", "#00eaff");
        g.append("circle")
          .attr("r", (d) => 3.5 + d.value / 34)
          .attr("fill", "#f7ffff")
          .attr("stroke", "#00eaff")
          .attr("stroke-width", 1.4);
        g.append("text")
          .attr("x", 13)
          .attr("y", 4)
          .attr("fill", "#dffcff")
          .attr("font-family", "Orbitron")
          .attr("font-size", 9)
          .attr("letter-spacing", 1.1)
          .text((d) => d.city.toUpperCase());
        return g;
      },
      (update) => update,
      (exit) => exit.remove(),
    );
  node
    .attr("transform", (d) => {
      const p = projection([d.lon, d.lat]);
      return p ? `translate(${p[0]},${p[1]})` : "translate(-999,-999)";
    })
    .attr("opacity", (d) => (geoVisible(d) ? 1 : 0.055));
}
function drawHotspots() {
  const data = hubs.filter(
    (d) => activeRegion === "global" || d.region === activeRegion,
  );
  hotLayer
    .selectAll("circle.hotspot")
    .data(data, (d) => d.city)
    .join("circle")
    .attr("class", "hotspot")
    .attr("cx", (d) => (projection([d.lon, d.lat]) || [-999, -999])[0])
    .attr("cy", (d) => (projection([d.lon, d.lat]) || [-999, -999])[1])
    .attr("r", (d) => (geoVisible(d) ? 12 + d.value / 3.8 : 0))
    .attr("fill", (d) =>
      d.value > 84 ? "rgba(255,64,84,0.28)" : "rgba(0,234,255,0.18)",
    )
    .attr("filter", "url(#hotGlow)")
    .attr("opacity", (d) => (geoVisible(d) ? 1 : 0));
}
function createScanner() {
  scannerLayer
    .append("circle")
    .attr("class", "scanner")
    .attr("cx", centerX)
    .attr("cy", centerY)
    .attr("r", baseRadius * 1.13);
  scannerLayer
    .append("line")
    .attr("class", "scanner-line")
    .attr("x1", centerX)
    .attr("y1", centerY)
    .attr("x2", centerX + baseRadius * 1.13)
    .attr("y2", centerY)
    .attr("stroke", "rgba(0,234,255,0.42)")
    .attr("stroke-width", 1.3)
    .attr("filter", "url(#outerGlow)");
}
function updateScanner(elapsed) {
  scannerLayer
    .select("circle")
    .attr("cx", centerX)
    .attr("cy", centerY)
    .attr("r", baseRadius * 1.13);
  scannerLayer
    .select("line")
    .attr("x1", centerX)
    .attr("y1", centerY)
    .attr("x2", centerX + baseRadius * 1.13)
    .attr("y2", centerY)
    .attr("transform", `rotate(${elapsed * 0.018}, ${centerX}, ${centerY})`);
}
function createStarfield() {
  const stars = d3.range(350).map((_, i) => ({
    x: Math.random() * width,
    y: Math.random() * height,
    r: Math.random() * 1.8 + 0.25,
    delay: Math.random() * 2.5,
  }));
  starsLayer
    .selectAll("circle.constellation-dot")
    .data(stars)
    .join("circle")
    .attr("class", "constellation-dot")
    .attr("cx", (d) => d.x)
    .attr("cy", (d) => d.y)
    .attr("r", (d) => d.r)
    .style("animation-delay", (d) => `${d.delay}s`);
  const lines = d3.range(86).map(() => ({
    a: stars[Math.floor(Math.random() * stars.length)],
    b: stars[Math.floor(Math.random() * stars.length)],
  }));
  starsLayer
    .selectAll("line.constellation-line")
    .data(lines)
    .join("line")
    .attr("class", "constellation-line")
    .attr("x1", (d) => d.a.x)
    .attr("y1", (d) => d.a.y)
    .attr("x2", (d) => d.b.x)
    .attr("y2", (d) => d.b.y)
    .attr("opacity", (d) =>
      Math.hypot(d.a.x - d.b.x, d.a.y - d.b.y) < 210 ? 1 : 0,
    );
}
function bindInteraction() {
  svg.call(
    d3
      .drag()
      .on("start", (event) => {
        autoRotate = false;
        d3.select("#autoRotate").classed("active", false);
        dragRotationStart = projection.rotate();
        dragPointStart = [event.x, event.y];
      })
      .on("drag", (event) => {
        requestAnimationFrame(() => {
          const dx = event.x - dragPointStart[0];
          const dy = event.y - dragPointStart[1];

          projection.rotate([
            dragRotationStart[0] + dx * 0.28,
            Math.max(-80, Math.min(80, dragRotationStart[1] - dy * 0.28)),
            dragRotationStart[2],
          ]);

          redrawProjection(false);
        });
      }),
  );
  svg.on(
    "wheel",
    (event) => {
      event.preventDefault();
      autoRotate = false;
      d3.select("#autoRotate").classed("active", false);
      currentScale = Math.max(
        baseRadius * 0.82,
        Math.min(
          baseRadius * 1.9,
          projection.scale() * (event.deltaY > 0 ? 0.94 : 1.06),
        ),
      );
      projection.scale(currentScale);
      redrawProjection();
    },
    { passive: false },
  );
}
function animate() {
  let lastRender = 0;

  d3.timer((elapsed) => {
    if (elapsed - lastRender < 33) return; // about 30fps, much smoother for heavy SVG
    lastRender = elapsed;

    const now = performance.now();
    const dt = Math.min(34, now - lastFrame);
    lastFrame = now;

    if (autoRotate) {
      const r = projection.rotate();
      projection.rotate([r[0] + dt * 0.0036, r[1], r[2]]);
      redrawProjection(false);
    }

    updateScanner(elapsed);
  });
}
function redrawProjection(includeLightning = true) {
  globeLayer.selectAll("path").attr("d", path);
  countryLayer.selectAll(".country").attr("d", path);
  backTraceLayer
    .selectAll("path.back-trace")
    .attr("d", (d) => routePath(d, 0.55));
  routeLayer
    .selectAll("path.arc")
    .attr("d", routePath)
    .attr("opacity", (d) =>
      geoVisible(d.source) || geoVisible(d.target) ? 0.58 : 0.045,
    );
  routeLayer
    .selectAll("path.arc-core")
    .attr("d", routePath)
    .attr("opacity", (d) =>
      geoVisible(d.source) || geoVisible(d.target) ? 0.5 : 0.03,
    );
  if (includeLightning)
    lightningLayer.selectAll("path.lightning").attr("d", lightningPath);
  nodeLayer
    .selectAll("g.node")
    .attr("transform", (d) => {
      const p = projection([d.lon, d.lat]);
      return p ? `translate(${p[0]},${p[1]})` : "translate(-999,-999)";
    })
    .attr("opacity", (d) => (geoVisible(d) ? 1 : 0.055));
  hotLayer
    .selectAll("circle.hotspot")
    .attr("cx", (d) => (projection([d.lon, d.lat]) || [-999, -999])[0])
    .attr("cy", (d) => (projection([d.lon, d.lat]) || [-999, -999])[1])
    .attr("r", (d) => (geoVisible(d) ? 12 + d.value / 3.8 : 0))
    .attr("opacity", (d) => (geoVisible(d) ? 1 : 0));
}
function focusRegion(regionKey, duration = 1200) {
  activeRegion = regionKey;
  const region = regions[regionKey];
  if (regionKey !== "global") autoRotate = false;
  d3.select("#autoRotate").classed("active", autoRotate);
  d3.transition()
    .duration(duration)
    .ease(d3.easeCubicInOut)
    .tween("rotate-scale", () => {
      const ri = d3.interpolateArray(projection.rotate(), region.rotate);
      const si = d3.interpolateNumber(
        projection.scale(),
        baseRadius * region.scale,
      );
      return (t) => {
        projection.rotate(ri(t)).scale(si(t));
        currentScale = projection.scale();
        redrawProjection();
      };
    })
    .on("end", () => {
      refreshUI();
      pinBestTooltip();
    });
  document.querySelector("#regionLabel").textContent = region.label;
}
function pinBestTooltip() {
  const best = hubs
    .filter((d) => activeRegion === "global" || d.region === activeRegion)
    .sort((a, b) => b.value - a.value)[0];
  if (!best) return;
  const p = projection([best.lon, best.lat]);
  if (!p || !geoVisible(best)) return;
  tooltip
    .classed("show", true)
    .style("left", `${p[0]}px`)
    .style("top", `${p[1]}px`)
    .html(nodeTooltipHTML(best));
  setTimeout(() => tooltip.classed("show", false), 2300);
}
function showNodeTooltip(event, d) {
  tooltip
    .classed("show", true)
    .style("left", `${event.clientX}px`)
    .style("top", `${event.clientY}px`)
    .html(nodeTooltipHTML(d));
}
function nodeTooltipHTML(d) {
  const related = arcs.filter(
    (a) => a.source.city === d.city || a.target.city === d.city,
  );
  return `<h3>${d.city}, ${d.country}</h3><p>Region: <strong>${regions[d.region].label}</strong></p><p>Signal Strength: <strong>${d.value}%</strong></p><p>Inbound / Outbound: <strong>${related.filter((a) => a.target.city === d.city).length}</strong> / <strong>${related.filter((a) => a.source.city === d.city).length}</strong></p><p>Critical Alerts: <strong style="color:#ff4054">${related.filter((a) => a.severity === "critical").length}</strong></p>`;
}
function showCountryTooltip(event) {
  tooltip
    .classed("show", true)
    .style("left", `${event.clientX}px`)
    .style("top", `${event.clientY}px`)
    .html(
      `<h3>COUNTRY NODE</h3><p>Hover city hubs for exact telemetry.</p><p>Drag to rotate. Scroll to zoom.</p>`,
    );
}
function hideTooltip() {
  tooltip.classed("show", false);
}
function spawnParticle(d) {
  const route = routePath(d);
  if (!route) return;
  const temp = particleLayer
    .append("path")
    .attr("d", route)
    .attr("fill", "none")
    .attr("stroke", "none");
  const node = temp.node();
  let len = 0;
  try {
    len = node.getTotalLength();
  } catch (e) {}
  if (!len) {
    temp.remove();
    return;
  }
  const particle = particleLayer
    .append("circle")
    .attr("class", "particle")
    .attr("r", d.severity === "critical" ? 3.7 : 2.4)
    .attr("fill", severities[d.severity].color);
  particle
    .transition()
    .duration(1100 + Math.random() * 950)
    .ease(d3.easeCubicInOut)
    .attrTween("transform", () => (t) => {
      const p = node.getPointAtLength(t * len);
      return `translate(${p.x},${p.y})`;
    })
    .attr("opacity", 0.03)
    .remove();
  temp.remove();
}
function startTelemetry() {
  setInterval(() => {
    const visible = arcs.filter(routeVisible);
    d3.shuffle(visible).slice(0, 3).forEach(spawnParticle);
    if (Math.random() > 0.5) {
      const i = Math.floor(Math.random() * arcs.length);
      arcs[i] = makeArc(arcs[i].id);
      drawAll();
      refreshUI();
    }
  }, 1200);
}
function refreshUI() {
  const relevant = arcs.filter(routeVisible);
  const critical = relevant.filter((d) => d.severity === "critical").length;
  const high = relevant.filter((d) => d.severity === "high").length;
  const risk = Math.min(
    99,
    Math.round(critical * 9.5 + high * 4.5 + relevant.length * 0.65),
  );
  animateNumber("#routeStat", relevant.length, "");
  animateNumber("#criticalCount", critical, "");
  animateNumber("#highCount", high, "");
  animateNumber(
    "#blockedCount",
    Math.round(d3.sum(relevant, (d) => d.packets) / 1000),
    "K",
  );
  animateNumber("#riskScore", risk, "%");
  refreshRanks();
  refreshFeed();
}
function animateNumber(selector, value, suffix) {
  const el = d3.select(selector);
  const previous = Number(el.attr("data-value")) || 0;
  el.attr("data-value", value);
  el.transition()
    .duration(520)
    .tween("text", function () {
      const i = d3.interpolateNumber(previous, value);
      return (t) =>
        (this.textContent = Math.round(i(t)).toLocaleString() + suffix);
    });
}
function refreshRanks() {
  const visible = arcs.filter(routeVisible);
  renderRank(
    "#originRank",
    d3
      .rollups(
        visible,
        (v) => v.length,
        (d) => d.source.city,
      )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5),
  );
  renderRank(
    "#targetRank",
    d3
      .rollups(
        visible,
        (v) => v.length,
        (d) => d.target.city,
      )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5),
  );
}
function renderRank(selector, data) {
  const max = d3.max(data, (d) => d[1]) || 1;
  d3.select(selector)
    .selectAll(".rank-row")
    .data(data, (d) => d[0])
    .join("div")
    .attr("class", "rank-row")
    .html(
      (d, i) =>
        `<span>${i + 1}</span><strong>${d[0].toUpperCase()}</strong><span class="bar" style="--w:${Math.round((d[1] / max) * 100)}%"><i></i></span><em>${d[1]}</em>`,
    );
}
function refreshFeed() {
  const items = d3.shuffle(arcs.filter(routeVisible)).slice(0, 5);
  d3.select("#feed")
    .selectAll(".feed-item")
    .data(items, (d) => `${d.id}-${d.type}-${d.packets}`)
    .join(
      (enter) =>
        enter
          .append("div")
          .attr("class", "feed-item")
          .html(
            (d) =>
              `<span class="severity" style="color:${severities[d.severity].color}">${severities[d.severity].label}</span><span>${d.type}: ${d.source.city} → ${d.target.city}</span><strong>${d.packets.toLocaleString()}</strong>`,
          ),
      (update) => update,
      (exit) => exit.transition().duration(180).style("opacity", 0).remove(),
    );
}
function updateClock() {
  document.getElementById("clock").textContent =
    new Date().toLocaleTimeString();
}

document.querySelectorAll("button[data-filter]").forEach((button) =>
  button.addEventListener("click", () => {
    document
      .querySelectorAll("button[data-filter]")
      .forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");
    activeFilter = button.dataset.filter;
    drawAll();
    refreshUI();
  }),
);
document
  .querySelector("#regionFilter")
  .addEventListener("change", (event) => focusRegion(event.target.value));
document.querySelector("#replay").addEventListener("click", () =>
  d3
    .shuffle(arcs.filter(routeVisible))
    .slice(0, 26)
    .forEach((d, i) => setTimeout(() => spawnParticle(d), i * 55)),
);
document.querySelector("#autoRotate").addEventListener("click", (event) => {
  autoRotate = !autoRotate;
  event.currentTarget.classList.toggle("active", autoRotate);
});
document.querySelector("#resetView").addEventListener("click", () => {
  document.querySelector("#regionFilter").value = "global";
  activeRegion = "global";
  activeFilter = "all";
  document
    .querySelectorAll("button[data-filter]")
    .forEach((btn) =>
      btn.classList.toggle("active", btn.dataset.filter === "all"),
    );
  autoRotate = true;
  document.querySelector("#autoRotate").classList.add("active");
  focusRegion("global");
  refreshUI();
});
window.addEventListener("resize", () => location.reload());
