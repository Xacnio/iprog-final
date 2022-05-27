const app = require('express');

module.exports = () => {
    const router404 = app.Router();

    router404.all('*', function (req, res) {
        return res.renderTemplate('404', undefined, undefined);
    })

    return router404;
}