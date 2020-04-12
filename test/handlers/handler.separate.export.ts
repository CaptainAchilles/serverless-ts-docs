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
interface AuthorisedHTTPEvent<T> extends HTTPEvent<AuthHeaders & T> { }

type APIResponseBody<T> = {
    message?: string,
    data: T
};

type APIResponse<T> = {
    statusCode: number;
    body: APIResponseBody<T>
} | APIResponseBody<T>

type HandlerEvent = {
    headers: {
        rando: string
    },
    queryStringParameters: {
        doTHeGuy: string
    },
    pathParameters: {
        push: true | false
    }
};

type HandlerResponse = { ss: number };

/**
 * Account Users
 * Gets of all the users in the account
 * @param {number} a
 */
const handler = (event: AuthorisedHTTPEvent<HandlerEvent>): APIResponse<HandlerResponse> => {
    const a = event.headers["x-userid"];

    event.pathParameters.push;

    const header = event.headers["authorization"];
    if (header > 200) {
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
    return {
        message: "All done",
        data: {
            ss: 900
        }
    }
}

export { handler };