import {getGroupsQuery} from "../lemmy";

export default async function (request, response) {
    const limit = Number(request.query.limit ?? 5)
    const query =  request.query.query

    const list = await getGroupsQuery({limit, query});
    response.send(list)
}
