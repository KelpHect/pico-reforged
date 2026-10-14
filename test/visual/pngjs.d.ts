// Minimal types for the parts of pngjs the harness uses (no @types/pngjs installed).
declare module "pngjs" {
  export class PNG {
    constructor(options: { width: number; height: number });
    width: number;
    height: number;
    data: Buffer;
    static sync: { read(buf: Buffer): PNG; write(png: PNG): Buffer };
    static bitblt(
      src: PNG,
      dst: PNG,
      srcX: number,
      srcY: number,
      width: number,
      height: number,
      deltaX: number,
      deltaY: number,
    ): void;
  }
}
