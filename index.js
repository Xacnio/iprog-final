const { createServer } = require('./src/server.js');
const mongoose = require('mongoose');
const fs = require('fs')
require('./config');


function main() {
    fs.rmSync('tmp/', { recursive: true, force: true });

    mongoose.connect(process.env.MONGO_URI)
        .then(() => {
            console.log("Connected to the database!");
            try {
                const app = createServer();
                const host = process.env.HOST;
                const port = process.env.PORT;
                app.listen(port, host, (err) => {
                    if (err) throw err;
                    console.log(`App listening at http://${host}:${port}`)
                })
            } catch (err) {
                console.error(err);
                process.exit();
            }
        })
        .catch(err => {
            console.log("Cannot connect to the database!", err);
            process.exit();
        });
}

main()