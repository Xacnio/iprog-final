
const utils = require('../utils')
const dbUser = require('../models/user');
const { mwPerm } = require('../middlewares/perm');
const app = require('express');
const fileUpload = require('express-fileupload');
const { changeProfilePhoto, deleteProfilePhoto, validMimeType, deleteTemp } = require('../utils/file');
const { getCommunities } = require('../models/community');
const { getUsernameWhere } = require('../utils/mgdb');
const { LANGLIST } = require('../locale');

module.exports = () => {
    const userRouter = app.Router();

    userRouter.get("/user/:username", mwPerm({ user: true }), async function (req, res) {
        const postRData = req.getRedirectedData('user');
        const username = req.params.username;
        if (!utils.ValidateUsername(username)) {
            res.errorTemplate(res.lngText('P_PROFILE.NOT_FOUND'))
        } else {
            const [err, user] = await dbUser.getUser(getUsernameWhere(username));
            if (err != null) {
                res.errorTemplate(res.lngText('ERRORS.DB_ERROR'))
            } else if (user == null) {
                res.errorTemplate(res.lngText('P_PROFILE.NOT_FOUND'))
            } else {
                const [_, communities] = await getCommunities({ creator: user.id });
                const permed = (res.locals.signedIn && (user.id === res.locals.user.id || res.locals.user.admin > 0)) ? true : false;
                res.renderTemplate('profile', { profile: user, communities, self: permed, ...postRData }, undefined);
            }
        }
    })

    userRouter.post("/user/:username", mwPerm({ user: true }), fileUpload({ limits: { fileSize: 2 * 1024 * 1024 }, useTempFiles: true, tempFileDir: './tmp' }), async function (req, res) {
        const username = req.params.username;
        if (!utils.ValidateUsername(username)) {
            res.errorTemplate(res.lngText('P_PROFILE.NOT_FOUND'))
        } else {
            const [err, user] = await dbUser.getUser(getUsernameWhere(username));
            if (err != null) {
                res.errorTemplate(res.lngText('ERRORS.DB_ERROR'))
            } else if (user == null) {
                res.errorTemplate(res.lngText('P_PROFILE.NOT_FOUND'))
            } else {
                const permed = (res.locals.signedIn && (user.id === res.locals.user.id || res.locals.user.admin > 0)) ? true : false;
                if (!permed) {
                    res.status(403);
                    return res.errorTemplate(res.lngText('ERRORS.NO_ACCESS'));
                }
                switch (Math.floor(req.body.type)) {
                    case 1:
                        await updateProfile(req, res, user);
                        break;
                    case 2:
                        await changePass(req, res, user);
                        break;
                    case 3:
                        await updateSettings(req, res, user);
                        break;
                    default:
                        const [_, communities] = await getCommunities({ creator: user.id });
                        res.renderTemplate('profile', { profile: user, communities, self: permed }, undefined);
                }
            }
        }
    })

    return userRouter;
}

async function changePass(req, res, user) {
    const id = user.id;
    const qData = { active: 'password' };

    const logout = (req.body.logoutall) ? Math.round(Date.now() / 1000) : false;
    const currentPass = req.body.oldpassword;
    const newPass = req.body.newpassword;
    const newPass2 = req.body.newpassword2;
    const hashCurrent = utils.hasher.hash(user.id, currentPass);
    const hashNew = utils.hasher.hash(user.id, newPass);

    if (newPass !== newPass2) {
        qData.error = res.lngText("P_PROFILE.ERROR_PASSAGAIN");
    } else if (hashCurrent !== user.password) {
        qData.error = res.lngText("P_PROFILE.ERROR_WRONGPASS");
    } else {
        const [ee, newUser] = await dbUser.updateUser({ _id: id }, { password: hashNew, tokenKey: (logout != false) ? logout : undefined });
        if (ee == null && newUser != null && newUser.id == id) {
            qData.success = res.lngText('P_PROFILE.SUCCESS_PASS');
            user.password = newUser.password;
            user.tokenKey = newUser.tokenKey;
            if (logout != false && res.locals.user.id === id) {
                const payload = { email: user.email, id, key: user.tokenKey };
                const token = utils.jwt.createToken(payload);
                if (token.length > 0) {
                    res.locals.token = token;
                    res.locals.payload = payload;
                    res.cookie('lgtk', token, { maxAge: 60 * 60 * 24 * 30 * 1000, httpOnly: true });
                }
            }
        } else {
            qData.error = res.lngText('P_PROFILE.ERROR_EDIT');
        }
    }
    //res.renderTemplate('profile', { profile: user, self: (res.locals.user.id === user.id), ...qData }, undefined);
    res.redirectDataURL(user.href, qData, 'user');
}

async function updateProfile(req, res, user) {
    const id = user.id;
    const qData = { fields_ep: req.body };
    const fullName = req.body.name.trim();
    const aboutMe = req.body.cdesc.trim();
    const email = req.body.email.trim();
    const username = req.body.username.trim();
    const beforeEmail = user.email;

    if (fullName === "" || email === "") {
        qData.error = res.lngText('P_PROFILE.ERROR_EDIT');
        qData.active = 'edit';
        res.redirectDataURL(user.href, qData, 'user')
        return;
    }

    if (!utils.ValidateUsername(username)) {
        qData.error = res.lngText('P_PROFILE.ERR_USERNAME_INVALID');
        qData.active = 'edit';
        res.redirectDataURL(user.href, qData, 'user')
        return;
    }

    if (username !== user.displayUsername && (username.length < 3 || username.length > 16)) {
        qData.error = res.lngText('P_PROFILE.ERR_USERNAME_LENGTH');
        qData.active = 'edit';
        res.redirectDataURL(user.href, qData, 'user')
        return;
    }

    let newPhotoX = user.photo;
    let oldPhoto = user.photo;
    if (req.files != null && typeof req.files.chphoto === "object") {
        if (!validMimeType(req.files.chphoto.mimetype)) {
            deleteTemp("./" + req.files.chphoto.tempFilePath);
            qData.error = res.lngText('ERRORS.BAD_EXT');
            qData.active = 'edit';
            res.redirectDataURL(user.href, qData, 'user');
            return;
        }
        const newPhoto = await changeProfilePhoto(req.files.chphoto);
        if (newPhoto != false) {
            newPhotoX = newPhoto;
        }
    }

    const [ee, newUser] = await dbUser.updateUser({ _id: id }, { username, displayUsername: username, aboutMe: aboutMe, fullName: fullName, photo: newPhotoX, email: email });
    if (ee == null && newUser != null && newUser.id == id) {
        if (oldPhoto !== newUser.photo) deleteProfilePhoto(oldPhoto);
        qData.success = res.lngText('P_PROFILE.SUCCESS_EDIT');
        qData.active = 'edit';
        user = newUser;
        if (beforeEmail !== user.email && res.locals.user.id === id) {
            const payload = { email: user.email, id, key: user.tokenKey };
            const token = utils.jwt.createToken(payload);
            if (token.length > 0) {
                res.locals.token = token;
                res.locals.payload = payload;
                res.cookie('lgtk', token, { maxAge: 60 * 60 * 24 * 30 * 1000, httpOnly: true });
            }
        }
    } else {
        qData.error = res.lngText('P_PROFILE.ERROR_EDIT') + " " + ee;
        qData.active = 'edit';
    }
    res.redirectDataURL(user.href, qData, 'user')
}


async function updateSettings(req, res, user) {
    const id = user.id;
    const qData = {};
    const lang = req.body.lang.trim();

    if (typeof LANGLIST[lang] === undefined) {
        qData.error = res.lngText('P_PROFILE.ERROR_SETTINGS');
        qData.active = 'settings';
        res.redirectDataURL(user.href, qData, 'user')
        return;
    }

    const [ee, newUser] = await dbUser.updateUser({ _id: id }, { lang: lang });
    if (ee == null && newUser != null && newUser.id == id) {
        user.lang = newUser.lang;
        res.locals.lang = user.lang;
        qData.success = res.lngText('P_PROFILE.SUCCESS_SETTINGS');
        qData.active = 'settings';
    } else {
        qData.error = res.lngText('P_PROFILE.ERROR_SETTINGS') + " " + ee;
        qData.active = 'settings';
    }
    res.redirectDataURL(user.href, qData, 'user')
}