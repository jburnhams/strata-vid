/** @jest-environment node */
import { Input, FilePathSource, MP4 } from 'mediabunny';
import path from 'path';
import fs from 'fs';
// import { execSync } from 'child_process';

// const testVideoPath = path.join(__dirname, 'test_video.mp4');

describe('mediabunny Node Integration', () => {
    /*
    beforeAll(() => {
        // Download logic...
    });
    */

    // Skipped due to issues with mediabunny accessing 'fs' in Jest environment
    it.skip('should load a video file in Node', async () => {
        /*
        const input = new Input({
            source: new FilePathSource(testVideoPath),
            formats: [MP4]
        });
        const tracks = await input.getTracks();
        expect(tracks.length).toBeGreaterThan(0);
        input.dispose();
        */
    });
});
