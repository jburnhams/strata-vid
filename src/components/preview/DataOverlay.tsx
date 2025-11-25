import React from 'react';

interface GpxDataPoint {
  ele?: number;
  speed?: number; // meters per second
  dist?: number; // meters from start
}

interface DataOverlayProps {
  gpxData: GpxDataPoint;
  className?: string;
  style?: React.CSSProperties;
}

const DataOverlay: React.FC<DataOverlayProps> = ({ gpxData, className, style }) => {
  const formatSpeed = (speed: number) => {
    // Convert m/s to km/h
    return (speed * 3.6).toFixed(1);
  };

  const formatDistance = (dist: number) => {
    // Convert m to km
    return (dist / 1000).toFixed(2);
  };

  return (
    <div className={className} style={style} data-testid="data-overlay">
      <div className="p-2 bg-black bg-opacity-50 text-white rounded">
        {gpxData.speed !== undefined && <p>Speed: {formatSpeed(gpxData.speed)} km/h</p>}
        {gpxData.dist !== undefined && <p>Distance: {formatDistance(gpxData.dist)} km</p>}
        {gpxData.ele !== undefined && <p>Elevation: {gpxData.ele.toFixed(1)} m</p>}
      </div>
    </div>
  );
};

export default DataOverlay;
