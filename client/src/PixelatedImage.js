// /client/src/PixelatedImage.js
import React, { useRef, useEffect } from 'react';

const PixelatedImage = ({ imageUrl, pixelationLevel }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'Anonymous'; // Important for loading images from another domain
    img.src = imageUrl;

    img.onload = () => {
      // 1. Calculate aspect ratio
      const aspectRatio = img.width / img.height;
      const canvasWidth = 300;
      const canvasHeight = 300 / aspectRatio;
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      
      const w = canvas.width / pixelationLevel;
      const h = canvas.height / pixelationLevel;

      // 2. Turn off image smoothing to get the sharp pixel effect
      ctx.imageSmoothingEnabled = false;

      // 3. Draw the small, pixelated version
      ctx.drawImage(img, 0, 0, w, h);

      // 4. Scale it up to fill the canvas
      ctx.drawImage(canvas, 0, 0, w, h, 0, 0, canvas.width, canvas.height);
    };
  }, [imageUrl, pixelationLevel]);

  return <canvas ref={canvasRef} />;
};

export default PixelatedImage;