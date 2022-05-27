

module.exports.setupLang = (app) => {
    app.use((req, res, next) => {
        if (req.query.lang) {
            res.cookie('lang', req.query.lang, { maxAge: 86400 * 365 * 15, httpOnly: true });
            req.cookies['lang'] = req.query.lang;
        }
        if (res.locals.signedIn && res.locals.user) {
            const lang = (res.locals.user.lang !== undefined) ? res.locals.user.lang : "";
            res.locals.lang = lang;
            next();
        } else {
            const lang = (req.cookies.lang !== undefined) ? req.cookies.lang : "";
            res.locals.lang = lang;
            next();
        }
    });
}