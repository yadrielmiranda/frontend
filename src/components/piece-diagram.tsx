// src/components/ui/piece-diagram.tsx
import React from "react";

interface PieceDiagramProps {
  width: number;
  height: number;
  productName?: string;
  configuration?: string;
}

const ConfigurableHorizontalSlidingDiagram = ({ width, height, configuration = "XO" }: { width: number, height: number, configuration?: string }) => {
    const numPanels = configuration.length || 2;
    const frameThickness = Math.min(width, height) * 0.07;
    const sashThickness = frameThickness * 0.4;
    const glassFillColor = "#F0F9FF";

    const innerTop = frameThickness;
    const innerBottom = height - frameThickness;
    const innerLeft = frameThickness;
    const innerRight = width - frameThickness;
    const innerHeight = height - (2 * frameThickness);
    const innerWidth = width - (2 * frameThickness);
    
    const panelWidth = innerWidth / numPanels;

    const drawArrow = (x: number, y: number, w: number, direction: 'left' | 'right') => {
        const arrowWidth = w * 0.4;
        const arrowHeadSize = 6;
        const centerX = x + w / 2;
        if (direction === 'right') {
            const startX = centerX - arrowWidth / 2;
            const endX = centerX + arrowWidth / 2;
            return ( <g stroke="black" strokeWidth="2" fill="none"> <line x1={startX} y1={y} x2={endX} y2={y} /> <polyline points={`${endX - arrowHeadSize},${y - arrowHeadSize} ${endX},${y} ${endX - arrowHeadSize},${y + arrowHeadSize}`} /> </g> );
        } else {
            const startX = centerX + arrowWidth / 2;
            const endX = centerX - arrowWidth / 2;
            return ( <g stroke="black" strokeWidth="2" fill="none"> <line x1={startX} y1={y} x2={endX} y2={y} /> <polyline points={`${endX + arrowHeadSize},${y - arrowHeadSize} ${endX},${y} ${endX + arrowHeadSize},${y + arrowHeadSize}`} /> </g> );
        }
    };

    return (
        <g stroke="black" strokeWidth="1">
            {/* 1. Marco Exterior y Vidrio de fondo */}
            <rect x="0" y="0" width={width} height={height} fill="white" strokeWidth="2"/>
            <rect x={innerLeft} y={innerTop} width={innerWidth} height={innerHeight} fill={glassFillColor} stroke="none" />

            {/* 2. Rieles Horizontales de los Paneles (Sash) */}
            <g fill="white">
                <rect x={innerLeft} y={innerTop} width={innerWidth} height={sashThickness} />
                <rect x={innerLeft} y={innerBottom - sashThickness} width={innerWidth} height={sashThickness} />
            </g>

            {/* 3. Perfiles Verticales (Stiles) */}
            <g fill="white">
                {/* Stile de la Izquierda */}
                <rect x={innerLeft} y={innerTop} width={configuration[0] === 'X' ? sashThickness * 2 : sashThickness} height={innerHeight} />
                {configuration[0] === 'X' && (
                    <>
                        <line x1={innerLeft + sashThickness * 0.5} y1={innerTop} x2={innerLeft + sashThickness * 0.5} y2={innerBottom} />
                        <line x1={innerLeft + sashThickness} y1={innerTop} x2={innerLeft + sashThickness} y2={innerBottom} />
                    </>
                )}

                {/* CAMBIO: Stile de la Derecha ahora también puede tener detalle */}
                <rect x={innerRight - (configuration[numPanels - 1] === 'X' ? sashThickness * 2 : sashThickness)} y={innerTop} width={configuration[numPanels - 1] === 'X' ? sashThickness * 2 : sashThickness} height={innerHeight} />
                {configuration[numPanels - 1] === 'X' && (
                    <>
                        <line x1={innerRight - sashThickness * 1.5} y1={innerTop} x2={innerRight - sashThickness * 1.5} y2={innerBottom} />
                        <line x1={innerRight - sashThickness} y1={innerTop} x2={innerRight - sashThickness} y2={innerBottom} />
                    </>
                )}

                {/* Divisiones Intermedias (si las hay) */}
                {Array.from({ length: numPanels - 1 }).map((_, i) => (
                    <rect key={i} x={innerLeft + (i + 1) * panelWidth - sashThickness} y={innerTop} width={sashThickness * 2} height={innerHeight} />
                ))}
            </g>
            
            {/* 4. Flechas */}
            {configuration.split('').map((type, i) =>
                type === 'X' && (
                    <g key={`arrow-${i}`}>
                        {drawArrow(innerLeft + i * panelWidth, height / 2, panelWidth, 
                            configuration === 'OX' ? 'left' : 
                            configuration === 'XOX' && i > 0 ? 'left' : 'right'
                        )}
                    </g>
                )
            )}
        </g>
    );
};

const SingleHungDiagram = ({ width, height }: { width: number, height: number }) => {
    const BaseRollingForSingleHung = ({ width, height }: { width: number, height: number }) => {
        const frameThickness = Math.min(width, height) * 0.07;
        const sashThickness = frameThickness * 0.4;
        const glassFillColor = "#F0F9FF";
        const midX = width / 2;
        const innerTop = frameThickness;
        const innerBottom = height - frameThickness;
        const innerLeft = frameThickness;
        const innerRight = width - frameThickness;
        const innerHeight = height - (2 * frameThickness);
        return (
            <g stroke="black" strokeWidth="1">
            <rect x="0" y="0" width={width} height={height} fill="white" strokeWidth="2"/>
            <rect x={innerLeft} y={innerTop} width={width - 2 * frameThickness} height={innerHeight} fill={glassFillColor} stroke="none" />
            <g fill="white">
                <rect x={innerLeft + sashThickness * 2} y={innerTop} width={midX - (innerLeft + sashThickness * 2)} height={sashThickness} />
                <rect x={midX + sashThickness} y={innerTop} width={innerRight - sashThickness - (midX + sashThickness)} height={sashThickness} />
                <rect x={innerLeft + sashThickness * 2} y={innerBottom - sashThickness} width={midX - (innerLeft + sashThickness * 2)} height={sashThickness} />
                <rect x={midX + sashThickness} y={innerBottom - sashThickness} width={innerRight - sashThickness - (midX + sashThickness)} height={sashThickness} />
            </g>
            <g fill="white">
                <rect x={innerLeft} y={innerTop} width={sashThickness * 2} height={innerHeight} />
                <line x1={innerLeft + sashThickness * 0.5} y1={innerTop} x2={innerLeft + sashThickness * 0.5} y2={innerBottom} />
                <line x1={innerLeft + sashThickness} y1={innerTop} x2={innerLeft + sashThickness} y2={innerBottom} />
                <rect x={innerRight - sashThickness} y={innerTop} width={sashThickness} height={innerHeight} />
                <rect x={midX - sashThickness} y={innerTop} width={sashThickness * 2} height={innerHeight} />
            </g>
            <g strokeWidth="2" fill="none">
                <line x1={width * 0.25} y1={height / 2} x2={width * 0.45} y2={height / 2} />
                <polyline points={`${width * 0.4},${height * 0.5 - 6} ${width * 0.45},${height / 2} ${width * 0.4},${height * 0.5 + 6}`} />
            </g>
            </g>
        );
    };
    return (
        <g transform={`rotate(-90, ${width / 2}, ${height / 2})`}>
            <g transform={`translate(${(width - height) / 2}, ${(height - width) / 2})`}>
                <BaseRollingForSingleHung width={height} height={width} />
            </g>
        </g>
    );
};

export const PieceDiagram = ({ width, height, productName, configuration }: PieceDiagramProps) => {
  if (!width || !height || width <= 0 || height <= 0) {
    return ( <div className="flex items-center justify-center h-full bg-gray-100 rounded-md"><p className="text-sm text-gray-500">Enter dimensions</p></div> );
  }

  const maxDimension = 200;
  let scaledWidth: number;
  let scaledHeight: number;

  if (width >= height) {
    scaledWidth = maxDimension;
    scaledHeight = maxDimension * (height / width);
  } else {
    scaledHeight = maxDimension;
    scaledWidth = maxDimension * (width / height);
  }

  const offsetX = (maxDimension - scaledWidth) / 2;
  const offsetY = (maxDimension - scaledHeight) / 2;

  return (
    <div className="p-2 border rounded-md w-full h-full flex flex-col items-center justify-center">
      <svg width="100%" height="100%" viewBox={`-40 -30 ${maxDimension + 80} ${maxDimension + 60}`} preserveAspectRatio="xMidYMid meet">
        <text x={offsetX + scaledWidth / 2} y={offsetY - 10} textAnchor="middle" fontSize="12" fill="black">{width}"</text>
        <text y={offsetX - 15} x={-(offsetY + scaledHeight / 2)} transform="rotate(-90)" textAnchor="middle" fontSize="12" fill="black">{height}"</text>
        <g transform={`translate(${offsetX}, ${offsetY})`}>
          {productName === "Horizontal Rolling" && <ConfigurableHorizontalSlidingDiagram width={scaledWidth} height={scaledHeight} configuration={configuration} />}
          {productName === "Single Hung" && <SingleHungDiagram width={scaledWidth} height={scaledHeight} />}
          {!["Horizontal Rolling", "Single Hung"].includes(productName || "") && (<rect x="0" y="0" width={scaledWidth} height={scaledHeight} fill="#F0F9FF" stroke="black" strokeWidth="2"/>)}
        </g>
      </svg>
    </div>
  );
};