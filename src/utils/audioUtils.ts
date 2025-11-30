/**
 * Reads a File into an ArrayBuffer
 */
export async function readFileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        if (e.target?.result) {
            resolve(e.target.result as ArrayBuffer);
        } else {
            reject(new Error('Failed to read file'));
        }
    };
    reader.onerror = () => reject(new Error('FileReader error: ' + reader.error?.message));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Decodes audio data from a File into an AudioBuffer.
 */
export async function decodeAudioFromFile(file: File): Promise<AudioBuffer> {
    const arrayBuffer = await readFileToArrayBuffer(file);

    // @ts-ignore - Handle webkit prefix
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
        throw new Error('Web Audio API is not supported');
    }

    const ctx = new AudioContextClass();
    try {
        return await ctx.decodeAudioData(arrayBuffer);
    } finally {
        if (ctx.state !== 'closed') {
             await ctx.close();
        }
    }
}

/**
 * Extracts metadata and waveform data from an audio file using the Web Audio API.
 */
export async function extractAudioMetadata(file: File): Promise<{ duration: number; waveform: number[] }> {
    const audioBuffer = await decodeAudioFromFile(file);
    const duration = audioBuffer.duration;
    const waveform = extractWaveform(audioBuffer, 1000); // 1000 points for the waveform
    return { duration, waveform };
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

/**
 * Encodes raw audio data (Float32Array channels) into a WAV Blob.
 */
export function createWavBlob(channels: Float32Array[], sampleRate: number): Blob {
  // 1. Interleave channels
  const numChannels = channels.length;
  const numSamples = channels[0].length;
  const interleaved = new Float32Array(numSamples * numChannels);

  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      interleaved[i * numChannels + ch] = channels[ch][i];
    }
  }

  // 2. Convert Float32 to Int16 PCM
  const pcmData = new Int16Array(interleaved.length);
  for (let i = 0; i < interleaved.length; i++) {
    const s = Math.max(-1, Math.min(1, interleaved[i]));
    pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }

  // 3. Create WAV Header
  const buffer = new ArrayBuffer(44 + pcmData.byteLength);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // file length
  view.setUint32(4, 36 + pcmData.byteLength, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw)
  view.setUint16(20, 1, true);
  // channel count
  view.setUint16(22, numChannels, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sampleRate * blockAlign)
  view.setUint32(28, sampleRate * numChannels * 2, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, numChannels * 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, pcmData.byteLength, true);

  // 4. Write PCM data
  const pcmBytes = new Uint8Array(pcmData.buffer);
  const headerBytes = new Uint8Array(buffer);

  // Combine header and data
  // (Actually we can just copy pcmBytes into buffer after header)
  // But Uint8Array constructor with offset is easier if we created buffer large enough
  // Wait, I created `buffer` to hold everything.
  // I need to copy `pcmData` into `buffer` at offset 44.
  // `pcmData` is Int16Array. `buffer` is ArrayBuffer.
  // Let's use TypedArray.set

  // Easier way: Create Blob from array of parts
  const header = buffer.slice(0, 44);
  return new Blob([header, pcmData], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
