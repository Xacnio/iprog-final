const jwt = require('../utils/jwt');
const { isRevokedToken } = require('../models/revokedtoken');
const { getUser } = require('../models/user');

module.exports.setupAuth = (app) => {
    app.use(async (req, res, next) => {
        const token = (typeof req.cookies['lgtk'] === "string") ? req.cookies['lgtk'] : "";
        if (token.length > 0) {
            const isRevoked = await isRevokedToken(token);
            if (isRevoked) {
                res.clearCookie("lgtk");
                res.locals.signedIn = false;
                res.locals.user = {};
                next();
            }
            jwt.verifyToken(token, async (err, payload) => {
                if (err) {
                    res.clearCookie("lgtk");
                    res.locals.signedIn = false;
                    res.locals.user = {};
                    next()
                } else {
                    res.locals.token = token;
                    res.locals.payload = payload;
                    const [_, user] = await getUser({ email: payload.email, id: payload.id });
                    if (user === null) {
                        res.locals.token = undefined;
                        res.locals.signedIn = false;
                        res.locals.user = {};
                        next();
                    } else {
                        if (user.tokenKey !== payload.key) {
                            res.locals.token = undefined;
                            res.locals.signedIn = false;
                            res.locals.user = {};
                            next();
                        } else {
                            res.locals.signedIn = true;
                            res.locals.user = user;
                            next()
                        }
                    }
                }
            })
        } else {
            res.locals.user = {};
            res.locals.signedIn = false;
            next()
        }
    })
}