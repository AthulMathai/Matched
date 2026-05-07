export type FrameCheckResult = {
  clearEnough: boolean;
  averageBrightness: number;
  contrastScore: number;
};

export function analyzeVideoFrame(data: Uint8ClampedArray): FrameCheckResult {
  let brightnessTotal = 0;
  let brightnessSquaredTotal = 0;
  let sampleCount = 0;

  for (let i = 0; i < data.length; i += 4 * 20) {
    const r = data[i] || 0;
    const g = data[i + 1] || 0;
    const b = data[i + 2] || 0;

    const brightness = (r + g + b) / 3;

    brightnessTotal += brightness;
    brightnessSquaredTotal += brightness * brightness;
    sampleCount += 1;
  }

  const averageBrightness = brightnessTotal / Math.max(sampleCount, 1);
  const variance =
    brightnessSquaredTotal / Math.max(sampleCount, 1) -
    averageBrightness * averageBrightness;

  const contrastScore = Math.sqrt(Math.max(variance, 0));

  return {
    clearEnough: averageBrightness > 35 && contrastScore > 8,
    averageBrightness,
    contrastScore,
  };
}

/**
 * MVP placeholder:
 * This checks whether the video frame is bright and varied enough.
 *
 * Production upgrade:
 * Replace this with MediaPipe Face Detection or TensorFlow.js face-landmark
 * detection so it confirms actual face presence instead of only frame quality.
 */
export function isFrameClearEnough(data: Uint8ClampedArray) {
  return analyzeVideoFrame(data).clearEnough;
}