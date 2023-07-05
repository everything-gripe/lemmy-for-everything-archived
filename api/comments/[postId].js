import {getNestedComments} from "../lemmy";

export default async function (request, response) {
    const limit = Number(request.query.limit ?? 25)
    const depth = request.query.depth
    const subreddit = request.query.subreddit
    const sort = request.query.sort

    const comments = await getNestedComments({
        ids: {
            postId: request.query.postId
        },
        limit,
        depth,
        sort,
        subreddit
    })

    response.send(
        comments
    )
}
