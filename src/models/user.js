var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var utils = require('../utils');
const { getProfilePhoto } = require('../utils/file');

const UserSchema = new Schema({
    email: { type: String, lowercase: true, trim: true, required: true, unique: true, validate: [utils.ValidateEmail, 'INVALID_EMAIL'], maxlength: 320 },
    password: { type: String, required: true },
    tokenKey: { type: Number, default: 0 },
    username: { type: String, trim: true, unique: true, lowercase: true, validate: [utils.ValidateUsername, 'INVALID_USERNAME'], minlength: 3, maxlength: 24 },
    displayUsername: { type: String, trim: true, validate: [utils.ValidateUsername, 'INVALID_USERNAME'], minlength: 3, maxlength: 24 },
    fullName: { type: String, trim: true, validate: [utils.ValidateName, 'INVALID_NAME'], maxlength: 96, required: true },
    admin: { type: Number, min: 0, default: 0 },
    emailVerified: { type: Boolean, default: false },
    lang: { type: String, default: 'en' },
    aboutMe: { type: String, default: '<%= Hello World %>', maxlength: 2000 },
    photo: { type: String, default: "user" },
    createdAt: { type: Date, default: Date.now() },
});

/* Hook */
UserSchema.post('find', (docs) => {
    for (let i = 0; i < docs.length; i++) userInit(docs[i]);
});
UserSchema.post('findOne', userInit);
UserSchema.post('findOneAndUpdate', userInit);

UserSchema.pre('save', function (next) {
    if (this.username === undefined || this.username === null || typeof this.username !== "string"
        || this.username === "" || this.username.length === 20) {
        this.username = this.get('_id');
        this.displayUsername = this.get('_id');
    }
    next();
});
var User = mongoose.model('User', UserSchema, 'users');

async function createUser(fullName, email, password) {
    username = utils.crypter.randomhex(); // temporary username will be 'id' after the user create. we are ignoring unique check with this.
    var newUser = new User({ username, fullName, email, password: "x" });
    try {
        const user = await newUser.save();
        if (user != null) {
            var hash = utils.hasher.hash(user.id, password);
            newUser.password = hash;
            newUser.save();
        }
        return [null, user];
    } catch (err) {
        console.error(err)
        return [err, null];
    }
}

async function updateUser(obj, upd) {
    try {
        const updz = await User.findOneAndUpdate(obj, upd, { returnDocument: 'after' });
        return [null, updz]
    } catch (err) {
        console.error(err)
        return [err, null];
    }
}

async function getUsers(obj) {
    try {
        const users = await User.find(obj);
        return [null, users]
    } catch (err) {
        console.error(err)
        return [err, null];
    }
}

async function getUser(obj) {
    try {
        const user = await User.findOne(obj);
        return [null, user]
    } catch (err) {
        console.error(err)
        return [err, null];
    }
}

async function getUserByEmailPassword(email, password) {
    try {
        const user = await User.findOne({ email: email });
        if (user != null) {
            var hash = utils.hasher.hash(user.id, password);
            if (hash === user.password) {
                return [null, user]
            }
        }
        return [null, null]
    } catch (err) {
        console.error(err)
        return [err, null];
    }
}

function userInit(user) {
    if (user != null) {
        user.pp = getProfilePhoto(user.photo, user.fullName);
        if (user.username === null || typeof user.username !== "string" || user.username === "") {
            user.username = user.id;
            user.displayUsername = user.username;
        } else if (user.displayUsername === undefined || user.displayUsername === null) {
            user.displayUsername = user.username;
        }
        user.href = `/user/${user.displayUsername}`;
    }
}



module.exports = {
    createUser,
    getUser,
    getUsers,
    getUserByEmailPassword,
    updateUser,
    userInit,
};