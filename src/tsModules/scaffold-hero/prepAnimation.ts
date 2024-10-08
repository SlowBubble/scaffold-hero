import { ShNode } from "./node";

export interface StartInfo<N extends ShNode> {
  startMs: number,
  nodes: N[],
}

export function computeOneTimeStartInfos<N extends ShNode>(nodes: N[]) {
  const sorted = nodes.map(node => {
    return {
      startMs: node.commonNodeAttr.startMs,
      nodes: [node],
    }
  });
  sorted.sort((node1, node2) => node1.startMs - node2.startMs);
  return sorted;
}

export function computeRecurringStartInfos<N extends ShNode>(nodes: N[]) {
  const starts = new Set<number>;
  nodes.forEach(node => {
    starts.add(node.commonNodeAttr.startMs);
    starts.add(node.commonNodeAttr.endMs);
  });
  const sorted = [...starts];
  sorted.sort((a, b) => a - b);
  const startInfos = sorted.map(start => {
    return {
      startMs: start,
      nodes: [],
    }
  });
  
  startInfos.forEach((startInfo: StartInfo<N>) => {
    const timeMs = startInfo.startMs;
    startInfo.nodes = nodes.filter(node => {
      return node.commonNodeAttr.startMs <= timeMs && timeMs < node.commonNodeAttr.endMs;
    });
    startInfo.nodes.sort(
      (node1, node2) => node1.commonNodeAttr.trackIdx - node2.commonNodeAttr.trackIdx);
  });
  return startInfos;
}
