const logger = require("../helpers/logger");
const { asyncForEach, delay } = require("../helpers/functions");

module.exports.run = async igClient => {
    console.log("cjec");
    const followersFeed = igClient.feed.accountFollowers(igClient.authPk);
    const followersFeedResponse = await followersFeed.items();
    const followers = followersFeedResponse.map(f => f.username);
    logger.log(`${followers.length} followers retrieved.`);

    const followingFeed = igClient.feed.accountFollowing(igClient.authPk);
    const followingFeedResponse = await followingFeed.items();
    const following = followingFeedResponse.map(f => f.username);
    logger.log(`${following.length} followed users retrieved.`);

    let friendshipsToCreate = [];

    // Abonnement en retour
    followers.forEach(f => {
        // Si le bot est abonné
        if (following.includes(f)) return;
        // Si le compte est privé
        let isPrivate = followersFeedResponse.find(u => u.username === f)
            .is_private;
        if (isPrivate) return;
        // Récupération de l'ID de l'utilisateur
        let userId = followersFeedResponse.find(u => u.username === f).pk;
        // Ajout à la queue
        friendshipsToCreate.push(userId);
    });

    logger.log(
        `${friendshipsToCreate.length} friendships will be created.`,
        "info"
    );
    await asyncForEach(friendshipsToCreate, async userId => {
        // Abonnement
        await igClient.friendship.create(userId);
        logger.log(
            `${
                followersFeedResponse.find(u => u.pk === userId).username
            } followed.`
        );
        // Attendre 10 secondes avant de suivre le compte suivant
        await delay(10000);
    });
};

module.exports.infos = {
    cron: ["0 */6 * * *"],
    runOnStart: true,
    fbnsEvents: ["new_follower", "follower_follow", "follow_request_approved"]
};
