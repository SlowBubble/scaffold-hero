import { ShNode, CommonNodeAttr, NodeType } from "./node";



export class AudioSpeechNode implements ShNode {
  constructor(
    public commonNodeAttr: CommonNodeAttr = new CommonNodeAttr(NodeType.AudioSpeech),
    public text: string = '',
    public voiceOpt = new VoiceOpt(),
  ) { }
  static deserialize(json: any) {
    return new AudioSpeechNode(
      CommonNodeAttr.deserialize(json.commonNodeAttr),
      json.text
    );
  }

  createUtterance() {
    const speechSynthesisUtterance = new SpeechSynthesisUtterance(this.text);
    // speechSynthesisUtterance.voice = voice;
    speechSynthesisUtterance.rate = this.voiceOpt.rate;
    return speechSynthesisUtterance;
  }

  async testAndUpdateDuration() {
    const speechSynthesisUtterance = this.createUtterance();
    let startMs = 0;
    speechSynthesisUtterance.onstart = () => {
      startMs = Date.now();
    }
    return new Promise(resolve => {
      speechSynthesisUtterance.onend = () => {
        const durMs = Date.now() - startMs;
        this.commonNodeAttr.endMs = this.commonNodeAttr.startMs + durMs;
        // TODO handle error case.
        resolve(null);
      }
      window.speechSynthesis.speak(speechSynthesisUtterance);
    });
  }
}

export class VoiceOpt {
  constructor(
    public rate = 0.7,
    public voiceURI = '',
  ) {}
}


