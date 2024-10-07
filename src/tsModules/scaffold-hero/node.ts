import { AudioSpeechNode } from "./audioSpeechNode";

// Avoid conflicting with Node from Web API.
export interface ShNode {
  commonNodeAttr: CommonNodeAttr,
}

export enum NodeType {
  Container = 'Container',
  AudioSpeech = 'AudioSpeech',
  VisualText = 'VisualText',
  // VideoFile = 'VideoFile',
}

export function deserializeToNode(json: any) {
    switch (json.commonNodeAttr.nodeType) {
      case NodeType.Container:
        return ContainerNode.deserialize(json);
      case NodeType.AudioSpeech:
        return AudioSpeechNode.deserialize(json);
      case NodeType.VisualText:
        return VisualTextNode.deserialize(json);
    }
    throw 'Forgot to implement deserializeToNode case: ' + json.commonNodeAttr.nodeType;

}

export class CommonNodeAttr {
  constructor(
    public nodeType = NodeType.Container,
    public idNum = 0,
    public name = '',
    public trackIdx = 0,
    public startMs = 0,
    public endMs = 2_000,
  ) {}
  static deserialize(json: any) {
    return new CommonNodeAttr(
      json.nodeType,
      json.idNum,
      json.name,
      json.trackIdx,
      json.startMs,
      json.endMs,
    )
  }
}

export class ContainerNode implements ShNode {
  constructor(
    public commonNodeAttr: CommonNodeAttr = new CommonNodeAttr(NodeType.Container),
    public nodes: ShNode[] = [],
  ) {}
  static deserialize(json: any) {
    return new ContainerNode(
      CommonNodeAttr.deserialize(json.commonNodeAttr),
      json.nodes.map((nodeJson: any) => deserializeToNode(nodeJson)),
    );
  }
  addNode(node: ShNode) {
    this.nodes.push(node);
    this.nodes.sort((node1: ShNode, node2: ShNode) => {
      // TODO see if we need to break ties.
      return node1.commonNodeAttr.startMs - node2.commonNodeAttr.startMs;
    });
  }

  getNestedNodes() {
    const res: ShNode[] = [];
    this.traversePreorder(node => res.push(node));
    return res;
  }

  // root -> left -> right
  traversePreorder(func: (arg: ShNode) => void) {
    func(this);
    this.nodes.forEach((node: ShNode) => {
      func(node);
      if (node instanceof ContainerNode) {
        node.traversePreorder(func);
      }
    });
  }

  // left -> right -> root
  traversePostorder(func: (arg: ShNode) => void) {
    this.nodes.forEach((node: ShNode) => {
      if (node instanceof ContainerNode) {
        node.traversePostorder(func);
      }
      func(node);
    });
  }

  fixEndPoints() {
    // TODO notify siblings and parents to fixEndPoints also.
    this.nodes.forEach(node => {
      this.commonNodeAttr.endMs = Math.max(
        this.commonNodeAttr.endMs,
        node.commonNodeAttr.endMs);
    });
  }
}

export class VisualTextNode implements ShNode {
constructor(
    public commonNodeAttr: CommonNodeAttr = new CommonNodeAttr(NodeType.VisualText),
    public text: string = '',
  ) {}
  static deserialize(json: any) {
    return new VisualTextNode(
      CommonNodeAttr.deserialize(json.commonNodeAttr),
      json.text,
    );
  }
}

export class VideoFileNode implements ShNode {
  constructor(
    public commonNodeAttr: CommonNodeAttr = new CommonNodeAttr(NodeType.VisualText),
    public filePath: string = 'data/matchplay.mov',
  ) {}
  static deserialize(json: any) {
    return new VisualTextNode(
      CommonNodeAttr.deserialize(json.commonNodeAttr),
      json.filePath,
    );
  }
}
