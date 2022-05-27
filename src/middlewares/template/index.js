const { getLocale, formatLocale, LANGLIST } = require('../../locale');
const { jDateObj } = require('../../utils/time');
var MarkdownIt = require('markdown-it'),
    md = new MarkdownIt();

const { sizeFormatter } = require('human-readable');

const pb = sizeFormatter({
    std: 'JEDEC', // 'SI' (default) | 'IEC' | 'JEDEC'
    decimalPlaces: 2,
    keepTrailingZeroes: false,
    render: (literal, symbol) => `${literal} ${symbol}B`,
})



module.exports.setupTemplate = (app) => {
    app.use(function (req, res, next) {
        res.renderTemplate = (content, extra, top) => renderTemplate(req, res, content, extra, top);
        res.errorTemplate = (error, title) => errorTemplate(req, res, error, title);
        res.notFoundTemplate = (error) => notFoundTemplate(req, res, error);
        res.notAuthorizedTemplate = (error) => notAuthorizedTemplate(req, res, error);
        res.lngText = (key) => lngText(res, key);
        req.formatQuery = (obj) => formatQuery(req, obj);
        next();
    })
    app.use(function (err, req, res, next) {
        if (err.code !== 'EBADCSRFTOKEN') return next(err)

        errorTemplate(req, res, "No access", "Forbidden");
    })
}

function renderTemplate(req, res, content, extra, top) {
    const lang = res.locals.lang;
    const csrfToken = req.csrfToken();

    const opts = (typeof extra === "object") ? extra : {};
    opts.locals = res.locals;
    opts.path = req.path;
    opts.lngs = LANGLIST(req);
    if (typeof opts.pageInfo === 'object') {
        opts.pageInfo.url = (i) => {
            return formatQuery(req, { "page": i });
        }
    }
    if (typeof opts.title !== "string") opts.title = titleGenerator(res, content, extra);
    return res.render("main", { csrfToken, ...opts, top: (top !== undefined) ? "pages/" + top : undefined, content: "pages/" + content, lang: lang, locale: { ...getLocale(lang), format: formatLocale }, md: (e) => md.render(e), jd: (d) => jDateObj(d, lang), pb })
}

function errorTemplate(req, res, error, title) {
    renderTemplate(req, res, 'error', { error, title }, undefined);
}

function notFoundTemplate(req, res) {
    renderTemplate(req, res, '404', {}, undefined);
}

function notAuthorizedTemplate(req, res) {
    errorTemplate(req, res, res.lngText('ERRORS.NO_ACCESS'))
}


function lngText(res, key) {
    const lang = res.locals.lang;
    const parts = key.split('.');
    const lng = getLocale(lang);

    if (parts.length == 1) {
        if (parts[0] in lng) {
            return lng[parts[0]];
        }
    } else if (parts.length > 1) {
        var objTmp = lng[parts[0]];
        for (let i = 1; i < parts.length; i++) {
            if (typeof objTmp === "object" && parts[i] in objTmp) {
                objTmp = objTmp[parts[i]];
            } else {
                return "";
            }
        }
        if (typeof objTmp === "string")
            return objTmp;
    }
    return "";
}

function formatQuery(req, obj) {
    const fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    const url = new URL(fullUrl);
    Object.entries(obj).forEach(([key, value]) => {
        url.searchParams.set(key, value);
    })
    return url.toString();
}

function titleGenerator(res, content, extra) {

    switch (content) {
        case 'index':
            return lngText(res, 'MAIN.HOME');
        case 'challenges':
            return lngText(res, 'MAIN.CHALLENGES');
        case 'communities':
            return lngText(res, 'MAIN.COMMUNITIES');
        case 'profile':
            if (typeof extra.profile === 'object') {
                return `${lngText(res, 'MAIN.PROFILE')} - @${extra.profile.displayUsername}`;
            }
            return lngText(res, 'MAIN.PROFILE');
        case 'community':
            if (typeof extra.community === 'object') {
                return `${lngText(res, 'P_COMMUNITY.TITLE')} - @${extra.community.displayUsername}`;
            }
            return lngText(res, 'P_COMMUNITY.TITLE');
        case 'challenge':
            if (typeof extra.challenge === 'object') {
                return `${extra.challenge.fullName} - @${extra.challenge.community.displayUsername}`;
            }
            return lngText(res, 'P_CHALLENGE.TITLE');
        case 'challenge/join':
            if (typeof extra.challenge === 'object') {
                return `${lngText(res, 'P_CHALLENGE.JOIN')}: ${extra.challenge.fullName} - @${extra.challenge.community.displayUsername}`;
            }
            return lngText(res, 'P_CHALLENGE.JOIN');
        case 'challenge/edit':
            if (typeof extra.challenge === 'object') {
                return `${lngText(res, 'P_CHALLENGE.EDIT')}: ${extra.challenge.fullName} - @${extra.challenge.community.displayUsername}`;
            }
            return lngText(res, 'P_CHALLENGE.EDIT');
        case 'register':
            return lngText(res, 'MAIN.REGISTER');
        case 'login':
            return lngText(res, 'MAIN.LOGIN')
    }
    return undefined;
}