import {getUserDetails} from "../../lemmy";

export default async function (request, response) {
    const limit = Number(request.query.limit ?? 25)
    const page = Number(request.query.after ?? 1)
    const userDetailType = request.query.where?.toLowerCase()
    const username = request.query.username
    const sort = request.query.sort
    const secondarySort = request.query.t

    const userDetails = await getUserDetails({limit, page, sort, secondarySort, userDetailType, username})

    response.send(
        userDetails
    )
}
