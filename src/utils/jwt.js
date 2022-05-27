const jwt = require("jsonwebtoken");

module.exports.createToken = (payLoad) => {
    const token = jwt.sign(payLoad, process.env.JWT_SECRET, { expiresIn: 60 * 60 * 24 * 30 }); // 30 days
    return token;
}

module.exports.verifyToken = (token, callback, ignoreExpiration) => {
    const ignoreExpire = (ignoreExpiration !== undefined && ignoreExpiration) ? true : false;
    jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: ignoreExpire }, (error, decoded) => {
        if (error)
            callback(error, {});
        else {
            callback(null, decoded);
        }
    });
}