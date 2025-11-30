/**
 * Extracts metadata and waveform data from an audio file using the Web Audio API.
 */
export async function extractAudioMetadata(file: File): Promise<{ duration: number; waveform: number[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      let audioContext: AudioContext | undefined;
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        if (!arrayBuffer) {
          throw new Error('Failed to read file: Result is null');
        }

        // Initialize AudioContext
        // @ts-ignore - Handle webkit prefix if necessary
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
            throw new Error('Web Audio API is not supported in this browser');
        }

        audioContext = new AudioContextClass();

        // decodeAudioData returns a Promise in modern browsers
        // We use the promise syntax here.
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const duration = audioBuffer.duration;
        const waveform = extractWaveform(audioBuffer, 1000); // 1000 points for the waveform

        resolve({ duration, waveform });
      } catch (err) {
        reject(err);
      } finally {
        if (audioContext && audioContext.state !== 'closed') {
          try {
            await audioContext.close();
          } catch (e) {
            console.warn('Failed to close AudioContext:', e);
          }
        }
      }
    };

    reader.onerror = () => {
      reject(new Error('FileReader error: ' + reader.error?.message));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Extracts a simplified waveform from an AudioBuffer.
 * returns an array of values between 0 and 1.
 */
function extractWaveform(audioBuffer: AudioBuffer, samples: number): number[] {
  const rawData = audioBuffer.getChannelData(0); // Use the first channel (left)
  const step = Math.ceil(rawData.length / samples);
  const waveform: number[] = [];

  for (let i = 0; i < samples; i++) {
    let maxVal = 0;
    const start = i * step;
    const end = Math.min(start + step, rawData.length);

    // Find peak in this chunk
    for (let j = start; j < end; j++) {
      const val = Math.abs(rawData[j]);
      if (val > maxVal) {
        maxVal = val;
      }
    }
    waveform.push(maxVal);
  }

  // Normalize
  const globalMax = Math.max(...waveform, 0.001); // Avoid division by zero
  return waveform.map(v => v / globalMax);
}
