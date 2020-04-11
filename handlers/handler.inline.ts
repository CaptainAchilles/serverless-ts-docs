interface LambdaHTTPEvent {
    headers?: {
        [key: string]: string
    },
    queryStringParameters?: {
        [key: string]: string
    },
    multiValueQueryStringParameters?: {
        [key: string]: string
    },
    pathParameters?: {
        [key: string]: string
    }
}

interface HTTPEvent<T extends LambdaHTTPEvent> {
    headers?: T["headers"],
    queryStringParameters?: T["queryStringParameters"],
    multiValueQueryStringParameters?: T["multiValueQueryStringParameters"],
    pathParameters?: T["pathParameters"],
}

type AuthHeaders = {
    headers: {
        "Authorization": string;
        "x-rita-userid": string;
    }
}
interface AuthorisedHTTPEvent<T> extends HTTPEvent<AuthHeaders & T> {}

type APIResponseBody<T> = {
    message?: string,
    data: T
};

type APIResponse<T> = {
    statusCode: number;
    body: APIResponseBody<T>
} | APIResponseBody<T>

/**
 * Account Users
 * Gets of all the users in the account
 * @param {number} a
 */
export const handler = (event: AuthorisedHTTPEvent<{
    headers: {
        rando: string
    },
    queryStringParameters: {
        doTHeGuy: string
    },
    pathParameters: {
        push: true | false
    }
}>): APIResponse<{ ss: number }> => {
    const a = event.headers["x-rita-userid"];

    event.pathParameters.push;
    // event.pathParameters.b;
    
    const header = event.headers.Authorization;
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