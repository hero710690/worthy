import { useState, useEffect } from 'react';
import { useTheme, useMediaQuery } from '@mui/material';

interface MobileInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  screenWidth: number;
  screenHeight: number;
  orientation: 'portrait' | 'landscape';
  hasNotch: boolean;
}

export const useMobile = (): MobileInfo => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));

  const [mobileInfo, setMobileInfo] = useState<MobileInfo>({
    isMobile,
    isTablet,
    isDesktop,
    isTouchDevice: false,
    isIOS: false,
    isAndroid: false,
    screenWidth: 0,
    screenHeight: 0,
    orientation: 'portrait',
    hasNotch: false,
  });

  useEffect(() => {
    const updateMobileInfo = () => {
      const userAgent = navigator.userAgent;
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isIOS = /iPad|iPhone|iPod/.test(userAgent);
      const isAndroid = /Android/.test(userAgent);
      
      // Detect notch/safe area
      const hasNotch = CSS.supports('padding: max(0px)') && 
                      (window.screen.height === 812 || // iPhone X/XS
                       window.screen.height === 896 || // iPhone XR/XS Max
                       window.screen.height === 844 || // iPhone 12/13 mini
                       window.screen.height === 926 || // iPhone 12/13/14
                       window.screen.height === 932);  // iPhone 14 Plus

      const orientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';

      setMobileInfo({
        isMobile,
        isTablet,
        isDesktop,
        isTouchDevice,
        isIOS,
        isAndroid,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        orientation,
        hasNotch,
      });
    };

    updateMobileInfo();

    // Listen for orientation changes
    const handleResize = () => {
      updateMobileInfo();
    };

    const handleOrientationChange = () => {
      // Delay to ensure dimensions are updated
      setTimeout(updateMobileInfo, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [isMobile, isTablet, isDesktop]);

  return mobileInfo;
};

// Hook for mobile-specific behaviors
export const useMobileBehaviors = () => {
  const mobile = useMobile();

  // Prevent zoom on input focus (iOS)
  useEffect(() => {
    if (mobile.isIOS) {
      const preventZoom = (e: TouchEvent) => {
        if (e.touches.length > 1) {
          e.preventDefault();
        }
      };

      document.addEventListener('touchstart', preventZoom, { passive: false });
      return () => document.removeEventListener('touchstart', preventZoom);
    }
  }, [mobile.isIOS]);

  // Handle viewport height changes (mobile browsers)
  useEffect(() => {
    if (mobile.isMobile) {
      const setVH = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
      };

      setVH();
      window.addEventListener('resize', setVH);
      window.addEventListener('orientationchange', () => {
        setTimeout(setVH, 100);
      });

      return () => {
        window.removeEventListener('resize', setVH);
        window.removeEventListener('orientationchange', setVH);
      };
    }
  }, [mobile.isMobile]);

  return {
    ...mobile,
    // Utility functions
    getOptimalImageSize: () => {
      if (mobile.isMobile) {
        return mobile.screenWidth <= 480 ? 'small' : 'medium';
      }
      return 'large';
    },
    
    getOptimalChartHeight: () => {
      if (mobile.isMobile) {
        return mobile.orientation === 'portrait' ? 200 : 150;
      }
      return 300;
    },
    
    shouldUseBottomSheet: () => mobile.isMobile && mobile.orientation === 'portrait',
    
    getOptimalCardSpacing: () => mobile.isMobile ? 1 : 2,
    
    getOptimalGridColumns: () => {
      if (mobile.isMobile) {
        return mobile.orientation === 'portrait' ? 1 : 2;
      }
      return mobile.isTablet ? 2 : 3;
    },
  };
};

// Hook for mobile-optimized animations
export const useMobileAnimations = () => {
  const mobile = useMobile();
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  return {
    shouldAnimate: !prefersReducedMotion && !mobile.isMobile,
    transitionDuration: mobile.isMobile ? 200 : 300,
    easing: mobile.isMobile ? 'ease-out' : 'ease-in-out',
    
    // Optimized animation configs
    slideTransition: {
      duration: mobile.isMobile ? 200 : 300,
      easing: 'ease-out',
    },
    
    fadeTransition: {
      duration: mobile.isMobile ? 150 : 250,
      easing: 'ease-in-out',
    },
    
    scaleTransition: {
      duration: mobile.isMobile ? 100 : 200,
      easing: 'ease-out',
    },
  };
};

// Hook for mobile-specific performance optimizations
export const useMobilePerformance = () => {
  const mobile = useMobile();

  useEffect(() => {
    if (mobile.isMobile) {
      // Enable GPU acceleration for smooth scrolling
      document.body.style.transform = 'translateZ(0)';
      
      // Optimize touch scrolling
      document.body.style.webkitOverflowScrolling = 'touch';
      document.body.style.overflowScrolling = 'touch';

      return () => {
        document.body.style.transform = '';
        document.body.style.webkitOverflowScrolling = '';
        document.body.style.overflowScrolling = '';
      };
    }
  }, [mobile.isMobile]);

  return {
    // Performance utilities
    shouldLazyLoad: mobile.isMobile,
    shouldVirtualize: mobile.isMobile && mobile.screenHeight < 700,
    shouldPreloadImages: !mobile.isMobile,
    shouldUseWebP: 'webp' in document.createElement('canvas').getContext('2d'),
    
    // Memory management
    getOptimalCacheSize: () => mobile.isMobile ? 50 : 100,
    shouldPurgeCache: () => mobile.isMobile && performance.memory?.usedJSHeapSize > 50000000,
  };
};
