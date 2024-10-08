import { ContainerNode, VideoFileNode, VisualTextNode } from "./node";
import { computeOneTimeStartInfos, StartInfo } from "./prepAnimation";

// The reason I'm doing both Text and VideoFile in the same
// class is to respect the trackIdx layering.
type DrawableNode = VisualTextNode | VideoFileNode;

export class Drawer {
  constructor(
    private startInfos: StartInfo<DrawableNode>[] = [],
    private startInfoIdx = -1,
  ) {}

  setup(container: ContainerNode, startMs = 0) {
    this.startInfoIdx = -1;
    this.startInfos.forEach((startInfo, idx) => {
      if (startInfo.startMs < startMs) {
        this.startInfoIdx = idx;
      }
    });

    const nodes = container.getNestedNodes();
    const drawableNodes = nodes.filter(node => {
      return (node instanceof VisualTextNode) || (node instanceof VideoFileNode);
    }) as DrawableNode[];
    this.startInfos = computeOneTimeStartInfos<DrawableNode>(drawableNodes);
  }

  draw(
      timeMs: number, ctx: CanvasRenderingContext2D,
      pathToVideoHtml: Map<string, HTMLVideoElement>
  ) {
    
    const nextStartInfo = this.startInfos[this.startInfoIdx + 1];
    const transitioning = nextStartInfo && nextStartInfo.startMs <= timeMs;

    if (transitioning) {
      this.startInfoIdx += 1;
      // Stop the relevant videoHtmls
      const prevStartInfo = this.startInfos[this.startInfoIdx - 1];
      if (prevStartInfo) {
        prevStartInfo.nodes.forEach(node => {
          if (node instanceof VideoFileNode) {
            const videoHtml = pathToVideoHtml.get(node.filePath);
            if (videoHtml && !videoHtml.paused) {
              videoHtml.pause();
            }
          }
        });
      }
    }

    const currStartInfo = this.startInfos[this.startInfoIdx];
    if (!currStartInfo) {
      return;
    }
    currStartInfo.nodes.forEach(node => {
      if (node instanceof VisualTextNode) {
        ctx.font = '48px serif';
        ctx.textBaseline = 'top';
        ctx.fillText(node.text, 0, 0);
      } else if (node instanceof VideoFileNode) {
        // 1. Start the relevant videoHtmls
        const videoHtml = pathToVideoHtml.get(node.filePath);
        if (!videoHtml) {
          throw `Unable to find video html for file: ${node.filePath}`;
        }
        if (videoHtml.paused) {
          const initialOffsetMs = timeMs - node.commonNodeAttr.startMs;
          videoHtml.currentTime = (initialOffsetMs + node.startMs) / 1_000;
          videoHtml.play();
        }
        // 2. Extract the relevant images from the relevant videoHtmls into ctx.
        const drawImageArgs = computeDrawImageArgs(videoHtml);
        ctx.drawImage(videoHtml, ...drawImageArgs);
      }
    });
    
  }
}

function computeDrawImageArgs(videoHtml: HTMLVideoElement): [number, number, number, number, number, number, number, number] {
  const destWidth = videoHtml.videoWidth;
  const destHeight = videoHtml.videoHeight;
  const srcWidth = videoHtml.videoWidth;
  const srcHeight = videoHtml.videoHeight;
  return [0, 0, srcWidth, srcHeight, 0, 0, destWidth, destHeight];
}
