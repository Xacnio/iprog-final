const app = require('express');
const { getChallengesBest } = require('../models/challenge');

module.exports = () => {
    const baseRouter = app.Router();

    baseRouter.get('/', async function (req, res) {
        const [e, challenges] = await getChallengesBest(4);
        return res.renderTemplate('index', { challenges }, 'index_top');
    })

    return baseRouter;
}