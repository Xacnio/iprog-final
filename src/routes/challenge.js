const app = require('express');
const { getChallengesAll, createChallenge, updateChallenge, deleteChallengeOne, getChallenge } = require('../models/challenge');
const { mwPerm } = require('../middlewares/perm');
const fileUpload = require('express-fileupload');
const { checkChallengeDate, getChallengeValidStartEndDates } = require('../utils/time');
const { formatLocale } = require('../locale');
const { getCommunity } = require('../models/community');
const { getUsernameWhere } = require('../utils/mgdb');
const { changeChallengePhoto, deleteChallengePhoto } = require('../utils/file2');
const { createChallengeURL, getChallengeUrl } = require('../models/challengeurls');
const { newUploadedPhoto } = require('../utils/uploads');
const { createContribution, getContributionsAll, getContributors, updateContribution, countContributions } = require('../models/contribution');
const { validMimeType, deleteTemp } = require('../utils/file');
const { isValidObjectId } = require('mongoose');
const { queueArchive, deleteArchive } = require('../utils/zip');
module.exports = () => {
    const challengeRouter = app.Router();

    challengeRouter.get("/challenges", async function (req, res) {
        const DATA_PER_PAGE = 30;
        const searchKey = (typeof req.query.q === "string") ? req.query.q : undefined;
        const page = (typeof req.query.page === "string") ? Math.round(req.query.page) : 0;
        const [err, data, pageInfo] = await getChallengesAll(page, DATA_PER_PAGE, searchKey);
        if (err !== null) {
            res.errorTemplate(res.lngText('ERRORS.DB_ERROR'))
        } else {
            res.renderTemplate('challenges', { data: data, pageInfo }, undefined);
        }
    })

    challengeRouter.post("/challenge/create", mwPerm({ user: true }), fileUpload({ limits: { fileSize: 2 * 1024 * 1024 }, useTempFiles: true, tempFileDir: './tmp' }), async function (req, res) {
        const username = (req.body && req.body.username) ? req.body.username : "";
        if (username.length > 0) {
            const [e, community] = await getCommunity(getUsernameWhere(username));
            if (e != null || community == null) {
                res.notFoundTemplate()
            } else {
                await rCreateChallenge(req, res, community);
            }
        }
    })

    challengeRouter.get("/challenge/:path/approve/:id", challengeModerate);
    challengeRouter.get("/challenge/:path/reject/:id", challengeModerate);
    challengeRouter.get("/challenge/:path/revert/:id", challengeModerate);

    challengeRouter.post("/challenge/:path/zip", async (req, res) => {
        const path = req.params.path;
        const [e, u] = await getChallengeUrl(path);
        if (e == null && u != null) {
            const [ee, challenge] = await getChallenge({ _id: u.challenge });
            if (ee != null) {
                res.errorTemplate(res.lngText('ERRORS.DB_ERROR'))
            } else if (challenge == null) {
                res.errorTemplate(res.lngText('P_CHALLENGE.NOT_FOUND'))
            } else {
                const qData = { active: 'edit' };
                if (!challenge.terminated) {
                    res.redirectDataURL(`${challenge.href}/edit`, qData, 'challenge');
                    return;
                }
                if (challenge.fileArchive === 'process') {
                    qData.error = res.lngText('P_CHALLENGE.ZIP_ARCHIVE.PROCESS');
                    res.redirectDataURL(`${challenge.href}/edit`, qData, 'challenge');
                    return;
                }
                const [__, contrs] = await getContributionsAll({ challenge: u.challenge, status: 1 }, 0, -1);
                let photos = [];
                if (contrs != null && contrs.length > 0) {
                    if (challenge.fileArchive !== null && challenge.fileArchive !== "error") {
                        deleteArchive(challenge.fileArchive.split('|')[0])
                    }
                    for (let i = 0; i < contrs.length; i++) {
                        photos.push(contrs[i].photo);
                    }
                    await updateChallenge({ _id: challenge.id }, { fileArchive: 'process' })
                    queueArchive(challenge.id, photos);
                    qData.success = res.lngText('P_CHALLENGE.ZIP_ARCHIVE.SUCCESS_QUEUE')
                    res.redirectDataURL(`${challenge.href}/edit`, qData, 'challenge');
                } else {
                    qData.error = res.lngText('MAIN.NO_DATA');
                    res.redirectDataURL(`${challenge.href}/edit`, qData, 'challenge');
                }
            }
        } else next();
    });


    challengeRouter.get("/challenge/:path/moderate/:archive?", async function (req, res) {
        const archive = (req.params.archive && req.params.archive === 'archive') ? true : false;
        const DATA_PER_PAGE = 50;
        const page = (typeof req.query.page === "string") ? Math.round(req.query.page) : 0;
        const path = req.params.path;
        const postRData = req.getRedirectedData('challenge');
        const [e, u] = await getChallengeUrl(path);
        if (e == null && u != null) {
            const [ee, challenge] = await getChallenge({ _id: u.challenge });
            if (ee != null) {
                res.errorTemplate(res.lngText('ERRORS.DB_ERROR'))
            } else if (challenge == null) {
                res.errorTemplate(res.lngText('P_CHALLENGE.NOT_FOUND'))
            } else {
                if (path !== challenge.defaultPath) {
                    res.redirect(`/challenge/${challenge.defaultPath}`);
                } else {
                    let permed = (res.locals.signedIn) ? challenge.community.canEditChallenge(res.locals.user) : 0;
                    if (permed === 0) {
                        res.status(403).notAuthorizedTemplate()
                    } else {
                        const [err, contributions, pageInfo] = await getContributionsAll({ challenge: challenge.id, status: archive ? 2 : { $in: [0, 1] } }, page, DATA_PER_PAGE);
                        if (err != null) {
                            res.errorTemplate(res.lngText('ERRORS.DB_ERROR'))
                        } else {
                            res.renderTemplate('challenge/edit', { archive, pageInfo, contributions, challenge, ...postRData, permed: permed }, 'challenge_top');
                        }
                    }
                }
            }
        } else {
            res.notFoundTemplate()
        }
    })

    challengeRouter.post("/challenge/:path/join", fileUpload({ limits: { fileSize: 8 * 1024 * 1024 }, useTempFiles: true, tempFileDir: './tmp' }), async function (req, res) {
        await joinChallenge(req, res);
    })

    challengeRouter.get("/challenge/:path/join", async function (req, res) {
        if (!res.locals.signedIn) {
            res.redirect('/register');
            return;
        }
        const path = req.params.path;
        const postRData = req.getRedirectedData('challenge');
        const [e, u] = await getChallengeUrl(path);
        if (e == null && u != null) {
            const [ee, challenge] = await getChallenge({ _id: u.challenge });
            if (ee != null) {
                res.errorTemplate(res.lngText('ERRORS.DB_ERROR'))
            } else if (challenge == null) {
                res.errorTemplate(res.lngText('P_CHALLENGE.NOT_FOUND'))
            } else {
                if (path !== challenge.defaultPath) {
                    res.redirect(`/challenge/${challenge.defaultPath}`);
                } else {
                    res.renderTemplate('challenge/join', { challenge, ...postRData }, 'challenge_top');
                }
            }
        } else {
            res.notFoundTemplate()
        }
    })

    challengeRouter.get("/challenge/:path/edit", async function (req, res) {
        const path = req.params.path;
        const postRData = req.getRedirectedData('challenge');
        const [e, u] = await getChallengeUrl(path);
        if (e == null && u != null) {
            const [ee, challenge] = await getChallenge({ _id: u.challenge });
            if (ee != null) {
                res.errorTemplate(res.lngText('ERRORS.DB_ERROR'))
            } else if (challenge == null) {
                res.errorTemplate(res.lngText('P_CHALLENGE.NOT_FOUND'))
            } else {
                if (path !== challenge.defaultPath) {
                    res.redirect(`/challenge/${challenge.defaultPath}`);
                } else {
                    let permed = (res.locals.signedIn) ? challenge.community.canEditChallenge(res.locals.user) : 0;
                    if (permed === 0) {
                        res.status(403).notAuthorizedTemplate()
                    } else {
                        res.renderTemplate('challenge/edit', { challenge, ...postRData, permed: permed }, 'challenge_top');
                    }
                }
            }
        } else {
            res.notFoundTemplate()
        }
    })

    challengeRouter.post("/challenge/:path/edit", fileUpload({ limits: { fileSize: 2 * 1024 * 1024 }, useTempFiles: true, tempFileDir: './tmp' }), async function (req, res) {
        const path = req.params.path;
        const [e, u] = await getChallengeUrl(path);
        if (e == null && u != null) {
            const [ee, challenge] = await getChallenge({ _id: u.challenge });
            if (ee != null) {
                res.errorTemplate(res.lngText('ERRORS.DB_ERROR'))
            } else if (challenge == null) {
                res.errorTemplate(res.lngText('P_CHALLENGE.NOT_FOUND'))
            } else {
                let permed = (res.locals.signedIn) ? challenge.community.canEditChallenge(res.locals.user) : 0;
                if (permed !== 2) {
                    res.status(403).notAuthorizedTemplate()
                } else {
                    updateChallengeProfile(req, res, challenge);
                }
            }
        } else {
            res.notFoundTemplate()
        }
    })

    challengeRouter.get("/challenge/:path", async function (req, res) {
        const path = req.params.path;
        const postRData = req.getRedirectedData('challenge');
        const [e, u] = await getChallengeUrl(path);
        if (e == null && u != null) {
            const [ee, challenge] = await getChallenge({ _id: u.challenge });
            if (ee != null) {
                res.errorTemplate(res.lngText('ERRORS.DB_ERROR'))
            } else if (challenge == null) {
                res.errorTemplate(res.lngText('P_CHALLENGE.NOT_FOUND'))
            } else {
                if (path !== challenge.defaultPath) {
                    res.redirect(`/challenge/${challenge.defaultPath}`);
                } else {
                    let permed = (res.locals.signedIn) ? challenge.community.canEditChallenge(res.locals.user) : 0;
                    let [_, contributions] = await getContributionsAll({ challenge: challenge.id, status: 1 }, 0, 10, true);
                    const [__, contributors] = await getContributors(challenge.id)
                    res.renderTemplate('challenge', { contributors, contributions, challenge, ...postRData, permed: permed }, 'challenge_top');
                }
            }
        } else {
            res.errorTemplate(res.lngText('P_CHALLENGE.NOT_FOUND'))
        }
    })

    return challengeRouter;
}

async function rCreateChallenge(req, res, community) {
    const username = community.displayUsername;
    const name = (req.body.chname) ? req.body.chname : "";
    const desc = (req.body.cdesc) ? req.body.cdesc : "";
    const start = (req.body.cstart) ? req.body.cstart : "";
    const end = (req.body.cend) ? req.body.cend : "";
    const qData = { active: 'challenges', fields: req.body };
    const errLang = checkChallengeDate(start, end, res.locals.lang);
    const validTimes = getChallengeValidStartEndDates(res.locals.lang);
    if (errLang != null) {
        switch (errLang) {
            case 'ERR_STARTEND':
                qData.error = formatLocale(res.lngText('ERR_TIME.ERR_STARTEND'), res.lngText('P_CHALLENGE.START_TIME'), res.lngText('P_CHALLENGE.END_TIME'));
                res.redirectDataURL(`/community/${username}`, qData, 'community');
                break;
            case 'ERR_MIN_START':
                qData.error = formatLocale(res.lngText('ERR_TIME.ERR_MIN'), res.lngText('P_CHALLENGE.START_TIME'), validTimes.start.min.showForm);
                res.redirectDataURL(`/community/${username}`, qData, 'community');
                break;
            case 'ERR_MIN_END':
                qData.error = formatLocale(res.lngText('ERR_TIME.ERR_MIN'), res.lngText('P_CHALLENGE.END_TIME'), validTimes.end.min.showForm);
                res.redirectDataURL(`/community/${username}`, qData, 'community');
                break;
            case 'ERR_MAX_START':
                qData.error = formatLocale(res.lngText('ERR_TIME.ERR_MAX'), res.lngText('P_CHALLENGE.START_TIME'), validTimes.start.max.showForm);
                res.redirectDataURL(`/community/${username}`, qData, 'community');
                break;
            case 'ERR_MAX_END':
                qData.error = formatLocale(res.lngText('ERR_TIME.ERR_MAX'), res.lngText('P_CHALLENGE.END_TIME'), validTimes.end.max.showForm);
                res.redirectDataURL(`/community/${username}`, qData, 'community');
                break;
        }
    } else {
        if (name === "" && desc === "") {
            qData.error = res.lngText('ERRORS.FILL_FIELDS');
            res.redirectDataURL(`/community/${username}`, qData, 'community');
            return
        }

        let challengePhoto = "challenge";
        if (req.files != null && typeof req.files.cphoto === "object") {
            if (!validMimeType(req.files.cphoto.mimetype)) {
                deleteTemp("./" + req.files.cphoto.tempFilePath);
                qData.error = res.lngText('ERRORS.BAD_EXT');
                res.redirectDataURL(`/community/${username}`, qData, 'community');
                return;
            }
            const newPhoto = await changeChallengePhoto(req.files.cphoto);
            if (newPhoto != false) {
                challengePhoto = newPhoto;
            }
        }
        if (challengePhoto === 'challenge') {
            qData.error = res.lngText('ERRORS.CHALLENGE_PHOTO_REQUIRED');
            res.redirectDataURL(`/community/${username}`, qData, 'community');
            return
        }

        const [err, newCh] = await createChallenge({
            creator: res.locals.user.id,
            fullName: name,
            description: desc,
            community: community.id,
            startUTC: new Date(start),
            endUTC: new Date(end),
            photo: challengePhoto,
        });
        if (err != null || newCh === null) {
            deleteChallengePhoto(challengePhoto);
            qData.error = res.lngText('P_CHALLENGE.ERROR_CREATE');
            res.redirectDataURL(`/community/${username}`, qData, 'community')
        } else {
            const [e, chUrl] = await createChallengeURL(name, newCh.id);
            if (e != null || chUrl == null) {
                deleteChallengePhoto(challengePhoto);
                deleteChallengeOne({ _id: newCh.id });
                qData.error = res.lngText('P_CHALLENGE.ERROR_CREATE');
                res.redirectDataURL(`/community/${username}`, qData, 'community')
            } else {
                await updateChallenge({ _id: newCh.id }, { defaultPath: chUrl.path });
                qData.success = res.lngText('P_CHALLENGE.SUCCESS_CREATE');
                res.redirectDataURL(`/community/${username}`, qData, 'community');
            }
        }
    }
}

async function updateChallengeProfile(req, res, challenge) {
    const id = challenge.id;
    const name = (req.body.chname) ? req.body.chname : "";
    const desc = (req.body.chdesc) ? req.body.chdesc : "";
    const terminated = (req.body.chstatus === "1") ? true : false;
    const qData = { fields: req.body };
    let endDate = challenge.endUTC;
    if (terminated != challenge.terminated) {
        endDate = Date.now()
    }

    if (name === "" && desc === "") {
        qData.error = res.lngText('ERRORS.FILL_FIELDS');
        res.redirectDataURL(`/challenge/${challenge.href}/edit`, qData, 'challenge');
        return
    }

    let challengePhoto = challenge.photo;
    if (req.files != null && typeof req.files.chphoto === "object") {
        if (!validMimeType(req.files.chphoto.mimetype)) {
            deleteTemp("./" + req.files.chphoto.tempFilePath);
            qData.error = res.lngText('ERRORS.BAD_EXT');
            res.redirectDataURL(`/challenge/${challenge.href}/edit`, qData, 'challenge');
            return;
        }
        const newPhoto = await changeChallengePhoto(req.files.chphoto);
        if (newPhoto != false) {
            challengePhoto = newPhoto;
        }
    }

    const [ee, newChallenge] = await updateChallenge({ _id: id }, { fullName: name, description: desc, photo: challengePhoto, terminated, endUTC: endDate });
    if (ee == null && newChallenge != null && newChallenge.id == id) {
        if (challengePhoto !== challenge.photo) {
            deleteChallengePhoto(challenge.photo);
        }
        qData.fields = undefined;
        if (newChallenge.fullName !== challenge.fullName) {
            const [e, chUrl] = await createChallengeURL(name, newChallenge.id);
            if (e != null || chUrl == null || chUrl.href === challenge.defaultPath) {
                qData.success = res.lngText('P_CHALLENGE.SUCCESS_EDIT');
                res.redirectDataURL(`${challenge.href}/edit`, qData, 'challenge');
            } else {
                await updateChallenge({ _id: challenge.id }, { defaultPath: chUrl.href });
                qData.success = res.lngText('P_CHALLENGE.SUCCESS_EDIT');
                challenge.href = `/challenge/${chUrl.href}`;
                res.redirectDataURL(`${challenge.href}/edit`, qData, 'challenge');
            }
        } else {
            qData.success = res.lngText('P_CHALLENGE.SUCCESS_EDIT');
            res.redirectDataURL(`${challenge.href}/edit`, qData, 'challenge');
        }
    } else {
        await updateChallenge({ _id: challenge.id }, { defaultPath: chUrl.href });
        qData.error = res.lngText('P_CHALLENGE.ERROR_EDIT');
        res.redirectDataURL(`${challenge.href}/edit`, qData, 'challenge');
    }
}

async function joinChallenge(req, res) {
    if (!res.locals.signedIn) {
        res.redirect('/register');
        return;
    }
    const qData = {};
    const path = req.params.path;
    const [e, u] = await getChallengeUrl(path);
    if (e == null && u != null) {
        const [ee, challenge] = await getChallenge({ _id: u.challenge });
        if (ee != null) {
            res.errorTemplate(res.lngText('ERRORS.DB_ERROR'))
        } else if (challenge == null) {
            res.errorTemplate(res.lngText('P_CHALLENGE.NOT_FOUND'))
        } else {
            if (challenge.terminated) {
                qData.error = res.lngText('P_CHALLENGE.ERROR_JOIN_TERMINATED');
                res.redirectDataURL(`${challenge.href}/join`, qData, 'challenge');
                return;
            }
            let uploadPhoto = null;
            if (req.files != null && typeof req.files.chphoto === "object") {
                if (!validMimeType(req.files.chphoto.mimetype)) {
                    deleteTemp("./" + req.files.chphoto.tempFilePath);
                    qData.error = res.lngText('ERRORS.BAD_EXT');
                    res.redirectDataURL(`${challenge.href}/join`, qData, 'challenge');
                    return;
                }
                const newPhoto = await newUploadedPhoto(req.files.chphoto);
                if (newPhoto != false) {
                    uploadPhoto = newPhoto;
                }
            }
            if (uploadPhoto === null) {
                qData.error = res.lngText('P_CHALLENGE.ERROR_UPLOAD')
                res.redirectDataURL(`${challenge.href}/join`, qData, 'challenge');
            } else {
                const [err, contribution] = await createContribution({
                    challenge: challenge.id,
                    who: res.locals.user.id,
                    photo: uploadPhoto,
                    status: 0
                });
                if (err != null || contribution == null) {
                    qData.error = res.lngText('ERRORS.DB_ERROR')
                    res.redirectDataURL(`${challenge.href}/join`, qData, 'challenge');
                } else {
                    qData.imgHref = contribution.image.get(0).url;
                    qData.success = res.lngText('P_CHALLENGE.SUCCESS_UPLOAD')
                    res.redirectDataURL(`${challenge.href}/join`, qData, 'challenge');
                }
            }
        }
    } else {
        res.notFoundTemplate()
    }
}

async function challengeModerate(req, res) {
    const id = req.params.id;
    const path = req.params.path;
    let status = 0, statusText = 'REVERTED';
    if (req.path.includes("/approve/")) status = 1, statusText = 'APPROVED';
    else if (req.path.includes("/reject/")) status = 2, statusText = 'REJECTED';
    const redirectURL = (req.headers.referer.includes('/moderate/archive')) ? `/challenge/${path}/moderate/archive?page=${req.query.page}` : `/challenge/${path}/moderate?page=${req.query.page}`;
    const reviewDate = (status === 0) ? new Date(0) : Date.now();
    if (!isValidObjectId(id)) return res.redirect(redirectURL);
    if (!res.locals.signedIn) {
        res.redirect('/register');
        return;
    }
    const qData = {};
    const [e, u] = await getChallengeUrl(path);
    if (e == null && u != null) {
        const [ee, challenge] = await getChallenge({ _id: u.challenge });
        if (ee != null) {
            res.errorTemplate(res.lngText('ERRORS.DB_ERROR'))
        } else if (challenge == null) {
            res.errorTemplate(res.lngText('P_CHALLENGE.NOT_FOUND'))
        } else {
            let permed = (res.locals.signedIn) ? challenge.community.canEditChallenge(res.locals.user) : 0;
            if (permed >= 1) {
                const [err] = await updateContribution({ _id: id }, { status, reviewDate });
                if (err) {
                    qData.error = res.lngText('ERRORS.DB_ERROR')
                } else {
                    qData.success = formatLocale(res.lngText('P_CHALLENGE.MODERATION.MSG'), res.lngText(`P_CHALLENGE.MODERATION.${statusText}`))
                    const count = await countContributions({ challenge: challenge.id, status: 1 });
                    if (count != null) {
                        await updateChallenge({ _id: challenge.id }, { uploadCount: count })
                    }
                }
                res.redirectDataURL(redirectURL, qData, 'challenge')
            } else {
                res.notFoundTemplate();
            }
        }
    } else {
        res.notFoundTemplate()
    }
}