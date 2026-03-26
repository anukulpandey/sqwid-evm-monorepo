const CracoAlias = require("craco-alias");

module.exports = {
	plugins: [
		{
			plugin: CracoAlias,
			options: {
				source: "jsconfig",
				baseUrl: "./src",
			},
		},
	],
	webpack: {
		configure: {
			module: {
				rules: [
					{
						test: /\.js$/,
						loader: require.resolve(
							"@open-wc/webpack-import-meta-loader"
						),
					},
				],
			},
		},
	},
};
