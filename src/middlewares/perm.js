const handleExpr = require("../utils/expr");

/*ENDPOINTS['/'] = ({
    guest: false,
    user: false,
    admin: 0,
    secret: false,
})*/
const newEndpoint = (obj) => {
    if (typeof obj !== "object")
        return {
            guest: false,
            user: false,
            self: false,
            admin: 0,
            secret: false,
        }

    var newObj = {
        guest: (typeof obj === "object" && typeof obj.guest === "boolean") ? obj.guest : false,
        user: (typeof obj.user === "boolean") ? obj.user : false,
        self: (typeof obj.self === "boolean") ? obj.self : false,
        admin: (typeof obj.admin === "number" && obj.admin > 0) ? Math.floor(obj.admin) : 0,
        secret: (typeof obj.secret === "boolean") ? obj.secret : false,
    }
    return newObj;
}

//$and: [{ user: true }, { $or: [{ self: true }, { admin: 1 }]]

module.exports.mwPerm = (obj, secret) => {
    secret = (typeof secret === "boolean") ? secret : false;
    return async (req, res, next) => {
        const p = {
            user: res.locals.signedIn,
            guest: !res.locals.signedIn,
            admin: (res.locals.user && res.locals.user.admin > 0) ? res.locals.user.admin : 0,
        }
        const expr = handleExpr(p, obj);
        if (!expr) {
            if (secret) {
                res.status(404);
                return res.notFoundTemplate()
            } else {
                res.status(403);
                return res.errorTemplate(res.lngText('ERRORS.NO_ACCESS'))
            }
        } else {
            next();
        }
    }
}

module.exports.mwPermOr = (obj) => {
    return async (req, res, next) => {
        const isUser = res.locals.signedIn;
        const isGuest = true;
        const adminLevel = (res.locals.user && res.locals.user.admin > 0) ? res.locals.user.admin : 0;
        const perm = newEndpoint(obj);
        const isSelf = (isUser && typeof req.params.userId !== "undefined" && req.params.userId === res.locals.user.id) ? true : false;

        if (perm.guest && isGuest)
            return next();

        if (perm.user && isUser)
            return next();

        if (perm.self && isSelf)
            return next();

        if (perm.admin > 0 && adminLevel >= perm.admin)
            return next();

        if (perm.secret) {
            res.notFoundTemplate()
        } else {
            res.errorTemplate(res.lngText('ERRORS.NO_ACCESS'))
        }
    }
}