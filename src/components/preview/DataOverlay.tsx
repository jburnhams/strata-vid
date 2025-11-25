import React from 'react';
import { DataOverlayOptions, TextStyle } from '../../types';

interface GpxDataPoint {
  ele?: number;
  speed?: number; // meters per second
  dist?: number; // meters from start
}

interface DataOverlayProps {
  gpxData: GpxDataPoint;
  className?: string;
  style?: React.CSSProperties;
  options?: DataOverlayOptions;
  textStyle?: TextStyle;
}

const defaultOptions: DataOverlayOptions = {
  showSpeed: true,
  showDistance: true,
  showElevation: true,
  speedUnit: 'kmh',
  distanceUnit: 'km',
  elevationUnit: 'm',
};

const defaultTextStyle: TextStyle = {
  fontFamily: 'sans-serif',
  fontSize: 16,
  fontWeight: 'normal',
  color: 'white',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  textAlign: 'left',
};

const DataOverlay: React.FC<DataOverlayProps> = ({ gpxData, className, style, options: customOptions, textStyle: customTextStyle }) => {
  const options = { ...defaultOptions, ...customOptions };
  const textStyle = { ...defaultTextStyle, ...customTextStyle };

  const formatSpeed = (speed: number) => {
    switch (options.speedUnit) {
      case 'mph':
        return `${(speed * 2.23694).toFixed(1)} mph`;
      case 'm/s':
        return `${speed.toFixed(1)} m/s`;
      case 'kmh':
      default:
        return `${(speed * 3.6).toFixed(1)} km/h`;
    }
  };

  const formatDistance = (dist: number) => {
    switch (options.distanceUnit) {
      case 'mi':
        return `${(dist / 1609.34).toFixed(2)} mi`;
      case 'm':
        return `${dist.toFixed(0)} m`;
      case 'km':
      default:
        return `${(dist / 1000).toFixed(2)} km`;
    }
  };

  const formatElevation = (ele: number) => {
    switch (options.elevationUnit) {
      case 'ft':
        return `${(ele * 3.28084).toFixed(0)} ft`;
      case 'm':
      default:
        return `${ele.toFixed(1)} m`;
    }
  };

  const containerStyle: React.CSSProperties = {
    ...style,
    fontFamily: textStyle.fontFamily,
    fontSize: `${textStyle.fontSize}px`,
    fontWeight: textStyle.fontWeight,
    color: textStyle.color,
    backgroundColor: textStyle.backgroundColor,
    textAlign: textStyle.textAlign,
    padding: '0.5em',
    borderRadius: '0.25em',
  };

  return (
    <div className={className} style={containerStyle} data-testid="data-overlay">
      {options.showSpeed && gpxData.speed !== undefined && <p>Speed: {formatSpeed(gpxData.speed)}</p>}
      {options.showDistance && gpxData.dist !== undefined && <p>Distance: {formatDistance(gpxData.dist)}</p>}
      {options.showElevation && gpxData.ele !== undefined && <p>Elevation: {formatElevation(gpxData.ele)}</p>}
    </div>
  );
};

export default DataOverlay;
