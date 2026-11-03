/* 我的书房 · 轻量 Three.js 场景
   1) #shelf3d  首页：书脊环形书架
   2) #book3d   详情页：单本书实体
   设计约束：无阴影、无贴图、低多边形；离屏与切到后台自动停渲染；
   支持 prefers-reduced-motion（只渲染静态一帧）；WebGL 不可用时静默退出。 */
(function () {
  'use strict';
  if (!window.THREE) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var smallScreen = window.matchMedia('(max-width: 760px)').matches;
  var hoverable = window.matchMedia('(hover: hover)').matches;

  var PAPER = 0xf4ecd9;

  function createRenderer(canvas) {
    try {
      var r = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: !smallScreen,
        powerPreference: 'low-power'
      });
      r.setPixelRatio(Math.min(window.devicePixelRatio || 1, smallScreen ? 1.3 : 1.75));
      r.setClearColor(0x000000, 0);
      if ('outputEncoding' in r && THREE.sRGBEncoding !== undefined) {
        r.outputEncoding = THREE.sRGBEncoding;
      }
      return r;
    } catch (e) {
      return null;
    }
  }

  function degrade(canvas) {
    if (canvas.parentNode) canvas.parentNode.classList.add('fallback');
    canvas.style.display = 'none';
  }

  function addLights(scene) {
    scene.add(new THREE.AmbientLight(0xffffff, 0.74));
    var key = new THREE.DirectionalLight(0xfff4e2, 0.82);
    key.position.set(4, 6, 5);
    scene.add(key);
    var fill = new THREE.DirectionalLight(0xc6d8f0, 0.34);
    fill.position.set(-5, 2, -4);
    scene.add(fill);
  }

  /* ---------- 控制器：统一处理尺寸、可见性、动效开关 ---------- */
  function runLoop(canvas, renderer, scene, camera, onFrame) {
    var rafId = null;
    var visible = true;
    var start = performance.now();

    function frame(now) {
      rafId = null;
      if (!visible || document.hidden) return;
      onFrame((now - start) / 1000, camera, scene, renderer);
      rafId = requestAnimationFrame(frame);
    }
    function play() {
      if (rafId === null) rafId = requestAnimationFrame(frame);
    }
    function stop() {
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    }

    function resize() {
      var w = canvas.clientWidth || canvas.parentNode.clientWidth;
      var h = canvas.clientHeight || canvas.parentNode.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    }

    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else play();
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) play(); else stop();
      }, { threshold: 0.02 }).observe(canvas);
    }

    resize();
    if (reduceMotion) {
      onFrame(1.7, camera, scene, renderer);
    } else {
      play();
    }
    return { resize: resize };
  }

  /* ---------- 首页：书脊环 ---------- */
  function initShelf(canvas) {
    var raw = canvas.getAttribute('data-shelf');
    var colors = [];
    try { colors = raw ? JSON.parse(raw) : []; } catch (e) { colors = []; }
    if (!colors.length) return;

    var renderer = createRenderer(canvas);
    if (!renderer) { degrade(canvas); return; }

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    addLights(scene);

    var group = new THREE.Group();
    scene.add(group);

    var radius = 2.06;
    var n = colors.length;
    var slabs = [];

    for (var i = 0; i < n; i++) {
      var angle = (i / n) * Math.PI * 2;
      var height = 1.05 + ((i * 37) % 100) / 100 * 0.55;
      var holder = new THREE.Group();

      var cover = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, height, 0.08),
        new THREE.MeshStandardMaterial({ color: new THREE.Color(colors[i]), roughness: 0.84, metalness: 0.04 })
      );
      holder.add(cover);

      var pages = new THREE.Mesh(
        new THREE.BoxGeometry(0.84, height - 0.07, 0.045),
        new THREE.MeshStandardMaterial({ color: PAPER, roughness: 0.96, metalness: 0 })
      );
      pages.position.z = -0.062;   /* 书页朝内，封面朝外，形成彩色书脊环 */
      holder.add(pages);

      holder.position.set(Math.sin(angle) * radius, 0, Math.cos(angle) * radius);
      holder.rotation.y = angle;
      holder.userData.phase = i * 0.62;
      holder.userData.baseY = 0;
      group.add(holder);
      slabs.push(holder);
    }

    var ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.011, 6, 88),
      new THREE.MeshStandardMaterial({ color: 0xcbbfa4, roughness: 0.6, metalness: 0.1 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.86;
    group.add(ring);

    var pointer = { x: 0, y: 0 };
    if (hoverable && !reduceMotion) {
      window.addEventListener('mousemove', function (e) {
        pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
        pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
      }, { passive: true });
    }

    function fit() {
      /* 只调整景深方向，不覆盖 x/y，否则会打断指针视差 */
      var aspect = camera.aspect || 1;
      var need = radius * 2 + 1.3;
      var dist = (need / 2) / Math.tan((camera.fov * Math.PI / 180) / 2) / Math.min(1, aspect * 1.02);
      camera.position.z = Math.max(5.8, dist);
    }
    camera.position.set(0, 0.82, 6.6);

    runLoop(canvas, renderer, scene, camera, function (t) {
      group.rotation.y = reduceMotion ? 0.55 : t * 0.115;
      for (var j = 0; j < slabs.length; j++) {
        slabs[j].position.y = reduceMotion ? 0 : Math.sin(t * 0.85 + slabs[j].userData.phase) * 0.032;
      }
      if (!reduceMotion) {
        camera.position.x += (pointer.x * 0.42 - camera.position.x) * 0.045;
        camera.position.y += (0.82 + pointer.y * -0.12 - camera.position.y) * 0.045;
      }
      fit();
      camera.lookAt(0, 0.06, 0);
      renderer.render(scene, camera);
    });
  }

  /* ---------- 详情页：单本书 ---------- */
  function initBook(canvas, tint) {
    var renderer = createRenderer(canvas);
    if (!renderer) { degrade(canvas); return; }

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
    addLights(scene);

    var group = new THREE.Group();
    scene.add(group);

    var W = 1.42, H = 2.02, D = 0.17;
    var coverMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(tint), roughness: 0.72, metalness: 0.06 });

    var pages = new THREE.Mesh(
      new THREE.BoxGeometry(W, H, D),
      new THREE.MeshStandardMaterial({ color: PAPER, roughness: 0.95, metalness: 0 })
    );
    group.add(pages);

    var front = new THREE.Mesh(new THREE.BoxGeometry(W + 0.06, H + 0.06, 0.032), coverMat);
    front.position.z = D / 2 + 0.016;
    group.add(front);

    var back = new THREE.Mesh(new THREE.BoxGeometry(W + 0.06, H + 0.06, 0.032), coverMat);
    back.position.z = -(D / 2 + 0.016);
    group.add(back);

    var spine = new THREE.Mesh(new THREE.BoxGeometry(0.05, H + 0.06, D + 0.06), coverMat);
    spine.position.x = -(W / 2 + 0.03);
    group.add(spine);

    /* 封面压印：一条细窄的金属线，避免大面积纯色显得呆板 */
    var line = new THREE.Mesh(
      new THREE.BoxGeometry(W * 0.62, 0.014, 0.004),
      new THREE.MeshStandardMaterial({ color: 0xd8c79a, roughness: 0.35, metalness: 0.7 })
    );
    line.position.set(0, H * 0.26, D / 2 + 0.035);
    group.add(line);

    group.rotation.set(0.05, -0.92, -0.05);

    function fit() {
      var aspect = camera.aspect || 1;
      var needH = 2.62;
      var dist = (needH / 2) / Math.tan((camera.fov * Math.PI / 180) / 2) / Math.min(1, aspect);
      camera.position.set(0, 0.04, Math.max(3.5, dist));
      camera.lookAt(0, 0, 0);
    }

    runLoop(canvas, renderer, scene, camera, function (t) {
      if (!reduceMotion) {
        /* 保持一个非正面角度：既能看见封面，也能看见书脊与书页厚度 */
        group.rotation.y = -0.92 + Math.sin(t * 0.42) * 0.46;
        group.position.y = Math.sin(t * 0.7) * 0.035;
        group.rotation.x = 0.05 + Math.sin(t * 0.31) * 0.03;
      }
      fit();
      renderer.render(scene, camera);
    });
  }

  function boot() {
    var shelf = document.getElementById('shelf3d');
    if (shelf) initShelf(shelf);

    var book = document.getElementById('book3d');
    if (book) initBook(book, book.getAttribute('data-tint') || '#2d4a3a');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
