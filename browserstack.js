/* eslint-disable compat/compat,no-await-in-loop,prefer-arrow-callback */
const webdriver = require('selenium-webdriver');
const browserstack = require('browserstack-local');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const capabilities = [
    {
        browserName: 'Edge',
        browserVersion: '15',
        os: 'Windows',
        osVersion: '10',
    },
];

// Creates an instance of Local
const bsLocal = new browserstack.Local();

const bsOptions = {
    key: process.env.BROWSERSTACK_KEY,
    verbose: true,
    folder: path.resolve(__dirname),
    forceLocal: true,
};

const startBsLocal = () => {
    return new Promise((resolve, reject) => {
        console.log('Starting BrowserStackLocal...');

        try {
            bsLocal.start(bsOptions, () => {
                // Check if BrowserStack local instance is running
                console.log('BrowserStackLocal running:', bsLocal.isRunning());
                resolve();
            });
        } catch (e) {
            reject(e);
        }
    });
};

const stopBsLocal = () => {
    return new Promise((resolve, reject) => {
        console.log('Stopping BrowserStackLocal...');

        try {
            bsLocal.stop(() => {
                console.log('Stopped BrowserStackLocal');
                resolve();
            });
        } catch (e) {
            reject(e);
        }
    });
};

const getCapabilityInfo = (capability) => {
    // eslint-disable-next-line max-len
    return `[${capability.os} ${capability.osVersion}, ${capability.browserName} ${capability.browserVersion}]`;
};

const addScriptletsData = (capability) => {
    return {
        ...capability,
        project: 'Scriptlets',
        name: `Scriptlets ${getCapabilityInfo(capability)}`,
        'browserstack.local': 'true',
        'browserstack.debug': 'true',
        'browserstack.user': process.env.BROWSERSTACK_USER,
        'browserstack.key': process.env.BROWSERSTACK_KEY,
    };
};

const runTestsForFile = async (context, filename) => {
    console.log(`${getCapabilityInfo(context.capability)} ${filename}`);

    const { driver } = context;

    await driver.get(`http://${process.env.BROWSERSTACK_USER}.browserstack.com/${filename}`);

    const response = await driver.executeAsyncScript('return window.scriptLoaded');

    console.assert(response === 'yes');

    return response;
};

const runTestsForFiles = async (context, testFiles) => {
    for (let i = 0; i < testFiles.length; i += 1) {
        const file = testFiles[i];
        await runTestsForFile(context, file);
    }
};

const runTestByCapability = async (context, rawCapability) => {
    const capability = addScriptletsData(rawCapability);
    context.capability = capability;

    const driver = new webdriver.Builder()
        .usingServer('http://hub.browserstack.com/wd/hub')
        .withCapabilities(capability)
        .build();

    context.driver = driver;

    try {
        const result = await runTestsForFiles(context, ['reproduce.html']);
        console.log(result);
    } catch (e) {
        console.log(e);
        await driver.quit();
        throw e;
    }

    await driver.quit();
};

const runTests = async (context) => {
    for (let i = 0; i < capabilities.length; i += 1) {
        const capability = capabilities[i];
        await runTestByCapability(context, capability);
    }
};

const main = async () => {
    await startBsLocal();
    const context = {};

    try {
        await runTests(context);
    } catch (e) {
        console.log(e.message);
        await stopBsLocal();
        process.exit(1);
    }

    await stopBsLocal();
};

main();
