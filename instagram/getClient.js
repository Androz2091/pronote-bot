const { IgApiClientExt, IgApiClientFbns, withFbns } = require("instagram_mqtt");
const { IgApiClient } = require("instagram-private-api");
const { promisify } = require("util");
const { writeFile, readFile, exists } = require("fs");
const { sep } = require("path");

const InstaMessage = require("./InstaMessage");

const writeFileAsync = promisify(writeFile);
const readFileAsync = promisify(readFile);
const existsAsync = promisify(exists);

const { username, password } = require("../config.json");

module.exports = () => {
    return new Promise(async resolve => {
        // New IG Client
        const ig = withFbns(new IgApiClient());
        ig.state.generateDevice(username);

        // If there's already auth informations
        await readState(ig);
        // Log in Instagram
        await loginToInstagram(ig);

        // When a message is received, emit another event with the formatted message
        ig.fbns.on("direct_v2_message", data => {
            ig.fbns.emit("message", new InstaMessage(data, ig));
        });

        // When the auth informations are received, save them
        ig.fbns.on("auth", async () => {
            await saveState(ig);
        });

        // Connect FBNS
        await ig.fbns.connect();

        // Return IG Client
        resolve(ig);
    });
};

async function saveState(ig) {
    return writeFileAsync(
        __dirname + sep + "state.json",
        await ig.exportState(),
        { encoding: "utf8" }
    );
}

async function readState(ig) {
    if (!(await existsAsync(__dirname + sep + "state.json"))) return;
    await ig.importState(
        await readFileAsync(__dirname + sep + "state.json", {
            encoding: "utf8"
        })
    );
}

async function loginToInstagram(ig) {
    ig.request.end$.subscribe(() => saveState(ig));
    await ig.account.login(username, password);
}
