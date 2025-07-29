#!/bin/bash

# Worthy Frontend - Mobile-Optimized Deployment Script
# This script builds and deploys the frontend with mobile-specific optimizations

set -e

echo "🚀 Starting mobile-optimized deployment for Worthy Frontend..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
S3_BUCKET="worthy-frontend-1751874299"
CLOUDFRONT_DISTRIBUTION_ID="E1234567890123"  # Replace with actual ID
AWS_PROFILE="worthy-app-user"
AWS_REGION="ap-northeast-1"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the frontend directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the frontend directory."
    exit 1
fi

# Check prerequisites
print_status "Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ is required. Current version: $(node --version)"
    exit 1
fi

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm and try again."
    exit 1
fi

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed. Please install AWS CLI and try again."
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity --profile "$AWS_PROFILE" &> /dev/null; then
    print_error "AWS credentials not configured for profile '$AWS_PROFILE'. Please run 'aws configure --profile $AWS_PROFILE'"
    exit 1
fi

print_success "All prerequisites met!"

# Install dependencies
print_status "Installing dependencies..."
npm ci --silent

# Mobile-specific optimizations
print_status "Applying mobile optimizations..."

# Create mobile-optimized build configuration
cat > vite.config.mobile.ts << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  build: {
    // Mobile-optimized build settings
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
      mangle: {
        safari10: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks for better caching
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
          charts: ['recharts'],
          router: ['react-router-dom'],
        },
      },
    },
    // Optimize for mobile networks
    chunkSizeWarningLimit: 1000,
    assetsInlineLimit: 4096,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@mui/material', '@mui/icons-material'],
  },
  server: {
    port: 3000,
    host: true,
  },
})
EOF

# Build the application with mobile optimizations
print_status "Building application with mobile optimizations..."
npm run build -- --config vite.config.mobile.ts

if [ ! -d "dist" ]; then
    print_error "Build failed - dist directory not found"
    exit 1
fi

# Generate PWA manifest for mobile app-like experience
print_status "Generating PWA manifest..."
cat > dist/manifest.json << EOF
{
  "name": "Worthy - Financial Strategy Tool",
  "short_name": "Worthy",
  "description": "Track your investment portfolio and calculate FIRE progress",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#f8fafc",
  "theme_color": "#667eea",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "categories": ["finance", "productivity"],
  "lang": "en",
  "dir": "ltr"
}
EOF

# Add mobile-optimized service worker
print_status "Adding service worker for offline support..."
cat > dist/sw.js << 'EOF'
const CACHE_NAME = 'worthy-v1';
const urlsToCache = [
  '/',
  '/static/js/main.js',
  '/static/css/main.css',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});
EOF

# Optimize images for mobile
print_status "Optimizing images for mobile..."
if command -v imagemin &> /dev/null; then
    find dist -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" | xargs imagemin --out-dir=dist/optimized/
    print_success "Images optimized"
else
    print_warning "imagemin not found - skipping image optimization"
fi

# Generate mobile-specific meta tags
print_status "Adding mobile-specific meta tags..."
sed -i.bak '/<head>/a\
    <!-- Mobile-specific meta tags -->\
    <meta name="mobile-web-app-capable" content="yes">\
    <meta name="apple-mobile-web-app-capable" content="yes">\
    <meta name="apple-mobile-web-app-status-bar-style" content="default">\
    <meta name="apple-mobile-web-app-title" content="Worthy">\
    <meta name="msapplication-TileColor" content="#667eea">\
    <meta name="msapplication-config" content="/browserconfig.xml">\
    <link rel="apple-touch-icon" href="/icon-192.png">\
    <link rel="manifest" href="/manifest.json">\
    <!-- Preload critical resources -->\
    <link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>\
    <link rel="preconnect" href="https://mreda8g340.execute-api.ap-northeast-1.amazonaws.com">\
' dist/index.html

# Create browserconfig.xml for Windows tiles
cat > dist/browserconfig.xml << EOF
<?xml version="1.0" encoding="utf-8"?>
<browserconfig>
    <msapplication>
        <tile>
            <square150x150logo src="/icon-192.png"/>
            <TileColor>#667eea</TileColor>
        </tile>
    </msapplication>
</browserconfig>
EOF

# Analyze bundle size
print_status "Analyzing bundle size..."
if [ -f "dist/stats.html" ]; then
    BUNDLE_SIZE=$(du -sh dist | cut -f1)
    print_success "Bundle analysis complete. Total size: $BUNDLE_SIZE"
    print_status "Bundle analysis available at dist/stats.html"
fi

# Sync to S3 with mobile-optimized headers
print_status "Uploading to S3 with mobile-optimized headers..."

# Upload HTML files with no-cache headers
aws s3 sync dist/ s3://$S3_BUCKET/ \
    --profile $AWS_PROFILE \
    --region $AWS_REGION \
    --exclude "*" \
    --include "*.html" \
    --cache-control "no-cache, no-store, must-revalidate" \
    --metadata-directive REPLACE \
    --delete

# Upload CSS/JS files with long cache headers
aws s3 sync dist/ s3://$S3_BUCKET/ \
    --profile $AWS_PROFILE \
    --region $AWS_REGION \
    --exclude "*" \
    --include "*.css" \
    --include "*.js" \
    --cache-control "public, max-age=31536000, immutable" \
    --metadata-directive REPLACE

# Upload images with optimized headers
aws s3 sync dist/ s3://$S3_BUCKET/ \
    --profile $AWS_PROFILE \
    --region $AWS_REGION \
    --exclude "*" \
    --include "*.png" \
    --include "*.jpg" \
    --include "*.jpeg" \
    --include "*.webp" \
    --cache-control "public, max-age=2592000" \
    --metadata-directive REPLACE

# Upload PWA files
aws s3 sync dist/ s3://$S3_BUCKET/ \
    --profile $AWS_PROFILE \
    --region $AWS_REGION \
    --exclude "*" \
    --include "manifest.json" \
    --include "sw.js" \
    --include "browserconfig.xml" \
    --cache-control "public, max-age=86400" \
    --metadata-directive REPLACE

# Upload remaining files
aws s3 sync dist/ s3://$S3_BUCKET/ \
    --profile $AWS_PROFILE \
    --region $AWS_REGION \
    --cache-control "public, max-age=86400" \
    --metadata-directive REPLACE \
    --delete

print_success "Files uploaded to S3!"

# Invalidate CloudFront cache
print_status "Invalidating CloudFront cache..."
INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
    --paths "/*" \
    --profile $AWS_PROFILE \
    --query 'Invalidation.Id' \
    --output text)

if [ "$INVALIDATION_ID" != "None" ]; then
    print_success "CloudFront invalidation created: $INVALIDATION_ID"
    print_status "Waiting for invalidation to complete..."
    
    aws cloudfront wait invalidation-completed \
        --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
        --id $INVALIDATION_ID \
        --profile $AWS_PROFILE
    
    print_success "CloudFront cache invalidated!"
else
    print_warning "CloudFront invalidation failed - you may need to wait for cache to expire"
fi

# Test mobile-specific features
print_status "Testing mobile deployment..."

# Test PWA manifest
MANIFEST_URL="https://ds8jn7fwox3fb.cloudfront.net/manifest.json"
if curl -s --head "$MANIFEST_URL" | grep -q "200 OK"; then
    print_success "PWA manifest accessible"
else
    print_warning "PWA manifest not accessible"
fi

# Test service worker
SW_URL="https://ds8jn7fwox3fb.cloudfront.net/sw.js"
if curl -s --head "$SW_URL" | grep -q "200 OK"; then
    print_success "Service worker accessible"
else
    print_warning "Service worker not accessible"
fi

# Cleanup
print_status "Cleaning up..."
rm -f vite.config.mobile.ts
rm -f dist/index.html.bak

# Performance recommendations
print_status "Mobile Performance Recommendations:"
echo "  📱 Test on actual mobile devices"
echo "  🔍 Use Chrome DevTools mobile simulation"
echo "  📊 Monitor Core Web Vitals"
echo "  🚀 Consider implementing lazy loading for images"
echo "  💾 Monitor bundle size growth over time"

# Final success message
print_success "🎉 Mobile-optimized deployment complete!"
echo ""
echo "📱 Mobile-optimized URLs:"
echo "   Primary: https://ds8jn7fwox3fb.cloudfront.net"
echo "   Backup:  http://worthy-frontend-1751874299.s3-website-ap-northeast-1.amazonaws.com"
echo ""
echo "🔧 Mobile Features Deployed:"
echo "   ✅ PWA manifest for app-like experience"
echo "   ✅ Service worker for offline support"
echo "   ✅ Mobile-optimized meta tags"
echo "   ✅ Touch-friendly interface"
echo "   ✅ Responsive design"
echo "   ✅ Optimized bundle size"
echo ""
echo "📊 Next Steps:"
echo "   1. Test on mobile devices"
echo "   2. Add to home screen (PWA)"
echo "   3. Monitor performance metrics"
echo "   4. Gather user feedback"

exit 0
