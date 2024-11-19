import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  entry: './index.js', // Replace with your Lambda handler file
  target: 'node',       // Target for Node.js environment
  mode: 'production',   // Optimize for production
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
    libraryTarget: 'commonjs2', // Required for Lambda
  },
  externals: { 'aws-sdk': 'commonjs aws-sdk' }, // Exclude aws-sdk
};
