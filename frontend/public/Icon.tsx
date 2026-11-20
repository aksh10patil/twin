'use client';

import React, { useId } from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  animated?: boolean;
}

const fourPointStar = (cx: number, cy: number, r: number) =>
  `M ${cx} ${cy - r} Q ${cx} ${cy} ${cx + r} ${cy} Q ${cx} ${cy} ${cx} ${cy + r} Q ${cx} ${cy} ${cx - r} ${cy} Q ${cx} ${cy} ${cx} ${cy - r} Z`;

export default function Icon({
  size = 32,
  animated = true,
  className = '',
  ...props
}: IconProps) {
  const uid = useId().replace(/:/g, '');
  const helmetClipId = `helmet-clip-${uid}`;
  const visorClipId = `visor-clip-${uid}`;

  const helmetPath =
    'M 118 72 C 152 72, 174 86, 181 111 C 192 115, 197 122, 197 130 C 197 138, 192 145, 181 149 C 174 174, 152 186, 118 186 C 84 186, 62 174, 55 149 C 44 145, 39 138, 39 130 C 39 122, 44 115, 55 111 C 62 86, 84 72, 118 72 Z';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 240 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`dt-icon-${uid} ${className}`.trim()}
      aria-label="Digital Twin Avatar"
      {...props}
    >
      <defs>
        <clipPath id={helmetClipId}>
          <path d={helmetPath} />
        </clipPath>
        <clipPath id={visorClipId}>
          <rect x="69" y="96" width="98" height="66" rx="32" />
        </clipPath>

        {animated && (
          <style>{`
            .dt-icon-${uid} .orbit-cw {
              transform-box: fill-box;
              transform-origin: center;
              animation: dt-spin-cw-${uid} 24s linear infinite;
            }
            .dt-icon-${uid} .orbit-ccw {
              transform-box: fill-box;
              transform-origin: center;
              animation: dt-spin-ccw-${uid} 32s linear infinite;
            }
            .dt-icon-${uid} .twinkle-a {
              transform-box: fill-box;
              transform-origin: center;
              animation: dt-twinkle-${uid} 3.2s ease-in-out infinite;
            }
            .dt-icon-${uid} .twinkle-b {
              transform-box: fill-box;
              transform-origin: center;
              animation: dt-twinkle-${uid} 3.2s ease-in-out 1.6s infinite;
            }
            .dt-icon-${uid} .bot-body {
              transform-box: fill-box;
              transform-origin: 50% 60%;
              animation: dt-curious-tilt-${uid} 6.5s ease-in-out infinite;
            }
            .dt-icon-${uid} .bot-antenna {
              transform-box: fill-box;
              transform-origin: 50% 92%;
              animation: dt-antenna-wobble-${uid} 6.5s ease-in-out infinite;
            }
            .dt-icon-${uid} .bot-gaze {
              animation: dt-curious-gaze-${uid} 6.5s ease-in-out infinite;
            }
            .dt-icon-${uid} .bot-eyes {
              transform-box: fill-box;
              transform-origin: center;
              animation: dt-blink-${uid} 6.5s ease-in-out infinite;
            }

            @keyframes dt-spin-cw-${uid} {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            @keyframes dt-spin-ccw-${uid} {
              from { transform: rotate(0deg); }
              to { transform: rotate(-360deg); }
            }
            @keyframes dt-twinkle-${uid} {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(0.72); opacity: 0.65; }
            }
            @keyframes dt-curious-tilt-${uid} {
              0%, 100% { transform: translateY(0px) rotate(0deg); }
              22% { transform: translateY(-3px) rotate(-4.5deg); }
              48% { transform: translateY(-1px) rotate(0deg); }
              72% { transform: translateY(-3.5px) rotate(5deg); }
            }
            @keyframes dt-antenna-wobble-${uid} {
              0%, 100% { transform: rotate(0deg); }
              25% { transform: rotate(-7deg); }
              50% { transform: rotate(2deg); }
              75% { transform: rotate(8deg); }
            }
            @keyframes dt-curious-gaze-${uid} {
              0%, 100% { transform: translate(0px, 0px); }
              18%, 32% { transform: translate(-3.5px, -1.5px); }
              48%, 55% { transform: translate(0px, 0px); }
              68%, 84% { transform: translate(3.5px, -1.5px); }
            }
            @keyframes dt-blink-${uid} {
              0%, 44%, 48%, 90%, 94%, 100% { transform: scaleY(1); }
              46%, 92% { transform: scaleY(0.1); }
            }

            @media (prefers-reduced-motion: reduce) {
              .dt-icon-${uid} * {
                animation: none !important;
              }
            }
          `}</style>
        )}
      </defs>

      {/* Outer Revolving Planets & Major Stars */}
      <g className="orbit-cw">
        {/* Invisible anchor circle centered on bot so orbit never clips */}
        <circle cx="118" cy="128" r="108" fill="none" />
        <circle cx="56" cy="65" r="6.5" stroke="#7B88EC" strokeWidth="3.5" />
        <circle cx="184" cy="195" r="6.5" stroke="#F7D126" strokeWidth="3.5" />
        <path className="twinkle-a" d={fourPointStar(81, 42, 6.5)} fill="#FF9A1F" />
        <path className="twinkle-b" d={fourPointStar(169, 57, 8)} fill="#F7D126" />
        <path className="twinkle-a" d={fourPointStar(88, 206, 7.5)} fill="#F7D126" />
        <circle cx="43" cy="91" r="2.8" fill="#FF9A1F" />
        <circle cx="192" cy="88" r="2.8" fill="#FF9A1F" />
      </g>

      {/* Inner Counter-Revolving Sparkles & Dots */}
      <g className="orbit-ccw">
        <circle cx="118" cy="128" r="106" fill="none" />
        <circle cx="100" cy="24" r="2" fill="#828CE8" />
        <circle cx="144" cy="54" r="2.5" fill="#828CE8" />
        <circle cx="31" cy="175" r="2" fill="#828CE8" />
        <path className="twinkle-b" d={fourPointStar(46, 191, 5.5)} fill="#7B88EC" />
        <circle cx="111" cy="222" r="2" fill="#828CE8" />
        <circle cx="128" cy="208" r="2.5" fill="#828CE8" />
        <path className="twinkle-a" d={fourPointStar(151, 211, 5.5)} fill="#FF9A1F" />
      </g>

      {/* Curious Bot Head & Antenna */}
      <g className="bot-body">
        {/* Antenna */}
        <g className="bot-antenna">
          <ellipse cx="128" cy="64" rx="5" ry="2.5" fill="#D5E2FF" />
          <path
            d="M 103 63 Q 118 53 133 63"
            stroke="#0B0B0F"
            strokeWidth="6.5"
            strokeLinecap="round"
          />
          <line
            x1="118"
            y1="57"
            x2="118"
            y2="41"
            stroke="#0B0B0F"
            strokeWidth="6.5"
            strokeLinecap="round"
          />
          <circle
            cx="118"
            cy="33"
            r="7.5"
            fill="#FFFFFF"
            stroke="#0B0B0F"
            strokeWidth="6.5"
          />
        </g>

        {/* Outer Helmet Fill + Inner Cel Shading */}
        <g clipPath={`url(#${helmetClipId})`}>
          <rect x="35" y="68" width="166" height="122" fill="#D5E2FF" />
          <path d={helmetPath} fill="#FFFFFF" transform="translate(-4, -5)" />
        </g>

        {/* Outer Helmet Broken Outline */}
        <path
          d={helmetPath}
          pathLength={100}
          stroke="#0B0B0F"
          strokeWidth="6.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="49.5 2.5 0.1 2.4 39.5 2.5 1.2 2.3"
          strokeDashoffset={10.5}
        />

        {/* Inner Visor Fill + Shading + Curious Face */}
        <g clipPath={`url(#${visorClipId})`}>
          <rect x="69" y="96" width="98" height="66" fill="#C5D6FF" />
          <rect x="69" y="101" width="98" height="66" rx="30" fill="#DCE6FF" />

          <g className="bot-gaze">
            {/* Cheeks */}
            <ellipse cx="89" cy="138" rx="6" ry="3.5" fill="#C2D3FB" />
            <ellipse cx="147" cy="138" rx="6" ry="3.5" fill="#C2D3FB" />

            {/* Eyes */}
            <g className="bot-eyes">
              <circle cx="91" cy="128" r="5.5" fill="#0B0B0F" />
              <circle cx="145" cy="128" r="5.5" fill="#0B0B0F" />
            </g>

            {/* Smile */}
            <path
              d="M 111 139 Q 118 146 125 139"
              stroke="#0B0B0F"
              strokeWidth="5.5"
              strokeLinecap="round"
            />
          </g>
        </g>

        {/* Inner Visor Outline */}
        <rect
          x="69"
          y="96"
          width="98"
          height="66"
          rx="32"
          stroke="#0B0B0F"
          strokeWidth="6.5"
        />
      </g>
    </svg>
  );
}