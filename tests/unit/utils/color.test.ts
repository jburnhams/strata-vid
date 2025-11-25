
import { getColor } from '../../../src/utils/color';

describe('Color Utility', () => {
    const gradient = {
        0.0: '#0000ff', // blue
        0.5: '#00ff00', // green
        1.0: '#ff0000', // red
    };

    it('returns the start color for values at or below the minimum', () => {
        expect(getColor(0.0, gradient)).toBe('#0000ff');
        expect(getColor(-0.1, gradient)).toBe('#0000ff');
    });

    it('returns the end color for values at or above the maximum', () => {
        expect(getColor(1.0, gradient)).toBe('#ff0000');
        expect(getColor(1.1, gradient)).toBe('#ff0000');
    });

    it('interpolates colors correctly', () => {
        // 0.25 is halfway between blue (0) and green (0.5)
        expect(getColor(0.25, gradient)).toBe('#008080');

        // 0.75 is halfway between green (0.5) and red (1.0)
        expect(getColor(0.75, gradient)).toBe('#808000');
    });
});
