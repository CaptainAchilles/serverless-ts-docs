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
        Authorization: string;
        "x-userid": string;
    }
}
interface AuthorisedHTTPEvent<T, K> extends HTTPEvent<T & K> {}

type APIResponseBody<T> = {
    message?: string,
    data: T
};

type APIResponse<T, K> = {
    statusCode: T;
    body: APIResponseBody<K>
} | APIResponseBody<K>

/**
 * Account Users
 * Gets of all the users in the account
 * @param {number} a
 */
export const handler = (event: AuthorisedHTTPEvent<AuthHeaders, {
    headers: {
        Authorization: number;
        newHeader: string
    },
    pathParameters: {
        loggedIn: boolean
    }
}>): APIResponse<200, { ss: boolean }> => {
    return {
        statusCode: 200,
        body: {
            message: "All done",
            data: {
                ss: true
            }
        }
    }
}