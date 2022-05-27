var mongoose = require('mongoose');
var Schema = mongoose.Schema;
const jwt = require('../utils/jwt')

const RevokedTokenSchema = new Schema({
    token: String,
    expireAt: {
        type: Date,
        default: null,
    },
});
RevokedTokenSchema.index({ "expireAt": 1 }, { expireAfterSeconds: 0 });
var RevokedToken = mongoose.model('RevokedToken', RevokedTokenSchema, 'revoked_tokens');

function revokeToken(token) {
    const unixTime = Math.floor(Date.now() / 1000);
    jwt.verifyToken(token, (err, payload) => {
        if (err) return;
        if (payload.exp < unixTime || payload.exp < 0) {
            return false;
        } else {
            const date = new Date(payload.exp * 1000);
            const newRevoke = new RevokedToken({ token: token, expireAt: date });
            newRevoke.save();
        }
    }, true)
}

async function isRevokedToken(token) {
    try {
        const doc = await RevokedToken.findOne({ token });
        if (!doc) return false;
        return true;
    } catch (err) {

    }
    return false;
}

module.exports = {
    revokeToken,
    isRevokedToken,
}