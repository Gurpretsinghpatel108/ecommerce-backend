// utils/cloudinary.js
import { v2 as cloudinary } from 'cloudinary';

// Auto-config from CLOUDINARY_URL (if set in env)
cloudinary.config();

// Manual safety with CORRECT order
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'ddym2lhqe',
  api_key: process.env.CLOUDINARY_API_KEY || '339196311622892',           // ← Asli API Key (numeric)
  api_secret: process.env.CLOUDINARY_API_SECRET || 'BD1Vpwx7QpMSiOdxIzimCpd20sQ',  // ← Asli API Secret (alphanumeric)
  secure: true
});

console.log('Cloudinary singleton initialized with CORRECT manual safety!');
console.log('Final config:', cloudinary.config());

export default cloudinary;