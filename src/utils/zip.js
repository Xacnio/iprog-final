const fs = require('fs');
const archiver = require('archiver');
const { v4: randomUUID } = require('uuid');
const { getUploadedPhotoDir } = require('./uploads');
const { updateChallenge } = require('../models/challenge');
const { glob } = require('glob');
const zipsDir = "./data/archives/";
const archivePrefixPath = "/archives/";
let QUEUE = [];
let WORKER = null;

function queueArchive(id, conts) {
    QUEUE.push({
        id,
        conts
    });
    if (WORKER === null) startQueue();
}

function deleteArchive(id) {
    glob(zipsDir + id + ".zip", function (er, files) {
        files.forEach(filename => {
            fs.unlinkSync(filename)
        })
    });
}

function startQueue() {
    WORKER = setInterval(() => {
        if (QUEUE.length === 0) {
            clearInterval(WORKER);
            WORKER = null;
        } else if (QUEUE.length > 0) {
            const data = QUEUE.shift();
            const id = randomUUID();
            const output = fs.createWriteStream(zipsDir + id + '.zip');
            const archive = archiver('zip', {
                zlib: { level: 9 }
            });

            output.on('close', async function () {
                const farchive = `${id}|${archive.pointer()}`
                await updateChallenge({ _id: data.id }, { fileArchive: farchive })
                output.end()
            });

            archive.on('warning', async function (err) {
                if (err.code === 'ENOENT') {
                    // log warning
                } else {
                    console.error(err)
                    await updateChallenge({ _id: data.id }, { fileArchive: null });
                }
            });

            archive.on('error', async function (err) {
                await updateChallenge({ _id: data.id }, { fileArchive: null });
            });

            archive.pipe(output);

            for (let i = 0; i < data.conts.length; i++) {
                const ff = getUploadedPhotoDir(data.conts[i]);
                if (fs.existsSync(ff.path)) {
                    archive.file(ff.path, { name: `${i}.${ff.ext}` });
                }
            }

            archive.finalize();
        }
    }, 5000);

}

module.exports = {
    queueArchive,
    deleteArchive,
    archivePrefixPath
}