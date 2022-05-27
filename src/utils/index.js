const crypter = require('./crypter')
const jwt = require('./jwt');
const hasher = require('./hasher')

function ValidateEmail(email) {
    var validRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
    if (email.match(validRegex)) {
        return true;
    } else {
        return false;
    }
}

function ValidateName(name) {
    var validRegex = /^\b([A-ZÀ-ÿa-z][-,a-zA-ZÀ-ÿ. ']+[ ]*)+$/;
    if (name.match(validRegex)) {
        return true;
    } else {
        return false;
    }
}

function ValidateUsername(name) {
    var validRegex = /^[a-zA-Z0-9_]*$/;
    if (name.match(validRegex)) {
        return true;
    } else {
        return false;
    }
}

function ValidateObjectID(id) {
    if (typeof id !== "string") return false;

    var validRegex = /^[0-9a-fA-F]{24}$/;
    if (id.match(validRegex)) {
        return true;
    } else {
        return false;
    }
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

function nameLetter(fullname) {
    let firstword = fullname.split(" ")[0];
    firstword = firstword.toLowerCase();
    if (firstword[0] >= 'a' && firstword[1] <= 'z')
        return firstword[0];
    return "none";
}

module.exports = {
    nameLetter,
    ValidateEmail,
    ValidateName,
    ValidateUsername,
    ValidateObjectID,
    escapeRegExp,
    crypter,
    jwt,
    hasher,
}