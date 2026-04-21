import React from 'react';

export default function Card({ children, style = {}, padding = '1.5rem', hoverable = false }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <div
      onMouseEnter={() => hoverable && setHovered(true)}
      onMouseLeave={() => hoverable && setHovered(false)}
      style={{
        background: '#fbfaf7',
        border: '1px solid rgba(37,34,27,0.1)',
        borderRadius: 16,
        padding,
        boxShadow: hovered
          ? '0 8px 24px rgba(37,34,27,0.1)'
          : '0 2px 8px rgba(37,34,27,0.05)',
        transition: 'box-shadow 0.2s ease',
        ...style,
      }}>
      {children}
    </div>
  );
}