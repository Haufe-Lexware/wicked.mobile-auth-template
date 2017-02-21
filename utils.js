'use strict';

const debug = require('debug')('auth-saml:utils');
const fs = require('fs');
const path = require('path');

const utils = function () {};

utils._packageVersion = null;
utils.getVersion = function () {
    if (!utils._packageVersion) {
        const packageFile = path.join(__dirname, 'package.json');
        if (fs.existsSync(packageFile)) {
            try {
                const packageInfo = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
                if (packageInfo.version)
                    utils._packageVersion = packageInfo.version;
            } catch (ex) {
                console.error(ex);
            }
        }
        if (!utils._packageVersion) // something went wrong
            utils._packageVersion = "0.0.0";
    }
    return utils._packageVersion;
};


module.exports = utils;