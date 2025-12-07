const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

const commonConfig = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  node: {
    __dirname: false,
    __filename: false,
  },
};

module.exports = [
  {
    ...commonConfig,
    entry: './src/main/main.ts',
    target: 'electron-main',
    output: {
      filename: 'main.js',
      path: path.resolve(__dirname, 'dist/main'),
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          { from: 'src/assets', to: '../assets' },
        ],
      }),
    ],
  },
  {
    ...commonConfig,
    entry: './src/main/preload.ts',
    target: 'electron-preload',
    output: {
      filename: 'preload.js',
      path: path.resolve(__dirname, 'dist/main'),
    },
  },
];
