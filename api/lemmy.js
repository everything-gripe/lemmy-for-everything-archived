import {Everything, Kind} from "everything-sdk";
import {LemmyHttp} from "lemmy-js-client";
import {UserDetailType} from "./consts";

const defaultInstance = 'lemmy.world';
/**
 * @type {LemmyHttp}
 */
let client

function setClient(groupOrUser = '') {
    // const client = new LemmyHttp('https://lemmy.ml')
    const [groupOrUserName, instance] = groupOrUser.split('@')
    client = new LemmyHttp(`https://${!instance || instance === 'kbin.social' ? defaultInstance : instance}`)

    return instance ? `${groupOrUserName}@${instance}` : groupOrUserName
}


/**
 *
 * @param postView {PostView}
 * @returns {Promise<Everything<Post>>}
 */
export async function buildPost(postView) {
    const id = postView.post.id.toString()
    const title = postView.post.name;
    const postSubreddit = /*postView.community.local ? postView.community.name : */`${postView.community.name}@${new URL(postView.community.actor_id).host}`.replace(`@${defaultInstance}`, '')
    const subredditNamePrefixed = `r/${postSubreddit}`
    const numComments = postView.counts.comments
    const permalink = `/r/${postSubreddit}/comments/${id}`
    const author = /*postView.creator.local ? postView.creator.name : */`${postView.creator.name}@${new URL(postView.creator.actor_id).host}`.replace(`@${defaultInstance}`, '')
    const authorFullname = `${Kind.User}_${postView.creator.id}`
    const ups = postView.counts.upvotes
    const downs = postView.counts.downvotes
    const score = postView.counts.score
    const createdUtc = Math.floor(new Date(postView.post.published).getTime() / 1000)
    const name = `${Kind.Post}_${id}`
    const pinned = postView.post.featured_local || postView.post.featured_community
    const hotRank = postView.counts.hot_rank

    if (postView.post.body || !postView.post.url) {
        var isSelf = true
        var selftext = postView.post.body || ''
        var url = `https://lemmy.z.gripe${permalink}`
    } else {
        isSelf = false
        url = postView.post.url
        // var domain =
    }

    const post = Everything.post({
        id: id,
        title: title || '',
        name: name,
        url: url,
        subreddit: postSubreddit,
        subreddit_name_prefixed: subredditNamePrefixed,
        num_comments: numComments,
        permalink: permalink,
        author: author,
        author_fullname: authorFullname,
        ups: ups,
        downs: downs,
        score: score,
        created: createdUtc,
        created_utc: createdUtc,
        is_self: isSelf,
        selftext: selftext || '',
        selftext_html: selftext || '',
        pinned: pinned,
        stickied: pinned,
        // domain: domain || '',
        //For sorting after the fact
        hot_rank: hotRank
    })
    await post.data.buildMetadata()
    return post
}

/**
 *
 * @param commentView {CommentView}
 * @returns {Promise<Everything<Comment>>}
 */
export async function buildComment(commentView) {
    const id = commentView.comment.id.toString()
    const parentId = getParentId(commentView)
    const postId = commentView.post.id.toString()
    const postSubreddit = /*postView.community.local ? postView.community.name : */`${commentView.community.name}@${new URL(commentView.community.actor_id).host}`.replace(`@${defaultInstance}`, '')
    const subredditNamePrefixed = `r/${postSubreddit}`
    const author = /*postView.creator.local ? postView.creator.name : */`${commentView.creator.name}@${new URL(commentView.creator.actor_id).host}`.replace(`@${defaultInstance}`, '')
    const authorFullname = `${Kind.User}_${commentView.creator.id}`
    const ups = commentView.counts.upvotes
    const downs = commentView.counts.downvotes
    const score = commentView.counts.score
    const createdUtc = Math.floor(new Date(commentView.comment.published).getTime() / 1000)
    const body = commentView.comment.content
    const linkId = `${Kind.Post}_${postId}`;
    const name = `${Kind.Comment}_${id}`
    // const count = commentView.counts.child_count
    const depth = commentView.comment.path.split('.').length - 2
    const permalink = `/r/${postSubreddit}/comments/${postId}/_/${id}/`
    const distinguished = commentView.comment.distinguished
    const hotRank = commentView.counts.hot_rank

    const comment = Everything.comment({
        id: id,
        link_id: linkId,
        name: name,
        parent_id: parentId ? `${Kind.Comment}_${parentId}` : linkId,
        subreddit: postSubreddit,
        subreddit_name_prefixed: subredditNamePrefixed,
        author: author,
        author_fullname: authorFullname,
        ups: ups,
        downs: downs,
        score: score,
        created_utc: createdUtc,
        created: createdUtc,
        body: body,
        body_html: body,
        // count: count || undefined,
        depth: depth,
        permalink: permalink,
        stickied: distinguished,
        //For sorting after the fact
        hot_rank: hotRank
    })
    return comment
}

export async function getPost({id, subreddit}) {
    setClient(subreddit)
    const postResponse = await client.getPost({
        id
    })

    const post = await buildPost(postResponse.post_view)

    return Everything.list({
        dist: 1,
        children: [post],
    })
}

export async function getPosts({limit, page, sort, secondarySort, subreddit}) {
    const primarySort = capitalizeFirstLetter(sort.toLowerCase())
    sort = `${primarySort}${secondarySort ? capitalizeFirstLetter(secondarySort.toLowerCase()) : ''}`
    sort = sortTypes.includes(sort) ? sort : sortTypes.includes(primarySort) ? primarySort : undefined

    const communityName = setClient(subreddit)
    const postsResponse = await client.getPosts({
        community_name: communityName,
        type_: "All",
        limit,
        page,
        sort
    })

    const posts = await Promise.all(postsResponse.posts.map(buildPost))

    return Everything.list({
        after: posts.length ? page + 1 : null,
        dist: posts.length,
        children: posts,
        before: page > 1 ? page - 1 : null
    });
}

// export async function getMoreNestedComments({ids, limit, depth, sort, subreddit}) {
//
// }

export async function getUserDetails({limit, page, sort, secondarySort, userDetailType, username}){
    let primarySort
    if (sort) {
        primarySort = capitalizeFirstLetter(sort.toLowerCase())
        sort = `${primarySort}${secondarySort ? capitalizeFirstLetter(secondarySort.toLowerCase()) : ''}`
        sort = sortTypes.includes(sort) ? sort : sortTypes.includes(primarySort) ? primarySort : undefined
    }

    username = setClient(username)
    const personDetailsResponse = await client.getPersonDetails({
        username,
        limit,
        page,
        sort
    })

    const posts = personDetailsResponse.posts
    const comments = personDetailsResponse.comments

    switch (userDetailType) {
        case UserDetailType.comments:
            return Everything.list({
                after: comments.length ? page + 1 : null,
                dist: comments.length,
                children: await Promise.all(comments.map(buildComment)),
                before: page > 1 ? page - 1 : null
            })
        case UserDetailType.submitted:
            return Everything.list({
                after: posts.length ? page + 1 : null,
                dist: posts.length,
                children: await Promise.all(posts.map(buildPost)),
                before: page > 1 ? page - 1 : null
            })
        case UserDetailType.overview:
            const details = await Promise.all([...posts.map(buildPost), ...comments.map(buildComment)])
            switch (primarySort || 'New') {
                case 'New':
                    details.sort((left, right) => right.data.created_utc - left.data.created_utc)
                    break
                case 'Old':
                    details.sort((left, right) => left.data.created_utc - right.data.created_utc)
                    break
                case 'Top':
                    details.sort((left, right) => right.data.score - left.data.score)
                    break
                case 'Hot':
                    details.sort((left, right) => right.data.hot_rank - left.data.hot_rank)
                    break
            }

            return Everything.list({
                after: details.length ? page + 1 : null,
                dist: details.length,
                children: details,
                before: page > 1 ? page - 1 : null
            })
        default:
            return null
    }
}

export async function getNestedComments({ids, limit, depth, sort, subreddit}) {
    limit = Math.min(limit, 50)
    sort = sort ? capitalizeFirstLetter(sort.toLowerCase()) : undefined
    sort = commentSortTypes.includes(sort) ? sort : undefined

    setClient(subreddit)
    const post = await getPost({id: ids.postId, subreddit})

    const commentsResponse = await client.getComments({
        post_id: ids.postId,
        parent_id: ids.commentId,
        type_: "All",
        limit,
        max_depth: depth,
        sort
    })

    const nestedComments = await nestComments(ids, commentsResponse.comments)
    // const everythingPost = post.data.children[0].data
    //
    // const more = everythingPost.num_comments - commentsResponse.comments.length
    // if (more > 0) {
    //     nestedComments.push(Everything.moreComments({
    //         parent_id: everythingPost.id,
    //         depth: 0,
    //         id: everythingPost.parent_id,
    //         name: `${Kind.MoreComments}_more`,
    //         count: more,
    //         children: ['more']
    //     }))
    // }

    return [post, Everything.list({
        children: nestedComments,
    })]
}

/**
 *
 * @param communityView {CommunityView}
 * @returns {Everything<Group>}
 */
function buildGroup(communityView) {
    const createdUtc = Math.floor(new Date(communityView.counts.published).getTime() / 1000);
    const displayName = `${communityView.community.name}@${new URL(communityView.community.actor_id).host}`.replace(`@${defaultInstance}`, '')

    return Everything.group({
        name: `${Kind.Group}_${communityView.community.id}`,
        display_name: displayName,
        display_name_prefixed: `r/${displayName}`,
        title: communityView.community.name,
        id: communityView.community.id,
        subscribers: communityView.counts.subscribers,
        accounts_active: communityView.counts.users_active_day,
        active_user_count: communityView.counts.users_active_month,
        created: createdUtc,
        created_utc: createdUtc,
        community_icon: communityView.community.icon,
        icon_img: communityView.community.icon,
        banner_img: communityView.community.banner,
        banner_background_image: communityView.community.banner,
        mobile_banner_image: communityView.community.banner,
        description: communityView.community.description,
        description_html: communityView.community.description,
        public_description: communityView.community.description,
        public_description_html: communityView.community.description,
        over18: communityView.community.nsfw,
    })
}

/**
 *
 * @param personView {PersonView}
 * @returns {Everything<Group>}
 */
function buildUser(personView) {
    const createdUtc = Math.floor(new Date(personView.person.published).getTime() / 1000);
    const displayName = `${personView.person.name}@${new URL(personView.person.actor_id).host}`.replace(`@${defaultInstance}`, '')

    return Everything.user({
        icon_img: personView.person.avatar,
        name: displayName,
        id: personView.person.id.toString(),
        total_karma: personView.counts.post_score + personView.counts.comment_score,
        link_karma: personView.counts.post_score,
        comment_karma: personView.counts.comment_score,
        created_utc: createdUtc,
        created: createdUtc,
        subreddit: {
            name: `${Kind.Group}_${personView.person.id}`,
            display_name: `u_${displayName}`,
            display_name_prefixed: `u/${displayName}`,
            description: personView.person.bio,
            public_description: personView.person.bio,
            subreddit_type: 'user',
            url: `/user/${displayName}`,
            icon_img: personView.person.avatar,
            title: personView.person.display_name,
            banner_img: personView.person.banner,
        }
    })
}

export async function getGroup({subreddit}) {
    const communityName = setClient(subreddit)
    const communityResponse = await client.getCommunity({
        name: communityName
    })

    return buildGroup(communityResponse.community_view);
}

export async function getGroupsQuery({limit, query}){
    // const [q, subreddit] = query.split('@')
    // setClient(subreddit ? `@${subreddit}` : '')

    setClient()
    const searchResponse = await client.search({
        type_: "Communities",
        listing_type: "All",
        sort: "TopAll",
        q: query,
        limit,
    })

    const groups = searchResponse.communities.map(buildGroup)

    return Everything.list({
        dist: groups.length,
        children: groups
    })
}

export async function getUser({username}) {
    username = setClient(username)

    const personDetailsResponse = await client.getPersonDetails({
        username,
        limit: 0
    })

    return buildUser(personDetailsResponse.person_view);
}


function getParentId(commentView) {
    const pathSegments = commentView.comment.path.split('.')
    return Number(pathSegments[pathSegments.length - 2]);
}

/**
 *
 * @param ids {{postId: string, commentId: string}}
 * @param flatComments {CommentView[]}
 * @returns {Promise<*|*[]>}
 */
async function nestComments(ids, flatComments) {
    let rootId
    const comments = {};

    for (const commentView of flatComments) {
        const parentId = getParentId(commentView);
        comments[parentId] ??= [];
        comments[parentId].push({commentView, everythingComment: await buildComment(commentView)})

        if (commentView.comment.id.toString() === ids.commentId) {
            rootId = parentId
        }
    }

    for (const commentId in comments) {
        for (const container of comments[commentId]) {
            const replies = comments[container.commentView.comment.id] || []
            // const more = container.commentView.counts.child_count - replies.length
            // if (more > 0) {
            //     replies.push(Everything.moreComments({
            //         parent_id: container.everythingComment.data.id,
            //         depth: container.everythingComment.data.depth + 1,
            //         id: container.everythingComment.data.id,
            //         name: `${Kind.Comment}_more`,
            //         count: more,
            //         children: ['more']
            //     }))
            // }
            if (replies.length) {
                container.everythingComment.data.replies = Everything.list({
                    children: replies.map(container => container.everythingComment),
                })
            }
        }
    }

    return comments[rootId || '0']?.map(container => container.everythingComment) ?? [];
}

// export function buildHtmlRedirect(path) {
//     if (path.matches)
// }

function capitalizeFirstLetter(str) {
    if (str.length === 0) {
        return str
    }

    const firstChar = str.charAt(0).toUpperCase()
    const restOfString = str.slice(1)

    return firstChar + restOfString
}

const sortTypes = ["Active", "Hot", "New", "Old", "TopDay", "TopWeek", "TopMonth", "TopYear", "TopAll", "MostComments", "NewComments", "TopHour", "TopSixHour", "TopTwelveHour", "TopThreeMonths", "TopSixMonths", "TopNineMonths"]

const commentSortTypes = ["Hot", "Top", "New", "Old"]
