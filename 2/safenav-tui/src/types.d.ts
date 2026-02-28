declare module 'speaker' {
  import { Writable } from 'stream';

  interface SpeakerOptions {
    channels?: number;
    bitDepth?: number;
    sampleRate?: number;
    signed?: boolean;
    float?: boolean;
    samplesPerFrame?: number;
    device?: string;
  }

  class Speaker extends Writable {
    constructor(options?: SpeakerOptions);
  }

  export = Speaker;
}

declare module 'node-record-lpcm16' {
  import { Readable } from 'stream';

  interface RecordOptions {
    sampleRate?: number;
    channels?: number;
    audioType?: string;
    recorder?: string;
    threshold?: number;
    silence?: string;
    endOnSilence?: boolean;
    device?: string;
  }

  interface Recording {
    stream(): Readable;
    stop(): void;
    pause(): void;
    resume(): void;
  }

  function record(options?: RecordOptions): Recording;

  export { record, Recording, RecordOptions };
}
