const { ValidateObjectID } = require(".");

function getUsernameWhere(username) {
    const usernameWhere = {
        $or: [
            { username: username.toLowerCase() },
            ValidateObjectID(username) ? { username: null, _id: username } : { _id: null }
        ]
    };
    return usernameWhere;
}

module.exports = {
    getUsernameWhere,
}