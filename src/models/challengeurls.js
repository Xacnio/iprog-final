
var mongoose = require('mongoose');
const { nameToURLKey } = require('../utils/url');
var Schema = mongoose.Schema;

const ChallengeURLsSchema = new Schema({
    path: { type: String, trim: true, maxlength: 96, required: true },
    challenge: { type: Schema.Types.ObjectId, ref: 'Challenge', required: true },
    i: { type: Number, min: 0, max: 99999 },
})
var ChallengeURLs = mongoose.model('ChallengeURLs', ChallengeURLsSchema, 'challenge_urls');

async function createChallengeURL(name, challengeId) {
    const path = nameToURLKey(name);
    const [err, chUrl] = await getChallengeUrlLast({ path: { $regex: path } });
    var i = Math.round((Math.random() * 9999) + 1000);
    var url = `${path}-${i}`;
    if (err == null && chUrl == null) {
        i = 0;
        url = `${path}`;
    } else if (err == null && chUrl != null) {
        if (chUrl.challenge.toString() === challengeId) {
            return [null, chUrl];
        }
        i = chUrl.i + 1;
        url = `${path}`;
    }
    var newChallengeURL = new ChallengeURLs({ path: url, challenge: challengeId, i });
    try {
        const challengeUrl = await newChallengeURL.save();
        challengeUrl.href = (challengeUrl.i === 0) ? `${challengeUrl.path}` : `${challengeUrl.path}-${challengeUrl.i}`;
        return [null, challengeUrl];
    } catch (err) {
        console.error(err)
        return [err, null];
    }
}

async function getChallengeUrlLast(obj) {
    try {
        const challengeUrls = await ChallengeURLs.find(obj).sort({ _id: -1 }).limit(1);
        if (challengeUrls.length === 0) {
            return [null, null]
        } else {
            return [null, challengeUrl[0]]
        }
    } catch (err) {
        console.error(err)
        return [err, null];
    }
}

async function getChallengeUrl(pathN) {
    let ind = pathN.split("-").length > 1 ? pathN.split("-").slice(-1)[0] : 0;
    ind = (isNaN(ind)) ? 0 : Math.round(ind);
    try {
        const o = {
            $or: [
                { path: pathN, i: 0 },
                { path: pathN, i: Math.round(ind) }
            ]
        };
        const challengeUrl = await ChallengeURLs.findOne(o);
        if (challengeUrl !== null)
            challengeUrl.href = (challengeUrl.i === 0) ? `${challengeUrl.path}` : `${challengeUrl.path}-${challengeUrl.i}`;
        return [null, challengeUrl]
    } catch (err) {
        console.error(err)
        return [err, null];
    }
}

async function deleteChallengeUrls(obj) {
    try {
        await ChallengeURLs.deleteMany(obj);
        return [null]
    } catch (err) {
        console.error(err)
        return [err];
    }
}

module.exports = {
    createChallengeURL,
    getChallengeUrl,
    deleteChallengeUrls,
}