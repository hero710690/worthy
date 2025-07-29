import React from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  Fade,
  useTheme,
  useMediaQuery,
} from '@mui/material';

interface LoadingSpinnerProps {
  /** Loading message to display */
  message?: string;
  /** Size of the spinner */
  size?: number;
  /** Whether to show as overlay (full screen) */
  overlay?: boolean;
  /** Whether to show with backdrop */
  backdrop?: boolean;
  /** Custom color for the spinner */
  color?: 'primary' | 'secondary' | 'inherit';
  /** Minimum height for the loading container */
  minHeight?: string | number;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  size = 40,
  overlay = false,
  backdrop = false,
  color = 'primary',
  minHeight = '200px',
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const spinnerSize = isMobile ? Math.max(size * 0.8, 24) : size;
  const fontSize = isMobile ? '0.875rem' : '1rem';

  const LoadingContent = (
    <Fade in timeout={300}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          textAlign: 'center',
          p: 3,
        }}
      >
        <CircularProgress 
          size={spinnerSize} 
          color={color}
          thickness={4}
          sx={{
            '& .MuiCircularProgress-circle': {
              strokeLinecap: 'round',
            },
          }}
        />
        {message && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              fontSize,
              fontWeight: 500,
              maxWidth: '300px',
              lineHeight: 1.4,
            }}
          >
            {message}
          </Typography>
        )}
      </Box>
    </Fade>
  );

  if (overlay) {
    return (
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: theme.zIndex.modal + 1,
          backgroundColor: backdrop ? 'rgba(255, 255, 255, 0.8)' : 'transparent',
          backdropFilter: backdrop ? 'blur(4px)' : 'none',
        }}
      >
        {LoadingContent}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight,
        width: '100%',
      }}
    >
      {LoadingContent}
    </Box>
  );
};

// Specialized loading components for common use cases
export const PageLoadingSpinner: React.FC<{ message?: string }> = ({ 
  message = 'Loading page...' 
}) => (
  <LoadingSpinner 
    overlay 
    backdrop 
    message={message} 
    size={48}
    minHeight="100vh"
  />
);

export const SectionLoadingSpinner: React.FC<{ message?: string; minHeight?: string }> = ({ 
  message = 'Loading...', 
  minHeight = '300px' 
}) => (
  <LoadingSpinner 
    message={message} 
    size={36}
    minHeight={minHeight}
  />
);

export const ButtonLoadingSpinner: React.FC<{ message?: string }> = ({ 
  message 
}) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
    <CircularProgress size={20} color="inherit" />
    {message && <span>{message}</span>}
  </Box>
);

export const InlineLoadingSpinner: React.FC<{ message?: string; size?: number }> = ({ 
  message = 'Loading...', 
  size = 24 
}) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
    <CircularProgress size={size} color="primary" />
    <Typography variant="body2" color="text.secondary">
      {message}
    </Typography>
  </Box>
);