const base = require('./base');
const loginreg = require('./loginreg');
const user = require('./user');
const community = require('./community');
const challenge = require('./challenge');


module.exports.setupRoutes = (app) => {
    app.use(base());
    app.use(loginreg());
    app.use(user());
    app.use(community())
    app.use(challenge())
}