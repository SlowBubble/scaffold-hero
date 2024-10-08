let voices = [];

export function initVoices() {
  if (voices.length > 0) {
    return;
  }
  voices = window.speechSynthesis.getVoices().filter(
    voice => voice.localService && voice.lang === 'en-AU');
}