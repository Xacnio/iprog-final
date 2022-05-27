const { setupLang } = require('./lang');
const { setupAuth } = require('./auth');
const { setupRData } = require('./rdata');
const { setupTemplate } = require('./template');

module.exports.setupMiddlewares = (app) => {
    setupAuth(app);
    setupLang(app);
    setupTemplate(app);
    setupRData(app);
}