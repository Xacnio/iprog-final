const dev = require('./dev');
const type = process.env.RUN || 'dev';
let envObject = {};
switch (type) {
    case 'dev':
        envObject = dev;
        break;
    case 'prod':
        envObject = dev;
        break;
}
process.env = Object.assign(process.env, envObject);
module.exports = envObject;