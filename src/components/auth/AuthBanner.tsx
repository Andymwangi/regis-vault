'use client';

export function AuthBanner() {
  return (
    <div className="relative lg:w-full bg-gradient-to-br from-[#FF6B6B] to-[#FF4757] min-h-[200px] lg:min-h-screen overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 1000 1000" 
          preserveAspectRatio="xMidYMid slice" 
          className="w-full h-full object-cover"
        >
          <defs>
            <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#FF6B6B', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#FF4757', stopOpacity: 1 }} />
            </linearGradient>
            <filter id="shadowEffect" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="10"/>
              <feOffset dx="5" dy="5" result="offsetblur"/>
              <feFlood floodColor="#000000" floodOpacity="0.3"/>
              <feComposite in2="offsetblur" operator="in"/>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          <rect width="100%" height="100%" fill="url(#bg-gradient)"/>
          
          <g opacity="0.2">
            <path d="M-50 200 L250 100 L600 300 L300 400 Z" fill="white"/>
            <path d="M750 600 L450 500 L800 400 L1050 700 Z" fill="white"/>
          </g>
          
          <g transform="translate(200, 200) scale(1.2)" filter="url(#shadowEffect)">
            <path d="M0 50 C0 22.4 22.4 0 50 0 H250 C277.6 0 300 22.4 300 50 V300 C300 327.6 277.6 350 250 350 H50 C22.4 350 0 327.6 0 300 Z" 
                  fill="white" fillOpacity="0.9"/>
            
            <g transform="translate(50, 100)">
              <rect x="0" y="0" width="80" height="100" rx="10" ry="10" fill="#E0E0E0"/>
              <rect x="20" y="70" width="40" height="5" fill="#A0A0A0"/>
              <rect x="20" y="80" width="40" height="5" fill="#A0A0A0"/>
            </g>
            
            <g transform="translate(160, 100)">
              <rect x="0" y="0" width="80" height="100" rx="10" ry="10" fill="#D0D0D0"/>
              <rect x="20" y="70" width="40" height="5" fill="#909090"/>
              <rect x="20" y="80" width="40" height="5" fill="#909090"/>
            </g>
          </g>
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full min-h-[200px] lg:min-h-screen text-white px-8 py-12">
        <h1 className="text-3xl lg:text-4xl font-bold mb-4 text-center">Welcome to RegisVault</h1>
        <p className="text-lg lg:text-xl text-center opacity-90 max-w-lg">
          Your secure document management solution. Store, share, and collaborate with confidence.
        </p>
      </div>
    </div>
  );
} 