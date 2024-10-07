import { ContainerNode, VisualTextNode } from "./node";
import { computeOneTimeStartInfos, StartInfo } from "./prepAnimation";

export class Drawer {
  constructor(
    private startInfos: StartInfo<VisualTextNode>[] = [],
    private startInfoIdx = -1,
  ) {}

  setup(container: ContainerNode) {
    this.startInfoIdx = -1;

    const nodes = container.getNestedNodes();
    const textNodes: VisualTextNode[] = nodes.filter(node => {
      return node instanceof VisualTextNode;
    });
    this.startInfos = computeOneTimeStartInfos<VisualTextNode>(textNodes);
  }

  draw(timeMs: number, ctx: CanvasRenderingContext2D) {
    const nextStartInfo = this.startInfos[this.startInfoIdx + 1];
    if (nextStartInfo && nextStartInfo.startMs <= timeMs) {
      this.startInfoIdx += 1;
    }
    const currStartInfo = this.startInfos[this.startInfoIdx];
    if (!currStartInfo) {
      return;
    }
    currStartInfo.nodes.forEach(node => {
      ctx.font = '48px serif';
      ctx.textBaseline = 'top';
      ctx.fillText(node.text, 0, 0);
    });
  }

}
