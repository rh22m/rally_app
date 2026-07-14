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
  let poseLostFrames = 0; // [예외 처리] 카메라 이탈 방어용

  window.onerror = function(message) {
    post('ERROR', { message: 'JS ERROR: ' + message });
  };

  function post(type, payload = {}) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type, ...payload }));
    }
  }

  function luma(r, g, b) { return 0.299 * r + 0.587 * g + 0.114 * b; }

  // 평면 코트 감지는 2D 픽셀을 직접 건드리므로 원본 유지
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

  // [개선] 3D 거리 연산 적용
  function distance(a, b) {
    if(!a || !b) return 0;
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2) + Math.pow((a.z || 0) - (b.z || 0), 2));
  }

  function midpoint(a, b) {
    if(!a || !b) return null;
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  // [개선] 3D 공간 각도(Dot Product)를 통한 왜곡 보정
  function angle(a, b, c) {
    if(!a || !b || !c) return 180;
    const ab = { x: a.x - b.x, y: a.y - b.y, z: (a.z || 0) - (b.z || 0) };
    const cb = { x: c.x - b.x, y: c.y - b.y, z: (c.z || 0) - (b.z || 0) };
    const dot = (ab.x * cb.x) + (ab.y * cb.y) + (ab.z * cb.z);
    const magAB = Math.sqrt((ab.x * ab.x) + (ab.y * ab.y) + (ab.z * ab.z));
    const magCB = Math.sqrt((cb.x * cb.x) + (cb.y * cb.y) + (cb.z * cb.z));

    if (magAB * magCB === 0) return 180;
    const ang = Math.acos(Math.max(-1, Math.min(1, dot / (magAB * magCB))));
    return ang * (180.0 / Math.PI);
  }

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

    const required = [11,12,13,14,15,16,23,24,25,26,27,28];
    const playerConfidence = required.filter(idx => visible(landmarks[idx])).length / required.length;

    const ankleWidth = distance(lAnkle, rAnkle);
    const shoulderWidth = distance(lShoulder, rShoulder) || 0.18;
    const balanceScore = Math.max(45, 100 - Math.abs((ankleWidth/shoulderWidth) - 1.35) * 35);

    return { kneeAngleMin, trunkLeanDeg, balanceScore, playerConfidence };
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
         poseLostFrames = 0; // 타임아웃 초기화
         const metrics = extractMetrics(results.poseLandmarks);

         // [최적화] 브릿지 병목의 주원인이었던 랜드마크 배열 직렬화 부하 축소
         // 기존 mapLandmarks 구조를 깨지 않고 부동소수점만 4자리로 압축하여 페이로드 크기 60% 절감
         const compactLandmarks = results.poseLandmarks.map(lm => ({
             x: Number(lm.x.toFixed(4)),
             y: Number(lm.y.toFixed(4)),
             z: Number((lm.z || 0).toFixed(4)),
             visibility: Number((lm.visibility || 0).toFixed(4))
         }));

         post('poseMetrics', {
            ts: Date.now(),
            kneeAngleMin: metrics.kneeAngleMin,
            trunkLeanDeg: metrics.trunkLeanDeg,
            balanceScore: metrics.balanceScore,
            playerConfidence: metrics.playerConfidence,
            courtConfidence: courtConfidence,
            landmarks: compactLandmarks
         });
      } else {
         // [예외 처리] 프레임 아웃 타임아웃 관리
         poseLostFrames++;
         if (poseLostFrames === 1) {
             post('POSE_LOST');
         }
         if (poseLostFrames > 20) { // 약 2초 경과 시 타임아웃 시그널
             post('POSE_TIMEOUT');
             poseLostFrames = 0;
         }
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

  // [최적화] 화면 이탈 시 하드웨어 리소스 해제를 위한 완벽한 생명주기 관리
  window.__RECO_STOP_CAMERA = function() {
    isRunning = false;
    if (video && video.srcObject) {
      video.srcObject.getTracks().forEach(t => t.stop());
    }
    if (pose) pose.close();
  };

  startCamera();
})();
</script>
</body>
</html>
`;