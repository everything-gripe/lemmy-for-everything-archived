import {getGroup} from "../../lemmy";

export default async function (request, response) {
    response.send(await getGroup({subreddit: request.query.subreddit}))
}
