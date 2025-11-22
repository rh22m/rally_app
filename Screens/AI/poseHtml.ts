// rally_app/Screens/poseHtml.ts

export const htmlContent = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no, viewport-fit=cover">
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js" crossorigin="anonymous"></script>
  <style>
    html, body {
      margin: 0; padding: 0;
      width: 100%; height: 100%;
      overflow: hidden;
      background-color: #000;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    canvas { position: absolute; }
  </style>
</head>
<body>
  <video class="input_video" playsinline webkit-playsinline style="display:none"></video>
  <canvas class="output_canvas"></canvas>

  <script>
    const videoElement = document.getElementsByClassName('input_video')[0];
    const canvasElement = document.getElementsByClassName('output_canvas')[0];
    const canvasCtx = canvasElement.getContext('2d');

    let isBackCamera = true; // true: 후면, false: 전면
    let animationId;

    // ★ RN에서 보낸 메시지 수신 (Android/iOS 호환)
    document.addEventListener("message", handleRNMessage);
    window.addEventListener("message", handleRNMessage);

    function handleRNMessage(event) {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'switchCamera') {
           toggleCamera();
        }
      } catch (e) {}
    }

    function resizeCanvas(imgWidth, imgHeight) {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const screenRatio = screenWidth / screenHeight;
      const imgRatio = imgWidth / imgHeight;

      let finalWidth, finalHeight;
      if (screenRatio > imgRatio) {
        finalWidth = screenWidth;
        finalHeight = screenWidth / imgRatio;
      } else {
        finalHeight = screenHeight;
        finalWidth = screenHeight * imgRatio;
      }
      canvasElement.style.width = \`\${finalWidth}px\`;
      canvasElement.style.height = \`\${finalHeight}px\`;
      canvasElement.width = imgWidth;
      canvasElement.height = imgHeight;
    }

    function onResults(results) {
      if (canvasElement.width !== results.image.width) {
        resizeCanvas(results.image.width, results.image.height);
      }

      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

      // ★ 전면 카메라일 때 거울 모드 (좌우 반전) 처리
      if (!isBackCamera) {
          canvasCtx.translate(canvasElement.width, 0);
          canvasCtx.scale(-1, 1);
      }

      canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

      if (results.poseLandmarks) {
        drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {color: '#00FFFF', lineWidth: 3});
        drawLandmarks(canvasCtx, results.poseLandmarks, {color: '#FF0000', lineWidth: 1, radius: 3});

        const rightWrist = results.poseLandmarks[16];
        if(rightWrist && rightWrist.visibility > 0.5) {
          if(window.ReactNativeWebView) {

            // ★ 좌표 데이터도 반전시켜서 보내야 함 (전면일 때)
            let x = rightWrist.x;
            if (!isBackCamera) {
                x = 1.0 - x; // 0~1 좌표계 반전
            }

            window.ReactNativeWebView.postMessage(JSON.stringify({
               type: 'poseData',
               x: x,
               y: rightWrist.y,
               timestamp: Date.now()
            }));
          }
        }
      }
      canvasCtx.restore();
    }

    const pose = new Pose({locateFile: (file) => \`https://cdn.jsdelivr.net/npm/@mediapipe/pose/\${file}\`});
    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    pose.onResults(onResults);

    async function startCamera() {
        // 1. 기존 스트림이 있다면 확실하게 정지 (가장 중요)
        if (videoElement.srcObject) {
            const tracks = videoElement.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            videoElement.srcObject = null;
        }

        // 2. 애니메이션 루프 잠시 정지
        if (animationId) cancelAnimationFrame(animationId);

        // 3. 새로운 설정으로 카메라 요청
        const constraints = {
            video: {
                facingMode: isBackCamera ? 'environment' : 'user',
                width: { ideal: 640 },
                height: { ideal: 480 }
            }
        };

        try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            videoElement.srcObject = stream;
            videoElement.onloadedmetadata = () => {
                videoElement.play();
                processFrame(); // 루프 재시작
            };
        } catch (err) {
            if(window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({type: 'log', message: 'Camera Error: ' + err}));
            }
        }
    }

    function toggleCamera() {
        isBackCamera = !isBackCamera; // 상태 뒤집기
        startCamera(); // 카메라 재시작
    }

    async function processFrame() {
        if (videoElement.paused || videoElement.ended) return;
        await pose.send({image: videoElement});
        animationId = requestAnimationFrame(processFrame);
    }

    startCamera(); // 앱 시작 시 실행

    window.addEventListener('resize', () => {
       if (canvasElement.width > 0) resizeCanvas(canvasElement.width, canvasElement.height);
    });
  </script>
</body>
</html>
`;