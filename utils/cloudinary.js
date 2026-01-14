// utils/cloudinary.js
import { v2 as cloudinary } from 'cloudinary';

// Force config yahan (singleton)
cloudinary.config(); // Auto from CLOUDINARY_URL

// Extra safety: Manual re-config to avoid runtime loss
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'ddym2lhqe',
  api_key: process.env.CLOUDINARY_API_KEY || 'BD1Vpwx7QpMSiOdxIzimCpd20sQ',
  api_secret: process.env.CLOUDINARY_API_SECRET || '339196311622892',
  secure: true
});

console.log('Cloudinary singleton initialized with manual safety!');
console.log('Final config:', cloudinary.config());

export default cloudinary;