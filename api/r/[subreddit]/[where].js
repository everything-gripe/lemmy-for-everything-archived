import {Everything, Post} from "everything-sdk";
import {LemmyHttp} from "lemmy-js-client";

export default async function (request, response) {
    const page = Number(request.query.after ?? 1)
    const limit = Number(request.query.limit ?? 25)
    const subreddit = request.query.subreddit
    const [, instance] = subreddit.split('@')
    const client = new LemmyHttp(`https://${instance || 'lemmy.ml'}`)

    const postsResponse = await client.getPosts({
        community_name: subreddit,
        limit,
        page
    })

    const posts = await Promise.all(postsResponse.posts.map(async lemmyPost => {
        const id = lemmyPost.post.id
        const title = lemmyPost.post.name;
        const subredditNamePrefixed = `r/${subreddit}`
        const numComments = lemmyPost.counts.comments
        const permalink = `/r/${subreddit}/comments/${id}`
        const author = lemmyPost.creator.name
        const authorFullname = `t2_${lemmyPost.creator.id}`
        const ups = lemmyPost.counts.upvotes
        const downs = lemmyPost.counts.downvotes
        const score = lemmyPost.counts.score
        const createdUtc = Math.floor(new Date(lemmyPost.post.published).getTime() / 1000)

        if (lemmyPost.post.body) {
            var isSelf = true
            var selftext = lemmyPost.post.body
            var url = `https://lemmy.z.gripe${permalink}`
        } else {
            isSelf = false
            url = lemmyPost.post.url
            // var domain = sourceElm.attr('title')
        }

        const post = Everything.post({
            id: id,
            title: title || '',
            url: url,
            subreddit: subreddit,
            subreddit_name_prefixed: subredditNamePrefixed,
            num_comments: numComments,
            permalink: permalink,
            author: author,
            author_fullname: authorFullname,
            ups: ups,
            downs: downs,
            score: score,
            created_utc: createdUtc,
            is_self: isSelf,
            selftext: selftext || '',
            selftext_html: selftext || '',
            // domain: domain || '',
        })
        await post.data.buildMetadata()
        return post
    }))

    const list = Everything.list({
        after: page + 1,
        dist: posts.length,
        modhash: "",
        geo_filter: null,
        children: posts,
        before: page > 1 ? page - 1 : null

    })
    response.send(list)
}
