import { ContainerNode, deserializeToNode } from "./node";

// Design: for the final result, just pick 1 of assets and click record.
// 
export class Project {
  constructor(
    public id = `${(new Date()).toLocaleDateString()} ${(new Date()).toLocaleTimeString()}`,
    public title = id,
    public containers: ContainerNode[] = [new ContainerNode()],
  ) {}

  static deserialize(json: any) {
    return new Project(
      json.id,
      json.title,
      json.containers.map((nodeObj: Object) => deserializeToNode(nodeObj)),
    );
  }
}