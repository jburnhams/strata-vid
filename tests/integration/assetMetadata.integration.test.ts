/** @jest-environment node */
// What the library reads from real files: the generated fixtures in tests/fixtures/media, read by
// mediabunny itself rather than a mock of it. Mocks shaped like ffprobe's output hid issue #142 (the
// loader asked mediabunny for fields it does not have, so most details were blank and the date came
// from the file's modified time). ffprobe reads these files as: GX010412.MP4, MP4 (isom), H.264
// 640×360 at 25 fps, AAC 48 kHz stereo, creation_time 2026-05-03T06:43:38Z; ridge-loop.gpx's first
// point is at 2026-05-03T06:41:08Z.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AssetLoader } from '../../src/services/AssetLoader';

const MEDIA = join(__dirname, '..', 'fixtures', 'media');
// The file's modified time is deliberately a day later than its recording, as on a copied card.
const fixture = (name: string, type: string) =>
  new File([readFileSync(join(MEDIA, name))], name, { type, lastModified: Date.parse('2026-05-04T12:00:00Z') });

describe('reading imported files', () => {
  beforeAll(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {}); // no Web Audio here, so no waveform
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  it("takes an MP4's recording date and details from the file", async () => {
    const asset = await AssetLoader.loadAsset(fixture('GX010412.MP4', 'video/mp4'));
    expect(asset.creationTime?.toISOString()).toBe('2026-05-03T06:43:38.000Z');
    expect(asset.creationTimeSource).toBe('metadata');
    expect(asset.duration).toBeCloseTo(8, 1);
    expect(asset.resolution).toEqual({ width: 640, height: 360 });
    expect(asset.videoMetadata).toEqual(expect.objectContaining({
      format: 'MP4', videoCodec: 'avc', frameRate: 25, audioCodec: 'aac', sampleRate: 48000, channels: 2,
    }));
    expect(asset.videoMetadata?.bitrate).toBeGreaterThan(300_000);
    expect(asset.videoMetadata?.bitrate).toBeLessThan(2_000_000);
  });

  it("takes a GPX file's date from its first point", async () => {
    const asset = await AssetLoader.loadAsset(fixture('ridge-loop.gpx', 'application/gpx+xml'));
    expect(asset.creationTime?.toISOString()).toBe('2026-05-03T06:41:08.000Z');
    expect(asset.creationTimeSource).toBe('metadata');
  });
});
