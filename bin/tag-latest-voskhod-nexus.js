#!/usr/bin/env node

/*
    This script is called by travis once a day and checks the
    [maven repository](https://mvnrepository.com/artifact/org.openapitools/openapi-generator-cli)
    for a new version builds the package(s) for the new version(s).
*/

const lib = require('../lib');
const {exec} = require('child_process');
const compareVersions = require('compare-versions');
const packageInfo = require('../package.json');

const registry = 'http://nexus.voskhod.local/nexus-2.7.0/content/repositories/npm-internal/';

(async function tagLatest() {
    exec(`npm dist-tag ls --registry ${registry}`, (error, stdout) => {

        const latestVersion = stdout.split('\n')
            .map(line => line.split(': ')[1])
            .filter(v => !!v)
            .filter(v => !v.includes('beta'))
            .sort(compareVersions).pop();

        console.log('latest version (excluding beta) is set to ' + latestVersion);

        const cmd = exec(`npm dist-tag add ${packageInfo.name}@${latestVersion} latest --registry ${registry}`);
        cmd.stdout.pipe(process.stdout);
        cmd.stderr.pipe(process.stderr);
    });
})();
