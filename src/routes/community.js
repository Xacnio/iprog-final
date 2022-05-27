
const utils = require('../utils')
const { mwPermOr, mwPerm } = require('../middlewares/perm');
const app = require('express');
const fileUpload = require('express-fileupload');
const { changeProfilePhoto, deleteProfilePhoto, validMimeType, deleteTemp } = require('../utils/file');
const { getCommunitiesAll, getCommunity, communityInit, updateCommunity, createCommunity } = require('../models/community');
const { getChallengeValidStartEndDates } = require('../utils/time');
const { getChallenges } = require('../models/challenge');
const { getUsernameWhere } = require('../utils/mgdb');
const { formatLocale } = require('../locale');
const { getUser } = require('../models/user');

module.exports = () => {
    const communityRouter = app.Router();

    communityRouter.get("/community", function (req, res) {
        res.redirect('/communities');
    })

    communityRouter.get("/communities", async function (req, res) {
        const DATA_PER_PAGE = 30;
        const searchKey = (typeof req.query.q === "string") ? req.query.q : undefined;

        const page = (typeof req.query.page === "string") ? Math.round(req.query.page) : 0;

        const [err, data, pageInfo] = await getCommunitiesAll(page, DATA_PER_PAGE, searchKey);
        if (err !== null) {
            res.errorTemplate(res.lngText('ERRORS.DB_ERROR'))
        } else {
            res.renderTemplate('communities', { data: data, pageInfo }, undefined);
        }
    })

    communityRouter.get("/community/create", mwPerm({ user: true }), fileUpload({ limits: { fileSize: 2 * 1024 * 1024 }, useTempFiles: true, tempFileDir: './tmp' }), async function (req, res) {
        const qData = { active: 'communities' };
        res.redirectDataURL(res.locals.user.href, qData, 'user');
    })

    communityRouter.get("/community/:username/delete", mwPerm({ $gte: { admin: 1 } }), async function (req, res) {
        const username = req.params.username;
        if (!utils.ValidateUsername(username)) {
            res.errorTemplate(res.lngText('P_COMMUNITY.NOT_FOUND'))
        } else {
            const [err, community] = await getCommunity(getUsernameWhere(username));
            if (err != null) {
                res.errorTemplate(res.lngText('ERRORS.DB_ERROR'))
            } else if (community == null) {
                res.errorTemplate(res.lngText('P_COMMUNITY.NOT_FOUND'))
            } else {
                await updateCommunity({ _id: community.id }, { deleted: true })
                res.redirectData()
            }
        }
    })

    communityRouter.post("/community/:username/togglemod", async function (req, res) {
        const username = req.params.username;
        let mUserName = (req.body.username) ? req.body.username.trim().replace('@', '') : "";
        if (!utils.ValidateUsername(username)) {
            res.errorTemplate(res.lngText('P_COMMUNITY.NOT_FOUND'))
        } else {
            const [err, community] = await getCommunity(getUsernameWhere(username));
            if (err != null) {
                res.errorTemplate(res.lngText('ERRORS.DB_ERROR'))
            } else if (community == null) {
                res.errorTemplate(res.lngText('P_COMMUNITY.NOT_FOUND'))
            } else {
                if (community.canEdit(res.locals.user)) {
                    const qData = { active: 'moderators', fields_mdt: req.body };
                    const [_, user] = await getUser(getUsernameWhere(mUserName));
                    if (user != null) {
                        qData.fields_mdt = undefined;
                        const exist = ((community.moderators.filter((x) => x.id === user.id)).length > 0) ? true : false;
                        if (exist) {
                            const newMods = community.moderators.filter((x) => x.id !== user.id);
                            updateCommunity({ _id: community.id }, { moderators: newMods })
                            qData.error = formatLocale(res.lngText('P_COMMUNITY.MSG_RM_MOD'), user.displayUsername);
                        } else {
                            community.moderators.push(user.id)
                            updateCommunity({ _id: community.id }, { moderators: community.moderators })
                            qData.success = formatLocale(res.lngText('P_COMMUNITY.MSG_ADD_MOD'), user.displayUsername);
                        }
                        res.redirectDataURL(community.href, qData, 'community');
                    } else {
                        qData.error = res.lngText('P_PROFILE.NOT_FOUND');
                        res.redirectDataURL(community.href, qData, 'community');
                    }
                } else {
                    res.redirect(community.href);
                }
            }
        }
    })

    communityRouter.get("/community/:username", async function (req, res) {
        const username = req.params.username;
        const postRData = req.getRedirectedData('community');
        if (!utils.ValidateUsername(username)) {
            res.errorTemplate(res.lngText('P_COMMUNITY.NOT_FOUND'))
        } else {
            const [err, community] = await getCommunity(getUsernameWhere(username));
            if (err != null) {
                res.errorTemplate(res.lngText('ERRORS.DB_ERROR'))
            } else if (community == null) {
                res.errorTemplate(res.lngText('P_COMMUNITY.NOT_FOUND'))
            } else {
                const permed = (res.locals.signedIn) ? community.canEdit(res.locals.user) : false;
                const chDates = getChallengeValidStartEndDates(res.locals.lang);
                const [_, challenges] = await getChallenges({ community: community.id });
                res.renderTemplate('community', { challengeDates: chDates, challenges, ...postRData, community, self: permed }, undefined);
            }
        }
    })

    communityRouter.post("/community/create", mwPerm({ user: true }), fileUpload({ limits: { fileSize: 2 * 1024 * 1024 }, useTempFiles: true, tempFileDir: './tmp' }), async function (req, res) {
        await rCreateCommunity(req, res);
    })

    communityRouter.post("/community/:username", mwPerm({ user: true }), fileUpload({ limits: { fileSize: 2 * 1024 * 1024 }, useTempFiles: true, tempFileDir: './tmp' }), async function (req, res) {
        const username = req.params.username;
        if (!utils.ValidateUsername(username)) {
            res.errorTemplate(res.lngText('P_COMMUNITY.NOT_FOUND'))
        } else {
            const [err, community] = await getCommunity(getUsernameWhere(username));
            if (err != null) {
                res.errorTemplate(res.lngText('ERRORS.DB_ERROR'))
            } else if (community == null) {
                res.errorTemplate(res.lngText('P_COMMUNITY.NOT_FOUND'))
            } else {
                const permed = (res.locals.signedIn) ? community.canEdit(res.locals.user) : false;
                if (!permed) {
                    res.status(403);
                    return res.errorTemplate(res.lngText('ERRORS.NO_ACCESS'));
                }
                if (req.body.cdesc || req.body.cdesc === "") {
                    await updateCommunityProfile(req, res, community);
                } else {
                    res.renderTemplate('community', { community, self: permed }, undefined);
                }

            }
        }
    })

    return communityRouter;
}

async function updateCommunityProfile(req, res, community) {
    const id = community.id;
    const username = req.body.username.trim();
    const qData = { fields: req.body };
    if (!utils.ValidateUsername(username)) {
        qData.error = res.lngText('P_PROFILE.ERR_USERNAME_INVALID');
        qData.active = 'edit';
        res.redirectData(qData, 'community')
        return;
    }

    if (username !== community.displayUsername && (username.length < 3 || username.length > 16)) {
        qData.error = res.lngText('P_PROFILE.ERR_USERNAME_LENGTH');
        qData.active = 'edit';
        res.redirectData(qData, 'community')
        return;
    }

    let newPhotoX = community.photo;
    let oldPhoto = community.photo;
    if (req.files != null && typeof req.files.chphoto === "object") {
        if (!validMimeType(req.files.chphoto.mimetype)) {
            deleteTemp("./" + req.files.chphoto.tempFilePath);
            qData.error = res.lngText('ERRORS.BAD_EXT');
            qData.active = 'edit';
            res.redirectData(qData, 'community')
            return;
        }
        const newPhoto = await changeProfilePhoto(req.files.chphoto);
        if (newPhoto != false) {
            newPhotoX = newPhoto;
        }
    }

    const [ee, newCommunity] = await updateCommunity({ _id: id }, { username, displayUsername: username, aboutUs: req.body.cdesc, fullName: req.body.name, photo: newPhotoX });
    if (ee == null && newCommunity != null && newCommunity.id == id) {
        if (newPhotoX !== oldPhoto) deleteProfilePhoto(oldPhoto);
        qData.success = res.lngText('P_COMMUNITY.SUCCESS_EDIT');
        qData.active = 'edit';
        community = newCommunity;
    } else {
        qData.error = res.lngText('P_COMMUNITY.ERROR_EDIT');
        if (ee.name === "MongoServerError") {
            if (ee.toString().includes('duplicate key error collection')) {
                qData.error = res.lngText('ERRORS.USED_USERNAME');
            }
        }
        qData.active = 'edit';
    }
    //res.renderTemplate('community', { community, self: (res.locals.signedIn && (res.locals.user.id === community.creator || res.locals.user.admin > 0)), ...qData }, undefined);
    res.redirectDataURL(community.href, qData, 'community')
}

async function rCreateCommunity(req, res) {
    const fullName = (req.body.name) ? req.body.name.trim() : "";
    if (fullName === "") {
        const qData = { error: res.lngText('ERRORS.FILL_FIELDS'), active: 'communities', fields_cmt: req.body };
        res.redirectDataURL(res.locals.user.href, qData, 'user')
        return
    }
    const [err, newCm] = await createCommunity({ creator: res.locals.user.id, fullName });
    if (err != null || newCm === null) {
        const qData = { error: res.lngText('P_COMMUNITY.ERROR_CREATE'), active: 'communities', fields_cmt: req.body };
        res.redirectDataURL(res.locals.user.href, qData, 'user')
    } else {
        let profilePhoto = "community";
        if (req.files != null && typeof req.files.chphoto === "object") {
            if (!validMimeType(req.files.chphoto.mimetype)) {
                deleteTemp("./" + req.files.chphoto.tempFilePath);
                const qData = { error: res.lngText('ERRORS.BAD_EXT'), active: 'communities', fields_cmt: req.body };
                res.redirectDataURL(res.locals.user.href, qData, 'user')
                return;
            }
            const newPhoto = await changeProfilePhoto(req.files.chphoto);
            if (newPhoto != false) {
                profilePhoto = newPhoto;
            }
        }
        const qData = { fields_cmt: req.body };
        if (profilePhoto !== "community") {
            const [ee, newCommunity] = await updateCommunity({ _id: newCm.id }, { photo: profilePhoto });
            if (ee == null && newCommunity != null && newCommunity.id == newCm.id) {
                qData.g_success = res.lngText('P_COMMUNITY.SUCCESS_CREATE');
            } else {
                qData.error = res.lngText('P_COMMUNITY.ERROR_CREATE');
            }
        } else {
            qData.g_success = res.lngText('P_COMMUNITY.SUCCESS_CREATE');
        }
        res.redirectDataURL(`/community/${newCm.id}`, qData, 'community')
    }
}