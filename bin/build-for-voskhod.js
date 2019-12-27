#!/usr/bin/env node

const path = require('path');
const lib = require('../lib');
const package = require('../package.json');

(async function () {
    const pathToGeneratorJar = path.resolve('../openapi-generator/modules/openapi-generator-cli/target/openapi-generator-cli.jar');
    console.log(pathToGeneratorJar);
    const version = package.version;//  .split('.').join('_');

    await lib.buildForVoskhod(version, pathToGeneratorJar);
})();
