import { ContainerNode } from "./node";
import { AudioSpeechNode } from "./audioSpeechNode";
import { computeRecurringStartInfos, StartInfo } from "./prepAnimation";

export class Talker {
  constructor(
    private startInfos: StartInfo<AudioSpeechNode>[] = [],
    private startInfoIdx = -1,
  ) {}

  setup(container: ContainerNode) {
    this.startInfoIdx = -1;

    const nodes = container.getNestedNodes();
    const textNodes: AudioSpeechNode[] = nodes.filter(node => {
      return node instanceof AudioSpeechNode;
    });
    this.startInfos = computeRecurringStartInfos<AudioSpeechNode>(textNodes);
  }

  talk(timeMs = 0) {
    const nextStartInfo = this.startInfos[this.startInfoIdx + 1];
    if (nextStartInfo && nextStartInfo.startMs <= timeMs) {
      this.startInfoIdx += 1;
    } else {
      return;
    }
    nextStartInfo.nodes.forEach(node => {
      window.speechSynthesis.speak(node.createUtterance());
    });
  }
}