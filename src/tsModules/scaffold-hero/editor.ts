import { Cursor } from "./cursor";
import { ContainerNode, ShNode, VideoFileNode, VisualTextNode } from "./node";
import { AudioSpeechNode } from "./audioSpeechNode";
import { Project } from "./project";

class Unpersisted {
  public onChangeFunc: Function = () => {};
  public openedContainer: ContainerNode | null = null;
  public pathToVideoHtml: Map<string, HTMLVideoElement> = new Map();
}

export class Editor {
  public unpersisted: Unpersisted = new Unpersisted();
  constructor(
    public project: Project = new Project,
    // TODO add a ContainerListCursor to move between top-level containers.
    public cursor: Cursor = new Cursor,
    public openedContainerId: number = project.containers[0].commonNodeAttr.idNum,
  ) { }

  static deserialize(json: any) {
    const project = Project.deserialize(json.project);
    return new Editor(
      project,
      Cursor.deserialize(json.cursor),
      json.openedContainerId,
    );
  }

  serialize() {
    const json = JSON.parse(JSON.stringify(this));
    delete json.unpersisted;
    const str = JSON.stringify(json, null, 2);
    console.log(str);
    return str;
  }

  onChange(onChangeFunc: Function) {
    this.unpersisted.onChangeFunc = onChangeFunc;
  }
  private notify() {
    this.getOpenedContainer().fixEndPoints();
    this.unpersisted.onChangeFunc();
  }

  async handleEnter() {
    const res = prompt("Enter text for Audio Speech.");
    if (res === null) {
      return;
    }
    const node = new AudioSpeechNode();
    node.commonNodeAttr.idNum = this.genNextNodeId();
    node.commonNodeAttr.trackIdx = this.cursor.trackIdx;
    node.commonNodeAttr.startMs = this.cursor.timeMs;
    node.commonNodeAttr.endMs = this.cursor.timeMs + 2_000;
    node.text = res;
    this.getOpenedContainer().addNode(node);

    this.notify();

    await node.testAndUpdateDuration();
    this.notify();
  }
  handleShiftEnter() {
    const res = prompt("Enter text for Visual Text.");
    if (res === null) {
      return;
    }
    const node = new VisualTextNode();
    node.commonNodeAttr.idNum = this.genNextNodeId();
    node.commonNodeAttr.trackIdx = this.cursor.trackIdx;
    node.commonNodeAttr.startMs = this.cursor.timeMs;
    node.commonNodeAttr.endMs = this.cursor.timeMs + 2_000;
    node.text = res;
    this.getOpenedContainer().addNode(node);

    this.notify();
  }

  handleOpenFile() {
    const node = new VideoFileNode();
    node.commonNodeAttr.idNum = this.genNextNodeId();
    node.commonNodeAttr.trackIdx = this.cursor.trackIdx;
    node.commonNodeAttr.startMs = this.cursor.timeMs;
    node.commonNodeAttr.endMs = this.cursor.timeMs + 2_000;
    this.getOpenedContainer().addNode(node);
    this.notify();
  
    // editWindowUi would be a better place to have this but
    // we need this loaded here to get the durMs.
    const videoHtml = document.createElement('video');
    videoHtml.id = `video-file-node-video-html-${node.commonNodeAttr.idNum}`;
    videoHtml.src = node.filePath;
    videoHtml.style.display = 'none';
    document.body.appendChild(videoHtml);
    this.unpersisted.pathToVideoHtml.set(node.filePath, videoHtml);
    videoHtml.onloadedmetadata = () => {
      const durMs = Math.ceil(videoHtml.duration * 1_000);
      node.commonNodeAttr.endMs = this.cursor.timeMs + durMs;
      this.notify();
    }
  }
  setCursorTimeMs(timeMs = 0) {
    this.cursor.timeMs = timeMs;
    this.notify();
  }
  handleRight() {
    this.cursor.trackIdx += 1;
    this.notify();
  }
  handleLeft() {
    if (this.cursor.trackIdx > 0) {
      this.cursor.trackIdx -= 1;
    }
    this.notify();
  }
  handleUp() {
    this.cursor.timeMs -= 1_000;
    if (this.cursor.timeMs < 0) {
      this.cursor.timeMs = 0;
    }

    this.notify();
  }
  handleDown() {
    this.cursor.timeMs += 1_000;
    this.notify();
  }

  getOpenedContainer() {
    if (this.unpersisted.openedContainer !== null && this.unpersisted.openedContainer.commonNodeAttr.idNum === this.openedContainerId) {
      return this.unpersisted.openedContainer;
    }
    for (let container of this.project.containers) {
      if (container.commonNodeAttr.idNum === this.openedContainerId) {
        this.unpersisted.openedContainer = container;
        return container;
      }
    }
    throw 'Unable to find container with ID: ' + this.openedContainerId;
  }

  private genNextNodeId() {
    function getNodeIds(node: ShNode): number[] {
      const res = [node.commonNodeAttr.idNum];
      if (node instanceof ContainerNode) {
        return res.concat(node.nodes.flatMap((node: ShNode) => getNodeIds(node)));
      }
      return res;
    }
    return Math.max(...this.project.containers.flatMap(node => getNodeIds(node))) + 1;
  }
  
}
