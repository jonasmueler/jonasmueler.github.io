/*
 * Home-page banner: a loss surface with gradient descent rolling into a minimum.
 *
 * The surface is the same function as the original matplotlib animation
 * (three Gaussian wells plus ripples), drawn with matplotlib's "Blues" colormap.
 * A gradient-descent-with-momentum path is computed from the formula and drawn
 * on the surface.
 *
 * Plain WebGL2, no dependencies. Without WebGL2 the poster image stays visible.
 */
(function () {
  'use strict';

  var canvas = document.getElementById('surface');
  if (!canvas) return;
  var hero = canvas.closest('.hero');
  var params = new URLSearchParams(window.location.search);
  if (params.has('clean')) document.documentElement.classList.add('hero-clean');   // for making the poster

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gl = null;
  try { gl = canvas.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'low-power' }); } catch (e) { gl = null; }
  if (!gl) return;

  // ------------------------------------------------------------------ the surface
  function f(x, y) {
    var z1 = Math.exp(-((x - 0.5) * (x - 0.5) + (y - 0.5) * (y - 0.5)) / 0.3) * 1.2;
    var z2 = Math.exp(-((x + 0.7) * (x + 0.7) + (y + 0.5) * (y + 0.5)) / 0.25) * 0.9;
    var z3 = Math.exp(-((x - 0.3) * (x - 0.3) + (y + 0.8) * (y + 0.8)) / 0.35) * 0.7;
    var ripple = Math.sin(3 * x) * Math.cos(3 * y) * 0.15;
    var noise = (Math.sin(8 * x) * Math.cos(8 * y) + Math.sin(12 * x) * Math.cos(12 * y)) * 0.05;
    return -(z1 + z2 + z3) + ripple + noise - 0.3;
  }
  var GLSL_F = [
    'float f(float x, float y){',
    '  float z1 = exp(-((x-0.5)*(x-0.5) + (y-0.5)*(y-0.5))/0.3)*1.2;',
    '  float z2 = exp(-((x+0.7)*(x+0.7) + (y+0.5)*(y+0.5))/0.25)*0.9;',
    '  float z3 = exp(-((x-0.3)*(x-0.3) + (y+0.8)*(y+0.8))/0.35)*0.7;',
    '  float ripple = sin(3.0*x)*cos(3.0*y)*0.15;',
    '  float noise = (sin(8.0*x)*cos(8.0*y) + sin(12.0*x)*cos(12.0*y))*0.05;',
    '  return -(z1 + z2 + z3) + ripple + noise - 0.3;',
    '}'
  ].join('\n');

  var ZMIN = -1.525, ZMAX = -0.096;   // range of f on [-2, 2]^2
  var ZS = 1.45;                      // vertical exaggeration, close to the matplotlib box aspect

  // matplotlib "Blues", 9 stops
  var GLSL_BLUES = [
    'vec3 blues(float t){',
    '  vec3 c[9];',
    '  c[0]=vec3(0.969,0.984,1.000); c[1]=vec3(0.871,0.922,0.969); c[2]=vec3(0.776,0.859,0.937);',
    '  c[3]=vec3(0.620,0.792,0.882); c[4]=vec3(0.420,0.682,0.839); c[5]=vec3(0.259,0.573,0.776);',
    '  c[6]=vec3(0.129,0.443,0.710); c[7]=vec3(0.031,0.318,0.612); c[8]=vec3(0.031,0.188,0.420);',
    '  t = clamp(t, 0.0, 1.0)*8.0; int i = int(min(floor(t), 7.0));',
    '  return mix(c[i], c[i+1], t - float(i));',
    '}'
  ].join('\n');

  var HEAD = '#version 300 es\nprecision highp float;\n';

  var SURF_VS = HEAD + GLSL_F + '\n' + [
    'in vec2 aXY;',
    'uniform mat4 uVP; uniform float uZS;',
    'out vec3 vN; out vec3 vW; out vec2 vXY; out float vZ;',
    'void main(){',
    '  float z = f(aXY.x, aXY.y), e = 0.003;',
    '  float dx = (f(aXY.x + e, aXY.y) - f(aXY.x - e, aXY.y))/(2.0*e);',
    '  float dy = (f(aXY.x, aXY.y + e) - f(aXY.x, aXY.y - e))/(2.0*e);',
    '  vN = normalize(vec3(-dx*uZS, 1.0, -dy*uZS));',
    '  vW = vec3(aXY.x, z*uZS, aXY.y); vXY = aXY; vZ = z;',
    '  gl_Position = uVP*vec4(vW, 1.0);',
    '}'
  ].join('\n');

  var SURF_FS = HEAD + GLSL_BLUES + '\n' + [
    'in vec3 vN; in vec3 vW; in vec2 vXY; in float vZ;',
    'uniform vec2 uZr; uniform vec3 uEye;',
    'out vec4 o;',
    'float grid(vec2 p, float n){',
    '  vec2 q = (p + 2.0)/4.0*n; vec2 w = fwidth(q);',
    '  vec2 g = abs(fract(q - 0.5) - 0.5)/max(w, 1e-4);',
    '  return (1.0 - min(min(g.x, g.y), 1.0)) * (1.0 - smoothstep(0.4, 0.9, max(w.x, w.y)));',
    '}',
    'void main(){',
    '  vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;',
    '  float t = (vZ - uZr.x)/(uZr.y - uZr.x);',
    '  vec3 col = blues(t);',
    '  vec3 L = normalize(vec3(-0.5, 0.85, 0.35));',
    '  vec3 V = normalize(uEye - vW);',
    '  float lam = max(dot(n, L), 0.0);',
    '  float spec = pow(max(dot(n, normalize(L + V)), 0.0), 18.0)*0.06;',
    '  float rim = pow(1.0 - max(dot(n, V), 0.0), 3.0)*0.12;',
    '  col = col*(0.30 + 0.70*lam) + spec + rim*vec3(0.55, 0.75, 1.0);',
    '  col += vec3(0.80, 0.90, 1.00)*pow(1.0 - t, 4.0)*0.38;',   // the minima glow, like the white well in the original
    '  col = mix(col, vec3(0.145, 0.388, 0.922), grid(vXY, 40.0)*0.30);',
    '  o = vec4(col, 1.0);',
    '}'
  ].join('\n');

  var PATH_VS = HEAD + [
    'in vec3 aP; in vec2 aSA;',
    'uniform mat4 uVP; uniform float uScale;',
    'out float vA;',
    'void main(){ vec4 c = uVP*vec4(aP, 1.0); gl_Position = c; gl_PointSize = aSA.x*uScale/max(c.w, 0.05); vA = aSA.y; }'
  ].join('\n');
  var PATH_FS = HEAD + [
    'in float vA; uniform int uMode; uniform vec3 uColor; out vec4 o;',
    'void main(){',
    '  if (uMode == 1) { o = vec4(uColor*vA, 1.0); return; }',
    '  float r = length(gl_PointCoord - 0.5)*2.0;',
    '  float halo = smoothstep(1.0, 0.0, r); float core = smoothstep(0.4, 0.0, r);',
    '  o = vec4((uColor*halo*halo*0.9 + vec3(1.0, 0.95, 0.88)*core)*vA, 1.0);',
    '}'
  ].join('\n');

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function program(vs, fs) {
    var p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }
  var surfProg, pathProg;
  try {
    surfProg = program(SURF_VS, SURF_FS);
    pathProg = program(PATH_VS, PATH_FS);
  } catch (e) {
    if (window.console) console.warn('surface:', e);
    return;
  }
  function uniforms(p, names) {
    var u = {};
    names.forEach(function (n) { u[n] = gl.getUniformLocation(p, n); });
    return u;
  }
  var Us = uniforms(surfProg, ['uVP', 'uZS', 'uZr', 'uEye']);
  var Up = uniforms(pathProg, ['uVP', 'uScale', 'uMode', 'uColor']);

  // ------------------------------------------------------------------ geometry
  var small = Math.min(window.innerWidth, window.innerHeight) < 700;
  var N = small ? 220 : 340;
  var xy = new Float32Array((N + 1) * (N + 1) * 2), k = 0, i, j;
  for (j = 0; j <= N; j++) for (i = 0; i <= N; i++) { xy[k++] = -2 + 4 * i / N; xy[k++] = -2 + 4 * j / N; }
  var idx = new Uint32Array(N * N * 6); k = 0;
  for (j = 0; j < N; j++) for (i = 0; i < N; i++) {
    var a = j * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1;
    idx[k++] = a; idx[k++] = c; idx[k++] = b; idx[k++] = b; idx[k++] = c; idx[k++] = d;
  }
  var surfVao = gl.createVertexArray();
  gl.bindVertexArray(surfVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, xy, gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(surfProg, 'aXY'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);

  var MAXP = 900;
  var pathData = new Float32Array(MAXP * 5);
  var pathVao = gl.createVertexArray();
  gl.bindVertexArray(pathVao);
  var pathBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, pathBuf); gl.bufferData(gl.ARRAY_BUFFER, pathData.byteLength, gl.DYNAMIC_DRAW);
  loc = gl.getAttribLocation(pathProg, 'aP'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 20, 0);
  loc = gl.getAttribLocation(pathProg, 'aSA'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 20, 12);
  gl.bindVertexArray(null);

  // ------------------------------------------------------------------ gradient descent with momentum
  var STARTS = [[0.0, 1.4], [1.35, -1.1], [1.1, 0.9], [0.6, -1.5]];
  function descend(x, y) {
    var lr = 0.006, beta = 0.95, vx = 0, vy = 0, e = 1e-4, pts = [[x, y]];
    for (var n = 0; n < 400; n++) {
      var gx = (f(x + e, y) - f(x - e, y)) / (2 * e), gy = (f(x, y + e) - f(x, y - e)) / (2 * e);
      vx = beta * vx - lr * gx; vy = beta * vy - lr * gy;
      x += vx; y += vy;
      pts.push([x, y]);
      if (n > 20 && Math.hypot(vx, vy) < 3e-4) break;
    }
    return pts;
  }
  var runs = STARTS.map(function (s) { return descend(s[0], s[1]); });
  var STEPS_PER_SEC = 13, HOLD = 5, FADE = 1.6;
  function runLength(r) { return runs[r].length / STEPS_PER_SEC + HOLD + FADE; }

  // ------------------------------------------------------------------ matrices
  function perspective(fovy, aspect, near, far, shiftX) {
    var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    return [f / aspect, 0, 0, 0, 0, f, 0, 0, -shiftX, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
  }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function norm(v) { var l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function lookAt(eye, at) {
    var z = norm(sub(eye, at)), x = norm(cross([0, 1, 0], z)), y = cross(z, x);
    return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, eye), -dot(y, eye), -dot(z, eye), 1];
  }
  function mul(a, b) {
    var o = new Array(16);
    for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    return o;
  }

  // ------------------------------------------------------------------ sizing
  var dprCap = small ? 1.5 : 2;
  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, dprCap);
    var w = Math.max(1, Math.round(canvas.clientWidth * dpr)), h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; return true; }
    return false;
  }
  window.addEventListener('resize', function () { if (resize() && !running) draw(simT); });
  resize();

  // ------------------------------------------------------------------ frame
  var ORBIT = 150;   // seconds per full turn
  function draw(t) {
    var aspect = canvas.width / canvas.height;
    var wide = aspect > 1.25;
    var az = 0.6 + t * 2 * Math.PI / ORBIT;
    var el = (52 + 4 * Math.sin(t * 2 * Math.PI / 80)) * Math.PI / 180;
    var R = wide ? 3.55 : 4.8;
    var target = [0, -0.75 * ZS, 0];
    var eye = [target[0] + R * Math.cos(el) * Math.sin(az), target[1] + R * Math.sin(el), target[2] + R * Math.cos(el) * Math.cos(az)];
    var fovy = wide ? 34 * Math.PI / 180 : Math.min(2 * Math.atan(Math.tan(36 * Math.PI / 180) / aspect), 72 * Math.PI / 180);
    var vp = mul(perspective(fovy, aspect, 0.05, 50, 0), lookAt(eye, target));

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    gl.useProgram(surfProg);
    gl.uniformMatrix4fv(Us.uVP, false, vp);
    gl.uniform1f(Us.uZS, ZS);
    gl.uniform2f(Us.uZr, ZMIN, ZMAX);
    gl.uniform3fv(Us.uEye, eye);
    gl.bindVertexArray(surfVao);
    gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_INT, 0);

    // which descent run is playing, and how far along it is
    var total = 0, r;
    for (r = 0; r < runs.length; r++) total += runLength(r);
    var tt = reduceMotion ? runLength(0) - HOLD - FADE : t % total;
    for (r = 0; r < runs.length; r++) { var L = runLength(r); if (tt < L) break; tt -= L; }
    r = Math.min(r, runs.length - 1);
    var pts = runs[r];
    var shown = Math.min(pts.length, Math.floor(tt * STEPS_PER_SEC) + 1);
    var fade = 1 - Math.max(0, Math.min(1, (tt - (pts.length / STEPS_PER_SEC + HOLD)) / FADE));

    // path on the surface
    var n = 0, s;
    function put(x, y, h, size, alpha) {
      var o = n * 5; pathData[o] = x; pathData[o + 1] = h; pathData[o + 2] = y; pathData[o + 3] = size; pathData[o + 4] = alpha; n++;
    }
    for (s = 0; s < shown; s++) put(pts[s][0], pts[s][1], f(pts[s][0], pts[s][1]) * ZS + 0.015, 0.03, fade);
    var onSurface = n;
    gl.bindBuffer(gl.ARRAY_BUFFER, pathBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, pathData.subarray(0, n * 5));

    gl.useProgram(pathProg);
    gl.uniformMatrix4fv(Up.uVP, false, vp);
    gl.uniform1f(Up.uScale, canvas.height);
    gl.uniform3f(Up.uColor, 1.0, 0.62, 0.26);
    gl.bindVertexArray(pathVao);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false);
    gl.uniform1i(Up.uMode, 1);
    if (onSurface > 1) gl.drawArrays(gl.LINE_STRIP, 0, onSurface);
    gl.uniform1i(Up.uMode, 0);
    if (onSurface > 0) {
      // every fourth step as a dot, the newest one larger
      for (s = 0; s < onSurface; s++) {
        var last = s === onSurface - 1;
        var dot = last || s % 3 === 0;
        pathData[s * 5 + 3] = last ? 0.09 : 0.038;
        if (!dot) pathData[s * 5 + 4] = 0;
      }
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, pathData.subarray(0, onSurface * 5));
      gl.drawArrays(gl.POINTS, 0, onSurface);
    }
    gl.disable(gl.BLEND); gl.depthMask(true);
    gl.bindVertexArray(null);
  }

  // ------------------------------------------------------------------ loop
  var simT = parseFloat(params.get('t0')) || 0;
  var running = false, prev = 0, raf = 0, visible = true;
  function loop(now) {
    raf = 0;
    if (!running) return;
    var dt = prev ? Math.min((now - prev) / 1000, 0.05) : 0;
    prev = now; simT += dt;
    draw(simT);
    raf = requestAnimationFrame(loop);
  }
  function start() {
    if (running || reduceMotion || !visible || document.hidden) return;
    running = true; prev = 0; raf = requestAnimationFrame(loop);
  }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
  if (window.IntersectionObserver) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) start(); else stop(); }).observe(hero);
  }
  canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); stop(); canvas.classList.remove('ready'); });

  draw(simT);
  canvas.classList.add('ready');
  start();
})();
