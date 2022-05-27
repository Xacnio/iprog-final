const { v4: randomUUID } = require('uuid');
const fs = require('fs');
const { glob } = require("glob");
const easyimg = require('easyimage');
const { deleteTemp } = require('./file');
const challengeImageSizes = [320, 640, 1280];
const challengeImagesDir = "./data/challenge_images/";
const prefixPath = "/challenge_images/";

function getChallengePhoto(photo, fullName) {
    let photos = [];
    challengeImageSizes.forEach(width => {
        const height = width / 1.777777777777778;
        photos.push({ size: `${width}x${height}`, url: prefixPath + `${photo}-${width}x${height}.jpg` })
    })
    return {
        get: function (size) {
            const type = (size >= 0 && size < this.photos.length) ? size : 0;
            return this.photos[type];
        },
        photos: photos,
    };
}

function deleteChallengePhoto(path) {
    glob(challengeImagesDir + path + "-*.jpg", function (er, files) {
        files.forEach(filename => {
            fs.unlinkSync(filename)
        })
    });
    return true;
}

async function changeChallengePhoto(file) {
    const randomId = randomUUID();
    let count = 0;
    for (var i = 0; i < challengeImageSizes.length; i++) {
        const width = challengeImageSizes[i];
        const height = width / 1.777777777777778;
        try {
            await easyimg.thumbnail({ height, width, src: "./" + file.tempFilePath, dst: challengeImagesDir + `${randomId}-${width}x${height}.jpg`, quality: 100 });
            if (fs.existsSync(challengeImagesDir + `${randomId}-${width}x${height}.jpg`)) {
                count++;
            }
        } catch (err) {
            // ignore
        }
    }
    if (count == challengeImageSizes.length) {
        deleteTemp("./" + file.tempFilePath);
        return `${randomId}`;
    } else {
        deleteTemp("./" + file.tempFilePath);
        deleteChallengePhoto(randomId);
        return false;
    }
}

module.exports = {
    getChallengePhoto,
    deleteChallengePhoto,
    changeChallengePhoto,
    challengeImageSizes,
}