import {getUser} from "../../lemmy";

export default async function (request, response) {
    response.send(await getUser({username: request.query.username}))
}
