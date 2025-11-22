import React from 'react';
import { Clip } from '../types';

interface TimelinePanelProps {
  clips: Clip[];
}

export const TimelinePanel: React.FC<TimelinePanelProps> = ({ clips }) => {
  return (
    <div className="timeline">
      <div className="panel-header">
        Timeline
        <div style={{fontSize: '0.7rem', fontWeight: 'normal'}}>00:00:00</div>
      </div>
      <div className="panel-content" style={{position: 'relative', overflowX: 'scroll', whiteSpace: 'nowrap'}}>
        {/* Time Ruler Placeholder */}
        <div style={{height: '20px', borderBottom: '1px solid #444', marginBottom: '10px', display: 'flex'}}>
          {[...Array(20)].map((_, i) => (
            <div key={i} style={{flex: '0 0 100px', borderLeft: '1px solid #444', paddingLeft: '4px', fontSize: '10px', color: '#666'}}>
              {i * 10}s
            </div>
          ))}
        </div>

        {/* Tracks Placeholder */}
        <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
          <div style={{height: '40px', background: '#2a2a2a', position: 'relative', minWidth: '2000px'}}>
             {/* Placeholder for Clips */}
             {clips.length > 0 ? (
               clips.map((clip, i) => (
                 <div key={clip.id} style={{
                   position: 'absolute',
                   left: `${clip.start * 10}px`, // 10px per second scale
                   width: `${clip.duration * 10}px`,
                   height: '100%',
                   background: '#007acc',
                   border: '1px solid #0098ff',
                   borderRadius: '4px',
                   display: 'flex',
                   alignItems: 'center',
                   justifyContent: 'center',
                   color: 'white',
                   fontSize: '0.8rem',
                   overflow: 'hidden'
                 }}>
                   Clip {i + 1}
                 </div>
               ))
             ) : (
               <div style={{padding: '10px', color: '#555', fontStyle: 'italic'}}>Drag video here (Placeholder)</div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};
