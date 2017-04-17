/* eslint-env node */
/* eslint-disable import/no-commonjs */

require("babel-register");
require("babel-polyfill");

var webpack = require('webpack');

var ExtractTextPlugin = require('extract-text-webpack-plugin');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var HtmlWebpackHarddiskPlugin = require('html-webpack-harddisk-plugin');
var UnusedFilesWebpackPlugin = require("unused-files-webpack-plugin").default;
var BannerWebpackPlugin = require('banner-webpack-plugin');

var _ = require('underscore');
var glob = require('glob');
var fs = require('fs');


function hasArg(arg) {
  var regex = new RegExp("^" + ((arg.length === 2) ? ("-\\w*"+arg[1]+"\\w*") : (arg)) + "$");
  return process.argv.filter(regex.test.bind(regex)).length > 0;
}

var SRC_PATH = __dirname + '/src';
var BUILD_PATH = __dirname + '/dist';

var NODE_ENV = process.env["NODE_ENV"] || "development";

var IS_WATCHING = hasArg("-w") || hasArg("--watch");
if (IS_WATCHING) {
  process.stderr.write("Warning: in webpack watch mode you must restart webpack if you change any CSS variables or custom media queries\n");
}


// Babel:
var BABEL_CONFIG = {
  cacheDirectory: ".babel_cache"
};

var CSS_CONFIG = {
  localIdentName: NODE_ENV !== "production" ?
  "[name]__[local]___[hash:base64:5]" :
  "[hash:base64:5]",
  restructuring: false,
  compatibility: true,
  importLoaders: 1
};

var config = module.exports = {
  context: SRC_PATH,

  entry: {
    "index": "./index.js",
    styles: "./css/index.css",
  },

  output: {
    path: BUILD_PATH + '/assets',
    filename: '[name].bundle.js?[hash]',
    publicPath: '/assets',
  },

  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        loader: "babel-loader",
        query: BABEL_CONFIG,
      }, {
        test: /(.js|.jsx)$/,
        exclude: /node_modules|\.spec\.js/,
        use: 'eslint-loader',
      }, {
        test: /\.(eot|woff2?|ttf|svg|png)$/,
        use: "file-loader",
      }, {
        test: /\.css$/,
        use: ExtractTextPlugin.extract({
          fallback: "style-loader",
          use: [
            "css-loader?" + JSON.stringify(CSS_CONFIG),
            "postcss-loader",
          ]
        }),
      },
    ]
  },

  resolve: {
    extensions: [".webpack.js", ".web.js", ".js", ".jsx", ".css"],
    alias: {
      "app": SRC_PATH,
      "style": SRC_PATH + "/css/index.css",
    },
  },

  plugins: [
    new UnusedFilesWebpackPlugin({
      globOptions: {
        ignore: [
          "**/types/*.js",
          "**/*.spec.*"
        ]
      }
    }),

    new ExtractTextPlugin({
      filename: '[name].bundle.css?[contenthash]'
    }),

    new HtmlWebpackPlugin({
      filename: '../index.html',
      chunks: ["app-main", "styles"],
      template: SRC_PATH + '/index.html',
      inject: 'head',
      alwaysWriteToDisk: true,
    }),

    new HtmlWebpackHarddiskPlugin({
      outputPath: BUILD_PATH,
    }),

    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify(NODE_ENV)
      }
    }),

    new BannerWebpackPlugin({
      chunks: {
        'index': {
          beforeContent: "/*\n* This file is subject to the terms and conditions defined in\n * file 'LICENSE.txt', which is part of this source code package.\n */\n",
        },
      }
    }),
  ],
};

let loaderOptionsPlugin = {
  postcss: function (webpack) {
    return [
      require("postcss-import")(),
      require("postcss-url")(),
    ]
  },
};


if(NODE_ENV === "hot") {
  config.output.filename = "[name].hot.bundle.js?[hash]";
  config.output.publicPath = "http://localhost:8080" + config.output.publicPath;

  config.module.loaders.unshift({
    test: /\.jsx$/,
    exclude: /node_modules/,
    loaders: ['react-hot', 'babel?'+JSON.stringify(BABEL_CONFIG)]
  });

  config.module.rules[config.module.rules.length - 1].use = [
    "style-loader",
    "!css-loader?" + JSON.stringify(CSS_CONFIG),
    "postcss-loader"
  ];

  loaderOptionsPlugin.devServer = {
    hot: true,
    inline: true,
    contentBase: "frontend"
  };

  config.plugins.unshift(
    new webpack.NoErrorsPlugin(),
    new webpack.HotModuleReplacementPlugin()
  );
}

if(NODE_ENV !== "production") {
  config.devtool = "inline-source-map"


  config.output.devtoolModuleFilenameTemplate = '[absolute-resource-path]';
  config.output.pathinfo = true;
} else {
  config.plugins.push(new webpack.optimize.UglifyJsPlugin({
    sourceMap: true,
  }));
  config.devtool = "source-map";
}

config.plugins.unshift(
  new webpack.LoaderOptionsPlugin({
    options: loaderOptionsPlugin
  })
);

