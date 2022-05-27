var mongoose = require('mongoose');
const { getUploadedPhoto } = require('../utils/uploads');
const { sort } = require('fast-sort');
var Schema = mongoose.Schema;

const ContributionSchema = new Schema({
    challenge: { type: Schema.Types.ObjectId, ref: 'Challenge', required: true },
    who: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    photo: { type: String, required: true, unique: true },
    status: { type: Number, default: 0, min: 0, max: 2 }, // 0 waiting 1 approved 2 declined
    createdAt: { type: Date, default: Date.now() },
    reviewDate: { type: Date, default: new Date(0) },
});
ContributionSchema.post('find', (docs) => {
    for (let i = 0; i < docs.length; i++) contributionInit(docs[i]);
});
ContributionSchema.post('findOne', contributionInit);
ContributionSchema.post('findOneAndUpdate', contributionInit);
ContributionSchema.post('save', contributionInit);

var Contribution = new mongoose.model('Contribution', ContributionSchema, 'contributions');

async function createContribution(obj) {
    let contribution = new Contribution(obj);
    try {
        const newCont = await contribution.save();
        return [null, newCont];
    } catch (err) {
        console.error(err);
        return [err, null];
    }
}

async function countContributions(sobj) {
    try {
        const newCont = await Contribution.count(sobj);
        return newCont;
    } catch (err) {
        console.error(err);
        return null;
    }
}

async function updateContribution(sobj, nobj) {
    try {
        const newCont = await Contribution.findOneAndUpdate(sobj, nobj, { returnDocument: 'after' });
        return [null, newCont]
    } catch (err) {
        console.error(err);
        return [err, null];
    }
}

async function getContributionsAll(obj, page, elementPerPage, reverse) {
    reverse = (typeof reverse === 'boolean') ? reverse : false;
    page = (typeof page === "number") ? page : 0;
    if (page < 0) page = 0;

    elementPerPage = (typeof elementPerPage === "number") ? elementPerPage : 0;
    if (elementPerPage < 1 && elementPerPage != -1) elementPerPage = 1;

    const _skip = (page * elementPerPage);
    const _limit = elementPerPage;

    const pageInfo = {
        before: false,
        after: false,
        total: 0,
        current: page,
    };
    try {
        const totalCount = await Contribution.count(obj);
        const totalPage = (elementPerPage == -1) ? 1 : Math.ceil(totalCount / elementPerPage);
        if (elementPerPage === -1) {
            pageInfo.after = false;
            pageInfo.total = 1;
            pageInfo.before = false;
        } else {
            pageInfo.after = (page >= totalPage - 1) ? false : page + 1;
            pageInfo.total = totalPage;
            pageInfo.before = (page === 0) ? false : page - 1;
        }
        pageInfo.totalData = totalCount;
        let contrs = await Contribution.find(obj).skip((_skip < 0) ? undefined : _skip).limit((_limit == -1) ? undefined : _limit).sort({ reviewDate: (reverse) ? -1 : 1 });
        return [null, contrs, pageInfo]
    } catch (err) {
        console.error(err)
        return [err, null, pageInfo];
    }
}

async function getContributors(challengeId) {
    try {
        let contrs = await Contribution.aggregate([
            { $match: { $and: [{ status: 1 }, { challenge: mongoose.Types.ObjectId(challengeId) }] } },
            {
                $group: {
                    _id: '$who',
                    user: { $first: '$who' }
                },
            },
        ])
        await mongoose.model('User').populate(contrs, { path: 'user' });
        if (contrs != null && contrs.length > 0) {
            contrs.map((v, i) => {
                contrs[i] = contrs[i].user;
            })
            contrs = sort(contrs).asc((x) => x.username);
        } else {
            contrs = [];
        }
        return [null, contrs]
    } catch (err) {
        console.error(err)
        return [err, []];
    }
}

function contributionInit(cont) {
    if (cont != null) {
        cont.image = getUploadedPhoto(cont.photo);
        //as sd
    }
}

module.exports = {
    countContributions,
    updateContribution,
    createContribution,
    getContributionsAll,
    getContributors,
}