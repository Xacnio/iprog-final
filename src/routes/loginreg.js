
const utils = require('../utils')
const jwt = require('../utils/jwt');
const dbUser = require('../models/user');
const { revokeToken } = require('../models/revokedtoken');
const app = require('express');

module.exports = () => {
    const lrgRouter = app.Router();

    lrgRouter.get('/register', function (req, res) {
        if (res.locals.signedIn) {
            res.redirect('/');
            return
        }
        res.renderTemplate('register');
    })

    lrgRouter.post('/register', async function (req, res) {
        if (res.locals.signedIn) {
            res.redirect('/');
            return
        }
        const email = (typeof req.body.email === "string") ? req.body.email : "";
        const password = (typeof req.body.password === "string") ? req.body.password : "";
        const name = (typeof req.body.name === "string") ? req.body.name : "";

        const [err, user] = await dbUser.getUser({ email });
        if (!err && user !== null && user.email == email) {
            res.renderTemplate('register', { error: res.lngText('ERRORS.EMAIL_USING') });
        } else {
            const [err, newUser] = await dbUser.createUser(name, email, password);
            if (!err && newUser !== null && newUser.email == email) {
                const token = jwt.createToken({ email, id: newUser.id, key: newUser.tokenKey });
                if (token.length > 0) {
                    res.cookie('lgtk', token, { maxAge: 60 * 60 * 24 * 30, httpOnly: true });
                    res.renderTemplate('register', { success: res.lngText('MSGS.REGISTER_SUCCESS') });
                }
                else {
                    res.renderTemplate('register', { error: res.lngText('ERRORS.TOKEN_ERROR'), fields: { email, name } });
                    console.error('Register/Token error!');
                }
            } else {
                let detailErrs = [];
                if (err.name === "ValidationError") {
                    Object.keys(err.errors).forEach((key) => {
                        detailErrs.push(res.lngText(`ERRORS.${err.errors[key].message}`))
                    });
                }
                const detailErr = (detailErrs.length > 0) ? ` (${detailErrs.join(" ")})` : "";
                res.renderTemplate('register', { error: `${res.lngText('ERRORS.REGISTER_ERROR')}${detailErr}`, fields: { email, name } });
            }
        }
    })

    lrgRouter.all('/login', function (req, res, next) {
        if (res.locals.signedIn) {
            res.redirect('/');
        } else {
            next();
        }
    })

    lrgRouter.get('/login', function (req, res) {
        if (res.locals.signedIn) {
            res.redirect('/');
            return
        }
        res.renderTemplate('login');
    })

    lrgRouter.get('/logout', function (req, res) {
        if (!res.locals.signedIn) {
            res.redirect('/login');
            return
        }
        res.clearCookie('lgtk');
        revokeToken(res.locals.token);
        res.redirect('/');
    })

    lrgRouter.post('/login', async function (req, res) {
        if (res.locals.signedIn) {
            res.redirect('/');
            return
        }
        const email = (typeof req.body.email === "string") ? req.body.email.trim() : "";
        const password = (typeof req.body.password === "string") ? req.body.password : "";
        if (email.length == 0 || password.length == 0) {
            res.renderTemplate('login', { error: res.lngText('ERRORS.FILL_FIELDS'), email });
        } else if (!utils.ValidateEmail(email)) {
            res.renderTemplate('login', { error: res.lngText('ERRORS.INVALID_EMAIL'), email });
        } else {
            const [err, user] = await dbUser.getUserByEmailPassword(email, password);
            if (err != null) {
                res.renderTemplate('login', { error: "Error!", email });
            } else if (user == null) {
                res.renderTemplate('login', { error: res.lngText('ERRORS.INVALID_LOGIN'), email });
            } else {
                const token = jwt.createToken({ email, id: user.id, key: user.tokenKey });
                if (token.length > 0) {
                    res.cookie('lgtk', token, { maxAge: 60 * 60 * 24 * 30 * 1000, httpOnly: true });
                    res.renderTemplate('login', { success: res.lngText('MSGS.LOGIN_SUCCESS') });
                }
                else {
                    res.renderTemplate('login', { error: res.lngText('ERRORS.TOKEN_ERROR'), email });
                }
            }
        }
    })

    return lrgRouter;
}