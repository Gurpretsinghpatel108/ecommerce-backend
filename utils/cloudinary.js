// utils/cloudinary.js
import { v2 as cloudinary } from 'cloudinary';

// Auto-config from env (CLOUDINARY_URL ya separate keys se)
cloudinary.config();  // Empty call → CLOUDINARY_URL se auto load karega

// Debug (startup pe dikhega logs mein)
console.log('Cloudinary singleton initialized!');
console.log('Config in singleton:', cloudinary.config());

// Yeh export karo – har jagah same configured instance milega
export default cloudinary;