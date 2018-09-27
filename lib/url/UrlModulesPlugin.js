/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Generator = require("../Generator");
const { compareModulesById } = require("../util/comparators");

const JavascriptModulesPlugin = require("../JavascriptModulesPlugin");

const UrlAssetGenerator = require("./UrlAssetGenerator");
const UrlJavascriptGenerator = require("./UrlJavascriptGenerator");
const UrlParser = require("./UrlParser");

const plugin = { name: "UrlModulesPlugin" };

class UrlModulesPlugin {
	apply(compiler) {
		const { compilation } = compiler.hooks;

		compilation.tap(plugin, (compilation, { normalModuleFactory }) => {
			const { createParser, createGenerator } = normalModuleFactory.hooks;

			createParser.for("url/experimental").tap(plugin, options => {
				return new UrlParser(options);
			});

			createGenerator.for("url/experimental").tap(plugin, () => {
				return Generator.byType({
					url: new UrlAssetGenerator(),
					javascript: new UrlJavascriptGenerator()
				});
			});

			const js = JavascriptModulesPlugin.getHooks(compilation);

			js.shouldRender.tap(plugin.name, module => {
				if (module.type === "url/experimental") return true;
			});

			const { chunkTemplate } = compilation;

			chunkTemplate.hooks.renderManifest.tap(plugin, (result, options) => {
				const chunk = options.chunk;
				// const output = options.outputOptions;
				const moduleTemplates = options.moduleTemplates;
				const dependencyTemplates = options.dependencyTemplates;

				const { chunkGraph, moduleGraph, runtimeTemplate } = compilation;

				for (const module of chunkGraph.getOrderedChunkModulesIterable(
					chunk,
					compareModulesById(chunkGraph)
				)) {
					if (module.type && module.type === "url/experimental") {
						// TODO(michael-ciniawsky)
						const filenameTemplate = module.buildInfo.url;

						result.push({
							render: () =>
								this.renderModule(module, moduleTemplates.url, {
									chunk,
									dependencyTemplates,
									runtimeTemplate,
									moduleGraph,
									chunkGraph
								}),
							filenameTemplate,
							pathOptions: {
								chunkGraph,
								module
							},
							identifier: `UrlModule${chunkGraph.getModuleId(module)}`,
							hash: chunkGraph.getModuleHash(module)
						});
					}
				}

				return result;
			});
		});
	}

	renderModule(module, moduleTemplate, renderContext) {
		return moduleTemplate.render(module, renderContext);
	}
}

module.exports = UrlModulesPlugin;
