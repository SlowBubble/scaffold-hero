import { Drawer } from "./drawer";
import { Editor } from "./editor";
import { ContainerNode } from "./node";
import { Talker } from "./talker";

export class Director {
  constructor(
    public canvas: HTMLCanvasElement = document.createElement('canvas'),
    public isPlaying = false,
    public msPerFrame = 16,
    public timeMs = 0,
    private drawer = new Drawer(),
    private talker = new Talker(),
    private animateTimeoutId = 0,
    private onChangeCallback: Function = () => {},
  ) {}

  togglePlayPause(editor: Editor) {
    if (this.isPlaying) {
      this.pause();
      return;
    }
    const container = editor.getOpenedContainer();
    let startMs = editor.cursor.timeMs;
    if (editor.cursor.timeMs + this.msPerFrame >= container.commonNodeAttr.endMs) {
      startMs = 0;
    }
    this.play(editor, startMs);
  }

  play(editor: Editor, startMs = 0) {
    if (this.isPlaying) {
      return;
    }
    this.isPlaying = true;
    this.timeMs = startMs;

    const container = editor.getOpenedContainer();
    this.drawer.setup(container, startMs);
    this.talker.setup(container, startMs);

    this.animateRecursively(editor.unpersisted.pathToVideoHtml, container.commonNodeAttr.endMs);
  }

  pause() {
    this.isPlaying = false;
    window.clearTimeout(this.animateTimeoutId);
    window.speechSynthesis.cancel();
    this.onChangeCallback(this.timeMs);
  }

  onChange(callback: Function) {
    this.onChangeCallback = callback;
  }

  private animateRecursively(
      pathToVideoHtml: Map<string, HTMLVideoElement>, endMs = 10_000
  ) {
    const ctx = this.get2dContext();
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawer.draw(this.timeMs, ctx, pathToVideoHtml);
    this.talker.talk(this.timeMs);

    // TODO see if we need to disable this avoid jank.
    this.onChangeCallback(this.timeMs);

    const nextTimeMs = this.timeMs + this.msPerFrame;
    if (nextTimeMs > endMs) {
      return;
    }
    this.animateTimeoutId = window.setTimeout(() => {
      this.timeMs = nextTimeMs;
      this.animateRecursively(pathToVideoHtml, endMs);
    }, this.msPerFrame);
  }

  private get2dContext() {
    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      throw 'Failed to get 2D context from the canvas';
    }
    return ctx;
  }
}