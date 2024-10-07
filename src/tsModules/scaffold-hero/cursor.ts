
export class Cursor {
  constructor(
    public timeMs: number = 0,
    public trackIdx: number = 0,
  ) {}
  static deserialize(json: any) {
    return new Cursor(
      json.timeMs,
      json.trackIdx,
    );
  }
}