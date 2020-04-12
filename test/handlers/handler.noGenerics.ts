/**
 * Account Users
 * Gets of all the users in the account
 * @param {string} a
 */
export const handler = (event: {
    headers: {
        rando: string
    },
    queryStringParameters: {
        filter: string
    },
    pathParameters: {
        loggedIn: true | false
    }
}): {
    statusCode: number,
    body: {
        message: string;
        data: {
            ss: number;
        }
    }
} => {
    event;
    return {
        statusCode: 200,
        body: {
            message: "All done",
            data: {
                ss: 900
            }
        }
    }
}