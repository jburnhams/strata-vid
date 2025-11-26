
// Utility to get color from a gradient
export const getColor = (value: number, grad: Record<number, string>): string => {
    const sortedStops = Object.keys(grad).map(parseFloat).sort();

    if (value <= sortedStops[0]) return grad[sortedStops[0]];
    if (value >= sortedStops[sortedStops.length - 1]) return grad[sortedStops[sortedStops.length - 1]];

    let color1: string = grad[sortedStops[0]];
    let color2: string = grad[sortedStops[sortedStops.length - 1]];
    let stop1 = sortedStops[0];
    let stop2 = sortedStops[sortedStops.length - 1];

    for (let i = 0; i < sortedStops.length; i++) {
        if (sortedStops[i] < value) {
            stop1 = sortedStops[i];
            color1 = grad[sortedStops[i]];
        }
        if (sortedStops[i] >= value) {
            stop2 = sortedStops[i];
            color2 = grad[sortedStops[i]];
            break;
        }
    }

    const range = stop2 - stop1;
    const ratio = range === 0 ? 1 : (value - stop1) / range;

    const r1 = parseInt(color1.substring(1, 3), 16);
    const g1 = parseInt(color1.substring(3, 5), 16);
    const b1 = parseInt(color1.substring(5, 7), 16);

    const r2 = parseInt(color2.substring(1, 3), 16);
    const g2 = parseInt(color2.substring(3, 5), 16);
    const b2 = parseInt(color2.substring(5, 7), 16);

    const r = Math.round(r1 + (r2 - r1) * ratio);
    const g = Math.round(g1 + (g2 - g1) * ratio);
    const b = Math.round(b1 + (b2 - b1) * ratio);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};
