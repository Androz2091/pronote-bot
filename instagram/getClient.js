const { IgApiClientRealtime, withRealtime } = require("instagram_mqtt");
const {
    GraphQLSubscriptions
} = require("instagram_mqtt/dist/realtime/subscriptions");
const { IgApiClient } = require("instagram-private-api");
const {
    SkywalkerSubscriptions
} = require("instagram_mqtt/dist/realtime/subscriptions");
const { username, password } = require("../config.json");

module.exports = async () => {
    return new Promise(async resolve => {
        // this extends the IgApiClient with realtime features
        const ig = withRealtime(new IgApiClient());
        // normal login
        ig.state.generateDevice(username);
        await ig.account.login(username, password);
        // now `ig` is a client with a valid session

        // an example on how to subscribe to live comments
        const subToLiveComments = broadcastId =>
            // you can add other GraphQL subs using .subscribe
            ig.realtime.graphQlSubscribe(
                GraphQLSubscriptions.getLiveRealtimeCommentsSubscription(
                    broadcastId
                )
            );

        // whenever the client has a fatal error
        ig.realtime.on("error", console.error);
        ig.realtime.on("close", () => console.error("RealtimeClient closed"));
        // connect
        // this will resolve once all initial subscriptions have been sent
        await ig.realtime.connect({
            // optional
            graphQlSubs: [],
            // optional
            skywalkerSubs: [
                SkywalkerSubscriptions.directSub(ig.state.cookieUserId),
                SkywalkerSubscriptions.liveSub(ig.state.cookieUserId)
            ],
            irisData: await ig.feed.directInbox().request(),
            connectOverrides: {}
        });
        ig.realtime.direct.sendForegroundState({
            inForegroundApp: true,
            inForegroundDevice: true,
            keepAliveTimeout: 60
        });
        resolve(ig);
    });
};

/**
 * A wrapper function to log to the console
 * @param name
 * @returns {(data) =void}
 */
function logEvent(name) {
    return data => console.log(name, data);
}
