export const footworkSetHtml = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js" crossorigin="anonymous"></script>
  <style>
    html,body{margin:0;padding:0;background:#000;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;}
    #wrap{position:relative;width:100vw;height:100vh;background:#000;}
    video,canvas{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}
  </style>
</head>
<body>
<div id="wrap">
  <video id="video" autoplay playsinline muted style="display:none;"></video>
  <canvas id="output_canvas"></canvas>
</div>

<script>
(() => {
  const video = document.getElementById('video');
  const canvasElement = document.getElementById('output_canvas');
  const canvasCtx = canvasElement.getContext('2d', { willReadFrequently: true });

  let currentFacing = 'environment';
  let isRunning = false;
  let frameCounter = 0;

  window.onerror = function(message) {
    post('ERROR', { message: 'JS ERROR: ' + message });
  };

  function post(type, payload = {}) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type, ...payload }));
    }
  }

  function clamp01(value) { return Math.max(0, Math.min(1, value)); }

  function luma(r, g, b) { return 0.299 * r + 0.587 * g + 0.114 * b; }
  function detectCourt(data, width, height) {
    const left = Math.floor(width * 0.18), right = Math.floor(width * 0.82);
    const top = Math.floor(height * 0.20), bottomY = Math.floor(height * 0.82);
    let verticalHits = 0;
    for (let x = left; x < right; x += 12) {
      let count = 0;
      for (let y = top; y < bottomY; y += 8) {
        const i = (y * width + x) * 4;
        const max = Math.max(data[i], data[i+1], data[i+2]);
        const min = Math.min(data[i], data[i+1], data[i+2]);
        if (luma(data[i], data[i+1], data[i+2]) > 175 && max - min < 34) count++;
      }
      if (count > 7) verticalHits++;
    }
    return Math.max(0, Math.min(1, (verticalHits / 18) * 0.55 + 0.45));
  }

  function visible(lm) { return !!lm && Number(lm.visibility || 0) >= 0.45; }
  function distance(a, b) {
    if(!a || !b) return 0;
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
  }
  function midpoint(a, b) {
    if(!a || !b) return null;
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }
  function angle(a, b, c) {
    if(!a || !b || !c) return 180;
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let ang = Math.abs(radians * 180.0 / Math.PI);
    if(ang > 180.0) ang = 360 - ang;
    return ang;
  }

  // ✅ 코트 영역 6분할 + 중앙 완벽 매핑
  function extractMetrics(landmarks) {
    const lHip = landmarks[23], rHip = landmarks[24];
    const lKnee = landmarks[25], rKnee = landmarks[26];
    const lAnkle = landmarks[27], rAnkle = landmarks[28];
    const lShoulder = landmarks[11], rShoulder = landmarks[12];

    const leftKneeAng = angle(lHip, lKnee, lAnkle);
    const rightKneeAng = angle(rHip, rKnee, rAnkle);
    const kneeAngleMin = Math.min(leftKneeAng, rightKneeAng);

    const shoulderMid = midpoint(lShoulder, rShoulder);
    const hipMid = midpoint(lHip, rHip);
    let trunkLeanDeg = 15;
    if(shoulderMid && hipMid) {
        trunkLeanDeg = (Math.atan2(Math.abs(shoulderMid.x - hipMid.x), Math.max(0.001, Math.abs(shoulderMid.y - hipMid.y))) * 180) / Math.PI;
    }

    // 발의 중심점을 구함
    const lFoot = midpoint(landmarks[31], lAnkle) || lAnkle;
    const rFoot = midpoint(landmarks[32], rAnkle) || rAnkle;
    const footCenter = midpoint(lFoot, rFoot);

    let zone = 'CENTER';
    if(footCenter) {
      // Landscape Right 가로 모드 보정 (네이티브 카메라 좌표계와 브라우저 좌표계 차이 보정)
      const cx = clamp01(footCenter.y);
      const cy = clamp01(1 - footCenter.x);

      // ✅ 오버레이 비율에 맞춘 코트 바운딩 박스 (네트: 0.3, 백라인: 0.95)
      const court = { left: 0.1, right: 0.9, top: 0.30, bottom: 0.95 };
      const nx = clamp01((cx - court.left) / (court.right - court.left));
      const ny = clamp01((cy - court.top) / (court.bottom - court.top));

      // ✅ 정교한 6코너 + Center 매핑 로직
      // Y축: 0~0.35 (Front), 0.35~0.7 (Mid/Center), 0.7~1.0 (Back)
      // X축: 0~0.35 (Left), 0.35~0.65 (Center), 0.65~1.0 (Right)
      if (ny < 0.35) {
        zone = nx < 0.5 ? 'FRONT_LEFT' : 'FRONT_RIGHT';
      } else if (ny > 0.70) {
        zone = nx < 0.5 ? 'BACK_LEFT' : 'BACK_RIGHT';
      } else {
        if (nx < 0.35) zone = 'MID_LEFT';
        else if (nx > 0.65) zone = 'MID_RIGHT';
        else zone = 'CENTER';
      }
    }

    const required = [11,12,13,14,15,16,23,24,25,26,27,28];
    const playerConfidence = required.filter(idx => visible(landmarks[idx])).length / required.length;

    const ankleWidth = distance(lAnkle, rAnkle);
    const shoulderWidth = distance(lShoulder, rShoulder) || 0.18;
    const balanceScore = Math.max(45, 100 - Math.abs((ankleWidth/shoulderWidth) - 1.35) * 35);

    return { zone, kneeAngleMin, trunkLeanDeg, balanceScore, playerConfidence };
  }

  const pose = new Pose({locateFile: (file) => \`https://cdn.jsdelivr.net/npm/@mediapipe/pose/\${file}\`});
  pose.setOptions({ modelComplexity: 1, smoothLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });

  pose.onResults((results) => {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    frameCounter++;

    if(frameCounter % 3 === 0) {
      let courtConfidence = 0.5;
      if (frameCounter % 9 === 0) {
         const imgData = canvasCtx.getImageData(0,0,canvasElement.width,canvasElement.height);
         courtConfidence = detectCourt(imgData.data, imgData.width, imgData.height);
         if (courtConfidence >= 0.62) post('COURT_DETECTED', { confidence: courtConfidence });
         else post('COURT_DETECTION_PROGRESS', { confidence: courtConfidence });
      }

      if(results.poseLandmarks) {
         const metrics = extractMetrics(results.poseLandmarks);
         post('poseMetrics', {
            ts: Date.now(),
            zone: metrics.zone,
            kneeAngleMin: metrics.kneeAngleMin,
            trunkLeanDeg: metrics.trunkLeanDeg,
            balanceScore: metrics.balanceScore,
            playerConfidence: metrics.playerConfidence,
            courtConfidence: courtConfidence
         });
      } else {
         post('POSE_LOST');
      }
    }
    canvasCtx.restore();
  });

  async function startCamera(facing = currentFacing) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      video.srcObject = stream;
      video.onloadedmetadata = () => {
        video.play();
        canvasElement.width = video.videoWidth;
        canvasElement.height = video.videoHeight;
        post('CAMERA_READY', { facing });
        loop();
      };
    } catch (e) { post('ERROR', { message: '카메라 권한 오류' }); }
  }

  async function loop() {
    if(!video.paused && !video.ended) {
      await pose.send({image: video});
    }
    requestAnimationFrame(loop);
  }

  window.__RECO_SWITCH_CAMERA = function() {
    currentFacing = currentFacing === 'environment' ? 'user' : 'environment';
    startCamera(currentFacing);
  };
  window.__RECO_FOOTWORK_START = function() { isRunning = true; post('SET_RUNNING'); };
  window.__RECO_FOOTWORK_STOP = function() { isRunning = false; post('SET_STOPPED'); };

  startCamera();
})();
</script>
</body>
</html>
`;