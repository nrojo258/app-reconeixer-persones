import React, { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';

// Definim les dimensions del vídeo
const VIDEO_WIDTH = 640;
const VIDEO_HEIGHT = 480;

// Traduccions de les expressions
const expressionTranslations = {
  neutral: 'Neutral',
  happy: 'Feliç 😊',
  sad: 'Trist 😢',
  angry: 'Enfadat 😠',
  fearful: 'Espantat 😨',
  disgusted: 'Disgustat 🤢',
  surprised: 'Sorprès 😮',
};

// Colors de fons associats a cada expressió
const expressionColors = {
  neutral: '#ffffffff',
  happy: '#fffb00ff',
  sad: '#005effff',
  angry: '#ff0000ff',
  fearful: '#cc00ffff',
  disgusted: '#02ff20ff',
  surprised: '#03f2e2e4',
};

const ExpressionDetector = () => {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [detectedExpression, setDetectedExpression] = useState('Detectant...');
  const [bgColor, setBgColor] = useState('#EAEAEA'); // Estat pel color de fons

  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = '/models';
      
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
      } catch (error) {
        console.error('Error carregant els models:', error);
      }
    };

    loadModels();
    return () => intervalRef.current && clearInterval(intervalRef.current);
  }, []);

  const startDetection = () => {
    intervalRef.current = setInterval(async () => {
      if (!webcamRef.current || !webcamRef.current.video || !modelsLoaded) return;

      const video = webcamRef.current.video;
      const canvas = canvasRef.current;
      const displaySize = { width: VIDEO_WIDTH, height: VIDEO_HEIGHT };
      faceapi.matchDimensions(canvas, displaySize);

      const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceExpressions();

      if (detections.length > 0) {
        const expressions = detections[0].expressions;
        const dominantExpression = Object.keys(expressions).reduce((a, b) =>
          expressions[a] > expressions[b] ? a : b
        );

        setDetectedExpression(expressionTranslations[dominantExpression] || dominantExpression);

        // Canvi de color segons l'expressió
        setBgColor(expressionColors[dominantExpression] || '#FFFFFF');

        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);

        faceapi.draw.drawDetections(canvas, resizedDetections);
        faceapi.draw.drawFaceExpressions(canvas, resizedDetections);

        // Dibuixa els punts facials
        faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

      } else {
        setDetectedExpression('Sense rostre detectat');
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
    }, 500);
  };

  const handleVideoOnPlay = () => startDetection();

  return (
    <div style={{ 
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      backgroundColor: bgColor, transition: 'background-color 0.5s ease', padding: '20px'
    }}>
      <h2>Detector d'Estat d'Ànim (RA2)</h2>
      {!modelsLoaded ? <p>Carregant models...</p> : <p>Models Carregats!</p>}
      
      <div style={{ position: 'relative', width: VIDEO_WIDTH, height: VIDEO_HEIGHT }}>
        <Webcam
          ref={webcamRef}
          audio={false}
          width={VIDEO_WIDTH}
          height={VIDEO_HEIGHT}
          videoConstraints={{ width: VIDEO_WIDTH, height: VIDEO_HEIGHT, facingMode: 'user' }}
          onUserMedia={handleVideoOnPlay}
          style={{ position: 'absolute', top: 0, left: 0 }}
        />
        <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0 }} />
      </div>

      {modelsLoaded && <h3 style={{ marginTop: '20px' }}>Estat d'ànim detectat: {detectedExpression}</h3>}
    </div>
  );
};

export default ExpressionDetector;
