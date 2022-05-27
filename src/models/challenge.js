var mongoose = require('mongoose');
const { getChallengePhoto } = require('../utils/file2');
const utils = require('../utils')
var Schema = mongoose.Schema;

const ChallengeSchema = new Schema({
    fullName: { type: String, trim: true, maxlength: 96, default: 'Community', required: true },
    description: { type: String, default: 'Hello World', maxlength: 2000 },
    creator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    community: { type: Schema.Types.ObjectId, ref: 'Community', required: true },
    photo: { type: String, default: "challenge" },
    createdAt: { type: Date, default: Date.now() },
    startUTC: { type: Date, default: null },
    endUTC: { type: Date, default: null },
    defaultPath: { type: String, default: null },
    targetUpload: { type: Number, default: 0 },
    terminated: { type: Boolean, default: false },
    fileArchive: { type: String, default: null },
    uploadCount: { type: Number, default: 0 },
})
ChallengeSchema.post('find', (docs) => {
    for (let i = 0; i < docs.length; i++) challengeInit(docs[i]);
});
ChallengeSchema.post('findOne', challengeInit);
ChallengeSchema.post('findOneAndUpdate', challengeInit);
var Challenge = mongoose.model('Challenge', ChallengeSchema, 'challenges');

async function deleteChallengeOne(obj) {
    try {
        await Challenge.deleteOne(obj);
        return [null]
    } catch (err) {
        console.error(err)
        return [err];
    }
}

async function createChallenge(obj) {
    var newChallenge = new Challenge(obj);
    try {
        const challenge = await newChallenge.save();
        return [null, challenge];
    } catch (err) {
        console.error(err)
        return [err, null];
    }
}

async function updateChallenge(obj, upd) {
    try {
        const updz = await Challenge.findOneAndUpdate(obj, upd, { returnDocument: 'after' });
        return [null, updz]
    } catch (err) {
        console.error(err)
        return [err, null];
    }
}

async function getChallengesAll(page, elementPerPage, searchKey) {
    searchKey = (typeof searchKey === "string") ? utils.escapeRegExp(searchKey) : undefined;
    const findObj = {
        fullName: { $regex: `.*${searchKey}.*`, $options: 'i' }
    };

    page = (typeof page === "number") ? page : 0;
    if (page < 0) page = 0;

    elementPerPage = (typeof elementPerPage === "number") ? elementPerPage : 0;
    if (elementPerPage < 1) elementPerPage = 1;

    const _skip = (page * elementPerPage);
    const _limit = elementPerPage;

    const pageInfo = {
        before: false,
        after: false,
        total: 0,
        current: page,
        key: searchKey,
    };
    const searchObj = searchKey ? { ...findObj } : {};
    try {
        const totalCount = await Challenge.count(searchObj);
        const totalPage = Math.ceil(totalCount / elementPerPage);
        pageInfo.before = (page === 0) ? false : page - 1;
        pageInfo.after = (page >= totalPage - 1) ? false : page + 1;
        pageInfo.total = totalPage;
        pageInfo.totalData = totalCount;

        let challenges = await Challenge.find(searchObj).skip(_skip).limit(_limit).sort({ createdAt: -1 });
        if (challenges !== null) {
            return [null, challenges, pageInfo]
        } else {
            return [null, challenges, pageInfo]
        }
    } catch (err) {
        console.error(err)
        return [err, null, pageInfo];
    }
}

async function getChallenge(obj) {
    try {
        const challenge = await Challenge.findOne(obj).populate(
            {
                path: 'community',
                populate: [
                    { path: 'creator' },
                    { path: 'moderators' },
                ],
            },
        );
        return [null, challenge]
    } catch (err) {
        console.error(err)
        return [err, null];
    }
}

async function getChallengesBest(count) {
    try {
        const challenges = await Challenge.find().sort({ uploadCount: -1 }).limit(count);
        return [null, challenges]
    } catch (err) {
        console.error(err)
        return [err, null];
    }
}

async function getChallenges(obj) {
    try {
        const challenges = await Challenge.find(obj);
        return [null, challenges]
    } catch (err) {
        console.error(err)
        return [err, null];
    }
}

function challengeInit(challenge) {
    if (challenge != null) {
        challenge.pp = getChallengePhoto(challenge.photo);
        challenge.href = `/challenge/${challenge.defaultPath}`
    }
}

module.exports = {
    createChallenge,
    getChallenges,
    updateChallenge,
    getChallengesAll,
    deleteChallengeOne,
    getChallenge,
    getChallengesBest,
}