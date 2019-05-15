const webpack = require('webpack');
const DefinePlugin = require("webpack/lib/DefinePlugin");

module.exports = (env, argv) => {
    const isProduction = argv.mode === 'production';
    return {
        entry: {
            'map-station': './src/index.js',
            'controller': './src/controller.js'
        },
        output: {
            path: __dirname + '/dist',
            publicPath: 'dist',
            filename: '[name].js'
        },
        module: {
            rules: [
                {
                    test: /\.(js|jsx)$/,
                    exclude: /node_modules/,
                    include: [
                        /src/,
                        /node_modules\/@turf/
                    ],
                    use: [ 'babel-loader' ]
                }
            ]
        },
        resolve: {
            extensions: ['*', '.js', '.jsx']
        },
        plugins: [
            new DefinePlugin({
                '__DEVELOPMENT__': !isProduction
            }),
            ...(
                isProduction
                ? [ ]
                : [ new webpack.HotModuleReplacementPlugin() ]
            )
        ],
        devServer: isProduction
            ? undefined
            : {
                port: 3000,
                contentBase: './',
                hot: true
            },
        devtool: isProduction ? undefined : 'eval'
    }
};
