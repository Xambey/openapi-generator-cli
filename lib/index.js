const {exec} = require('child_process');
const https = require('https');
const path = require('path');

const fs = require('fs-extra');

const packageInfo = require('../package.json');
const registry = 'https://registry.npmjs.org';
const tagPrefix = 'cli-';

async function buildForVoskhod(version, pathToAssembly) {
    console.log(`Build package for openapi-generator-cli@${version} VOSKHOD`);

    const packageDistDir = path.resolve('dist', version);

    if (!fs.existsSync(packageDistDir)){
        fs.mkdirSync(packageDistDir, { recursive: true });
    }

    // copy all files which are listen in the package.json (files property) to package dist directory
    packageInfo.files
        .filter(file => !file.endsWith('openapi-generator.jar'))
        .forEach(async file => {
            console.log(file);
            fs.copySync(path.resolve(file), path.resolve(packageDistDir, file))
        });
    // download the java binary
    await copyFile(pathToAssembly, `${packageDistDir}/bin/openapi-generator.jar`);

    // build the package json file based on the main package.json
    const {scripts, dependencies, devDependencies, ...packageJsonDefault} = packageInfo;
    await fs.outputJson(path.resolve(packageDistDir, 'package.json'), {
        ...packageJsonDefault,
        version: `${packageInfo.version}-${version}`
    });
}

async function httpGET(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (resp) => {
            let data = '';
            resp.on('data', (chunk) => data += chunk);
            resp.on('end', () => resolve(data));
        }).on("error", reject);
    });
}

async function getOpenapiGeneratorCliDownloadLinks() {
    const baseUrl = 'https://search.maven.org';
    const queryUrl = `${baseUrl}/solrsearch/select?q=g:org.openapitools+AND+a:openapi-generator-cli&core=gav&start=0&rows=200`;

    return httpGET(queryUrl).then(data => {
        const {response} = JSON.parse(data);

        if (response) {
            return response.docs.reduce((downloadLinks, doc) => {

                const group = doc.g.replace('.', '/');
                const artifact = doc.a.replace('.', '/');
                const version = doc.v;

                return {
                    ...downloadLinks,
                    [doc.v]: `${baseUrl}/remotecontent?filepath=${group}/${artifact}/${version}/${artifact}-${version}.jar`,
                }
            }, {});
        }
    });
}

async function getAlreadyPublishedVersions() {
    return new Promise((resolve, reject) => {
        exec(`npm view ${packageInfo.name} --registry ${registry} --json`, (error, stdout) => {
            if (error !== null) {
                reject(error);
                return;
            }

            try {
                const json = JSON.parse(stdout);
                resolve(Object.keys(json['dist-tags']).map(tag => {
                    return tag.replace(tagPrefix, '');
                }));
            } catch (e) {
                reject(e);
            }
        });
    });
}
async function copyFile(sourcePath, savePath) {
    await fs.copyFileSync(sourcePath, savePath, (err) => {
        if (err) throw err;
        console.log(`${sourcePath} was copied to ${savePath}`);
    });
}
async function downloadFile(downloadLink, savePath) {

    await fs.ensureDir(path.dirname(savePath));

    return new Promise(resolve => {
        const file = fs.createWriteStream(savePath);
        https.get(downloadLink, response => {
            response.pipe(file);
            response.on('end', () => {
                resolve();
            });
        });
    });
}

async function buildPackage(openapiGeneratorCliVersion, openapiGeneratorCliDownloadLink) {
    console.log(`Build package for openapi-generator-cli@${openapiGeneratorCliVersion}`);

    const packageDistDir = path.resolve('./dist', openapiGeneratorCliVersion);

    // download the java binary
    await downloadFile(openapiGeneratorCliDownloadLink, path.resolve(packageDistDir, 'bin/openapi-generator.jar'));

    // copy all files which are listen in the package.json (files property) to package dist directory
    packageInfo.files
        .filter(file => !file.endsWith('openapi-generator.jar'))
        .forEach(async file => await fs.copy(path.resolve(file), path.resolve(packageDistDir, file)));

    // build the package json file based on the main package.json
    const {scripts, dependencies, devDependencies, ...packageJsonDefault} = packageInfo;
    await fs.outputJson(path.resolve(packageDistDir, 'package.json'), {
        ...packageJsonDefault,
        version: `${packageInfo.version}-${openapiGeneratorCliVersion}`
    });
}

module.exports = {
    config: {
        registry,
        tagPrefix,
    },
    getOpenapiGeneratorCliDownloadLinks,
    getAlreadyPublishedVersions,
    buildPackage,
    buildForVoskhod
};
