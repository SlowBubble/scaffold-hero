import { Editor } from "./editor";
import { ShNode, VideoFileNode, VisualTextNode } from "./node";
import { AudioSpeechNode } from "./audioSpeechNode";
import { makeTopSvg, makeSvg } from "./svg";

export class EditWindowUi {
  constructor(
    public editor: Editor,
    public panelDiv: HTMLDivElement = document.createElement('div'),
    public startMs = 0,
    public windowSizeMs = 10_000,
    public width = 500,
    public height = 500,
    public trackSize = 80,
    public padding = 10,
  ) {}

  zoom(factor = 0.75) {
    this.windowSizeMs = Math.ceil(factor * this.windowSizeMs);
    this.render();
  }

  render() {
    this.moveWindowToCursor();
    const svg = makeTopSvg(this.width, this.height);
    const openedContainer = this.editor.getOpenedContainer();
    openedContainer.nodes.forEach((node: ShNode) => {
      let fill = 'white';
      if (node instanceof AudioSpeechNode) {
        fill = '#bee';
      } else if (node instanceof VisualTextNode) {
        fill = '#ccc';
      } else if (node instanceof VideoFileNode) {
        fill = '#beb';
      }
      const rect = makeSvg('rect', {
        x: node.commonNodeAttr.trackIdx * this.trackSize + this.padding,
        y: this.timeMsToPos(node.commonNodeAttr.startMs),
        width: this.trackSize - 2 * this.padding,
        height: this.timeMsToPos(node.commonNodeAttr.endMs) - this.timeMsToPos(node.commonNodeAttr.startMs),
        fill: fill,
        stroke: 'black',
      });
      svg.appendChild(rect);
    });

    const rect = makeSvg('rect', {
        x: this.editor.cursor.trackIdx * this.trackSize,
        y: this.timeMsToPos(this.editor.cursor.timeMs),
        width: Math.ceil(this.trackSize),
        height: 3,
        fill: 'blue',
        stroke: 'blue',
      });
      svg.appendChild(rect);
    
    this.panelDiv.innerHTML = svg.outerHTML;
  }

  timeMsToPos(timeMs = 0) {
    return Math.ceil((timeMs - this.startMs) / this.windowSizeMs * this.height);
  }
  
  private moveWindowToCursor() {
    const cursorMs = this.editor.cursor.timeMs
    if (cursorMs <= this.startMs) {
      this.startMs = cursorMs - Math.ceil(this.windowSizeMs / 10);
    }
    if (cursorMs >= this.startMs + this.windowSizeMs) {
      this.startMs = cursorMs - this.windowSizeMs + Math.ceil(this.windowSizeMs / 10);
    }
  }

}