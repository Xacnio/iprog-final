const { crypter } = require('../utils')

module.exports.setupRData = (app) => {
    app.use((req, res, next) => {
        res.redirectData = function (data, type) { return redirectData(req, res, data, type) };
        res.redirectDataURL = function (url, data, type) { return redirectDataURL(res, data, type, url) };
        req.getRedirectedData = function (type) { return getRedirectedData(req, res, type) };
        next();
    });
}

function redirectDataURL(res, data, type, url) {
    data.type = type;
    res.cookie('_scc', crypter.encrypt(JSON.stringify(data)))
    res.redirect(url);
}

function redirectData(req, res, data, type) {
    var fullUrl = new URL(req.protocol + '://' + req.get('host') + req.originalUrl);
    if (data !== undefined) {
        data.type = (type !== undefined) ? type : 'none';
        res.cookie('_scc', crypter.encrypt(JSON.stringify(data)))
    }
    res.redirect(fullUrl.pathname);
}

function getRedirectedData(req, res, type) {
    if (req.cookies['_scc'] === undefined) {
        return {};
    }
    const data = (req.cookies['_scc'] !== undefined) ? req.cookies['_scc'] : "";
    if (data.length > 0) {
        const decryptedData = crypter.decrypt(data);
        try {
            const result = JSON.parse(decryptedData);
            if (typeof result === "object" && result.type !== undefined && result.type === type) {
                res.clearCookie("_scc");
                return result;
            }
        } catch (err) {

        }
    }
    return {};
}