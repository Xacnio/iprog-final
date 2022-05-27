const { v4: randomUUID } = require('uuid');
const fs = require('fs');
const { glob } = require("glob");
const easyimg = require('easyimage');
const { nameLetter } = require('.');

const profileImageSizes = [64, 200, 400];
const profileImagesDir = "./data/profile_images/";
const prefixPath = "/profile_images/";

function getProfilePhoto(photo, fullName) {
    let photos = [];
    if (["user", "community"].includes(photo)) {
        photos.push({ size: `256x256`, url: defaultPP(fullName) })
    } else {
        profileImageSizes.forEach(size => {
            photos.push({ size: `${size}x${size}`, url: prefixPath + `${photo}-${size}x${size}.jpg` })
        })
    }
    return {
        get: function (size) {
            const type = (size >= 0 && size < this.photos.length) ? size : 0;
            return this.photos[type];
        },
        photos: photos,
    };
}

function deleteTemp(path) {
    if (fs.existsSync(path)) {
        fs.unlinkSync(path);
    }
    return true;
}

function deleteProfilePhoto(path) {
    if (["user", "community"].includes(path)) return false;
    glob(profileImagesDir + path + "-*.jpg", function (er, files) {
        files.forEach(filename => {
            fs.unlinkSync(filename)
        })
    });
    return true;
}

async function changeProfilePhoto(file) {
    const randomId = randomUUID();
    let count = 0;
    for (var i = 0; i < profileImageSizes.length; i++) {
        let s = profileImageSizes[i];
        try {
            await easyimg.thumbnail({ height: s, width: s, src: "./" + file.tempFilePath, dst: profileImagesDir + `${randomId}-${s}x${s}.jpg`, quality: 100 });
            if (fs.existsSync(profileImagesDir + `${randomId}-${s}x${s}.jpg`)) {
                count++;
            }
        } catch (err) {
            // ignore
        }
    }
    if (count == profileImageSizes.length) {
        deleteTemp("./" + file.tempFilePath);
        return `${randomId}`;
    } else {
        deleteTemp("./" + file.tempFilePath);
        deleteProfilePhoto(randomId);
        return false;
    }
}

const defaultPP = function (fullName) {
    const _default = nameLetter(fullName)

    return `${prefixPath}default/${_default}.png`;
}

function validMimeType(mimetype) {
    if (["image/jpeg", "image/png"].includes(mimetype)) return true;
    return false;
}

module.exports = {
    validMimeType,
    getProfilePhoto,
    deleteProfilePhoto,
    changeProfilePhoto,
    deleteTemp,
    profileImageSizes,
}