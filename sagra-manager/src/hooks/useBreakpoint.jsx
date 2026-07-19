import { useState, useEffect } from 'react';

/**
 * Hook per rilevare se lo schermo è sotto il breakpoint xl (768px)
 * che abbiamo scelto come separatore tra Mobile e Desktop.
 * tablet usa lo stesso UI del PC/Mac
 */
export const useIsMobile = (breakpoint = 768) => {
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