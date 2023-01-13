const path = require('path');

module.exports = {
  entry: './src/dist.js',
  module: {
    rules: [
      {
        test: /\.js$/,
        include: [
          path.resolve(__dirname, "src"),
        ],
        exclude: /node_modules/,
        loader: 'babel-loader',
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  output: {
    filename: 'h5p-exportable-text-area.js',
    path: path.resolve(__dirname, 'dist'),
  }
};
