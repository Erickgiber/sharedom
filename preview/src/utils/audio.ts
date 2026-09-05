let audioContext: AudioContext | null = null;

export function playCameraShutterSound(): void {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    if (!audioContext) {
      audioContext = new AudioCtx();
    }

    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const now = audioContext.currentTime;

    // 1. Shutter Click Pulse (Oscillator)
    const osc = audioContext.createOscillator();
    const oscGain = audioContext.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.06);

    oscGain.gain.setValueAtTime(0.2, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(oscGain);
    oscGain.connect(audioContext.destination);

    osc.start(now);
    osc.stop(now + 0.06);

    // 2. Mechanical Shutter Noise Texture
    const bufferSize = audioContext.sampleRate * 0.08;
    const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noise = audioContext.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseFilter = audioContext.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 1800;
    noiseFilter.Q.value = 3.0;

    const noiseGain = audioContext.createGain();
    noiseGain.gain.setValueAtTime(0.12, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(audioContext.destination);

    noise.start(now + 0.01);
    noise.stop(now + 0.09);

    // 3. Second Shutter Snap Closure
    const click2 = audioContext.createOscillator();
    const click2Gain = audioContext.createGain();

    click2.type = 'sine';
    click2.frequency.setValueAtTime(1100, now + 0.05);
    click2.frequency.exponentialRampToValueAtTime(180, now + 0.11);

    click2Gain.gain.setValueAtTime(0.15, now + 0.05);
    click2Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    click2.connect(click2Gain);
    click2Gain.connect(audioContext.destination);

    click2.start(now + 0.05);
    click2.stop(now + 0.11);
  } catch {
    // Graceful fallback if audio is not permitted
  }
}
