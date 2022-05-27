const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser')
var csrf = require('csurf');
const helmet = require("helmet");
const { setupRoutes } = require('./routes');
const { setupMiddlewares } = require('./middlewares');
const err404 = require('./routes/404');
const app = express();


module.exports.createServer = () => {
    app.set('view engine', 'ejs');
    app.set('views', "./src/views");
    app.use(helmet.hidePoweredBy());
    app.use(bodyParser.urlencoded({ extended: false }))
    app.use(bodyParser.json())
    app.use(cookieParser())
    app.use(csrf({ cookie: { key: '__xcsrf', httpOnly: true } }));

    app.use(express.static('./src/public'))
    app.use(express.static('./data'))


    setupMiddlewares(app);

    setupRoutes(app)

    app.use(err404());
    return app;
}