var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var utils = require('../utils');;
const { getProfilePhoto } = require('../utils/file');

const CommunitySchema = new Schema({
    fullName: { type: String, trim: true, maxlength: 96, default: 'Community', required: true },
    username: { type: String, trim: true, unique: true, lowercase: true, validate: [utils.ValidateUsername, 'INVALID_USERNAME'], minlength: 3, maxlength: 24 },
    displayUsername: { type: String, trim: true, validate: [utils.ValidateUsername, 'INVALID_USERNAME'], minlength: 3, maxlength: 24 },
    aboutUs: { type: String, default: 'Hello World', maxlength: 2000 },
    creator: { type: Schema.Types.ObjectId, ref: 'User' },
    moderators: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    photo: { type: String, default: "community" },
    createdAt: { type: Date, default: Date.now() },
});

CommunitySchema.post('find', (docs) => {
    for (let i = 0; i < docs.length; i++) communityInit(docs[i]);
});
CommunitySchema.post('findOne', communityInit);
CommunitySchema.post('findOneAndUpdate', communityInit);

CommunitySchema.pre('save', function (next) {
    if (this.username === undefined || this.username === null || typeof this.username !== "string"
        || this.username === "" || this.username.length === 20) {
        this.username = this.get('_id');
        this.displayUsername = this.get('_id');
    }
    next();
});
var Community = mongoose.model('Community', CommunitySchema, 'communities');

async function createCommunity(obj) {
    obj.username = utils.crypter.randomhex(); // temporary username will be 'id' after the user create. we are ignoring unique check with this
    var newCommunity = new Community(obj);
    try {
        const community = await newCommunity.save();
        return [null, community];
    } catch (err) {
        console.error(err)
        return [err, null];
    }
}

async function getCommunitiesAll(page, elementPerPage, searchKey) {
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
        const totalCount = await Community.count(searchObj);
        const totalPage = Math.ceil(totalCount / elementPerPage);
        pageInfo.before = (page === 0) ? false : page - 1;
        pageInfo.after = (page >= totalPage - 1) ? false : page + 1;
        pageInfo.total = totalPage;
        pageInfo.totalData = totalCount;

        let communities = await Community.find(searchObj).skip(_skip).limit(_limit).sort({ createdAt: -1 });
        return [null, communities, pageInfo]
    } catch (err) {
        console.error(err)
        return [err, null, pageInfo];
    }
}

async function getCommunities(obj) {
    try {
        const communities = await Community.find(obj);
        return [null, communities]
    } catch (err) {
        console.error(err)
        return [err, null];
    }
}

async function getCommunity(obj) {
    try {
        const searchObj = { ...obj };
        const community = await Community.findOne(searchObj).populate({
            path: 'creator',
        }).populate({
            path: 'moderators'
        });
        return [null, community]
    } catch (err) {
        console.error(err)
        return [err, null];
    }
}

async function updateCommunity(obj, upd) {
    try {
        const updz = await Community.findOneAndUpdate(obj, upd, { returnDocument: 'after' });
        return [null, updz]
    } catch (err) {
        console.error(err)
        return [err, null];
    }
}

function communityInit(community) {
    if (community == null) return;
    community.pp = getProfilePhoto(community.photo, community.fullName);
    if (community.username === null || typeof community.username !== "string" || community.username === "") {
        community.username = community.id;
        community.displayUsername = community.username;
    } else if (community.displayUsername === undefined || community.displayUsername === null) {
        community.displayUsername = community.username;
    }
    community.canEdit = (user) => canEditCommunity(community, user);
    community.canEditChallenge = (user) => canEditCommunityChallenges(community, user);
    community.href = `/community/${community.displayUsername}`;
}

function canEditCommunityChallenges(community, user) {
    if (user.id === community.creator.id) return 2;
    if (user.admin > 0) return 2;
    if (community.moderators.includes(user.id)) return 1;
    return 0;
}

function canEditCommunity(community, user) {
    if (user.id === community.creator.id) return true;
    if (user.admin > 0) return true;
    return false;
}

module.exports = {
    getCommunity,
    updateCommunity,
    createCommunity,
    getCommunitiesAll,
    getCommunities,
}