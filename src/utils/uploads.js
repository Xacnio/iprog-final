const { v4: randomUUID } = require('uuid');
const fs = require('fs');
const { glob } = require("glob");
const easyimg = require('easyimage');
const uploadedCompressedWidth = 320;
const uploadedImageDir = "./data/challenge_uploads/";
const prefixPath = "/challenge_uploads/";
const sizeOf = require('image-size');
const { deleteTemp } = require('./file');

function getUploadedPhotoDir(photo) {
    let photoNameParts = photo.split('|');
    let photoFileName = photoNameParts[0];
    let photoFileExt = photoNameParts[1];
    let [pwidth, pheight] = photoNameParts[2].split('x');
    return {
        path: (`${uploadedImageDir}${photoFileName}-${pwidth}x${pheight}.${photoFileExt}`),
        ext: photoFileExt,
        filename: photoFileName,
    };
}

function getUploadedPhoto(photo) {
    let photoNameParts = photo.split('|');
    let photoFileName = photoNameParts[0];
    let photoFileExt = photoNameParts[1];
    let [pwidth, pheight] = photoNameParts[2].split('x');
    let photos = [];
    const width = uploadedCompressedWidth;
    const height = uploadedCompressedWidth / 1.777777777777778;
    photos.push({ size: `${width}x${height}`, url: prefixPath + `${photoFileName}-${width}x${height}.jpg` });
    if (!(photoFileExt === "jpg" && height === pheight && width === pwidth))
        photos.push({ size: `${pwidth}x${pheight}`, url: prefixPath + `${photoFileName}-${pwidth}x${pheight}.${photoFileExt}` });
    return {
        get: function (size) {
            const type = (size >= 0 && size < this.photos.length) ? size : 0;
            return this.photos[type];
        },
        photos: photos,
    };
}

function deleteUploadedPhoto(path) {
    glob(challengeImagesDir + path + "-*.jpg", function (er, files) {
        files.forEach(filename => {
            fs.unlinkSync(filename)
        })
    });
    glob(challengeImagesDir + path + "-*.png", function (er, files) {
        files.forEach(filename => {
            fs.unlinkSync(filename)
        })
    });
    return true;
}

async function newUploadedPhoto(file) {
    if (!fs.existsSync(uploadedImageDir)) {
        fs.mkdirSync(uploadedImageDir);
    }

    const randomId = randomUUID();
    let pwidth = 0;
    let pheight = 0;
    const extension = (file.mimetype === 'image/jpeg') ? 'jpg' : 'png';
    const dimensions = await sizeOf("./" + file.tempFilePath);
    pwidth = dimensions.width;
    pheight = dimensions.height;
    if (pwidth === 0 || pheight === 0) {
        deleteTemp("./" + file.tempFilePath);
        return false;
    }
    const width = uploadedCompressedWidth;
    const height = width / 1.777777777777778;
    try {
        if (pheight === height && width === pwidth && extension === "jpg") {
            fs.renameSync("./" + file.tempFilePath, `${uploadedImageDir}${randomId}-${width}x${height}.${extension}`)
            return `${randomId}|${extension}|${pwidth}x${pheight}`;
        }
        await easyimg.thumbnail({ height, width, src: "./" + file.tempFilePath, dst: uploadedImageDir + `${randomId}-${width}x${height}.jpg`, quality: 100 });
        if (fs.existsSync(uploadedImageDir + `${randomId}-${width}x${height}.jpg`)) {
            if (fs.existsSync("./" + file.tempFilePath)) {
                fs.renameSync("./" + file.tempFilePath, `${uploadedImageDir}${randomId}-${pwidth}x${pheight}.${extension}`)
                return `${randomId}|${extension}|${pwidth}x${pheight}`;
            } else {
                deleteTemp("./" + file.tempFilePath);
                deleteChallengePhoto(randomId);
                return false;
            }
        } else {
            deleteTemp("./" + file.tempFilePath);
            deleteChallengePhoto(randomId);
            return false;
        }
    } catch (err) {
        // ignore
        deleteTemp("./" + file.tempFilePath);
        deleteChallengePhoto(randomId);
        return false;
    }
}

module.exports = {
    getUploadedPhoto,
    newUploadedPhoto,
    deleteUploadedPhoto,
    getUploadedPhotoDir,
}