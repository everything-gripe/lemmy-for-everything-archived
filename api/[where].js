import {getPosts} from "./lemmy";

export default async function (request, response) {
    const limit = Number(request.query.limit ?? 25)
    const page = Number(request.query.after ?? 1)
    const sort = request.query.where
    const secondarySort = request.query.t

    const list = await getPosts({limit, page, sort, secondarySort});
    response.send(list)
}
