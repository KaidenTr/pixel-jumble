// /client/src/PixelatedImage.js

import React, { useRef, useEffect } from 'react';

const PixelatedImage = ({ imageUrl, pixelationLevel }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!imageUrl) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageUrl;

    img.onload = () => {
      const aspectRatio = img.width / img.height;
      const canvasWidth = 300;
      const canvasHeight = 300 / aspectRatio;
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      
      const w = canvas.width / pixelationLevel;
      const h = canvas.height / pixelationLevel;

      // --- THE KEY CHANGE IS HERE ---
      // We now explicitly set image smoothing to FALSE to get the sharp, blocky pixels.
      ctx.imageSmoothingEnabled = false;
      ctx.mozImageSmoothingEnabled = false;
      ctx.webkitImageSmoothingEnabled = false;
      ctx.msImageSmoothingEnabled = false;

      // Draw the original image very small.
      ctx.drawImage(img, 0, 0, w, h);

      // Draw that small image back up to the full size.
      // Because smoothing is OFF, the browser will create sharp, blocky pixels.
      ctx.drawImage(canvas, 0, 0, w, h, 0, 0, canvas.width, canvas.height);
    };
    
    img.onerror = () => {
        console.error("Failed to load image for pixelation.");
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('Image not found', canvas.width / 2, canvas.height / 2);
    }

  }, [imageUrl, pixelationLevel]);

  return <canvas ref={canvasRef} />;
};

export default PixelatedImage;