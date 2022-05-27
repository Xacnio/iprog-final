const crypto = require('crypto');
const crypter = require('./crypter')

const hash = (id, password) => {
    let idN = crypter.encrypt(crypter.encrypt(id));
    //let emailN = crypter.encrypt(email);
    let passwordN = crypter.encrypt(crypter.encrypt(password));
    const pwd = `4^+&cxz_${idN}_&+12z7${passwordN}64x21f4` + process.env.HASH_SALT;
    const hash = crypto.createHash('sha256').update(pwd).digest('base64');
    return hash;
}

module.exports = {
    hash
};