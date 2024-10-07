
export interface Trigger {
  common: CommonTriggerAttr;
  // clone: () => Position
}


export enum TriggerType {
  Time,
  // EstimatedTime,
  // StartEvent,
  // EndEvent,
  // Event,
};

class CommonTriggerAttr {
  constructor(
    public readonly type: TriggerType = TriggerType.Time,
  ) {}
}

export class TimeTrigger implements Trigger {
  constructor(
    public common: CommonTriggerAttr = new CommonTriggerAttr(TriggerType.Time),
    public timeMs: number = 0,
  ) {}
}

// export class EndEventTrigger implements Trigger {
//   constructor(
//     public common: CommonTriggerAttr = new CommonTriggerAttr(TriggerType.EndEvent),
//     public assetId: string,
//   ) {}
// }
