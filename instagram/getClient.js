const { withFbns } = require("instagram_mqtt");
const { IgApiClient } = require("instagram-private-api");
const { promisify } = require("util");
const { writeFile, readFile, exists } = require("fs");

const InstaMessage = require("./InstaMessage");

const writeFileAsync = promisify(writeFile);
const readFileAsync = promisify(readFile);
const existsAsync = promisify(exists);

const { EventEmitter } = require("events");
const { sep } = require("path");
const { username, password } = require("../config.json");

module.exports = async () => {
    return new Promise(async resolve => {
        const ig = withFbns(new IgApiClient());
        ig.state.generateDevice(username);

        ig.eventsHandler = new EventEmitter();

        // this will set the auth and the cookies for instagram
        await readState(ig);

        // this logs the client in
        await loginToInstagram(ig);

        // you received a notification
        ig.fbns.push$.subscribe((data) => {
            if(data.collapseKey === "direct_v2_message"){
                ig.eventsHandler.emit("message", new InstaMessage(data, ig));
            } else if(data.collapseKey === "follower_follow" || data.collapseKey === "new_follower"){
                ig.eventsHandler.emit("follow");
            }
        });
        // the client received auth data
        // the listener has to be added before connecting
        ig.fbns.auth$.subscribe(async (auth) => {
            ig.authPk = auth.pk;
            //saves the auth
            await saveState(ig);
        });
        // 'error' is emitted whenever the client experiences a fatal error
        ig.fbns.error$.subscribe(logEvent('error'));
        // 'warning' is emitted whenever the client errors but the connection isn't affected
        ig.fbns.warning$.subscribe(logEvent('warning'));

        // this sends the connect packet to the server and starts the connection
        // the promise will resolve once the client is fully connected (once /push/register/ is received)
        await ig.fbns.connect();
        resolve(ig);
    });
};

async function saveState(ig) {
    return writeFileAsync(__dirname + sep + "state.json",
    await ig.exportState(),
    { encoding: "utf8" });
}

async function readState(ig) {
    if (!(await existsAsync(__dirname + sep + "state.json")))
        return;
    await ig.importState(await readFileAsync(__dirname + sep + "state.json", {encoding: 'utf8'}));
}

async function loginToInstagram(ig) {
    ig.request.end$.subscribe(() => saveState(ig));
    await ig.account.login(username, password);
}

/**
 * A wrapper function to log to the console
 * @param name
 * @returns {(data) => void}
 */
function logEvent(name) {
    return (data) => console.log(name, data);
}