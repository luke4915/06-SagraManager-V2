import { useState, useEffect } from 'react';

/**
 * Hook per rilevare se lo schermo è sotto il breakpoint xl (1280px)
 * che abbiamo scelto come separatore tra Mobile/Tablet e Desktop.
 */
export const useIsMobile = (breakpoint = 1280) => {
    const [isMobile, setIsMobile] = useState(() => {
        // Controllo di sicurezza se girasse lato server (SSR)
        if (typeof window !== 'undefined') {
            return window.innerWidth < breakpoint;
        }
        return false;
    });

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < breakpoint);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [breakpoint]);

    return isMobile;
};