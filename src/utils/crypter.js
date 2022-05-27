const crypto = require('crypto');
const config = require('../../config');
const ENC_KEY = config.ENC_KEY;
const IV = config.ENC_IV;

var encrypt = ((val) => {
    let cipher = crypto.createCipheriv('aes-256-cbc', ENC_KEY, IV);
    let encrypted = cipher.update(val, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return encrypted;
});

var decrypt = ((encrypted) => {
    let decipher = crypto.createDecipheriv('aes-256-cbc', ENC_KEY, IV);
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    return (decrypted + decipher.final('utf8'));
});

var randomhex = () => {
    return crypto.randomBytes(10).toString("hex");
}

module.exports = {
    encrypt,
    decrypt,
    randomhex,
}