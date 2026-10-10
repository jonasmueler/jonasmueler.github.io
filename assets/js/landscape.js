/*
 * Flight through a loss landscape.
 * The camera follows an optimizer down a winding ravine while the optimizer's steps
 * zig-zag between the valley walls, the way SGD does in ill-conditioned problems.
 * Plain WebGL2, no dependencies. Without WebGL2 the hero falls back to the video.
 */
(function () {
  'use strict';

  var canvas = document.getElementById('landscape');
  if (!canvas) return;
  var hero = canvas.closest('.hero');

  function fallback() {
    hero.classList.add('no-webgl');
    var v = hero.querySelector('.hero-fallback');
    if (v && !reduceMotion) { v.play().catch(function () {}); }
  }

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gl = null;
  try {
    gl = canvas.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'low-power' });
  } catch (e) { gl = null; }
  if (!gl) { fallback(); return; }

  // ------------------------------------------------------------------
  // The landscape. Every z-frequency is a multiple of W, so the world
  // repeats exactly every PERIOD units and coordinates stay small.
  // ------------------------------------------------------------------
  var PERIOD = 880.0;
  var W = 2 * Math.PI / PERIOD;
  var TILT = 0.10;      // overall downhill slope: the loss keeps going down
  var SPEED = 3.0;      // world units per second
  var STEP = 0.55;      // distance between optimizer steps
  var EYE = 1.45;        // camera height above the valley floor

  function sstep(a, b, x) { var t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); }
  function pathX(z) { return 3.2 * Math.sin(6 * W * z) + 1.7 * Math.sin(15 * W * z + 1.3); }
  function rel(x, z) {
    var d = x - pathX(z), ad = Math.abs(d);
    var valley = 2.6 * (1 - Math.exp(-d * d / 18)) + 0.004 * d * d;
    var hills = (1.4 * Math.sin(x * 0.09 + 0.7) * Math.cos(10 * W * z) + 0.9 * Math.sin(x * 0.05 - 5 * W * z)) * sstep(3, 14, ad);
    var rip = 0.32 * Math.sin(x * 0.55 + 0.4) * Math.cos(66 * W * z)
            + 0.12 * Math.sin(x * 1.3) * Math.cos(154 * W * z + 0.8)
            + 0.05 * Math.sin(x * 2.7 + 294 * W * z);
    rip *= 0.35 + 0.65 * sstep(0, 4, ad);
    var ridge = 0.7 * sstep(2.5, 9, ad) * Math.abs(Math.sin(x * 0.31 + 1.7 * Math.sin(31 * W * z)));
    return valley + hills + rip + ridge;
  }

  var GLSL_COMMON = [
    'const float W = ' + W.toFixed(9) + ';',
    'const float TILT = ' + TILT.toFixed(3) + ';',
    'float pathX(float z){ return 3.2*sin(6.0*W*z) + 1.7*sin(15.0*W*z + 1.3); }',
    'float rel(float x, float z){',
    '  float d = x - pathX(z); float ad = abs(d);',
    '  float valley = 2.6*(1.0 - exp(-d*d/18.0)) + 0.004*d*d;',
    '  float hills = (1.4*sin(x*0.09 + 0.7)*cos(10.0*W*z) + 0.9*sin(x*0.05 - 5.0*W*z)) * smoothstep(3.0, 14.0, ad);',
    '  float rip = 0.32*sin(x*0.55 + 0.4)*cos(66.0*W*z) + 0.12*sin(x*1.3)*cos(154.0*W*z + 0.8) + 0.05*sin(x*2.7 + 294.0*W*z);',
    '  rip *= 0.35 + 0.65*smoothstep(0.0, 4.0, ad);',
    '  float ridge = 0.7*smoothstep(2.5, 9.0, ad)*abs(sin(x*0.31 + 1.7*sin(31.0*W*z)));',
    '  return valley + hills + rip + ridge;',
    '}'
  ].join('\n');

  // ------------------------------------------------------------------
  // Shaders
  // ------------------------------------------------------------------
  var TERRAIN_VS = '#version 300 es\nprecision highp float;\n' + GLSL_COMMON + '\n' + [
    'in vec2 aPos;',
    'uniform vec2 uSample;   // world xz of the grid origin, z wrapped to one period',
    'uniform vec3 uOffset;   // grid origin minus camera (x, eye height, z)',
    'uniform mat4 uViewProj;',
    'out vec3 vPos; out vec3 vNormal; out vec2 vXZ; out float vRel;',
    'void main(){',
    '  vec2 s = aPos + uSample;',
    '  float r = rel(s.x, s.y);',
    '  float e = 0.12;',
    '  float dx = rel(s.x + e, s.y) - rel(s.x - e, s.y);',
    '  float dz = rel(s.x, s.y + e) - rel(s.x, s.y - e) - TILT*2.0*e;',
    '  vNormal = normalize(vec3(-dx, 2.0*e, -dz));',
    '  float rz = aPos.y + uOffset.z;',
    '  vPos = vec3(aPos.x + uOffset.x, r - TILT*rz - uOffset.y, rz);',
    '  vXZ = s; vRel = r;',
    '  gl_Position = uViewProj * vec4(vPos, 1.0);',
    '}'
  ].join('\n');

  var TERRAIN_FS = '#version 300 es\nprecision highp float;\n' + [
    'in vec3 vPos; in vec3 vNormal; in vec2 vXZ; in float vRel;',
    'uniform vec3 uFog; uniform float uTime;',
    'out vec4 o;',
    'float lines(vec2 p){',
    '  vec2 w = fwidth(p);',
    '  vec2 g = abs(fract(p - 0.5) - 0.5) / max(w, 1e-4);',
    '  float l = 1.0 - min(min(g.x, g.y), 1.0);',
    '  return l * (1.0 - smoothstep(0.3, 0.8, max(w.x, w.y)));',
    '}',
    'void main(){',
    '  vec3 n = normalize(vNormal);',
    '  vec3 v = normalize(-vPos);',
    '  float dist = length(vPos);',
    '  vec3 L = normalize(vec3(-0.45, 0.75, 0.5));',
    '  float diff = max(dot(n, L), 0.0);',
    '  float h = clamp(vRel/4.0, 0.0, 1.0);',
    // dark glassy fill: navy in the valley, violet-black on the ridges
    '  vec3 col = mix(vec3(0.020, 0.055, 0.15), vec3(0.035, 0.020, 0.10), h) * (0.45 + 0.9*diff);',
    '  col += vec3(0.10, 0.26, 0.70) * diff * (1.0 - h) * 0.30;',
    // rim light on silhouettes
    '  float fres = pow(1.0 - max(dot(n, v), 0.0), 4.0);',
    '  col += mix(vec3(0.25, 0.55, 1.0), vec3(0.55, 0.35, 1.0), h) * fres * 0.45;',
    // the minimum glows
    '  col += vec3(0.50, 0.80, 1.00) * exp(-vRel*5.0) * 0.55;',
    // grid: cyan in the valley, violet on the ridges; a pulse runs down the ravine
    '  vec3 lc = mix(vec3(0.40, 0.85, 1.00), vec3(0.65, 0.45, 1.00), smoothstep(0.4, 4.0, vRel));',
    '  float fade = exp(-dist*0.016);',
    '  float pulse = 0.75 + 0.25*sin(vXZ.y*0.35 - uTime*2.2);',
    '  col += lc * lines(vXZ*0.5) * 0.95 * fade * pulse;',
    '  col += vec3(0.80, 0.92, 1.00) * lines(vec2(vRel*2.5, 0.5)) * 0.12 * fade;',
    '  float f = 1.0 - exp(-pow(dist*0.016, 1.7));',
    '  o = vec4(mix(col, uFog, f), 1.0);',
    '}'
  ].join('\n');

  var SKY_VS = '#version 300 es\nprecision highp float;\nout vec2 vUv;\nvoid main(){ vec2 p = vec2(float((gl_VertexID<<1)&2), float(gl_VertexID&2)); vUv = p; gl_Position = vec4(p*2.0-1.0, 0.0, 1.0); }';
  var SKY_FS = '#version 300 es\nprecision highp float;\n' + [
    'in vec2 vUv;',
    'uniform vec3 uR; uniform vec3 uU; uniform vec3 uF; uniform vec2 uTan; uniform float uTime; uniform vec3 uFog;',
    'out vec4 o;',
    'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)))*43758.5453); }',
    'void main(){',
    '  vec2 s = vUv*2.0 - 1.0;',
    '  vec3 d = normalize(uF + s.x*uTan.x*uR + s.y*uTan.y*uU);',
    '  float el = d.y; float az = atan(d.x, d.z);',
    '  vec3 col = mix(uFog, vec3(0.0, 0.004, 0.018), smoothstep(-0.04, 0.42, el));',
    // aurora: curtains with a sharp lower edge that fade upwards, drifting slowly
    '  float y0 = 0.075 + 0.035*sin(az*2.1 + uTime*0.05) + 0.015*sin(az*5.3 - uTime*0.08);',
    '  float above = el - y0;',
    '  float sheet = smoothstep(-0.012, 0.008, above) * exp(-max(above, 0.0)/0.13);',
    '  float rays = 0.55 + 0.45*sin(az*70.0 + 4.0*sin(az*6.0 + uTime*0.12) + uTime*0.3);',
    '  rays *= 0.6 + 0.4*sin(az*23.0 - uTime*0.17);',
    '  float swell = smoothstep(0.15, 0.85, 0.5 + 0.5*sin(az*1.7 + uTime*0.04));',
    '  vec3 ac = mix(vec3(0.15, 0.85, 0.75), vec3(0.45, 0.35, 1.00), smoothstep(0.0, 0.14, above));',
    '  col += ac * sheet * rays * swell * 0.32;',
    // stars
    '  vec2 g = vec2(az, el)*140.0;',
    '  vec2 cell = floor(g); vec2 f = fract(g) - 0.5;',
    '  float hs = hash(cell);',
    '  vec2 jit = vec2(hash(cell + 7.1), hash(cell + 3.3)) - 0.5;',
    '  float star = step(0.976, hs) * smoothstep(0.24, 0.0, length(f - jit*0.5)) * smoothstep(0.03, 0.2, el);',
    '  star *= 0.55 + 0.45*sin(uTime*(1.5 + hs*3.0) + hs*60.0);',
    '  col += vec3(0.85, 0.90, 1.00) * star * (0.7 + 0.9*fract(hs*91.0));',
    '  o = vec4(col, 1.0);',
    '}'
  ].join('\n');

  // floating dust: a box of motes that wraps around the camera
  var MOTE_VS = '#version 300 es\nprecision highp float;\n' + [
    'in vec3 aSeed;',
    'uniform mat4 uViewProj; uniform vec3 uCam; uniform float uTime; uniform float uScale;',
    'out float vA;',
    'void main(){',
    '  vec3 box = vec3(48.0, 10.0, 70.0);',
    '  vec3 p = aSeed*box + vec3(sin(uTime*0.3 + aSeed.y*20.0), 0.35*uTime + aSeed.x*3.0, 0.0);',
    '  vec3 r = mod(p - uCam, box) - vec3(box.x*0.5, box.y*0.35, 4.0);',
    '  vec4 c = uViewProj*vec4(r, 1.0);',
    '  gl_Position = c;',
    '  float dist = length(r);',
    '  gl_PointSize = (0.06 + 0.08*aSeed.z)*uScale/max(c.w, 0.1);',
    '  vA = smoothstep(1.5, 6.0, dist) * (1.0 - smoothstep(30.0, 60.0, dist)) * (0.35 + 0.65*fract(aSeed.x*53.0));',
    '}'
  ].join('\n');
  var MOTE_FS = '#version 300 es\nprecision highp float;\nin float vA; out vec4 o;\nvoid main(){ float r = length(gl_PointCoord - 0.5)*2.0; float a = smoothstep(1.0, 0.0, r); o = vec4(vec3(0.55, 0.75, 1.0)*a*a*vA*0.8, 1.0); }';

  var DOT_VS = '#version 300 es\nprecision highp float;\n' + [
    'in vec3 aP; in vec2 aSA;',
    'uniform mat4 uViewProj; uniform float uScale;',
    'out float vA;',
    'void main(){ vec4 c = uViewProj*vec4(aP, 1.0); gl_Position = c; gl_PointSize = aSA.x*uScale/max(c.w, 0.1); vA = aSA.y; }'
  ].join('\n');
  var DOT_FS = '#version 300 es\nprecision highp float;\n' + [
    'in float vA; uniform int uMode; out vec4 o;',
    'void main(){',
    '  if (uMode == 1) { o = vec4(vec3(1.00, 0.66, 0.25)*vA*0.85, 1.0); return; }',
    '  float r = length(gl_PointCoord - 0.5)*2.0;',
    '  float halo = smoothstep(1.0, 0.0, r);',
    '  float core = smoothstep(0.35, 0.0, r);',
    '  vec3 c = vec3(1.00, 0.55, 0.12)*halo*halo*1.5 + vec3(1.0, 0.82, 0.48)*core*0.85;',
    '  o = vec4(c*vA, 1.0);',
    '}'
  ].join('\n');

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { throw new Error(gl.getShaderInfoLog(s)); }
    return s;
  }
  function program(vs, fs) {
    var p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { throw new Error(gl.getProgramInfoLog(p)); }
    return p;
  }

  var terrainProg, skyProg, dotProg, moteProg;
  try {
    terrainProg = program(TERRAIN_VS, TERRAIN_FS);
    skyProg = program(SKY_VS, SKY_FS);
    dotProg = program(DOT_VS, DOT_FS);
    moteProg = program(MOTE_VS, MOTE_FS);
  } catch (e) {
    if (window.console) console.warn('landscape:', e);
    fallback(); return;
  }

  // ------------------------------------------------------------------
  // Geometry: one grid that travels with the camera, snapped so vertices
  // always sample the same world points (no shimmering).
  // ------------------------------------------------------------------
  var small = Math.min(window.innerWidth, window.innerHeight) < 700;
  var CELL = small ? 0.9 : 0.6;
  var HALF_W = 100, BACK = 6, AHEAD = 120;
  var nx = Math.round(2 * HALF_W / CELL), nz = Math.round((BACK + AHEAD) / CELL);
  var verts = new Float32Array((nx + 1) * (nz + 1) * 2);
  var vi = 0;
  for (var j = 0; j <= nz; j++) {
    for (var i = 0; i <= nx; i++) { verts[vi++] = -HALF_W + i * CELL; verts[vi++] = -BACK + j * CELL; }
  }
  var idx = new Uint32Array(nx * nz * 6);
  var ii = 0;
  for (j = 0; j < nz; j++) {
    for (i = 0; i < nx; i++) {
      var a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
      idx[ii++] = a; idx[ii++] = c; idx[ii++] = b;
      idx[ii++] = b; idx[ii++] = c; idx[ii++] = d;
    }
  }
  var terrainVao = gl.createVertexArray();
  gl.bindVertexArray(terrainVao);
  var vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
  var aPos = gl.getAttribLocation(terrainProg, 'aPos');
  gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  var ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
  gl.bindVertexArray(null);

  var skyVao = gl.createVertexArray();

  var MAX_DOTS = 64;
  var dotData = new Float32Array(MAX_DOTS * 5);
  var dotVao = gl.createVertexArray();
  gl.bindVertexArray(dotVao);
  var db = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, db); gl.bufferData(gl.ARRAY_BUFFER, dotData.byteLength, gl.DYNAMIC_DRAW);
  var aP = gl.getAttribLocation(dotProg, 'aP'), aSA = gl.getAttribLocation(dotProg, 'aSA');
  gl.enableVertexAttribArray(aP); gl.vertexAttribPointer(aP, 3, gl.FLOAT, false, 20, 0);
  gl.enableVertexAttribArray(aSA); gl.vertexAttribPointer(aSA, 2, gl.FLOAT, false, 20, 12);
  gl.bindVertexArray(null);

  var MOTES = small ? 220 : 420;
  var seeds = new Float32Array(MOTES * 3);
  for (var m = 0; m < seeds.length; m++) seeds[m] = Math.random();
  var moteVao = gl.createVertexArray();
  gl.bindVertexArray(moteVao);
  var mb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, mb); gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);
  var aSeed = gl.getAttribLocation(moteProg, 'aSeed');
  gl.enableVertexAttribArray(aSeed); gl.vertexAttribPointer(aSeed, 3, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  var U = {
    t: { sample: gl.getUniformLocation(terrainProg, 'uSample'), offset: gl.getUniformLocation(terrainProg, 'uOffset'),
         vp: gl.getUniformLocation(terrainProg, 'uViewProj'), fog: gl.getUniformLocation(terrainProg, 'uFog'),
         time: gl.getUniformLocation(terrainProg, 'uTime') },
    s: { r: gl.getUniformLocation(skyProg, 'uR'), u: gl.getUniformLocation(skyProg, 'uU'), f: gl.getUniformLocation(skyProg, 'uF'),
         tan: gl.getUniformLocation(skyProg, 'uTan'), time: gl.getUniformLocation(skyProg, 'uTime'), fog: gl.getUniformLocation(skyProg, 'uFog') },
    m: { vp: gl.getUniformLocation(moteProg, 'uViewProj'), cam: gl.getUniformLocation(moteProg, 'uCam'),
         time: gl.getUniformLocation(moteProg, 'uTime'), scale: gl.getUniformLocation(moteProg, 'uScale') },
    d: { vp: gl.getUniformLocation(dotProg, 'uViewProj'), scale: gl.getUniformLocation(dotProg, 'uScale'), mode: gl.getUniformLocation(dotProg, 'uMode') }
  };
  var FOG = [0.055, 0.075, 0.21];

  // ------------------------------------------------------------------
  // Small matrix helpers (column-major, like GL)
  // ------------------------------------------------------------------
  function perspective(fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
  }
  function norm(v) { var l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  var basis = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
  function lookFrom0(fwd, up) {
    var z = norm([-fwd[0], -fwd[1], -fwd[2]]);
    var x = norm(cross(up, z));
    var y = cross(z, x);
    basis.x = x; basis.y = y; basis.z = z;
    return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, 0, 0, 0, 1];
  }
  function mul(a, b) {
    var o = new Array(16);
    for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    return o;
  }
  // ------------------------------------------------------------------
  // Sizing
  // ------------------------------------------------------------------
  var scale = 1;
  var dprCap = small ? 1.5 : 1.75;
  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, dprCap) * scale;
    var w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    var h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  }
  if (window.ResizeObserver) { new ResizeObserver(function () { resize(); if (!running) draw(lastT); }).observe(canvas); }
  window.addEventListener('resize', resize);
  resize();

  var mouse = [0, 0], mouseS = [0, 0];
  window.addEventListener('pointermove', function (e) {
    mouse[0] = (e.clientX / window.innerWidth) * 2 - 1;
    mouse[1] = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  // ------------------------------------------------------------------
  // Training read-out (purely decorative)
  // ------------------------------------------------------------------
  var hud = document.getElementById('landscape-hud');
  var lastHud = 0;
  function updateHud(camZ, now) {
    if (!hud || now - lastHud < 120) return;
    lastHud = now;
    var k = Math.floor(camZ / STEP);
    var T = 2000, ph = (k % T) / T;
    var lr = 1e-5 + 0.5 * (3e-3 - 1e-5) * (1 + Math.cos(Math.PI * ph));   // cosine schedule with warm restarts
    var loss = 0.018 + 2.3 * Math.exp(-k / 700) + 0.012 * Math.abs(Math.sin(k * 1.7)) + 0.03 * Math.exp(-ph * 8) * (k > T ? 1 : 0);
    hud.textContent = 'step ' + k.toLocaleString('en-US') + '   loss ' + loss.toFixed(4) + '   lr ' + lr.toExponential(1);
  }

  // ------------------------------------------------------------------
  // Frame
  // ------------------------------------------------------------------
  function floorAt(z) { var x = pathX(z); return rel(x, z); }

  function draw(t) {
    var camZ = t * SPEED;
    var camX = pathX(camZ) + 0.25 * Math.sin(t * 0.31);
    var floorY = (floorAt(camZ - 1.5) + floorAt(camZ) + floorAt(camZ + 1.5)) / 3;
    var eye = floorY + EYE;

    // where the camera looks: further down the ravine
    mouseS[0] += (mouse[0] - mouseS[0]) * 0.04;
    mouseS[1] += (mouse[1] - mouseS[1]) * 0.04;
    var ahead = 16;
    var tz = camZ + ahead, tx = pathX(tz) + mouseS[0] * 2.5;
    var ty = floorAt(tz) - TILT * ahead + 0.25 - mouseS[1] * 1.2;
    var fwd = [tx - camX, ty - eye, ahead];

    // bank into the curves
    var d2 = (pathX(camZ + 4) - 2 * pathX(camZ) + pathX(camZ - 4)) / 16;
    var roll = Math.max(-0.2, Math.min(0.2, d2 * 7));
    var up = [Math.sin(roll), Math.cos(roll), 0];

    var aspect = canvas.width / canvas.height;
    var hfov = 100 * Math.PI / 180;
    var fovy = 2 * Math.atan(Math.tan(hfov / 2) / aspect);
    fovy = Math.min(Math.max(fovy, 34 * Math.PI / 180), 68 * Math.PI / 180);
    var vp = mul(perspective(fovy, aspect, 0.05, 400), lookFrom0(fwd, up));

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // sky
    var tanY = Math.tan(fovy / 2);
    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(skyProg);
    gl.uniform3fv(U.s.r, basis.x);
    gl.uniform3fv(U.s.u, basis.y);
    gl.uniform3f(U.s.f, -basis.z[0], -basis.z[1], -basis.z[2]);
    gl.uniform2f(U.s.tan, tanY * aspect, tanY);
    gl.uniform1f(U.s.time, t);
    gl.uniform3fv(U.s.fog, FOG);
    gl.bindVertexArray(skyVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // terrain
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.useProgram(terrainProg);
    var ox = Math.round(camX / CELL) * CELL, oz = Math.round(camZ / CELL) * CELL;
    var ozWrapped = oz - Math.floor(oz / PERIOD) * PERIOD;
    gl.uniform2f(U.t.sample, ox, ozWrapped);
    gl.uniform3f(U.t.offset, ox - camX, eye, oz - camZ);
    gl.uniformMatrix4fv(U.t.vp, false, vp);
    gl.uniform3fv(U.t.fog, FOG);
    gl.uniform1f(U.t.time, t);
    gl.bindVertexArray(terrainVao);
    gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_INT, 0);

    gl.depthMask(false);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(moteProg);
    gl.uniformMatrix4fv(U.m.vp, false, vp);
    var wy = eye - TILT * camZ;   // camera height in world space, wrapped to the mote box so floats stay small
    gl.uniform3f(U.m.cam, camX - Math.floor(camX / 48) * 48, wy - Math.floor(wy / 10) * 10, camZ - Math.floor(camZ / 70) * 70);
    gl.uniform1f(U.m.time, t);
    gl.uniform1f(U.m.scale, canvas.height * 0.9);
    gl.bindVertexArray(moteVao);
    gl.drawArrays(gl.POINTS, 0, MOTES);
    gl.disable(gl.BLEND);
    gl.depthMask(true);

    // optimizer steps: alternate sides of the ravine, like SGD with too large a step size
    var head = camZ + 9;
    var kFirst = Math.ceil((camZ + 1.0) / STEP), kLast = Math.floor(head / STEP);
    var n = 0;
    for (var k = kFirst; k <= kLast && n < MAX_DOTS; k++) {
      var zk = k * STEP;
      var amp = 0.35 + 0.45 * Math.pow(Math.sin(zk * 0.021), 2);
      var xk = pathX(zk) + (k % 2 === 0 ? 1 : -1) * amp;
      var yk = rel(xk, zk) - TILT * (zk - camZ) - eye + 0.07;
      var age = (head - zk) / (head - camZ);        // 0 at the head, 1 near the camera
      var isHead = k === kLast;
      var o = n * 5;
      dotData[o] = xk - camX; dotData[o + 1] = yk; dotData[o + 2] = zk - camZ;
      dotData[o + 3] = isHead ? 1.0 + 0.2 * Math.sin(t * 6) : 0.55;
      dotData[o + 4] = isHead ? 1.0 : 0.25 + 0.6 * (1 - age);
      n++;
    }
    gl.useProgram(dotProg);
    gl.uniformMatrix4fv(U.d.vp, false, vp);
    gl.uniform1f(U.d.scale, canvas.height * 0.9);
    gl.bindVertexArray(dotVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, db);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, dotData.subarray(0, n * 5));
    gl.depthMask(false);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    if (n > 1) { gl.uniform1i(U.d.mode, 1); gl.drawArrays(gl.LINE_STRIP, 0, n); }
    gl.uniform1i(U.d.mode, 0);
    gl.drawArrays(gl.POINTS, 0, n);
    gl.disable(gl.BLEND);
    gl.depthMask(true);
    gl.bindVertexArray(null);

    updateHud(camZ, performance.now());
  }

  // ------------------------------------------------------------------
  // Loop: pause when off screen or in a background tab; lower the
  // resolution if the device struggles.
  // ------------------------------------------------------------------
  var params = new URLSearchParams(window.location.search);
  var simT = parseFloat(params.get('t0')) || 0;   // ?t0=60 starts a minute into the flight
  var lastT = simT, prev = 0, running = false, visible = true, raf = 0;
  var slowFrames = 0, frames = 0;

  function loop(now) {
    raf = 0;
    if (!running) return;
    var dt = prev ? Math.min((now - prev) / 1000, 0.05) : 0;
    prev = now;
    simT += dt; lastT = simT;
    draw(simT);
    if (dt > 0.034) slowFrames++;
    if (++frames === 90 && slowFrames > 45 && scale > 0.6) { scale = 0.66; resize(); }
    raf = requestAnimationFrame(loop);
  }
  function start() {
    if (running || reduceMotion || !visible || document.hidden) return;
    running = true; prev = 0; raf = requestAnimationFrame(loop);
  }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

  canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); stop(); fallback(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
  if (window.IntersectionObserver) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) start(); else stop();
    }).observe(hero);
  }

  hero.classList.add('has-webgl');
  if (reduceMotion) { draw(simT || 40); updateHud(0, Infinity); } else { draw(simT); start(); }
})();
